import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../../components/ui/AsyncButton";
import { searchProducts } from "../../../services/inventoryApi";
import {
  assignWhatsAppConversationOwner,
  clearWhatsAppConversationOwner,
  completeWhatsAppEmbeddedSignup,
  createWhatsAppSaleDraft,
  setWhatsAppAccountActive,
} from "../../../services/whatsappApi";
import {
  launchEmbeddedSignup,
  loadMetaSdk,
  parseEmbeddedSignupMessage,
} from "../../../services/metaEmbeddedSignup";
import { cleanText, customerName, cx, formatDay, latestPreview, money, normalizeProductList, safeError, statusLabel, toneForStatus } from "../lib/whatsappInbox.utils";
import { Badge, EmptyState, MetricCard, SettingsIcon } from "./WhatsAppInboxPanels";

function LinkSignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 12.5l-1.2 1.2a3.4 3.4 0 004.8 4.8l2.1-2.1a3.4 3.4 0 000-4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 11.5l1.2-1.2a3.4 3.4 0 00-4.8-4.8L9.8 7.6a3.4 3.4 0 000 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.8 14.2l4.4-4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StoreNumberIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 10h14l-1-5H6l-1 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M7 10v9h10v-9M9 14h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaIdsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v9a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 16.5v-9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8.5 10h7M8.5 14h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SecureKeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 14.5a4 4 0 112.7-6.95A4 4 0 018.5 14.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 11h8m-3 0v3m-3-3v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SetupWorkspace({ accounts, onRefresh }) {
  const account = accounts[0] || null;
  const appId = process.env.NEXT_PUBLIC_STORVEX_META_APP_ID || "";
  const configId = process.env.NEXT_PUBLIC_STORVEX_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID || "";
  const [sdk, setSdk] = useState(null);
  const [sdkState, setSdkState] = useState("loading");
  const [flowState, setFlowState] = useState("idle");
  const [flowMessage, setFlowMessage] = useState("");
  const [toggling, setToggling] = useState(false);
  const activeAttemptRef = useRef(false);
  const codeRef = useRef("");
  const sessionRef = useRef(null);
  const completingRef = useRef(false);
  const popupRef = useRef(null);
  const popupTimerRef = useRef(null);
  const isConnected = account?.connectionState === "connected";
  const isPaused = account?.connectionState === "paused";

  function clearAttempt() {
    activeAttemptRef.current = false;
    codeRef.current = "";
    sessionRef.current = null;
    completingRef.current = false;
    popupRef.current = null;
    if (popupTimerRef.current) window.clearInterval(popupTimerRef.current);
    popupTimerRef.current = null;
  }

  async function finishWhenReady() {
    if (!activeAttemptRef.current || completingRef.current || !codeRef.current || !sessionRef.current) return;
    completingRef.current = true;
    setFlowState("connecting");
    setFlowMessage("Finishing your WhatsApp connection…");
    try {
      await completeWhatsAppEmbeddedSignup({ code: codeRef.current, sessionInfo: sessionRef.current });
      clearAttempt();
      setFlowState("success");
      setFlowMessage("WhatsApp connected successfully.");
      toast.success("WhatsApp connected");
      await onRefresh?.();
    } catch (error) {
      clearAttempt();
      setFlowState("error");
      setFlowMessage("Unable to connect WhatsApp. Please try again.");
      toast.error(safeError(error, "Unable to connect WhatsApp"));
    }
  }

  function prepareSdk() {
    if (!appId) {
      setSdkState("error");
      setFlowMessage("WhatsApp connection is not configured yet.");
      return;
    }
    setSdkState("loading");
    loadMetaSdk(appId)
      .then((nextSdk) => {
        setSdk(nextSdk);
        setSdkState("ready");
      })
      .catch(() => {
        setSdkState("error");
        setFlowMessage("Unable to prepare WhatsApp connection. Please retry.");
      });
  }

  useEffect(() => {
    prepareSdk();
    return () => {
      if (popupTimerRef.current) window.clearInterval(popupTimerRef.current);
    };
    // Public configuration is fixed for the deployed bundle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (!activeAttemptRef.current) return;
      const message = parseEmbeddedSignupMessage(event);
      if (!message) return;

      if (message.event === "CANCEL") {
        clearAttempt();
        setFlowState("cancelled");
        setFlowMessage("Connection cancelled. You can try again when ready.");
        return;
      }
      if (message.event === "ERROR") {
        clearAttempt();
        setFlowState("error");
        setFlowMessage("Unable to connect WhatsApp. Please try again.");
        return;
      }

      sessionRef.current = message.data;
      finishWhenReady();
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  });

  function startConnection() {
    if (!sdk || sdkState !== "ready" || !configId) {
      setFlowState("error");
      setFlowMessage(configId ? "WhatsApp connection is still preparing. Please retry." : "WhatsApp connection is not configured yet.");
      return;
    }

    clearAttempt();
    activeAttemptRef.current = true;
    setFlowState("connecting");
    setFlowMessage("Complete the secure Meta signup window to continue.");

    const originalOpen = window.open;
    window.open = function (...args) {
      const popup = originalOpen.apply(window, args);
      popupRef.current = popup;
      window.open = originalOpen;
      return popup;
    };

    try {
      launchEmbeddedSignup(sdk, configId, (response) => {
        window.open = originalOpen;
        const code = String(response?.authResponse?.code || "").trim();
        if (!code) {
          clearAttempt();
          setFlowState("cancelled");
          setFlowMessage("Connection cancelled. You can try again when ready.");
          return;
        }
        codeRef.current = code;
        finishWhenReady();
      });
      // FB.login opens the signup window synchronously. Never leave the
      // temporary capture hook installed if the SDK chooses another path.
      window.open = originalOpen;
    } catch {
      window.open = originalOpen;
      clearAttempt();
      setFlowState("error");
      setFlowMessage("Unable to open Meta signup. Check popup permissions and retry.");
      return;
    }

    window.setTimeout(() => {
      if (activeAttemptRef.current && popupRef.current === null) {
        clearAttempt();
        setFlowState("error");
        setFlowMessage("The Meta signup window was blocked. Allow popups and retry.");
      }
    }, 500);
    popupTimerRef.current = window.setInterval(() => {
      if (activeAttemptRef.current && popupRef.current?.closed) {
        clearAttempt();
        setFlowState("cancelled");
        setFlowMessage("Connection window closed. You can try again.");
      }
    }, 500);
  }

  async function toggleActive() {
    if (!account?.id) return;

    setToggling(true);

    try {
      await setWhatsAppAccountActive(account.id, !account.isActive);
      toast.success(account.isActive ? "WhatsApp paused" : "WhatsApp activated");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "Status update failed"));
    } finally {
      setToggling(false);
    }
  }

  return (
    <section className="svx-wa-page-panel svx-wa-setup-workspace">
      <div className="svx-wa-section-title">
        <p>WhatsApp</p>
        <h2>Connect your business WhatsApp</h2>
        <span>Connect your business WhatsApp to manage customer conversations from Storvex.</span>
      </div>
      <div className="svx-wa-connect-card" aria-live="polite">
        <div className="svx-wa-connect-icon"><LinkSignalIcon /></div>
        <div className="svx-wa-connect-copy">
          <Badge tone={isConnected ? "success" : isPaused ? "warning" : "neutral"}>
            {isConnected ? "Connected" : isPaused ? "Paused" : "Not connected"}
          </Badge>
          <h3>{account?.businessName || "Your business WhatsApp"}</h3>
          <p>
            {isConnected
              ? "Your business WhatsApp is connected to Storvex."
              : isPaused
                ? "Your WhatsApp connection is paused."
                : "Meta will guide you through securely choosing your business and WhatsApp number."}
          </p>
          {account?.phoneNumber ? <strong className="svx-wa-connected-number">+{account.phoneNumber}</strong> : null}
          {flowMessage ? <div className={cx("svx-wa-connect-message", `is-${flowState}`)}>{flowMessage}</div> : null}
        </div>
        <div className="svx-wa-connect-actions">
          <AsyncButton
            type="button"
            onClick={startConnection}
            loading={flowState === "connecting"}
            loadingText="Connecting..."
            disabled={sdkState === "loading"}
          >
            {isConnected || isPaused ? "Reconnect" : sdkState === "loading" ? "Preparing..." : "Connect WhatsApp"}
          </AsyncButton>
          {sdkState === "error" ? (
            <button type="button" className="svx-wa-secondary-action" onClick={prepareSdk}>Retry setup</button>
          ) : null}
          {account?.id ? (
            <AsyncButton type="button" onClick={toggleActive} loading={toggling} loadingText="Updating..." variant="secondary">
              {account.isActive ? "Pause" : "Resume"}
            </AsyncButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ChatActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 18.5l1.15-3.05A7.2 7.2 0 014.7 11a7.3 7.3 0 117.3 7.3 7.6 7.6 0 01-3.35-.78L5 18.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DraftActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3.75h10a1.5 1.5 0 011.5 1.5v15l-2.25-1.25L14 20.25 12 19l-2.25 1.25L7.5 19 5.5 20.25v-15A1.5 1.5 0 017 3.75z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8.75 8h6.5M8.75 11.5h6.5M8.75 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BroadcastActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 13.25h3.25l8.75 4.25v-11L7.75 10.75H4.5v2.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.75 13.25v4.25M19 9.2c.9.85 1.35 1.8 1.35 2.8S19.9 13.95 19 14.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AlertActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4.25l8.25 14.25H3.75L12 4.25z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v4.25M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function activityNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function activityRate(part, total) {
  const p = activityNumber(part);
  const t = activityNumber(total);
  if (!t) return 0;
  return Math.max(0, Math.min(100, Math.round((p / t) * 100)));
}

function activityStatusTone(type, status) {
  const clean = String(status || "").toUpperCase();
  if (type === "broadcast" && (clean === "FAILED" || clean.includes("FAILED"))) return "danger";
  if (type === "broadcast" && clean === "QUEUED") return "warning";
  if (type === "broadcast" && clean === "SENT") return "success";
  if (type === "draft") return "warning";
  return toneForStatus(status);
}

function getBroadcastStats(item) {
  const analytics = item?.analytics || item?.performance || item?.report || {};
  const recipientCount = activityNumber(
    analytics.recipientCount ?? analytics.totalRecipients ?? item?.recipientCount ?? item?.audienceCount,
  );
  const sentCount = activityNumber(analytics.sentCount ?? item?.sentCount ?? item?.deliveredCount);
  const deliveredCount = activityNumber(analytics.deliveredCount ?? item?.deliveredCount);
  const readCount = activityNumber(analytics.readCount ?? item?.readCount);
  const failedCount = activityNumber(analytics.failedCount ?? item?.failedCount);
  const pendingCount = Math.max(0, recipientCount - Math.max(sentCount, deliveredCount + failedCount));

  return {
    recipientCount,
    sentCount,
    deliveredCount,
    readCount,
    failedCount,
    pendingCount,
    deliveryRate: analytics.deliveryRate ?? activityRate(deliveredCount, recipientCount || sentCount),
    readRate: analytics.readRate ?? activityRate(readCount, deliveredCount || recipientCount),
    failureRate: analytics.failureRate ?? activityRate(failedCount, recipientCount || sentCount),
    latestFailureReason: analytics.latestFailureReason || item?.latestFailureReason || item?.processingLastError || "",
  };
}

export function ActivityWorkspace({ conversations, drafts, broadcasts }) {
  const conversationRows = conversations.slice(0, 8).map((item) => ({
    id: `conversation-${item.id}`,
    type: "conversation",
    icon: <ChatActivityIcon />,
    title: customerName(item),
    eyebrow: "Customer conversation",
    text: latestPreview(item),
    status: statusLabel(item.status),
    time: item.updatedAt || item.createdAt,
  }));

  const draftRows = drafts.slice(0, 6).map((item) => ({
    id: `draft-${item.id}`,
    type: "draft",
    icon: <DraftActivityIcon />,
    title: "Draft sale pending",
    eyebrow: "WhatsApp order",
    text: `${money(item.total)} · ${item.items?.length || 0} item(s) need completion`,
    status: "Draft",
    time: item.updatedAt || item.createdAt,
  }));

  const broadcastRows = broadcasts.slice(0, 8).map((item) => {
    const stats = getBroadcastStats(item);
    const failed = stats.failedCount > 0;
    return {
      id: `broadcast-${item.id}`,
      type: "broadcast",
      icon: failed ? <AlertActivityIcon /> : <BroadcastActivityIcon />,
      title: item.promotion?.title || item.templateName || "Broadcast campaign",
      eyebrow: "Campaign report",
      text: failed
        ? `${stats.failedCount} failed · ${stats.deliveredCount} delivered · ${stats.readCount} read`
        : `${stats.recipientCount} targeted · ${stats.deliveredCount} delivered · ${stats.readCount} read`,
      status: failed ? "Needs attention" : statusLabel(item.status),
      time: item.sentAt || item.updatedAt || item.createdAt,
      stats,
    };
  });

  const rows = [...conversationRows, ...draftRows, ...broadcastRows]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 14);

  const openConversations = conversations.filter((item) => String(item.status || "OPEN").toUpperCase() === "OPEN").length;
  const unreadConversations = conversations.reduce((sum, item) => sum + activityNumber(item.unreadCount), 0);
  const draftValue = drafts.reduce((sum, item) => sum + activityNumber(item.total), 0);
  const queuedBroadcasts = broadcasts.filter((item) => String(item.status || "").toUpperCase() === "QUEUED").length;
  const sentBroadcasts = broadcasts.filter((item) => String(item.status || "").toUpperCase() === "SENT").length;
  const failedBroadcasts = broadcasts.reduce((sum, item) => sum + getBroadcastStats(item).failedCount, 0);
  const deliveredBroadcasts = broadcasts.reduce((sum, item) => sum + getBroadcastStats(item).deliveredCount, 0);
  const readBroadcasts = broadcasts.reduce((sum, item) => sum + getBroadcastStats(item).readCount, 0);

  const latestBroadcasts = broadcasts
    .slice(0, 5)
    .map((item) => ({ ...item, stats: getBroadcastStats(item) }));

  return (
    <section className="svx-wa-page-panel svx-wa-activity-workspace">
      <div className="svx-wa-section-title is-activity-report">
        <div>
          <p>Activity & reporting</p>
          <h2>WhatsApp workspace history</h2>
          <span>Recent customer messages, draft sales, broadcasts and delivery signals in one clean view.</span>
        </div>
        <Badge tone={failedBroadcasts > 0 ? "warning" : rows.length ? "success" : "neutral"}>
          {failedBroadcasts > 0 ? "Needs review" : rows.length ? "Up to date" : "Waiting"}
        </Badge>
      </div>

      <div className="svx-wa-activity-report-grid">
        <article className="svx-wa-activity-report-card is-conversation">
          <span><ChatActivityIcon /></span>
          <div>
            <p>Conversations</p>
            <strong>{openConversations}</strong>
            <small>{unreadConversations} unread customer message(s)</small>
          </div>
        </article>

        <article className="svx-wa-activity-report-card is-draft">
          <span><DraftActivityIcon /></span>
          <div>
            <p>Draft sales</p>
            <strong>{drafts.length}</strong>
            <small>{money(draftValue)} waiting for completion</small>
          </div>
        </article>

        <article className="svx-wa-activity-report-card is-broadcast">
          <span><BroadcastActivityIcon /></span>
          <div>
            <p>Campaigns</p>
            <strong>{sentBroadcasts}</strong>
            <small>{queuedBroadcasts} queued · {deliveredBroadcasts} delivered · {readBroadcasts} read</small>
          </div>
        </article>

        <article className="svx-wa-activity-report-card is-risk">
          <span><AlertActivityIcon /></span>
          <div>
            <p>Needs attention</p>
            <strong>{failedBroadcasts}</strong>
            <small>Failed customer messages across campaigns</small>
          </div>
        </article>
      </div>

      <div className="svx-wa-activity-layout">
        <section className="svx-wa-activity-timeline-panel">
          <div className="svx-wa-activity-panel-head">
            <div>
              <p>Timeline</p>
              <h3>Latest workspace movement</h3>
            </div>
            <Badge tone="neutral">{rows.length} items</Badge>
          </div>

          {rows.length ? (
            <div className="svx-wa-activity-list is-polished">
              {rows.map((row) => (
                <article key={row.id} className={cx("svx-wa-activity-row is-polished", `is-${row.type}`)}>
                  <span className={cx("svx-wa-activity-icon", `is-${row.type}`)}>{row.icon}</span>
                  <div className="svx-wa-activity-copy">
                    <span>{row.eyebrow}</span>
                    <strong>{row.title}</strong>
                    <p>{row.text}</p>
                  </div>
                  <Badge tone={activityStatusTone(row.type, row.status)}>{row.status}</Badge>
                  <small>{formatDay(row.time)}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No WhatsApp activity yet"
              body="Activity will appear after customer conversations, draft sales, and broadcasts."
            />
          )}
        </section>

        <section className="svx-wa-activity-report-panel">
          <div className="svx-wa-activity-panel-head">
            <div>
              <p>Campaign reporting</p>
              <h3>Delivery health</h3>
            </div>
            <Badge tone={failedBroadcasts > 0 ? "warning" : deliveredBroadcasts > 0 ? "success" : "neutral"}>
              {failedBroadcasts > 0 ? "Review" : deliveredBroadcasts > 0 ? "Healthy" : "No data"}
            </Badge>
          </div>

          {latestBroadcasts.length ? (
            <div className="svx-wa-campaign-health-list">
              {latestBroadcasts.map((item) => {
                const stats = item.stats;
                const title = item.promotion?.title || item.templateName || "Broadcast campaign";
                const deliveryRate = activityNumber(stats.deliveryRate);
                const readRate = activityNumber(stats.readRate);
                const hasFailure = stats.failedCount > 0;

                return (
                  <article key={item.id} className={cx("svx-wa-campaign-health-card", hasFailure && "has-risk")}> 
                    <div className="svx-wa-campaign-health-top">
                      <div>
                        <strong>{title}</strong>
                        <span>{stats.recipientCount} audience · {stats.pendingCount} pending</span>
                      </div>
                      <Badge tone={hasFailure ? "warning" : toneForStatus(statusLabel(item.status))}>
                        {hasFailure ? "Needs review" : statusLabel(item.status)}
                      </Badge>
                    </div>

                    <div className="svx-wa-health-bars">
                      <div>
                        <span>Delivered</span>
                        <strong>{deliveryRate}%</strong>
                        <i style={{ width: `${deliveryRate}%` }} />
                      </div>
                      <div>
                        <span>Read</span>
                        <strong>{readRate}%</strong>
                        <i style={{ width: `${readRate}%` }} />
                      </div>
                    </div>

                    <div className="svx-wa-health-numbers">
                      <span>{stats.deliveredCount} delivered</span>
                      <span>{stats.readCount} read</span>
                      <span>{stats.failedCount} failed</span>
                    </div>

                    {hasFailure && stats.latestFailureReason ? (
                      <p className="svx-wa-health-warning">{stats.latestFailureReason}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No campaign report yet"
              body="Delivery reports will appear after broadcasts are sent and WhatsApp returns status updates."
            />
          )}
        </section>
      </div>
    </section>
  );
}

export function CreateDraftModal({ open, conversation, onClose, onCreated }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [saleType, setSaleType] = useState("CREDIT");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setProducts([]);
      setItems([]);
      setSaleType("CREDIT");
      setAmountPaid("");
      setDueDate("");
    }
  }, [open]);

  if (!open) return null;

  async function runSearch(event) {
    event?.preventDefault?.();

    const clean = query.trim();
    if (!clean) return toast.error("Search product first");

    setSearching(true);

    try {
      const data = await searchProducts({ q: clean, limit: 12 });
      setProducts(normalizeProductList(data));
    } catch (err) {
      toast.error(safeError(err, "Product search failed"));
    } finally {
      setSearching(false);
    }
  }

  function addProduct(product) {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellPrice,
          stockQty: product.stockQty,
        },
      ];
    });
  }

  function updateQty(productId, nextQty) {
    const quantity = Math.max(1, Number(nextQty || 1));

    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity } : item))
    );
  }

  async function submit() {
    if (!conversation?.id) return;
    if (!items.length) return toast.error("Add at least one product");

    setSaving(true);

    try {
      const payload = {
        branchId: conversation.branchId || undefined,
        customerId: conversation.customerId || undefined,
        customer: conversation.customer
          ? undefined
          : { name: conversation.phone, phone: conversation.phone },
        saleType,
        dueDate: saleType === "CREDIT" && dueDate ? dueDate : null,
        amountPaid: Number(amountPaid || 0),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const result = await createWhatsAppSaleDraft(conversation.id, payload);

      toast.success("WhatsApp draft sale created");
      onCreated?.(result.draft);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Could not create draft sale"));
    } finally {
      setSaving(false);
    }
  }

  const total = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  return (
    <div className="svx-wa-modal-backdrop">
      <div className="svx-wa-modal is-wide">
        <header className="svx-wa-modal-head">
          <div>
            <p>WhatsApp sale draft</p>
            <h2>Prepare customer order</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-wa-modal-grid">
          <section>
            <form onSubmit={runSearch} className="svx-wa-search-form">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search product, SKU, model, barcode..."
              />
              <AsyncButton type="submit" loading={searching} loadingText="Searching...">
                Search
              </AsyncButton>
            </form>

            <div className="svx-wa-product-grid">
              {products.map((product) => (
                <button key={product.id} type="button" onClick={() => addProduct(product)}>
                  <strong>{product.name}</strong>
                  <span>Stock {product.stockQty}</span>
                  <small>{money(product.sellPrice)}</small>
                </button>
              ))}
            </div>
          </section>

          <aside className="svx-wa-draft-builder">
            <h3>Draft summary</h3>

            <div className="svx-wa-draft-items">
              {items.length ? (
                items.map((item) => (
                  <article key={item.productId}>
                    <div>
                      <strong>{item.name}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((entry) => entry.productId !== item.productId)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <label>
                      Qty
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) => updateQty(item.productId, event.target.value)}
                      />
                    </label>
                  </article>
                ))
              ) : (
                <p>No product added yet.</p>
              )}
            </div>

            <div className="svx-wa-sale-type-grid">
              {["CREDIT", "CASH"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSaleType(type)}
                  className={cx(saleType === type && "is-active")}
                >
                  {statusLabel(type)}
                </button>
              ))}
            </div>

            {saleType === "CREDIT" ? (
              <div className="svx-wa-form-grid is-one">
                <label>
                  <span>Deposit paid now</span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(event.target.value)}
                    placeholder="Deposit paid now"
                  />
                </label>

                <label>
                  <span>Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            <div className="svx-wa-total-box">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <AsyncButton onClick={submit} loading={saving} loadingText="Creating...">
              Create draft sale
            </AsyncButton>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function AssignModal({ open, staff, conversation, onClose, onAssigned }) {
  const [savingId, setSavingId] = useState("");

  if (!open) return null;

  async function assign(staffId) {
    if (!conversation?.id) return;

    setSavingId(staffId);

    try {
      const result = await assignWhatsAppConversationOwner(conversation.id, { assignedToId: staffId });
      toast.success("Conversation assigned");
      onAssigned?.(result.conversation);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Assignment failed"));
    } finally {
      setSavingId("");
    }
  }

  async function clear() {
    if (!conversation?.id) return;

    setSavingId("clear");

    try {
      const result = await clearWhatsAppConversationOwner(conversation.id);
      toast.success("Assignment cleared");
      onAssigned?.(result.conversation);
      onClose?.();
    } catch (err) {
      toast.error(safeError(err, "Could not clear assignment"));
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="svx-wa-modal-backdrop">
      <div className="svx-wa-modal">
        <header className="svx-wa-modal-head">
          <div>
            <p>Assign conversation</p>
            <h2>Choose responsible staff</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="svx-wa-staff-list">
          {staff.length ? (
            staff.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => assign(person.id)}
                disabled={Boolean(savingId)}
              >
                <span>
                  <strong>{person.name || person.email}</strong>
                  <small>{person.role}</small>
                </span>
                <em>{savingId === person.id ? "Assigning..." : "Assign"}</em>
              </button>
            ))
          ) : (
            <EmptyState
              title="No assignable staff"
              body="No staff members are available for WhatsApp assignment."
            />
          )}
        </div>

        <AsyncButton
          onClick={clear}
          loading={savingId === "clear"}
          loadingText="Clearing..."
          variant="secondary"
        >
          Clear assignment
        </AsyncButton>
      </div>
    </div>
  );
}

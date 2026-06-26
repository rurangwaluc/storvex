import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../../components/ui/AsyncButton";
import { searchProducts } from "../../../services/inventoryApi";
import {
  assignWhatsAppConversationOwner,
  clearWhatsAppConversationOwner,
  createWhatsAppAccount,
  createWhatsAppSaleDraft,
  setWhatsAppAccountActive,
  updateWhatsAppAccount,
} from "../../../services/whatsappApi";
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

  const [businessName, setBusinessName] = useState(account?.businessName || "");
  const [phoneNumber, setPhoneNumber] = useState(account?.phoneNumber || "");
  const [phoneNumberId, setPhoneNumberId] = useState(account?.phoneNumberId || "");
  const [wabaId, setWabaId] = useState(account?.wabaId || "");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const hasPhone = Boolean(phoneNumber.trim() || account?.phoneNumber);
  const hasPhoneNumberId = Boolean(phoneNumberId.trim() || account?.phoneNumberId);
  const hasWabaId = Boolean(wabaId.trim() || account?.wabaId);
  const hasToken = Boolean(accessToken.trim() || account?.hasAccessToken);
  const hasSavedAccount = Boolean(account?.id);
  const isConnected = hasSavedAccount && hasPhone && hasPhoneNumberId && hasWabaId && hasToken;
  const isLive = isConnected && Boolean(account?.isActive);

  const checklist = [
    {
      id: "business",
      label: "Business profile",
      text: hasPhone ? "Store number is saved for customers." : "Add the store WhatsApp number customers will use.",
      done: hasPhone,
    },
    {
      id: "meta",
      label: "Meta IDs",
      text:
        hasPhoneNumberId && hasWabaId
          ? "Phone number ID and WABA ID are ready."
          : "Add the Meta phone number ID and WhatsApp Business Account ID.",
      done: hasPhoneNumberId && hasWabaId,
    },
    {
      id: "token",
      label: "Access token",
      text: hasToken ? "Sending token is saved." : "Add the access token before sending messages.",
      done: hasToken,
    },
    {
      id: "active",
      label: "Account status",
      text: account?.isActive ? "Customer messaging is active." : "Activate only when credentials are correct.",
      done: Boolean(account?.isActive),
    },
  ];

  const completedSteps = checklist.filter((item) => item.done).length;
  const healthTone = isLive ? "success" : isConnected ? "warning" : hasSavedAccount ? "neutral" : "danger";
  const healthLabel = isLive ? "Connected" : isConnected ? "Ready to activate" : hasSavedAccount ? "Needs setup" : "Not connected";

  useEffect(() => {
    setBusinessName(account?.businessName || "");
    setPhoneNumber(account?.phoneNumber || "");
    setPhoneNumberId(account?.phoneNumberId || "");
    setWabaId(account?.wabaId || "");
    setAccessToken("");
  }, [account?.id]);

  async function save(event) {
    event.preventDefault();

    if (!phoneNumber.trim()) return toast.error("Store WhatsApp number is required");

    setSaving(true);

    try {
      const payload = {
        businessName: businessName.trim(),
        phoneNumber: phoneNumber.trim(),
        phoneNumberId: phoneNumberId.trim() || null,
        wabaId: wabaId.trim() || null,
        ...(accessToken.trim() ? { accessToken: accessToken.trim() } : {}),
      };

      if (account?.id) await updateWhatsAppAccount(account.id, payload);
      else await createWhatsAppAccount(payload);

      toast.success("WhatsApp connection saved");
      await onRefresh?.();
    } catch (err) {
      toast.error(safeError(err, "WhatsApp connection failed"));
    } finally {
      setSaving(false);
    }
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
        <p>Connection</p>
        <h2>WhatsApp account setup</h2>
        <span>
          Connect the store WhatsApp number safely. Customers only see the business number; staff
          manage conversations, draft sales, follow-ups and campaign reports inside Storvex.
        </span>
      </div>

      <div className="svx-wa-account-hero">
        <div className="svx-wa-account-hero-main">
          <Badge tone={healthTone}>{healthLabel}</Badge>
          <h3>{account?.businessName || businessName || "No WhatsApp account connected"}</h3>
          <p>
            {isLive
              ? "This workspace is ready to receive customer messages and send approved broadcasts."
              : isConnected
                ? "Credentials are saved. Activate the account when you are ready to send and receive customer messages."
                : "Finish the checklist below before turning on customer messaging."}
          </p>
        </div>

        <div className="svx-wa-account-hero-side">
          <span>Setup progress</span>
          <strong>{completedSteps}/4</strong>
          <small>{phoneNumber || "Store number not added"}</small>
        </div>
      </div>

      <div className="svx-wa-account-health-grid">
        <MetricCard
          label="Connection"
          value={isLive ? "Live" : isConnected ? "Ready" : hasSavedAccount ? "Review" : "Not set"}
          note={isLive ? "Live for customers" : isConnected ? "Ready to activate" : "Finish setup"}
          tone={healthTone}
          icon={<LinkSignalIcon />}
        />
        <MetricCard
          label="Store number"
          value={hasPhone ? "Saved" : "Add number"}
          note={phoneNumber || account?.phoneNumber || "Required"}
          tone={hasPhone ? "success" : "warning"}
          icon={<StoreNumberIcon />}
        />
        <MetricCard
          label="Meta IDs"
          value={hasPhoneNumberId && hasWabaId ? "Ready" : "Add IDs"}
          note="Phone ID + WABA"
          tone={hasPhoneNumberId && hasWabaId ? "success" : "warning"}
          icon={<MetaIdsIcon />}
        />
        <MetricCard
          label="Access token"
          value={hasToken ? "Saved" : "Add token"}
          note={account?.hasAccessToken ? "Stored securely" : "Required for sending"}
          tone={hasToken ? "success" : "warning"}
          icon={<SecureKeyIcon />}
        />
      </div>

      <div className="svx-wa-setup-layout">
        <div className="svx-wa-setup-checklist">
          <div className="svx-wa-setup-card-title">
            <span>Owner checklist</span>
            <strong>Ready before sending</strong>
          </div>

          {checklist.map((item) => (
            <div key={item.id} className={cx("svx-wa-setup-step", item.done && "is-done")}>
              <span className="svx-wa-setup-step-mark">{item.done ? "✓" : ""}</span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={save} className="svx-wa-setup-form">
          <div className="svx-wa-setup-head">
            <div>
              <Badge tone={account?.isActive ? "success" : "neutral"}>
                {account?.isActive ? "Active" : "Paused"}
              </Badge>
              <h3>Connection details</h3>
              <p>Use the official Meta WhatsApp Business details for this store.</p>
            </div>

            {account?.id ? (
              <AsyncButton
                type="button"
                onClick={toggleActive}
                loading={toggling}
                loadingText="Updating..."
                variant="secondary"
              >
                {account.isActive ? "Pause" : "Activate"}
              </AsyncButton>
            ) : null}
          </div>

          <div className="svx-wa-form-grid">
            <label>
              <span>Business name</span>
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Business name shown to customers"
              />
            </label>

            <label>
              <span>Store WhatsApp number</span>
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="2507XXXXXXXX"
              />
            </label>

            <label>
              <span>Meta phone number ID</span>
              <input
                value={phoneNumberId}
                onChange={(event) => setPhoneNumberId(event.target.value)}
                placeholder="Phone number ID from Meta"
              />
            </label>

            <label>
              <span>WhatsApp Business Account ID</span>
              <input
                value={wabaId}
                onChange={(event) => setWabaId(event.target.value)}
                placeholder="WABA ID from Meta"
              />
            </label>

            <label className="is-wide">
              <span>Access token</span>
              <input
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder={
                  account?.hasAccessToken
                    ? "Already saved. Enter only if replacing."
                    : "Paste WhatsApp access token"
                }
              />
              <small>
                Storvex does not show saved tokens again. Paste a new token only when replacing the
                current one.
              </small>
            </label>
          </div>

          <div className="svx-wa-setup-actions">
            <AsyncButton type="submit" loading={saving} loadingText="Saving...">
              Save connection
            </AsyncButton>
            <p>
              Keep the account paused until the number, Meta IDs and token have been checked. This
              prevents customers from hitting an unfinished setup.
            </p>
          </div>
        </form>
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


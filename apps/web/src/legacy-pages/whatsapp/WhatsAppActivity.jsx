import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { listWhatsAppConversations, listWhatsAppSaleDrafts } from "../../services/whatsappInboxApi";
import { listWhatsAppAccounts } from "../../services/whatsappAccountsApi";
import WhatsAppWorkspaceTabs from "./WhatsAppWorkspaceTabs";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
}

function inputClass() {
  return "app-input";
}

function successBadge() {
  return "bg-[#7cfcc6] text-[#0b3b2e]";
}

function infoBadge() {
  return "bg-[#57b5ff] text-[#06263d]";
}

function warningBadge() {
  return "bg-[#ff9f43] text-[#402100]";
}

function processBadge() {
  return "bg-[#ffe45e] text-[#4a4300]";
}

function neutralBadge() {
  return "bg-[var(--color-surface)] text-[var(--color-text-muted)]";
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2
        className={cx(
          "mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]",
          strongText()
        )}
      >
        {title}
      </h2>

      {subtitle ? <p className={cx("mt-3 text-sm leading-6", mutedText())}>{subtitle}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-300"
      : tone === "danger"
      ? "text-[var(--color-danger)]"
      : strongText();

  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
      ? "bg-amber-500"
      : tone === "danger"
      ? "bg-[var(--color-danger)]"
      : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />
      <div className="pl-2">
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>
        <div className={cx("mt-2 break-words text-[1.7rem] font-black tracking-tight", toneClass)}>
          {value}
        </div>
        {note ? <div className={cx("mt-2 text-sm leading-6", mutedText())}>{note}</div> : null}
      </div>
    </article>
  );
}

function ProtectionPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? successBadge()
      : tone === "info"
      ? infoBadge()
      : tone === "warning"
      ? warningBadge()
      : tone === "process"
      ? processBadge()
      : neutralBadge();

  return (
    <span
      className={cx("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold", cls)}
    >
      {children}
    </span>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>
      <div className={cx("mt-2 break-words text-sm font-bold leading-6", strongText())}>
        {value || "—"}
      </div>
      {sub ? <div className={cx("mt-1 break-words text-xs leading-5", mutedText())}>{sub}</div> : null}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(softPanel(), "px-5 py-10 text-center")}>
      <div className={cx("text-base font-semibold", strongText())}>{title}</div>
      <div className={cx("mt-2 text-sm leading-6", mutedText())}>{text}</div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12a8 8 0 10-2.34 5.66M20 12V6m0 6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActivityIcon({ tone = "neutral" }) {
  const cls =
    tone === "success"
      ? "bg-[#7cfcc6] text-[#0b3b2e]"
      : tone === "warning"
      ? "bg-[#ff9f43] text-[#402100]"
      : tone === "process"
      ? "bg-[#ffe45e] text-[#4a4300]"
      : tone === "info"
      ? "bg-[#57b5ff] text-[#06263d]"
      : "bg-[var(--color-surface)] text-[var(--color-text-muted)]";

  return (
    <div className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", cls)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 6v6l4 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M21 12a9 9 0 11-3.2-6.9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatTimeAgo(value) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return "Just now";

  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  return d.toLocaleDateString();
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

function isToday(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfToday();
}

function isYesterday(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d >= startOfYesterday() && d < startOfToday();
}

function dayGroupLabel(value) {
  if (!value) return "No date";
  if (isToday(value)) return "Today";
  if (isYesterday(value)) return "Yesterday";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeConversation(raw) {
  if (!raw) return null;

  return {
    id: String(raw.id || ""),
    phone: String(raw.phone || ""),
    status: String(raw.status || "OPEN").toUpperCase(),
    assignedToId: String(raw.assignedToId || ""),
    accountId: String(raw.accountId || ""),
    customerId: String(raw.customerId || raw.customer?.id || ""),
    updatedAt: raw.updatedAt || null,
    createdAt: raw.createdAt || null,
    customer: raw.customer
      ? {
          id: String(raw.customer.id || ""),
          name: String(raw.customer.name || ""),
          phone: String(raw.customer.phone || raw.phone || ""),
          email: String(raw.customer.email || ""),
        }
      : null,
  };
}

function normalizeDraft(raw) {
  if (!raw) return null;

  return {
    id: String(raw.id || ""),
    conversationId: String(raw.conversationId || raw.conversation?.id || ""),
    customerId: String(raw.customerId || ""),
    saleType: String(raw.saleType || "CREDIT").toUpperCase(),
    status: String(raw.status || ""),
    total: Number(raw.total || 0),
    balanceDue: Number(raw.balanceDue || 0),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || raw.finalizedAt || raw.createdAt || null,
  };
}

function normalizeAccount(raw) {
  if (!raw) return null;

  return {
    id: String(raw.id || ""),
    tenantId: String(raw.tenantId || ""),
    phoneNumber: String(raw.phoneNumber || ""),
    businessName: String(raw.businessName || ""),
    phoneNumberId: String(raw.phoneNumberId || ""),
    wabaId: String(raw.wabaId || ""),
    hasAccessToken: Boolean(raw.hasAccessToken),
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

function buildActivityFeed({ conversations, drafts, accounts }) {
  const events = [];

  for (const account of accounts) {
    events.push({
      id: `account-${account.id}-${account.updatedAt || account.createdAt || "x"}`,
      kind: "CHANNEL",
      tone: account.isActive ? "success" : "warning",
      title: account.isActive ? "WhatsApp channel active" : "WhatsApp channel inactive",
      description: account.businessName || account.phoneNumber || "WhatsApp channel",
      meta: account.phoneNumber || "No phone number saved",
      at: account.updatedAt || account.createdAt || null,
      link: "/app/whatsapp/accounts",
      sortAt: new Date(account.updatedAt || account.createdAt || 0).getTime(),
    });
  }

  for (const convo of conversations) {
    events.push({
      id: `conversation-${convo.id}-${convo.updatedAt || convo.createdAt || "x"}`,
      kind: "CONVERSATION",
      tone: convo.status === "OPEN" ? "info" : "neutral",
      title: convo.status === "OPEN" ? "Conversation needs attention" : "Conversation closed",
      description: convo.customer?.name || convo.customer?.phone || convo.phone || "Unknown customer",
      meta: convo.customer?.email || convo.phone || "WhatsApp conversation",
      at: convo.updatedAt || convo.createdAt || null,
      link: "/app/whatsapp/inbox",
      sortAt: new Date(convo.updatedAt || convo.createdAt || 0).getTime(),
    });
  }

  for (const draft of drafts) {
    events.push({
      id: `draft-${draft.id}-${draft.updatedAt || draft.createdAt || "x"}`,
      kind: "DRAFT",
      tone: draft.saleType === "CREDIT" ? "warning" : "process",
      title: `${draft.saleType === "CREDIT" ? "Credit" : "Cash"} draft active`,
      description: `Draft #${String(draft.id).slice(-6).toUpperCase()}`,
      meta: `RWF ${Number(draft.total || 0).toLocaleString()}`,
      at: draft.updatedAt || draft.createdAt || null,
      link: "/app/whatsapp/drafts",
      sortAt: new Date(draft.updatedAt || draft.createdAt || 0).getTime(),
    });
  }

  return events.sort((a, b) => b.sortAt - a.sortAt);
}

function ActivityRow({ item, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        softPanel(),
        "w-full overflow-hidden border border-transparent p-4 text-left transition hover:translate-y-[-1px]"
      )}
    >
      <div className="flex items-start gap-3">
        <ActivityIcon tone={item.tone} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ProtectionPill tone={item.tone}>{item.kind}</ProtectionPill>
            <div className={cx("text-xs", softText())}>{formatTimeAgo(item.at)}</div>
          </div>

          <div className={cx("mt-2 break-words text-sm font-bold", strongText())}>
            {item.title}
          </div>

          <div className={cx("mt-1 break-words text-sm leading-6", mutedText())}>
            {item.description}
          </div>

          {item.meta ? (
            <div className={cx("mt-1 break-words text-xs leading-5", softText())}>{item.meta}</div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className={cx("text-xs", mutedText())}>{formatDateTime(item.at)}</div>
            <div className="shrink-0 text-xs font-semibold text-[var(--color-primary)]">Open →</div>
          </div>
        </div>
      </div>
    </button>
  );
}

function GroupBlock({ title, items, onOpen, expanded, onExpand }) {
  return (
    <section className={cx(pageCard(), "overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={cx("text-lg font-black tracking-tight", strongText())}>{title}</div>
            <div className={cx("mt-1 text-sm", mutedText())}>{items.length} items</div>
          </div>

          {!expanded ? (
            <button type="button" onClick={onExpand} className={secondaryBtn()}>
              Show more
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <ActivityRow key={item.id} item={item} onOpen={() => onOpen(item)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function WhatsAppActivity() {
  const nav = useNavigate();
  const mountedRef = useRef(true);

  const [accounts, setAccounts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [drafts, setDrafts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const [groupExpanded, setGroupExpanded] = useState({});

  useEffect(() => {
    mountedRef.current = true;
    document.title = "WhatsApp Activity • Storvex";

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadActivity(showToast = false) {
    try {
      if (!accounts.length && !conversations.length && !drafts.length) setLoading(true);
      else setRefreshing(true);

      const [accountsRes, conversationsRes, draftsRes] = await Promise.all([
        listWhatsAppAccounts(),
        listWhatsAppConversations(),
        listWhatsAppSaleDrafts(),
      ]);

      if (!mountedRef.current) return;

      const nextAccounts = Array.isArray(accountsRes?.accounts)
        ? accountsRes.accounts.map(normalizeAccount).filter(Boolean)
        : [];

      const nextConversations = Array.isArray(conversationsRes?.conversations)
        ? conversationsRes.conversations.map(normalizeConversation).filter(Boolean)
        : [];

      const nextDrafts = Array.isArray(draftsRes?.drafts)
        ? draftsRes.drafts.map(normalizeDraft).filter(Boolean)
        : [];

      setAccounts(nextAccounts);
      setConversations(nextConversations);
      setDrafts(nextDrafts);

      if (showToast) toast.success("WhatsApp activity refreshed");
    } catch (err) {
      console.error(err);
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load WhatsApp activity");
      setAccounts([]);
      setConversations([]);
      setDrafts([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  const summary = useMemo(() => {
    const activeChannels = accounts.filter((x) => x.isActive).length;
    const connectedChannels = accounts.filter((x) => x.hasAccessToken).length;
    const openConversations = conversations.filter((x) => x.status === "OPEN").length;
    const draftCount = drafts.length;

    return {
      activeChannels,
      connectedChannels,
      openConversations,
      draftCount,
    };
  }, [accounts, conversations, drafts]);

  const activityFeed = useMemo(() => {
    return buildActivityFeed({ conversations, drafts, accounts });
  }, [accounts, conversations, drafts]);

  const filteredFeed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activityFeed;

    return activityFeed.filter((item) => {
      return (
        String(item.kind || "").toLowerCase().includes(q) ||
        String(item.title || "").toLowerCase().includes(q) ||
        String(item.description || "").toLowerCase().includes(q) ||
        String(item.meta || "").toLowerCase().includes(q)
      );
    });
  }, [activityFeed, query]);

  const groupedFeed = useMemo(() => {
    const grouped = new Map();

    for (const item of filteredFeed) {
      const key = dayGroupLabel(item.at);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }

    return Array.from(grouped.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [filteredFeed]);

  const latestConversation = useMemo(() => {
    return [...conversations].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )[0] || null;
  }, [conversations]);

  const latestDraft = useMemo(() => {
    return [...drafts].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )[0] || null;
  }, [drafts]);

  function getVisibleItems(label, items) {
    if (groupExpanded[label]) return items;
    return items.slice(0, 12);
  }

  function handleOpen(item) {
    nav(item.link);
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-44" lines={5} variant="default" />;
  }

  return (
    <div className="space-y-6">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="WhatsApp"
                title="Activity"
                subtitle="See channel readiness, active customer conversations, and live WhatsApp draft movement from one clear operational view."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => nav("/app/whatsapp/accounts")}
                className={secondaryBtn()}
              >
                Open channels
              </button>

              <button
                type="button"
                onClick={() => nav("/app/whatsapp/inbox")}
                className={secondaryBtn()}
              >
                Open inbox
              </button>

              <AsyncButton
                type="button"
                loading={refreshing}
                loadingText="Refreshing..."
                onClick={() => loadActivity(true)}
                className={primaryBtn()}
              >
                <span className={cx("mr-2 inline-flex", refreshing ? "animate-spin" : "")}>
                  <RefreshIcon />
                </span>
                Refresh activity
              </AsyncButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Active channels"
            value={summary.activeChannels}
            note="WhatsApp numbers currently turned on"
            tone="success"
          />
          <SummaryCard
            label="Connected channels"
            value={summary.connectedChannels}
            note="Channels with saved connection details"
            tone="neutral"
          />
          <SummaryCard
            label="Open conversations"
            value={summary.openConversations}
            note="Customer threads still needing attention"
            tone="warning"
          />
          <SummaryCard
            label="Live drafts"
            value={summary.draftCount}
            note="WhatsApp sale drafts currently active"
            tone="process"
          />
        </div>
      </section>

      <WhatsAppWorkspaceTabs />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className={cx(pageCard(), "overflow-hidden")}>
            <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className={cx("text-lg font-black tracking-tight", strongText())}>
                    Activity stream
                  </div>
                  <p className={cx("mt-1 text-sm leading-6", mutedText())}>
                    Grouped and compact so the page stays clean even with high WhatsApp volume.
                  </p>
                </div>

                <div className="relative w-full max-w-md">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                    <SearchIcon />
                  </span>
                  <input
                    className={cx(inputClass(), "pl-10")}
                    placeholder="Search activity by type, customer, channel, or draft..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {groupedFeed.length === 0 ? (
                <EmptyState
                  title="No activity found"
                  text="There is no WhatsApp activity matching your current search."
                />
              ) : (
                <div className="space-y-6">
                  {groupedFeed.map((group) => {
                    const visibleItems = getVisibleItems(group.label, group.items);
                    const expanded =
                      groupExpanded[group.label] || visibleItems.length >= group.items.length;

                    return (
                      <GroupBlock
                        key={group.label}
                        title={group.label}
                        items={visibleItems}
                        expanded={expanded}
                        onExpand={() =>
                          setGroupExpanded((prev) => ({ ...prev, [group.label]: true }))
                        }
                        onOpen={handleOpen}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strongText())}>
              Current visibility
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <InfoRow
                label="Latest conversation"
                value={
                  latestConversation
                    ? latestConversation.customer?.name ||
                      latestConversation.customer?.phone ||
                      latestConversation.phone ||
                      "Unknown customer"
                    : "None"
                }
                sub={
                  latestConversation
                    ? `${latestConversation.status} • ${formatDateTime(
                        latestConversation.updatedAt || latestConversation.createdAt
                      )}`
                    : "No recent conversation available"
                }
              />

              <InfoRow
                label="Latest draft"
                value={
                  latestDraft
                    ? `#${String(latestDraft.id).slice(-6).toUpperCase()}`
                    : "None"
                }
                sub={
                  latestDraft
                    ? `${latestDraft.saleType} • RWF ${Number(latestDraft.total || 0).toLocaleString()}`
                    : "No recent draft available"
                }
              />

              <InfoRow
                label="Channel readiness"
                value={`${summary.connectedChannels}/${accounts.length}`}
                sub="Connected channels out of all saved channels"
              />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strongText())}>
              What this page shows
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-sm font-bold", strongText())}>Channel readiness</div>
                <div className={cx("mt-1 text-sm leading-6", mutedText())}>
                  Which WhatsApp numbers are active and which ones still need setup.
                </div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-sm font-bold", strongText())}>Conversation load</div>
                <div className={cx("mt-1 text-sm leading-6", mutedText())}>
                  Which customer threads still need staff attention.
                </div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-sm font-bold", strongText())}>Draft movement</div>
                <div className={cx("mt-1 text-sm leading-6", mutedText())}>
                  WhatsApp-created drafts that are still active and ready for sales follow-up.
                </div>
              </div>
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strongText())}>
              Quick actions
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => nav("/app/whatsapp/accounts")}
                className={secondaryBtn()}
              >
                Open WhatsApp channels
              </button>

              <button
                type="button"
                onClick={() => nav("/app/whatsapp/inbox")}
                className={secondaryBtn()}
              >
                Open WhatsApp inbox
              </button>

              <button
                type="button"
                onClick={() => nav("/app/whatsapp/drafts")}
                className={secondaryBtn()}
              >
                Open WhatsApp drafts
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
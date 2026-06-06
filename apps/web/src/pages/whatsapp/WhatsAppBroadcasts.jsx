// src/pages/whatsapp/WhatsAppBroadcasts.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  createWhatsAppBroadcast,
  listWhatsAppBroadcasts,
  queueWhatsAppBroadcast,
  sendWhatsAppBroadcastNow,
  updateWhatsAppBroadcast,
} from "../../services/whatsappBroadcastsApi";
import { listWhatsAppAccounts } from "../../services/whatsappAccountsApi";
import {
  createPromotion,
  listPromotions,
} from "../../services/promotionsApi";
import WhatsAppWorkspaceTabs from "./WhatsAppWorkspaceTabs";

// ─── style helpers ────────────────────────────────────────────────────────────

function cx(...xs) { return xs.filter(Boolean).join(" "); }
const strong  = () => "text-[var(--color-text)]";
const muted   = () => "text-[var(--color-text-muted)]";
const soft    = () => "text-[var(--color-text-muted)]";
const card    = () => "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const panel   = () => "rounded-[22px] bg-[var(--color-surface-2)]";
const inpCls  = () => "app-input";
const txaCls  = () => cx(
  "w-full min-h-[140px] resize-y rounded-[20px] border border-[var(--color-border)]",
  "bg-[var(--color-card)] px-4 py-3.5 text-sm leading-6 text-[var(--color-text)]",
  "outline-none transition placeholder:text-[var(--color-text-muted)]",
  "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
);
const primaryBtn   = () => "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryBtn = () => "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const dangerBtn    = () => "inline-flex h-11 items-center justify-center rounded-2xl bg-[rgba(219,80,74,0.12)] px-5 text-sm font-semibold text-[var(--color-danger)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
const fieldLbl     = () => "mb-1.5 block text-sm font-medium text-[var(--color-text)]";
const fieldHlp     = () => "mt-1.5 text-xs leading-5 text-[var(--color-text-muted)]";

// ─── status helpers ───────────────────────────────────────────────────────────

function statusTone(s) {
  const v = String(s || "").toUpperCase();
  if (v === "SENT")   return "success";
  if (v === "QUEUED") return "process";
  if (v === "FAILED") return "warning";
  return "info";
}
function statusLabel(s) {
  const v = String(s || "").toUpperCase();
  if (v === "SENT")   return "Sent";
  if (v === "QUEUED") return "Queued";
  if (v === "FAILED") return "Failed";
  return "Draft";
}

// ─── badges ───────────────────────────────────────────────────────────────────

const TONE_CLS = {
  success: "bg-[#7cfcc6] text-[#0b3b2e]",
  info:    "bg-[#57b5ff] text-[#06263d]",
  warning: "bg-[#ff9f43] text-[#402100]",
  process: "bg-[#ffe45e] text-[#4a4300]",
  neutral: "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
  danger:  "bg-[rgba(219,80,74,0.14)] text-[var(--color-danger)]",
};

function Pill({ tone = "neutral", children }) {
  return (
    <span className={cx(
      "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold",
      TONE_CLS[tone] || TONE_CLS.neutral
    )}>
      {children}
    </span>
  );
}

// ─── utils ────────────────────────────────────────────────────────────────────

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
function fmtAgo(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60000)          return "Just now";
  const m = Math.floor(diff / 60000);
  if (m < 60)                return `${m}m ago`;
  const h = Math.floor(diff / 3600000);
  if (h < 24)                return `${h}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── normalizers ─────────────────────────────────────────────────────────────

function normalizeBroadcast(raw) {
  if (!raw) return null;
  return {
    id:             String(raw.id || ""),
    tenantId:       String(raw.tenantId || ""),
    accountId:      String(raw.accountId || ""),
    promotionId:    String(raw.promotionId || ""),
    templateName:   String(raw.templateName || ""),
    languageCode:   String(raw.languageCode || "en_US"),
    status:         String(raw.status || "DRAFT").toUpperCase(),
    createdById:    String(raw.createdById || ""),
    queuedAt:       raw.queuedAt || null,
    sentAt:         raw.sentAt   || null,
    createdAt:      raw.createdAt|| null,
    recipientCount: Number(raw.recipientCount || 0),
    deliveredCount: Number(raw.deliveredCount || 0),
    account: raw.account
      ? {
          id:           String(raw.account.id || ""),
          phoneNumber:  String(raw.account.phoneNumber || ""),
          businessName: String(raw.account.businessName || ""),
          isActive:     Boolean(raw.account.isActive),
        }
      : null,
    promotion: raw.promotion
      ? {
          id:        String(raw.promotion.id || ""),
          title:     String(raw.promotion.title || ""),
          message:   typeof raw.promotion.message === "string" ? raw.promotion.message : "",
          productId: String(raw.promotion.productId || ""),
          sentAt:    raw.promotion.sentAt   || null,
          createdAt: raw.promotion.createdAt|| null,
        }
      : null,
    createdBy: raw.createdBy
      ? {
          id:   String(raw.createdBy.id || ""),
          name: String(raw.createdBy.name || ""),
          role: String(raw.createdBy.role || ""),
        }
      : null,
  };
}

function normalizeAccount(raw) {
  return {
    id:           String(raw?.id || ""),
    phoneNumber:  String(raw?.phoneNumber || ""),
    businessName: String(raw?.businessName || ""),
    isActive:     Boolean(raw?.isActive),
  };
}

function normalizePromotion(raw) {
  if (!raw) return null;
  return {
    id:        String(raw.id || ""),
    title:     String(raw.title || ""),
    message:   typeof raw.message === "string" ? raw.message : "",
    productId: String(raw.productId || ""),
    sentAt:    raw.sentAt    || null,
    createdAt: raw.createdAt || null,
  };
}

// ─── atoms ────────────────────────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow && (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>{eyebrow}</div>
      )}
      <h2 className={cx("mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", strong())}>{title}</h2>
      {subtitle && <p className={cx("mt-3 text-sm leading-6", muted())}>{subtitle}</p>}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const valCls =
    tone === "success" ? "text-emerald-600 dark:text-emerald-300"
    : tone === "warning" ? "text-amber-600 dark:text-amber-300"
    : tone === "danger"  ? "text-[var(--color-danger)]"
    : strong();
  const accent =
    tone === "success" ? "bg-emerald-500"
    : tone === "warning" ? "bg-amber-500"
    : tone === "danger"  ? "bg-[var(--color-danger)]"
    : "bg-[var(--color-primary)]";
  return (
    <article className={cx(card(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accent)} />
      <div className="pl-2">
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>{label}</div>
        <div className={cx("mt-2 text-[1.7rem] font-black tracking-tight", valCls)}>{value}</div>
        {note && <div className={cx("mt-2 text-sm leading-6", muted())}>{note}</div>}
      </div>
    </article>
  );
}

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(panel(), "p-4")}>
      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>{label}</div>
      <div className={cx("mt-2 break-words text-sm font-bold leading-6", strong())}>{value || "—"}</div>
      {sub && <div className={cx("mt-1 text-xs leading-5", muted())}>{sub}</div>}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(panel(), "px-5 py-10 text-center")}>
      <div className={cx("text-base font-semibold", strong())}>{title}</div>
      <div className={cx("mt-2 text-sm leading-6", muted())}>{text}</div>
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 12a8 8 0 10-2.34 5.66M20 12V6m0 6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── PromotionSelector ────────────────────────────────────────────────────────
// Dropdown that shows existing promotions + inline create form.

function PromotionSelector({ value, onSelect }) {
  const [promotions,   setPromotions]   = useState([]);
  const [loadingList,  setLoadingList]  = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [title,        setTitle]        = useState("");
  const [message,      setMessage]      = useState("");
  const [creating,     setCreating]     = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function loadPromotions() {
    setLoadingList(true);
    try {
      const res = await listPromotions({ limit: 100 });
      if (!mountedRef.current) return;
      setPromotions(Array.isArray(res?.promotions) ? res.promotions.map(normalizePromotion).filter(Boolean) : []);
    } catch (err) {
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load promotions");
    } finally {
      if (mountedRef.current) setLoadingList(false);
    }
  }

  // Load once on mount
  useEffect(() => { void loadPromotions(); }, []); // eslint-disable-line

  async function handleCreate() {
    const t = title.trim();
    const m = message.trim();
    if (!t) { toast.error("Campaign title is required"); return; }
    if (!m) { toast.error("Message body is required"); return; }

    setCreating(true);
    try {
      const res = await createPromotion({ title: t, message: m });
      const created = res?.promotion ? normalizePromotion(res.promotion) : null;
      if (!created) { toast.error("Promotion created but server returned no data"); return; }

      setPromotions(prev => [created, ...prev]);
      onSelect(created);
      setTitle("");
      setMessage("");
      setShowCreate(false);
      toast.success("Promotion created and selected");
    } catch (err) {
      toast.error(err?.message || "Failed to create promotion");
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }

  const selected = promotions.find(p => p.id === value) || null;

  return (
    <div className="space-y-3">
      {/* Selected preview */}
      {selected ? (
        <div className={cx(panel(), "relative border border-[var(--color-primary-ring)] p-3")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className={cx("text-[10px] font-semibold uppercase tracking-[0.18em]", soft())}>Selected campaign message</div>
              <div className={cx("mt-1 text-sm font-bold", strong())}>{selected.title}</div>
              <div className={cx("mt-1 line-clamp-2 text-xs leading-5", muted())}>{selected.message}</div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="shrink-0 text-[var(--color-danger)] transition hover:opacity-80"
              aria-label="Clear selection"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className={cx(panel(), "flex items-center gap-2 p-3 text-xs", muted())}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          No campaign message linked — send will fail without one.
        </div>
      )}

      {/* Existing promotions dropdown */}
      <div>
        <label className={fieldLbl()}>Pick an existing campaign message</label>
        <select
          className={inpCls()}
          value={value || ""}
          onChange={e => {
            const id = e.target.value;
            const found = id ? (promotions.find(p => p.id === id) || null) : null;
            onSelect(found);
          }}
          disabled={loadingList}
        >
          <option value="">{loadingList ? "Loading…" : "— choose existing —"}</option>
          {promotions.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <p className={fieldHlp()}>Reuse a promotion you already created, or create a new one below.</p>
      </div>

      {/* Inline create toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowCreate(v => !v)}
          className={cx(
            "inline-flex h-9 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
            showCreate
              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:opacity-90"
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d={showCreate ? "M6 12h12" : "M12 5v14M5 12h14"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          {showCreate ? "Cancel new message" : "Create new campaign message"}
        </button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className={cx(panel(), "space-y-3 border border-[var(--color-border)] p-4")}>
          <div className={cx("text-sm font-bold", strong())}>New campaign message</div>
          <div>
            <label className={fieldLbl()}>Title <span className="text-[var(--color-danger)]">*</span></label>
            <input
              className={inpCls()}
              placeholder="e.g. Weekend phone deal"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={creating}
            />
            <p className={fieldHlp()}>Internal label — helps the team identify this campaign.</p>
          </div>
          <div>
            <label className={fieldLbl()}>Message body <span className="text-[var(--color-danger)]">*</span></label>
            <textarea
              className={txaCls()}
              placeholder={"Hello {{1}},\n\nWe have a special offer on {{2}} — {{3}}.\n\nReply to learn more."}
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={creating}
            />
            <p className={fieldHlp()}>
              Use <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 text-[11px]">{"{{1}}"}</code> for customer name,{" "}
              <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 text-[11px]">{"{{2}}"}</code> for product name,{" "}
              <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 text-[11px]">{"{{3}}"}</code> for custom offer text.
              Must match your approved WhatsApp template parameters.
            </p>
          </div>
          <AsyncButton
            type="button"
            loading={creating}
            loadingText="Creating…"
            onClick={handleCreate}
            disabled={!title.trim() || !message.trim()}
            className={cx(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition",
              title.trim() && message.trim()
                ? "bg-[var(--color-primary)] text-white hover:opacity-95"
                : "cursor-not-allowed bg-[var(--color-surface-2)] text-[var(--color-text-muted)] opacity-50"
            )}
          >
            <CheckIcon />
            Save and select this message
          </AsyncButton>
        </div>
      )}
    </div>
  );
}

// ─── BroadcastCard ────────────────────────────────────────────────────────────

function BroadcastCard({ item, selected, onOpen, onQueue, onSend, queueing, sending }) {
  const tone    = statusTone(item.status);
  const isDraft = item.status === "DRAFT";
  const canSend = item.status === "DRAFT" || item.status === "QUEUED";

  return (
    <div className={cx(
      panel(),
      "border border-transparent p-4 transition",
      selected ? "ring-1 ring-[var(--color-primary-ring)] bg-[var(--color-primary-soft)]" : ""
    )}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={tone}>{statusLabel(item.status)}</Pill>
            {item.account?.businessName && (
              <Pill tone="neutral">{item.account.businessName}</Pill>
            )}
            {!item.promotionId && (
              <Pill tone="danger">No message</Pill>
            )}
          </div>
          <div className={cx("mt-3 truncate text-base font-black tracking-tight", strong())}>
            {item.promotion?.title || item.templateName || "Untitled campaign"}
          </div>
          <div className={cx("mt-1 text-sm leading-6", muted())}>
            Template: {item.templateName || "—"} · Language: {item.languageCode || "—"}
          </div>
          {item.promotion?.message && (
            <div className={cx("mt-1 line-clamp-2 text-xs leading-5", muted())}>
              {item.promotion.message}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoStat label="Recipients" value={String(item.recipientCount || 0)} />
            <InfoStat label="Delivered"  value={String(item.deliveredCount || 0)} />
            <InfoStat label="Created"    value={fmtAgo(item.createdAt)}  sub={fmtDate(item.createdAt)} />
            <InfoStat
              label="Last stage"
              value={item.sentAt ? fmtAgo(item.sentAt) : item.queuedAt ? fmtAgo(item.queuedAt) : "Not sent"}
              sub={item.sentAt ? "Sent" : item.queuedAt ? "Queued" : "Draft"}
            />
          </div>
        </button>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <button type="button" onClick={onOpen} className={secondaryBtn()}>Open</button>
          {isDraft && (
            <AsyncButton type="button" loading={queueing} loadingText="Queueing…" onClick={onQueue} className={secondaryBtn()}>
              Queue
            </AsyncButton>
          )}
          {canSend && (
            <AsyncButton type="button" loading={sending} loadingText="Sending…" onClick={onSend} className={primaryBtn()}>
              Send now
            </AsyncButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  id: "", accountId: "", promotionId: "",
  templateName: "", languageCode: "en_US",
};

export default function WhatsAppBroadcasts() {
  const mountedRef = useRef(true);

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [accounts,   setAccounts]   = useState([]);

  const [query,         setQuery]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState("ALL");
  const [accountFilter, setAccountFilter] = useState("ALL");

  const [selectedId, setSelectedId] = useState("");
  const [creating,   setCreating]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [queueingId, setQueueingId] = useState("");
  const [sendingId,  setSendingId]  = useState("");

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    mountedRef.current = true;
    document.title = "WhatsApp Broadcasts • Storvex";
    return () => { mountedRef.current = false; };
  }, []);

  async function loadAll(showToast = false) {
    try {
      if (!broadcasts.length && !accounts.length) setLoading(true);
      else setRefreshing(true);

      const [broadcastRes, accountRes] = await Promise.all([
        listWhatsAppBroadcasts({ limit: 100 }),
        listWhatsAppAccounts(),
      ]);

      if (!mountedRef.current) return;

      const nextBroadcasts = Array.isArray(broadcastRes?.broadcasts)
        ? broadcastRes.broadcasts.map(normalizeBroadcast).filter(Boolean) : [];
      const nextAccounts = Array.isArray(accountRes?.accounts)
        ? accountRes.accounts.map(normalizeAccount) : [];

      setBroadcasts(nextBroadcasts);
      setAccounts(nextAccounts);

      if (selectedId && !nextBroadcasts.some(x => x.id === selectedId)) {
        setSelectedId("");
        setForm(blankForm(nextAccounts));
      }
      if (showToast) toast.success("Broadcasts refreshed");
    } catch (err) {
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load broadcasts");
      setBroadcasts([]); setAccounts([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false); setRefreshing(false);
    }
  }

  useEffect(() => { void loadAll(); }, []); // eslint-disable-line

  // Default accountId when accounts load
  useEffect(() => {
    if (!form.accountId && accounts.length) {
      setForm(curr => ({
        ...curr,
        accountId: accounts.find(x => x.isActive)?.id || accounts[0]?.id || "",
      }));
    }
  }, [accounts, form.accountId]);

  function blankForm(accts = accounts) {
    return {
      ...EMPTY_FORM,
      accountId: accts.find(x => x.isActive)?.id || accts[0]?.id || "",
    };
  }

  function setField(k, v) { setForm(c => ({ ...c, [k]: v })); }

  function openBroadcast(item) {
    setSelectedId(item.id);
    setForm({
      id:           item.id,
      accountId:    item.accountId    || "",
      promotionId:  item.promotionId  || "",
      templateName: item.templateName || "",
      languageCode: item.languageCode || "en_US",
    });
  }

  function handlePromotionSelected(promo) {
    setField("promotionId", promo?.id || "");
  }

  function buildPayload() {
    return {
      accountId:    String(form.accountId    || "").trim() || null,
      templateName: String(form.templateName || "").trim() || null,
      languageCode: String(form.languageCode || "").trim() || "en_US",
      promotionId:  String(form.promotionId  || "").trim() || null,
    };
  }

  function validate() {
    if (!String(form.accountId    || "").trim()) { toast.error("Choose the WhatsApp number to send from"); return false; }
    if (!String(form.templateName || "").trim()) { toast.error("Template name is required"); return false; }
    return true;
  }

  async function handleCreate() {
    if (!validate()) return;
    setCreating(true);
    try {
      const res     = await createWhatsAppBroadcast(buildPayload());
      const created = normalizeBroadcast(res?.broadcast);
      setBroadcasts(prev => [created, ...prev]);
      openBroadcast(created);
      toast.success("Broadcast draft created");
    } catch (err) {
      toast.error(err?.message || "Failed to create broadcast");
    } finally {
      if (mountedRef.current) setCreating(false);
    }
  }

  async function handleSave() {
    if (!selectedId) { toast.error("Open a campaign first"); return; }
    if (!validate()) return;
    setSaving(true);
    try {
      const res     = await updateWhatsAppBroadcast(selectedId, buildPayload());
      const updated = normalizeBroadcast(res?.broadcast);
      setBroadcasts(prev => prev.map(x => x.id === updated.id ? updated : x));
      openBroadcast(updated);
      toast.success("Broadcast updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update broadcast");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function handleQueue(item) {
    setQueueingId(item.id);
    try {
      const res     = await queueWhatsAppBroadcast(item.id);
      const updated = normalizeBroadcast(res?.broadcast);
      setBroadcasts(prev => prev.map(x => x.id === updated.id ? updated : x));
      if (selectedId === updated.id) openBroadcast(updated);
      toast.success("Broadcast queued");
    } catch (err) {
      toast.error(err?.message || "Failed to queue broadcast");
    } finally {
      if (mountedRef.current) setQueueingId("");
    }
  }

  async function handleSend(item) {
    if (!item.promotionId) {
      toast.error("Attach a campaign message before sending — it is required by the WhatsApp API");
      return;
    }
    setSendingId(item.id);
    try {
      const res     = await sendWhatsAppBroadcastNow(item.id, { limit: 50 });
      const updated = normalizeBroadcast(res?.broadcast);
      setBroadcasts(prev => prev.map(x => x.id === updated.id ? updated : x));
      if (selectedId === updated.id) openBroadcast(updated);
      const s = res?.summary;
      toast.success(s ? `${s.delivered} delivered, ${s.failed} failed` : "Campaign sent");
    } catch (err) {
      toast.error(err?.message || "Failed to send broadcast");
    } finally {
      if (mountedRef.current) setSendingId("");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return broadcasts.filter(x => {
      if (statusFilter  !== "ALL" && String(x.status || "").toUpperCase() !== statusFilter)  return false;
      if (accountFilter !== "ALL" && String(x.accountId || "") !== accountFilter) return false;
      if (!q) return true;
      const hay = [x.templateName, x.languageCode, x.promotion?.title, x.promotion?.message, x.account?.businessName, x.account?.phoneNumber]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [broadcasts, query, statusFilter, accountFilter]);

  const selectedBroadcast = useMemo(() =>
    broadcasts.find(x => x.id === selectedId) || null,
    [broadcasts, selectedId]
  );

  const summary = useMemo(() => ({
    total:     broadcasts.length,
    drafts:    broadcasts.filter(x => x.status === "DRAFT").length,
    queued:    broadcasts.filter(x => x.status === "QUEUED").length,
    sent:      broadcasts.filter(x => x.status === "SENT").length,
    delivered: broadcasts.reduce((s, x) => s + Number(x.deliveredCount || 0), 0),
  }), [broadcasts]);

  if (loading) return <PageSkeleton titleWidth="w-52" lines={6} variant="default" />;

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <section className={cx(card(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="WhatsApp"
                title="Broadcasts"
                subtitle="Create campaign messages, attach them to a broadcast, queue the batch, and send it to opted-in customers in one flow."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="info">{summary.total} campaigns</Pill>
              <AsyncButton type="button" loading={refreshing} loadingText="Refreshing…" onClick={() => loadAll(true)} className={primaryBtn()}>
                <span className={cx("mr-2 inline-flex", refreshing ? "animate-spin" : "")}>
                  <RefreshIcon />
                </span>
                Refresh
              </AsyncButton>
            </div>
          </div>
        </div>

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Campaigns" value={summary.total}     note="All broadcast records"              />
          <SummaryCard label="Drafts"    value={summary.drafts}    note="Not queued yet"       tone="info"   />
          <SummaryCard label="Queued"    value={summary.queued}    note="Ready to send"       tone="warning" />
          <SummaryCard label="Sent"      value={summary.sent}      note="Pushed to customers" tone="success" />
          <SummaryCard label="Delivered" value={summary.delivered} note="Confirmed deliveries" tone="success"/>
        </div>
      </section>

      <WhatsAppWorkspaceTabs />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* ── Campaign list ── */}
        <section className={cx(card(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className={cx("text-lg font-black tracking-tight", strong())}>Campaign queue</div>
                <p className={cx("mt-1 text-sm leading-6", muted())}>
                  Review every campaign before queuing or sending. A campaign missing a message cannot be sent.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="relative min-w-0">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                    <SearchIcon />
                  </span>
                  <input className={cx(inpCls(), "pl-10")} placeholder="Search campaigns…" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <select className={inpCls()} value={statusFilter}  onChange={e => setStatusFilter(e.target.value)}>
                  <option value="ALL">All statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="QUEUED">Queued</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select className={inpCls()} value={accountFilter} onChange={e => setAccountFilter(e.target.value)}>
                  <option value="ALL">All numbers</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.businessName || a.phoneNumber || "Channel"}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {filtered.length === 0 ? (
              <EmptyState title="No campaigns found" text="Create your first broadcast draft using the form, or adjust the search filters." />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filtered.map(item => (
                  <BroadcastCard
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onOpen={() => openBroadcast(item)}
                    onQueue={() => handleQueue(item)}
                    onSend={() => handleSend(item)}
                    queueing={queueingId === item.id}
                    sending={sendingId === item.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Campaign builder ── */}
        <aside className="space-y-4">
          <section className={cx(card(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Builder"
              title="Campaign setup"
              subtitle="Choose the sending number, write or pick a campaign message, set the template, then save as a draft."
            />

            <div className="mt-6 space-y-5">
              {/* WhatsApp number */}
              <div>
                <label className={fieldLbl()}>WhatsApp number to send from <span className="text-[var(--color-danger)]">*</span></label>
                <select className={inpCls()} value={form.accountId} onChange={e => setField("accountId", e.target.value)}>
                  <option value="">Select WhatsApp number</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.businessName || "WhatsApp channel"} · {a.phoneNumber || "No number"}
                      {a.isActive ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
                <p className={fieldHlp()}>This is the business WhatsApp number customers will receive the message from.</p>
              </div>

              {/* Template name */}
              <div>
                <label className={fieldLbl()}>Template name <span className="text-[var(--color-danger)]">*</span></label>
                <input className={inpCls()} value={form.templateName} onChange={e => setField("templateName", e.target.value)} placeholder="e.g. promo_update" />
                <p className={fieldHlp()}>Must exactly match an approved WhatsApp Business template on your connected channel.</p>
              </div>

              {/* Language code */}
              <div>
                <label className={fieldLbl()}>Language code</label>
                <input className={inpCls()} value={form.languageCode} onChange={e => setField("languageCode", e.target.value)} placeholder="en_US" />
                <p className={fieldHlp()}>Use standard locale codes like <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 text-[11px]">en_US</code> or <code className="rounded bg-[var(--color-surface-2)] px-1 py-0.5 text-[11px]">rw_RW</code>.</p>
              </div>

              {/* Campaign message — the key section */}
              <div className="rounded-[22px] border border-[var(--color-border)] p-4 space-y-3">
                <div>
                  <div className={cx("text-sm font-bold", strong())}>Campaign message</div>
                  <p className={cx("mt-1 text-xs leading-5", muted())}>
                    Required before sending. Create one below or pick an existing message.
                  </p>
                </div>
                <PromotionSelector
                  value={form.promotionId}
                  onSelect={handlePromotionSelected}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <AsyncButton type="button" loading={creating} loadingText="Creating…" onClick={handleCreate} className={cx(secondaryBtn(), "w-full")}>
                  Create draft
                </AsyncButton>
                <AsyncButton type="button" loading={saving} loadingText="Saving…" onClick={handleSave} disabled={!selectedId} className={cx(primaryBtn(), "w-full")}>
                  Save changes
                </AsyncButton>
              </div>
            </div>
          </section>

          {/* Current selection panel */}
          <section className={cx(card(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strong())}>Current selection</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <InfoStat
                label="Campaign"
                value={selectedBroadcast ? selectedBroadcast.promotion?.title || selectedBroadcast.templateName || "Untitled" : "None selected"}
                sub={selectedBroadcast ? `Created ${fmtAgo(selectedBroadcast.createdAt)}` : "Open a campaign from the list"}
              />
              <InfoStat
                label="Status"
                value={selectedBroadcast ? statusLabel(selectedBroadcast.status) : "—"}
                sub={
                  selectedBroadcast?.sentAt   ? `Sent ${fmtDate(selectedBroadcast.sentAt)}`
                  : selectedBroadcast?.queuedAt ? `Queued ${fmtDate(selectedBroadcast.queuedAt)}`
                  : "Not queued yet"
                }
              />
              <InfoStat
                label="Message"
                value={selectedBroadcast?.promotion?.title || "—"}
                sub={selectedBroadcast?.promotion ? "Message linked" : "No message — attach one before sending"}
              />
              <InfoStat
                label="Recipients"
                value={selectedBroadcast ? String(selectedBroadcast.recipientCount || 0) : "—"}
                sub={selectedBroadcast ? `${selectedBroadcast.deliveredCount || 0} delivered` : "No campaign selected"}
              />
            </div>

            {selectedBroadcast && (
              <div className="mt-4 flex flex-col gap-2">
                {selectedBroadcast.status === "DRAFT" && (
                  <AsyncButton type="button" loading={queueingId === selectedBroadcast.id} loadingText="Queueing…" onClick={() => handleQueue(selectedBroadcast)} className={secondaryBtn()}>
                    Queue selected campaign
                  </AsyncButton>
                )}
                {(selectedBroadcast.status === "DRAFT" || selectedBroadcast.status === "QUEUED") && (
                  <AsyncButton
                    type="button"
                    loading={sendingId === selectedBroadcast.id}
                    loadingText="Sending…"
                    onClick={() => handleSend(selectedBroadcast)}
                    disabled={!selectedBroadcast.promotionId}
                    className={cx(
                      selectedBroadcast.promotionId ? primaryBtn() : dangerBtn(),
                    )}
                  >
                    {selectedBroadcast.promotionId
                      ? "Send selected campaign now"
                      : "Attach a message before sending"}
                  </AsyncButton>
                )}
              </div>
            )}
          </section>

          {/* Guidance panel */}
          <section className={cx(card(), "p-5 sm:p-6")}>
            <div className={cx("text-lg font-black tracking-tight", strong())}>How this works</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <InfoStat label="Step 1" value="Write a campaign message" sub="Use the form to create a title + message body with template placeholders." />
              <InfoStat label="Step 2" value="Create the broadcast draft" sub="Set your sending number, template name, and attach the message. Save as draft." />
              <InfoStat label="Step 3" value="Queue then send" sub="Queue to mark it ready, then Send now to push to all opted-in customers." />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
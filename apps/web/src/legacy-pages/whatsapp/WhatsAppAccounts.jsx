import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  createWhatsAppAccount,
  listWhatsAppAccounts,
  updateWhatsAppAccount,
} from "../../services/whatsappAccountsApi";
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

function inputClass() {
  return "app-input";
}

function fieldLabel() {
  return "mb-1.5 block text-sm font-medium text-[var(--color-text)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
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
      : neutralBadge();

  return (
    <span
      className={cx("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold", cls)}
    >
      {children}
    </span>
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
  return `${days} day${days > 1 ? "s" : ""} ago`;
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

function ChannelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 18l1.2-3.4A7 7 0 1119 12a7 7 0 01-10.52 6L6 18z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v6c0 4.97-3.06 8.83-7 10-3.94-1.17-7-5.03-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 10V8a5 5 0 0110 0v2M6 10h12v10H6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
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
    webhookVerifyToken: String(raw.webhookVerifyToken || ""),
    appSecret: String(raw.appSecret || ""),
    hasAccessToken: Boolean(raw.hasAccessToken),
    isActive: Boolean(raw.isActive),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

function blankForm() {
  return {
    phoneNumber: "",
    businessName: "",
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    webhookVerifyToken: "",
    appSecret: "",
    isActive: true,
  };
}

function sanitizePayload(form) {
  return {
    phoneNumber: String(form.phoneNumber || "").trim(),
    businessName: String(form.businessName || "").trim() || null,
    phoneNumberId: String(form.phoneNumberId || "").trim() || null,
    wabaId: String(form.wabaId || "").trim() || null,
    accessToken: String(form.accessToken || "").trim() || null,
    webhookVerifyToken: String(form.webhookVerifyToken || "").trim() || null,
    appSecret: String(form.appSecret || "").trim() || null,
    isActive: Boolean(form.isActive),
  };
}

function validateForm(form) {
  const phone = normalizePhoneDigits(form.phoneNumber);

  if (!phone) return "Business phone number is required";

  if (form.isActive && !String(form.phoneNumberId || "").trim()) {
    return "Channel ID is required for an active channel";
  }

  if (form.isActive && !String(form.accessToken || "").trim()) {
    return "Messaging connection value is required for an active channel";
  }

  return "";
}

function SecureTextarea({
  label,
  value,
  onChange,
  placeholder,
  helper,
  rows = 5,
}) {
  return (
    <div className={cx(softPanel(), "overflow-hidden border border-[var(--color-border)]")}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div className="min-w-0">
          <div className={cx("flex items-center gap-2 text-sm font-semibold", strongText())}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary-ring)]">
              <LockIcon />
            </span>
            {label}
          </div>
          {helper ? (
            <div className={cx("mt-1 text-xs leading-5", mutedText())}>{helper}</div>
          ) : null}
        </div>

        <ProtectionPill tone={value ? "info" : "neutral"}>
          {value ? "Ready to save" : "Empty"}
        </ProtectionPill>
      </div>

      <div className="p-3 sm:p-4">
        <textarea
          rows={rows}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cx(
            "min-h-[132px] w-full resize-none rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
          )}
        />
      </div>
    </div>
  );
}

function AccountCard({ account, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        softPanel(),
        "w-full overflow-hidden border border-transparent p-4 text-left transition hover:translate-y-[-1px]",
        selected ? "ring-1 ring-[var(--color-primary-ring)] bg-[var(--color-primary-soft)]" : ""
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary-ring)]">
            <ChannelIcon />
          </div>

          <div className="min-w-0">
            <div className={cx("truncate text-sm font-bold", strongText())}>
              {account.businessName || account.phoneNumber || "WhatsApp channel"}
            </div>
            <div className={cx("mt-1 text-xs", mutedText())}>{account.phoneNumber || "—"}</div>
            {account.phoneNumberId ? (
              <div className={cx("mt-1 truncate text-xs", softText())}>
                Channel ID: {account.phoneNumberId}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <ProtectionPill tone={account.isActive ? "success" : "warning"}>
            {account.isActive ? "Active" : "Inactive"}
          </ProtectionPill>
          <ProtectionPill tone={account.hasAccessToken ? "info" : "warning"}>
            {account.hasAccessToken ? "Connected" : "Needs setup"}
          </ProtectionPill>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <div className={cx("text-xs", mutedText())}>
          Updated: {formatTimeAgo(account.updatedAt || account.createdAt)}
        </div>
        <div className={cx("text-xs", softText())}>
          {formatDateTime(account.updatedAt || account.createdAt)}
        </div>
      </div>
    </button>
  );
}

export default function WhatsAppAccounts() {
  const mountedRef = useRef(true);

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [mode, setMode] = useState("create");
  const [query, setQuery] = useState("");

  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    document.title = "WhatsApp Channels • Storvex";

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadAccounts(showToast = false) {
    try {
      if (!accounts.length) setLoading(true);
      else setRefreshing(true);

      const res = await listWhatsAppAccounts();
      if (!mountedRef.current) return;

      const nextAccounts = Array.isArray(res?.accounts)
        ? res.accounts.map(normalizeAccount).filter(Boolean)
        : [];

      nextAccounts.sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      );

      setAccounts(nextAccounts);

      if (mode === "edit" && selectedAccountId) {
        const found = nextAccounts.find((x) => x.id === selectedAccountId);
        if (!found) {
          setMode("create");
          setSelectedAccountId("");
          setForm(blankForm());
        } else {
          setForm({
            phoneNumber: found.phoneNumber || "",
            businessName: found.businessName || "",
            phoneNumberId: found.phoneNumberId || "",
            wabaId: found.wabaId || "",
            accessToken: "",
            webhookVerifyToken: "",
            appSecret: "",
            isActive: Boolean(found.isActive),
          });
        }
      }

      if (showToast) toast.success("WhatsApp channels refreshed");
    } catch (err) {
      console.error(err);
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load WhatsApp channels");
      setAccounts([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((item) => {
      const businessName = String(item.businessName || "").toLowerCase();
      const phoneNumber = String(item.phoneNumber || "").toLowerCase();
      const phoneNumberId = String(item.phoneNumberId || "").toLowerCase();
      const wabaId = String(item.wabaId || "").toLowerCase();
      const state = item.isActive ? "active" : "inactive";

      return (
        businessName.includes(q) ||
        phoneNumber.includes(q) ||
        phoneNumberId.includes(q) ||
        wabaId.includes(q) ||
        state.includes(q)
      );
    });
  }, [accounts, query]);

  const selectedAccount = useMemo(() => {
    return accounts.find((item) => item.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const summary = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((x) => x.isActive).length;
    const inactive = accounts.filter((x) => !x.isActive).length;
    const connected = accounts.filter((x) => x.hasAccessToken).length;

    return { total, active, inactive, connected };
  }, [accounts]);

  function updateField(key, value) {
    setForm((curr) => ({ ...curr, [key]: value }));
  }

  function startCreate() {
    setMode("create");
    setSelectedAccountId("");
    setForm(blankForm());
  }

  function startEdit(account) {
    if (!account?.id) return;

    setMode("edit");
    setSelectedAccountId(account.id);
    setForm({
      phoneNumber: account.phoneNumber || "",
      businessName: account.businessName || "",
      phoneNumberId: account.phoneNumberId || "",
      wabaId: account.wabaId || "",
      accessToken: "",
      webhookVerifyToken: "",
      appSecret: "",
      isActive: Boolean(account.isActive),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setSaving(true);

      const payload = sanitizePayload(form);

      if (mode === "edit" && selectedAccountId) {
        const res = await updateWhatsAppAccount(selectedAccountId, payload);
        const updated = normalizeAccount(res?.account);

        setAccounts((prev) => {
          const next = prev.map((item) => (item.id === updated.id ? updated : item));
          next.sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() -
              new Date(a.updatedAt || a.createdAt || 0).getTime()
          );
          return next;
        });

        toast.success("WhatsApp channel updated");

        setForm((curr) => ({
          ...curr,
          accessToken: "",
          webhookVerifyToken: "",
          appSecret: "",
        }));
      } else {
        const res = await createWhatsAppAccount(payload);
        const created = normalizeAccount(res?.account);

        setAccounts((prev) => {
          const next = [created, ...prev];
          next.sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() -
              new Date(a.updatedAt || a.createdAt || 0).getTime()
          );
          return next;
        });

        setMode("edit");
        setSelectedAccountId(created.id);
        setForm({
          phoneNumber: created.phoneNumber || "",
          businessName: created.businessName || "",
          phoneNumberId: created.phoneNumberId || "",
          wabaId: created.wabaId || "",
          accessToken: "",
          webhookVerifyToken: "",
          appSecret: "",
          isActive: Boolean(created.isActive),
        });

        toast.success("WhatsApp channel created");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to save WhatsApp channel");
    } finally {
      setSaving(false);
    }
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
                title="Channel settings"
                subtitle="Connect and manage the business WhatsApp numbers your store uses for customer chats, replies, and sale draft creation."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ProtectionPill tone="info">{summary.active} active</ProtectionPill>

              <button type="button" onClick={startCreate} className={secondaryBtn()}>
                Add channel
              </button>

              <AsyncButton
                type="button"
                loading={refreshing}
                loadingText="Refreshing..."
                onClick={() => loadAccounts(true)}
                className={primaryBtn()}
              >
                <span className={cx("mr-2 inline-flex", refreshing ? "animate-spin" : "")}>
                  <RefreshIcon />
                </span>
                Refresh
              </AsyncButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total channels"
            value={summary.total}
            note="Connected WhatsApp numbers in this store"
          />
          <SummaryCard
            label="Active"
            value={summary.active}
            note="Channels ready for live messaging"
            tone="success"
          />
          <SummaryCard
            label="Inactive"
            value={summary.inactive}
            note="Saved channels currently turned off"
            tone="warning"
          />
          <SummaryCard
            label="Connected"
            value={summary.connected}
            note="Channels with a saved messaging connection"
            tone="neutral"
          />
        </div>
      </section>

      <WhatsAppWorkspaceTabs />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px,minmax(0,1fr)]">
        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div>
                <div className={cx("text-lg font-black tracking-tight", strongText())}>
                  Saved channels
                </div>
                <p className={cx("mt-1 text-sm leading-6", mutedText())}>
                  Pick a connected number to review or update its setup.
                </p>
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                  <SearchIcon />
                </span>
                <input
                  className={cx(inputClass(), "pl-10")}
                  placeholder="Search by name, phone, channel ID, business account, or status..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {filteredAccounts.length === 0 ? (
              <EmptyState
                title="No channels found"
                text="There are no WhatsApp channels matching your current search."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredAccounts.map((item) => (
                  <AccountCard
                    key={item.id}
                    account={item}
                    selected={item.id === selectedAccountId && mode === "edit"}
                    onSelect={() => startEdit(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                  {mode === "edit" ? "Edit channel" : "New channel"}
                </div>

                <div className={cx("mt-3 text-[1.5rem] font-black tracking-tight", strongText())}>
                  {mode === "edit" ? "Update WhatsApp channel" : "Create WhatsApp channel"}
                </div>

                <p className={cx("mt-3 text-sm leading-6", mutedText())}>
                  Save the business number, channel identifiers, and connection values used by this store.
                </p>
              </div>

              {mode === "edit" && selectedAccount ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ProtectionPill tone={selectedAccount.isActive ? "success" : "warning"}>
                    {selectedAccount.isActive ? "Active" : "Inactive"}
                  </ProtectionPill>
                  <ProtectionPill tone={selectedAccount.hasAccessToken ? "info" : "warning"}>
                    {selectedAccount.hasAccessToken ? "Connected" : "Needs setup"}
                  </ProtectionPill>
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className={fieldLabel()}>Business phone number</label>
                  <input
                    className={inputClass()}
                    value={form.phoneNumber}
                    onChange={(e) => updateField("phoneNumber", e.target.value)}
                    placeholder="e.g. 2507XXXXXXXX"
                  />
                </div>

                <div>
                  <label className={fieldLabel()}>Business name</label>
                  <input
                    className={inputClass()}
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    placeholder="Store name shown for this channel"
                  />
                </div>

                <div>
                  <label className={fieldLabel()}>Channel ID</label>
                  <input
                    className={inputClass()}
                    value={form.phoneNumberId}
                    onChange={(e) => updateField("phoneNumberId", e.target.value)}
                    placeholder="Phone number ID from Meta"
                  />
                </div>

                <div>
                  <label className={fieldLabel()}>Business account ID</label>
                  <input
                    className={inputClass()}
                    value={form.wabaId}
                    onChange={(e) => updateField("wabaId", e.target.value)}
                    placeholder="WhatsApp business account ID"
                  />
                </div>
              </div>

              <div className={cx(softPanel(), "p-4 sm:p-5")}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary-ring)]">
                    <ShieldIcon />
                  </div>

                  <div className="min-w-0">
                    <div className={cx("text-sm font-bold", strongText())}>Private connection details</div>
                    <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                      These values connect this channel to WhatsApp. They are sensitive. When editing, leave a field empty if you want to keep the current saved value.
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4">
                  <SecureTextarea
                    label="Messaging connection"
                    value={form.accessToken}
                    onChange={(e) => updateField("accessToken", e.target.value)}
                    placeholder={
                      mode === "edit"
                        ? "Paste a new messaging connection value only if you want to replace the current saved one"
                        : "Paste the messaging connection value"
                    }
                    helper={
                      mode === "edit"
                        ? "Leave empty to keep the current saved messaging connection"
                        : "Needed for live sending and receiving"
                    }
                    rows={5}
                  />

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className={cx(softPanel(), "border border-[var(--color-border)] p-4")}>
                      <label className={fieldLabel()}>Webhook check value</label>
                      <input
                        className={inputClass()}
                        value={form.webhookVerifyToken}
                        onChange={(e) => updateField("webhookVerifyToken", e.target.value)}
                        placeholder={
                          mode === "edit"
                            ? "Leave empty to keep current saved webhook check value"
                            : "Webhook check value"
                        }
                      />
                      <div className={cx("mt-2 text-xs leading-5", mutedText())}>
                        Used to confirm that incoming WhatsApp messages belong to your channel.
                      </div>
                    </div>

                    <div className={cx(softPanel(), "border border-[var(--color-border)] p-4")}>
                      <label className={fieldLabel()}>App security value</label>
                      <input
                        className={inputClass()}
                        value={form.appSecret}
                        onChange={(e) => updateField("appSecret", e.target.value)}
                        placeholder={
                          mode === "edit"
                            ? "Leave empty to keep current saved app security value"
                            : "App security value"
                        }
                      />
                      <div className={cx("mt-2 text-xs leading-5", mutedText())}>
                        Used to help verify that incoming requests are trusted.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <label className={cx(softPanel(), "flex items-start gap-3 p-4 sm:p-5")}>
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                />

                <div className="min-w-0">
                  <div className={cx("text-sm font-bold", strongText())}>Channel is active</div>
                  <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                    Active channels are expected to be ready for live incoming messages and store replies.
                  </div>
                </div>
              </label>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className={cx(softPanel(), "p-4 sm:p-5")}>
                  <div className={cx("text-sm font-bold", strongText())}>What this setup controls</div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                        Inbox
                      </div>
                      <div className={cx("mt-2 text-sm leading-6", mutedText())}>
                        Incoming customer messages arrive in the live WhatsApp inbox.
                      </div>
                    </div>

                    <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                        Replies
                      </div>
                      <div className={cx("mt-2 text-sm leading-6", mutedText())}>
                        Staff can answer customers directly from Storvex.
                      </div>
                    </div>

                    <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                        Drafts
                      </div>
                      <div className={cx("mt-2 text-sm leading-6", mutedText())}>
                        Buying interest can become sale drafts for review and finalization.
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cx(softPanel(), "p-4 sm:p-5")}>
                  <div className={cx("text-sm font-bold", strongText())}>Current selection</div>

                  {mode === "edit" && selectedAccount ? (
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                          Business
                        </div>
                        <div className={cx("mt-2 break-words text-sm font-bold", strongText())}>
                          {selectedAccount.businessName || "—"}
                        </div>
                      </div>

                      <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                          Phone
                        </div>
                        <div className={cx("mt-2 break-words text-sm font-bold", strongText())}>
                          {selectedAccount.phoneNumber || "—"}
                        </div>
                      </div>

                      <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                          Saved connection
                        </div>
                        <div className={cx("mt-2 break-words text-sm font-bold", strongText())}>
                          {selectedAccount.hasAccessToken ? "Already saved" : "Not saved yet"}
                        </div>
                        <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                          {selectedAccount.hasAccessToken
                            ? "This channel already has a messaging connection saved."
                            : "This channel still needs a messaging connection value."}
                        </div>
                      </div>

                      <div className={cx(pageCard(), "rounded-[22px] p-4")}>
                        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                          Last update
                        </div>
                        <div className={cx("mt-2 text-sm font-bold", strongText())}>
                          {formatTimeAgo(selectedAccount.updatedAt || selectedAccount.createdAt)}
                        </div>
                        <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                          {formatDateTime(selectedAccount.updatedAt || selectedAccount.createdAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={cx("mt-3 text-sm leading-6", mutedText())}>
                      Create a new channel, or choose an existing one from the list to edit it.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={startCreate} className={secondaryBtn()} disabled={saving}>
                  Clear form
                </button>

                <AsyncButton
                  type="submit"
                  loading={saving}
                  loadingText={mode === "edit" ? "Updating..." : "Creating..."}
                  className={primaryBtn()}
                >
                  {mode === "edit" ? "Update channel" : "Create channel"}
                </AsyncButton>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
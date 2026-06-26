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
import "./WhatsAppAccounts.css";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function formatTimeAgo(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();

  if (diff < 60 * 1000) return "Just now";

  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days > 1 ? "s" : ""} ago`;
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

function isAccountReady(account) {
  return Boolean(account?.isActive && account?.hasAccessToken && account?.phoneNumberId);
}


function getAccountSetupSteps({ account = null, form = null, mode = "create" } = {}) {
  const phoneNumber = String(form?.phoneNumber || account?.phoneNumber || "").trim();
  const businessName = String(form?.businessName || account?.businessName || "").trim();
  const phoneNumberId = String(form?.phoneNumberId || account?.phoneNumberId || "").trim();
  const wabaId = String(form?.wabaId || account?.wabaId || "").trim();
  const hasAccessToken = Boolean(
    String(form?.accessToken || "").trim() || account?.hasAccessToken
  );
  const webhookVerifyToken = String(
    form?.webhookVerifyToken || account?.webhookVerifyToken || ""
  ).trim();
  const appSecret = String(form?.appSecret || account?.appSecret || "").trim();
  const isActive = Boolean(form ? form.isActive : account?.isActive);

  return [
    {
      key: "phone",
      label: "Business phone saved",
      help: "Use the official store WhatsApp number customers already trust.",
      done: Boolean(phoneNumber),
    },
    {
      key: "identity",
      label: "Business identity added",
      help: "Add the store name and WhatsApp Business Account ID for easier support.",
      done: Boolean(businessName && wabaId),
    },
    {
      key: "phoneNumberId",
      label: "Meta phone number ID added",
      help: "Required before Storvex can send and receive WhatsApp messages.",
      done: Boolean(phoneNumberId),
    },
    {
      key: "accessToken",
      label: mode === "edit" ? "Access token saved" : "Access token ready",
      help: mode === "edit"
        ? "Leave the token field empty only when the current token is already saved."
        : "Paste the approved WhatsApp token before activating live sending.",
      done: hasAccessToken,
    },
    {
      key: "webhook",
      label: "Webhook verification ready",
      help: "Verify token and app secret protect incoming WhatsApp events.",
      done: Boolean(webhookVerifyToken && appSecret),
    },
    {
      key: "active",
      label: "Account activated",
      help: "Keep inactive until the required setup values are complete.",
      done: isActive,
    },
  ];
}

function computeSetupScore(steps) {
  const total = Array.isArray(steps) && steps.length ? steps.length : 1;
  const done = steps.filter((step) => step.done).length;
  const percent = Math.round((done / total) * 100);

  return { total, done, percent };
}

function setupTone(percent) {
  if (percent >= 85) return "success";
  if (percent >= 50) return "warning";
  return "neutral";
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

function validateForm(form, existingAccount = null) {
  const phone = normalizePhoneDigits(form.phoneNumber);

  if (!phone) return "Business phone number is required";

  if (form.isActive && !String(form.phoneNumberId || "").trim()) {
    return "Phone number ID is required before activating WhatsApp";
  }

  if (
    form.isActive &&
    !String(form.accessToken || "").trim() &&
    !existingAccount?.hasAccessToken
  ) {
    return "Access token is required before activating WhatsApp";
  }

  return "";
}

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v6c0 4.97-3.06 8.83-7 10-3.94-1.17-7-5.03-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 11a4 4 0 10-8 0m8 0a4 4 0 01-8 0m8 0c2.76 0 5 2.02 5 4.5V18H3v-2.5C3 13.02 5.24 11 8 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 7h12M6 12h12M6 17h12M5 4h14v16H5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 15a4 4 0 114.9-3.9L21 3m-5 5l2 2m-4 0l2 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 15v4m-2-2h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v3m10-3v3M4 9h16M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 13h3l9 4V7l-9 4H4v2zM7 13v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 8h10v12H8zM6 16H5a2 2 0 01-2-2V5a2 2 0 012-2h9a2 2 0 012 2v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}


function Badge({ children, tone = "neutral" }) {
  return <span className={cx("svx-wa-badge", `is-${tone}`)}>{children}</span>;
}

function IconShell({ children, tone = "info" }) {
  return <span className={cx("svx-wa-icon", `is-${tone}`)}>{children}</span>;
}

function MetricCard({ label, value, note, tone = "info", icon }) {
  return (
    <article className="svx-wa-metric svx-wa-card">
      <div className="svx-wa-metric-top">
        <IconShell tone={tone}>{icon}</IconShell>
        <span className={cx("svx-wa-status-dot", `is-${tone}`)} />
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function RuleCard({ icon, title, text, tone = "info" }) {
  return (
    <article className="svx-wa-rule">
      <IconShell tone={tone}>{icon}</IconShell>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </article>
  );
}


function SetupStepList({ steps }) {
  return (
    <div className="svx-wa-setup-step-list">
      {steps.map((step) => (
        <div key={step.key} className={cx("svx-wa-setup-step", step.done && "is-done")}>
          <span className="svx-wa-setup-check">{step.done ? "✓" : ""}</span>
          <div>
            <strong>{step.label}</strong>
            <small>{step.help}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function SetupProgressCard({ account, form, mode }) {
  const steps = getAccountSetupSteps({ account, form, mode });
  const score = computeSetupScore(steps);
  const tone = setupTone(score.percent);

  return (
    <section className="svx-wa-card svx-wa-setup-progress-card">
      <div className="svx-wa-section-head">
        <div>
          <p>Setup progress</p>
          <h2>{score.percent}% ready</h2>
        </div>
        <Badge tone={tone}>{score.done}/{score.total}</Badge>
      </div>

      <div className="svx-wa-progress-track" aria-hidden="true">
        <span style={{ width: `${score.percent}%` }} />
      </div>

      <SetupStepList steps={steps} />
    </section>
  );
}

function AccountHealthPanel({ account }) {
  if (!account) return null;

  const steps = getAccountSetupSteps({ account });
  const score = computeSetupScore(steps);
  const missing = steps.filter((step) => !step.done);
  const ready = isAccountReady(account);

  return (
    <section className="svx-wa-health-panel">
      <div className="svx-wa-health-head">
        <IconShell tone={ready ? "success" : "warning"}>
          <ShieldIcon />
        </IconShell>
        <div>
          <strong>{ready ? "Ready for live WhatsApp" : "Setup needs attention"}</strong>
          <span>
            {ready
              ? "This account can support inbox replies, sale drafts and broadcasts."
              : "Finish the missing items before relying on this account for customer messages."}
          </span>
        </div>
        <Badge tone={setupTone(score.percent)}>{score.percent}%</Badge>
      </div>

      {missing.length ? (
        <div className="svx-wa-health-missing">
          {missing.slice(0, 3).map((step) => (
            <span key={step.key}>{step.label}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="svx-wa-empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="svx-wa-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function SecureTextarea({ label, value, onChange, placeholder, helper, rows = 5 }) {
  return (
    <section className="svx-wa-secure-field">
      <div className="svx-wa-secure-head">
        <div>
          <strong>{label}</strong>
          {helper ? <span>{helper}</span> : null}
        </div>
        <Badge tone={value ? "info" : "neutral"}>{value ? "Ready to save" : "Empty"}</Badge>
      </div>

      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="svx-wa-textarea"
      />
    </section>
  );
}

function AccountCard({ account, selected, onSelect }) {
  const ready = isAccountReady(account);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx("svx-wa-account-row", selected && "is-selected")}
    >
      <span className="svx-wa-account-mark">
        <ChannelIcon />
      </span>

      <span className="svx-wa-account-main">
        <strong>{account.businessName || account.phoneNumber || "WhatsApp account"}</strong>
        <small>{account.phoneNumber || "No phone number saved"}</small>
        <small>{account.phoneNumberId ? `Phone number ID ${account.phoneNumberId}` : "Phone number ID missing"}</small>
      </span>

      <span className="svx-wa-account-status">
        <Badge tone={ready ? "success" : account.isActive ? "warning" : "neutral"}>
          {ready ? "Ready" : account.isActive ? "Needs setup" : "Inactive"}
        </Badge>
        <small>{formatTimeAgo(account.updatedAt || account.createdAt)}</small>
      </span>
    </button>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="svx-wa-detail-stat">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function AccountDetailRow({ icon, label, value, secure = false }) {
  return (
    <div className="svx-wa-account-detail-row">
      <span className="svx-wa-detail-icon">{icon}</span>
      <span>{label}</span>
      <strong>{secure ? "••••••••••••••••••••" : value || "—"}</strong>
      {secure ? (
        <span className="svx-wa-detail-tools" aria-hidden="true">
          <EyeIcon />
          <CopyIcon />
        </span>
      ) : null}
    </div>
  );
}

function AccountDetailsPanel({ account, onEdit, onCreate }) {
  if (!account) {
    return (
      <section className="svx-wa-card svx-wa-details-panel">
        <div className="svx-wa-section-head">
          <div>
            <p>Account details</p>
            <h2>No account selected</h2>
          </div>
          <Badge tone="neutral">Waiting</Badge>
        </div>

        <EmptyState
          title="Choose an account"
          text="Select an account from the list to view setup details, tokens, status and account actions."
        />

        <div className="svx-wa-form-actions is-details">
          <button type="button" onClick={onCreate} className="svx-wa-primary-button">
            Connect WhatsApp
          </button>
        </div>
      </section>
    );
  }

  const ready = isAccountReady(account);

  return (
    <section className="svx-wa-card svx-wa-details-panel">
      <div className="svx-wa-section-head">
        <div>
          <p>Account details</p>
          <h2>{account.businessName || "WhatsApp account"}</h2>
        </div>
        <Badge tone={ready ? "success" : account.isActive ? "warning" : "neutral"}>
          {ready ? "Active" : account.isActive ? "Needs setup" : "Inactive"}
        </Badge>
      </div>

      <div className="svx-wa-detail-profile">
        <IconShell tone={ready ? "success" : "info"}>
          <ChannelIcon />
        </IconShell>
        <div>
          <strong>{account.businessName || "Store WhatsApp"}</strong>
          <span>{account.phoneNumber || "No phone number saved"}</span>
          <small>
            {ready
              ? "Ready for inbox, replies and broadcasts"
              : "Complete missing setup values before live use"}
          </small>
        </div>
      </div>

      <AccountHealthPanel account={account} />

      <div className="svx-wa-account-detail-list">
        <AccountDetailRow icon={<ChannelIcon />} label="Business phone" value={account.phoneNumber} />
        <AccountDetailRow icon={<ShieldIcon />} label="Phone number ID" value={account.phoneNumberId} />
        <AccountDetailRow icon={<UsersIcon />} label="WABA ID" value={account.wabaId} />
        <AccountDetailRow icon={<TokenIcon />} label="Access token" value={account.hasAccessToken ? "Saved" : ""} secure={account.hasAccessToken} />
        <AccountDetailRow icon={<TokenIcon />} label="Webhook verify token" value={account.webhookVerifyToken} secure={Boolean(account.webhookVerifyToken)} />
        <AccountDetailRow icon={<ShieldIcon />} label="App secret" value={account.appSecret} secure={Boolean(account.appSecret)} />
        <AccountDetailRow icon={<CalendarIcon />} label="Created" value={formatDateTime(account.createdAt)} />
        <AccountDetailRow icon={<CalendarIcon />} label="Last updated" value={formatDateTime(account.updatedAt || account.createdAt)} />
      </div>

      <div className="svx-wa-form-actions is-details">
        <button type="button" onClick={() => onEdit(account)} className="svx-wa-secondary-button">
          Edit account
        </button>
        <button type="button" onClick={onCreate} className="svx-wa-primary-button">
          Connect new
        </button>
      </div>
    </section>
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
    document.title = "WhatsApp business setup • Storvex";

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
        const found = nextAccounts.find((item) => item.id === selectedAccountId);

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

      if (showToast) toast.success("WhatsApp accounts refreshed");
    } catch (err) {
      console.error(err);

      if (!mountedRef.current) return;

      toast.error(err?.message || "Failed to load WhatsApp accounts");
      setAccounts([]);
    } finally {
      if (!mountedRef.current) return;

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;

    return accounts.filter((item) => {
      const ready = isAccountReady(item) ? "ready" : "needs setup";

      return [
        item.businessName,
        item.phoneNumber,
        item.phoneNumberId,
        item.wabaId,
        item.isActive ? "active" : "inactive",
        ready,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [accounts, query]);

  const selectedAccount = useMemo(() => {
    return accounts.find((item) => item.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const displayAccount = selectedAccount || accounts[0] || null;

  const summary = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((item) => item.isActive).length;
    const ready = accounts.filter(isAccountReady).length;
    const needsSetup = accounts.filter((item) => item.isActive && !isAccountReady(item)).length;
    const lastActivity = accounts
      .map((item) => item.updatedAt || item.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return { total, active, ready, needsSetup, lastActivity };
  }, [accounts]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
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

  async function handleSubmit(event) {
    event.preventDefault();

    const error = validateForm(form, mode === "edit" ? selectedAccount : null);

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

        if (!updated?.id) {
          await loadAccounts(false);
          toast.success("WhatsApp account updated");
          return;
        }

        setAccounts((previous) => {
          const next = previous.map((item) => (item.id === updated.id ? updated : item));

          next.sort(
            (a, b) =>
              new Date(b.updatedAt || b.createdAt || 0).getTime() -
              new Date(a.updatedAt || a.createdAt || 0).getTime()
          );

          return next;
        });

        setForm((current) => ({
          ...current,
          accessToken: "",
          webhookVerifyToken: "",
          appSecret: "",
        }));

        toast.success("WhatsApp account updated");
      } else {
        const res = await createWhatsAppAccount(payload);
        const created = normalizeAccount(res?.account);

        if (!created?.id) {
          await loadAccounts(false);
          toast.success("WhatsApp account created");
          return;
        }

        setAccounts((previous) => {
          const next = [created, ...previous];

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

        toast.success("WhatsApp account created");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to save WhatsApp account");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-44" lines={5} variant="default" />;
  }

  return (
    <main className="svx-wa-accounts">
      <section className="svx-wa-hero">
        <div className="svx-wa-hero-copy">
          <Badge tone="info">WhatsApp</Badge>
          <h1>WhatsApp Accounts</h1>
          <p>
            Manage the official store WhatsApp number used for customer conversations, team replies,
            sale drafts, promotions and broadcasts.
          </p>
        </div>

        <div className="svx-wa-hero-actions">
          <button type="button" className="svx-wa-secondary-button" onClick={startCreate}>
            Connect WhatsApp
          </button>

          <AsyncButton
            type="button"
            loading={refreshing}
            loadingText="Refreshing..."
            onClick={() => loadAccounts(true)}
            className="svx-wa-primary-button"
          >
            <span className={cx("svx-wa-button-icon", refreshing && "is-spinning")}>
              <RefreshIcon />
            </span>
            Refresh
          </AsyncButton>
        </div>
      </section>

      <WhatsAppWorkspaceTabs />

      <section className="svx-wa-card svx-wa-guide">
        <div className="svx-wa-guide-head">
          <IconShell tone="success">
            <ChannelIcon />
          </IconShell>
          <div>
            <strong>WhatsApp in Storvex</strong>
            <span>
              One WhatsApp number for your business. Customers chat with one official store number
              while your team collaborates internally.
            </span>
          </div>
        </div>

        <div className="svx-wa-rule-grid">
          <RuleCard
            icon={<ShieldIcon />}
            title="One number for the whole business"
            text="Customers always message one official store WhatsApp number."
            tone="success"
          />
          <RuleCard
            icon={<UsersIcon />}
            title="Team collaboration in one inbox"
            text="Owners and permitted staff work from one shared workspace."
            tone="info"
          />
          <RuleCard
            icon={<BranchIcon />}
            title="Sales respect branches and staff"
            text="Sale drafts and final sales still follow branch, stock and cash drawer rules."
            tone="warning"
          />
          <RuleCard
            icon={<MegaphoneIcon />}
            title="Promotions and broadcasts from one place"
            text="Run campaigns from the same connected store account."
            tone="warning"
          />
        </div>
      </section>

      <section className="svx-wa-account-readiness-grid">
        <SetupProgressCard
          account={mode === "edit" ? selectedAccount : null}
          form={form}
          mode={mode}
        />

        <section className="svx-wa-card svx-wa-owner-safe-card">
          <div className="svx-wa-section-head">
            <div>
              <p>Owner-safe setup</p>
              <h2>Connect only when ready</h2>
            </div>
            <Badge tone={summary.ready > 0 ? "success" : "warning"}>
              {summary.ready > 0 ? "Connected" : "Not ready"}
            </Badge>
          </div>

          <div className="svx-wa-owner-safe-grid">
            <RuleCard
              icon={<TokenIcon />}
              title="Secrets stay private"
              text="Saved tokens are hidden. When editing, empty secret fields keep the current saved values."
              tone="info"
            />
            <RuleCard
              icon={<ShieldIcon />}
              title="Activate after verification"
              text="Keep the account inactive until the phone number ID and access token are confirmed."
              tone="success"
            />
          </div>
        </section>
      </section>

      <section className="svx-wa-metric-grid">
        <MetricCard
          label="WhatsApp accounts"
          value={summary.total}
          note="Total connected accounts"
          icon={<ChannelIcon />}
          tone="success"
        />
        <MetricCard
          label="Ready"
          value={summary.ready}
          note="Active and ready to use"
          icon={<ShieldIcon />}
          tone={summary.ready > 0 ? "success" : "neutral"}
        />
        <MetricCard
          label="Active"
          value={summary.active}
          note="Currently enabled"
          icon={<UsersIcon />}
          tone={summary.active > 0 ? "info" : "neutral"}
        />
        <MetricCard
          label="Last activity"
          value={formatTimeAgo(summary.lastActivity)}
          note="Latest account update"
          icon={<CalendarIcon />}
          tone={summary.lastActivity ? "warning" : "neutral"}
        />
      </section>

      <section className="svx-wa-workspace-grid">
        <div className="svx-wa-card svx-wa-list-panel">
          <div className="svx-wa-section-head">
            <div>
              <p>Your WhatsApp accounts</p>
              <h2>Store number setup</h2>
            </div>
            <Badge tone="neutral">{filteredAccounts.length} shown</Badge>
          </div>

          <div className="svx-wa-list-actions">
            <div className="svx-wa-search">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or number..."
              />
            </div>

            <button type="button" className="svx-wa-primary-button" onClick={startCreate}>
              Connect WhatsApp
            </button>
          </div>

          <div className="svx-wa-account-list">
            {filteredAccounts.length === 0 ? (
              <EmptyState
                title="No WhatsApp account found"
                text="Connect the store WhatsApp account, or clear your search."
              />
            ) : (
              filteredAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  selected={account.id === selectedAccountId && mode === "edit"}
                  onSelect={() => startEdit(account)}
                />
              ))
            )}
          </div>
        </div>

        <AccountDetailsPanel account={displayAccount} onEdit={startEdit} onCreate={startCreate} />
      </section>

      <section className="svx-wa-card svx-wa-form-panel">
        <div className="svx-wa-section-head">
          <div>
            <p>{mode === "edit" ? "Edit account" : "New account"}</p>
            <h2>{mode === "edit" ? "Update WhatsApp setup" : "Connect WhatsApp"}</h2>
          </div>

          {mode === "edit" && selectedAccount ? (
            <Badge tone={isAccountReady(selectedAccount) ? "success" : "warning"}>
              {isAccountReady(selectedAccount) ? "Ready" : "Needs setup"}
            </Badge>
          ) : (
            <Badge tone="info">One store number</Badge>
          )}
        </div>

        <form className="svx-wa-form" onSubmit={handleSubmit}>
          <div className="svx-wa-form-grid">
            <Field label="Business phone number">
              <input
                className="svx-wa-input"
                value={form.phoneNumber}
                onChange={(event) => updateField("phoneNumber", event.target.value)}
                placeholder="e.g. 2507XXXXXXXX"
              />
            </Field>

            <Field label="Business name">
              <input
                className="svx-wa-input"
                value={form.businessName}
                onChange={(event) => updateField("businessName", event.target.value)}
                placeholder="Store name shown for this account"
              />
            </Field>

            <Field label="Phone number ID" hint="Required before activating WhatsApp.">
              <input
                className="svx-wa-input"
                value={form.phoneNumberId}
                onChange={(event) => updateField("phoneNumberId", event.target.value)}
                placeholder="Meta phone number ID"
              />
            </Field>

            <Field label="WABA ID">
              <input
                className="svx-wa-input"
                value={form.wabaId}
                onChange={(event) => updateField("wabaId", event.target.value)}
                placeholder="WhatsApp business account ID"
              />
            </Field>
          </div>

          <section className="svx-wa-card-soft">
            <div className="svx-wa-secure-intro">
              <IconShell tone="info">
                <ShieldIcon />
              </IconShell>
              <div>
                <strong>Private setup values</strong>
                <span>
                  These values are sensitive. When editing, leave a secret field empty to keep
                  the current saved value.
                </span>
              </div>
            </div>

            <SecureTextarea
              label="Access token"
              value={form.accessToken}
              onChange={(event) => updateField("accessToken", event.target.value)}
              placeholder={
                mode === "edit"
                  ? "Paste a new access token only if you want to replace the current saved token"
                  : "Paste the WhatsApp access token"
              }
              helper={
                mode === "edit"
                  ? "Leave empty to keep the current saved token"
                  : "Needed for live sending and receiving"
              }
            />

            <div className="svx-wa-form-grid">
              <Field
                label="Webhook verify token"
                hint="Used when Meta verifies the webhook."
              >
                <input
                  className="svx-wa-input"
                  value={form.webhookVerifyToken}
                  onChange={(event) => updateField("webhookVerifyToken", event.target.value)}
                  placeholder={
                    mode === "edit"
                      ? "Leave empty to keep current saved verify token"
                      : "Webhook verify token"
                  }
                />
              </Field>

              <Field label="App secret" hint="Used to verify trusted incoming requests.">
                <input
                  className="svx-wa-input"
                  value={form.appSecret}
                  onChange={(event) => updateField("appSecret", event.target.value)}
                  placeholder={
                    mode === "edit"
                      ? "Leave empty to keep current saved app secret"
                      : "App secret"
                  }
                />
              </Field>
            </div>
          </section>

          <label className="svx-wa-toggle-card">
            <input
              type="checkbox"
              checked={Boolean(form.isActive)}
              onChange={(event) => updateField("isActive", event.target.checked)}
            />
            <span>
              <strong>Account is active</strong>
              <small>
                Active accounts are expected to be ready for live customer messages, replies and
                sale draft workflows.
              </small>
            </span>
          </label>

          <div className="svx-wa-bottom-grid">
            <section className="svx-wa-card-soft">
              <div className="svx-wa-subtitle">What this account controls</div>
              <div className="svx-wa-mini-grid">
                <DetailStat label="Inbox" value="Customer chats" />
                <DetailStat label="Replies" value="Staff responses" />
                <DetailStat label="Drafts" value="WhatsApp sales" />
                <DetailStat label="Broadcasts" value="Store campaigns" />
              </div>
            </section>

            <section className="svx-wa-card-soft">
              <div className="svx-wa-subtitle">Current selection</div>
              {mode === "edit" && selectedAccount ? (
                <div className="svx-wa-mini-grid">
                  <DetailStat label="Business" value={selectedAccount.businessName || "—"} />
                  <DetailStat label="Phone" value={selectedAccount.phoneNumber || "—"} />
                  <DetailStat
                    label="Connection"
                    value={selectedAccount.hasAccessToken ? "Token saved" : "Token missing"}
                  />
                  <DetailStat
                    label="Last update"
                    value={formatDateTime(selectedAccount.updatedAt || selectedAccount.createdAt)}
                  />
                </div>
              ) : (
                <p className="svx-wa-help-text">
                  Create a new account, or choose an existing account from the list to edit it.
                </p>
              )}
            </section>
          </div>

          <div className="svx-wa-form-actions">
            <button
              type="button"
              onClick={startCreate}
              className="svx-wa-secondary-button"
              disabled={saving}
            >
              Clear form
            </button>

            <AsyncButton
              type="submit"
              loading={saving}
              loadingText={mode === "edit" ? "Updating..." : "Creating..."}
              className="svx-wa-primary-button"
            >
              {mode === "edit" ? "Update account" : "Create account"}
            </AsyncButton>
          </div>
        </form>
      </section>
    </main>
  );
}

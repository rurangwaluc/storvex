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
    return "Phone number ID is required before activating WhatsApp";
  }

  if (form.isActive && !String(form.accessToken || "").trim()) {
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

  const summary = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter((item) => item.isActive).length;
    const ready = accounts.filter(isAccountReady).length;
    const needsSetup = accounts.filter((item) => item.isActive && !isAccountReady(item)).length;

    return { total, active, ready, needsSetup };
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
          <h1>WhatsApp business setup</h1>
          <p>
            Connect the store WhatsApp number used for customer conversations, staff replies,
            promotions, broadcasts, and sale drafts.
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
              Customers use one store number. Storvex keeps staff work, branches, sales and
              broadcasts organized behind the scenes.
            </span>
          </div>
        </div>

        <div className="svx-wa-rule-grid">
          <RuleCard
            icon={<ShieldIcon />}
            title="One store number"
            text="Customers always message the official store WhatsApp number."
            tone="success"
          />
          <RuleCard
            icon={<UsersIcon />}
            title="Team inbox"
            text="Owners and permitted staff work from one shared inbox."
            tone="info"
          />
          <RuleCard
            icon={<BranchIcon />}
            title="Branch-aware sales"
            text="Sale drafts and final sales still respect branches, stock and cash drawer rules."
            tone="warning"
          />
        </div>
      </section>

      <section className="svx-wa-metric-grid">
        <MetricCard
          label="Accounts"
          value={summary.total}
          note="Saved WhatsApp accounts"
          icon={<ChannelIcon />}
          tone="info"
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
          icon={<ChannelIcon />}
          tone={summary.active > 0 ? "success" : "neutral"}
        />
        <MetricCard
          label="Needs setup"
          value={summary.needsSetup}
          note="Active but missing setup"
          icon={<ShieldIcon />}
          tone={summary.needsSetup > 0 ? "warning" : "neutral"}
        />
      </section>

      <section className="svx-wa-workspace-grid">
        <div className="svx-wa-card svx-wa-list-panel">
          <div className="svx-wa-section-head">
            <div>
              <p>Accounts</p>
              <h2>Store WhatsApp accounts</h2>
            </div>
            <Badge tone="neutral">{filteredAccounts.length} shown</Badge>
          </div>

          <div className="svx-wa-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, status, or account ID..."
            />
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

        <div className="svx-wa-card svx-wa-form-panel">
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
        </div>
      </section>
    </main>
  );
}

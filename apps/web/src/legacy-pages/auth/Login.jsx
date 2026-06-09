import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import { CheckCircle2, LockKeyhole, ShieldCheck, Store } from "lucide-react";

import PublicLayout from "../../components/layout/PublicLayout";
import PasswordField from "../../components/auth/PasswordField";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient from "../../services/apiClient";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function removeStorageKeys(keys) {
  keys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function clearOldWorkspaceCache() {
  removeStorageKeys([
    "storvex_me_cache_v2",
    "storvex_me_cache",
    "storvex_active_branch_id",
    "storvex_activeBranchId",
    "activeBranchId",
    "branchId",
    "activeBranchName",
    "storvex_activeBranchName",
    "activeBranchCode",
    "storvex_activeBranchCode",
    "activeBranchIsMain",
    "allowedBranches",
  ]);
}

function clearOnboardingState() {
  removeStorageKeys([
    "storvex_owner_intent_id",
    "storvex_ownerIntentId",
    "ownerIntentId",
    "owner_intent_id",
    "storvex_signup_intent_id",
    "signupIntentId",
    "storvex_signup_email",
    "storvex_signup_phone",
    "storvex_signup_store_name",
    "storvex_signup_owner_name",
    "storvex_signup_plan",
    "storvex_signup_duration",
    "storvex_trial_selected",
    "storvex_payment_id",
    "paymentId",
    "selectedPlan",
    "selectedDuration",
    "signupEmail",
    "signupPhone",
    "signupStoreName",
    "signupOwnerName",
  ]);
}

function saveBranchSession(activeBranch, allowedBranches = []) {
  if (activeBranch?.id) {
    localStorage.setItem("activeBranchId", activeBranch.id);
    localStorage.setItem("storvex_activeBranchId", activeBranch.id);
  }

  if (activeBranch?.name) {
    localStorage.setItem("activeBranchName", activeBranch.name);
    localStorage.setItem("storvex_activeBranchName", activeBranch.name);
  }

  if (activeBranch?.code) {
    localStorage.setItem("activeBranchCode", activeBranch.code);
    localStorage.setItem("storvex_activeBranchCode", activeBranch.code);
  }

  if (typeof activeBranch?.isMain === "boolean") {
    localStorage.setItem("activeBranchIsMain", String(activeBranch.isMain));
  }

  localStorage.setItem("allowedBranches", JSON.stringify(allowedBranches));
}

function persistAuthSession(data) {
  const token = data?.token || "";

  if (!token) {
    throw new Error("Missing login token");
  }

  localStorage.setItem("tenantToken", token);
  localStorage.setItem("token", token);

  let decoded = {};
  try {
    decoded = jwtDecode(token) || {};
  } catch {
    decoded = {};
  }

  const user = data?.user || {};
  const tenant = data?.tenant || {};
  const activeBranch = data?.activeBranch || data?.mainBranch || null;
  const allowedBranches = Array.isArray(data?.allowedBranches)
    ? data.allowedBranches
    : activeBranch
      ? [activeBranch]
      : [];

  const userId = user?.id || decoded?.userId || decoded?.id || "";
  const userRole = user?.role || decoded?.role || "";
  const tenantId = user?.tenantId || tenant?.id || data?.tenantId || decoded?.tenantId || "";

  if (userId) localStorage.setItem("userId", userId);
  if (userRole) localStorage.setItem("userRole", userRole);
  if (tenantId) localStorage.setItem("tenantId", tenantId);

  if (tenant?.id) {
    localStorage.setItem("activeTenantId", tenant.id);
  }

  if (tenant?.name) {
    localStorage.setItem("activeTenantName", tenant.name);
  }

  clearOldWorkspaceCache();
  saveBranchSession(activeBranch, allowedBranches);

  return {
    decoded,
    user,
    tenant,
    activeBranch,
    allowedBranches,
  };
}

function inputClass() {
  return "h-12 w-full rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

function TrustRow({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon size={18} strokeWidth={2.5} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
          {text}
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmedEmail = useMemo(() => normalizeEmail(email), [email]);

  async function submit(event) {
    event.preventDefault();

    if (!trimmedEmail) {
      toast.error("Enter your email");
      return;
    }

    if (!password) {
      toast.error("Enter your password");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login", {
        email: trimmedEmail,
        password,
      });

      persistAuthSession(response?.data || {});
      clearOnboardingState();

      toast.success("Welcome back");
      nav("/app", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]">
              <Store size={22} strokeWidth={2.6} />
            </div>

            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Store access
            </p>

            <h1 className="mt-3 max-w-md text-3xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Log in to your store workspace.
            </h1>

            <p className="mt-5 max-w-md text-base font-semibold leading-8 text-[var(--color-text-muted)]">
              Continue with your owner or staff account. Storvex opens the right workspace,
              access level, and active selling location after login.
            </p>

            <div className="mt-8 grid gap-3">
              <TrustRow
                icon={ShieldCheck}
                title="Owner and staff access"
                text="Each person enters with the access allowed for their responsibility."
              />

              <TrustRow
                icon={CheckCircle2}
                title="Correct workspace"
                text="The store workspace opens with the right business details and selling location."
              />

              <TrustRow
                icon={LockKeyhole}
                title="Protected records"
                text="Sales, stock, cash activity, and store records stay behind account access."
              />
            </div>
          </aside>

          <main className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto flex min-h-full max-w-md flex-col justify-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  Welcome back
                </p>

                <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                  Enter your account details
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                  Use the email and password connected to your Storvex account.
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-black text-[var(--color-text)]">
                    Email
                  </label>

                  <input
                    type="email"
                    className={inputClass()}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@store.com"
                    autoFocus
                    required
                    disabled={loading}
                  />
                </div>

                <PasswordField
                  id="login-password"
                  label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                />

                <AsyncButton
                  type="submit"
                  loading={loading}
                  loadingText="Logging in..."
                  className="h-12 w-full rounded-[16px] text-sm font-black"
                >
                  Log in
                </AsyncButton>
              </form>

              <div className="mt-7 border-t border-[var(--color-border)] pt-6">
                <p className="text-center text-sm font-semibold text-[var(--color-text-muted)]">
                  New store?{" "}
                  <Link
                    to="/signup"
                    className="font-black text-[var(--color-primary)] underline-offset-4 hover:underline"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          </main>
        </div>
      </section>
    </PublicLayout>
  );
}
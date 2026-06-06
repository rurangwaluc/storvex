import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";

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

function surfaceCard() {
  return "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-[var(--color-text)]">
        {value || "—"}
      </p>
    </div>
  );
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("demo@shop.rw");
  const [password, setPassword] = useState("Test@12345");
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
        <div className="mx-auto max-w-5xl space-y-6">
          <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Store access
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
                  Log in to your store.
                </h1>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[var(--color-text-muted)]">
                  Use your owner or staff account to continue into the workspace. After login,
                  Storvex opens the correct store and active selling location.
                </p>
              </div>

              <div className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-black text-[var(--color-text)]">
                Secure workspace access
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <DetailTile label="Owner access" value="Full control" />
              <DetailTile label="Staff access" value="Role-based work" />
              <DetailTile label="After login" value="Open workspace" />
            </div>
          </section>

          <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
            <div className="mx-auto max-w-xl">
              <div className="mb-6 border-b border-[var(--color-border)] pb-6 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  Login
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                  Enter your account details
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                  Continue into the store workspace with your saved access.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
                    Email
                  </label>

                  <input
                    type="email"
                    className={inputClass()}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@store.com"
                    required
                  />
                </div>

                <PasswordField
                  id="login-password"
                  label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />

                <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[var(--color-text)]">
                        Next: open your workspace
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                        Storvex will load your store, role, and active selling location.
                      </p>
                    </div>

                    <AsyncButton
                      type="submit"
                      loading={loading}
                      loadingText="Logging in..."
                      className="w-full sm:w-auto"
                    >
                      Log in
                    </AsyncButton>
                  </div>
                </div>
              </form>

              <p className="mt-6 text-center text-sm font-semibold text-[var(--color-text-muted)]">
                New store?{" "}
                <Link
                  to="/signup"
                  className="font-black text-[var(--color-text)] underline-offset-4 hover:underline"
                >
                  Create account
                </Link>
              </p>
            </div>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}
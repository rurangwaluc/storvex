import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import {
  BadgeCheck,
  LockKeyhole,
  ShieldCheck,
  Store,
  UserRoundCheck,
} from "lucide-react";

import PublicLayout from "../../components/layout/PublicLayout";
import {
  OnboardingCard,
  OnboardingIconBadge,
} from "../../components/onboarding/OnboardingShell";
import PasswordField from "../../components/auth/PasswordField";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient from "../../services/apiClient";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function LoginActionCard({ loading }) {
  return (
    <OnboardingCard className="svx-onboard-next-card">
      <div className="svx-onboard-next-copy">
        <div className="svx-onboard-lock-icon">
          <LockKeyhole size={31} strokeWidth={2.3} />
        </div>

        <div>
          <strong>Next: open your workspace</strong>
          <p>Your store workspace will open after login.</p>
        </div>
      </div>

      <AsyncButton type="submit" loading={loading} loadingText="Logging in...">
        Log in
        <span aria-hidden="true">→</span>
      </AsyncButton>
    </OnboardingCard>
  );
}

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("owner@ruraxis.com");
  const [password, setPassword] = useState("Owner@12345");
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
      <div className="storvex-onboarding">
        <section className="svx-onboard-top">
          <div className="svx-onboard-shell">
            <div className="svx-onboard-title-wrap">
              <h1>Log in to your store workspace.</h1>

              <p>
                Use your owner or staff account to continue. Storvex opens the correct
                workspace, access level, and selling location after login.
              </p>
            </div>
          </div>
        </section>

        <section className="svx-onboard-content">
          <div className="svx-onboard-shell">
            <form onSubmit={submit} className="svx-onboard-form">
              <div className="svx-onboard-form-heading">
                <div>
                  <span className="svx-onboard-step-pill">Store access</span>

                  <h2>Welcome back.</h2>

                  <p>
                    Continue with the account connected to your store. Owner and staff access
                    open the workspace allowed for that person.
                  </p>
                </div>

                <span className="svx-onboard-safe-pill">
                  <ShieldCheck size={15} strokeWidth={2.8} />
                  Protected access
                </span>
              </div>

              <div className="svx-onboard-form-grid">
                <OnboardingCard className="order-2 lg:order-1">
                  <div className="svx-onboard-card-title-row">
                    <OnboardingIconBadge>
                      <Store size={23} strokeWidth={2.2} />
                    </OnboardingIconBadge>

                    <div>
                      <h3>Store access</h3>
                      <p>Open the right store workspace after login.</p>
                    </div>
                  </div>

                  <div className="svx-onboard-field-group">
                    <div className="svx-onboard-card-title-row">
                      <OnboardingIconBadge>
                        <UserRoundCheck size={23} strokeWidth={2.2} />
                      </OnboardingIconBadge>

                      <div>
                        <h3>Owner and staff access</h3>
                        <p>
                          Each person continues with the access allowed for their
                          responsibility.
                        </p>
                      </div>
                    </div>

                    <div className="svx-onboard-card-title-row">
                      <OnboardingIconBadge>
                        <LockKeyhole size={23} strokeWidth={2.2} />
                      </OnboardingIconBadge>

                      <div>
                        <h3>Protected records</h3>
                        <p>
                          Sales, stock, cash activity, and store records stay behind account
                          access.
                        </p>
                      </div>
                    </div>
                  </div>
                </OnboardingCard>

                <OnboardingCard className="order-1 lg:order-2">
                  <div className="svx-onboard-card-title-row">
                    <OnboardingIconBadge>
                      <BadgeCheck size={23} strokeWidth={2.2} />
                    </OnboardingIconBadge>

                    <div>
                      <h3>Account details</h3>
                      <p>Use the email and password connected to your Storvex account.</p>
                    </div>
                  </div>

                  <div className="svx-onboard-field-group">
                    <div className="svx-onboard-field">
                      <label>Email</label>

                      <input
                        type="email"
                        className="svx-onboard-input"
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

                    <div className="flex justify-end">
                      <Link
                        to="/forgot-password"
                        className="text-sm font-black text-[var(--onboard-primary)] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 lg:hidden">
                    <LoginActionCard loading={loading} />
                  </div>
                </OnboardingCard>
              </div>

              <div className="hidden lg:block">
                <LoginActionCard loading={loading} />
              </div>
            </form>

            <p className="svx-onboard-login-note">
              New store? <Link to="/signup">Create account</Link>
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
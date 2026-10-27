import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { jwtDecode } from "jwt-decode";
import PublicLayout from "../../components/layout/PublicLayout";
import "../../components/onboarding/Onboarding.css";
import "./LoginBrand.css";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient, {
  setActiveBranchId,
} from "../../services/apiClient";
import { queryClient } from "../../lib/queryClient";

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

export function clearOnboardingState() {
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

function saveBranchSession(activeBranch) {
  if (activeBranch?.id) {
    setActiveBranchId(activeBranch.id);
  }

  if (activeBranch?.name) {
    localStorage.setItem("activeBranchName", activeBranch.name);
  }

  if (activeBranch?.code) {
    localStorage.setItem("activeBranchCode", activeBranch.code);
  }

  if (typeof activeBranch?.isMain === "boolean") {
    localStorage.setItem("activeBranchIsMain", String(activeBranch.isMain));
  }

}

export function persistAuthSession(data) {
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
  saveBranchSession(activeBranch);

  return {
    decoded,
    user,
    tenant,
    activeBranch,
    allowedBranches,
  };
}

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("email");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const trimmedEmail = useMemo(() => normalizeEmail(email), [email]);

  function finishLogin(data) {
    queryClient.clear();
    persistAuthSession(data);
    clearOnboardingState();
    toast.success("Welcome back");
    nav("/app", { replace: true });
  }

  async function requestCode(event) {
    event.preventDefault();
    setLoginError("");

    if (!trimmedEmail) {
      setLoginError("Enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post(
        "/auth/retail/email-login/request",
        { email: trimmedEmail },
        { timeout: 15000 }
      );

      const nextId = response?.data?.challengeId;

      if (!nextId) {
        throw new Error("Unable to start email verification.");
      }

      setChallengeId(nextId);
      setCode("");
      setMode("verify");
    } catch {
      setLoginError(
        "We could not start email sign-in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setLoginError("");

    if (!/^\\d{6}$/.test(code)) {
      setLoginError("Enter the six-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post(
        "/auth/retail/email-login/verify",
        { challengeId, code },
        { timeout: 15000 }
      );

      finishLogin(response.data);
    } catch {
      setLoginError(
        "Invalid or expired code. Check the code or request another."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout variant="onboarding">
      <div className="storvex-onboarding svx-login-page">
        <section className="svx-login-focused" aria-labelledby="svx-login-title">
          <div className="svx-login-focused__intro">
            <h1 id="svx-login-title">Welcome back.</h1>
            <p>Log in to your Storvex workspace.</p>
          </div>

          <form
            onSubmit={
              mode === "verify"
                ? verifyCode
                : requestCode
            }
            className="svx-login-focused__card"
          >
            {loginError && (
              <div
                role="alert"
                aria-live="assertive"
                className="svx-login-focused__error"
              >
                <strong>We could not continue</strong>
                <span>{loginError}</span>
              </div>
            )}

            {mode !== "verify" ? (
              <div className="svx-login-focused__field">
                <label htmlFor="storvex-login-email">
                  Email address
                </label>
                <input
                  id="storvex-login-email"
                  type="email"
                  className="svx-onboard-input"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setLoginError("");
                  }}
                  autoComplete="email"
                  placeholder="you@store.com"
                  autoFocus
                  required
                  disabled={loading}
                />
              </div>
            ) : (
              <>
                <p>
                  Enter the six-digit code sent to your email,
                  if your account is eligible.
                </p>
                <div className="svx-login-focused__field">
                  <label htmlFor="storvex-login-code">
                    Verification code
                  </label>
                  <input
                    id="storvex-login-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="svx-onboard-input"
                    value={code}
                    onChange={(event) => {
                      setCode(
                        event.target.value.replace(/\\D/g, "").slice(0, 6)
                      );
                      setLoginError("");
                    }}
                    autoFocus
                    required
                    disabled={loading}
                    placeholder="000000"
                  />
                </div>
              </>
            )}

            <AsyncButton
              type="submit"
              loading={loading}
              loadingText={
                mode === "verify" ? "Verifying..." : "Sending code..."
              }
              className="svx-login-focused__submit"
            >
              {mode === "verify"
                ? "Verify and log in"
                : "Continue with email"}
              <span aria-hidden="true"> →</span>
            </AsyncButton>

            {mode === "verify" && (
              <div className="svx-login-focused__recovery">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMode("email");
                    setChallengeId("");
                    setCode("");
                    setLoginError("");
                  }}
                >
                  Use another email or request a new code
                </button>
              </div>
            )}
          </form>

          <p className="svx-login-focused__signup">
            New to Storvex? <Link to="/signup">Create an account</Link>
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}

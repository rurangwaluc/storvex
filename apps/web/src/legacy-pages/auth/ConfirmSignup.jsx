import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import PublicLayout from "../../components/layout/PublicLayout";
import PasswordField from "../../components/auth/PasswordField";
import AsyncButton from "../../components/ui/AsyncButton";
import AuthPageSkeleton from "../../components/ui/AuthPageSkeleton";
import apiClient from "../../services/apiClient";
import {
  findSubscriptionPlan,
  normalizeSubscriptionPlans,
} from "../../utils/subscriptionPlans";

function signupCompleted() {
  try {
    return (
      localStorage.getItem("storvex_signupCompleted") === "true" ||
      sessionStorage.getItem("storvex_signupCompleted") === "true"
    );
  } catch {
    return false;
  }
}

function markSignupCompleted() {
  try {
    localStorage.setItem("storvex_signupCompleted", "true");
    sessionStorage.setItem("storvex_signupCompleted", "true");
  } catch {
    // Ignore storage failures.
  }
}

function readOnboardingState() {
  try {
    const raw = localStorage.getItem("storvex_onboarding");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOnboardingPatch(patch) {
  const current = readOnboardingState() || {};
  const next = { ...current, ...patch };

  localStorage.setItem("storvex_onboarding", JSON.stringify(next));

  if (typeof next.intentId === "string") {
    localStorage.setItem("storvex_intentId", next.intentId || "");
  }

  if (typeof next.storeName === "string") {
    localStorage.setItem("storvex_storeName", next.storeName || "");
  }

  if (typeof next.ownerName === "string") {
    localStorage.setItem("storvex_ownerName", next.ownerName || "");
  }

  if (typeof next.email === "string") {
    localStorage.setItem("storvex_ownerEmail", next.email || "");
  }

  if (typeof next.phone === "string") {
    localStorage.setItem("storvex_ownerPhone", next.phone || "");
  }

  if (typeof next.planKey === "string") {
    localStorage.setItem("storvex_planKey", next.planKey || "");
  }

  if (typeof next.signupMode === "string") {
    localStorage.setItem("storvex_signupMode", next.signupMode || "");
  }

  if (typeof next.emailVerified === "boolean") {
    localStorage.setItem("storvex_emailVerified", String(next.emailVerified));
  }

  if (typeof next.phoneVerified === "boolean") {
    localStorage.setItem("storvex_phoneVerified", String(next.phoneVerified));
  }
}

function clearOnboardingState() {
  [
    "storvex_onboarding",
    "storvex_intentId",
    "storvex_ownerPhone",
    "storvex_ownerEmail",
    "storvex_storeName",
    "storvex_ownerName",
    "storvex_shopType",
    "storvex_district",
    "storvex_sector",
    "storvex_address",
    "storvex_deviceId",
    "storvex_emailVerified",
    "storvex_phoneVerified",
    "storvex_signupMode",
    "storvex_planKey",
  ].forEach((key) => localStorage.removeItem(key));
}

function saveAuthSession(data) {
  const token = data?.token || "";
  const user = data?.user || {};
  const tenant = data?.tenant || {};
  const activeBranch = data?.activeBranch || data?.mainBranch || null;
  const allowedBranches = Array.isArray(data?.allowedBranches)
    ? data.allowedBranches
    : activeBranch
      ? [activeBranch]
      : [];

  if (token) {
    localStorage.setItem("tenantToken", token);
    localStorage.setItem("token", token);
  }

  if (user?.id) localStorage.setItem("userId", user.id);
  if (user?.role) localStorage.setItem("userRole", user.role);
  if (user?.tenantId || tenant?.id || data?.tenantId) {
    localStorage.setItem("tenantId", user?.tenantId || tenant?.id || data?.tenantId);
  }

  if (tenant?.id) localStorage.setItem("activeTenantId", tenant.id);
  if (tenant?.name) localStorage.setItem("activeTenantName", tenant.name);

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

  sessionStorage.removeItem("storvex_me_cache_v2");
}

function formatMoney(value, currency) {
  const n = Number(value);
  const c = currency || "RWF";

  if (!Number.isFinite(n)) return String(value || "—");

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n))} ${c}`;
}

function normalizeMode(raw) {
  const value = String(raw || "").trim().toUpperCase();

  if (value === "TRIAL") return "TRIAL";
  if (value === "PAID") return "PAID";
  if (value === "ENTERPRISE") return "ENTERPRISE";

  return "";
}

function getBackRoute(mode) {
  if (mode === "TRIAL") return "/owner-payment";
  if (mode === "PAID") return "/owner-payment";
  if (mode === "ENTERPRISE") return "/owner-payment";
  return "/signup";
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
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

function ProgressStep({ number, label, active = false, done = false }) {
  return (
    <div
      className={cx(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        active || done
          ? "border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)]",
      )}
    >
      <div
        className={cx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black",
          done
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
            : active
              ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
              : "bg-[var(--color-card)] text-[var(--color-text-muted)]",
        )}
      >
        {done ? "✓" : number}
      </div>

      <div className="text-sm font-black text-[var(--color-text)]">{label}</div>
    </div>
  );
}

function PasswordRule({ ok, children }) {
  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black",
        ok
          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
      )}
    >
      <span
        className={cx(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
          ok
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
            : "bg-[var(--color-card)]",
        )}
      >
        {ok ? "✓" : "•"}
      </span>
      {children}
    </div>
  );
}

export default function ConfirmSignup() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const onboarding = useMemo(() => readOnboardingState(), []);

  const intentId = onboarding?.intentId || localStorage.getItem("storvex_intentId") || "";
  const storeName = onboarding?.storeName || localStorage.getItem("storvex_storeName") || "";
  const ownerName = onboarding?.ownerName || localStorage.getItem("storvex_ownerName") || "";
  const ownerEmail = onboarding?.email || localStorage.getItem("storvex_ownerEmail") || "";
  const ownerPhone = onboarding?.phone || localStorage.getItem("storvex_ownerPhone") || "";
  const planKeyStored = onboarding?.planKey || localStorage.getItem("storvex_planKey") || "";

  const emailVerified =
    onboarding?.emailVerified ?? localStorage.getItem("storvex_emailVerified") === "true";

  const phoneVerified =
    onboarding?.phoneVerified ?? localStorage.getItem("storvex_phoneVerified") === "true";

  const enterpriseInterest = Boolean(onboarding?.enterpriseInterest);

  const queryMode = normalizeMode(searchParams.get("mode"));
  const storedMode = normalizeMode(
    onboarding?.signupMode || localStorage.getItem("storvex_signupMode"),
  );
  const resolvedMode = queryMode || storedMode || "PAID";

  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(30);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loading, setLoading] = useState(false);

  const paidPlan = useMemo(
    () => findSubscriptionPlan(plans, planKeyStored),
    [plans, planKeyStored],
  );

  const passwordLongEnough = password.length >= 6;
  const passwordHasNumber = /\d/.test(password);
  const passwordHasLetter = /[a-zA-Z]/.test(password);
  const hasConfirm = confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    if (!intentId || !storeName) {
      if (signupCompleted()) {
        nav("/login", { replace: true });
        return;
      }

      toast.error("Missing setup info. Please start again.");
      nav("/signup", { replace: true });
      return;
    }

    if (!emailVerified || !phoneVerified) {
      toast.error("Verify email and phone first.");
      nav("/verify-otp", { replace: true });
      return;
    }

    if (resolvedMode === "ENTERPRISE" || enterpriseInterest) {
      toast.error("Enterprise setup is not completed through self-serve signup yet.");
      nav("/owner-payment", { replace: true });
    }
  }, [
    intentId,
    storeName,
    emailVerified,
    phoneVerified,
    resolvedMode,
    enterpriseInterest,
    nav,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoadingPlans(true);

      try {
        const { data } = await apiClient.get("/auth/plans");

        if (cancelled) return;

        setPlans(
          normalizeSubscriptionPlans(data?.plans).filter(
            (plan) => !plan.isEnterprise,
          ),
        );
        setTrialDays(Number(data?.trialDays || 30));
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load plans");
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveOnboardingPatch({
      signupMode: resolvedMode,
    });
  }, [resolvedMode]);

  function validate() {
    if (!passwordLongEnough) {
      toast.error("Password must be at least 6 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return false;
    }

    if (resolvedMode === "PAID" && !planKeyStored) {
      toast.error("Missing plan selection. Please choose a paid plan first.");
      nav("/owner-payment", { replace: true });
      return false;
    }

    if (resolvedMode === "ENTERPRISE" || enterpriseInterest) {
      toast.error("Enterprise self-serve signup is not enabled yet.");
      nav("/owner-payment", { replace: true });
      return false;
    }

    return true;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        intentId: String(intentId || "").trim(),
        password,
        mode: resolvedMode,
      };

      if (resolvedMode === "PAID") {
        payload.planKey = planKeyStored;
      }

      await apiClient.post("/auth/confirm-signup", payload);

      markSignupCompleted();
      clearOnboardingState();

      toast.success(resolvedMode === "TRIAL" ? "Trial account created. Please log in." : "Store activated. Please log in.");
      nav("/login", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to finish signup");
    } finally {
      setLoading(false);
    }
  }

  const modeLabel = resolvedMode === "TRIAL" ? "Free trial" : "Paid activation";

  const modeDescription =
    resolvedMode === "TRIAL"
      ? `${trialDays} days of full access before payment is needed.`
      : paidPlan
        ? `${paidPlan.label} — ${formatMoney(
            paidPlan.price,
            paidPlan.currency,
          )}`
        : "Paid plan selected.";

  if (loadingPlans) {
    return (
      <PublicLayout>
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <AuthPageSkeleton titleWidth="w-64" lines={3} showSide={false} />
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Step 4 of 5
                </div>

                <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
                  Create your owner password.
                </h1>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-[var(--color-text-muted)]">
                  This is the final security step before Storvex creates the store,
                  owner account, subscription, and first branch.
                </p>
              </div>

              <div className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-black text-[var(--color-text)]">
                Ready to open workspace
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailTile label="Store" value={storeName || "Your store"} />
              <DetailTile label="Owner" value={ownerName || "Owner"} />
              <DetailTile label="Email" value={ownerEmail || "—"} />
              <DetailTile label="Activation" value={modeLabel} />
            </div>
          </section>

          <section className={cx(surfaceCard(), "p-5")}>
            <div className="grid gap-3 md:grid-cols-5">
              <ProgressStep number="1" label="Create store account" done />
              <ProgressStep number="2" label="Verify email and phone" done />
              <ProgressStep number="3" label="Choose activation" done />
              <ProgressStep number="4" label="Create password" active />
              <ProgressStep number="5" label="Open workspace" />
            </div>
          </section>

          <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="mb-6 border-b border-[var(--color-border)] pb-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                    Password
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                    Secure the owner account
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                    Use a password the owner can remember but staff cannot guess.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <PasswordField
                    id="signup-password"
                    label="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    helperText="Use at least 6 characters."
                  />

                  <PasswordField
                    id="signup-confirm-password"
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    error={hasConfirm && !passwordsMatch ? "Passwords do not match." : ""}
                  />

                  <div className="grid gap-2 sm:grid-cols-3">
                    <PasswordRule ok={passwordLongEnough}>6+ characters</PasswordRule>
                    <PasswordRule ok={passwordHasLetter}>Has letters</PasswordRule>
                    <PasswordRule ok={passwordHasNumber}>Has numbers</PasswordRule>
                  </div>

                  <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-[var(--color-text)]">
                          Next: open the workspace
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                          After this, the owner enters the store workspace with the first branch ready.
                        </p>
                      </div>

                      <AsyncButton
                        type="submit"
                        loading={loading}
                        loadingText={
                          resolvedMode === "TRIAL"
                            ? "Starting trial..."
                            : "Finishing setup..."
                        }
                        className="w-full sm:w-auto"
                        disabled={loadingPlans}
                      >
                        {resolvedMode === "TRIAL"
                          ? "Start trial and open store"
                          : "Finish setup and open store"}
                      </AsyncButton>
                    </div>
                  </div>
                </form>
              </div>

              <aside className="h-fit rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-28">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  Final summary
                </p>

                <h3 className="mt-3 text-lg font-black text-[var(--color-text)]">
                  {storeName || "Your store"}
                </h3>

                <div className="mt-4 grid gap-3">
                  <DetailTile label="Owner" value={ownerName || "Owner"} />
                  <DetailTile label="Phone" value={ownerPhone || "—"} />
                  <DetailTile label="Activation" value={modeDescription} />
                </div>

                <div className="mt-5 rounded-[24px] bg-[var(--color-card)] p-4">
                  <p className="text-sm font-black text-[var(--color-text)]">
                    What happens next?
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                    Storvex creates the store account, owner access, subscription, and main branch.
                    Then the owner continues into the workspace.
                  </p>
                </div>

                <Link
                  to={getBackRoute(resolvedMode)}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
                >
                  Return to previous step
                </Link>
              </aside>
            </div>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}

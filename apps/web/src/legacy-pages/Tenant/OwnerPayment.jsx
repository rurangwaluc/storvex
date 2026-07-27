import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import OnboardingShell from "../../components/onboarding/OnboardingShell";
import {
  readOnboardingState,
  saveOnboardingState,
} from "../../components/onboarding/onboardingStorage";
import AsyncButton from "../../components/ui/AsyncButton";
import AuthPageSkeleton from "../../components/ui/AuthPageSkeleton";
import apiClient from "../../services/apiClient";
import {
  findSubscriptionPlan,
  normalizeSubscriptionPlans,
  pickRecommendedPlan,
  planCapacityLabel,
} from "../../utils/subscriptionPlans";

const PASSWORD_DRAFT_KEY = "storvex_ownerPasswordDraft";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/[^\d]/g, "");

  if (!digits) return "";
  if (digits.startsWith("07") && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.startsWith("2507") && digits.length === 12) return digits;

  return digits;
}

function normalizeContact(value) {
  return cleanString(value).toLowerCase();
}

function contactMatches(savedContact, currentContact) {
  return Boolean(savedContact) && normalizeContact(savedContact) === normalizeContact(currentContact);
}

function readPasswordDraft() {
  try {
    return sessionStorage.getItem(PASSWORD_DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

function removeStorageKeys(keys) {
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  });
}

function clearOnboardingSession() {
  removeStorageKeys([
    PASSWORD_DRAFT_KEY,
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
    "storvex_emailVerifiedFor",
    "storvex_phoneVerified",
    "storvex_phoneVerifiedFor",
    "storvex_signupMode",
    "storvex_planKey",
    "storvex_paymentReference",
  ]);
}

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

function goToLogin(nav) {
  nav("/login", { replace: true });

  window.setTimeout(() => {
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }, 0);
}

function saveOnboardingPatch(patch) {
  const current = readOnboardingState() || {};
  const next = { ...current, ...patch };

  saveOnboardingState(next);

  if (typeof next.intentId === "string") localStorage.setItem("storvex_intentId", next.intentId || "");
  if (typeof next.storeName === "string") localStorage.setItem("storvex_storeName", next.storeName || "");
  if (typeof next.ownerName === "string") localStorage.setItem("storvex_ownerName", next.ownerName || "");
  if (typeof next.phone === "string") localStorage.setItem("storvex_ownerPhone", next.phone || "");
  if (typeof next.email === "string") localStorage.setItem("storvex_ownerEmail", next.email || "");
  if (typeof next.planKey === "string") localStorage.setItem("storvex_planKey", next.planKey || "");
  if (typeof next.signupMode === "string") localStorage.setItem("storvex_signupMode", next.signupMode || "");

  if (typeof next.paymentReference === "string") {
    localStorage.setItem("storvex_paymentReference", next.paymentReference || "");
  }
}

function formatMoney(amount, currency = "RWF") {
  const value = Number(amount);

  if (!Number.isFinite(value)) return "—";

  return `${new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} ${currency}`;
}

function ShieldIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5L19 6.5V11.5C19 16 16.15 19.25 12 20.5C7.85 19.25 5 16 5 11.5V6.5L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 12L11 14.25L15.5 9.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompactPlanOption({ plan, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={cx(
        "group flex w-full min-w-0 items-center justify-between gap-4 rounded-[18px] border px-5 py-5 text-left transition duration-200",
        active
          ? "border-[var(--onboard-primary)] bg-[var(--onboard-primary-soft)] ring-1 ring-[var(--onboard-primary)]"
          : "border-[var(--onboard-border)] bg-[var(--onboard-card)] hover:border-[var(--onboard-primary)]",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--onboard-text)]">
            {plan.name}
          </h3>

          {plan.recommended ? (
            <span className="rounded-full bg-[var(--onboard-primary)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
              Recommended
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm font-bold text-[var(--onboard-muted)]">
          {formatMoney(plan.price, plan.currency)} / month
        </p>

        <p className="mt-2 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
          {planCapacityLabel(plan)}
        </p>
      </div>

      <span
        className={cx(
          "flex h-10 shrink-0 items-center justify-center rounded-[12px] px-4 text-xs font-black transition",
          active
            ? "bg-[var(--onboard-primary)] text-white"
            : "border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] text-[var(--onboard-text)] group-hover:border-[var(--onboard-primary)]",
        )}
      >
        {active ? "Selected" : "Choose"}
      </span>
    </button>
  );
}

function SelectedPlanPanel({
  selectedPlan,
  storeName,
  trialDays,
  loading,
  onStartTrial,
  onChangePlan,
}) {
  if (!selectedPlan) {
    return (
      <section className="rounded-[28px] border border-[var(--onboard-border)] bg-[var(--onboard-card)] p-6">
        <p className="text-sm font-bold text-[var(--onboard-muted)]">
          Your Storvex plan is loading.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--onboard-border)] bg-[var(--onboard-card)]">
      <div className="border-b border-[var(--onboard-border)] px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
              Your selected plan
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)] sm:text-4xl">
              {selectedPlan.name}
            </h2>

            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)] sm:text-base sm:leading-7">
              Use the real {selectedPlan.name} plan free for {trialDays} days.
              No payment is required today.
            </p>
          </div>

          <div className="shrink-0 lg:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
              After trial
            </p>

            <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
              {formatMoney(selectedPlan.price, selectedPlan.currency)}
            </p>

            <p className="mt-1 text-xs font-bold text-[var(--onboard-muted)]">
              per month
            </p>
          </div>
        </div>
      </div>

      <div className="grid border-b border-[var(--onboard-border)] sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-b border-[var(--onboard-border)] px-6 py-5 sm:border-r lg:border-b-0">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
            Store
          </p>

          <p className="mt-2 truncate text-sm font-black text-[var(--onboard-text)]">
            {storeName || "Your store"}
          </p>
        </div>

        <div className="border-b border-[var(--onboard-border)] px-6 py-5 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
            Capacity
          </p>

          <p className="mt-2 text-sm font-black leading-5 text-[var(--onboard-text)]">
            {planCapacityLabel(selectedPlan)}
          </p>
        </div>

        <div className="border-b border-[var(--onboard-border)] px-6 py-5 sm:border-b-0 sm:border-r">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
            Trial starts
          </p>

          <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
            Today
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
            First payment
          </p>

          <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
            After {trialDays} days
          </p>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AsyncButton
            type="button"
            loading={loading}
            loadingText="Creating your store..."
            onClick={onStartTrial}
            className="w-full sm:w-auto sm:min-w-[280px]"
          >
            Start {trialDays}-day free trial
            <span aria-hidden="true">→</span>
          </AsyncButton>

          <button
            type="button"
            onClick={onChangePlan}
            disabled={loading}
            className="h-12 rounded-[14px] border border-[var(--onboard-border)] px-5 text-sm font-black text-[var(--onboard-text)] transition hover:border-[var(--onboard-primary)] hover:text-[var(--onboard-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Change plan
          </button>
        </div>

        <p className="mt-4 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
          Available once per verified business owner.
        </p>
      </div>
    </section>
  );
}

export default function OwnerPayment() {
  const nav = useNavigate();
  const onboarding = useMemo(() => readOnboardingState(), []);

  const intentId = onboarding?.intentId || localStorage.getItem("storvex_intentId") || "";
  const storeName = onboarding?.storeName || localStorage.getItem("storvex_storeName") || "";
  const ownerName = onboarding?.ownerName || localStorage.getItem("storvex_ownerName") || "";
  const ownerEmail = onboarding?.email || localStorage.getItem("storvex_ownerEmail") || "";
  const ownerPhone = onboarding?.phone || localStorage.getItem("storvex_ownerPhone") || "";

  const savedVerifiedEmail =
    onboarding?.emailVerifiedFor || localStorage.getItem("storvex_emailVerifiedFor") || "";
  const savedVerifiedPhone =
    onboarding?.phoneVerifiedFor || localStorage.getItem("storvex_phoneVerifiedFor") || "";

  const emailVerified =
    Boolean(onboarding?.emailVerified ?? localStorage.getItem("storvex_emailVerified") === "true") &&
    contactMatches(savedVerifiedEmail, ownerEmail);

  const phoneVerified =
    Boolean(onboarding?.phoneVerified ?? localStorage.getItem("storvex_phoneVerified") === "true") &&
    contactMatches(savedVerifiedPhone, ownerPhone);

  const passwordReady = Boolean(onboarding?.passwordReady && readPasswordDraft());

  const [booting, setBooting] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(30);

  const originallySelectedPlanKey = useMemo(
    () =>
      String(
        onboarding?.planKey ||
          localStorage.getItem("storvex_planKey") ||
          "",
      )
        .trim()
        .toUpperCase(),
    [onboarding?.planKey],
  );

  const [selectedPlanKey, setSelectedPlanKey] = useState(() => {
    return localStorage.getItem("storvex_planKey") || "";
  });

  const [showPlanChoices, setShowPlanChoices] = useState(false);

  const selectedPlan = useMemo(() => {
    return (
      findSubscriptionPlan(plans, selectedPlanKey) ||
      pickRecommendedPlan(plans)
    );
  }, [plans, selectedPlanKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoadingPlans(true);

      try {
        const { data } = await apiClient.get("/auth/plans");

        if (cancelled) return;

        const nextPlans = normalizeSubscriptionPlans(
          data?.plans,
        ).filter((plan) => !plan.isEnterprise);

        setPlans(nextPlans);
        setTrialDays(Number(data?.trialDays || 30));

        const storedKey =
          localStorage.getItem("storvex_planKey") || "";

        const initialPlan =
          findSubscriptionPlan(nextPlans, storedKey) ||
          pickRecommendedPlan(nextPlans);

        if (initialPlan) {
          setSelectedPlanKey(initialPlan.key);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error?.response?.data?.message ||
              "Failed to load Storvex plans",
          );
        }
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
    if (!intentId || !storeName) {
      if (signupCompleted()) {
        nav("/login", { replace: true });
        return;
      }

      toast.error("Missing setup info. Please start again.");
      nav("/signup", { replace: true });
      return;
    }

    if (!emailVerified || !phoneVerified || !passwordReady) {
      toast.error("Secure your account first.");
      nav("/verify-otp", { replace: true });
      return;
    }

    if (!loadingPlans) {
      setBooting(false);
    }
  }, [
    intentId,
    storeName,
    emailVerified,
    phoneVerified,
    passwordReady,
    loadingPlans,
    nav,
  ]);

  useEffect(() => {
    if (!selectedPlan?.key) return;

    localStorage.setItem("storvex_signupMode", "TRIAL");
    localStorage.setItem("storvex_planKey", selectedPlan.key);

    saveOnboardingPatch({
      intentId,
      storeName,
      ownerName,
      email: ownerEmail,
      phone: normalizePhone(ownerPhone),
      signupMode: "TRIAL",
      planKey: selectedPlan.key,
      paymentReference: "",
      launchPricing: Boolean(selectedPlan.launchPricing),
      marketplaceIncluded:
        selectedPlan.marketplaceIncluded !== false,
      passwordReady: true,
    });
  }, [
    intentId,
    storeName,
    ownerName,
    ownerEmail,
    ownerPhone,
    selectedPlan,
  ]);

  function choosePlan(plan) {
    if (!plan?.key) return;

    setSelectedPlanKey(plan.key);
    setShowPlanChoices(false);
    localStorage.setItem("storvex_signupMode", "TRIAL");
    localStorage.setItem("storvex_planKey", plan.key);

    saveOnboardingPatch({
      signupMode: "TRIAL",
      planKey: plan.key,
      paymentReference: "",
      launchPricing: Boolean(plan.launchPricing),
      marketplaceIncluded:
        plan.marketplaceIncluded !== false,
      phone: normalizePhone(ownerPhone),
      passwordReady: true,
    });
  }

  async function completeSignup(mode, planKey = "") {
    const password = readPasswordDraft();

    if (!password) {
      toast.error("Password is missing. Secure your account again.");
      nav("/verify-otp", { replace: true });
      return;
    }

    const payload = {
      intentId,
      password,
      mode,
    };

    if (planKey) {
      payload.planKey = planKey;
    }

    await apiClient.post("/auth/confirm-signup", payload);

    markSignupCompleted();
    clearOnboardingSession();

    toast.success(
      mode === "TRIAL"
        ? `${trialDays}-day free trial started. Please log in.`
        : "Store account activated. Please log in.",
    );
    goToLogin(nav);
  }

  async function startTrial() {
    if (!selectedPlan?.key) {
      toast.error("Choose a Storvex plan first.");
      return;
    }

    choosePlan(selectedPlan);
    setLoading(true);

    try {
      await completeSignup("TRIAL", selectedPlan.key);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Free trial signup failed",
      );
    } finally {
      setLoading(false);
    }
  }

  if (booting || loadingPlans) {
    return <AuthPageSkeleton titleWidth="w-72" lines={4} showSide={false} />;
  }

  return (
    <OnboardingShell
      activeStep={3}
      title="Launch your store."
      subtitle={
        selectedPlan
          ? `Your ${trialDays}-day ${selectedPlan.name} trial starts today. No payment is required.`
          : `Start Storvex free for ${trialDays} days. No payment is required.`
      }
      footer={
        <p className="svx-onboard-login-note">
          Need to change security details?{" "}
          <Link to="/verify-otp">Back to security</Link>
        </p>
      }
    >
      <form
        className="svx-onboard-form"
        onSubmit={(event) => event.preventDefault()}
      >
        <SelectedPlanPanel
          selectedPlan={selectedPlan}
          storeName={storeName}
          trialDays={trialDays}
          loading={loading}
          onStartTrial={startTrial}
          onChangePlan={() =>
            setShowPlanChoices((current) => !current)
          }
        />

        {showPlanChoices ? (
          <section className="mt-6 rounded-[28px] border border-[var(--onboard-border)] bg-[var(--onboard-card)] p-6 sm:p-8">
            <div className="flex flex-col gap-3 border-b border-[var(--onboard-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
                  Change plan
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
                  Choose the right plan for your store.
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                  Every plan is free for {trialDays} days. The displayed
                  monthly price applies after the trial.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPlanChoices(false)}
                className="h-10 self-start rounded-[12px] border border-[var(--onboard-border)] px-4 text-xs font-black text-[var(--onboard-text)] transition hover:border-[var(--onboard-primary)] hover:text-[var(--onboard-primary)] sm:self-auto"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              {plans.map((plan) => (
                <CompactPlanOption
                  key={plan.key}
                  plan={plan}
                  active={selectedPlan?.key === plan.key}
                  onSelect={choosePlan}
                />
              ))}
            </div>

            <p className="mt-5 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
              Full feature comparisons remain available on the public pricing
              page.
            </p>
          </section>
        ) : null}
      </form>
    </OnboardingShell>
  );

}

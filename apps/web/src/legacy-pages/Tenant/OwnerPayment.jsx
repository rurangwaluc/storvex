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

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 12.5L10.25 15.75L17.5 8.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

function PriceTagIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.75 12.25V6.75C4.75 5.65 5.65 4.75 6.75 4.75H12.25C12.78 4.75 13.29 4.96 13.66 5.34L19.25 10.93C20.03 11.71 20.03 12.97 19.25 13.75L13.75 19.25C12.97 20.03 11.71 20.03 10.93 19.25L5.34 13.66C4.96 13.29 4.75 12.78 4.75 12.25Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 9H9.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M11 15.25L15.25 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FeatureItem({ children }) {
  return (
    <li className="flex items-start gap-2 text-sm font-bold leading-6 text-[var(--onboard-text)]">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
        <CheckIcon />
      </span>
      <span>{children}</span>
    </li>
  );
}

function SectionHeader({ icon, title, text }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[var(--onboard-primary-soft)] text-[var(--onboard-primary)]">
        {icon}
      </div>

      <div>
        <h3 className="text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
          {title}
        </h3>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
          {text}
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={cx(
        "relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 text-left transition duration-300 hover:-translate-y-1",
        active
          ? "border-[var(--onboard-primary)] bg-[var(--onboard-card)] shadow-[0_26px_90px_rgba(37,99,235,0.18)] ring-1 ring-[var(--onboard-primary)]"
          : "border-[var(--onboard-border)] bg-[var(--onboard-card)] shadow-[0_24px_70px_rgba(15,45,90,0.06)] hover:border-[var(--onboard-primary)]",
      )}
    >
      {plan.badge ? (
        <span className="absolute right-5 top-5 rounded-full bg-[var(--onboard-primary)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
          {plan.badge}
        </span>
      ) : null}

      <div className="pr-28">
        <p className="text-sm font-black text-[var(--onboard-muted)]">{plan.bestFor}</p>

        <h3 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
          {plan.name}
        </h3>

        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
          {plan.short}
        </p>
      </div>

      <div className="mt-6">
        <span className="text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)]">
          {formatMoney(plan.price, plan.currency)}
        </span>
        <span className="ml-2 text-sm font-bold text-[var(--onboard-muted)]">/ month</span>
      </div>

      <div className="mt-5 rounded-[18px] border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] px-4 py-3 text-xs font-black leading-5 text-[var(--onboard-text)]">
        {planCapacityLabel(plan)}
      </div>

      <ul className="mt-5 grid flex-1 gap-2">
        {plan.features.slice(0, 6).map((feature) => (
          <FeatureItem key={feature}>{feature}</FeatureItem>
        ))}
      </ul>

      <div
        className={cx(
          "mt-8 flex h-12 items-center justify-center rounded-[16px] text-sm font-black transition",
          active
            ? "bg-[var(--onboard-primary)] text-white"
            : "border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] text-[var(--onboard-text)]",
        )}
      >
        {active ? "Selected" : `Use ${plan.name}`}
      </div>
    </button>
  );
}

function PlanSummary({ selectedPlan, storeName }) {
  if (!selectedPlan) {
    return (
      <div className="rounded-[24px] border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] p-4 text-sm font-bold text-[var(--onboard-muted)]">
        Plans are loading.
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-[24px] border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
          Plan
        </p>
        <p className="mt-1 text-sm font-black text-[var(--onboard-text)]">
          {selectedPlan.name}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
          Monthly price
        </p>
        <p className="mt-1 text-sm font-black text-[var(--onboard-text)]">
          {formatMoney(selectedPlan.price, selectedPlan.currency)}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
          Capacity
        </p>
        <p className="mt-1 text-sm font-black leading-5 text-[var(--onboard-text)]">
          {planCapacityLabel(selectedPlan)}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
          Store
        </p>
        <p className="mt-1 text-sm font-black text-[var(--onboard-text)]">
          {storeName || "Your store"}
        </p>
      </div>
    </div>
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
      title="Launch your Storvex plan."
      subtitle={`Start your selected plan free for ${trialDays} days. No payment is required today.`}
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
        <div className="svx-onboard-form-heading">
          <div>
            <span className="svx-onboard-step-pill">Step 3 of 3</span>

            <h2>Your launch plan.</h2>

            <p>
              Review the plan selected earlier or choose another plan before
              starting your free trial.
            </p>
          </div>

          <span className="svx-onboard-safe-pill">
            <span>✓</span>
            No payment today
          </span>
        </div>

        <section className="svx-onboard-card">
          <SectionHeader
            icon={<ShieldIcon />}
            title={`${trialDays}-day free trial`}
            text="Your chosen plan and its real features become active when your store account is created."
          />

          <PlanSummary
            selectedPlan={selectedPlan}
            storeName={storeName}
          />

          {originallySelectedPlanKey &&
          selectedPlan?.key?.toUpperCase() ===
            originallySelectedPlanKey ? (
            <p className="mt-4 inline-flex rounded-full bg-[var(--onboard-primary)]/10 px-3 py-1.5 text-xs font-black text-[var(--onboard-primary)]">
              Selected earlier
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 rounded-[22px] border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] p-5 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
                Today
              </p>

              <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
                No payment
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
                Trial period
              </p>

              <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
                {trialDays} days
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
                After trial
              </p>

              <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
                {selectedPlan
                  ? `${formatMoney(
                      selectedPlan.price,
                      selectedPlan.currency,
                    )} / month`
                  : "Plan price applies"}
              </p>
            </div>
          </div>

          <AsyncButton
            type="button"
            loading={loading}
            loadingText="Creating your store..."
            disabled={!selectedPlan?.key}
            onClick={startTrial}
            className="mt-6 w-full sm:w-auto sm:min-w-[280px]"
          >
            Start {trialDays}-day free trial
            <span aria-hidden="true">→</span>
          </AsyncButton>

          <p className="mt-3 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
            Available once per verified business owner. Your selected plan can
            be changed before starting the trial.
          </p>
        </section>

        <section className="svx-onboard-card">
          <SectionHeader
            icon={<PriceTagIcon />}
            title="Choose your plan"
            text={`Select the plan you want to use during the ${trialDays}-day free trial. The displayed monthly price applies after the trial.`}
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                active={selectedPlan?.key === plan.key}
                onSelect={choosePlan}
              />
            ))}
          </div>
        </section>
      </form>
    </OnboardingShell>
  );

}

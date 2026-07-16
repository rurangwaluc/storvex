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

function isValidRwandaPhone(value) {
  return /^2507\d{8}$/.test(normalizePhone(value));
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

  return `${new Intl.NumberFormat("en-US", {
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

function SparkIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3L13.55 8.45L19 10L13.55 11.55L12 17L10.45 11.55L5 10L10.45 8.45L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 15L18.8 17.2L21 18L18.8 18.8L18 21L17.2 18.8L15 18L17.2 17.2L18 15Z"
        stroke="currentColor"
        strokeWidth="2"
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

function StartOptionCard({ active, title, text, badge, icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative overflow-hidden rounded-[28px] border p-6 text-left transition duration-300",
        active
          ? "z-10 -translate-y-1 border-[var(--onboard-primary)] bg-[var(--onboard-card)] shadow-[0_26px_90px_rgba(37,99,235,0.16)] ring-2 ring-[var(--onboard-primary)]"
          : "border-[var(--onboard-border)] bg-[var(--onboard-card)] opacity-70 shadow-[0_18px_52px_rgba(15,45,90,0.04)] saturate-[0.86] hover:-translate-y-0.5 hover:border-[var(--onboard-primary)] hover:opacity-100 hover:saturate-100",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cx(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-[var(--onboard-primary)]",
            active ? "bg-[var(--onboard-primary-soft)]" : "bg-[var(--onboard-card-soft)]",
          )}
        >
          {icon}
        </div>

        {badge ? (
          <span
            className={cx(
              "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
              active
                ? "bg-[var(--onboard-primary-soft)] text-[var(--onboard-primary)]"
                : "bg-[var(--onboard-card-soft)] text-[var(--onboard-muted)]",
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
        {title}
      </h3>

      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
        {text}
      </p>

      {children ? <div className="mt-5">{children}</div> : null}
    </button>
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
  const [phone, setPhone] = useState(ownerPhone || "");

  const [activationMode, setActivationMode] = useState(() => {
    const stored = localStorage.getItem("storvex_signupMode");
    return stored === "TRIAL" ? "TRIAL" : "PAID";
  });

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
    saveOnboardingPatch({
      intentId,
      storeName,
      ownerName,
      email: ownerEmail,
      phone: normalizePhone(phone || ownerPhone),
      signupMode: activationMode,
      planKey:
        activationMode === "PAID" && selectedPlan
          ? selectedPlan.key
          : "",
      launchPricing: Boolean(selectedPlan?.launchPricing),
      marketplaceIncluded:
        selectedPlan?.marketplaceIncluded !== false,
      passwordReady: true,
    });
  }, [
    intentId,
    storeName,
    ownerName,
    ownerEmail,
    ownerPhone,
    phone,
    activationMode,
    selectedPlan,
  ]);

  function chooseTrial() {
    setActivationMode("TRIAL");
    localStorage.setItem("storvex_signupMode", "TRIAL");
    localStorage.removeItem("storvex_planKey");

    saveOnboardingPatch({
      signupMode: "TRIAL",
      planKey: "",
      paymentReference: "",
      launchPricing: true,
      marketplaceIncluded: true,
      phone: normalizePhone(phone || ownerPhone),
      passwordReady: true,
    });
  }

  function choosePaidPlan(plan) {
    setActivationMode("PAID");
    setSelectedPlanKey(plan.key);
    localStorage.setItem("storvex_signupMode", "PAID");
    localStorage.setItem("storvex_planKey", plan.key);

    saveOnboardingPatch({
      signupMode: "PAID",
      planKey: plan.key,
      launchPricing: true,
      marketplaceIncluded: true,
      phone: normalizePhone(phone || ownerPhone),
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

    if (mode === "PAID") {
      payload.planKey = planKey;
    }

    await apiClient.post("/auth/confirm-signup", payload);

    markSignupCompleted();
    clearOnboardingSession();

    toast.success(mode === "TRIAL" ? "Trial account created. Please log in." : "Store account activated. Please log in.");
    goToLogin(nav);
  }

  async function startTrial() {
    chooseTrial();
    setLoading(true);

    try {
      await completeSignup("TRIAL");
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Trial signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendPaymentRequest() {
    if (!selectedPlan?.key) {
      toast.error("Choose a paid plan first.");
      return;
    }

    const normalizedPhone = normalizePhone(phone || ownerPhone);

    if (!isValidRwandaPhone(normalizedPhone)) {
      toast.error("Use a Rwanda phone number like 078xxxxxxx or 25078xxxxxxx.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await apiClient.post("/auth/owner-payment", {
        intentId,
        planKey: selectedPlan.key,
        phone: normalizedPhone,
      });

      const paymentReference = data?.paymentReference || data?.payment?.reference || "";

      saveOnboardingPatch({
        signupMode: "PAID",
        planKey: selectedPlan.key,
        paymentReference,
        launchPricing: true,
        marketplaceIncluded: true,
        phone: normalizedPhone,
        passwordReady: true,
      });

      await completeSignup("PAID", selectedPlan.key);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Payment request failed");
    } finally {
      setLoading(false);
    }
  }

  function alreadyPaid() {
    const normalizedPhone = normalizePhone(phone || ownerPhone);

    saveOnboardingPatch({
      signupMode: "PAID",
      planKey: selectedPlan.key,
      launchPricing: true,
      marketplaceIncluded: true,
      phone: normalizedPhone,
      passwordReady: true,
    });

    toast.success("Log in after your payment is activated.");
    goToLogin(nav);
  }

  if (booting || loadingPlans) {
    return <AuthPageSkeleton titleWidth="w-72" lines={4} showSide={false} />;
  }

  return (
    <OnboardingShell
      activeStep={3}
      title="Choose how to start."
      subtitle={`Start free for ${trialDays} days, or activate the plan that fits your store.`}
      footer={
        <p className="svx-onboard-login-note">
          Need to change security details? <Link to="/verify-otp">Back to security</Link>
        </p>
      }
    >
      <form className="svx-onboard-form">
        <div className="svx-onboard-form-heading">
          <div>
            <span className="svx-onboard-step-pill">Step 3 of 3</span>

            <h2>Start free or choose your plan.</h2>

            <p>
              Try Storvex first, or activate a paid plan with the exact
              price and capacity shown by Storvex billing.
            </p>
          </div>

          <span className="svx-onboard-safe-pill">
            <span>✓</span>
            Marketplace included
          </span>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <StartOptionCard
            active={activationMode === "TRIAL"}
            title="Start free trial"
            text={`Use Storvex for ${trialDays} days before paying. Available once per verified owner.`}
            badge="No payment today"
            icon={<SparkIcon />}
            onClick={chooseTrial}
          >
            <ul className="grid gap-2">
              <FeatureItem>{trialDays} days free</FeatureItem>
              <FeatureItem>WhatsApp customer updates included</FeatureItem>
              <FeatureItem>Marketplace profile included</FeatureItem>
            </ul>

            {activationMode === "TRIAL" ? (
              <AsyncButton
                type="button"
                loading={loading}
                loadingText="Creating account..."
                onClick={startTrial}
                className="mt-6 w-full"
              >
                Start free trial
                <span aria-hidden="true">→</span>
              </AsyncButton>
            ) : null}
          </StartOptionCard>

          <StartOptionCard
            active={activationMode === "PAID"}
            title="Choose a paid plan"
            text="Activate with the plan that matches your current team, locations and business operations."
            badge="Marketplace included"
            icon={<PriceTagIcon />}
            onClick={() => {
              if (selectedPlan) choosePaidPlan(selectedPlan);
            }}
          >
            <PlanSummary selectedPlan={selectedPlan} storeName={storeName} />

            <p className="mt-4 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
              Prices and plan capacity come directly from Storvex billing.
            </p>
          </StartOptionCard>
        </section>

        <section className="svx-onboard-card">
          <SectionHeader
            icon={<PriceTagIcon />}
            title="Storvex plans"
            text="Pick the plan that matches your team, locations and daily operations. These details come directly from Storvex billing."
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.key}
                plan={plan}
                active={
                  activationMode === "PAID" &&
                  selectedPlan?.key === plan.key
                }
                onSelect={choosePaidPlan}
              />
            ))}
          </div>
        </section>

        {activationMode === "PAID" ? (
          <section className="svx-onboard-card">
            <SectionHeader
              icon={<ShieldIcon />}
              title="Payment request"
              text="Use a Rwanda mobile money number that can receive and approve the payment request."
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-[var(--onboard-text)]">
                  MoMo phone number
                </span>

                <input
                  className="h-14 w-full rounded-[16px] border border-[var(--onboard-border)] bg-[var(--onboard-card)] px-4 text-sm font-black text-[var(--onboard-text)] outline-none transition placeholder:text-[var(--onboard-muted)] focus:border-[var(--onboard-primary)] focus:ring-4 focus:ring-[rgba(37,99,235,0.14)]"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="078xxxxxxx or 25078xxxxxxx"
                  inputMode="tel"
                />
              </label>

              <div
                className={cx(
                  "flex h-14 items-center justify-center rounded-[16px] px-4 text-sm font-black",
                  isValidRwandaPhone(phone)
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-[var(--onboard-card-soft)] text-[var(--onboard-muted)]",
                )}
              >
                {isValidRwandaPhone(phone) ? "Ready for MoMo" : "Phone needed"}
              </div>
            </div>

            <div className="mt-5">
              <PlanSummary selectedPlan={selectedPlan} storeName={storeName} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <AsyncButton
                type="button"
                loading={loading}
                loadingText="Activating account..."
                onClick={sendPaymentRequest}
                className="w-full"
              >
                Send payment request
                <span aria-hidden="true">→</span>
              </AsyncButton>

              <AsyncButton
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={alreadyPaid}
                className="w-full"
              >
                I already paid
              </AsyncButton>
            </div>
          </section>
        ) : null}
      </form>
    </OnboardingShell>
  );
}



import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function getPlanFeatures(plan) {
  const sectionItems = Array.isArray(plan?.sections)
    ? plan.sections.flatMap((section) =>
        Array.isArray(section?.items) ? section.items : [],
      )
    : [];

  const source = sectionItems.length
    ? sectionItems
    : Array.isArray(plan?.features)
      ? plan.features
      : [];

  return [...new Set(source.map(cleanString).filter(Boolean))].slice(0, 4);
}

function getPlanPosition(plan) {
  const key = cleanString(plan?.key).toUpperCase();

  if (key.includes("GROWTH")) return "growth";
  if (key.includes("BUSINESS")) return "business";

  return "starter";
}

function getPlanAudience(plan) {
  const position = getPlanPosition(plan);

  if (position === "growth") return "Best for growing stores";
  if (position === "business") return "Best for established businesses";

  return "Best for small shops";
}

function getStaffLabel(plan) {
  return (
    plan?.capacity?.staffLabel ||
    (plan?.staffLimit
      ? `Up to ${plan.staffLimit} active user${
          plan.staffLimit === 1 ? "" : "s"
        }`
      : "Custom team capacity")
  );
}

function getBranchLabel(plan) {
  return (
    plan?.capacity?.branchLabel ||
    (plan?.branchLimit
      ? `Up to ${plan.branchLimit} store location${
          plan.branchLimit === 1 ? "" : "s"
        }`
      : "Custom location capacity")
  );
}


function FullPlanOption({
  plan,
  active,
  recommended,
  onSelect,
  trialDays,
}) {
  const features = getPlanFeatures(plan);

  return (
    <article
      className={cx(
        "svx-launch-choice flex min-w-0 flex-col rounded-[20px] border p-5 transition sm:p-6",
        active
          ? "is-active border-[var(--onboard-primary)]"
          : "border-[var(--onboard-border)]",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--onboard-primary)]">
            {getPlanAudience(plan)}
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
            {plan.name}
          </h3>
        </div>

        {active ? (
          <span className="shrink-0 text-xs font-black text-[var(--onboard-primary)]">
            ✓ Selected
          </span>
        ) : recommended ? (
          <span className="shrink-0 text-xs font-black text-[var(--onboard-primary)]">
            Recommended
          </span>
        ) : null}
      </div>

      <p className="mt-4 min-h-[48px] text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
        {plan.shortDescription}
      </p>

      <div className="mt-5 border-y border-[var(--onboard-border)] py-5">
        <p className="text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
          {formatMoney(plan.price, plan.currency)}
        </p>

        <p className="mt-1 text-xs font-bold text-[var(--onboard-muted)]">
          per {plan.cycleLabel?.toLowerCase() || "month"} after the {trialDays}-day trial
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm font-bold text-[var(--onboard-text)]">
        <p>✓ {getStaffLabel(plan)}</p>
        <p>✓ {getBranchLabel(plan)}</p>
        <p>
          ✓{" "}
          {plan.marketplaceIncluded !== false
            ? "Marketplace included"
            : "Marketplace not included"}
        </p>
      </div>

      <div className="mt-6">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--onboard-muted)]">
          Key differences
        </p>

        <ul className="mt-3 grid gap-2.5">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-[var(--onboard-muted)]"
            >
              <span
                className="mt-0.5 text-[var(--onboard-primary)]"
                aria-hidden="true"
              >
                ✓
              </span>

              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => onSelect(plan)}
        disabled={active}
        className={cx(
          "mt-auto min-h-12 rounded-[14px] border px-5 pt-0 text-sm font-black transition disabled:cursor-default",
          active
            ? "mt-7 border-[var(--onboard-primary)] bg-transparent text-[var(--onboard-primary)]"
            : "mt-7 border-[var(--onboard-primary)] bg-[var(--onboard-primary)] text-white hover:opacity-90",
        )}
      >
        {active ? `${plan.name} selected` : `Choose ${plan.name}`}
      </button>

      <p className="mt-3 text-center text-[10px] font-bold text-[var(--onboard-muted)]">
        No payment today
      </p>
    </article>
  );
}

function SelectedPlanPanel({
  selectedPlan,
  storeName,
  trialDays,
  loading,
  onStartTrial,
  onChangePlan,
  onBackToAccount,
  selectedEarlier,
}) {
  if (!selectedPlan) {
    return (
      <section className="svx-launch-plan-panel rounded-[24px] border border-[var(--onboard-border)] p-5 sm:p-7 lg:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
          Choose your plan
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)] sm:text-4xl">
          Select what fits your store today.
        </h2>

        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)] sm:text-base">
          Compare your team size, store locations and key features below.
          Every plan starts with a {trialDays}-day free trial, and there is no
          payment today. Your trial starts with the plan you choose here.
        </p>

        <div className="mt-7 flex flex-col gap-3 border-t border-[var(--onboard-border)] pt-6 sm:flex-row">
          <button
            type="button"
            onClick={onBackToAccount}
            className="svx-onboard-back-action"
          >
            <span aria-hidden="true">←</span>
            Back to account setup
          </button>

          <button
            type="button"
            disabled
            className="min-h-12 rounded-[14px] border border-[var(--onboard-border)] px-5 text-sm font-black text-[var(--onboard-muted)] opacity-60"
          >
            Choose a plan to continue
          </button>
        </div>
      </section>
    );
  }

  const features = getPlanFeatures(selectedPlan);

  const planLabel = selectedEarlier
    ? "Your selected plan"
    : "Your selected plan";

  return (
    <section className="svx-launch-plan-panel rounded-[24px] border border-[var(--onboard-border)] p-5 sm:p-7 lg:p-8">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
            {planLabel}
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)] sm:text-4xl">
            {selectedPlan.name}
          </h2>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)] sm:text-base">
            {selectedPlan.shortDescription}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="svx-launch-plan-detail rounded-[16px] border border-[var(--onboard-border)] px-4 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
                Team
              </p>

              <p className="mt-2 text-sm font-black leading-5 text-[var(--onboard-text)]">
                {getStaffLabel(selectedPlan)}
              </p>
            </div>

            <div className="svx-launch-plan-detail rounded-[16px] border border-[var(--onboard-border)] px-4 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
                Locations
              </p>

              <p className="mt-2 text-sm font-black leading-5 text-[var(--onboard-text)]">
                {getBranchLabel(selectedPlan)}
              </p>
            </div>

            <div className="svx-launch-plan-detail rounded-[16px] border border-[var(--onboard-border)] px-4 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
                Marketplace
              </p>

              <p className="mt-2 text-sm font-black leading-5 text-[var(--onboard-text)]">
                {selectedPlan.marketplaceIncluded !== false
                  ? "Included"
                  : "Not included"}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-[var(--onboard-border)] pt-6">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
              Key differences
            </p>

            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--onboard-text)]"
                >
                  <span
                    className="text-[var(--onboard-primary)]"
                    aria-hidden="true"
                  >
                    ✓
                  </span>

                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="svx-launch-plan-detail rounded-[20px] border border-[var(--onboard-border)] p-5 sm:p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
            Your final choice
          </p>

          <p className="mt-3 truncate text-sm font-black text-[var(--onboard-text)]">
            {storeName || "Your store"}
          </p>

          <div className="mt-5 border-y border-[var(--onboard-border)] py-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
              First {trialDays} days
            </p>

            <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
              Free
            </p>

            <p className="mt-1 text-xs font-bold text-[var(--onboard-muted)]">
              No payment today
            </p>
          </div>

          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-muted)]">
              After the trial
            </p>

            <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
              {formatMoney(selectedPlan.price, selectedPlan.currency)}
            </p>

            <p className="mt-1 text-xs font-bold text-[var(--onboard-muted)]">
              per {selectedPlan.cycleLabel?.toLowerCase() || "month"}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-[var(--onboard-border)] pt-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="svx-launch-primary-actions">
          <button
            type="button"
            onClick={onBackToAccount}
            disabled={loading}
            className="svx-onboard-back-action"
          >
            <span aria-hidden="true">←</span>
            Back to account setup
          </button>

          <AsyncButton
            type="button"
            loading={loading}
            loadingText="Creating your store..."
            onClick={onStartTrial}
            className="w-full sm:w-auto sm:min-w-[240px]"
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

        <div className="max-w-md text-xs font-bold leading-5 text-[var(--onboard-muted)] lg:text-right">
          <p>
            The trial begins only after you press the final button.
          </p>

          <p className="mt-1 text-[var(--onboard-text)]">
            Your free trial starts with the plan you choose here. No payment is
            taken today.
          </p>
        </div>
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

  const explicitPlanSelection = useMemo(
    () =>
      onboarding?.planSelectionExplicit === true ||
      localStorage.getItem("storvex_planSelectionExplicit") === "true",
    [onboarding?.planSelectionExplicit],
  );

  const initialSelectedPlanKey = explicitPlanSelection
    ? originallySelectedPlanKey
    : "";

  const [selectedPlanKey, setSelectedPlanKey] = useState(
    initialSelectedPlanKey,
  );

  const [showPlanChoices, setShowPlanChoices] = useState(
    !initialSelectedPlanKey,
  );

  const confirmationRef = useRef(null);

  const selectedPlan = useMemo(
    () => findSubscriptionPlan(plans, selectedPlanKey),
    [plans, selectedPlanKey],
  );

  const recommendedPlan = useMemo(
    () => pickRecommendedPlan(plans),
    [plans],
  );

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

        const storedSelectionIsExplicit =
          localStorage.getItem("storvex_planSelectionExplicit") ===
          "true";

        const initialPlan = storedSelectionIsExplicit
          ? findSubscriptionPlan(nextPlans, storedKey)
          : null;

        if (initialPlan) {
          setSelectedPlanKey(initialPlan.key);
          setShowPlanChoices(false);
        } else {
          setSelectedPlanKey("");
          setShowPlanChoices(true);
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
    if (!selectedPlanKey || !selectedPlan?.key) return;

    localStorage.setItem("storvex_signupMode", "TRIAL");
    localStorage.setItem("storvex_planKey", selectedPlan.key);
    localStorage.setItem("storvex_planSelectionExplicit", "true");
    localStorage.setItem(
      "storvex_planSelectionSource",
      onboarding?.planSelectionSource || "ONBOARDING",
    );

    saveOnboardingPatch({
      intentId,
      storeName,
      ownerName,
      email: ownerEmail,
      phone: normalizePhone(ownerPhone),
      signupMode: "TRIAL",
      planKey: selectedPlan.key,
      planSelectionExplicit: true,
      planSelectionSource:
        onboarding?.planSelectionSource || "ONBOARDING",
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
    localStorage.setItem("storvex_planSelectionExplicit", "true");
    localStorage.setItem("storvex_planSelectionSource", "ONBOARDING");

    saveOnboardingPatch({
      signupMode: "TRIAL",
      planKey: plan.key,
      planSelectionExplicit: true,
      planSelectionSource: "ONBOARDING",
      paymentReference: "",
      launchPricing: Boolean(plan.launchPricing),
      marketplaceIncluded:
        plan.marketplaceIncluded !== false,
      phone: normalizePhone(ownerPhone),
      passwordReady: true,
    });

    window.setTimeout(() => {
      confirmationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
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
      subtitle="Review your plan and start your free trial."
      footer={
        <p className="svx-onboard-login-note">
          Your business and account details remain saved until setup is complete.
        </p>
      }
    >
      <form
        className="svx-onboard-form mx-auto w-full max-w-[1180px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <div ref={confirmationRef} className="scroll-mt-6">
          <SelectedPlanPanel
            selectedPlan={selectedPlan}
          storeName={storeName}
          trialDays={trialDays}
          loading={loading}
          onStartTrial={startTrial}
          onBackToAccount={() => nav("/verify-otp")}
          onChangePlan={() =>
            setShowPlanChoices((current) => !current)
          }
            selectedEarlier={Boolean(
              originallySelectedPlanKey &&
                selectedPlan?.key?.toUpperCase() ===
                  originallySelectedPlanKey,
            )}
          />
        </div>

        {showPlanChoices ? (
          <section className="svx-launch-plan-selector mt-6 rounded-[24px] border border-[var(--onboard-border)] p-5 sm:p-7">
            <div className="flex flex-col gap-4 border-b border-[var(--onboard-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
                  {selectedPlan ? "Change plan" : "Choose a plan"}
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
                  {selectedPlan
                    ? "Select another plan"
                    : "Choose the right plan for your store"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                  Compare the complete plan details, then choose the plan that
                  fits your store. Choosing a plan does not start the trial.
                </p>
              </div>

              {selectedPlan ? (
                <button
                  type="button"
                  onClick={() => setShowPlanChoices(false)}
                  className="h-10 self-start rounded-[12px] border border-[var(--onboard-border)] px-4 text-xs font-black text-[var(--onboard-text)] transition hover:border-[var(--onboard-primary)] hover:text-[var(--onboard-primary)] sm:self-auto"
                >
                  Close
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-3">
              {plans.map((plan) => (
                <FullPlanOption
                  key={plan.key}
                  plan={plan}
                  active={selectedPlan?.key === plan.key}
                  recommended={recommendedPlan?.key === plan.key}
                  onSelect={choosePlan}
                  trialDays={trialDays}
                />
              ))}
            </div>

            <p className="mt-5 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
              Selecting another plan updates your final choice above. Your free
              trial does not begin until you confirm the selected plan.
            </p>
          </section>
        ) : null}
      </form>
    </OnboardingShell>
  );

}

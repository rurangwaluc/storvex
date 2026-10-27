import { persistAuthSession } from "../auth/Login";
import { queryClient } from "../../lib/queryClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useTheme } from "../../theme/ThemeProvider";
import "./BusinessSetupPremium.css";
import "./OwnerPaymentPremium.css";
import "./OwnerPaymentBrand.css";
import {
  readOnboardingState,
  saveOnboardingState,
} from "../../components/onboarding/onboardingStorage";
import AsyncButton from "../../components/ui/AsyncButton";
import AuthPageSkeleton from "../../components/ui/AuthPageSkeleton";
import apiClient from "../../services/apiClient";
import "./OwnerPaymentReference.css";
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
        "svx-launch-choice svx-reference-plan",
        recommended && "is-recommended",
        active && "is-active",
      )}
    >
      {recommended ? (
        <span className="svx-reference-plan__recommended">
          Recommended
        </span>
      ) : null}

      <div className="svx-reference-plan__top">
        <p className="svx-reference-plan__audience">
          {getPlanAudience(plan)}
        </p>

        <h3>{plan.name}</h3>

        {active ? (
          <span className="svx-reference-plan__selected">
            <span aria-hidden="true">✓</span>
            Selected plan
          </span>
        ) : null}

        <p className="svx-reference-plan__description">
          {plan.shortDescription}
        </p>

        <div className="svx-reference-plan__price">
          <strong>{formatMoney(plan.price, plan.currency)}</strong>
          <span>
            per {plan.cycleLabel?.toLowerCase() || "month"} after
            the {trialDays}-day trial
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelect(plan)}
          disabled={active}
          className="svx-reference-plan__button"
        >
          {active
            ? `${plan.name} selected`
            : recommended
              ? `Continue with ${plan.name}`
              : `Choose ${plan.name}`}
        </button>
      </div>

      <div className="svx-reference-plan__bottom">
        <p className="svx-reference-plan__section-label">
          PLAN INCLUDES
        </p>

        <ul className="svx-reference-plan__features">
          <li>
            <span aria-hidden="true">✓</span>
            <span>{getStaffLabel(plan)}</span>
          </li>
          <li>
            <span aria-hidden="true">✓</span>
            <span>{getBranchLabel(plan)}</span>
          </li>
          <li>
            <span aria-hidden="true">✓</span>
            <span>
              {plan.marketplaceIncluded !== false
                ? "Marketplace included"
                : "Marketplace not included"}
            </span>
          </li>
        </ul>

        <p className="svx-reference-plan__section-label svx-reference-plan__section-label--more">
          KEY DIFFERENCES
        </p>

        <ul className="svx-reference-plan__features">
          {features.map((feature) => (
            <li key={feature}>
              <span aria-hidden="true">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <p className="svx-reference-plan__footnote">
          No payment today
        </p>
      </div>
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
}) {
  if (!selectedPlan) {
    return (
      <section className="svx-launch-plan-panel rounded-[24px] border border-[var(--onboard-border)] p-5 sm:p-7 lg:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
          Choose your plan
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)] sm:text-4xl">
          Select the plan that fits your store.
        </h2>

        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)] sm:text-base">
          Compare the plans below, then start your selected plan free for{" "}
          {trialDays} days.
        </p>

        <div className="mt-7 border-t border-[var(--onboard-border)] pt-6">
          <button
            type="button"
            onClick={onBackToAccount}
            className="svx-onboard-back-action"
          >
            <span aria-hidden="true">←</span>
            Back to verification
          </button>
        </div>
      </section>
    );
  }

  const features = getPlanFeatures(selectedPlan);
  const storeLabel = cleanString(storeName) || "your store";

  return (
    <section className="svx-launch-plan-panel rounded-[24px] border border-[var(--onboard-border)] p-5 sm:p-7 lg:p-8">
      <div className="flex flex-col gap-5 border-b border-[var(--onboard-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
            Selected plan
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)] sm:text-4xl">
            {selectedPlan.name}
          </h2>

          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
            {selectedPlan.shortDescription}
          </p>
        </div>

        <button
          type="button"
          onClick={onChangePlan}
          className="h-10 shrink-0 self-start rounded-[12px] border border-[var(--onboard-border)] px-4 text-xs font-black text-[var(--onboard-text)] transition hover:border-[var(--onboard-primary)] hover:text-[var(--onboard-primary)]"
        >
          Change plan
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="svx-launch-plan-detail rounded-[16px] border border-[var(--onboard-border)] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--onboard-muted)]">
            Team
          </p>
          <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
            {getStaffLabel(selectedPlan)}
          </p>
        </div>

        <div className="svx-launch-plan-detail rounded-[16px] border border-[var(--onboard-border)] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--onboard-muted)]">
            Locations
          </p>
          <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
            {getBranchLabel(selectedPlan)}
          </p>
        </div>

        <div className="svx-launch-plan-detail rounded-[16px] border border-[var(--onboard-border)] p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--onboard-muted)]">
            Marketplace
          </p>
          <p className="mt-2 text-sm font-black text-[var(--onboard-text)]">
            {selectedPlan.marketplaceIncluded !== false
              ? "Included"
              : "Not included"}
          </p>
        </div>
      </div>

      {features.length ? (
        <div className="mt-6 border-y border-[var(--onboard-border)] py-6">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--onboard-muted)]">
            Included in this plan
          </p>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm font-bold leading-6 text-[var(--onboard-text)]"
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
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--onboard-primary)]">
            Your trial is ready
          </p>

          <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)] sm:text-3xl">
            Start {storeLabel} on {selectedPlan.name} free for {trialDays} days.
          </h3>

          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
            Use the {selectedPlan.name} features immediately. No payment is
            required today, and you can choose or pay for another plan later
            from Billing.
          </p>

          <div className="mt-5 grid gap-3 text-sm font-bold text-[var(--onboard-text)] sm:grid-cols-2">
            <p className="flex items-start gap-3">
              <span
                className="text-[var(--onboard-primary)]"
                aria-hidden="true"
              >
                ✓
              </span>
              No payment today
            </p>

            <p className="flex items-start gap-3">
              <span
                className="text-[var(--onboard-primary)]"
                aria-hidden="true"
              >
                ✓
              </span>
              Your store opens immediately
            </p>

            <p className="flex items-start gap-3">
              <span
                className="text-[var(--onboard-primary)]"
                aria-hidden="true"
              >
                ✓
              </span>
              Trial uses your selected plan
            </p>

            <p className="flex items-start gap-3">
              <span
                className="text-[var(--onboard-primary)]"
                aria-hidden="true"
              >
                ✓
              </span>
              Change or pay later in Billing
            </p>
          </div>
        </div>

        <div className="svx-launch-plan-detail rounded-[20px] border border-[var(--onboard-border)] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--onboard-primary)]">
            Start free
          </p>

          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--onboard-text)]">
            {trialDays}-day trial
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
            Pay nothing until you decide to continue.
          </p>

          <AsyncButton
            type="button"
            onClick={onStartTrial}
            loading={loading}
            disabled={loading}
            className="mt-6 min-h-12 w-full rounded-[14px] border border-[var(--onboard-primary)] bg-[var(--onboard-primary)] px-5 text-sm font-black text-white transition hover:opacity-90"
          >
            Start my {trialDays}-day {selectedPlan.name} trial
          </AsyncButton>

          <p className="mt-3 text-center text-xs font-bold text-[var(--onboard-muted)]">
            No payment request will be sent.
          </p>
        </div>
      </div>

      <div className="mt-7 border-t border-[var(--onboard-border)] pt-6">
        <button
          type="button"
          onClick={onBackToAccount}
          className="svx-onboard-back-action"
        >
          <span aria-hidden="true">←</span>
          Back to verification
        </button>
      </div>
    </section>
  );
}

export default function OwnerPayment() {
  const nav = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
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

  /* STEP 147 — VERIFIED PASSWORDLESS PLAN ACCESS */
  const isPasswordlessBusiness = onboarding?.accountBusinessIntent === true;

  const [passwordlessAccess, setPasswordlessAccess] = useState(
    isPasswordlessBusiness ? "checking" : "legacy"
  );

  useEffect(() => {
    if (!isPasswordlessBusiness) return undefined;

    let cancelled = false;

    async function verifyAccess() {
      try {
        const accountResponse = await fetch("/api/auth/account/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!accountResponse.ok) {
          throw new Error("Your Storvex account session has ended.");
        }

        const accountData = await accountResponse.json();
        const account = accountData?.account;

        if (
          !account?.accountId ||
          account.emailVerified !== true ||
          String(account.email || "").trim().toLowerCase() !==
            String(ownerEmail || "").trim().toLowerCase()
        ) {
          throw new Error("Your verified Storvex account is required.");
        }

        const intentToken = onboarding?.onboardingToken;

        if (!intentId || !intentToken) {
          throw new Error("Your secure business setup session is missing.");
        }

        const statusResponse = await fetch(
          `/api/auth/signup/owner-intent/${encodeURIComponent(intentId)}/status`,
          {
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "x-storvex-onboarding-token": intentToken,
            },
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Business verification could not be confirmed.");
        }

        const status = await statusResponse.json();

        if (
          status.emailVerified !== true ||
          status.phoneVerified !== true
        ) {
          throw new Error("Complete business verification first.");
        }

        if (!cancelled) setPasswordlessAccess("verified");
      } catch {
        if (!cancelled) setPasswordlessAccess("denied");
      }
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [
    isPasswordlessBusiness,
    intentId,
    ownerEmail,
    onboarding?.onboardingToken,
  ]);

  const [booting, setBooting] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(30);
  const [paymentPhone, setPaymentPhone] = useState(
    normalizePhone(ownerPhone),
  );
  const [paymentReference, setPaymentReference] = useState(
    onboarding?.paymentReference ||
      localStorage.getItem("storvex_paymentReference") ||
      "",
  );
  const [paymentStage, setPaymentStage] = useState(
    paymentReference ? "PENDING" : "IDLE",
  );

  const paymentPollingRef = useRef(null);
  const paidSignupFinalizingRef = useRef(false);

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
        const { data } = await apiClient.get(
          `/auth/signup/owner-intent/${encodeURIComponent(
            intentId,
          )}/plans`,
        );

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
          setShowPlanChoices(true);
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

    if (intentId) {
      loadPlans();
    }

    return () => {
      cancelled = true;
    };
  }, [intentId]);

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

    if (isPasswordlessBusiness && passwordlessAccess === "checking") {
      return;
    }

    const verificationReady = isPasswordlessBusiness
      ? passwordlessAccess === "verified"
      : emailVerified && phoneVerified && passwordReady;

    if (!verificationReady) {
      toast.error(
        isPasswordlessBusiness
          ? "Your verified account and business contact are required."
          : "Secure your account first."
      );
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
    isPasswordlessBusiness,
    passwordlessAccess,
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

    if (paymentPollingRef.current) {
      window.clearInterval(paymentPollingRef.current);
      paymentPollingRef.current = null;
    }

    setPaymentReference("");
    setPaymentStage("IDLE");
    paidSignupFinalizingRef.current = false;

    localStorage.removeItem("storvex_paymentReference");

    setSelectedPlanKey(plan.key);
    setShowPlanChoices(true);
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
    const password = isPasswordlessBusiness
      ? null
      : readPasswordDraft();

    if (!isPasswordlessBusiness && !password) {
      toast.error("Password is missing. Secure your account again.");
      nav("/verify-otp", { replace: true });
      return;
    }

    const payload = {
      intentId,
      mode,
      ...(password ? { password } : {}),
    };

    if (planKey) {
      payload.planKey = planKey;
    }

    if (isPasswordlessBusiness) {
      // Preserve both independently verified account and business
      // onboarding credentials. The server validates both.
      const intentToken = onboarding?.onboardingToken;

      if (!intentId || !intentToken) {
        throw new Error(
          "Your business setup session has expired. Please sign in again."
        );
      }

      const response = await fetch("/api/auth/account/business/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-storvex-onboarding-token": intentToken,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "We could not complete your business setup.",
        );
      }

      if (!result?.token || !result?.user?.tenantId) {
        throw new Error(
          "Your store was activated, but automatic sign-in could not be completed."
        );
      }

      queryClient.clear();
      persistAuthSession(result);
    } else {
      // Preserve the original password-based signup flow.
      const response = await apiClient.post("/auth/confirm-signup", payload);

      if (!response?.data?.token || !response?.data?.user?.tenantId) {
        throw new Error(
          "Your store was activated, but automatic sign-in could not be completed."
        );
      }

      queryClient.clear();
      persistAuthSession(response.data);
    }

    markSignupCompleted();
    clearOnboardingSession();

    toast.success(
      mode === "TRIAL"
        ? `${trialDays}-day free trial started. Welcome to Storvex!`
        : "Your store is ready. Welcome to Storvex!",
    );

    nav("/app", { replace: true });
  }

  async function finalizePaidSignup(planKey) {
    if (paidSignupFinalizingRef.current) return;

    paidSignupFinalizingRef.current = true;
    setPaymentStage("SUCCESS");
    setLoading(true);

    if (paymentPollingRef.current) {
      window.clearInterval(paymentPollingRef.current);
      paymentPollingRef.current = null;
    }

    try {
      await completeSignup("PAID", planKey);
    } catch (error) {
      paidSignupFinalizingRef.current = false;
      setPaymentStage("PENDING");

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Payment was confirmed, but store activation failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkPaidSignupPayment(
    reference = paymentReference,
    planKey = selectedPlan?.key,
  ) {
    const cleanReference = cleanString(reference);

    if (!cleanReference || !intentId) return false;

    try {
      const { data } = await apiClient.get(
        `/auth/owner-payment/${encodeURIComponent(
          cleanReference,
        )}/status`,
        {
          params: {
            intentId,
          },
        },
      );

      const status = cleanString(
        data?.payment?.status,
      ).toUpperCase();

      if (status === "SUCCESS") {
        await finalizePaidSignup(
          data?.payment?.planKey || planKey,
        );

        return true;
      }

      if (
        status === "FAILED" ||
        status === "CANCELLED" ||
        status === "REJECTED"
      ) {
        if (paymentPollingRef.current) {
          window.clearInterval(paymentPollingRef.current);
          paymentPollingRef.current = null;
        }

        setPaymentStage("FAILED");
        return false;
      }

      setPaymentStage("PENDING");
      return false;
    } catch (error) {
      if (error?.response?.status === 404) {
        setPaymentStage("FAILED");
      }

      return false;
    }
  }

  function beginPaymentPolling(reference, planKey) {
    if (paymentPollingRef.current) {
      window.clearInterval(paymentPollingRef.current);
    }

    paymentPollingRef.current = window.setInterval(() => {
      checkPaidSignupPayment(reference, planKey);
    }, 3000);
  }

  async function startPaidActivation() {
    if (!selectedPlan?.key) {
      toast.error("Choose a Storvex plan first.");
      return;
    }

    const normalizedPaymentPhone = normalizePhone(paymentPhone);

    if (!/^2507\d{8}$/.test(normalizedPaymentPhone)) {
      toast.error(
        "Use a Rwanda phone number like 078xxxxxxx or 25078xxxxxxx.",
      );

      return;
    }

    setPaymentStage("SENDING");

    localStorage.setItem("storvex_signupMode", "PAID");
    localStorage.setItem("storvex_planKey", selectedPlan.key);

    saveOnboardingPatch({
      signupMode: "PAID",
      planKey: selectedPlan.key,
      phone: normalizePhone(ownerPhone),
      paymentReference: "",
      passwordReady: true,
    });

    try {
      const { data } = await apiClient.post(
        "/auth/owner-payment",
        {
          intentId,
          planKey: selectedPlan.key,
          phone: normalizedPaymentPhone,
        },
      );

      const reference =
        data?.paymentReference ||
        data?.payment?.reference ||
        "";

      if (!reference) {
        throw new Error(
          "The payment request did not return a reference.",
        );
      }

      setPaymentPhone(normalizedPaymentPhone);
      setPaymentReference(reference);

      localStorage.setItem(
        "storvex_paymentReference",
        reference,
      );

      saveOnboardingPatch({
        signupMode: "PAID",
        planKey: selectedPlan.key,
        paymentReference: reference,
      });

      const returnedStatus = cleanString(
        data?.payment?.status,
      ).toUpperCase();

      if (returnedStatus === "SUCCESS") {
        await finalizePaidSignup(selectedPlan.key);
        return;
      }

      setPaymentStage("PENDING");

      toast.success(
        "MoMo request sent. Confirm the payment on your phone.",
      );

      beginPaymentPolling(
        reference,
        selectedPlan.key,
      );
    } catch (error) {
      setPaymentStage("FAILED");

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "We could not start the payment. Please try again.",
      );
    }
  }

  useEffect(() => {
    if (
      !paymentReference ||
      !selectedPlan?.key ||
      paymentStage !== "PENDING"
    ) {
      return undefined;
    }

    checkPaidSignupPayment(
      paymentReference,
      selectedPlan.key,
    );

    beginPaymentPolling(
      paymentReference,
      selectedPlan.key,
    );

    return () => {
      if (paymentPollingRef.current) {
        window.clearInterval(paymentPollingRef.current);
        paymentPollingRef.current = null;
      }
    };
  }, [
    paymentReference,
    selectedPlan?.key,
    paymentStage,
  ]);

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
    <div className={cx(
          "storvex-onboarding svx-business-premium svx-plan-premium",
          resolvedTheme === "dark" && "svx-plan-is-dark",
        )}>
      <div className="svx-plan-premium__shell">

        <header className="svx-business-premium__header">
          <button
            type="button"
            className="svx-business-premium__logo"
            onClick={() => nav("/")}
            aria-label="Storvex homepage"
          >
            <img src="/storvex-header-tricolor.png" alt="Storvex" />
          </button>

          <div className="svx-business-premium__header-actions">
            <button
              type="button"
              className="svx-business-premium__theme"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
            >
              {resolvedTheme === "dark" ? "☀" : "☾"}
            </button>

            <button
              type="button"
              className="svx-business-premium__help"
              onClick={() => nav("/contact")}
            >
              Need help?
            </button>

            <button
              type="button"
              className="svx-business-premium__exit"
              onClick={() => nav("/login")}
            >
              Exit setup
            </button>
          </div>
        </header>

        <main className="svx-plan-premium__body">
          <div className="svx-plan-premium__top">
            <div className="svx-plan-premium__intro">
              <span className="svx-business-premium__eyebrow">
                CHOOSE YOUR PLAN · STEP 3 OF 3
              </span>

              <h1>Choose how your store grows.</h1>
              <p>
                Find the right plan for your business.
                Your trial starts only when you confirm.
              </p>
            </div>

            <div
              className="svx-plan-premium__progress"
              aria-label="Onboarding progress"
            >
              <div className="is-done">
                <span aria-hidden="true">✓</span>
                <strong>Business details</strong>
              </div>
              <i aria-hidden="true" />
              <div className="is-done">
                <span aria-hidden="true">✓</span>
                <strong>Verification</strong>
              </div>
              <i aria-hidden="true" />
              <div className="is-active" aria-current="step">
                <span>3</span>
                <strong>Choose plan</strong>
              </div>
            </div>
          </div>

<form
        className="svx-onboard-form mx-auto w-full max-w-[1180px]"
        onSubmit={(event) => event.preventDefault()}
      >
          <section className="svx-launch-plan-selector svx-launch-plan-selector--premium mt-6">
            <div className="svx-plan-premium__compare-actions">
              <p>
                Select the plan that fits your store.
                Your trial starts only when you confirm.
              </p>

              <button
                type="button"
                onClick={() => nav("/verify-otp")}
                className="svx-onboard-back-action"
              >
                <span aria-hidden="true">←</span>
                Back to verification
              </button>
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

        {selectedPlan ? (
          <section
            ref={confirmationRef}
            className="svx-plan-premium__confirmation"
            aria-label="Confirm your selected plan"
          >
            <div className="svx-plan-premium__confirmation-details">
              <p className="svx-plan-premium__confirmation-eyebrow">
                YOUR SELECTED PLAN
              </p>

              <h2>{selectedPlan.name}</h2>

              <p>
                Enjoy your selected plan free for {trialDays} days.
                After the trial, continue with this plan for{" "}
                <strong>
                  {formatMoney(
                    selectedPlan.price,
                    selectedPlan.currency,
                  )}
                </strong>{" "}
                per {selectedPlan.cycleLabel?.toLowerCase() || "month"},
                or choose another paid plan.
              </p>

              <div
                className="svx-plan-premium__operator-disclosure"
                role="note"
              >
                <strong>Storvex is operated by RURAXIS LTD</strong>
                <p>
                  RURAXIS LTD is the legal business responsible for
                  Storvex subscriptions and payments.
                </p>
              </div>

              <span className="svx-plan-premium__confirmation-assurance">
                No payment required to start.
                No automatic charge after the trial.
              </span>
            </div>

            <div className="svx-plan-premium__confirmation-action">
              <button
                type="button"
                onClick={startTrial}
                disabled={loading}
                className="svx-plan-premium__trial-button"
              >
                {loading
                  ? "Starting your trial..."
                  : `Start my ${trialDays}-day free trial`}
              </button>

              <small>
                Your trial starts only when you click this button.
              </small>
            </div>
          </section>
        ) : null}


      </form>
        </main>
      </div>
    </div>
  );

}

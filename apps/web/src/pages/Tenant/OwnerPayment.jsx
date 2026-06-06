import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import PublicLayout from "../../components/layout/PublicLayout";
import AsyncButton from "../../components/ui/AsyncButton";
import AuthPageSkeleton from "../../components/ui/AuthPageSkeleton";
import apiClient from "../../services/apiClient";

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

  if (typeof next.phone === "string") {
    localStorage.setItem("storvex_ownerPhone", next.phone || "");
  }

  if (typeof next.email === "string") {
    localStorage.setItem("storvex_ownerEmail", next.email || "");
  }

  if (typeof next.planKey === "string") {
    localStorage.setItem("storvex_planKey", next.planKey || "");
  }

  if (typeof next.signupMode === "string") {
    localStorage.setItem("storvex_signupMode", next.signupMode || "");
  }
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
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

function formatMoney(amount, currency) {
  const n = Number(amount);
  const c = currency || "RWF";

  if (!Number.isFinite(n)) return String(amount || "—");

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n))} ${c}`;
}

function inferSegment(label = "") {
  const text = String(label).toLowerCase();

  if (text.includes("enterprise")) return "ENTERPRISE";
  if (text.includes("solo")) return "SOLO";
  if (text.includes("duo")) return "DUO";
  if (text.includes("team 3")) return "TEAM_3";
  if (text.includes("team 4")) return "TEAM_4";
  if (text.includes("team 5")) return "TEAM_5";
  if (text.includes("team 10")) return "TEAM_10";

  return "OTHER";
}

function inferCycle(label = "", days = 0) {
  const text = String(label).toLowerCase();
  const d = Number(days || 0);

  if (text.includes("1 year") || text.includes("year") || d >= 360) {
    return "YEARLY";
  }

  if (text.includes("6 months") || text.includes("6 month") || d >= 175) {
    return "HALF_YEAR";
  }

  if (text.includes("3 months") || text.includes("3 month") || d >= 85) {
    return "QUARTERLY";
  }

  return "MONTHLY";
}

function cycleLabel(cycle) {
  if (cycle === "MONTHLY") return "Monthly";
  if (cycle === "QUARTERLY") return "3 months";
  if (cycle === "HALF_YEAR") return "6 months";
  if (cycle === "YEARLY") return "1 year";
  return "Other";
}

function segmentLabel(segment) {
  if (segment === "SOLO") return "Solo";
  if (segment === "DUO") return "Duo";
  if (segment === "TEAM_3") return "Team 3";
  if (segment === "TEAM_4") return "Team 4";
  if (segment === "TEAM_5") return "Team 5";
  if (segment === "TEAM_10") return "Team 10";
  return "Other";
}

function getSegmentDescription(segment) {
  if (segment === "SOLO") return "One person starting clean operations.";
  if (segment === "DUO") return "Two users sharing daily store work.";
  if (segment === "TEAM_3") return "Small team with clearer responsibility.";
  if (segment === "TEAM_4") return "Growing store with role separation.";
  if (segment === "TEAM_5") return "More staff and wider daily coverage.";
  if (segment === "TEAM_10") return "Busier stores with more operators.";

  return "Choose what matches your current store size.";
}

function getCycleRecommendation(cycle) {
  if (cycle === "HALF_YEAR") return "Best value for many growing stores.";
  if (cycle === "YEARLY") return "Best long-term value.";
  if (cycle === "QUARTERLY") return "Balanced commitment.";
  return "Lowest upfront commitment.";
}

function groupPlans(plans) {
  const standard = [];
  let enterprise = null;

  for (const plan of plans) {
    const segment = inferSegment(plan.label);
    const cycle = inferCycle(plan.label, plan.days);

    const enriched = {
      ...plan,
      segment,
      cycle,
      isEnterprise: segment === "ENTERPRISE",
    };

    if (enriched.isEnterprise) {
      enterprise = enriched;
    } else {
      standard.push(enriched);
    }
  }

  const segments = Array.from(new Set(standard.map((plan) => plan.segment))).filter(Boolean);

  const cycles = ["MONTHLY", "QUARTERLY", "HALF_YEAR", "YEARLY"].filter((cycle) =>
    standard.some((plan) => plan.cycle === cycle),
  );

  return {
    standard,
    enterprise,
    segments,
    cycles,
  };
}

function findRecommendedPlan(plans) {
  if (!plans.length) return null;

  const preferred = plans.find(
    (plan) => plan.segment === "DUO" && plan.cycle === "HALF_YEAR",
  );

  if (preferred) return preferred;

  const fallback = plans.find(
    (plan) => plan.segment === "DUO" && plan.cycle === "QUARTERLY",
  );

  return fallback || plans[0];
}

function cardClass(active) {
  return active
    ? "border-transparent bg-[var(--color-primary)] text-white shadow-[var(--shadow-card)]"
    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-2)]";
}

function chipClass(active) {
  return active
    ? "border-transparent bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]"
    : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] shadow-[var(--shadow-soft)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function surfaceCard() {
  return "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5";
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
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-card)] text-[var(--color-text-muted)]",
        )}
      >
        {done ? "✓" : number}
      </div>

      <div className="text-sm font-black text-[var(--color-text)]">{label}</div>
    </div>
  );
}

function SectionHeader({ step, title, text }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
        {step}
      </p>
      <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
        {title}
      </h2>
      {text ? (
        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
          {text}
        </p>
      ) : null}
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

  const emailVerified =
    onboarding?.emailVerified ?? localStorage.getItem("storvex_emailVerified") === "true";

  const phoneVerified =
    onboarding?.phoneVerified ?? localStorage.getItem("storvex_phoneVerified") === "true";

  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plans, setPlans] = useState([]);
  const [phone, setPhone] = useState(ownerPhone || "");

  const [activationMode, setActivationMode] = useState(
    localStorage.getItem("storvex_signupMode") === "TRIAL" ? "TRIAL" : "PAID",
  );

  const [selectedSegment, setSelectedSegment] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");
  const [selectedPlanKey, setSelectedPlanKey] = useState(
    localStorage.getItem("storvex_planKey") || "",
  );

  useEffect(() => {
    if (!intentId || !storeName) {
      toast.error("Missing setup info. Please start again.");
      nav("/signup", { replace: true });
      return;
    }

    if (!emailVerified || !phoneVerified) {
      toast.error("Verify email and phone first.");
      nav("/verify-otp", { replace: true });
    }
  }, [intentId, storeName, emailVerified, phoneVerified, nav]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoadingPlans(true);

      try {
        const { data } = await apiClient.get("/auth/plans");

        if (cancelled) return;

        const list = Array.isArray(data?.plans) ? data.plans : [];
        setPlans(list);

        if (!list.length) {
          toast.error("No paid plans available.");
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load plans");
      } finally {
        if (!cancelled) {
          setLoadingPlans(false);
        }
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => groupPlans(plans), [plans]);

  const recommendedPlan = useMemo(
    () => findRecommendedPlan(grouped.standard),
    [grouped.standard],
  );

  useEffect(() => {
    if (!grouped.standard.length) return;

    const stored = localStorage.getItem("storvex_planKey");
    const storedPlan = grouped.standard.find((plan) => plan.key === stored);
    const basePlan = storedPlan || recommendedPlan || grouped.standard[0];

    if (!basePlan) return;

    setSelectedPlanKey(basePlan.key);
    setSelectedSegment(basePlan.segment);
    setSelectedCycle(basePlan.cycle);

    if (activationMode === "PAID") {
      saveOnboardingPatch({
        planKey: basePlan.key,
        signupMode: "PAID",
        enterpriseInterest: false,
      });
    }
  }, [grouped.standard, recommendedPlan, activationMode]);

  const visiblePlans = useMemo(() => {
    return grouped.standard.filter(
      (plan) =>
        (!selectedSegment || plan.segment === selectedSegment) &&
        (!selectedCycle || plan.cycle === selectedCycle),
    );
  }, [grouped.standard, selectedSegment, selectedCycle]);

  const selectedPlan = useMemo(() => {
    return (
      visiblePlans.find((plan) => plan.key === selectedPlanKey) ||
      grouped.standard.find((plan) => plan.key === selectedPlanKey) ||
      visiblePlans[0] ||
      null
    );
  }, [visiblePlans, grouped.standard, selectedPlanKey]);

  useEffect(() => {
    if (activationMode === "TRIAL") {
      saveOnboardingPatch({
        signupMode: "TRIAL",
        planKey: "",
        enterpriseInterest: false,
        phone: normalizePhone(phone),
      });
      return;
    }

    if (!selectedPlan) return;

    saveOnboardingPatch({
      planKey: selectedPlan.key,
      signupMode: "PAID",
      enterpriseInterest: false,
      phone: normalizePhone(phone),
    });
  }, [activationMode, selectedPlan, phone]);

  function chooseMode(mode) {
    setActivationMode(mode);

    if (mode === "TRIAL") {
      localStorage.setItem("storvex_signupMode", "TRIAL");
      localStorage.removeItem("storvex_planKey");

      saveOnboardingPatch({
        signupMode: "TRIAL",
        planKey: "",
        enterpriseInterest: false,
        phone: normalizePhone(phone),
      });
      return;
    }

    localStorage.setItem("storvex_signupMode", "PAID");

    if (selectedPlan) {
      saveOnboardingPatch({
        signupMode: "PAID",
        planKey: selectedPlan.key,
        enterpriseInterest: false,
        phone: normalizePhone(phone),
      });
    }
  }

  function chooseSegment(segment) {
    setSelectedSegment(segment);

    const firstPlan =
      grouped.standard.find(
        (plan) => plan.segment === segment && plan.cycle === selectedCycle,
      ) ||
      grouped.standard.find(
        (plan) => plan.segment === segment && plan.cycle === "HALF_YEAR",
      ) ||
      grouped.standard.find((plan) => plan.segment === segment);

    if (firstPlan) {
      setSelectedCycle(firstPlan.cycle);
      setSelectedPlanKey(firstPlan.key);
    }
  }

  function chooseCycle(cycle) {
    setSelectedCycle(cycle);

    const matched =
      grouped.standard.find(
        (plan) => plan.segment === selectedSegment && plan.cycle === cycle,
      ) || null;

    if (matched) {
      setSelectedPlanKey(matched.key);
    }
  }

  function choosePlan(plan) {
    setSelectedPlanKey(plan.key);

    saveOnboardingPatch({
      signupMode: "PAID",
      planKey: plan.key,
      enterpriseInterest: false,
      phone: normalizePhone(phone),
    });
  }

  function startTrial() {
    saveOnboardingPatch({
      signupMode: "TRIAL",
      planKey: "",
      enterpriseInterest: false,
      phone: normalizePhone(phone),
    });

    toast.success("Trial selected");
    nav("/confirm-signup?mode=TRIAL");
  }

  async function sendPaymentRequest() {
    if (!selectedPlan?.key) {
      toast.error("Select a plan first.");
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    if (!isValidRwandaPhone(normalizedPhone)) {
      toast.error("Use a Rwanda phone number like 078xxxxxxx or 25078xxxxxxx");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/auth/owner-payment", {
        intentId,
        planKey: selectedPlan.key,
        phone: normalizedPhone,
      });

      saveOnboardingPatch({
        planKey: selectedPlan.key,
        signupMode: "PAID",
        enterpriseInterest: false,
        phone: normalizedPhone,
      });

      toast.success("Payment request sent");
      nav("/confirm-signup?mode=PAID");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  function alreadyPaid() {
    if (!selectedPlan?.key) {
      toast.error("Select the paid plan first.");
      return;
    }

    saveOnboardingPatch({
      planKey: selectedPlan.key,
      signupMode: "PAID",
      enterpriseInterest: false,
      phone: normalizePhone(phone),
    });

    nav("/confirm-signup?mode=PAID");
  }

  function requestEnterpriseSetup() {
    if (!grouped.enterprise) {
      toast.error("Enterprise plan is not available.");
      return;
    }

    saveOnboardingPatch({
      planKey: grouped.enterprise.key,
      signupMode: "ENTERPRISE",
      enterpriseInterest: true,
      phone: normalizePhone(phone),
    });

    toast.success("Enterprise interest saved. Custom checkout will be connected later.");
  }

  if (loadingPlans) {
    return <AuthPageSkeleton titleWidth="w-72" lines={4} showSide={false} />;
  }

return (
  <PublicLayout>
    <section className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="pointer-events-none absolute left-[-12rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[rgba(74,163,255,0.16)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[rgba(16,185,129,0.12)] blur-3xl" />

      <div className="relative mx-auto max-w-6xl space-y-6">
        <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Step 3 of 5
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
                Activate your store.
              </h1>

              <p className="mt-4 max-w-2xl text-base font-medium leading-8 text-[var(--color-text-muted)]">
                Choose free trial or paid activation. After this, you create the password
                and Storvex opens the workspace with the first branch ready.
              </p>
            </div>

            <div className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[22px] bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-600">
              Email and phone verified
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <DetailTile label="Store" value={storeName || "Your store"} />
            <DetailTile label="Owner" value={ownerName || "Owner"} />
            <DetailTile label="Email" value={ownerEmail || "—"} />
          </div>
        </section>

        <section className={cx(surfaceCard(), "p-5")}>
          <div className="grid gap-3 md:grid-cols-5">
            <ProgressStep number="1" label="Create store account" done />
            <ProgressStep number="2" label="Verify email and phone" done />
            <ProgressStep number="3" label="Choose activation" active />
            <ProgressStep number="4" label="Create password" />
            <ProgressStep number="5" label="Open workspace" />
          </div>
        </section>

        <section className={cx(surfaceCard(), "p-5 sm:p-6 lg:p-7")}>
          <div className="mb-6 border-b border-[var(--color-border)] pb-6">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Activation
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Choose how to start
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
              Pick the path that matches your store today. You can start with a trial,
              or activate a paid plan immediately.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseMode("TRIAL")}
              className={cx(
                "rounded-[30px] border p-5 text-left transition hover:-translate-y-0.5",
                activationMode === "TRIAL" ? cardClass(true) : cardClass(false),
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black">Start free trial</div>
                  <p
                    className={cx(
                      "mt-2 text-sm font-semibold leading-6",
                      activationMode === "TRIAL"
                        ? "text-white/80"
                        : "text-[var(--color-text-muted)]",
                    )}
                  >
                    Try Storvex first, then decide when the store is ready to continue.
                  </p>
                </div>

                {activationMode === "TRIAL" ? (
                  <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                    Selected
                  </span>
                ) : null}
              </div>

              <div
                className={cx(
                  "mt-5 rounded-2xl px-4 py-3 text-sm font-black",
                  activationMode === "TRIAL"
                    ? "bg-white/15 text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text)]",
                )}
              >
                No payment request on this path
              </div>
            </button>

            <button
              type="button"
              onClick={() => chooseMode("PAID")}
              className={cx(
                "rounded-[30px] border p-5 text-left transition hover:-translate-y-0.5",
                activationMode === "PAID" ? cardClass(true) : cardClass(false),
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black">Activate paid plan</div>
                  <p
                    className={cx(
                      "mt-2 text-sm font-semibold leading-6",
                      activationMode === "PAID"
                        ? "text-white/80"
                        : "text-[var(--color-text-muted)]",
                    )}
                  >
                    Choose a plan and send a MoMo payment request to activate immediately.
                  </p>
                </div>

                {activationMode === "PAID" ? (
                  <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                    Selected
                  </span>
                ) : null}
              </div>

              <div
                className={cx(
                  "mt-5 rounded-2xl px-4 py-3 text-sm font-black",
                  activationMode === "PAID"
                    ? "bg-white/15 text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text)]",
                )}
              >
                Best for stores ready to start
              </div>
            </button>
          </div>

          {activationMode === "TRIAL" ? (
            <div className="mt-6 rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                    Trial selected
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                    Continue to create your password and open the workspace.
                  </p>
                </div>

                <AsyncButton
                  type="button"
                  onClick={startTrial}
                  className="w-full lg:w-auto"
                >
                  Continue with trial
                </AsyncButton>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <section className={softPanel()}>
                <SectionHeader
                  step="Plan step 1"
                  title="Choose business size"
                  text="Pick the size closest to your current team. You can upgrade later."
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.segments.map((segment) => {
                    const active = selectedSegment === segment;

                    return (
                      <button
                        key={segment}
                        type="button"
                        onClick={() => chooseSegment(segment)}
                        className={cx(
                          "rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5",
                          cardClass(active),
                        )}
                      >
                        <div className="text-base font-black">{segmentLabel(segment)}</div>
                        <p
                          className={cx(
                            "mt-2 text-sm font-semibold leading-6",
                            active ? "text-white/80" : "text-[var(--color-text-muted)]",
                          )}
                        >
                          {getSegmentDescription(segment)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={softPanel()}>
                <SectionHeader
                  step="Plan step 2"
                  title="Choose billing cycle"
                  text="Longer cycles reduce how often the owner needs to renew."
                />

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {grouped.cycles.map((cycle) => {
                    const active = selectedCycle === cycle;

                    return (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => chooseCycle(cycle)}
                        className={cx(
                          "rounded-2xl border px-4 py-3 text-sm font-black transition",
                          chipClass(active),
                        )}
                      >
                        {cycleLabel(cycle)}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={softPanel()}>
                <SectionHeader
                  step="Plan step 3"
                  title="Confirm plan"
                  text="This is the plan that will be used for payment activation."
                />

                <div className="mt-4 grid gap-3">
                  {visiblePlans.map((plan) => {
                    const active = selectedPlan?.key === plan.key;
                    const recommended = recommendedPlan?.key === plan.key;

                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => choosePlan(plan)}
                        className={cx(
                          "rounded-[24px] border p-5 text-left transition hover:-translate-y-0.5",
                          cardClass(active),
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-base font-black">{plan.label}</div>
                            <p
                              className={cx(
                                "mt-2 text-sm font-semibold",
                                active ? "text-white/80" : "text-[var(--color-text-muted)]",
                              )}
                            >
                              {Number(plan.days || 0)} days • {getCycleRecommendation(plan.cycle)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            {recommended ? (
                              <span
                                className={cx(
                                  "whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                                  active
                                    ? "bg-white/15 text-white"
                                    : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)]",
                                )}
                              >
                                Recommended
                              </span>
                            ) : null}

                            {active ? (
                              <span className="whitespace-nowrap rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                                Selected
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 text-2xl font-black tracking-[-0.04em]">
                          {formatMoney(plan.price, plan.currency)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={softPanel()}>
                <SectionHeader
                  step="Payment phone"
                  title="MoMo request number"
                  text="Use a Rwanda phone number that can receive and approve the payment request."
                />

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
                      Phone number
                    </label>

                    <input
                      className={inputClass()}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="078xxxxxxx or 25078xxxxxxx"
                    />
                  </div>

                  <div className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
                    {isValidRwandaPhone(phone) ? "Ready for MoMo" : "Phone needed"}
                  </div>
                </div>
              </section>

              <section className={cx(surfaceCard(), "p-5")}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                      Activation summary
                    </p>

                    {selectedPlan ? (
                      <>
                        <h3 className="mt-3 text-xl font-black text-[var(--color-text)]">
                          {selectedPlan.label}
                        </h3>

                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <DetailTile
                            label="Amount"
                            value={formatMoney(selectedPlan.price, selectedPlan.currency)}
                          />
                          <DetailTile
                            label="Access period"
                            value={`${selectedPlan.days} days`}
                          />
                          <DetailTile
                            label="Payment phone"
                            value={normalizePhone(phone) || "Not ready"}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-[var(--color-text-muted)]">
                        No plan selected yet.
                      </p>
                    )}

                    {grouped.enterprise ? (
                      <div className="mt-5 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="text-base font-black text-[var(--color-text)]">
                              Enterprise setup
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                              Enterprise is separated from self-serve activation until the custom payment flow is connected.
                            </p>
                          </div>

                          <AsyncButton
                            type="button"
                            variant="secondary"
                            onClick={requestEnterpriseSetup}
                            className="w-full lg:w-auto"
                          >
                            Request enterprise setup
                          </AsyncButton>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <AsyncButton
                      type="button"
                      loading={loading}
                      loadingText="Sending request..."
                      onClick={sendPaymentRequest}
                      className="w-full"
                    >
                      Send payment request
                    </AsyncButton>

                    <AsyncButton
                      type="button"
                      variant="secondary"
                      onClick={alreadyPaid}
                      className="w-full"
                    >
                      I already paid
                    </AsyncButton>

                    <p className="text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                      After payment, continue to create the owner password and open the workspace.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          <p className="mt-6 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Need to verify again?{" "}
            <Link
              to="/verify-otp"
              className="font-black text-[var(--color-text)] underline-offset-4 hover:underline"
            >
              Back to verification
            </Link>
          </p>
        </section>
      </div>
    </section>
  </PublicLayout>
);
}
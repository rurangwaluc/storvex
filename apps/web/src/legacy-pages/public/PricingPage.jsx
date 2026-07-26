import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  MapPin,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import PublicHeader from "../../components/layout/PublicHeader";
import apiClient from "../../services/apiClient";
import {
  normalizeSubscriptionPlans,
  pickRecommendedPlan,
} from "../../utils/subscriptionPlans";
import "./LandingPage.css";
import "./PricingPage.css";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function formatMoney(amount, currency = "RWF") {
  const value = Number(amount || 0);

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "RWF" ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-GB")}`;
  }
}

function getPlanFeatures(plan) {
  const sectionItems = Array.isArray(plan.sections)
    ? plan.sections.flatMap((section) =>
        Array.isArray(section?.items) ? section.items : [],
      )
    : [];

  return [...new Set(sectionItems)].slice(0, 4);
}

function getPlanPosition(plan) {
  const key = String(plan?.key || "").toUpperCase();

  if (key.includes("GROWTH")) return "growth";
  if (key.includes("BUSINESS")) return "business";

  return "starter";
}

function PlanSkeleton() {
  return (
    <article className="svx-price-plan svx-price-skeleton">
      <span className="svx-price-skeleton-short" />
      <span className="svx-price-skeleton-title" />
      <span className="svx-price-skeleton-copy" />
      <span className="svx-price-skeleton-copy medium" />
      <span className="svx-price-skeleton-value" />

      <div className="svx-price-skeleton-items">
        <span />
        <span />
        <span />
        <span />
      </div>

      <span className="svx-price-skeleton-action" />
    </article>
  );
}

function DetailItem({ icon: Icon, children }) {
  return (
    <li className="svx-price-detail">
      <span aria-hidden="true">
        <Icon size={16} strokeWidth={2.4} />
      </span>

      <strong>{children}</strong>
    </li>
  );
}

function FeatureItem({ children }) {
  return (
    <li className="svx-price-feature">
      <span aria-hidden="true">
        <Check size={12} strokeWidth={3.2} />
      </span>

      <p>{children}</p>
    </li>
  );
}

function PlanCard({ plan, recommended }) {
  const position = getPlanPosition(plan);
  const features = getPlanFeatures(plan);
  const planKey = encodeURIComponent(plan.key);

  const staffLabel =
    plan.capacity?.staffLabel ||
    (plan.staffLimit
      ? `Up to ${plan.staffLimit} active users`
      : "Custom team capacity");

  const branchLabel =
    plan.capacity?.branchLabel ||
    (plan.branchLimit
      ? `Up to ${plan.branchLimit} store locations`
      : "Custom location capacity");

  return (
    <article
      className={cx(
        "svx-price-plan",
        `svx-price-plan-${position}`,
        recommended && "is-recommended",
      )}
    >
      <div className="svx-price-plan-top">
        <div className="svx-price-plan-heading">
          <p>
            {position === "starter"
              ? "Best for small shops"
              : position === "growth"
                ? "Best for growing stores"
                : "Best for established businesses"}
          </p>

          <h2>{plan.name}</h2>
        </div>

        {recommended ? (
          <span className="svx-price-recommended">
            <CircleCheck size={14} strokeWidth={2.8} />
            Most popular
          </span>
        ) : null}
      </div>

      <p className="svx-price-plan-description">
        {plan.shortDescription}
      </p>

      <div className="svx-price-value">
        <strong>{formatMoney(plan.price, plan.currency)}</strong>
        <span>per {plan.cycleLabel?.toLowerCase() || "month"}</span>
      </div>

      <ul className="svx-price-capacity">
        <DetailItem icon={Users}>{staffLabel}</DetailItem>
        <DetailItem icon={MapPin}>{branchLabel}</DetailItem>
        <DetailItem icon={Store}>Marketplace included</DetailItem>
      </ul>

      <div className="svx-price-included">
        <p>Key differences</p>

        <ul>
          {features.map((feature) => (
            <FeatureItem key={feature}>{feature}</FeatureItem>
          ))}
        </ul>
      </div>

      <div className="svx-price-plan-footer">
        <Link
          to={`/signup?plan=${planKey}`}
          className={cx(
            "svx-price-action",
            recommended && "svx-price-action-primary",
          )}
        >
          Start with {plan.name}
          <ArrowRight size={17} strokeWidth={2.7} />
        </Link>

        <small>No payment during setup</small>
      </div>
    </article>
  );
}

function ConfidenceItem({ icon: Icon, title, text }) {
  return (
    <div className="svx-price-confidence-item">
      <span aria-hidden="true">
        <Icon size={18} strokeWidth={2.4} />
      </span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const recommendedPlan = useMemo(
    () => pickRecommendedPlan(plans),
    [plans],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setLoading(true);
      setLoadError("");

      try {
        const { data } = await apiClient.get("/auth/plans");

        if (cancelled) return;

        const nextPlans = normalizeSubscriptionPlans(data?.plans).filter(
          (plan) => !plan.isEnterprise,
        );

        setPlans(nextPlans);
        setTrialDays(Number(data?.trialDays || 30));
      } catch (error) {
        if (cancelled) return;

        setLoadError(
          error?.response?.data?.message ||
            "Storvex plans could not be loaded. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="storvex-landing svx-price-page">
      <PublicHeader />

      <main className="svx-price-main">
          <section className="svx-price-hero">
            <div className="svx-price-shell">
              <div className="svx-price-hero-content">
                <div>
                  <p className="svx-price-kicker">
                    Simple pricing. Serious store control.
                  </p>

                  <h1>Choose a plan built for how your store operates.</h1>

                  <p className="svx-price-hero-copy">
                    See the real price before creating an account. Your choice
                    stays with you through business setup and owner
                    verification, and you can change it before activation.
                  </p>
                </div>

                <div className="svx-price-hero-facts">
                  <div>
                    <CircleCheck size={18} strokeWidth={2.7} />
                    <span>
                      <strong>{trialDays} days free</strong>
                      <small>No payment during setup</small>
                    </span>
                  </div>

                  <div>
                    <ShieldCheck size={18} strokeWidth={2.5} />
                    <span>
                      <strong>Secure owner setup</strong>
                      <small>Email and phone verification</small>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="svx-price-plans-section">
            <div className="svx-price-shell">
              <header className="svx-price-section-heading">
                <div>
                  <p>Plans for every stage</p>
                  <h2>Start where your business is today.</h2>
                </div>

                <p>
                  Growth is the best choice for most growing retailers.
                  Starter covers the essentials, while Business adds more team
                  and location capacity.
                </p>
              </header>

              {loadError ? (
                <div className="svx-price-error" role="alert">
                  <div>
                    <strong>Plans could not be loaded</strong>
                    <p>{loadError}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              <div className="svx-price-grid">
                {loading
                  ? [0, 1, 2].map((item) => (
                      <PlanSkeleton key={item} />
                    ))
                  : plans.map((plan) => (
                      <PlanCard
                        key={plan.key}
                        plan={plan}
                        recommended={recommendedPlan?.key === plan.key}
                      />
                    ))}
              </div>

              {!loading && !loadError && !plans.length ? (
                <div className="svx-price-empty">
                  <h2>Plans are being prepared</h2>

                  <p>
                    Start business setup and choose a plan during activation.
                  </p>

                  <Link to="/signup">
                    Start business setup
                    <ArrowRight size={17} strokeWidth={2.7} />
                  </Link>
                </div>
              ) : null}
            </div>
          </section>

          <section className="svx-price-confidence">
            <div className="svx-price-shell">
              <div className="svx-price-confidence-panel">
                <div className="svx-price-confidence-copy">
                  <p>Choose with confidence</p>
                  <h2>Your choice stays flexible until activation.</h2>
                </div>

                <div className="svx-price-confidence-grid">
                  <ConfidenceItem
                    icon={CircleCheck}
                    title="Plan remembered"
                    text="The plan selected here remains selected throughout setup."
                  />

                  <ConfidenceItem
                    icon={ShieldCheck}
                    title="Verify securely"
                    text="Secure the owner email and phone before store access is created."
                  />

                  <ConfidenceItem
                    icon={ArrowRight}
                    title="Change before paying"
                    text="Review or change the selected plan on the final Launch plan step."
                  />
                </div>

                <div className="svx-price-final-action">
                  <div>
                    <strong>Ready to set up your store?</strong>
                    <p>
                      Start with any plan and make the final decision before
                      activation.
                    </p>
                  </div>

                  <Link to="/signup">
                    Start business setup
                    <ArrowRight size={18} strokeWidth={2.7} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
      </main>
    </div>
  );
}

import { Link } from "react-router-dom";

import PublicLayout from "../layout/PublicLayout";
import OnboardingProgress from "./OnboardingProgress";
import "./Onboarding.css";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

export function OnboardingCard({ children, className = "" }) {
  return <section className={cx("svx-onboard-card", className)}>{children}</section>;
}

export function OnboardingIconBadge({ children }) {
  return <div className="svx-onboard-icon-badge">{children}</div>;
}

export default function OnboardingShell({
  activeStep = 1,
  title = "Let’s get your store set up in minutes.",
  subtitle = "A short setup flow for business details, owner security, and how you want to start.",
  children,
  footer,
}) {
  return (
    <PublicLayout variant="onboarding" activeStep={activeStep}>
      <div className="storvex-onboarding">
        <section className="svx-onboard-top">
          <div className="svx-onboard-shell">
            <div className="svx-onboard-title-wrap">
              <h1>{title}</h1>

              {subtitle ? <p>{subtitle}</p> : null}

              <div className="svx-onboard-progress-wrap">
                <OnboardingProgress activeStep={activeStep} />
              </div>
            </div>
          </div>
        </section>

        <section className="svx-onboard-content">
          <div className="svx-onboard-shell">{children}</div>

          {footer ? (
            <div className="svx-onboard-shell svx-onboard-footer-row">{footer}</div>
          ) : (
            <p className="svx-onboard-login-note">
              Already have a store account? <Link to="/login">Log in</Link>
            </p>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
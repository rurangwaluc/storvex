import { Link } from "react-router-dom";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

const STEPS = [
  {
    number: 1,
    label: "Business setup",
    to: "/signup?review=1",
  },
  {
    number: 2,
    label: "Account setup",
    to: "/verify-otp",
  },
  {
    number: 3,
    label: "Launch plan",
    to: "/owner-payment",
  },
];

export default function OnboardingProgress({ activeStep = 1 }) {
  return (
    <nav
      className="svx-onboard-progress"
      aria-label="Storvex setup progress"
    >
      {STEPS.map((step, index) => {
        const active = step.number === activeStep;
        const done = step.number < activeStep;

        const content = (
          <>
            <div className="svx-onboard-progress-top">
              <span className="svx-onboard-progress-number">
                {done ? "✓" : step.number}
              </span>

              {index < STEPS.length - 1 ? (
                <span className="svx-onboard-progress-line" />
              ) : null}
            </div>

            <span className="svx-onboard-progress-label">
              {step.label}
            </span>
          </>
        );

        return (
          <div
            key={step.number}
            className={cx(
              "svx-onboard-progress-step",
              active ? "is-active" : "",
              done ? "is-done" : "",
            )}
          >
            {done ? (
              <Link
                to={step.to}
                className="svx-onboard-progress-link"
                aria-label={`Review ${step.label}`}
              >
                {content}
              </Link>
            ) : (
              <div
                className="svx-onboard-progress-static"
                aria-current={active ? "step" : undefined}
              >
                {content}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

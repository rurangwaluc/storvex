function cx(...items) {
  return items.filter(Boolean).join(" ");
}

const STEPS = [
  {
    number: 1,
    label: "Tell us about your business",
  },
  {
    number: 2,
    label: "Secure your account",
  },
  {
    number: 3,
    label: "Choose how to start",
  },
];

export default function OnboardingProgress({ activeStep = 1 }) {
  return (
    <section className="svx-onboard-progress" aria-label="Storvex setup progress">
      {STEPS.map((step, index) => {
        const active = step.number === activeStep;
        const done = step.number < activeStep;

        return (
          <div
            key={step.number}
            className={cx(
              "svx-onboard-progress-step",
              active ? "is-active" : "",
              done ? "is-done" : "",
            )}
          >
            <div className="svx-onboard-progress-top">
              <span className="svx-onboard-progress-number">{done ? "✓" : step.number}</span>

              {index < STEPS.length - 1 ? <span className="svx-onboard-progress-line" /> : null}
            </div>

            <p>{step.label}</p>
          </div>
        );
      })}
    </section>
  );
}
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { useTheme } from "../../hooks/useTheme";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

const stepDetails = {
  1: {
    eyebrow: "Step 1 of 3",
    label: "Business setup",
    actionLabel: "Log in",
    actionTo: "/login",
    showBackIcon: false,
  },
  2: {
    eyebrow: "Step 2 of 3",
    label: "Owner security",
    actionLabel: "Back to setup",
    actionTo: "/signup",
    showBackIcon: true,
  },
  3: {
    eyebrow: "Step 3 of 3",
    label: "Choose how to start",
    actionLabel: "Back",
    actionTo: "/verify-otp",
    showBackIcon: true,
  },
};

export default function OnboardingHeader({ activeStep = 1 }) {
  const { isDark, toggleTheme } = useTheme();
  const step = stepDetails[activeStep] || stepDetails[1];

  return (
    <header className="fixed left-0 right-0 top-0 z-[90] border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-[22px]">
      <div className="mx-auto grid h-[76px] max-w-[1440px] grid-cols-[auto_1fr_auto] items-center gap-4 px-6 sm:px-8 lg:px-12">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Storvex home">
          <img
            src={isDark ? "/storvex_white.webp" : "/storvex_dark.webp"}
            alt="Storvex"
            className="h-[42px] w-auto object-contain sm:h-[46px]"
            draggable="false"
          />
        </Link>

        <div className="hidden min-w-0 justify-self-center text-center sm:block">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {step.eyebrow}
          </p>
          <p className="mt-1 text-[13px] font-black text-[var(--color-text)]">
            {step.label}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-1 text-[12px] font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            aria-label="Toggle theme"
          >
            <span
              className={cx(
                "flex h-7 w-7 items-center justify-center rounded-full transition",
                !isDark
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              ☀
            </span>

            <span
              className={cx(
                "flex h-7 w-7 items-center justify-center rounded-full transition",
                isDark
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              ◐
            </span>
          </button>

          <Link
            to={step.actionTo}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[var(--color-border)] bg-transparent px-4 text-[12.5px] font-black text-[var(--color-text)] transition hover:bg-[var(--color-surface-2)] sm:h-11 sm:px-5 sm:text-[13px]"
          >
            {step.showBackIcon ? <ArrowLeft size={15} strokeWidth={2.6} /> : null}
            {step.actionLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
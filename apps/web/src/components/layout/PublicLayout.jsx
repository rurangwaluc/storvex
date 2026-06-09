import OnboardingHeader from "./OnboardingHeader";
import PublicHeader from "./PublicHeader";

export default function PublicLayout({
  children,
  variant = "public",
  activeStep = 1,
}) {
  const isOnboarding = variant === "onboarding";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {isOnboarding ? <OnboardingHeader activeStep={activeStep} /> : <PublicHeader />}

      <main className="bg-[var(--color-bg)] pt-[76px] text-[var(--color-text)]">
        {children}
      </main>
    </div>
  );
}
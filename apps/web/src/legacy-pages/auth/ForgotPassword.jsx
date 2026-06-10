import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";

import PublicLayout from "../../components/layout/PublicLayout";
import {
  OnboardingCard,
  OnboardingIconBadge,
} from "../../components/onboarding/OnboardingShell";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient from "../../services/apiClient";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");

  const trimmedEmail = useMemo(() => normalizeEmail(email), [email]);

  async function submit(event) {
    event.preventDefault();

    if (!trimmedEmail) {
      toast.error("Enter your email");
      return;
    }

    setLoading(true);
    setDevResetUrl("");

    try {
      const { data } = await apiClient.post("/auth/password/forgot", {
        email: trimmedEmail,
      });

      setSent(true);
      setDevResetUrl(data?.devResetUrl || "");
      toast.success(data?.message || "Reset link sent");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to request reset link",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="storvex-onboarding">
        <section className="svx-onboard-content">
          <div className="svx-onboard-shell">
            <div className="mx-auto w-full max-w-[720px] pt-10 lg:pt-16">
              <div className="mb-7 text-center">
                <span className="svx-onboard-step-pill mx-auto">Account recovery</span>

                <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-[var(--onboard-text)] sm:text-5xl">
                  Reset your password.
                </h1>

                <p className="mx-auto mt-4 max-w-[540px] text-sm font-semibold leading-6 text-[var(--onboard-muted)] sm:text-base">
                  Enter the email connected to your Storvex account. We will send a secure link to
                  create a new password.
                </p>
              </div>

              <form onSubmit={submit}>
                <OnboardingCard className="p-6 sm:p-8">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start gap-4">
                      <OnboardingIconBadge>
                        <MailCheck size={24} strokeWidth={2.3} />
                      </OnboardingIconBadge>

                      <div className="min-w-0">
                        <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
                          Get a reset link
                        </h2>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                          For security, we show the same confirmation even when an email is not
                          found.
                        </p>
                      </div>
                    </div>

                    <div className="svx-onboard-field">
                      <label>Email address</label>

                      <input
                        type="email"
                        className="svx-onboard-input"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        placeholder="you@store.com"
                        autoFocus
                        required
                        disabled={loading || sent}
                      />
                    </div>

                    {sent ? (
                      <div className="rounded-[22px] border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-emerald-500/15 text-emerald-500">
                            <ShieldCheck size={21} strokeWidth={2.5} />
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-[var(--onboard-text)]">
                              Check your email
                            </h3>

                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                              Open the reset link we sent and choose a new password.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {devResetUrl ? (
                      <div className="rounded-[22px] border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-black text-[var(--onboard-text)]">
                              Local testing link
                            </h3>

                            <p className="mt-1 text-xs font-bold leading-5 text-[var(--onboard-muted)]">
                              Shown only when DEV_PASSWORD_RESET_ECHO=true outside production.
                            </p>
                          </div>

                          <Link
                            to={devResetUrl.replace(window.location.origin, "")}
                            className="shrink-0 text-sm font-black text-[var(--onboard-primary)] hover:underline"
                          >
                            Open link
                          </Link>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      {!sent ? (
                        <AsyncButton type="submit" loading={loading} loadingText="Sending link...">
                          Send reset link
                          <span aria-hidden="true">→</span>
                        </AsyncButton>
                      ) : (
                        <Link to="/login" className="svx-onboard-secondary-link">
                          <ArrowLeft size={16} />
                          Back to login
                        </Link>
                      )}

                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 text-sm font-black text-[var(--onboard-muted)] transition hover:text-[var(--onboard-primary)]"
                      >
                        <ArrowLeft size={16} />
                        Remembered password?
                      </Link>
                    </div>
                  </div>
                </OnboardingCard>
              </form>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
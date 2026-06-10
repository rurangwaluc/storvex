import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

import PublicLayout from "../../components/layout/PublicLayout";
import {
  OnboardingCard,
  OnboardingIconBadge,
} from "../../components/onboarding/OnboardingShell";
import PasswordField from "../../components/auth/PasswordField";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient from "../../services/apiClient";

function passwordIssues(value) {
  const password = String(value || "");
  const issues = [];

  if (password.length < 8) issues.push("8+ characters");
  if (!/[a-z]/.test(password)) issues.push("lowercase");
  if (!/[A-Z]/.test(password)) issues.push("uppercase");
  if (!/[0-9]/.test(password)) issues.push("number");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("symbol");

  return issues;
}

export default function ResetPassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const issues = useMemo(() => passwordIssues(password), [password]);
  const strongEnough = password && issues.length === 0;
  const matches = password && confirmPassword && password === confirmPassword;

  async function submit(event) {
    event.preventDefault();

    if (!token) {
      toast.error("Reset link is missing. Request a new one.");
      return;
    }

    if (!strongEnough) {
      toast.error(`Password needs: ${issues.join(", ")}`);
      return;
    }

    if (!matches) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/auth/password/reset", {
        token,
        password,
      });

      toast.success("Password updated. Please log in.");
      nav("/login", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to reset password");
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
                <span className="svx-onboard-step-pill mx-auto">Password reset</span>

                <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-[var(--onboard-text)] sm:text-5xl">
                  Choose a new password.
                </h1>

                <p className="mx-auto mt-4 max-w-[540px] text-sm font-semibold leading-6 text-[var(--onboard-muted)] sm:text-base">
                  Create a strong password for your Storvex account. After saving it, log in again.
                </p>
              </div>

              <form onSubmit={submit}>
                <OnboardingCard className="p-6 sm:p-8">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-start gap-4">
                      <OnboardingIconBadge>
                        <LockKeyhole size={24} strokeWidth={2.3} />
                      </OnboardingIconBadge>

                      <div className="min-w-0">
                        <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--onboard-text)]">
                          Secure your account
                        </h2>

                        <p className="mt-1 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                          Your new password will replace the old one and old sessions will be closed.
                        </p>
                      </div>
                    </div>

                    {!token ? (
                      <div className="rounded-[22px] border border-red-500/20 bg-red-500/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-red-500/15 text-red-500">
                            <ShieldCheck size={21} strokeWidth={2.5} />
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-[var(--onboard-text)]">
                              Reset link missing
                            </h3>

                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                              Request a new password reset link from the login page.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="svx-onboard-field-group">
                      <PasswordField
                        id="reset-password"
                        label="New password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Create a new password"
                        disabled={loading || !token}
                        helperText="Use uppercase, lowercase, number, symbol, and at least 8 characters."
                      />

                      <PasswordField
                        id="reset-password-confirm"
                        label="Confirm password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Repeat the new password"
                        disabled={loading || !token}
                        error={
                          confirmPassword && !matches
                            ? "Passwords do not match."
                            : ""
                        }
                      />
                    </div>

                    {password ? (
                      <div className="rounded-[22px] border border-[var(--onboard-border)] bg-[var(--onboard-card-soft)] p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={[
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]",
                              strongEnough
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-[var(--onboard-primary-soft)] text-[var(--onboard-primary)]",
                            ].join(" ")}
                          >
                            <ShieldCheck size={21} strokeWidth={2.5} />
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-[var(--onboard-text)]">
                              {strongEnough ? "Password looks strong" : "Password needs more strength"}
                            </h3>

                            <p className="mt-1 text-sm font-semibold leading-6 text-[var(--onboard-muted)]">
                              {strongEnough
                                ? "You can save this password when both fields match."
                                : `Add: ${issues.join(", ")}.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <AsyncButton
                        type="submit"
                        loading={loading}
                        loadingText="Saving password..."
                        disabled={!token || loading}
                      >
                        Save new password
                        <span aria-hidden="true">→</span>
                      </AsyncButton>

                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 text-sm font-black text-[var(--onboard-muted)] transition hover:text-[var(--onboard-primary)]"
                      >
                        <ArrowLeft size={16} />
                        Back to login
                      </Link>
                    </div>
                  </div>
                </OnboardingCard>
              </form>

              <p className="svx-onboard-login-note mt-5 text-center">
                Need another link? <Link to="/forgot-password">Request reset link</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
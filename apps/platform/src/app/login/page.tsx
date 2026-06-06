"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { AsyncButton } from "@/components/platform/async-button";
import { ThemeToggle } from "@/components/platform/theme-toggle";
import { loginPlatform } from "@/lib/platform-api";
import { savePlatformSession } from "@/lib/platform-auth";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PlatformLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("luc@storvex.io");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Email and password are required.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await loginPlatform({
        email: cleanEmail,
        password: cleanPassword,
      });

      savePlatformSession({
        token: result.token,
        platformUser: result.platformUser,
      });

      router.replace("/dashboard");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Please check your details and try again.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-[var(--platform-bg)] text-[var(--platform-text)]">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-sm lg:grid-cols-[1fr_0.9fr]">
          <section className="hidden min-h-[640px] flex-col justify-between bg-[#077dcb] p-10 text-white lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold">
                <ShieldCheck className="h-4 w-4" />
                Storvex Platform
              </div>

              <h1 className="mt-10 max-w-xl text-5xl font-black leading-[1.02] tracking-tight">
                Control businesses, billing, support, and platform risk from
                one clean place.
              </h1>

              <p className="mt-5 max-w-lg text-base font-medium leading-7 text-white/80">
                This area is only for Storvex platform operators. Tenant users
                should use the store app instead.
              </p>
            </div>

            <div className="grid gap-3 rounded-[1.5rem] bg-white/10 p-5 text-sm font-semibold text-white/85">
              <p>Platform owner, admin, and support access only.</p>
              <p>Use this dashboard to review businesses that need attention.</p>
            </div>
          </section>

          <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:min-h-[640px]">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]">
                  <ShieldCheck className="h-7 w-7" />
                </div>

                <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-[var(--platform-primary)]">
                  Platform login
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Welcome back.
                </h2>

                <p className="mt-3 text-sm font-medium leading-6 text-[var(--platform-muted)]">
                  Sign in to manage Storvex platform operations.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-[var(--platform-muted)]">
                    Email
                  </span>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] px-4 py-3">
                    <Mail className="h-5 w-5 text-[var(--platform-muted)]" />

                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[var(--platform-muted)]"
                      placeholder="luc@storvex.io"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-[var(--platform-muted)]">
                    Password
                  </span>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] px-4 py-3">
                    <LockKeyhole className="h-5 w-5 text-[var(--platform-muted)]" />

                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[var(--platform-muted)]"
                      placeholder="Enter your password"
                    />
                  </div>
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                ) : null}

                <AsyncButton
                  type="submit"
                  isLoading={isSubmitting}
                  className={cx(
                    "w-full justify-center rounded-2xl bg-[var(--platform-primary)] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-90"
                  )}
                >
                  Sign in to platform
                </AsyncButton>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import PublicLayout from "../../components/layout/PublicLayout";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient from "../../services/apiClient";

const RESEND_SECONDS = 45;

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function maskEmail(email) {
  const value = cleanString(email);
  if (!value.includes("@")) return value || "—";

  const [name, domain] = value.split("@");
  const start = name.slice(0, 2);
  const end = name.length > 4 ? name.slice(-1) : "";

  return `${start}${"•".repeat(Math.max(3, name.length - 3))}${end}@${domain}`;
}

function maskPhone(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "");

  if (digits.startsWith("2507") && digits.length === 12) {
    return `+250 ${digits.slice(3, 6)} ••• •${digits.slice(-3)}`;
  }

  if (digits.length >= 7) {
    return `${digits.slice(0, 4)} ••• •${digits.slice(-3)}`;
  }

  return phone || "—";
}

function readOnboardingState() {
  try {
    const raw = localStorage.getItem("storvex_onboarding");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOnboardingState(next) {
  localStorage.setItem("storvex_onboarding", JSON.stringify(next));

  localStorage.setItem("storvex_intentId", next.intentId || "");
  localStorage.setItem("storvex_ownerPhone", next.phone || "");
  localStorage.setItem("storvex_ownerEmail", next.email || "");
  localStorage.setItem("storvex_storeName", next.storeName || "");
  localStorage.setItem("storvex_ownerName", next.ownerName || "");
  localStorage.setItem("storvex_shopType", next.shopType || "");
  localStorage.setItem("storvex_district", next.district || "");
  localStorage.setItem("storvex_sector", next.sector || "");
  localStorage.setItem("storvex_address", next.address || "");
  localStorage.setItem("storvex_deviceId", next.deviceId || "");

  localStorage.setItem("storvex_emailVerified", String(Boolean(next.emailVerified)));
  localStorage.setItem("storvex_phoneVerified", String(Boolean(next.phoneVerified)));
}

function inputClass() {
  return "h-14 w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-center text-lg font-black tracking-[0.35em] text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton() {
  return cx(
    buttonBase(),
    "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function StatusPill({ verified }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em]",
        verified
          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
      )}
    >
      {verified ? "Verified" : "Pending"}
    </span>
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
          done || active
            ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
            : "bg-[var(--color-card)] text-[var(--color-text-muted)]",
        )}
      >
        {done ? "✓" : number}
      </div>

      <div className="text-sm font-black text-[var(--color-text)]">{label}</div>
    </div>
  );
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

function VerificationCard({
  title,
  description,
  destination,
  maskedDestination,
  verified,
  code,
  setCode,
  devOtp,
  sending,
  verifying,
  cooldown,
  onSend,
  onVerify,
}) {
  const disabled = verified || sending || verifying;

  return (
    <section className="rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              {title}
            </h2>
            <StatusPill verified={verified} />
          </div>

          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {description}
          </p>

          <p className="mt-3 break-all text-sm font-black text-[var(--color-text)]">
            {maskedDestination}
          </p>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={verified || sending || verifying || cooldown > 0}
          className={secondaryButton()}
        >
          {verified
            ? "Verified"
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : sending
                ? "Sending..."
                : "Send code"}
        </button>
      </div>

      {devOtp && !verified ? (
        <div className="mt-4 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)]">
          DEV OTP:{" "}
          <span className="font-mono font-black text-[var(--color-text)]">{devOtp}</span>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className={inputClass()}
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/[^\d]/g, "").slice(0, 8))
          }
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          disabled={disabled}
          aria-label={`${title} code for ${destination}`}
        />

        <AsyncButton
          type="button"
          loading={verifying}
          loadingText="Checking..."
          disabled={verified || sending || !cleanString(code)}
          onClick={onVerify}
          className="h-14 rounded-[20px] px-6"
        >
          {verified ? "Done" : "Verify"}
        </AsyncButton>
      </div>
    </section>
  );
}

export default function VerifyOtp() {
  const nav = useNavigate();

  const onboarding = useMemo(() => readOnboardingState(), []);

  const intentId = onboarding?.intentId || localStorage.getItem("storvex_intentId") || "";
  const storeName = onboarding?.storeName || localStorage.getItem("storvex_storeName") || "";
  const ownerName = onboarding?.ownerName || localStorage.getItem("storvex_ownerName") || "";
  const ownerEmail = onboarding?.email || localStorage.getItem("storvex_ownerEmail") || "";
  const ownerPhone = onboarding?.phone || localStorage.getItem("storvex_ownerPhone") || "";

  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const [emailVerified, setEmailVerified] = useState(
    onboarding?.emailVerified ?? localStorage.getItem("storvex_emailVerified") === "true",
  );

  const [phoneVerified, setPhoneVerified] = useState(
    onboarding?.phoneVerified ?? localStorage.getItem("storvex_phoneVerified") === "true",
  );

  const [devHint, setDevHint] = useState({ email: null, phone: null });

  const canContinue = Boolean(emailVerified && phoneVerified);

  useEffect(() => {
    if (!intentId || !storeName || !ownerEmail || !ownerPhone) {
      toast.error("Missing setup info. Please start again.");
      nav("/signup", { replace: true });
    }
  }, [intentId, storeName, ownerEmail, ownerPhone, nav]);

  useEffect(() => {
    if (emailCooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setEmailCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return undefined;

    const timer = window.setInterval(() => {
      setPhoneCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phoneCooldown]);

  function persistVerifiedFlags(nextEmailVerified, nextPhoneVerified) {
    const current = readOnboardingState() || {};

    const nextState = {
      ...current,
      intentId,
      storeName,
      ownerName: current.ownerName || ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      shopType: current.shopType || localStorage.getItem("storvex_shopType") || "",
      district: current.district || localStorage.getItem("storvex_district") || "",
      sector: current.sector || localStorage.getItem("storvex_sector") || "",
      address: current.address || localStorage.getItem("storvex_address") || "",
      deviceId: current.deviceId || localStorage.getItem("storvex_deviceId") || "",
      emailVerified: Boolean(nextEmailVerified),
      phoneVerified: Boolean(nextPhoneVerified),
    };

    setEmailVerified(Boolean(nextEmailVerified));
    setPhoneVerified(Boolean(nextPhoneVerified));
    saveOnboardingState(nextState);
  }

  async function send(channel) {
    const isEmail = channel === "EMAIL";

    try {
      if (isEmail) setSendingEmail(true);
      else setSendingPhone(true);

      const { data } = await apiClient.post("/auth/otp/send", {
        intentId,
        channel,
      });

      if (
        typeof data?.emailVerified === "boolean" ||
        typeof data?.phoneVerified === "boolean"
      ) {
        persistVerifiedFlags(
          data?.emailVerified ?? emailVerified,
          data?.phoneVerified ?? phoneVerified,
        );
      }

      if (data?.devOtp) {
        setDevHint((current) => ({
          ...current,
          [isEmail ? "email" : "phone"]: data.devOtp,
        }));
      }

      if (isEmail) setEmailCooldown(RESEND_SECONDS);
      else setPhoneCooldown(RESEND_SECONDS);

      toast.success(isEmail ? "Email code sent" : "Phone code sent");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to send verification code",
      );
    } finally {
      if (isEmail) setSendingEmail(false);
      else setSendingPhone(false);
    }
  }

  async function verify(channel) {
    const isEmail = channel === "EMAIL";
    const code = cleanString(isEmail ? emailCode : phoneCode);

    if (!code) {
      toast.error("Enter the verification code first");
      return;
    }

    try {
      if (isEmail) setVerifyingEmail(true);
      else setVerifyingPhone(true);

      const { data } = await apiClient.post("/auth/otp/verify", {
        intentId,
        channel,
        code,
      });

      const nextEmailVerified = data?.emailVerified ?? (isEmail ? true : emailVerified);
      const nextPhoneVerified = data?.phoneVerified ?? (!isEmail ? true : phoneVerified);

      persistVerifiedFlags(nextEmailVerified, nextPhoneVerified);

      if (isEmail) {
        setEmailCode("");
        setEmailCooldown(0);
      } else {
        setPhoneCode("");
        setPhoneCooldown(0);
      }

      toast.success(isEmail ? "Email verified" : "Phone verified");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Verification failed",
      );
    } finally {
      if (isEmail) setVerifyingEmail(false);
      else setVerifyingPhone(false);
    }
  }

  function continueToActivation() {
    if (!canContinue) {
      toast.error("Verify both email and phone first");
      return;
    }

    nav("/owner-payment");
  }

  return (
    <PublicLayout>
      <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(620px,1.1fr)] xl:gap-8">
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[36px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Step 2 of 5
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-[-0.06em] text-[var(--color-text)] sm:text-5xl">
                Verify owner contact.
              </h1>

              <p className="mt-5 text-base font-semibold leading-8 text-[var(--color-text-muted)]">
                Confirm the email and phone before choosing trial or paid activation.
                This protects the owner account and keeps the store setup legitimate.
              </p>

              <div className="mt-6 grid gap-3">
                <DetailTile label="Store" value={storeName || "Your store"} />
                <DetailTile label="Owner" value={ownerName || "Owner"} />
              </div>
            </div>

            <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                    Setup path
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[var(--color-text)]">
                    Verification before activation
                  </h3>
                </div>

                <div className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-primary)]">
                  Step 2
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <ProgressStep number="1" label="Create store account" done />
                <ProgressStep number="2" label="Verify email and phone" active />
                <ProgressStep number="3" label="Choose trial or paid plan" />
                <ProgressStep number="4" label="Create password" />
                <ProgressStep number="5" label="Open workspace" />
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[36px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6 lg:p-7">
              <div className="mb-6 flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
                    Verification
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
                    Confirm email and phone
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                    Send a code to each contact method, enter the code, and continue
                    after both are verified.
                  </p>
                </div>

                <div
                  className={cx(
                    "rounded-[22px] border border-[var(--color-border)] px-4 py-3 text-sm font-black",
                    canContinue
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text)]",
                  )}
                >
                  {canContinue ? "Ready to continue" : "Two checks required"}
                </div>
              </div>

              <div className="space-y-4">
                <VerificationCard
                  title="Email verification"
                  description="Use this email for login support, account recovery, and important store notices."
                  destination={ownerEmail}
                  maskedDestination={maskEmail(ownerEmail)}
                  verified={emailVerified}
                  code={emailCode}
                  setCode={setEmailCode}
                  devOtp={devHint.email}
                  sending={sendingEmail}
                  verifying={verifyingEmail}
                  cooldown={emailCooldown}
                  onSend={() => send("EMAIL")}
                  onVerify={() => verify("EMAIL")}
                />

                <VerificationCard
                  title="Phone verification"
                  description="Use this phone for owner confirmation, trial protection, and payment communication."
                  destination={ownerPhone}
                  maskedDestination={maskPhone(ownerPhone)}
                  verified={phoneVerified}
                  code={phoneCode}
                  setCode={setPhoneCode}
                  devOtp={devHint.phone}
                  sending={sendingPhone}
                  verifying={verifyingPhone}
                  cooldown={phoneCooldown}
                  onSend={() => send("PHONE")}
                  onVerify={() => verify("PHONE")}
                />

                <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-[var(--color-text)]">
                        Next: choose trial or paid activation
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                        You can continue only after both email and phone are verified.
                      </p>
                    </div>

                    <AsyncButton
                      type="button"
                      disabled={!canContinue}
                      onClick={continueToActivation}
                      className="w-full sm:w-auto"
                    >
                      Continue to activation
                    </AsyncButton>
                  </div>
                </div>

                <p className="text-center text-sm font-semibold text-[var(--color-text-muted)]">
                  Need to change details?{" "}
                  <Link
                    to="/signup"
                    className="font-black text-[var(--color-text)] underline-offset-4 hover:underline"
                  >
                    Back to owner setup
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </PublicLayout>
  );
}
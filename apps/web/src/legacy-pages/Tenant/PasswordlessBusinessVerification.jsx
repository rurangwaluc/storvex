import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  LockKeyhole,
  MailCheck,
  Phone,
  ShieldCheck,
  Store,
  Boxes,
} from "lucide-react";

import { useTheme } from "../../theme/ThemeProvider";
import {
  HeroDesktopPreview,
  HeroPhonePreview,
} from "../../components/layout/StorvexLockedHero";
import {
  readOnboardingState,
  saveOnboardingState,
} from "../../components/onboarding/onboardingStorage";

import "./BusinessSetupPremium.css";
import "./PasswordlessBusinessVerification.css";

function maskPhone(value) {
  const text = String(value || "");
  if (text.length < 7) return text;
  return `${text.slice(0, 6)}••••${text.slice(-3)}`;
}

async function onboardingRequest(path, token, options = {}) {
  const response = await fetch(`/api${path}`, {
    method: options.method || "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-storvex-onboarding-token": token,
    },
    ...(options.body
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.message || "Verification request failed."
    );
    error.reason = data?.reason || null;
    throw error;
  }

  return data;
}

export default function PasswordlessBusinessVerification({ account }) {
  const nav = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();

  const onboarding = useMemo(() => readOnboardingState() || {}, []);

  const intentId = onboarding.intentId || "";
  const token = onboarding.onboardingToken || "";
  const phone = onboarding.phone || "";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [smsBlocked, setSmsBlocked] = useState(false);
  const [autoSending, setAutoSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const otpInputRef = useRef(null);
  const autoSendAttempted = useRef(false);
  const lastVerifiedCode = useRef("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const emailVerified = status?.emailVerified === true;
  const phoneVerified = status?.phoneVerified === true;
  const authenticated = Boolean(
    account?.accountId &&
    account?.emailVerified === true
  );

  useEffect(() => {
    if (!cooldownUntil) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const cooldown = Math.max(
    0,
    Math.ceil((cooldownUntil - now) / 1000)
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      if (!intentId || !token) {
        setError("Your setup session is missing. Return to Business Setup.");
        setLoading(false);
        return;
      }

      try {
        const data = await onboardingRequest(
          `/auth/signup/owner-intent/${encodeURIComponent(intentId)}/status`,
          token
        );

        if (cancelled) return;

        setStatus(data);

        if (data.phoneResendAvailableAt) {
          const timestamp = new Date(
            data.phoneResendAvailableAt
          ).getTime();

          if (Number.isFinite(timestamp) && timestamp > Date.now()) {
            setSent(true);
            setCooldownUntil(timestamp);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadStatus();
    return () => { cancelled = true; };
  }, [intentId, token]);

  useEffect(() => {
    if (
      loading ||
      !authenticated ||
      !status ||
      status.emailVerified !== true ||
      status.phoneVerified === true ||
      sent ||
      busy ||
      autoSendAttempted.current ||
      smsBlocked ||
      !intentId ||
      !token
    ) {
      return;
    }

    autoSendAttempted.current = true;

    const key = `storvex_phone_auto_send_${intentId}`;
    const previous = Number(
      sessionStorage.getItem(key) || 0
    );

    if (previous && Date.now() - previous < 45000) {
      return;
    }

    sessionStorage.setItem(key, String(Date.now()));
    void sendCode(true);
  }, [
    loading,
    authenticated,
    status,
    sent,
    busy,
    intentId,
    token,
  ]);

  async function sendCode(automatic = false) {
    if (
      !authenticated ||
      busy ||
      smsBlocked ||
      cooldown > 0 ||
      phoneVerified ||
      !intentId ||
      !token
    ) return;

    setBusy(true);
    if (automatic) setAutoSending(true);
    setError("");

    try {
      const data = await onboardingRequest(
        "/auth/signup/otp/send",
        token,
        {
          method: "POST",
          body: { intentId, channel: "PHONE" },
        }
      );

      if (data.phoneVerified === true) {
        setStatus(current => ({
          ...current,
          phoneVerified: true,
        }));
        return;
      }

      if (!data.sent) {
        throw new Error("Phone verification code was not sent.");
      }

      setSent(true);
      setCooldownUntil(Date.now() + 45000);
      setCode("");

      window.requestAnimationFrame(() => {
        otpInputRef.current?.focus();
      });
    } catch (err) {
      const reason = String(err?.reason || "").toUpperCase();
      const message = String(err?.message || "");

      if (reason === "TWILIO_VERIFY_SEND_FAILED_60410") {
        setSmsBlocked(true);
        setError(
          "SMS verification is temporarily unavailable for this number. Please try again later."
        );
      } else {
        const deliveryFailure =
          /failed to send SMS OTP|phone verification code was not sent/i
            .test(message);

        setError(
          deliveryFailure
            ? "We couldn't send a verification code. Check your number and try again."
            : message || "We couldn't send your code. Please try again."
        );
      }
    } finally {
      setBusy(false);
      setAutoSending(false);
    }
  }

  async function verifyCode() {
    if (
      !authenticated ||
      busy ||
      phoneVerified ||
      !/^\d{6}$/.test(code)
    ) return;

    setBusy(true);
    setVerifying(true);
    setError("");

    try {
      const data = await onboardingRequest(
        "/auth/signup/otp/verify",
        token,
        {
          method: "POST",
          body: {
            intentId,
            channel: "PHONE",
            code,
          },
        }
      );

      if (data.phoneVerified !== true) {
        throw new Error("Phone verification was not confirmed.");
      }

      setStatus(current => ({
        ...current,
        emailVerified: data.emailVerified === true,
        phoneVerified: true,
      }));

      setCode("");
    } catch (err) {
      setError(err.message);
      setCode("");
      lastVerifiedCode.current = "";
    } finally {
      setBusy(false);
      setVerifying(false);
    }
  }

  useEffect(() => {
    if (
      !authenticated ||
      loading ||
      busy ||
      !sent ||
      phoneVerified ||
      !/^\d{6}$/.test(code) ||
      lastVerifiedCode.current === code
    ) {
      return;
    }

    lastVerifiedCode.current = code;
    void verifyCode();
  }, [
    code,
    authenticated,
    loading,
    busy,
    sent,
    phoneVerified,
  ]);

  async function continueToPlan() {
    if (!authenticated || !emailVerified || !phoneVerified || busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const confirmed = await onboardingRequest(
        `/auth/signup/owner-intent/${encodeURIComponent(intentId)}/status`,
        token
      );

      if (
        confirmed.emailVerified !== true ||
        confirmed.phoneVerified !== true
      ) {
        setStatus(confirmed);
        throw new Error("Complete verification before continuing.");
      }

      saveOnboardingState({
        ...onboarding,
        accountBusinessIntent: true,
        emailVerified: true,
        emailVerifiedFor: onboarding.email,
        phoneVerified: true,
        phoneVerifiedFor: phone,
        passwordReady: false,
      });

      nav("/owner-payment");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="svx-business-premium svx-verification">
      <div className="svx-business-premium__shell">
        <header className="svx-business-premium__header">
          <Link to="/" className="svx-business-premium__logo">
            <img src="/storvex-header-tricolor.png" alt="Storvex" />
          </Link>

          <div className="svx-business-premium__header-actions">
            <button
              type="button"
              className="svx-business-premium__theme"
              onClick={toggleTheme}
              aria-label="Toggle light and dark theme"
            >
              {resolvedTheme === "dark" ? "☀" : "☾"}
            </button>
            <Link className="svx-business-premium__help" to="/login">
              Need help?
            </Link>
            <Link className="svx-business-premium__exit" to="/login">
              Exit setup
            </Link>
          </div>
        </header>

        <div className="svx-business-premium__columns">
          <aside className="svx-business-premium__intro">
            <div className="svx-business-premium__intro-top">
              <span className="svx-business-premium__eyebrow">
                BUSINESS VERIFICATION · STEP 2 OF 3
              </span>

              <h1>Secure your<br />new store.</h1>

              <p className="svx-business-premium__intro-text">
                Your account is ready. Verify your business phone
                to continue setting up your store.
              </p>

              <div className="svx-business-premium__milestones">
                <div>
                  <span><Check size={20} /></span>
                  <p>
                    <strong>Business details</strong>
                    <small>Store information saved</small>
                  </p>
                </div>
                <div className="is-active">
                  <span><ShieldCheck size={20} /></span>
                  <p>
                    <strong>Verify business</strong>
                    <small>Secure your business contact</small>
                  </p>
                </div>
                <div>
                  <span><Store size={20} /></span>
                  <p>
                    <strong>Choose your plan</strong>
                    <small>Choose how to start selling</small>
                  </p>
                </div>
              </div>
            </div>

            <div className="svx-business-premium__visual-area">
              <div className="svx-business-premium__art" aria-hidden="true">
                <div className="svx-business-premium__lime" />
                <div className="svx-business-premium__coral" />
                <div className="svx-business-premium__devices">
                  <HeroDesktopPreview />
                  <HeroPhonePreview />
                </div>
              </div>

              <div
                className="svx-business-premium__testimonial"
                aria-label="Storvex retail management"
              >
                <span
                  className="svx-business-premium__quote-icon"
                  aria-hidden="true"
                >
                  ✦
                </span>
                <div className="svx-business-premium__testimonial-copy">
                  <p className="svx-business-premium__testimonial-slide">
                    Your retail business, connected in one place.
                  </p>
                  <small>
                    Manage stock, sales, payments and reports with Storvex.
                  </small>
                </div>
              </div>
            </div>
          </aside>

          <main className="svx-business-premium__main">
            <div
              className="svx-verification__progress"
              aria-label="Onboarding progress"
            >
              <div className="is-done">
                <span><Check size={17} /></span>
                <strong>Business details</strong>
              </div>
              <i aria-hidden="true" />
              <div className="is-active">
                <span>2</span>
                <strong>Verification</strong>
              </div>
              <i aria-hidden="true" />
              <div>
                <span>3</span>
                <strong>Choose plan</strong>
              </div>
            </div>


            <div className="svx-verification__content">
              <section className="svx-verification__unified-card">

                <div className="svx-verification__card-top">
                  <span className="svx-verification__eyebrow">
                    BUSINESS VERIFICATION
                  </span>

                  <h2>
                    {phoneVerified
                      ? "Your business contact is verified."
                      : "Verify your business contact."}
                  </h2>

                  <p>
                    {phoneVerified
                      ? "Your business contact checks are complete. You can now choose how to start with Storvex."
                      : "Confirm your business phone number to finish verification and choose your plan."}
                  </p>
                </div>

                <div className="svx-verification__account-line">
                  <span className={
                    emailVerified && authenticated
                      ? "is-confirmed"
                      : ""
                  }>
                    {emailVerified && authenticated
                      ? <CheckCircle2 size={18} />
                      : <ShieldCheck size={18} />}
                  </span>

                  <div>
                    <strong>
                      {emailVerified && authenticated
                        ? "Storvex account verified"
                        : "Checking account verification"}
                    </strong>
                    <small>
                      Your existing account is connected to this store.
                    </small>
                  </div>
                </div>

                <div className="svx-verification__phone-section">
                  <div className="svx-verification__phone-heading">
                    <span className="svx-verification__phone-icon">
                      <Phone size={23} strokeWidth={2.1} />
                    </span>

                    <div>
                      <h3>Business phone</h3>
                      <p>
                        {phoneVerified
                          ? "Phone verification completed"
                          : sent
                            ? "Enter the code sent to your business phone"
                            : "Confirm your business phone number"}
                      </p>
                    </div>
                  </div>

                  <div className="svx-verification__phone-identity">
                    <strong>{maskPhone(phone)}</strong>
                    <Link to="/business-setup?review=1">
                      Change number
                    </Link>
                  </div>

                  {loading || autoSending ? (
                <div
                  className="svx-verification__delivery-status"
                  role="status"
                  aria-live="polite"
                >
                  <span className="svx-verification__spinner" />
                  {loading
                    ? "Checking your verification status…"
                    : "Sending your verification code…"}
                </div>
              ) : phoneVerified ? (
                <div
                  className="svx-verification__complete"
                  role="status"
                >
                  <span>
                    <CheckCircle2 size={25} strokeWidth={2.2} />
                  </span>
                  <div>
                    <strong>Phone number verified</strong>
                    <p>
                      Your business contact is ready.
                      Continue to choose your plan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="svx-verification__otp">
                  <div className="svx-verification__otp-heading">
                    <label htmlFor="storvex-business-phone-code">
                      Verification code
                    </label>
                    <small>
                      {sent
                        ? "Enter the six-digit code sent to your phone."
                        : "Request a code to verify your business phone."}
                    </small>
                  </div>

                  <div className="svx-verification__digit-entry">
                    <div
                      className="svx-verification__digit-grid"
                      aria-hidden="true"
                    >
                      {Array.from({ length: 6 }, (_, index) => (
                        <span
                          key={index}
                          className={
                            code.length === index &&
                            sent &&
                            !verifying
                              ? "is-current"
                              : code[index]
                                ? "is-filled"
                                : ""
                          }
                        >
                          {code[index] || ""}
                        </span>
                      ))}
                    </div>

                    <input
                      ref={otpInputRef}
                      id="storvex-business-phone-code"
                      className="svx-verification__digit-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={code}
                      onChange={(event) => {
                        const next = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        setCode(next);
                        setError("");
                      }}
                      aria-label="Six-digit phone verification code"
                      disabled={!sent || busy || !authenticated}
                    />
                  </div>

                  {sent ? (
                    <div
                      className="svx-verification__code-feedback"
                      role="status"
                      aria-live="polite"
                    >
                      {verifying ? (
                        <>
                          <span className="svx-verification__spinner" />
                          Verifying your code…
                        </>
                      ) : (
                        "Your code will be checked automatically."
                      )}
                    </div>
                  ) : null}

                  <div className="svx-verification__resend">
                    <span>
                      {sent
                        ? "Didn't receive the code?"
                        : smsBlocked
                          ? null
                          : "Verify your phone number"}
                    </span>
                    {!smsBlocked ? (
                    <button
                      type="button"
                      onClick={() => sendCode(false)}
                      disabled={
                        busy ||
                        cooldown > 0 ||
                        !authenticated
                      }
                    >
                      {busy
                        ? "Sending…"
                        : sent
                          ? "Resend code"
                          : error
                            ? "Try again"
                            : "Send code"}
                    </button>
                    ) : null}
                    {cooldown > 0 && !smsBlocked ? (
                      <small>Try again in {cooldown}s</small>
                    ) : null}
                  </div>
                </div>
              )}
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="svx-verification__error"
                  >
                    {error}
                  </p>
                ) : null}

                {!authenticated && !loading ? (
                  <p className="svx-verification__error">
                    Sign in to your verified Storvex account
                    to continue.
                  </p>
                ) : null}

                <div className="svx-verification__card-actions">
                  <button
                    type="button"
                    className="svx-business-premium__continue"
                    onClick={continueToPlan}
                    disabled={
                      loading ||
                      busy ||
                      !authenticated ||
                      !emailVerified ||
                      !phoneVerified
                    }
                  >
                    Continue to plan selection
                    <ArrowRight size={18} />
                  </button>

                  <Link
                    to="/business-setup?review=1"
                    className="svx-verification__back"
                  >
                    ← Back to business details
                  </Link>
                </div>

              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

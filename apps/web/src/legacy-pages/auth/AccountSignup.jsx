"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Mail, Moon, Sun } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import {
  HeroDesktopPreview,
  HeroPhonePreview,
} from "../../components/layout/StorvexLockedHero";
import "./AccountSignup.css";

const ENDPOINT = "/api/auth/account";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP = /^\d{6}$/;

async function accountRequest(path, method = "GET", body) {
  const response = await fetch(`${ENDPOINT}${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Something went wrong. Please try again."
    );
  }

  return data;
}

export function BrandVisual() {
  const benefits = [
    "All-in-one retail platform",
    "Manage sales and stock",
    "Sell in-store and on WhatsApp",
    "Grow without limits",
  ];

  return (
    <section className="svx-signup-brand" aria-label="Storvex retail platform">
      <div className="svx-signup-brand__copy">
        <h1>Run Your<br />Retail Business<br />Smarter</h1>
        <p>
          Create your account and get started in minutes.
          Set up your business, add products and start selling.
        </p>

        <ul className="svx-signup-benefits">
          {benefits.map((benefit, index) => (
            <li key={benefit}>
              <span className={`svx-signup-benefit-icon svx-signup-benefit-icon--${index + 1}`}>
                {["◎", "▣", "▤", "▥"][index]}
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="svx-signup-art" aria-hidden="true">
        <div className="svx-signup-art__accent" />
        <div className="svx-signup-art__devices">
          <HeroDesktopPreview />
          <HeroPhonePreview />
        </div>
      </div>
    </section>
  );
}

function CodeBoxes({ code, setCode, disabled }) {
  const refs = useRef([]);

  function update(index, value) {
    const digits = value.replace(/\D/g, "");

    if (digits.length > 1) {
      const next = (code.slice(0, index) + digits).slice(0, 6);
      setCode(next);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }

    const values = Array.from({ length: 6 }, (_, i) => code[i] || "");
    values[index] = digits;
    setCode(values.join(""));

    if (digits && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(event, index) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="svx-signup-codeboxes" aria-label="Six-digit verification code">
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          aria-label={`Digit ${index + 1}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={code[index] || ""}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          disabled={disabled}
          required
        />
      ))}
    </div>
  );
}

export default function AccountSignup() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [params] = useSearchParams();
  const plan = params.get("plan");

  const businessHref = plan
    ? `/business-setup?${new URLSearchParams({ plan }).toString()}`
    : "/business-setup";

  const [stage, setStage] = useState("details");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const [resendWait, setResendWait] = useState(0);

  useEffect(() => {
    if (resendWait <= 0) return undefined;

    const timer = window.setTimeout(
      () => setResendWait((value) => Math.max(0, value - 1)),
      1000
    );

    return () => window.clearTimeout(timer);
  }, [resendWait]);

  useEffect(() => {
    let cancelled = false;

    accountRequest("/me")
      .then((result) => {
        if (!cancelled && result.account) {
          setStage("verified");
        }
      })
      .catch(() => {
        // Visitors without a session stay on the signup form.
      });

    return () => { cancelled = true; };
  }, []);

  async function requestCode(event) {
    event?.preventDefault();
    if (pending.current) return;

    const name = fullName.trim().replace(/\s+/g, " ");
    const address = email.trim().toLowerCase();

    if (name.length < 2 || name.length > 120 || !EMAIL.test(address)) {
      setError("Enter your full name and a valid email address.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await accountRequest("/signup", "POST", {
        fullName: name,
        email: address,
      });

      if (!result.challengeId) {
        throw new Error("Verification could not be started. Please try again.");
      }

      setFullName(name);
      setEmail(address);
      setChallengeId(result.challengeId);
      setCode("");
      setResendWait(65);
      setStage("otp");
      setNotice(
        "If registration can proceed, your code will arrive shortly. " +
        "Check your inbox and spam folder."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (pending.current) return;

    if (!OTP.test(code)) {
      setError("Enter the six-digit verification code.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await accountRequest("/signup/verify", "POST", {
        challengeId,
        code,
      });

      if (!result.verified) {
        throw new Error("Your email could not be verified.");
      }

      setCode("");
      setChallengeId("");
      setStage("verified");
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function useDifferentAccount() {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");

    try {
      await accountRequest("/logout", "POST");
      setFullName("");
      setEmail("");
      setCode("");
      setChallengeId("");
      setNotice("");
      setResendWait(0);
      setStage("details");
    } catch {
      setError(
        "We couldn't sign out this account. Please try again."
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function backToDetails() {
    if (busy) return;
    setStage("details");
    setCode("");
    setChallengeId("");
    setError("");
    setNotice("");
  }

  return (
    <main className="svx-signup">
      <div className="svx-signup-shell">
        <header className="svx-signup-header">
          <Link to="/" className="svx-signup-logo" aria-label="Storvex home">
            <img src="/storvex-header-tricolor.png" alt="Storvex" />
          </Link>
          <div className="svx-signup-header__actions">
            <button
              type="button"
              className="svx-signup-theme-toggle"
              onClick={toggleTheme}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {stage !== "verified" ? (
              <Link to="/login" className="svx-signup-header__login">
                Log in
              </Link>
            ) : null}
          </div>
        </header>

        <div className="svx-signup-layout">
          <BrandVisual />

          <div className="svx-signup-main">
            <div className="svx-signup-card">
              {stage === "details" ? (
                <form onSubmit={requestCode}>
                  <span className="svx-signup-kicker">Get started with Storvex</span>
                  <h2>Create your account.</h2>
                  <p className="svx-signup-description">
                    Start with your name and email. You'll set up
                    your business next.
                  </p>

                  <label htmlFor="svx-signup-name">Full name</label>
                  <input
                    id="svx-signup-name"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                    disabled={busy}
                  />

                  <label htmlFor="svx-signup-email">Email address</label>
                  <input
                    id="svx-signup-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled={busy}
                  />

                  {error ? <p className="svx-signup-error" role="alert">{error}</p> : null}

                  <button className="svx-signup-primary" type="submit" disabled={busy}>
                    {busy ? "Please wait..." : "Continue"}
                    {!busy ? <ArrowRight size={17} aria-hidden="true" /> : null}
                  </button>

                  <p className="svx-signup-legal">
                    By continuing, you agree to our{" "}
                    <Link to="/terms">Terms of Service</Link> and{" "}
                    <Link to="/privacy">Privacy Policy</Link>.
                  </p>
                </form>
              ) : null}

              {stage === "otp" ? (
                <form className="svx-signup-otp" onSubmit={verifyCode}>
                  <button
                    type="button"
                    className="svx-signup-back"
                    onClick={backToDetails}
                    disabled={busy}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>

                  <div className="svx-signup-state-icon svx-signup-state-icon--mail">
                    <Mail size={28} aria-hidden="true" />
                  </div>

                  <h2>Check your email</h2>
                  <p className="svx-signup-description">
                    Enter the six-digit verification code for{" "}
                    <strong>{email}</strong>.
                  </p>

                  <CodeBoxes code={code} setCode={setCode} disabled={busy} />

                  {notice ? <p className="svx-signup-notice" role="status">{notice}</p> : null}
                  {error ? <p className="svx-signup-error" role="alert">{error}</p> : null}

                  <button className="svx-signup-primary" type="submit" disabled={busy}>
                    {busy ? "Verifying..." : "Verify email"}
                  </button>

                  <p className="svx-signup-otp-help">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={requestCode}
                      disabled={busy || resendWait > 0}
                    >
                      {resendWait > 0
                        ? `Resend in ${resendWait}s`
                        : "Resend code"}
                    </button>
                  </p>

                  <button
                    className="svx-signup-text-action"
                    type="button"
                    onClick={backToDetails}
                    disabled={busy}
                  >
                    Change email address
                  </button>
                </form>
              ) : null}

              {stage === "verified" ? (
                <div className="svx-signup-success">
                  <div className="svx-signup-state-icon svx-signup-state-icon--success">
                    <Check size={34} aria-hidden="true" />
                  </div>
                  <h2>Email verified</h2>
                  <p className="svx-signup-description">
                    Your Storvex account has been created successfully.
                  </p>
                  <Link className="svx-signup-primary" to={businessHref}>
                    Continue to business setup <ArrowRight size={17} />
                  </Link>
                  <button
                    type="button"
                    className="svx-signup-switch-account"
                    onClick={useDifferentAccount}
                    disabled={busy}
                  >
                    {busy ? "Signing out..." : "Use a different account"}
                  </button>
                  {error ? (
                    <p className="svx-signup-error" role="alert">{error}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {stage !== "verified" ? (
              <p className="svx-signup-bottom-login">
                Already registered? <Link to="/login">Log in to your account</Link>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
  Moon,
  Sun
} from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { BrandVisual } from "./AccountSignup";
import "./AccountSignup.css";
import "./AccountLogin.css";
import {
  persistAuthSession,
  clearOnboardingState
} from "./Login";
import { queryClient } from "../../lib/queryClient";

const ACCOUNT_ENDPOINT = "/api/auth/account";
const LOGIN_ENDPOINT = "/api/auth/login/unified";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function accountRequest(path, method = "GET", body) {
  const base =
    path === "/me" || path === "/logout"
      ? ACCOUNT_ENDPOINT
      : LOGIN_ENDPOINT;

  const response = await fetch(`${base}${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body
      ? { "Content-Type": "application/json" }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      "We couldn't continue. Please try again."
    );
  }

  return data;
}

function LoginCodeBoxes({ digits, onChange, disabled }) {
  const refs = useRef([]);

  function fillFrom(index, value) {
    const clean = value.replace(/\D/g, "").slice(0, 6);
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      onChange(next);
      return;
    }

    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < 6; i++) {
      next[index + i] = clean[i];
    }

    onChange(next);
    refs.current[Math.min(index + clean.length, 5)]?.focus();
  }

  return (
    <div
      className="svx-signup-codeboxes"
      aria-label="Six-digit verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          aria-label={`Digit ${index + 1}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={digit}
          disabled={disabled}
          required
          onChange={(event) =>
            fillFrom(index, event.target.value)
          }
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (/^\d{1,6}$/.test(pasted.trim())) {
              event.preventDefault();
              fillFrom(index, pasted.trim());
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) {
              const next = [...digits];
              next[index - 1] = "";
              onChange(next);
              refs.current[index - 1]?.focus();
            }

            if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            }

            if (event.key === "ArrowRight" && index < 5) {
              refs.current[index + 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

const EMPTY_CODE = () => Array(6).fill("");

export default function AccountLogin() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [stage, setStage] = useState("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(EMPTY_CODE);
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendWait, setResendWait] = useState(0);
  const pending = useRef(false);

  async function enterExistingBusiness() {
    const response = await fetch("/api/auth/account/workspace/session", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 404 && result?.code === "NO_BUSINESS_MEMBERSHIP") {
      navigate("/business-setup", { replace: true });
      return;
    }
    if (!response.ok || !result?.token || !result?.user?.tenantId) {
      throw new Error(result?.message || "Could not open your business. Please try again.");
    }
    queryClient.clear();
    persistAuthSession(result);
    clearOnboardingState();
    navigate("/app", { replace: true });
  }

  useEffect(() => {
    let cancelled = false;
    accountRequest("/me")
      .then(async (result) => {
        if (cancelled || !result.account) return;
        setStage("authenticated");
        // A valid account session is not by itself a retail session.
        // Only the server-issued membership-bound session can open /app.
        try {
          await enterExistingBusiness();
        } catch (err) {
          if (!cancelled) setError(err.message);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (resendWait <= 0) return undefined;

    const timer = window.setTimeout(
      () => setResendWait((value) => Math.max(0, value - 1)),
      1000
    );

    return () => window.clearTimeout(timer);
  }, [resendWait]);

  async function requestCode(event) {
    event?.preventDefault();
    if (pending.current) return;

    const address = email.trim().toLowerCase();

    if (!EMAIL.test(address) || address.length > 254) {
      setError("Enter a valid email address.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await accountRequest(
        "/request",
        "POST",
        { email: address }
      );

      if (!result.challengeId) {
        throw new Error("Unable to start sign-in. Please try again.");
      }

      setEmail(address);
      setChallengeId(result.challengeId);
      setDigits(EMPTY_CODE());
      setResendWait(65);
      setStage("otp");
      setNotice(
        "If your account is eligible, a code will arrive shortly. " +
        "Check your inbox and spam folder."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function resendCode() {
    if (pending.current || resendWait > 0) return;

    // A new request can invalidate the previous challenge.
    // Never imply that an HTTP 202 guarantees email delivery.
    await requestCode();
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (pending.current) return;

    const code = digits.join("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the complete six-digit code.");
      return;
    }

    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await accountRequest(
        "/verify",
        "POST",
        { challengeId, code }
      );

      if (typeof result.token === "string" && result.token) {
        queryClient.clear();
        persistAuthSession(result);
        clearOnboardingState();
        setChallengeId("");
        setDigits(EMPTY_CODE());
        navigate("/app", { replace: true });
        return;
      }

      if (result.authenticated !== true) {
        throw new Error("We couldn't verify your sign-in.");
      }

      setChallengeId("");
      setDigits(EMPTY_CODE());
      setStage("authenticated");
      await enterExistingBusiness();
    } catch (err) {
      setError(err.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function changeEmail() {
    if (busy) return;
    setStage("email");
    setChallengeId("");
    setDigits(EMPTY_CODE());
    setError("");
    setNotice("");
    setResendWait(0);
  }

  async function useDifferentAccount() {
    if (pending.current) return;

    pending.current = true;
    setBusy(true);
    setError("");

    try {
      await accountRequest("/logout", "POST");
      setEmail("");
      setChallengeId("");
      setDigits(EMPTY_CODE());
      setNotice("");
      setResendWait(0);
      setStage("email");
    } catch {
      setError("Couldn't sign out. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="svx-signup svx-account-login">
      <div className="svx-signup-shell">
        <header className="svx-signup-header">
          <Link
            to="/"
            className="svx-signup-logo"
            aria-label="Storvex home"
          >
            <img
              src="/storvex-header-tricolor.png"
              alt="Storvex"
            />
          </Link>

          <div className="svx-signup-header__actions">
            <button
              type="button"
              className="svx-signup-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              title={
                resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {resolvedTheme === "dark"
                ? <Sun size={18} />
                : <Moon size={18} />}
            </button>

            <Link
              to="/signup"
              className="svx-signup-header__login"
            >
              Create account
            </Link>
          </div>
        </header>

        <div className="svx-signup-layout">
          <BrandVisual />

          <div className="svx-signup-main">
            <div className="svx-signup-card">
              {stage === "email" && (
                <form onSubmit={requestCode}>
                  <span className="svx-signup-kicker">
                    Welcome back to Storvex
                  </span>
                  <h2>Log in to your account.</h2>
                  <p className="svx-signup-description">
                    Enter your registered email address.
                    We'll send you a code to sign in securely.
                  </p>

                  <label htmlFor="svx-account-login-email">
                    Email address
                  </label>
                  <input
                    id="svx-account-login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    placeholder="you@example.com"
                    disabled={busy}
                  />

                  {error && (
                    <p className="svx-signup-error" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    className="svx-signup-primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Sending code..." : "Continue with email"}
                    {!busy && (
                      <ArrowRight size={17} aria-hidden="true" />
                    )}
                  </button>


                </form>
              )}

              {stage === "otp" && (
                <form
                  className="svx-signup-otp"
                  onSubmit={verifyCode}
                >
                  <button
                    type="button"
                    className="svx-signup-back"
                    onClick={changeEmail}
                    disabled={busy}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>

                  <div className="svx-signup-state-icon svx-signup-state-icon--mail">
                    <Mail size={28} aria-hidden="true" />
                  </div>

                  <h2>Check your email</h2>
                  <p className="svx-signup-description">
                    Enter the six-digit sign-in code for{" "}
                    <strong>{email}</strong>.
                  </p>

                  <LoginCodeBoxes
                    digits={digits}
                    onChange={setDigits}
                    disabled={busy}
                  />

                  {notice && (
                    <p className="svx-signup-notice" role="status">
                      {notice}
                    </p>
                  )}

                  {error && (
                    <p className="svx-signup-error" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    className="svx-signup-primary"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "Verifying..." : "Verify and log in"}
                  </button>

                  <p className="svx-signup-otp-help">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={resendCode}
                      disabled={busy || resendWait > 0}
                    >
                      {resendWait > 0
                        ? `Resend in ${resendWait}s`
                        : "Resend code"}
                    </button>
                  </p>

                  <button
                    type="button"
                    className="svx-signup-text-action"
                    onClick={changeEmail}
                    disabled={busy}
                  >
                    Change email address
                  </button>
                </form>
              )}

              {stage === "authenticated" && (
                <div className="svx-signup-success">
                  <div className="svx-signup-state-icon svx-signup-state-icon--success">
                    <Check size={34} aria-hidden="true" />
                  </div>

                  <h2>You're signed in</h2>
                  <p className="svx-signup-description">
                    Your Storvex account is ready.
                    Continue to your business.
                  </p>

                  <button
                    type="button"
                    className="svx-signup-primary"
                    onClick={async () => {
                      if (busy) return;
                      setBusy(true);
                      setError("");
                      try { await enterExistingBusiness(); }
                      catch (err) { setError(err.message); }
                      finally { setBusy(false); }
                    }}
                    disabled={busy}
                  >
                    {busy ? "Opening your business..." : "Continue to your business"}
                    <ArrowRight size={17} />
                  </button>

                  <button
                    type="button"
                    className="svx-signup-switch-account"
                    onClick={useDifferentAccount}
                    disabled={busy}
                  >
                    {busy
                      ? "Signing out..."
                      : "Use a different account"}
                  </button>

                  {error && (
                    <p className="svx-signup-error" role="alert">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {stage !== "authenticated" && (
              <p className="svx-account-login-bottom">
                New to Storvex?{" "}
                <Link to="/signup">Create an account</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import OnboardingShell from "../../components/onboarding/OnboardingShell";
import {
  readOnboardingState,
  saveOnboardingState,
} from "../../components/onboarding/onboardingStorage";
import AsyncButton from "../../components/ui/AsyncButton";
import apiClient from "../../services/apiClient";

const RESEND_SECONDS = 45;
const OTP_LENGTH = 6;
const PASSWORD_DRAFT_KEY = "storvex_ownerPasswordDraft";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeContact(value) {
  return cleanString(value).toLowerCase();
}

function getContactKey(value) {
  return encodeURIComponent(normalizeContact(value));
}

function getSentKey(intentId, channel, contactValue) {
  return `storvex_otp_sent_${intentId}_${channel}_${getContactKey(contactValue)}`;
}

function getVerifiedContactStorageKey(channel) {
  return channel === "EMAIL" ? "storvex_emailVerifiedFor" : "storvex_phoneVerifiedFor";
}

function contactMatches(savedContact, currentContact) {
  return Boolean(savedContact) && normalizeContact(savedContact) === normalizeContact(currentContact);
}

function readPasswordDraft() {
  try {
    return sessionStorage.getItem(PASSWORD_DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

function savePasswordDraft(password) {
  try {
    if (password) {
      sessionStorage.setItem(PASSWORD_DRAFT_KEY, password);
    } else {
      sessionStorage.removeItem(PASSWORD_DRAFT_KEY);
    }
  } catch {
    // Ignore storage failures. The user can still continue while the tab is open.
  }
}

function maskEmail(email) {
  const value = cleanString(email);
  if (!value.includes("@")) return value || "—";

  const [name, domain] = value.split("@");
  const start = name.slice(0, 2);
  const end = name.length > 4 ? name.slice(-1) : "";

  return `${start}${"•".repeat(Math.max(4, name.length - 3))}${end}@${domain}`;
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

function formatCountdown(seconds) {
  return `00:${String(Math.max(0, seconds)).padStart(2, "0")}`;
}

function EmailIllustration({ verified }) {
  return (
    <div className="relative h-[118px] w-[154px]" aria-hidden="true">
      <div className="absolute bottom-0 left-1/2 h-[70px] w-[124px] -translate-x-1/2 overflow-hidden rounded-[14px] bg-gradient-to-br from-[#2563eb] to-[#60a5fa] shadow-[0_18px_45px_rgba(37,99,235,0.24)]">
        <div className="absolute inset-x-0 top-0 h-0 w-0 border-l-[62px] border-r-[62px] border-t-[38px] border-l-transparent border-r-transparent border-t-white/30" />
        <div className="absolute bottom-0 left-0 h-0 w-0 border-b-[40px] border-l-[62px] border-b-white/10 border-l-transparent" />
        <div className="absolute bottom-0 right-0 h-0 w-0 border-b-[40px] border-r-[62px] border-b-white/10 border-r-transparent" />
      </div>

      <div className="absolute left-1/2 top-0 h-[78px] w-[106px] -translate-x-1/2 rounded-[12px] border border-[#dbeafe] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.12)]">
        <div className="mx-auto mt-5 h-2 w-12 rounded-full bg-[#bfdbfe]" />
        <div className="mx-auto mt-4 h-2 w-[72px] rounded-full bg-[#dbeafe]" />
        <div className="mx-auto mt-4 h-2 w-10 rounded-full bg-[#bfdbfe]" />
      </div>

      <div
        className={cx(
          "absolute bottom-[5px] right-[8px] flex h-8 w-8 items-center justify-center rounded-full border-[4px] border-white text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]",
          verified ? "bg-emerald-500" : "bg-[#2563eb]",
        )}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 12.5L10.25 15.75L17.5 8.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function PhoneIllustration({ verified }) {
  return (
    <div className="relative h-[118px] w-[154px]" aria-hidden="true">
      <div className="absolute bottom-0 left-[26px] h-[104px] w-[58px] rounded-[17px] border-[5px] border-[#1d4ed8] bg-gradient-to-b from-[#60a5fa] to-[#dbeafe] shadow-[0_18px_45px_rgba(37,99,235,0.24)]">
        <div className="mx-auto mt-2 h-1.5 w-5 rounded-full bg-[#1d4ed8]/35" />
        <div className="absolute inset-x-3 bottom-3 h-11 rounded-[12px] bg-white/35" />
      </div>

      <div className="absolute right-[6px] top-[35px] flex h-[46px] w-[104px] items-center justify-center gap-2 rounded-[13px] border border-[#dbeafe] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.14)]">
        {[0, 1, 2, 3].map((item) => (
          <span
            key={item}
            className={cx(
              "h-2.5 w-2.5 rounded-full",
              verified ? "bg-emerald-500" : "bg-[#2563eb]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 10V8.25C8 5.9 9.68 4.25 12 4.25C14.32 4.25 16 5.9 16 8.25V10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.75 10H17.25C18.08 10 18.75 10.67 18.75 11.5V18.25C18.75 19.08 18.08 19.75 17.25 19.75H6.75C5.92 19.75 5.25 19.08 5.25 18.25V11.5C5.25 10.67 5.92 10 6.75 10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M12 14V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5L19 6.5V11.5C19 16 16.15 19.25 12 20.5C7.85 19.25 5 16 5 11.5V6.5L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 12L11 14.25L15.5 9.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.75 12C4.55 7.85 7.7 5.75 12 5.75C16.3 5.75 19.45 7.85 21.25 12C19.45 16.15 16.3 18.25 12 18.25C7.7 18.25 4.55 16.15 2.75 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 14.75C13.52 14.75 14.75 13.52 14.75 12C14.75 10.48 13.52 9.25 12 9.25C10.48 9.25 9.25 10.48 9.25 12C9.25 13.52 10.48 14.75 12 14.75Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 3.5L20.5 20.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.3 5.98C10.14 5.83 11.04 5.75 12 5.75C16.3 5.75 19.45 7.85 21.25 12C20.62 13.45 19.82 14.65 18.84 15.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.12 14.12C13.58 14.58 12.83 14.86 12 14.75C10.48 14.55 9.45 13.52 9.25 12C9.14 11.17 9.42 10.42 9.88 9.88"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6.55 7.3C4.95 8.35 3.68 9.92 2.75 12C4.55 16.15 7.7 18.25 12 18.25C13.35 18.25 14.58 18.04 15.68 17.62"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DigitCodeInput({ value, onChange, disabled, label }) {
  const inputRefs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || "");

  function updateDigit(index, nextValue) {
    const clean = nextValue.replace(/[^\d]/g, "");

    if (clean.length > 1) {
      const pasted = clean.slice(0, OTP_LENGTH);
      onChange(pasted);

      const nextIndex = Math.min(pasted.length, OTP_LENGTH) - 1;
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = clean;
    onChange(nextDigits.join(""));

    if (clean && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2.5" role="group" aria-label={label}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          className="h-[42px] w-[42px] rounded-[8px] border border-[var(--onboard-border)] bg-[var(--onboard-card)] text-center text-lg font-black text-[var(--onboard-text)] outline-none transition focus:border-[var(--onboard-primary)] focus:ring-2 focus:ring-[rgba(37,99,235,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
          value={digit}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`${label} digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

function getCodeActionLabel({ verified, sending, cooldown, hasSentCode }) {
  if (verified) return "Verified";
  if (sending) return "Sending code...";
  if (cooldown > 0) return "Resend code";
  return hasSentCode ? "Resend code" : "Send code";
}

function VerificationPanel({
  type,
  title,
  instruction,
  maskedDestination,
  verified,
  code,
  setCode,
  sending,
  verifying,
  cooldown,
  hasSentCode,
  onSend,
}) {
  const isEmail = type === "email";
  const disabled = verified || sending || verifying;
  const actionLabel = getCodeActionLabel({ verified, sending, cooldown, hasSentCode });

  return (
    <section className="relative overflow-hidden rounded-[18px] border border-[var(--onboard-border)] bg-[var(--onboard-card)] shadow-[0_24px_70px_rgba(15,45,90,0.06)]">
      <div className="absolute left-5 top-5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--onboard-primary)] text-xs font-black text-white">
        2
      </div>

      <div className="grid min-h-[278px] gap-4 px-8 pb-6 pt-9 md:grid-cols-[148px_minmax(0,1fr)] md:items-center md:px-8">
        <div className="flex justify-center md:justify-start">
          {isEmail ? (
            <EmailIllustration verified={verified} />
          ) : (
            <PhoneIllustration verified={verified} />
          )}
        </div>

        <div className="text-center md:text-left">
          <h3 className="text-[23px] font-black tracking-[-0.04em] text-[var(--onboard-text)]">
            {title}
          </h3>

          <p className="mt-3 text-sm font-semibold leading-5 text-[var(--onboard-muted)]">
            {instruction}
          </p>

          <p className="mt-1 text-sm font-black text-[var(--onboard-text)]">
            {maskedDestination}
          </p>

          <div className="mt-5">
            <DigitCodeInput
              value={code}
              onChange={(nextValue) =>
                setCode(nextValue.replace(/[^\d]/g, "").slice(0, OTP_LENGTH))
              }
              disabled={disabled || !hasSentCode}
              label={`${title} verification code`}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-[var(--onboard-muted)] md:justify-start">
            <span>
              {verified
                ? "Verified."
                : hasSentCode
                  ? "Didn’t receive the code?"
                  : "No code yet?"}
            </span>

            <button
              type="button"
              onClick={onSend}
              disabled={verified || sending || verifying || cooldown > 0}
              className="font-black text-[var(--onboard-primary)] transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLabel}
            </button>

            {!verified && cooldown > 0 ? (
              <span className="font-black text-[var(--onboard-text)]">
                ({formatCountdown(cooldown)})
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function PasswordRule({ valid, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black",
        valid
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-[var(--onboard-card-soft)] text-[var(--onboard-muted)]",
      )}
    >
      <span
        className={cx(
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
          valid
            ? "bg-emerald-500 text-white"
            : "bg-[var(--onboard-border)] text-[var(--onboard-muted)]",
        )}
      >
        {valid ? "✓" : "•"}
      </span>
      {children}
    </span>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  placeholder,
  disabled,
  error,
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-xs font-black text-[var(--onboard-text)]">
        {label}
      </span>

      <div
        className={cx(
          "flex h-14 items-center rounded-[16px] border bg-[var(--onboard-card)] px-4 transition",
          error
            ? "border-red-500/70"
            : "border-[var(--onboard-border)] focus-within:border-[var(--onboard-primary)] focus-within:ring-4 focus-within:ring-[rgba(37,99,235,0.14)]",
          disabled && "opacity-60",
        )}
      >
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-sm font-black text-[var(--onboard-text)] outline-none placeholder:text-[var(--onboard-muted)] disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={onToggleVisible}
          disabled={disabled}
          className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--onboard-primary)] transition hover:bg-[var(--onboard-card-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {error ? (
        <span className="mt-2 block text-xs font-bold text-red-500">{error}</span>
      ) : null}
    </label>
  );
}

function PasswordPanel({
  unlocked,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  passwordVisible,
  setPasswordVisible,
  confirmPasswordVisible,
  setConfirmPasswordVisible,
  passwordLongEnough,
  passwordHasLetter,
  passwordHasNumber,
  passwordHasSpecial,
  passwordsMatch,
}) {
  const hasConfirm = confirmPassword.length > 0;

  return (
    <section className={cx("svx-onboard-card", !unlocked && "opacity-70")}>
      <div className="svx-onboard-card-title-row">
        <div className="svx-onboard-lock-icon">
          <LockIcon />
        </div>

        <div>
          <h3>Create owner password</h3>
          <p>
            After both contact checks are complete, create the password the owner will use to log in.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PasswordField
          id="owner-password"
          label="Password"
          value={password}
          onChange={setPassword}
          visible={passwordVisible}
          onToggleVisible={() => setPasswordVisible((current) => !current)}
          placeholder={unlocked ? "Example: Store@2026" : "Verify email and phone first"}
          disabled={!unlocked}
          error={password.length > 0 && !passwordLongEnough ? "Use at least 8 characters." : ""}
        />

        <PasswordField
          id="owner-confirm-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          visible={confirmPasswordVisible}
          onToggleVisible={() => setConfirmPasswordVisible((current) => !current)}
          placeholder={unlocked ? "Repeat your password" : "Verify email and phone first"}
          disabled={!unlocked}
          error={hasConfirm && !passwordsMatch ? "Passwords do not match." : ""}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <PasswordRule valid={passwordLongEnough}>8+ characters</PasswordRule>
        <PasswordRule valid={passwordHasLetter}>Has letters</PasswordRule>
        <PasswordRule valid={passwordHasNumber}>Has numbers</PasswordRule>
        <PasswordRule valid={passwordHasSpecial}>Has special character</PasswordRule>
        <PasswordRule valid={passwordsMatch && hasConfirm}>Passwords match</PasswordRule>
      </div>
    </section>
  );
}

export default function VerifyOtp() {
  const nav = useNavigate();
  const onboarding = useMemo(() => readOnboardingState(), []);

  const intentId = onboarding?.intentId || localStorage.getItem("storvex_intentId") || "";
  const storeName = onboarding?.storeName || localStorage.getItem("storvex_storeName") || "";
  const ownerEmail = onboarding?.email || localStorage.getItem("storvex_ownerEmail") || "";
  const ownerPhone = onboarding?.phone || localStorage.getItem("storvex_ownerPhone") || "";
  const ownerName = onboarding?.ownerName || localStorage.getItem("storvex_ownerName") || "";

  const savedVerifiedEmail =
    onboarding?.emailVerifiedFor || localStorage.getItem(getVerifiedContactStorageKey("EMAIL")) || "";
  const savedVerifiedPhone =
    onboarding?.phoneVerifiedFor || localStorage.getItem(getVerifiedContactStorageKey("PHONE")) || "";

  const lastEmailAttemptRef = useRef("");
  const lastPhoneAttemptRef = useRef("");

  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const [emailVerified, setEmailVerified] = useState(() => {
    const savedFlag =
      onboarding?.emailVerified ?? localStorage.getItem("storvex_emailVerified") === "true";

    return Boolean(savedFlag && contactMatches(savedVerifiedEmail, ownerEmail));
  });

  const [phoneVerified, setPhoneVerified] = useState(() => {
    const savedFlag =
      onboarding?.phoneVerified ?? localStorage.getItem("storvex_phoneVerified") === "true";

    return Boolean(savedFlag && contactMatches(savedVerifiedPhone, ownerPhone));
  });

  const [emailCodeSent, setEmailCodeSent] = useState(() =>
    Boolean(
      intentId &&
        ownerEmail &&
        localStorage.getItem(getSentKey(intentId, "EMAIL", ownerEmail)) === "true",
    ),
  );

  const [phoneCodeSent, setPhoneCodeSent] = useState(() =>
    Boolean(
      intentId &&
        ownerPhone &&
        localStorage.getItem(getSentKey(intentId, "PHONE", ownerPhone)) === "true",
    ),
  );

  const [password, setPassword] = useState(() => readPasswordDraft());
  const [confirmPassword, setConfirmPassword] = useState(() => readPasswordDraft());
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const contactsVerified = Boolean(emailVerified && phoneVerified);
  const passwordLongEnough = password.length >= 8;
  const passwordHasLetter = /[a-zA-Z]/.test(password);
  const passwordHasNumber = /\d/.test(password);
  const passwordHasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const passwordReady = Boolean(
    contactsVerified &&
      passwordLongEnough &&
      passwordHasLetter &&
      passwordHasNumber &&
      passwordHasSpecial &&
      passwordsMatch,
  );
  const canContinue = passwordReady;

  useEffect(() => {
    if (!intentId || !storeName || !ownerEmail || !ownerPhone) {
      toast.error("Missing setup info. Please start again.");
      nav("/signup", { replace: true });
    }
  }, [intentId, storeName, ownerEmail, ownerPhone, nav]);

  useEffect(() => {
    if (!intentId) return;

    if (!emailVerified && !emailCodeSent && !sendingEmail) {
      send("EMAIL", { automatic: true });
    }

    if (!phoneVerified && !phoneCodeSent && !sendingPhone) {
      send("PHONE", { automatic: true });
    }
  }, [intentId, emailVerified, phoneVerified, emailCodeSent, phoneCodeSent]);

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

  useEffect(() => {
    const code = cleanString(emailCode);

    if (emailVerified || sendingEmail || verifyingEmail) return;
    if (code.length !== OTP_LENGTH) return;
    if (lastEmailAttemptRef.current === code) return;

    const timer = window.setTimeout(() => {
      lastEmailAttemptRef.current = code;
      verify("EMAIL");
    }, 220);

    return () => window.clearTimeout(timer);
  }, [emailCode, emailVerified, sendingEmail, verifyingEmail]);

  useEffect(() => {
    const code = cleanString(phoneCode);

    if (phoneVerified || sendingPhone || verifyingPhone) return;
    if (code.length !== OTP_LENGTH) return;
    if (lastPhoneAttemptRef.current === code) return;

    const timer = window.setTimeout(() => {
      lastPhoneAttemptRef.current = code;
      verify("PHONE");
    }, 220);

    return () => window.clearTimeout(timer);
  }, [phoneCode, phoneVerified, sendingPhone, verifyingPhone]);

  useEffect(() => {
    if (!contactsVerified) {
      savePasswordDraft("");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    savePasswordDraft(password);
  }, [contactsVerified, password]);

  useEffect(() => {
    if (!contactsVerified || !passwordReady) return;

    const current = readOnboardingState() || {};
    saveOnboardingState({
      ...current,
      passwordReady: true,
    });
  }, [contactsVerified, passwordReady]);

  function persistVerifiedFlags(nextEmailVerified, nextPhoneVerified) {
    const current = readOnboardingState() || {};

    const nextEmailVerifiedFor = nextEmailVerified ? ownerEmail : "";
    const nextPhoneVerifiedFor = nextPhoneVerified ? ownerPhone : "";

    const nextState = {
      ...current,
      intentId,
      storeName,
      ownerName: current.ownerName || ownerName,
      email: ownerEmail,
      phone: ownerPhone,
      shopType: current.shopType || localStorage.getItem("storvex_shopType") || "",
      country: current.country || "Rwanda",
      district: current.district || localStorage.getItem("storvex_district") || "",
      sector: current.sector || localStorage.getItem("storvex_sector") || "",
      address: current.address || localStorage.getItem("storvex_address") || "",
      deviceId: current.deviceId || localStorage.getItem("storvex_deviceId") || "",
      emailVerified: Boolean(nextEmailVerified),
      phoneVerified: Boolean(nextPhoneVerified),
      emailVerifiedFor: nextEmailVerifiedFor,
      phoneVerifiedFor: nextPhoneVerifiedFor,
      passwordReady: Boolean(nextEmailVerified && nextPhoneVerified && passwordReady),
    };

    setEmailVerified(Boolean(nextEmailVerified));
    setPhoneVerified(Boolean(nextPhoneVerified));

    localStorage.setItem(getVerifiedContactStorageKey("EMAIL"), nextEmailVerifiedFor);
    localStorage.setItem(getVerifiedContactStorageKey("PHONE"), nextPhoneVerifiedFor);

    saveOnboardingState(nextState);
  }

  async function send(channel, options = {}) {
    const isEmail = channel === "EMAIL";
    const contactValue = isEmail ? ownerEmail : ownerPhone;

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
          const autoCode = String(data.devOtp).replace(/[^\d]/g, "").slice(0, OTP_LENGTH);

        if (autoCode.length === OTP_LENGTH) {
          if (isEmail) {
            setEmailCode(autoCode);
          } else {
            setPhoneCode(autoCode);
          }
        }
      }

      localStorage.setItem(getSentKey(intentId, channel, contactValue), "true");

      if (isEmail) {
        setEmailCodeSent(true);
        setEmailCooldown(RESEND_SECONDS);
      } else {
        setPhoneCodeSent(true);
        setPhoneCooldown(RESEND_SECONDS);
      }

      if (!data?.sent) {
        toast.error(
          data?.sendReason ||
            (isEmail
              ? "Email was not delivered. Check Resend configuration."
              : "SMS was not delivered. Check Twilio configuration.")
        );
        return;
      }

      if (!options.automatic) {
        toast.success(isEmail ? "Email code sent" : "Phone code sent");
      }
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

    if (!code || code.length < OTP_LENGTH) {
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
    if (!contactsVerified) {
      toast.error("Verify both email and phone first");
      return;
    }

    if (!passwordLongEnough) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (!passwordHasLetter || !passwordHasNumber || !passwordHasSpecial) {
      toast.error("Password must include letters, numbers, and a special character.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    savePasswordDraft(password);

    const current = readOnboardingState() || {};
    saveOnboardingState({
      ...current,
      passwordReady: true,
    });

    nav("/owner-payment");
  }

  return (
    <OnboardingShell
      activeStep={2}
      title="Secure your owner account."
      subtitle="Verify the owner email and phone, then create the owner password."
      footer={
        <p className="svx-onboard-login-note">
          Need to change details? <Link to="/signup">Back to business setup</Link>
        </p>
      }
    >
      <form className="svx-onboard-form">
        <div className="svx-onboard-form-heading">
          <div>
            <span className="svx-onboard-step-pill">Step 2 of 3</span>

            <h2>Secure your account.</h2>

            <p>
              Confirm the owner email and phone, then create the password used to access the store.
            </p>
          </div>

          <span className="svx-onboard-safe-pill">
            <span>{canContinue ? "✓" : "2"}</span>
            {canContinue ? "Ready to continue" : contactsVerified ? "Password needed" : "Checks required"}
          </span>
        </div>

        <div className="grid gap-7 lg:grid-cols-2">
          <VerificationPanel
            type="email"
            title="Verify your email"
            instruction={
              sendingEmail && !emailCodeSent
                ? "Sending a verification code to"
                : "We sent a verification code to"
            }
            maskedDestination={maskEmail(ownerEmail)}
            verified={emailVerified}
            code={emailCode}
            setCode={setEmailCode}
            sending={sendingEmail}
            verifying={verifyingEmail}
            cooldown={emailCooldown}
            hasSentCode={emailCodeSent}
            onSend={() => send("EMAIL")}
          />

          <VerificationPanel
            type="phone"
            title="Verify your phone number"
            instruction={
              sendingPhone && !phoneCodeSent
                ? "Sending the 6-digit code to"
                : "Enter the 6-digit code sent to"
            }
            maskedDestination={maskPhone(ownerPhone)}
            verified={phoneVerified}
            code={phoneCode}
            setCode={setPhoneCode}
            sending={sendingPhone}
            verifying={verifyingPhone}
            cooldown={phoneCooldown}
            hasSentCode={phoneCodeSent}
            onSend={() => send("PHONE")}
          />
        </div>

        <PasswordPanel
          unlocked={contactsVerified}
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordVisible={passwordVisible}
          setPasswordVisible={setPasswordVisible}
          confirmPasswordVisible={confirmPasswordVisible}
          setConfirmPasswordVisible={setConfirmPasswordVisible}
          passwordLongEnough={passwordLongEnough}
          passwordHasLetter={passwordHasLetter}
          passwordHasNumber={passwordHasNumber}
          passwordHasSpecial={passwordHasSpecial}
          passwordsMatch={passwordsMatch}
        />

        <section className="svx-onboard-card svx-onboard-next-card">
          <div className="svx-onboard-next-copy">
            <div className="svx-onboard-lock-icon">
              <ShieldIcon />
            </div>

            <div>
              <strong>Next: choose how to start</strong>
              <p>
                {contactsVerified
                  ? passwordReady
                    ? `${storeName || "Your store"} is ready for the start option.`
                    : "Create a strong owner password before choosing the start option."
                  : "Email and phone must be verified before creating the owner password."}
              </p>
            </div>
          </div>

          <AsyncButton
            type="button"
            disabled={!canContinue}
            onClick={continueToActivation}
            className="w-full sm:w-auto"
          >
            Choose how to start
            <span aria-hidden="true">→</span>
          </AsyncButton>
        </section>
      </form>
    </OnboardingShell>
  );
}
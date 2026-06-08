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

  const canContinue = Boolean(emailVerified && phoneVerified);

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
    if (!canContinue) {
      toast.error("Verify both email and phone first");
      return;
    }

    nav("/owner-payment");
  }

  return (
    <OnboardingShell
      activeStep={2}
      title="Secure your owner account."
      subtitle="Verify the owner email and phone before choosing how the store should start."
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
              Confirm the owner email and phone. This protects the store setup, account recovery,
              and activation.
            </p>
          </div>

          <span className="svx-onboard-safe-pill">
            <span>{canContinue ? "✓" : "2"}</span>
            {canContinue ? "Ready to continue" : "Checks required"}
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

        <section className="svx-onboard-card svx-onboard-next-card">
          <div className="svx-onboard-next-copy">
            <div className="svx-onboard-lock-icon">
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
            </div>

            <div>
              <strong>Next: choose how to start</strong>
              <p>
                {storeName || "Your store"} will continue after both contact checks are complete.
              </p>
            </div>
          </div>

          <AsyncButton
            type="button"
            disabled={!canContinue}
            onClick={continueToActivation}
            className="w-full sm:w-auto"
          >
            Continue to activation
            <span aria-hidden="true">→</span>
          </AsyncButton>
        </section>
      </form>
    </OnboardingShell>
  );
}
import {
  ArrowLeft,
  BadgeCheck,
  KeyRound,
  Mail,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  OnboardingCard,
  OnboardingIconBadge,
} from "../../components/onboarding/OnboardingShell";
import AsyncButton from "../../components/ui/AsyncButton";
import {
  requestMarketplaceCustomerPasswordReset,
  resetMarketplaceCustomerPassword,
} from "../../services/marketplaceCustomerAuth";
import {
  MarketplaceHeader,
} from "./MarketplaceHome";

import "../../components/onboarding/Onboarding.css";
import "./MarketplacePublic.css";
import "./MarketplaceCustomerAuth.css";
import "./MarketplaceCustomerPasswordReset.css";

function cleanString(value) {
  return String(value || "").trim();
}

function passwordProblems(value) {
  const password = String(value || "");
  const problems = [];

  if (password.length < 8) {
    problems.push(
      "Use at least 8 characters.",
    );
  }

  if (!/[a-z]/.test(password)) {
    problems.push(
      "Add a lowercase letter.",
    );
  }

  if (!/[A-Z]/.test(password)) {
    problems.push(
      "Add an uppercase letter.",
    );
  }

  if (!/[0-9]/.test(password)) {
    problems.push(
      "Add a number.",
    );
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    problems.push(
      "Add a symbol.",
    );
  }

  return problems;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
}) {
  return (
    <div className="svx-onboard-field">
      <label htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        type="password"
        className="svx-onboard-input"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        required
      />
    </div>
  );
}

export default function MarketplaceCustomerPasswordReset({
  mode = "forgot",
}) {
  const resetting =
    mode === "reset";

  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const token =
    cleanString(
      searchParams.get("token"),
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    setError("");
    setSuccess("");
    setSubmitting(false);
  }, [resetting]);

  function validate() {
    if (!resetting) {
      if (!cleanString(email)) {
        return "Enter your email address.";
      }

      return "";
    }

    if (!token) {
      return "This reset link is invalid or has expired.";
    }

    const problems =
      passwordProblems(password);

    if (problems.length) {
      return problems.join(" ");
    }

    if (
      password !==
      confirmPassword
    ) {
      return "The passwords do not match.";
    }

    return "";
  }

  async function submit(event) {
    event.preventDefault();

    const validationMessage =
      validate();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!resetting) {
        const result =
          await requestMarketplaceCustomerPasswordReset({
            email:
              cleanString(email)
                .toLowerCase(),
          });

        setSuccess(
          result?.message ||
            "Check your email for a password reset link.",
        );

        return;
      }

      const result =
        await resetMarketplaceCustomerPassword({
          token,
          password,
        });

      navigate(
        "/marketplace/account/sign-in",
        {
          replace: true,
          state: {
            passwordReset: true,
            message:
              result?.message ||
              "Password updated. Sign in with your new password.",
          },
        },
      );
    } catch (requestError) {
      const problems =
        requestError?.data?.details
          ?.problems;

      setError(
        Array.isArray(problems) &&
          problems.length
          ? problems.join(" ")
          : requestError?.message ||
              "The request could not be completed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="storvex-landing storvex-marketplace svx-marketplace-auth-page">
      <MarketplaceHeader />

      <main className="storvex-onboarding svx-marketplace-auth-main">
        <div className="svx-marketplace-auth-content svx-marketplace-reset-content">
          <Link
            to="/marketplace/account/sign-in"
            className="svx-marketplace-reset-back"
          >
            <ArrowLeft
              size={17}
              aria-hidden="true"
            />

            Back to sign in
          </Link>

          <header className="svx-marketplace-auth-heading">
            <h1>
              {resetting
                ? "Choose a new password"
                : "Reset your password"}
            </h1>

            <p>
              {resetting
                ? "Create a strong password for your Marketplace account."
                : "Enter your Marketplace email and we will send you a secure reset link."}
            </p>
          </header>

          <form
            onSubmit={submit}
            autoComplete="off"
          >
            <OnboardingCard className="svx-marketplace-auth-card svx-marketplace-reset-card">
              <div className="svx-onboard-card-title-row">
                <OnboardingIconBadge>
                  {resetting ? (
                    <KeyRound
                      size={23}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <Mail
                      size={23}
                      strokeWidth={2.2}
                    />
                  )}
                </OnboardingIconBadge>

                <div>
                  <h3>
                    {resetting
                      ? "New password"
                      : "Account email"}
                  </h3>

                  <p>
                    {resetting
                      ? "This reset link works only once."
                      : "Use the email connected to your customer account."}
                  </p>
                </div>
              </div>

              <div className="svx-onboard-field-group">
                {!resetting ? (
                  <div className="svx-onboard-field">
                    <label htmlFor="marketplace-reset-email">
                      Email
                    </label>

                    <input
                      id="marketplace-reset-email"
                      type="email"
                      inputMode="email"
                      className="svx-onboard-input"
                      value={email}
                      onChange={(event) => {
                        setEmail(
                          event.target.value,
                        );

                        setError("");
                        setSuccess("");
                      }}
                      autoComplete="email"
                      disabled={submitting}
                      required
                      autoFocus
                    />
                  </div>
                ) : (
                  <>
                    <PasswordInput
                      id="marketplace-new-password"
                      label="New password"
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        );

                        setError("");
                      }}
                      autoComplete="new-password"
                      disabled={submitting}
                    />

                    <PasswordInput
                      id="marketplace-confirm-password"
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(
                          event.target.value,
                        );

                        setError("");
                      }}
                      autoComplete="new-password"
                      disabled={submitting}
                    />

                    <p className="svx-onboard-help">
                      At least 8 characters with uppercase,
                      lowercase, a number and a symbol.
                    </p>
                  </>
                )}

                {error ? (
                  <p
                    className="svx-marketplace-auth-error"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                {success ? (
                  <div
                    className="svx-marketplace-reset-success"
                    role="status"
                  >
                    <BadgeCheck
                      size={19}
                      aria-hidden="true"
                    />

                    <p>{success}</p>
                  </div>
                ) : null}

                {!success ? (
                  <AsyncButton
                    type="submit"
                    loading={submitting}
                    loadingText={
                      resetting
                        ? "Updating password..."
                        : "Sending reset link..."
                    }
                    className="svx-marketplace-auth-submit"
                  >
                    {resetting
                      ? "Update password"
                      : "Send reset link"}

                    <span aria-hidden="true">
                      →
                    </span>
                  </AsyncButton>
                ) : (
                  <Link
                    to="/marketplace/account/sign-in"
                    className="svx-marketplace-reset-sign-in"
                  >
                    Return to sign in
                  </Link>
                )}
              </div>
            </OnboardingCard>
          </form>
        </div>
      </main>
    </div>
  );
}

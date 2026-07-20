import {
  BadgeCheck,
  Eye,
  EyeOff,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  OnboardingCard,
  OnboardingIconBadge,
} from "../../components/onboarding/OnboardingShell";
import AsyncButton from "../../components/ui/AsyncButton";
import {
  loginMarketplaceCustomer,
  logoutMarketplaceCustomer,
  registerMarketplaceCustomer,
} from "../../services/marketplaceCustomerAuth";
import {
  MarketplaceHeader,
} from "./MarketplaceHome";
import {
  useMarketplaceCustomerSession,
} from "./MarketplaceCustomerSession";

import "../../components/onboarding/Onboarding.css";
import "./MarketplacePublic.css";
import "./MarketplaceCustomerAuth.css";

function cleanString(value) {
  return String(value || "").trim();
}

function safeReturnPath(value) {
  const path = cleanString(value);

  return path.startsWith("/marketplace")
    ? path
    : "/marketplace";
}

function CustomerPasswordField({
  id,
  value,
  onChange,
  disabled,
}) {
  const [visible, setVisible] =
    useState(false);

  const [editable, setEditable] =
    useState(false);

  return (
    <div className="svx-onboard-field">
      <label htmlFor={id}>
        Password
      </label>

      <div className="svx-marketplace-password-field">
        <input
          id={id}
          name={`${id}-field`}
          type={visible ? "text" : "password"}
          className="svx-onboard-input"
          value={value}
          onChange={onChange}
          onFocus={() => setEditable(true)}
          readOnly={!editable}
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          spellCheck="false"
          disabled={disabled}
          required
        />

        <button
          type="button"
          onClick={() =>
            setVisible(
              (current) => !current,
            )
          }
          aria-label={
            visible
              ? "Hide password"
              : "Show password"
          }
          disabled={disabled}
        >
          {visible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
}

function SignedInAccount({
  customer,
  returnPath,
  signingOut,
  onSignOut,
  error,
}) {
  return (
    <div className="svx-marketplace-auth-content">
      <header className="svx-marketplace-auth-heading">
        <h1>
          Your Marketplace account
        </h1>

        <p>
          Your saved details are ready when you order.
        </p>
      </header>

      <OnboardingCard className="svx-marketplace-auth-card">
        <div className="svx-onboard-card-title-row">
          <OnboardingIconBadge>
            <BadgeCheck
              size={23}
              strokeWidth={2.2}
            />
          </OnboardingIconBadge>

          <div>
            <h3>{customer?.name}</h3>
            <p>{customer?.email}</p>
          </div>
        </div>

        {customer?.phone ? (
          <div className="svx-marketplace-auth-detail">
            <span>Phone</span>
            <strong>{customer.phone}</strong>
          </div>
        ) : null}

        {error ? (
          <p className="svx-marketplace-auth-error">
            {error}
          </p>
        ) : null}

        <div className="svx-marketplace-auth-actions">
          <Link
            to={returnPath}
            className="svx-marketplace-auth-primary-link"
          >
            <ShoppingBag size={17} />
            Continue shopping
          </Link>

          <button
            type="button"
            className="svx-marketplace-auth-secondary"
            onClick={onSignOut}
            disabled={signingOut}
          >
            <LogOut size={17} />

            {signingOut
              ? "Signing out..."
              : "Sign out"}
          </button>
        </div>
      </OnboardingCard>
    </div>
  );
}

export default function MarketplaceCustomerAuth({
  mode = "login",
}) {
  const creating =
    mode === "register";

  const accountPage =
    mode === "account";

  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] =
    useSearchParams();

  const session =
    useMarketplaceCustomerSession({
      verify: true,
    });

  const returnPath = useMemo(
    () =>
      safeReturnPath(
        searchParams.get("returnTo"),
      ),
    [searchParams],
  );

  const [form, setForm] =
    useState({
      name: "",
      email: "",
      phone: "",
      password: "",
    });

  const [submitting, setSubmitting] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setForm({
      name: "",
      email:
        cleanString(
          location.state?.email,
        ),
      phone: "",
      password: "",
    });

    setError("");
    setSubmitting(false);
  }, [
    creating,
    location.state?.email,
  ]);

  useEffect(() => {
    if (session.checking) {
      return;
    }

    if (
      session.signedIn &&
      !accountPage
    ) {
      navigate(
        "/marketplace/account",
        {
          replace: true,
        },
      );

      return;
    }

    if (
      !session.signedIn &&
      accountPage
    ) {
      navigate(
        "/marketplace/account/sign-in",
        {
          replace: true,
        },
      );
    }
  }, [
    accountPage,
    navigate,
    session.checking,
    session.signedIn,
  ]);

  function updateField(
    name,
    value,
  ) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  function validate() {
    if (
      creating &&
      !cleanString(form.name)
    ) {
      return "Enter your full name.";
    }

    if (!cleanString(form.email)) {
      return "Enter your email address.";
    }

    if (!String(form.password || "")) {
      return "Enter your password.";
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

    try {
      const email =
        cleanString(form.email)
          .toLowerCase();

      if (creating) {
        await registerMarketplaceCustomer({
          name:
            cleanString(form.name),
          email,
          phone:
            cleanString(form.phone) ||
            null,
          password:
            String(form.password || ""),
        });

        navigate(
          "/marketplace/account/sign-in",
          {
            replace: true,
            state: {
              accountCreated: true,
              email,
            },
          },
        );

        return;
      }

      await loginMarketplaceCustomer({
        email,
        password:
          String(form.password || ""),
      });

      navigate(
        "/marketplace/account",
        {
          replace: true,
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

  async function signOut() {
    setSigningOut(true);
    setError("");

    try {
      await logoutMarketplaceCustomer();

      navigate(
        "/marketplace/account/sign-in",
        {
          replace: true,
        },
      );
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Could not sign out.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  const switchPath = creating
    ? "/marketplace/account/sign-in"
    : "/marketplace/account/create";

  const switchQuery =
    `?returnTo=${encodeURIComponent(
      returnPath,
    )}`;

  return (
    <div className="svx-marketplace-auth-page">
      <MarketplaceHeader />

      <main className="storvex-onboarding svx-marketplace-auth-main">
        {session.checking ||
        (
          session.signedIn &&
          !accountPage
        ) ||
        (
          !session.signedIn &&
          accountPage
        ) ? (
          <div
            className="svx-marketplace-auth-content"
            aria-busy="true"
            aria-label="Loading customer account"
          >
            <div className="svx-marketplace-auth-skeleton">
              <div className="svx-marketplace-auth-skeleton-heading">
                <span className="svx-marketplace-skeleton-line is-title" />
                <span className="svx-marketplace-skeleton-line is-subtitle" />
              </div>

              <OnboardingCard className="svx-marketplace-auth-skeleton-card">
                <div className="svx-marketplace-auth-skeleton-profile">
                  <span className="svx-marketplace-skeleton-icon" />

                  <div>
                    <span className="svx-marketplace-skeleton-line is-name" />
                    <span className="svx-marketplace-skeleton-line is-email" />
                  </div>
                </div>

                <div className="svx-marketplace-auth-skeleton-detail">
                  <span className="svx-marketplace-skeleton-line is-label" />
                  <span className="svx-marketplace-skeleton-line is-value" />
                </div>

                <div className="svx-marketplace-auth-skeleton-actions">
                  <span className="svx-marketplace-skeleton-button is-primary" />
                  <span className="svx-marketplace-skeleton-button is-secondary" />
                </div>
              </OnboardingCard>
            </div>
          </div>
        ) : session.signedIn ? (
          <SignedInAccount
            customer={session.customer}
            returnPath={returnPath}
            signingOut={signingOut}
            onSignOut={signOut}
            error={error}
          />
        ) : (
          <div className="svx-marketplace-auth-content">
            <header className="svx-marketplace-auth-heading">
              <h1>
                {creating
                  ? "Create your Marketplace account"
                  : "Sign in to Marketplace"}
              </h1>

              <p>
                {creating
                  ? "Save your details for faster ordering."
                  : "Use the email and password connected to your account."}
              </p>
            </header>

            {!creating &&
            location.state?.accountCreated ? (
              <p
                className="svx-marketplace-auth-success"
                role="status"
              >
                Account created. Sign in to continue.
              </p>
            ) : null}

            <form
              onSubmit={submit}
              autoComplete="off"
            >
              <OnboardingCard className="svx-marketplace-auth-card">
                <div className="svx-onboard-card-title-row">
                  <OnboardingIconBadge>
                    <BadgeCheck
                      size={23}
                      strokeWidth={2.2}
                    />
                  </OnboardingIconBadge>

                  <div>
                    <h3>Account details</h3>
                    <p>
                      {creating
                        ? "Enter the details you will use on Marketplace."
                        : "Enter your customer account details."}
                    </p>
                  </div>
                </div>

                <div className="svx-onboard-field-group">
                  {creating ? (
                    <div className="svx-onboard-field">
                      <label>Full name</label>

                      <input
                        type="text"
                        name="marketplace-customer-full-name"
                        className="svx-onboard-input"
                        value={form.name}
                        onChange={(event) =>
                          updateField(
                            "name",
                            event.target.value,
                          )
                        }
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        spellCheck="false"
                        disabled={submitting}
                        required
                      />
                    </div>
                  ) : null}

                  <div className="svx-onboard-field">
                    <label>Email</label>

                    <input
                      type="email"
                      name="marketplace-customer-email"
                      inputMode="email"
                      className="svx-onboard-input"
                      value={form.email}
                      onChange={(event) =>
                        updateField(
                          "email",
                          event.target.value,
                        )
                      }
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-bwignore="true"
                      spellCheck="false"
                      disabled={submitting}
                      required
                    />
                  </div>

                  {creating ? (
                    <div className="svx-onboard-field">
                      <label>
                        Phone
                        <small className="svx-marketplace-auth-optional">
                          Optional
                        </small>
                      </label>

                      <input
                        type="tel"
                        name="marketplace-customer-phone"
                        inputMode="tel"
                        className="svx-onboard-input"
                        value={form.phone}
                        onChange={(event) =>
                          updateField(
                            "phone",
                            event.target.value,
                          )
                        }
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                        spellCheck="false"
                        disabled={submitting}
                      />
                    </div>
                  ) : null}

                  <CustomerPasswordField
                    key={
                      creating
                        ? "marketplace-register-password"
                        : "marketplace-login-password"
                    }
                    id={
                      creating
                        ? "marketplace-register-password"
                        : "marketplace-login-password"
                    }
                    value={form.password}
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value,
                      )
                    }
                    disabled={submitting}
                  />

                  {creating ? (
                    <p className="svx-onboard-help">
                      At least 8 characters with uppercase,
                      lowercase, a number and a symbol.
                    </p>
                  ) : null}

                  {error ? (
                    <p className="svx-marketplace-auth-error">
                      {error}
                    </p>
                  ) : null}

                  <AsyncButton
                    type="submit"
                    loading={submitting}
                    loadingText={
                      creating
                        ? "Creating account..."
                        : "Signing in..."
                    }
                    className="svx-marketplace-auth-submit"
                  >
                    {creating
                      ? "Create account"
                      : "Sign in"}

                    <span aria-hidden="true">→</span>
                  </AsyncButton>
                </div>
              </OnboardingCard>
            </form>

            <p className="svx-marketplace-auth-switch">
              {creating
                ? "Already have an account?"
                : "New to Storvex Marketplace?"}

              <Link
                to={`${switchPath}${switchQuery}`}
              >
                {creating
                  ? "Sign in"
                  : "Create account"}
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

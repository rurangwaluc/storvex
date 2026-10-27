import {
  BadgeCheck,
  Eye,
  EyeOff,
  Heart,
  LogOut,
  PackageCheck,
  Pencil,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useQueryClient,
} from "@tanstack/react-query";
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
import marketplaceQueryKeys from "../../lib/marketplaceQueryKeys";
import {
  getMarketplaceMarkets,
} from "../../services/marketplaceApi";
import {
  loginMarketplaceCustomer,
  logoutMarketplaceCustomer,
  registerMarketplaceCustomer,
} from "../../services/marketplaceCustomerAuth";
import {
  MarketplaceHeader,
} from "./MarketplaceHome";
import MarketplaceCustomerAccountDetails from "./MarketplaceCustomerAccountDetails";
import MarketplaceCustomerOrders from "./MarketplaceCustomerOrders";
import MarketplaceCustomerSavedProducts from "./MarketplaceCustomerSavedProducts";
import {
  useMarketplaceCustomerSession,
} from "./MarketplaceCustomerSession";

import "../../components/onboarding/Onboarding.css";
import "./MarketplacePublic.css";
import "./MarketplaceCustomerPanel.css";
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

function formatCustomerPhone(value) {
  const phone = cleanString(value);

  if (!phone) return "";

  if (phone.startsWith("+")) {
    return phone;
  }

  if (/^\d+$/.test(phone)) {
    return `+${phone}`;
  }

  return phone;
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
  const [section, setSection] =
    useState("orders");

  return (
    <div className="svx-marketplace-auth-content svx-customer-account">
      <header className="svx-customer-account-hero">
        <div>
          <h1>Your Marketplace account</h1>

          <p>
            Follow your orders, saved products and account details.
          </p>
        </div>

        <Link
          to={returnPath}
          className="svx-customer-account-shop-link"
        >
          <ShoppingBag size={17} />
          Continue shopping
        </Link>
      </header>

      <nav
        className="svx-customer-account-nav"
        aria-label="Customer account"
      >
        <button
          type="button"
          className={
            section === "orders"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setSection("orders")
          }
        >
          <PackageCheck size={17} />
          Orders
        </button>

        <button
          type="button"
          className={
            section === "saved"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setSection("saved")
          }
        >
          <Heart size={17} />
          Saved products
        </button>

        <button
          type="button"
          className={
            section === "details"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setSection("details")
          }
        >
          <UserRound size={17} />
          Account details
        </button>
      </nav>

      {section === "orders" ? (
        <MarketplaceCustomerOrders />
      ) : section === "saved" ? (
        <MarketplaceCustomerSavedProducts />
      ) : (
        <MarketplaceCustomerAccountDetails
          customer={customer}
          signingOut={signingOut}
          onSignOut={onSignOut}
          signOutError={error}
        />
      )}
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

  const queryClient = useQueryClient();
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
      countryCode: "",
      password: "",
    });

  const [markets, setMarkets] =
    useState([]);

  const [marketsLoading, setMarketsLoading] =
    useState(false);

  const [marketLoadError, setMarketLoadError] =
    useState("");

  const selectedMarket = useMemo(
    () =>
      markets.find(
        (market) =>
          market.countryCode ===
          cleanString(
            form.countryCode,
          ).toUpperCase(),
      ) || null,
    [
      form.countryCode,
      markets,
    ],
  );

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
      countryCode: "",
      password: "",
    });

    setError("");
    setSubmitting(false);
  }, [
    creating,
    location.state?.email,
  ]);

  useEffect(() => {
    if (!creating) {
      setMarkets([]);
      setMarketLoadError("");
      setMarketsLoading(false);
      return undefined;
    }

    let active = true;

    setMarketsLoading(true);
    setMarketLoadError("");

    getMarketplaceMarkets()
      .then((result) => {
        if (!active) return;

        const available =
          Array.isArray(result?.markets)
            ? result.markets
            : [];

        setMarkets(available);

        setForm((current) => {
          const currentCode =
            cleanString(
              current.countryCode,
            ).toUpperCase();

          const currentExists =
            available.some(
              (market) =>
                market.countryCode ===
                currentCode,
            );

          if (currentExists) {
            return current;
          }

          return {
            ...current,
            countryCode:
              available.length === 1
                ? available[0].countryCode
                : "",
          };
        });
      })
      .catch((requestError) => {
        if (!active) return;

        setMarkets([]);
        setMarketLoadError(
          requestError?.message ||
            "Countries could not be loaded.",
        );
      })
      .finally(() => {
        if (active) {
          setMarketsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [creating]);

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

    if (
      creating &&
      !cleanString(form.countryCode)
    ) {
      return "Choose your country.";
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
          countryCode:
            cleanString(
              form.countryCode,
            ).toUpperCase(),
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

      const loginResult =
        await loginMarketplaceCustomer({
          email,
          password:
            String(form.password || ""),
        });

      if (loginResult?.customer?.id) {
        queryClient.setQueryData(
          marketplaceQueryKeys.customerSession(),
          loginResult.customer,
        );
      }

      queryClient.removeQueries({
        queryKey:
          marketplaceQueryKeys.customerOrders(),
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

      queryClient.removeQueries({
        queryKey:
          marketplaceQueryKeys.customer(),
      });

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
    <div className="storvex-landing storvex-marketplace svx-marketplace-auth-page">
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
              (
                location.state?.accountCreated ||
                location.state?.passwordReset
              ) ? (
                <p
                  className="svx-marketplace-auth-success"
                  role="status"
                >
                  {location.state?.passwordReset
                    ? location.state?.message ||
                      "Password updated. Sign in with your new password."
                    : "Account created. Sign in to continue."}
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

                  {creating ? (
                    <div className="svx-onboard-field">
                      <label>Country</label>

                      <select
                        name="marketplace-customer-country"
                        className="svx-onboard-input"
                        value={form.countryCode}
                        onChange={(event) =>
                          updateField(
                            "countryCode",
                            event.target.value,
                          )
                        }
                        disabled={
                          submitting ||
                          marketsLoading ||
                          Boolean(marketLoadError)
                        }
                        required
                      >
                        {marketsLoading ? (
                          <option value="">
                            Loading countries...
                          </option>
                        ) : null}

                        {!marketsLoading &&
                        !markets.length ? (
                          <option value="">
                            Countries unavailable
                          </option>
                        ) : null}

                        {!marketsLoading &&
                        markets.length > 1 ? (
                          <option value="">
                            Choose your country
                          </option>
                        ) : null}

                        {markets.map((market) => (
                          <option
                            key={market.countryCode}
                            value={market.countryCode}
                          >
                            {market.countryName}
                          </option>
                        ))}
                      </select>

                      {marketLoadError ? (
                        <small className="svx-marketplace-auth-error">
                          {marketLoadError}
                        </small>
                      ) : null}
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
                        placeholder={
                          selectedMarket?.callingCode
                            ? `${selectedMarket.callingCode} mobile number`
                            : "Mobile number"
                        }
                        disabled={submitting}
                      />

                      {selectedMarket ? (
                        <small className="svx-onboard-help">
                          Use a {selectedMarket.countryName} phone number.
                        </small>
                      ) : null}
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

                  {!creating ? (
                    <div className="svx-marketplace-forgot-link">
                      <Link to="/marketplace/account/forgot-password">
                        Forgot password?
                      </Link>
                    </div>
                  ) : null}

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

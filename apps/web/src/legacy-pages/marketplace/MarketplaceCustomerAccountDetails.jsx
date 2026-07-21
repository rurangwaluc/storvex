import {
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Pencil,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import {
  changeMarketplaceCustomerPassword,
  updateMarketplaceCustomerDetails,
} from "../../services/marketplaceCustomerAuth";

function cleanString(value) {
  return String(value || "").trim();
}

function phoneInputValue(value) {
  const digits =
    String(value || "")
      .replace(/\D/g, "");

  if (
    digits.startsWith("2507") &&
    digits.length === 12
  ) {
    return `0${digits.slice(3)}`;
  }

  return value || "";
}

function formatCustomerPhone(value) {
  const digits =
    String(value || "")
      .replace(/\D/g, "");

  const local =
    digits.startsWith("2507") &&
    digits.length === 12
      ? `0${digits.slice(3)}`
      : digits;

  if (
    local.startsWith("07") &&
    local.length === 10
  ) {
    return [
      local.slice(0, 4),
      local.slice(4, 7),
      local.slice(7),
    ].join(" ");
  }

  return value || "Not added";
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
}) {
  const [visible, setVisible] =
    useState(false);

  return (
    <label
      className="svx-customer-account-form-field"
      htmlFor={id}
    >
      <span>{label}</span>

      <div className="svx-customer-account-password-input">
        <input
          id={id}
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete={autoComplete}
          required
        />

        <button
          type="button"
          onClick={() =>
            setVisible(
              (current) => !current,
            )
          }
          disabled={disabled}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {visible ? (
            <EyeOff size={17} />
          ) : (
            <Eye size={17} />
          )}
        </button>
      </div>
    </label>
  );
}

export default function MarketplaceCustomerAccountDetails({
  customer,
  signingOut,
  onSignOut,
  signOutError,
}) {
  const [mode, setMode] =
    useState("view");

  const [details, setDetails] =
    useState({
      name: customer?.name || "",
      phone:
        phoneInputValue(
          customer?.phone,
        ),
    });

  const [passwords, setPasswords] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState(null);

  useEffect(() => {
    setDetails({
      name: customer?.name || "",
      phone:
        phoneInputValue(
          customer?.phone,
        ),
    });
  }, [
    customer?.name,
    customer?.phone,
  ]);

  function closeForm() {
    setMode("view");
    setMessage(null);

    setDetails({
      name: customer?.name || "",
      phone:
        phoneInputValue(
          customer?.phone,
        ),
    });

    setPasswords({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  async function saveDetails(event) {
    event.preventDefault();

    const name =
      cleanString(details.name);

    if (!name) {
      setMessage({
        type: "error",
        text:
          "Enter your full name.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await updateMarketplaceCustomerDetails({
        name,
        phone:
          cleanString(details.phone),
      });

      setMessage({
        type: "success",
        text:
          "Your account details were updated.",
      });

      setMode("view");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          "We could not update your account details.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();

    if (
      passwords.newPassword !==
      passwords.confirmPassword
    ) {
      setMessage({
        type: "error",
        text:
          "The new passwords do not match.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await changeMarketplaceCustomerPassword({
        currentPassword:
          passwords.currentPassword,
        newPassword:
          passwords.newPassword,
      });

      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage({
        type: "success",
        text:
          "Your password was changed.",
      });

      setMode("view");
    } catch (error) {
      const problems =
        error?.data?.details?.problems;

      setMessage({
        type: "error",
        text:
          Array.isArray(problems) &&
          problems.length
            ? problems.join(" ")
            : error?.message ||
              "We could not change your password.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="svx-customer-account-details">
      <div className="svx-customer-account-section-heading">
        <div>
          <h2>Account details</h2>

          <p>
            The details used when you place an order.
          </p>
        </div>

        {mode === "view" ? (
          <button
            type="button"
            className="svx-customer-account-edit"
            onClick={() => {
              setMessage(null);
              setMode("edit");
            }}
          >
            <Pencil size={16} />
            Edit details
          </button>
        ) : (
          <button
            type="button"
            className="svx-customer-account-edit"
            onClick={closeForm}
            disabled={saving}
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      <div className="svx-customer-profile-card">
        <div className="svx-customer-profile-main">
          <span className="svx-customer-profile-icon">
            <BadgeCheck
              size={22}
              strokeWidth={2.2}
            />
          </span>

          <div>
            <h3>{customer?.name}</h3>
            <p>{customer?.email}</p>
          </div>
        </div>

        {message ? (
          <p
            className={[
              "svx-customer-account-message",
              message.type === "error"
                ? "is-error"
                : "is-success",
            ].join(" ")}
            role="status"
          >
            {message.type === "success" ? (
              <Check size={16} />
            ) : null}

            {message.text}
          </p>
        ) : null}

        {signOutError ? (
          <p className="svx-marketplace-auth-error">
            {signOutError}
          </p>
        ) : null}

        {mode === "edit" ? (
          <form
            className="svx-customer-account-form"
            onSubmit={saveDetails}
          >
            <label className="svx-customer-account-form-field">
              <span>Full name</span>

              <input
                type="text"
                value={details.name}
                onChange={(event) =>
                  setDetails(
                    (current) => ({
                      ...current,
                      name:
                        event.target.value,
                    }),
                  )
                }
                disabled={saving}
                autoComplete="name"
                required
              />
            </label>

            <label className="svx-customer-account-form-field">
              <span>Email</span>

              <input
                type="email"
                value={
                  customer?.email || ""
                }
                disabled
                readOnly
              />

              <small>
                Email changes will be added after email verification.
              </small>
            </label>

            <label className="svx-customer-account-form-field">
              <span>Phone</span>

              <input
                type="tel"
                inputMode="tel"
                value={details.phone}
                onChange={(event) =>
                  setDetails(
                    (current) => ({
                      ...current,
                      phone:
                        event.target.value,
                    }),
                  )
                }
                disabled={saving}
                autoComplete="tel"
                placeholder="0785 587 833"
              />
            </label>

            <button
              type="submit"
              className="svx-customer-account-primary-action"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </form>
        ) : mode === "password" ? (
          <form
            className="svx-customer-account-form"
            onSubmit={savePassword}
          >
            <PasswordInput
              id="marketplace-current-password"
              label="Current password"
              value={
                passwords.currentPassword
              }
              onChange={(event) =>
                setPasswords(
                  (current) => ({
                    ...current,
                    currentPassword:
                      event.target.value,
                  }),
                )
              }
              disabled={saving}
              autoComplete="current-password"
            />

            <PasswordInput
              id="marketplace-new-password"
              label="New password"
              value={
                passwords.newPassword
              }
              onChange={(event) =>
                setPasswords(
                  (current) => ({
                    ...current,
                    newPassword:
                      event.target.value,
                  }),
                )
              }
              disabled={saving}
              autoComplete="new-password"
            />

            <PasswordInput
              id="marketplace-confirm-password"
              label="Confirm new password"
              value={
                passwords.confirmPassword
              }
              onChange={(event) =>
                setPasswords(
                  (current) => ({
                    ...current,
                    confirmPassword:
                      event.target.value,
                  }),
                )
              }
              disabled={saving}
              autoComplete="new-password"
            />

            <p className="svx-customer-password-guidance">
              Use at least 8 characters with an uppercase letter,
              lowercase letter, number and symbol.
            </p>

            <button
              type="submit"
              className="svx-customer-account-primary-action"
              disabled={saving}
            >
              {saving
                ? "Changing password..."
                : "Change password"}
            </button>
          </form>
        ) : (
          <>
            <dl className="svx-customer-profile-details is-compact">
              <div>
                <dt>Phone</dt>
                <dd>
                  {formatCustomerPhone(
                    customer?.phone,
                  )}
                </dd>
              </div>
            </dl>

            <div className="svx-customer-account-security">
              <div>
                <KeyRound
                  size={20}
                  aria-hidden="true"
                />

                <div>
                  <strong>Password</strong>
                  <span>
                    Change the password used to sign in.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setMode("password");
                }}
              >
                Change password
              </button>
            </div>
          </>
        )}

        {mode === "view" ? (
          <div className="svx-customer-profile-footer">
            <p>
              Sign out only when you have finished using this device.
            </p>

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
        ) : null}
      </div>
    </section>
  );
}

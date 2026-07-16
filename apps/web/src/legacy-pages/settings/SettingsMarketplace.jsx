import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Check,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  MapPin,
  PackageCheck,
  RefreshCw,
  Save,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  getMarketplaceProfile,
  updateMarketplaceProfile,
} from "../../services/storeApi";
import "./SettingsMarketplace.css";
import "./Settings.css";

const PAYMENT_OPTIONS = [
  {
    value: "CASH_ON_DELIVERY",
    label: "Cash on delivery",
    detail: "Customer pays in cash when the product is handed over.",
  },
  {
    value: "MOMO_ON_DELIVERY",
    label: "MoMo on delivery",
    detail: "Customer pays by Mobile Money when receiving the product.",
  },
  {
    value: "PAY_ON_PICKUP",
    label: "Pay on pickup",
    detail: "Customer completes payment when collecting from the store.",
  },
  {
    value: "SELLER_APPROVED_OTHER",
    label: "Another approved method",
    detail: "The store agrees on another payment method with the customer.",
  },
];

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanString(item))
    .filter(Boolean)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function profileSnapshot(profile) {
  return {
    displayName: profile?.displayName || "",
    description: profile?.description || "",
    publicSlug: profile?.publicSlug || "",
    customerPhone: profile?.customerPhone || "",
    whatsappPhone: profile?.whatsappPhone || "",
    pickupEnabled: profile?.pickupEnabled !== false,
    deliveryEnabled: Boolean(profile?.deliveryEnabled),
    temporarilyClosed: Boolean(profile?.temporarilyClosed),
    defaultDeliveryFee: Number(profile?.defaultDeliveryFee || 0),
    deliveryAreas: normalizeStringList(profile?.deliveryAreas),
    paymentMethods: normalizeStringList(profile?.paymentMethods),
  };
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getErrorCode(error) {
  return (
    error?.code ||
    error?.data?.code ||
    error?.response?.data?.code ||
    ""
  );
}

function getErrorDetails(error) {
  return (
    error?.details ||
    error?.data?.details ||
    error?.response?.data?.details ||
    null
  );
}

function getErrorMessage(error, fallback) {
  return (
    error?.message ||
    error?.data?.message ||
    error?.response?.data?.message ||
    fallback
  );
}

function StatusPill({ tone = "neutral", children }) {
  return (
    <span className={cx("svx-marketplace-status", `is-${tone}`)}>
      {children}
    </span>
  );
}

function ToggleRow({
  title,
  detail,
  checked,
  onChange,
  disabled = false,
  icon: Icon,
}) {
  return (
    <label className={cx("svx-marketplace-toggle-row", disabled && "is-disabled")}>
      <span className="svx-marketplace-toggle-copy">
        <span className="svx-marketplace-toggle-icon">
          <Icon size={18} strokeWidth={2.2} />
        </span>

        <span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />

      <span className="svx-marketplace-switch" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

function ReadinessCard({ check }) {
  const complete = Boolean(check?.done);

  return (
    <article
      className={cx(
        "svx-marketplace-readiness-item",
        complete ? "is-complete" : "is-missing",
      )}
    >
      <span className="svx-marketplace-readiness-icon">
        {complete ? (
          <Check size={17} strokeWidth={2.7} />
        ) : (
          <AlertCircle size={17} strokeWidth={2.4} />
        )}
      </span>

      <div>
        <strong>{check?.label || "Marketplace setup"}</strong>
        <p>{check?.detail || "Complete this setup item."}</p>
      </div>
    </article>
  );
}

function LoadingView() {
  return (
    <div className="svx-marketplace-page">
      <PageSkeleton
        titleWidth="250px"
        subtitleWidth="520px"
        cardCount={5}
      />
    </div>
  );
}

export default function SettingsMarketplace() {
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [form, setForm] = useState(profileSnapshot(null));

  const [deliveryAreaInput, setDeliveryAreaInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activationBusy, setActivationBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const data = await getMarketplaceProfile();
      const nextProfile = data?.profile || null;

      setProfile(nextProfile);
      setStore(data?.store || null);
      setReadiness(data?.readiness || null);
      setForm(profileSnapshot(nextProfile));
    } catch (error) {
      setLoadError(
        getErrorMessage(
          error,
          "Marketplace settings could not be loaded. Check your connection and try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  const dirty = useMemo(() => {
    if (!profile) return false;

    return (
      JSON.stringify(form) !==
      JSON.stringify(profileSnapshot(profile))
    );
  }, [form, profile]);

  const checks = Array.isArray(readiness?.checks)
    ? readiness.checks
    : [];

  const missingChecks = checks.filter((check) => !check?.done);
  const completedChecks = checks.filter((check) => check?.done);
  const visibleChecks = [...missingChecks, ...completedChecks];

  const readinessPercent = Math.max(
    0,
    Math.min(100, Number(readiness?.readinessPercent || 0)),
  );

  const marketplaceEnabled = Boolean(profile?.marketplaceEnabled);
  const marketplaceReady = Boolean(readiness?.ready);

  const publicUrl = form.publicSlug
    ? `/marketplace/${encodeURIComponent(form.publicSlug)}`
    : "";

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function togglePaymentMethod(method) {
    setForm((current) => {
      const methods = normalizeStringList(current.paymentMethods);

      return {
        ...current,
        paymentMethods: methods.includes(method)
          ? methods.filter((item) => item !== method)
          : [...methods, method],
      };
    });
  }

  function addDeliveryArea() {
    const area = cleanString(deliveryAreaInput);

    if (!area) return;

    setForm((current) => ({
      ...current,
      deliveryAreas: normalizeStringList([
        ...current.deliveryAreas,
        area,
      ]),
    }));

    setDeliveryAreaInput("");
  }

  function removeDeliveryArea(area) {
    setForm((current) => ({
      ...current,
      deliveryAreas: current.deliveryAreas.filter(
        (item) => item !== area,
      ),
    }));
  }

  function buildPayload() {
    return {
      displayName: cleanString(form.displayName),
      description: cleanString(form.description),
      publicSlug: cleanString(form.publicSlug),
      customerPhone: cleanString(form.customerPhone),
      whatsappPhone: cleanString(form.whatsappPhone),
      pickupEnabled: Boolean(form.pickupEnabled),
      deliveryEnabled: Boolean(form.deliveryEnabled),
      temporarilyClosed: Boolean(form.temporarilyClosed),
      defaultDeliveryFee: Math.max(
        0,
        Math.round(Number(form.defaultDeliveryFee || 0)),
      ),
      deliveryAreas: normalizeStringList(form.deliveryAreas),
      paymentMethods: normalizeStringList(form.paymentMethods),
    };
  }

  async function saveSettings() {
    setSaving(true);

    try {
      const data = await updateMarketplaceProfile(buildPayload());
      const nextProfile = data?.profile || null;

      setProfile(nextProfile);
      setReadiness(data?.readiness || null);
      setForm(profileSnapshot(nextProfile));

      toast.success("Marketplace settings saved");
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Marketplace settings could not be saved.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeMarketplaceVisibility(enable) {
    if (dirty) {
      toast.error("Save your Marketplace settings first");
      return;
    }

    setActivationBusy(true);

    try {
      const data = await updateMarketplaceProfile({
        marketplaceEnabled: enable,
      });

      const nextProfile = data?.profile || null;

      setProfile(nextProfile);
      setReadiness(data?.readiness || null);
      setForm(profileSnapshot(nextProfile));

      toast.success(
        enable
          ? "Store is now visible on Marketplace"
          : "Store removed from Marketplace",
      );
    } catch (error) {
      const details = getErrorDetails(error);

      if (
        getErrorCode(error) === "MARKETPLACE_NOT_READY" &&
        details
      ) {
        setReadiness(details);
      }

      toast.error(
        getErrorMessage(
          error,
          enable
            ? "Complete the required setup before making the store visible."
            : "The store could not be removed from Marketplace.",
        ),
      );
    } finally {
      setActivationBusy(false);
    }
  }

  if (loading) {
    return <LoadingView />;
  }

  if (loadError) {
    return (
      <section className="svx-marketplace-load-error">
        <span>
          <AlertCircle size={22} strokeWidth={2.4} />
        </span>

        <div>
          <h2>Marketplace is temporarily unavailable</h2>
          <p>{loadError}</p>

          <button type="button" onClick={loadMarketplace}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="svx-marketplace-page">
      <section className="svx-marketplace-hero">
        <div className="svx-marketplace-hero-copy">
          <p className="svx-marketplace-eyebrow">
            Customer discovery
          </p>

          <h1>Marketplace</h1>

          <p>
            Control how customers discover your store, contact you,
            choose pickup or delivery, and pay when products are handed
            over.
          </p>
        </div>

        <div className="svx-marketplace-hero-state">
          <StatusPill
            tone={
              marketplaceEnabled
                ? profile?.temporarilyClosed
                  ? "warning"
                  : "success"
                : marketplaceReady
                  ? "primary"
                  : "neutral"
            }
          >
            {marketplaceEnabled
              ? profile?.temporarilyClosed
                ? "Temporarily closed"
                : "Visible on Marketplace"
              : marketplaceReady
                ? "Ready to publish"
                : "Setup required"}
          </StatusPill>

          <strong>{readinessPercent}% ready</strong>
          <span>
            {readiness?.summary?.done || 0} of{" "}
            {readiness?.summary?.total || checks.length} checks complete
          </span>
        </div>
      </section>

      <section className="svx-marketplace-overview-grid">
        <article className="svx-marketplace-readiness-card">
          <div className="svx-marketplace-section-head">
            <div>
              <p>Store readiness</p>
              <h2>
                {marketplaceReady
                  ? "Ready for customers"
                  : "Complete the missing setup"}
              </h2>
            </div>

            <span className="svx-marketplace-score">
              {readinessPercent}%
            </span>
          </div>

          <div className="svx-marketplace-progress">
            <span style={{ width: `${readinessPercent}%` }} />
          </div>

          <div className="svx-marketplace-readiness-list">
            {visibleChecks.map((check) => (
              <ReadinessCard key={check.key} check={check} />
            ))}
          </div>
        </article>

        <article className="svx-marketplace-visibility-card">
          <div className="svx-marketplace-visibility-icon">
            <ShoppingBag size={24} strokeWidth={2.2} />
          </div>

          <div>
            <p>Public visibility</p>
            <h2>
              {marketplaceEnabled
                ? "Your store can be discovered"
                : "Your store is still private"}
            </h2>

            <span>
              Customers only see products you deliberately publish from
              Stock. Internal products remain private.
            </span>
          </div>

          {marketplaceEnabled && publicUrl ? (
            <Link
              to={publicUrl}
              className="svx-marketplace-public-link"
            >
              Preview public store
              <ExternalLink size={15} />
            </Link>
          ) : null}

          <AsyncButton
            loading={activationBusy}
            loadingText={
              marketplaceEnabled
                ? "Removing store..."
                : "Making store visible..."
            }
            disabled={
              activationBusy ||
              dirty ||
              (!marketplaceEnabled && !marketplaceReady)
            }
            className={cx(
              "svx-marketplace-visibility-button",
              marketplaceEnabled && "is-secondary",
            )}
            onClick={() =>
              changeMarketplaceVisibility(!marketplaceEnabled)
            }
          >
            {marketplaceEnabled
              ? "Remove from Marketplace"
              : "Make store visible"}
          </AsyncButton>

          {dirty ? (
            <small>Save changes before updating visibility.</small>
          ) : null}
        </article>
      </section>

      <section className="svx-marketplace-form-card">
        <div className="svx-marketplace-section-head">
          <div>
            <p>Public store profile</p>
            <h2>What customers will see</h2>
            <span>
              Use clear information that helps a customer trust and
              contact the business.
            </span>
          </div>

          <Store size={23} strokeWidth={2.2} />
        </div>

        <div className="svx-marketplace-form-grid">
          <label className="svx-marketplace-field">
            <span>Public store name</span>
            <input
              value={form.displayName}
              onChange={(event) =>
                updateField("displayName", event.target.value)
              }
              placeholder={store?.name || "Store name"}
              maxLength={180}
            />
          </label>

          <label className="svx-marketplace-field">
            <span>Public store link</span>

            <div className="svx-marketplace-slug-input">
              <small>/marketplace/</small>
              <input
                value={form.publicSlug}
                onChange={(event) =>
                  updateField("publicSlug", event.target.value)
                }
                placeholder="your-store"
                maxLength={72}
              />
            </div>
          </label>

          <label className="svx-marketplace-field is-wide">
            <span>Customer-friendly description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Explain what the store sells and why customers should choose it."
              maxLength={1200}
              rows={5}
            />

            <small>
              {form.description.length}/1200 characters
            </small>
          </label>

          <label className="svx-marketplace-field">
            <span>Customer phone</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.customerPhone}
              onChange={(event) =>
                updateField("customerPhone", event.target.value)
              }
              placeholder="0788 000 000"
            />
          </label>

          <label className="svx-marketplace-field">
            <span>WhatsApp phone</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.whatsappPhone}
              onChange={(event) =>
                updateField("whatsappPhone", event.target.value)
              }
              placeholder="0788 000 000"
            />
          </label>
        </div>
      </section>

      <section className="svx-marketplace-form-card">
        <div className="svx-marketplace-section-head">
          <div>
            <p>Customer handover</p>
            <h2>Pickup and delivery</h2>
            <span>
              The seller remains responsible for confirming every order
              and arranging delivery or pickup.
            </span>
          </div>

          <Truck size={23} strokeWidth={2.2} />
        </div>

        <div className="svx-marketplace-toggle-stack">
          <ToggleRow
            title="Customer pickup"
            detail="Customers can collect confirmed orders from the store."
            checked={form.pickupEnabled}
            onChange={(value) =>
              updateField("pickupEnabled", value)
            }
            icon={Store}
          />

          <ToggleRow
            title="Seller-managed delivery"
            detail="The store confirms the address, fee, and delivery time with the customer."
            checked={form.deliveryEnabled}
            onChange={(value) =>
              updateField("deliveryEnabled", value)
            }
            icon={Truck}
          />

          <ToggleRow
            title="Temporarily closed"
            detail="Keep the public store visible but stop customers from placing new requests."
            checked={form.temporarilyClosed}
            onChange={(value) =>
              updateField("temporarilyClosed", value)
            }
            icon={AlertCircle}
          />
        </div>

        {form.deliveryEnabled ? (
          <div className="svx-marketplace-delivery-panel">
            <label className="svx-marketplace-field">
              <span>Default delivery fee</span>

              <div className="svx-marketplace-money-input">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.defaultDeliveryFee}
                  onChange={(event) =>
                    updateField(
                      "defaultDeliveryFee",
                      event.target.value,
                    )
                  }
                />

                <small>RWF</small>
              </div>
            </label>

            <div className="svx-marketplace-field">
              <span>Delivery areas</span>

              <div className="svx-marketplace-add-area">
                <input
                  value={deliveryAreaInput}
                  onChange={(event) =>
                    setDeliveryAreaInput(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addDeliveryArea();
                    }
                  }}
                  placeholder="Example: Kicukiro"
                  maxLength={120}
                />

                <button type="button" onClick={addDeliveryArea}>
                  Add area
                </button>
              </div>

              <div className="svx-marketplace-area-list">
                {form.deliveryAreas.length ? (
                  form.deliveryAreas.map((area) => (
                    <button
                      type="button"
                      key={area}
                      onClick={() => removeDeliveryArea(area)}
                      title={`Remove ${area}`}
                    >
                      <MapPin size={14} />
                      {area}
                      <span>×</span>
                    </button>
                  ))
                ) : (
                  <small>
                    Add at least one area before enabling delivery.
                  </small>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="svx-marketplace-form-card">
        <div className="svx-marketplace-section-head">
          <div>
            <p>Payment at handover</p>
            <h2>Customer payment choices</h2>
            <span>
              Marketplace orders are not automatically treated as paid
              sales. Payment is completed at delivery or pickup.
            </span>
          </div>

          <CircleDollarSign size={23} strokeWidth={2.2} />
        </div>

        <div className="svx-marketplace-payment-grid">
          {PAYMENT_OPTIONS.map((option) => {
            const selected = form.paymentMethods.includes(option.value);

            return (
              <button
                type="button"
                key={option.value}
                className={cx(
                  "svx-marketplace-payment-option",
                  selected && "is-selected",
                )}
                onClick={() => togglePaymentMethod(option.value)}
              >
                <span className="svx-marketplace-payment-check">
                  {selected ? <Check size={15} /> : null}
                </span>

                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="svx-marketplace-product-guide">
        <div className="svx-marketplace-product-guide-icon">
          <PackageCheck size={24} strokeWidth={2.2} />
        </div>

        <div>
          <p>Product publishing</p>
          <h2>Products are controlled from Stock</h2>
          <span>
            Add the public title, price, description, category, and
            approved cleaned image from each product page.
          </span>
        </div>

        <Link to="/app/inventory">
          Open Stock
          <ChevronRight size={17} />
        </Link>
      </section>

      <div className="svx-marketplace-save-bar">
        <div>
          <Smartphone size={18} strokeWidth={2.2} />

          <span>
            {dirty
              ? "You have unsaved Marketplace changes."
              : "Marketplace settings are saved."}
          </span>
        </div>

        <AsyncButton
          loading={saving}
          loadingText="Saving Marketplace..."
          disabled={!dirty || saving}
          onClick={saveSettings}
        >
          <Save size={16} strokeWidth={2.3} />
          Save Marketplace
        </AsyncButton>
      </div>
    </div>
  );
}

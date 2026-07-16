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
  Settings,
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
    detail: "Customer pays cash when receiving the product.",
  },
  {
    value: "MOMO_ON_DELIVERY",
    label: "MoMo on delivery",
    detail: "Customer pays by Mobile Money when receiving the product.",
  },
  {
    value: "PAY_ON_PICKUP",
    label: "Pay on pickup",
    detail: "Customer pays when collecting from the store.",
  },
  {
    value: "SELLER_APPROVED_OTHER",
    label: "Another agreed method",
    detail: "The store agrees on another payment method with the customer.",
  },
];

const CHECK_LABELS = {
  public_identity: {
    title: "Add a store description",
    detail: "Tell customers what your store sells.",
    link: "#store-profile",
  },
  customer_contact: {
    title: "Add customer contact",
    detail: "Add a phone or WhatsApp number.",
    link: "#store-profile",
  },
  public_link: {
    title: "Choose your store link",
    detail: "Save the public link customers will open.",
    link: "#store-profile",
  },
  fulfilment: {
    title: "Choose pickup or delivery",
    detail: "Tell customers how they can receive products.",
    link: "#orders-delivery",
  },
  payment_methods: {
    title: "Choose payment methods",
    detail: "Select how customers can pay.",
    link: "#payment-choices",
  },
  published_products: {
    title: "Choose a product",
    detail: "Publish at least one product from Stock.",
    link: "/app/inventory",
  },
  available_stock: {
    title: "Check product stock",
    detail: "A published product must have available stock.",
    link: "/app/inventory",
  },
  approved_images: {
    title: "Approve a product photo",
    detail: "Approve one cleaned product photo from Stock.",
    link: "/app/inventory",
  },
};

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

function ToggleRow({
  title,
  detail,
  checked,
  onChange,
  icon: Icon,
}) {
  return (
    <label className="svx-marketplace-toggle-row">
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
        onChange={(event) => onChange(event.target.checked)}
      />

      <span className="svx-marketplace-switch" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

function SetupItem({ check }) {
  const content = CHECK_LABELS[check?.key] || {
    title: check?.label || "Complete setup",
    detail: check?.detail || "Complete this Marketplace step.",
    link: "#store-profile",
  };

  const isPageLink = content.link.startsWith("#");

  const inner = (
    <>
      <span className="svx-marketplace-task-icon">
        <AlertCircle size={17} strokeWidth={2.4} />
      </span>

      <span className="svx-marketplace-task-copy">
        <strong>{content.title}</strong>
        <small>{content.detail}</small>
      </span>

      <ChevronRight size={17} />
    </>
  );

  if (isPageLink) {
    return (
      <a className="svx-marketplace-task" href={content.link}>
        {inner}
      </a>
    );
  }

  return (
    <Link className="svx-marketplace-task" to={content.link}>
      {inner}
    </Link>
  );
}

function LoadingView() {
  return (
    <div className="svx-marketplace-page">
      <PageSkeleton
        titleWidth="220px"
        subtitleWidth="460px"
        cardCount={4}
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
      toast.error("Save your changes first");
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
          ? "Your store is now visible"
          : "Your store is now private",
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
          "Complete the missing setup before making the store visible.",
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
          <h2>Marketplace is unavailable</h2>
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
      <div className="svx-marketplace-page-nav">
        <Link to="/app/settings">
          <Settings size={16} />
          All settings
        </Link>
      </div>

      <section className="svx-marketplace-status-card">
        <div className="svx-marketplace-status-copy">
          <p>Marketplace</p>

          <h1>
            {marketplaceEnabled
              ? profile?.temporarilyClosed
                ? "Your store is temporarily closed"
                : "Your store is visible"
              : "Your store is private"}
          </h1>

          <span>
            {marketplaceEnabled
              ? "Customers can discover the products you publish."
              : marketplaceReady
                ? "Your setup is complete. You can make the store visible."
                : `${missingChecks.length} setup ${
                    missingChecks.length === 1 ? "step" : "steps"
                  } remaining.`}
          </span>
        </div>

        <div className="svx-marketplace-status-actions">
          <div className="svx-marketplace-ready-count">
            <strong>{readinessPercent}%</strong>
            <span>
              {readiness?.summary?.done || 0} of{" "}
              {readiness?.summary?.total || checks.length} complete
            </span>
          </div>

          {marketplaceEnabled && publicUrl ? (
            <Link
              to={publicUrl}
              className="svx-marketplace-preview-link"
            >
              View public store
              <ExternalLink size={15} />
            </Link>
          ) : null}

          <AsyncButton
            loading={activationBusy}
            loadingText="Updating store..."
            disabled={
              activationBusy ||
              dirty ||
              (!marketplaceEnabled && !marketplaceReady)
            }
            className={cx(
              "svx-marketplace-main-action",
              marketplaceEnabled && "is-secondary",
            )}
            onClick={() =>
              changeMarketplaceVisibility(!marketplaceEnabled)
            }
          >
            {marketplaceEnabled
              ? "Make store private"
              : "Make store visible"}
          </AsyncButton>
        </div>
      </section>

      {!marketplaceReady ? (
        <section className="svx-marketplace-setup-card">
          <div className="svx-marketplace-card-heading">
            <div>
              <p>Next steps</p>
              <h2>Finish these {missingChecks.length} steps</h2>
            </div>
          </div>

          <div className="svx-marketplace-task-list">
            {missingChecks.map((check) => (
              <SetupItem key={check.key} check={check} />
            ))}
          </div>

          {completedChecks.length ? (
            <details className="svx-marketplace-completed">
              <summary>
                <Check size={16} />
                {completedChecks.length} completed
              </summary>

              <div>
                {completedChecks.map((check) => (
                  <span key={check.key}>
                    <Check size={14} />
                    {CHECK_LABELS[check.key]?.title || check.label}
                  </span>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="svx-marketplace-products-card">
        <div className="svx-marketplace-products-icon">
          <PackageCheck size={23} strokeWidth={2.2} />
        </div>

        <div>
          <p>Products</p>
          <h2>
            {Number(readiness?.counts?.publishedProducts || 0) > 0
              ? `${readiness.counts.publishedProducts} ${
                  readiness.counts.publishedProducts === 1
                    ? "product is"
                    : "products are"
                } visible`
              : "Choose products customers can see"}
          </h2>

          <span>
            Products stay private until you publish them from Stock.
          </span>
        </div>

        <Link to="/app/inventory">
          Open Stock
          <ChevronRight size={17} />
        </Link>
      </section>

      <section
        id="store-profile"
        className="svx-marketplace-form-card"
      >
        <div className="svx-marketplace-card-heading">
          <div>
            <p>Store profile</p>
            <h2>How customers see your store</h2>
            <span>
              Add the information customers need before contacting you.
            </span>
          </div>

          <Store size={22} />
        </div>

        <div className="svx-marketplace-form-grid">
          <label className="svx-marketplace-field">
            <span>Store name</span>
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
            <span>Store link</span>

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
            <span>Store description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Tell customers what your store sells."
              maxLength={1200}
              rows={4}
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

      <section
        id="orders-delivery"
        className="svx-marketplace-form-card"
      >
        <div className="svx-marketplace-card-heading">
          <div>
            <p>Orders and delivery</p>
            <h2>How customers receive products</h2>
          </div>

          <Truck size={22} />
        </div>

        <div className="svx-marketplace-toggle-stack">
          <ToggleRow
            title="Pickup from store"
            detail="Customers can collect confirmed products from your store."
            checked={form.pickupEnabled}
            onChange={(value) =>
              updateField("pickupEnabled", value)
            }
            icon={Store}
          />

          <ToggleRow
            title="Store delivery"
            detail="Your store confirms the address, fee and delivery time."
            checked={form.deliveryEnabled}
            onChange={(value) =>
              updateField("deliveryEnabled", value)
            }
            icon={Truck}
          />

          <ToggleRow
            title="Temporarily closed"
            detail="Keep the store visible but stop new customer requests."
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
              <span>Usual delivery fee</span>

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
                    >
                      <MapPin size={14} />
                      {area}
                      <span>×</span>
                    </button>
                  ))
                ) : (
                  <small>Add at least one delivery area.</small>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="payment-choices"
        className="svx-marketplace-form-card"
      >
        <div className="svx-marketplace-card-heading">
          <div>
            <p>Payments</p>
            <h2>How customers can pay</h2>
            <span>
              Payment is completed when the product is handed over.
            </span>
          </div>

          <CircleDollarSign size={22} />
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

      {dirty ? (
        <div className="svx-marketplace-save-bar">
          <span>You have unsaved changes.</span>

          <AsyncButton
            loading={saving}
            loadingText="Saving..."
            disabled={saving}
            onClick={saveSettings}
          >
            <Save size={16} strokeWidth={2.3} />
            Save changes
          </AsyncButton>
        </div>
      ) : null}
    </div>
  );
}

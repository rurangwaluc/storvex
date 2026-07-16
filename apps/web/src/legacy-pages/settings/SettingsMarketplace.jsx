import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  MapPin,
  PackageCheck,
  RefreshCw,
  Save,
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
    detail: "Agree on another payment method with the customer.",
  },
];

const CHECK_DETAILS = {
  public_identity: {
    title: "Add store description",
    action: "Add description",
    section: "profile",
  },
  customer_contact: {
    title: "Add customer contact",
    action: "Add contact",
    section: "profile",
  },
  public_link: {
    title: "Choose store link",
    action: "Choose link",
    section: "profile",
  },
  fulfilment: {
    title: "Choose pickup or delivery",
    action: "Choose options",
    section: "delivery",
  },
  payment_methods: {
    title: "Choose payment methods",
    action: "Choose payments",
    section: "payments",
  },
  published_products: {
    title: "Publish one product",
    action: "Open Stock",
    section: "products",
  },
  available_stock: {
    title: "Confirm product stock",
    action: "Check Stock",
    section: "products",
  },
  approved_images: {
    title: "Approve a product photo",
    action: "Open photos",
    section: "products",
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

function SectionCard({
  id,
  section,
  activeSection,
  onOpen,
  eyebrow,
  title,
  summary,
  icon: Icon,
  children,
}) {
  const open = activeSection === section;

  return (
    <section
      id={id}
      className={cx(
        "svx-marketplace-section-card",
        open && "is-open",
      )}
    >
      <button
        type="button"
        className="svx-marketplace-section-toggle"
        onClick={() => onOpen(open ? "" : section)}
        aria-expanded={open}
      >
        <span className="svx-marketplace-section-icon">
          <Icon size={20} strokeWidth={2.2} />
        </span>

        <span className="svx-marketplace-section-copy">
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          <span>{summary}</span>
        </span>

        <span className="svx-marketplace-section-action">
          {open ? "Close" : "Edit"}
          <ChevronDown size={17} />
        </span>
      </button>

      {open ? (
        <div className="svx-marketplace-section-content">
          {children}
        </div>
      ) : null}
    </section>
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
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [form, setForm] = useState(profileSnapshot(null));
  const [activeSection, setActiveSection] = useState("");

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

  const marketplaceEnabled = Boolean(profile?.marketplaceEnabled);
  const marketplaceReady = Boolean(readiness?.ready);

  const publicUrl = form.publicSlug
    ? `/marketplace/${encodeURIComponent(form.publicSlug)}`
    : "";

  const publishedProducts = Number(
    readiness?.counts?.publishedProducts || 0,
  );

  const firstMissing = missingChecks[0] || null;

  const profileSummary = form.description
    ? `${form.displayName || store?.name || "Store"} · Contact details saved`
    : "Add a short description customers can understand";

  const deliverySummary = [
    form.pickupEnabled ? "Pickup" : "",
    form.deliveryEnabled ? "Delivery" : "",
  ]
    .filter(Boolean)
    .join(" and ") || "No receiving option selected";

  const paymentSummary = PAYMENT_OPTIONS
    .filter((option) => form.paymentMethods.includes(option.value))
    .map((option) => option.label)
    .join(", ") || "No payment method selected";

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openSection(section) {
    if (!section) {
      setActiveSection("");
      return;
    }

    if (section === "products") {
      navigate("/app/inventory");
      return;
    }

    setActiveSection(section);

    requestAnimationFrame(() => {
      document
        .getElementById(`marketplace-${section}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function continueSetup() {
    if (!firstMissing) return;

    const details = CHECK_DETAILS[firstMissing.key];
    openSection(details?.section || "profile");
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
      setActiveSection("");

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
        <AlertCircle size={22} />
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
      <section className="svx-marketplace-status-card">
        <div>
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
                ? "Setup is complete. Your store can now be made visible."
                : `${missingChecks.length} ${
                    missingChecks.length === 1 ? "step" : "steps"
                  } remaining.`}
          </span>
        </div>

        <div className="svx-marketplace-status-actions">
          <span>
            {readiness?.summary?.done || 0} of{" "}
            {readiness?.summary?.total || checks.length} complete
          </span>

          {marketplaceEnabled && publicUrl ? (
            <Link to={publicUrl}>
              View store
              <ExternalLink size={15} />
            </Link>
          ) : null}

          {!marketplaceReady ? (
            <button
              type="button"
              className="svx-marketplace-primary-button"
              onClick={continueSetup}
            >
              Continue setup
              <ChevronRight size={17} />
            </button>
          ) : (
            <AsyncButton
              loading={activationBusy}
              loadingText="Updating..."
              disabled={activationBusy || dirty}
              className="svx-marketplace-primary-button"
              onClick={() =>
                changeMarketplaceVisibility(!marketplaceEnabled)
              }
            >
              {marketplaceEnabled
                ? "Make store private"
                : "Make store visible"}
            </AsyncButton>
          )}
        </div>
      </section>

      {!marketplaceReady ? (
        <section className="svx-marketplace-steps-card">
          <div className="svx-marketplace-card-heading">
            <div>
              <p>Next steps</p>
              <h2>Finish Marketplace setup</h2>
            </div>

            <span>{completedChecks.length} completed</span>
          </div>

          <div className="svx-marketplace-steps-list">
            {missingChecks.map((check, index) => {
              const details = CHECK_DETAILS[check.key] || {
                title: check.label,
                action: "Complete",
                section: "profile",
              };

              return (
                <button
                  type="button"
                  key={check.key}
                  onClick={() => openSection(details.section)}
                >
                  <span className="svx-marketplace-step-number">
                    {index + 1}
                  </span>

                  <strong>{details.title}</strong>

                  <span className="svx-marketplace-step-action">
                    {details.action}
                    <ChevronRight size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="svx-marketplace-products-card">
        <span className="svx-marketplace-products-icon">
          <PackageCheck size={22} />
        </span>

        <div>
          <p>Products</p>
          <h2>
            {publishedProducts
              ? `${publishedProducts} ${
                  publishedProducts === 1 ? "product" : "products"
                } visible`
              : "No products visible yet"}
          </h2>
          <span>
            Choose which products customers can see from Stock.
          </span>
        </div>

        <Link to="/app/inventory">
          Choose products
          <ChevronRight size={17} />
        </Link>
      </section>

      <SectionCard
        id="marketplace-profile"
        section="profile"
        activeSection={activeSection}
        onOpen={setActiveSection}
        eyebrow="Store profile"
        title="How customers see your store"
        summary={profileSummary}
        icon={Store}
      >
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
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        id="marketplace-delivery"
        section="delivery"
        activeSection={activeSection}
        onOpen={setActiveSection}
        eyebrow="Pickup and delivery"
        title="How customers receive products"
        summary={deliverySummary}
        icon={Truck}
      >
        <div className="svx-marketplace-toggle-stack">
          <ToggleRow
            title="Pickup from store"
            detail="Customers collect confirmed products from your store."
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
            detail="Keep the store visible but stop new requests."
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
                  placeholder="Example: Kicukiro"
                />

                <button type="button" onClick={addDeliveryArea}>
                  Add
                </button>
              </div>

              <div className="svx-marketplace-area-list">
                {form.deliveryAreas.map((area) => (
                  <button
                    type="button"
                    key={area}
                    onClick={() => removeDeliveryArea(area)}
                  >
                    <MapPin size={14} />
                    {area}
                    <span>×</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        id="marketplace-payments"
        section="payments"
        activeSection={activeSection}
        onOpen={setActiveSection}
        eyebrow="Payments"
        title="How customers can pay"
        summary={paymentSummary}
        icon={CircleDollarSign}
      >
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
      </SectionCard>

      {dirty ? (
        <div className="svx-marketplace-save-bar">
          <span>Unsaved changes</span>

          <AsyncButton
            loading={saving}
            loadingText="Saving..."
            onClick={saveSettings}
          >
            <Save size={16} />
            Save changes
          </AsyncButton>
        </div>
      ) : null}
    </div>
  );
}

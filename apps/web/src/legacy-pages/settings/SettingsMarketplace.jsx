import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
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
    pickupEnabled: Boolean(profile?.pickupEnabled),
    deliveryEnabled: Boolean(profile?.deliveryEnabled),
    temporarilyClosed: Boolean(profile?.temporarilyClosed),
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
  const autoOpenedSection = useRef(false);

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

  const marketplaceEnabled = Boolean(profile?.marketplaceEnabled);
  const marketplaceReady = Boolean(readiness?.ready);

  const publicUrl = form.publicSlug
    ? `/marketplace/${encodeURIComponent(form.publicSlug)}`
    : "";

  const publishedProducts = Number(
    readiness?.counts?.publishedProducts || 0,
  );

  const firstMissing = missingChecks[0] || null;
  const firstMissingDetails = firstMissing
    ? CHECK_DETAILS[firstMissing.key] || null
    : null;

  const storeNeedsAttention =
    marketplaceEnabled && !marketplaceReady;

  const statusTitle = storeNeedsAttention
    ? "Your store needs attention"
    : marketplaceEnabled
      ? "Your store is visible"
      : marketplaceReady
        ? "Your store is ready to open"
        : "Finish setting up your store";

  const statusMessage = storeNeedsAttention
    ? "Complete the missing setup before accepting new customer requests."
    : marketplaceEnabled
      ? "Customers can discover the products you publish."
      : marketplaceReady
        ? "Everything is ready. Open the store when you are ready for customers."
        : "Complete the missing setting below before opening your store.";

  useEffect(() => {
    if (
      autoOpenedSection.current ||
      !firstMissingDetails?.section
    ) {
      return;
    }

    autoOpenedSection.current = true;

    if (firstMissingDetails.section !== "products") {
      setActiveSection(firstMissingDetails.section);
    }
  }, [firstMissingDetails?.section]);

  const profileSummary = form.description
    ? `${form.displayName || store?.name || "Store"} · Contact details saved`
    : "Add a short description customers can understand";

  const deliverySummary = [
    form.pickupEnabled ? "Pickup" : "",
    form.deliveryEnabled ? "Delivery" : "",
  ]
    .filter(Boolean)
    .join(" and ") || "Choose pickup, delivery, or both";

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

  function buildPayload() {
    return {
      displayName: cleanString(form.displayName),
      description: cleanString(form.description),
      publicSlug: cleanString(form.publicSlug),
      pickupEnabled: Boolean(form.pickupEnabled),
      deliveryEnabled: Boolean(form.deliveryEnabled),
      temporarilyClosed: Boolean(form.temporarilyClosed),
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

      toast.success("Marketplace store settings saved");
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
          <p>Marketplace store</p>
          <h1>{statusTitle}</h1>
          <span>{statusMessage}</span>

          {!marketplaceReady && firstMissingDetails ? (
            <strong className="svx-marketplace-status-next">
              Next: {firstMissingDetails.title}
            </strong>
          ) : null}
        </div>

        <div className="svx-marketplace-status-actions">
          {marketplaceEnabled &&
          marketplaceReady &&
          publicUrl ? (
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
              {firstMissingDetails?.action ||
                "Continue setup"}
              <ChevronRight size={17} />
            </button>
          ) : (
            <AsyncButton
              loading={activationBusy}
              loadingText="Updating..."
              disabled={activationBusy || dirty}
              className="svx-marketplace-primary-button"
              onClick={() =>
                changeMarketplaceVisibility(
                  !marketplaceEnabled,
                )
              }
            >
              {marketplaceEnabled
                ? "Make store private"
                : "Open Marketplace store"}
            </AsyncButton>
          )}
        </div>
      </section>

      <SectionCard
        id="marketplace-profile"
        section="profile"
        activeSection={activeSection}
        onOpen={setActiveSection}
        eyebrow="Store details"
        title="Your Marketplace store"
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

          <label className="svx-marketplace-field is-wide">
            <span>Customer contact</span>
            <input
              type="tel"
              value={store?.phone || ""}
              placeholder="Add the business phone in Business settings"
              readOnly
            />
            <small>
              Customers contact this business phone from Marketplace.
              Change it from Business settings.
            </small>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        id="marketplace-delivery"
        section="delivery"
        activeSection={activeSection}
        onOpen={setActiveSection}
        eyebrow="Pickup and delivery"
        title="Pickup and delivery"
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
            title="Delivery from store"
            detail="Free within Kigali. Outside Kigali, agree the delivery cost with the customer."
            checked={form.deliveryEnabled}
            onChange={(value) =>
              updateField("deliveryEnabled", value)
            }
            icon={Truck}
          />

        </div>

        {form.deliveryEnabled ? (
          <div className="svx-marketplace-delivery-panel">
            <div className="svx-marketplace-field">
              <span>Delivery within Kigali</span>
              <strong>Free delivery</strong>
              <small>
                The delivery cost should already be included
                in the product price.
              </small>
            </div>

            <div className="svx-marketplace-field">
              <span>Delivery outside Kigali</span>
              <strong>Cost agreed with the customer</strong>
              <small>
                Confirm the delivery cost before accepting
                the customer request.
              </small>
            </div>
          </div>
        ) : null}
      </SectionCard>

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

      {marketplaceEnabled ? (
      <SectionCard
          id="marketplace-availability"
          section="availability"
          activeSection={activeSection}
          onOpen={setActiveSection}
          eyebrow="Store availability"
          title="Accepting customer requests"
          summary={
            form.temporarilyClosed
              ? "New requests are paused"
              : "Customers can send new requests"
          }
          icon={AlertCircle}
        >
          <div className="svx-marketplace-toggle-stack">
            <ToggleRow
              title="Pause new requests"
              detail="Keep products visible while temporarily stopping new customer requests."
              checked={form.temporarilyClosed}
              onChange={(value) =>
                updateField("temporarilyClosed", value)
              }
              icon={AlertCircle}
            />
          </div>
        </SectionCard>
      ) : null}

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

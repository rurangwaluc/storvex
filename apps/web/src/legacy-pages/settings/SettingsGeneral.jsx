import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { getUserRole } from "../../utils/role";
import {
  createLogoUploadUrl,
  getDocumentSettings,
  getStoreProfile,
  getStoreSetupChecklist,
  updateStoreProfile,
  uploadFileToSignedUrl,
} from "../../services/storeApi";
import "./SettingsGeneral.css";
import "./Settings.css";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function inputClass() {
  return "svx-settings-input";
}

function fieldLabel() {
  return "svx-settings-field-label";
}

function fieldHelp() {
  return "svx-settings-field-help";
}

function cardClass() {
  return "svx-settings-card";
}

function panelClass() {
  return "svx-settings-panel";
}

function readOnlyInputState(disabled) {
  return disabled ? "is-readonly" : "";
}

const STORE_CATEGORY_OPTIONS = [
  {
    value: "",
    label: "Select business category",
    helper: "Choose the retail type this workspace is built for.",
  },
  {
    value: "ELECTRONICS",
    label: "Electronics retailers",
    helper: "Phones, laptops, accessories, warranties, repairs, and serial/IMEI-ready stock.",
  },
  {
    value: "HARDWARE",
    label: "Hardware / Quincaillerie",
    helper: "Materials, sizes, units, packs, supplier restock, and fast-moving construction items.",
  },
  {
    value: "HOME_KITCHEN",
    label: "Home & kitchen materials",
    helper: "Sets, colors, room use, materials, brands, and marketplace-ready product groups.",
  },
  {
    value: "LIGHTING",
    label: "Lighting businesses",
    helper: "Wattage, voltage, bulb types, indoor/outdoor use, warranty, and stock balance.",
  },
  {
    value: "SPARE_PARTS",
    label: "Spare parts businesses",
    helper: "Part numbers, compatibility, condition, warranty, and model-driven demand.",
  },
];

function normalizeStoreCategory(value) {
  const raw = cleanString(value).toUpperCase();

  if (!raw) return "";

  if (
    [
      "ELECTRONICS",
      "ELECTRONICS_RETAIL",
      "PHONE_SHOP",
      "LAPTOP_SHOP",
      "ACCESSORIES_SHOP",
      "REPAIR_SHOP",
      "MIXED_ELECTRONICS",
    ].includes(raw)
  ) {
    return "ELECTRONICS";
  }

  if (raw === "HARDWARE" || raw === "QUINCAILLERIE") return "HARDWARE";
  if (raw === "HOME_KITCHEN" || raw === "HOME_AND_KITCHEN") return "HOME_KITCHEN";
  if (raw === "LIGHTING" || raw === "LIGHTING_BUSINESS") return "LIGHTING";
  if (raw === "SPARE_PARTS" || raw === "SPARE_PARTS_BUSINESS") return "SPARE_PARTS";

  return raw;
}


function businessCategoryDisplay(value) {
  const normalized = normalizeStoreCategory(value);

  switch (normalized) {
    case "ELECTRONICS":
      return {
        title: "Electronics store",   };
    case "HARDWARE":
      return {
        title: "Hardware store",
        
      };
    case "HOME_KITCHEN":
      return {
        title: "Home & kitchen store", 
      };
    case "LIGHTING":
      return {
        title: "Lighting store",};
    case "SPARE_PARTS":
      return {
        title: "Spare parts store",   };
    default:
      return {
        title: "Not configured",
        note: "This workspace has no business type selected yet.",
        detail: "Complete setup before using category-specific tools and pages.",
      };
  }
}

function initialsFromName(name) {
  const parts = cleanString(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return "SV";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function profileSnapshot(value) {
  return {
    name: value?.name || "",
    email: value?.email || "",
    phone: value?.phone || "",
    shopType: normalizeStoreCategory(value?.shopType),
    district: value?.district || "",
    sector: value?.sector || "",
    address: value?.address || "",
    logoUrl: value?.logoUrl || "",
    logoKey: value?.logoKey || "",
    countryCode: value?.countryCode || "RW",
    currencyCode: value?.currencyCode || "RWF",
    timezone: value?.timezone || "Africa/Kigali",
    cashDrawerBlockCashSales: Boolean(value?.cashDrawerBlockCashSales),
  };
}

function Badge({ children, tone = "neutral" }) {
  return <span className={cx("svx-settings-badge", `is-${tone}`)}>{children}</span>;
}

function SectionHeading({ eyebrow, title, subtitle, action = null }) {
  return (
    <div className="svx-settings-section-head">
      <div>
        {eyebrow ? <p className="svx-settings-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <div className="svx-settings-section-action">{action}</div> : null}
    </div>
  );
}


function documentTaxModeLabel(value) {
  const mode = cleanString(value).toUpperCase();

  if (mode === "VAT_18") return "VAT 18%";
  if (mode === "TURNOVER_3_INTERNAL") return "Turnover 3%";
  if (mode === "VAT_18_PLUS_TURNOVER_3") return "VAT + turnover";
  if (mode === "CUSTOM") return "Custom tax";
  if (mode === "NONE") return "No tax";

  return mode ? mode.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()) : "No tax";
}

function SummaryMetric({ label, value, note, tone = "neutral" }) {
  return (
    <article className={cx("svx-settings-summary-card", `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

function ChecklistRow({ item }) {
  const done = Boolean(item?.done);

  return (
    <div className="svx-settings-check-row">
      <div>
        <strong>{item?.label || "Setup item"}</strong>
        <p>{item?.detail || "Complete this item to keep the store ready."}</p>
      </div>
      <Badge tone={done ? "success" : item?.required ? "warning" : "neutral"}>
        {done ? "Done" : item?.required ? "Required" : "Optional"}
      </Badge>
    </div>
  );
}

function DocumentSummary({ documentSettings }) {
  const taxLabel = documentSettings?.taxSummary?.label || "No tax shown on customer documents";
  const headerLabel = String(documentSettings?.documentHeaderDisplay || "LOGO_AND_NAME")
    .replaceAll("_", " ")
    .toLowerCase();

  return (
    <section className={cx(cardClass(), "svx-settings-doc-card")}>
      <SectionHeading
        eyebrow="Documents"
        title="Document settings are separate"
        subtitle="Receipts, invoice terms, tax display, document numbers, and print behavior now live in one focused page. General stays clean for store identity only."
      />

      <div className="svx-settings-doc-action-row">
        <div>
          <strong>Need receipt, invoice, tax, or print controls?</strong>
          <p>Open the focused Documents page when you want to change customer-facing documents.</p>
        </div>

        <Link to="/app/settings/documents" className="svx-settings-primary-link">
          Open document settings
        </Link>
      </div>

      <div className="svx-settings-doc-summary-grid">
        <SummaryMetric label="Receipt prefix" value={documentSettings?.receiptPrefix || "RCT"} note="Receipt number setup" tone="primary" />
        <SummaryMetric label="Invoice prefix" value={documentSettings?.invoicePrefix || "INV"} note="Invoice number setup" tone="neutral" />
        <SummaryMetric label="Header style" value={headerLabel} note="How documents start" tone="neutral" />
        <SummaryMetric label="Tax behavior" value={documentTaxModeLabel(documentSettings?.taxMode)} note={taxLabel} tone="warning" />
      </div>
    </section>
  );
}


function BusinessCategoryLock({ value }) {
  const category = businessCategoryDisplay(value);

  return (
    <div className="svx-settings-category-lock">
      <label className={fieldLabel()}>Business setup</label>

      <div className="svx-settings-locked-category-card">
        <div className="svx-settings-locked-category-main">
          <span>Business type</span>
          <strong>{category.title}</strong>
          <p>{category.note}</p>
        </div>

        <Badge tone="primary">Configured</Badge>
      </div>

      <p className={fieldHelp()}>{category.detail}</p>
    </div>
  );
}

function StoreIdentityForm({ form, setForm, disabled, fileInputRef, uploadingLogo, selectedLogoName, onLogoSelected }) {
  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className={cardClass()}>
      <SectionHeading
        eyebrow="Identity"
        title="Store identity"
        subtitle="The identity customers and staff see across sales, documents, reports, branch tools, and marketplace features."
      />

      <div className="svx-settings-identity-shell">
        <div className="svx-settings-logo-panel">
          <div className="svx-settings-logo-preview">
            {form.logoUrl ? <img src={form.logoUrl} alt="Store logo" /> : <span>{initialsFromName(form.name)}</span>}
          </div>

          <div>
            <strong>Store logo</strong>
            <p>Use a clean square logo. It appears in documents and store identity areas.</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={disabled || uploadingLogo}
            onChange={(event) => onLogoSelected(event.target.files?.[0] || null)}
          />

          <button
            type="button"
            className="svx-settings-secondary-button"
            disabled={disabled || uploadingLogo}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingLogo ? "Uploading..." : "Upload logo"}
          </button>

          {selectedLogoName ? <p className="svx-settings-logo-file">{selectedLogoName}</p> : null}
        </div>

        <div className="svx-settings-form-grid">
          <div>
            <label className={fieldLabel()}>Store name</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.name}
              disabled={disabled}
              onChange={(event) => setField("name", event.target.value)}
            />
          </div>

          <BusinessCategoryLock value={form.shopType} />

          <div>
            <label className={fieldLabel()}>Email</label>
            <input
              type="email"
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.email}
              disabled={disabled}
              onChange={(event) => setField("email", event.target.value)}
            />
          </div>

          <div>
            <label className={fieldLabel()}>Phone</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.phone}
              disabled={disabled}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </div>

          <div>
            <label className={fieldLabel()}>District</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.district}
              disabled={disabled}
              onChange={(event) => setField("district", event.target.value)}
            />
          </div>

          <div>
            <label className={fieldLabel()}>Sector</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.sector}
              disabled={disabled}
              onChange={(event) => setField("sector", event.target.value)}
            />
          </div>

          <div className="svx-settings-span-2">
            <label className={fieldLabel()}>Address</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.address}
              disabled={disabled}
              onChange={(event) => setField("address", event.target.value)}
            />
          </div>

          <div>
            <label className={fieldLabel()}>Country code</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.countryCode}
              disabled={disabled}
              onChange={(event) => setField("countryCode", event.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className={fieldLabel()}>Currency</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.currencyCode}
              disabled={disabled}
              onChange={(event) => setField("currencyCode", event.target.value.toUpperCase())}
            />
          </div>

          <div className="svx-settings-span-2">
            <label className={fieldLabel()}>Timezone</label>
            <input
              className={cx(inputClass(), readOnlyInputState(disabled))}
              value={form.timezone}
              disabled={disabled}
              onChange={(event) => setField("timezone", event.target.value)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SettingsGeneral() {
  const role = useMemo(() => getUserRole(), []);
  const isOwner = role === "OWNER";
  const isReadOnly = !isOwner;
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [documentSettings, setDocumentSettings] = useState(null);
  const [form, setForm] = useState(profileSnapshot(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedLogoName, setSelectedLogoName] = useState("");

  useEffect(() => {
    let alive = true;

    Promise.allSettled([getStoreProfile(), getStoreSetupChecklist(), getDocumentSettings()])
      .then(([profileRes, checklistRes, docsRes]) => {
        if (!alive) return;

        if (profileRes.status === "fulfilled") {
          const nextProfile = profileRes.value?.profile || null;
          setProfile(nextProfile);
          setForm(profileSnapshot(nextProfile));
        }

        if (checklistRes.status === "fulfilled") {
          setChecklist(checklistRes.value);
        }

        if (docsRes.status === "fulfilled") {
          setDocumentSettings(docsRes.value?.documentSettings || null);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return JSON.stringify(form) !== JSON.stringify(profileSnapshot(profile));
  }, [form, profile]);

  const checks = Array.isArray(checklist?.checks) ? checklist.checks : [];
  const missingRequired = checks.filter((item) => item?.required && !item?.done);
  const visibleChecks = [...missingRequired, ...checks.filter((item) => !item?.required || item?.done)].slice(0, 6);
  const readinessPercent = Number(checklist?.readinessPercent || 0);
  const isOperationallyReady = Boolean(checklist?.isOperationallyReady);

  async function refreshChecklist() {
    const data = await getStoreSetupChecklist();
    setChecklist(data);
  }

  async function onSave() {
    if (isReadOnly) {
      toast.error("Only the owner can update store profile");
      return;
    }

    if (!dirty || saving) return;
    setSaving(true);

    try {
      const data = await updateStoreProfile({
        ...form,
        shopType: normalizeStoreCategory(profile?.shopType || form.shopType),
        logoUrl: cleanString(form.logoUrl) || null,
        logoKey: cleanString(form.logoKey) || null,
      });

      const nextProfile = data?.profile || null;
      setProfile(nextProfile);
      setForm(profileSnapshot(nextProfile));
      await refreshChecklist();
      toast.success("Store profile updated");
    } catch (error) {
      toast.error(error?.message || "Failed to save store profile");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoSelected(file) {
    if (!file) return;

    if (isReadOnly) {
      toast.error("Only the owner can upload a logo");
      return;
    }

    setSelectedLogoName(file.name);
    setUploadingLogo(true);

    try {
      const data = await createLogoUploadUrl({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      const upload = data?.upload || data;
      await uploadFileToSignedUrl(upload.uploadUrl, file, {
        method: upload.method || "PUT",
        headers: upload.headers || {},
      });

      setForm((current) => ({
        ...current,
        logoUrl: upload.publicUrl || upload.url || current.logoUrl,
        logoKey: upload.key || current.logoKey,
      }));

      toast.success("Logo uploaded. Save changes to keep it.");
    } catch (error) {
      toast.error(error?.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-52" lines={3} showTable={false} />;
  }

  return (
    <div className="svx-settings-page svx-settings-general-page">
      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Overview"
          title="Store settings"
          subtitle="Keep General focused on the identity and setup details that affect the whole workspace. Document, tax, and print settings now live in Documents."
          action={dirty ? <Badge tone="warning">Unsaved changes</Badge> : <Badge tone="neutral">Current</Badge>}
        />

        <div className="svx-settings-summary-grid">
          <SummaryMetric
            label="Readiness"
            value={`${readinessPercent}%`}
            note={isOperationallyReady ? "Store is operationally ready." : "Complete the required setup items."}
            tone={isOperationallyReady ? "success" : "warning"}
          />
          <SummaryMetric
            label="Business setup"
            value={businessCategoryDisplay(form.shopType).title}
            note="Controls the tools and pages available to this store."
            tone="primary"
          />
          <SummaryMetric
            label="Documents"
            value="Separate"
            note="Receipt, invoice, tax, and print behavior moved out of General."
            tone="neutral"
          />
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Setup"
          title="Setup checklist"
          subtitle="Only the most useful setup items are shown here. Open the relevant section when something needs action."
          action={<Badge tone={missingRequired.length ? "warning" : "success"}>{missingRequired.length ? `${missingRequired.length} required` : "Ready"}</Badge>}
        />

        <div className="svx-settings-check-grid">
          {visibleChecks.length ? (
            visibleChecks.map((item) => <ChecklistRow key={item.key || item.label} item={item} />)
          ) : (
            <div className={panelClass()}>
              <strong>Setup checklist is not available.</strong>
              <p>Refresh the page or check the backend setup endpoint.</p>
            </div>
          )}
        </div>
      </section>

      <StoreIdentityForm
        form={form}
        setForm={setForm}
        disabled={isReadOnly || saving}
        fileInputRef={fileInputRef}
        uploadingLogo={uploadingLogo}
        selectedLogoName={selectedLogoName}
        onLogoSelected={onLogoSelected}
      />

      <DocumentSummary documentSettings={documentSettings} />

      <div className="svx-settings-savebar">
        <div>
          <strong>{dirty ? "You have unsaved store changes" : "Store identity is saved"}</strong>
          <p>{isReadOnly ? "Managers can review settings, but only the owner can save changes." : "Save after changing identity, location, contact details, or logo."}</p>
        </div>

        <AsyncButton loading={saving} loadingText="Saving..." disabled={!dirty || isReadOnly} onClick={onSave}>
          Save store settings
        </AsyncButton>
      </div>
    </div>
  );
}

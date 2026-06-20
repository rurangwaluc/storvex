import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { getUserRole } from "../../utils/role";
import {
  getDocumentSettings,
  getStoreProfile,
  updateDocumentSettings,
  updateStoreProfile,
} from "../../services/storeApi";
import "./SettingsGeneral.css";
import "./Settings.css";
import "./SettingsDocuments.css";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function cardClass() {
  return "svx-settings-card";
}

function panelClass() {
  return "svx-settings-panel";
}

function inputClass() {
  return "svx-settings-input";
}

function textareaClass() {
  return "svx-settings-textarea";
}

function fieldLabel() {
  return "svx-settings-field-label";
}

function fieldHelp() {
  return "svx-settings-field-help";
}

function readOnlyInputState(disabled) {
  return disabled ? "is-readonly" : "";
}

const HEADER_OPTIONS = [
  {
    value: "LOGO_AND_NAME",
    title: "Logo and business name",
    text: "Best default for receipts and formal documents.",
  },
  {
    value: "LOGO_ONLY",
    title: "Logo only",
    text: "Use when the logo already contains the business name.",
  },
  {
    value: "NAME_ONLY",
    title: "Business name only",
    text: "Use when there is no clean logo yet.",
  },
];

const SIZE_OPTIONS = [
  {
    value: "AUTO",
    title: "Auto",
    text: "Compact for small receipts, standard for longer documents.",
  },
  {
    value: "COMPACT",
    title: "Compact",
    text: "Tighter spacing for simple one-page receipts.",
  },
  {
    value: "STANDARD",
    title: "Standard",
    text: "Balanced spacing for formal documents and longer item lists.",
  },
];

const TAX_MODE_OPTIONS = [
  {
    value: "NONE",
    title: "No tax",
    text: "No tax line is shown on customer documents.",
    rate: 0,
  },
  {
    value: "VAT_18",
    title: "VAT 18%",
    text: "Use only when the business is registered and allowed to show VAT.",
    rate: 1800,
  },
  {
    value: "TURNOVER_3_INTERNAL",
    title: "Internal 3% estimate",
    text: "Owner reporting only. Hidden from customers by default.",
    rate: 300,
  },
  {
    value: "VAT_18_PLUS_TURNOVER_3",
    title: "21% combined tax",
    text: "Use only when legally applicable to the business.",
    rate: 2100,
  },
  {
    value: "CUSTOM",
    title: "Custom tax",
    text: "Use a custom name and rate for special cases.",
    rate: null,
  },
];

const TAX_DISPLAY_OPTIONS = [
  {
    value: "HIDDEN",
    title: "Hidden",
    text: "Tax stays saved but does not appear on customer documents.",
  },
  {
    value: "CUSTOMER_FACING",
    title: "Show to customer",
    text: "Tax appears on receipts, invoices, and printable documents.",
  },
  {
    value: "INTERNAL_ONLY",
    title: "Internal only",
    text: "Used for owner reporting without printing it for customers.",
  },
];

function documentSnapshot(value) {
  return {
    receiptPrefix: value?.receiptPrefix || "RCT",
    invoicePrefix: value?.invoicePrefix || "INV",
    warrantyPrefix: value?.warrantyPrefix || "WAR",
    proformaPrefix: value?.proformaPrefix || "PRF",
    deliveryPrefix: value?.deliveryPrefix || "DLV",
    receiptPadding: value?.receiptPadding || 6,
    invoicePadding: value?.invoicePadding || 6,
    warrantyPadding: value?.warrantyPadding || 6,
    proformaPadding: value?.proformaPadding || 6,
    deliveryPadding: value?.deliveryPadding || 6,
    invoiceTerms: value?.invoiceTerms || "",
    warrantyTerms: value?.warrantyTerms || "",
    proformaTerms: value?.proformaTerms || "",
    deliveryNoteTerms: value?.deliveryNoteTerms || "",
    documentPrimaryColor: value?.documentPrimaryColor || "#0F4C81",
    documentAccentColor: value?.documentAccentColor || "#E8EEF5",
    documentHeaderDisplay: value?.documentHeaderDisplay || "LOGO_AND_NAME",
    documentSizeMode: value?.documentSizeMode || "AUTO",
    taxMode: value?.taxMode || "NONE",
    taxDisplayMode: value?.taxDisplayMode || "HIDDEN",
    taxName: value?.taxName || "",
    taxRateBps: Number(value?.taxRateBps || 0),
    pricesIncludeTax: Boolean(value?.pricesIncludeTax),
    showTaxOnCustomerDocuments: Boolean(value?.showTaxOnCustomerDocuments),

    deliveryRequireReceiverName:
      value?.deliveryRequireReceiverName === undefined
        ? true
        : Boolean(value?.deliveryRequireReceiverName),
    deliveryRequireReceiverPhone: Boolean(value?.deliveryRequireReceiverPhone),
    deliveryRequireSignature:
      value?.deliveryRequireSignature === undefined
        ? true
        : Boolean(value?.deliveryRequireSignature),
    deliveryRequireDeliveredBy:
      value?.deliveryRequireDeliveredBy === undefined
        ? true
        : Boolean(value?.deliveryRequireDeliveredBy),
    deliveryRequireLocation:
      value?.deliveryRequireLocation === undefined
        ? true
        : Boolean(value?.deliveryRequireLocation),
    deliveryShowSerialNumbers:
      value?.deliveryShowSerialNumbers === undefined
        ? true
        : Boolean(value?.deliveryShowSerialNumbers),
    deliveryAllowPartialDelivery: Boolean(value?.deliveryAllowPartialDelivery),

    showDocumentLogo:
      value?.showDocumentLogo === undefined ? true : Boolean(value?.showDocumentLogo),
    showDocumentQr: Boolean(value?.showDocumentQr),
    showDocumentWatermark: Boolean(value?.showDocumentWatermark),
    showPrintedDate:
      value?.showPrintedDate === undefined ? true : Boolean(value?.showPrintedDate),
    showBusinessContacts:
      value?.showBusinessContacts === undefined
        ? true
        : Boolean(value?.showBusinessContacts),

    autoReceiptNumbering:
      value?.autoReceiptNumbering === undefined
        ? true
        : Boolean(value?.autoReceiptNumbering),
    autoInvoiceNumbering:
      value?.autoInvoiceNumbering === undefined
        ? true
        : Boolean(value?.autoInvoiceNumbering),
    autoWarrantyNumbering:
      value?.autoWarrantyNumbering === undefined
        ? true
        : Boolean(value?.autoWarrantyNumbering),
    autoProformaNumbering:
      value?.autoProformaNumbering === undefined
        ? true
        : Boolean(value?.autoProformaNumbering),
    autoDeliveryNumbering:
      value?.autoDeliveryNumbering === undefined
        ? true
        : Boolean(value?.autoDeliveryNumbering),
  };
}

function profileCopySnapshot(value) {
  return {
    receiptHeader: value?.receiptHeader || "",
    receiptFooter: value?.receiptFooter || "",
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

function OptionCard({ selected, title, text, disabled, onClick }) {
  return (
    <button
      type="button"
      className={cx("svx-settings-option-card", selected && "is-selected")}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="svx-settings-option-dot" />
      <strong>{title}</strong>
      <p>{text}</p>
    </button>
  );
}

function SwitchRow({ title, text, checked, disabled, onChange, tone = "neutral" }) {
  return (
    <label className={cx("svx-settings-switch-row", `is-${tone}`)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="svx-settings-switch-box" />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </label>
  );
}

function NumberField({ label, value, disabled, onChange, help }) {
  return (
    <div>
      <label className={fieldLabel()}>{label}</label>
      <input
        type="number"
        min="4"
        max="12"
        className={cx(inputClass(), readOnlyInputState(disabled))}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      {help ? <p className={fieldHelp()}>{help}</p> : null}
    </div>
  );
}

function TextareaField({ label, value, disabled, onChange, placeholder, help, rows = 4 }) {
  return (
    <div>
      <label className={fieldLabel()}>{label}</label>
      <textarea
        rows={rows}
        className={cx(textareaClass(), readOnlyInputState(disabled))}
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder={placeholder}
      />
      {help ? <p className={fieldHelp()}>{help}</p> : null}
    </div>
  );
}

function CompactInfoRow({ label, value, tone = "neutral" }) {
  return (
    <div className={cx("svx-settings-compact-row", `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function CopyAccordion({ title, note, children, open = false }) {
  return (
    <details className="svx-settings-accordion" open={open}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{note}</small>
        </span>
        <em>Open</em>
      </summary>
      <div className="svx-settings-accordion-body">{children}</div>
    </details>
  );
}

function PreviewDocument({
  title,
  prefix,
  padding,
  preview,
  terms,
  primaryColor,
  accentColor,
  headerMode,
  sizeMode,
  taxLabel,
  previewLabel = "Next number",
  previewFallback = "Preview unavailable",
}) {
  const showLogo = headerMode !== "NAME_ONLY";
  const showName = headerMode !== "LOGO_ONLY";

  return (
    <article className="svx-document-preview-card">
      <div className="svx-document-preview-top" style={{ backgroundColor: primaryColor || "#0F4C81" }}>
        <div className="svx-document-preview-head">
          <div className="svx-document-preview-brand">
            {showLogo ? <span>LOGO</span> : null}
            <div>
              {showName ? <strong>Business name</strong> : null}
              <small>{title}</small>
            </div>
          </div>
          <em>{sizeMode}</em>
        </div>
        <div className="svx-document-preview-glow" style={{ backgroundColor: `${accentColor || "#E8EEF5"}AA` }} />
      </div>

      <div className="svx-document-preview-body">
        <span>{previewLabel}</span>
        <strong>{preview || previewFallback}</strong>
        <div>
          {prefix ? <Badge tone="strong">{prefix}</Badge> : null}
          {padding ? <Badge tone="strong">{padding} digits</Badge> : null}
          {taxLabel ? <Badge tone="warning">{taxLabel}</Badge> : null}
        </div>
        <p>{cleanString(terms) || "No terms added yet."}</p>
      </div>
    </article>
  );
}

export default function SettingsDocuments() {
  const role = useMemo(() => getUserRole(), []);
  const isOwner = role === "OWNER";
  const isReadOnly = !isOwner;

  const [documentSettings, setDocumentSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [docForm, setDocForm] = useState(documentSnapshot(null));
  const [copyForm, setCopyForm] = useState(profileCopySnapshot(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  useEffect(() => {
    let alive = true;

    Promise.allSettled([getDocumentSettings(), getStoreProfile()])
      .then(([docsRes, profileRes]) => {
        if (!alive) return;

        if (docsRes.status === "fulfilled") {
          const next = docsRes.value?.documentSettings || null;
          setDocumentSettings(next);
          setDocForm(documentSnapshot(next));
        }

        if (profileRes.status === "fulfilled") {
          const nextProfile = profileRes.value?.profile || null;
          setProfile(nextProfile);
          setCopyForm(profileCopySnapshot(nextProfile));
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const docDirty = useMemo(() => {
    if (!documentSettings) return false;
    return JSON.stringify(docForm) !== JSON.stringify(documentSnapshot(documentSettings));
  }, [docForm, documentSettings]);

  const copyDirty = useMemo(() => {
    if (!profile) return false;
    return JSON.stringify(copyForm) !== JSON.stringify(profileCopySnapshot(profile));
  }, [copyForm, profile]);

  const dirty = docDirty || copyDirty;
  const taxSummary = documentSettings?.taxSummary || null;
  const taxIsCustomerFacing =
    docForm.taxMode !== "NONE" &&
    docForm.taxDisplayMode === "CUSTOMER_FACING" &&
    docForm.showTaxOnCustomerDocuments;

  const taxModeLabel = TAX_MODE_OPTIONS.find((option) => option.value === docForm.taxMode)?.title || docForm.taxMode;
  const taxDisplayLabel = TAX_DISPLAY_OPTIONS.find((option) => option.value === docForm.taxDisplayMode)?.title || docForm.taxDisplayMode;
  const headerLabel = HEADER_OPTIONS.find((option) => option.value === docForm.documentHeaderDisplay)?.title || "Header style";
  const sizeLabel = SIZE_OPTIONS.find((option) => option.value === docForm.documentSizeMode)?.title || "Print size";

  const previewItems = [
    {
      title: "Receipt",
      prefix: docForm.receiptPrefix,
      padding: docForm.receiptPadding,
      preview: documentSettings?.receiptNumberPreview,
      terms: copyForm.receiptFooter,
      taxLabel: taxIsCustomerFacing ? docForm.taxName || "Tax shown" : "",
    },
    {
      title: "Invoice",
      prefix: docForm.invoicePrefix,
      padding: docForm.invoicePadding,
      preview: documentSettings?.invoiceNumberPreview,
      terms: docForm.invoiceTerms,
      taxLabel: taxIsCustomerFacing ? docForm.taxName || "Tax shown" : "",
    },
    {
      title: "Warranty",
      prefix: docForm.warrantyPrefix,
      padding: docForm.warrantyPadding,
      preview: documentSettings?.warrantyNumberPreview,
      terms: docForm.warrantyTerms,
    },
    {
      title: "Proforma",
      prefix: docForm.proformaPrefix,
      padding: docForm.proformaPadding,
      preview: documentSettings?.proformaNumberPreview,
      terms: docForm.proformaTerms,
      taxLabel: taxIsCustomerFacing ? docForm.taxName || "Tax shown" : "",
    },
    {
      title: "Delivery Note",
      prefix: docForm.deliveryPrefix,
      padding: docForm.deliveryPadding,
      preview: documentSettings?.deliveryNoteNumberPreview,
      terms: docForm.deliveryNoteTerms,
      previewLabel: "Next number",
      previewFallback: "Delivery note theme preview",
    },
  ];

  const visiblePreviews = showAllPreviews ? previewItems : previewItems.slice(0, 3);

  function updateDocField(key, value) {
    setDocForm((current) => ({ ...current, [key]: value }));
  }

  function updateCopyField(key, value) {
    setCopyForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave() {
    if (isReadOnly) {
      toast.error("Only the owner can update document settings");
      return;
    }

    if (!dirty || saving) return;
    setSaving(true);

    try {
      if (docDirty) {
        const data = await updateDocumentSettings({
          ...docForm,
          receiptPadding: Number(docForm.receiptPadding),
          invoicePadding: Number(docForm.invoicePadding),
          warrantyPadding: Number(docForm.warrantyPadding),
          proformaPadding: Number(docForm.proformaPadding),
          deliveryPadding: Number(docForm.deliveryPadding),
          taxRateBps: Number(docForm.taxRateBps),
          taxName: cleanString(docForm.taxName) || null,
        });

        const next = data?.documentSettings || null;
        setDocumentSettings(next);
        setDocForm(documentSnapshot(next));
      }

      if (copyDirty) {
        const data = await updateStoreProfile({
          receiptHeader: cleanString(copyForm.receiptHeader) || null,
          receiptFooter: cleanString(copyForm.receiptFooter) || null,
        });

        const nextProfile = data?.profile || null;
        setProfile(nextProfile);
        setCopyForm(profileCopySnapshot(nextProfile));
      }

      toast.success("Document settings updated");
    } catch (error) {
      toast.error(error?.message || "Failed to save document settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={3} showTable={false} />;
  }

  return (
    <div className="svx-settings-page svx-settings-documents-page">
      <section className={cx(cardClass(), "svx-documents-hero")}> 
        <SectionHeading
          eyebrow="Documents"
          title="Documents and receipts"
          subtitle="Control document numbers, receipt style, tax display, customer-facing copy, and previews from one focused workspace."
          action={dirty ? <Badge tone="warning">Unsaved changes</Badge> : <Badge tone="neutral">Current</Badge>}
        />

        <div className="svx-settings-summary-grid svx-documents-summary-grid">
          <div className="svx-settings-summary-card is-primary">
            <span>Receipt prefix</span>
            <strong>{docForm.receiptPrefix || "RCT"}</strong>
            <p>{documentSettings?.receiptNumberPreview || "Next receipt preview"}</p>
          </div>
          <div className="svx-settings-summary-card is-neutral">
            <span>Invoice prefix</span>
            <strong>{docForm.invoicePrefix || "INV"}</strong>
            <p>{documentSettings?.invoiceNumberPreview || "Next invoice preview"}</p>
          </div>
          <div className="svx-settings-summary-card is-warning">
            <span>Tax mode</span>
            <strong>{taxModeLabel}</strong>
            <p>{taxSummary?.label || "No tax shown on customer documents"}</p>
          </div>
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Identity"
          title="Document identity"
          subtitle="Keep document prefixes short, clear, and easy to recognize on printed receipts, invoices, warranties, and proformas."
        />

        <div className="svx-settings-form-grid is-four svx-documents-number-grid">
          <div>
            <label className={fieldLabel()}>Receipt prefix</label>
            <input className={cx(inputClass(), readOnlyInputState(isReadOnly))} value={docForm.receiptPrefix} disabled={isReadOnly} onChange={(event) => updateDocField("receiptPrefix", event.target.value)} />
          </div>
          <div>
            <label className={fieldLabel()}>Invoice prefix</label>
            <input className={cx(inputClass(), readOnlyInputState(isReadOnly))} value={docForm.invoicePrefix} disabled={isReadOnly} onChange={(event) => updateDocField("invoicePrefix", event.target.value)} />
          </div>
          <div>
            <label className={fieldLabel()}>Warranty prefix</label>
            <input className={cx(inputClass(), readOnlyInputState(isReadOnly))} value={docForm.warrantyPrefix} disabled={isReadOnly} onChange={(event) => updateDocField("warrantyPrefix", event.target.value)} />
          </div>
          <div>
            <label className={fieldLabel()}>Proforma prefix</label>
            <input className={cx(inputClass(), readOnlyInputState(isReadOnly))} value={docForm.proformaPrefix} disabled={isReadOnly} onChange={(event) => updateDocField("proformaPrefix", event.target.value)} />
          </div>
          <div>
            <label className={fieldLabel()}>Delivery note prefix</label>
            <input className={cx(inputClass(), readOnlyInputState(isReadOnly))} value={docForm.deliveryPrefix} disabled={isReadOnly} onChange={(event) => updateDocField("deliveryPrefix", event.target.value)} />
          </div>

          <NumberField label="Receipt digits" value={docForm.receiptPadding} disabled={isReadOnly} onChange={(event) => updateDocField("receiptPadding", event.target.value)} />
          <NumberField label="Invoice digits" value={docForm.invoicePadding} disabled={isReadOnly} onChange={(event) => updateDocField("invoicePadding", event.target.value)} />
          <NumberField label="Warranty digits" value={docForm.warrantyPadding} disabled={isReadOnly} onChange={(event) => updateDocField("warrantyPadding", event.target.value)} />
          <NumberField label="Proforma digits" value={docForm.proformaPadding} disabled={isReadOnly} onChange={(event) => updateDocField("proformaPadding", event.target.value)} />
          <NumberField label="Delivery note digits" value={docForm.deliveryPadding} disabled={isReadOnly} onChange={(event) => updateDocField("deliveryPadding", event.target.value)} />
        </div>

        <div className="svx-settings-form-grid mt-5 svx-documents-color-grid">
          <div>
            <label className={fieldLabel()}>Primary document color</label>
            <input
              className={cx(inputClass(), readOnlyInputState(isReadOnly))}
              value={docForm.documentPrimaryColor}
              disabled={isReadOnly}
              onChange={(event) => updateDocField("documentPrimaryColor", event.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel()}>Accent document color</label>
            <input
              className={cx(inputClass(), readOnlyInputState(isReadOnly))}
              value={docForm.documentAccentColor}
              disabled={isReadOnly}
              onChange={(event) => updateDocField("documentAccentColor", event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Style"
          title="Header and print style"
          subtitle="Choose the document look customers see. Keep it simple, clean, and easy to read when printed."
          action={<Badge tone="primary">{headerLabel}</Badge>}
        />

        <div className="svx-settings-option-grid svx-documents-option-grid">
          {HEADER_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              selected={docForm.documentHeaderDisplay === option.value}
              title={option.title}
              text={option.text}
              disabled={isReadOnly}
              onClick={() => updateDocField("documentHeaderDisplay", option.value)}
            />
          ))}
        </div>

        <div className="svx-settings-option-grid is-compact svx-documents-option-grid is-print">
          {SIZE_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              selected={docForm.documentSizeMode === option.value}
              title={option.title}
              text={option.text}
              disabled={isReadOnly}
              onClick={() => updateDocField("documentSizeMode", option.value)}
            />
          ))}
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Governance"
          title="Document rules"
          subtitle="Set the owner rules that staff must follow when documents are created, printed, or handed to customers."
        />

        <div className="svx-settings-switch-grid svx-documents-option-grid">
          <SwitchRow
            title="Show logo"
            text="Print the business logo on customer documents when available."
            checked={docForm.showDocumentLogo}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("showDocumentLogo", value)}
          />
          <SwitchRow
            title="Show business contacts"
            text="Print phone, address, and other business contact details."
            checked={docForm.showBusinessContacts}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("showBusinessContacts", value)}
          />
          <SwitchRow
            title="Show printed date"
            text="Show when the document was printed or generated."
            checked={docForm.showPrintedDate}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("showPrintedDate", value)}
          />
          <SwitchRow
            title="Show QR code"
            text="Reserve space for future document verification."
            checked={docForm.showDocumentQr}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("showDocumentQr", value)}
          />
          <SwitchRow
            title="Show watermark"
            text="Use a light watermark on formal document layouts."
            checked={docForm.showDocumentWatermark}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("showDocumentWatermark", value)}
          />
        </div>

        <div className="svx-settings-switch-grid svx-documents-option-grid">
          <SwitchRow
            title="Auto receipt numbering"
            text="Let Storvex assign receipt numbers automatically."
            checked={docForm.autoReceiptNumbering}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("autoReceiptNumbering", value)}
          />
          <SwitchRow
            title="Auto invoice numbering"
            text="Let Storvex assign invoice numbers automatically."
            checked={docForm.autoInvoiceNumbering}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("autoInvoiceNumbering", value)}
          />
          <SwitchRow
            title="Auto warranty numbering"
            text="Let Storvex assign warranty numbers automatically."
            checked={docForm.autoWarrantyNumbering}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("autoWarrantyNumbering", value)}
          />
          <SwitchRow
            title="Auto proforma numbering"
            text="Let Storvex assign proforma numbers automatically."
            checked={docForm.autoProformaNumbering}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("autoProformaNumbering", value)}
          />
          <SwitchRow
            title="Auto delivery note numbering"
            text="Let Storvex assign delivery note numbers automatically."
            checked={docForm.autoDeliveryNumbering}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("autoDeliveryNumbering", value)}
          />
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Delivery notes"
          title="Delivery note rules"
          subtitle="Delivery notes are goods movement proof. Keep money out and require the handover details that protect the business."
          action={<Badge tone="warning">No money fields</Badge>}
        />

        <div className="svx-settings-switch-grid svx-documents-option-grid">
          <SwitchRow
            title="Require receiver name"
            text="Staff must record who received the goods."
            checked={docForm.deliveryRequireReceiverName}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryRequireReceiverName", value)}
          />
          <SwitchRow
            title="Require receiver phone"
            text="Ask for receiver phone when the business needs stronger proof."
            checked={docForm.deliveryRequireReceiverPhone}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryRequireReceiverPhone", value)}
          />
          <SwitchRow
            title="Require signature"
            text="Receiver signature is required before the handover is complete."
            checked={docForm.deliveryRequireSignature}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryRequireSignature", value)}
          />
          <SwitchRow
            title="Require delivered by"
            text="Staff must record who delivered or handed over the goods."
            checked={docForm.deliveryRequireDeliveredBy}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryRequireDeliveredBy", value)}
          />
          <SwitchRow
            title="Require delivery location"
            text="Delivery location or customer address should be recorded."
            checked={docForm.deliveryRequireLocation}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryRequireLocation", value)}
          />
          <SwitchRow
            title="Show serial numbers"
            text="Display serial numbers on delivery notes when products have them."
            checked={docForm.deliveryShowSerialNumbers}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryShowSerialNumbers", value)}
          />
          <SwitchRow
            title="Allow partial delivery"
            text="Allow a delivery note to cover only part of an order."
            checked={docForm.deliveryAllowPartialDelivery}
            disabled={isReadOnly}
            onChange={(value) => updateDocField("deliveryAllowPartialDelivery", value)}
          />
        </div>
      </section>

      <section className={cx(cardClass(), "svx-documents-tax-section")}>
        <SectionHeading
          eyebrow="Tax"
          title="Tax display"
          subtitle="Use this carefully. Tax should only appear on customer documents when the business is legally allowed or required to show it."
          action={<Badge tone={taxIsCustomerFacing ? "warning" : "neutral"}>{taxDisplayLabel}</Badge>}
        />

        <div className="svx-documents-tax-shell">
          <div className="svx-documents-tax-main">
            <div className="svx-settings-option-grid is-tax svx-documents-option-grid is-tax-guided">
              {TAX_MODE_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  selected={docForm.taxMode === option.value}
                  title={option.title}
                  text={option.text}
                  disabled={isReadOnly}
                  onClick={() => {
                    updateDocField("taxMode", option.value);
                    if (option.rate !== null) updateDocField("taxRateBps", option.rate);
                    if (option.value === "NONE") {
                      updateDocField("showTaxOnCustomerDocuments", false);
                      updateDocField("taxDisplayMode", "HIDDEN");
                    }
                  }}
                />
              ))}
            </div>

            <div className="svx-settings-option-grid is-compact svx-documents-option-grid is-tax-display">
              {TAX_DISPLAY_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  selected={docForm.taxDisplayMode === option.value}
                  title={option.title}
                  text={option.text}
                  disabled={isReadOnly || docForm.taxMode === "NONE"}
                  onClick={() => updateDocField("taxDisplayMode", option.value)}
                />
              ))}
            </div>
          </div>

          <aside className="svx-documents-tax-side">
            <CompactInfoRow label="Selected tax" value={taxModeLabel} tone="primary" />
            <CompactInfoRow label="Customer display" value={taxDisplayLabel} tone={taxIsCustomerFacing ? "warning" : "neutral"} />

            <div>
              <label className={fieldLabel()}>Tax name</label>
              <input
                className={cx(inputClass(), readOnlyInputState(isReadOnly || docForm.taxMode === "NONE"))}
                value={docForm.taxName}
                disabled={isReadOnly || docForm.taxMode === "NONE"}
                onChange={(event) => updateDocField("taxName", event.target.value)}
                placeholder="Example: VAT"
              />
            </div>

            <div>
              <label className={fieldLabel()}>Tax rate basis points</label>
              <input
                type="number"
                className={cx(inputClass(), readOnlyInputState(isReadOnly || docForm.taxMode === "NONE"))}
                value={docForm.taxRateBps}
                disabled={isReadOnly || docForm.taxMode === "NONE"}
                onChange={(event) => updateDocField("taxRateBps", event.target.value)}
              />
              <p className={fieldHelp()}>1800 means 18%. 300 means 3%.</p>
            </div>

            <div className="svx-settings-switch-grid is-stacked">
              <SwitchRow
                title="Prices include tax"
                text="Use when shelf prices already include tax."
                checked={docForm.pricesIncludeTax}
                disabled={isReadOnly || docForm.taxMode === "NONE"}
                onChange={(value) => updateDocField("pricesIncludeTax", value)}
              />
              <SwitchRow
                title="Show tax on customer documents"
                text="Only enable when tax should legally appear to the customer."
                checked={docForm.showTaxOnCustomerDocuments}
                disabled={isReadOnly || docForm.taxMode === "NONE" || docForm.taxDisplayMode !== "CUSTOMER_FACING"}
                onChange={(value) => updateDocField("showTaxOnCustomerDocuments", value)}
                tone="warning"
              />
            </div>

            <div className={cx(panelClass(), taxIsCustomerFacing && "is-warning") }>
              <strong>{taxSummary?.label || "Tax behavior preview"}</strong>
              <p>{taxSummary?.warning || "Tax is currently not shown on customer documents."}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Preview"
          title="Document preview"
          subtitle="Check the main documents first. Open all previews only when you need to review every document type."
          action={
            <button type="button" className="svx-settings-secondary-button" onClick={() => setShowAllPreviews((current) => !current)}>
              {showAllPreviews ? "Show fewer" : "View all previews"}
            </button>
          }
        />

        <div className="svx-document-preview-grid svx-document-preview-grid-compact">
          {visiblePreviews.map((item) => (
            <PreviewDocument
              key={item.title}
              title={item.title}
              prefix={item.prefix}
              padding={item.padding}
              preview={item.preview}
              terms={item.terms}
              primaryColor={docForm.documentPrimaryColor}
              accentColor={docForm.documentAccentColor}
              headerMode={docForm.documentHeaderDisplay}
              sizeMode={docForm.documentSizeMode}
              taxLabel={item.taxLabel}
              previewLabel={item.previewLabel}
              previewFallback={item.previewFallback}
            />
          ))}
        </div>
      </section>

      <section className={cardClass()}>
        <SectionHeading
          eyebrow="Copy"
          title="Terms, header, and footer"
          subtitle="Keep customer copy short and practical. Open only the document text you need to edit."
        />

        <div className="svx-settings-accordion-list">
          <CopyAccordion title="Receipt header and footer" note="Text printed at the top and bottom of receipts" open>
            <div className="svx-settings-form-grid is-two">
              <TextareaField label="Receipt header" value={copyForm.receiptHeader} disabled={isReadOnly} onChange={(event) => updateCopyField("receiptHeader", event.target.value)} placeholder="Example: Thank you for shopping with us." help="Shown near the top of printed receipts." />
              <TextareaField label="Receipt footer" value={copyForm.receiptFooter} disabled={isReadOnly} onChange={(event) => updateCopyField("receiptFooter", event.target.value)} placeholder="Example: Keep this receipt for support and warranty." help="Shown near the bottom of printed receipts." />
            </div>
          </CopyAccordion>

          <CopyAccordion title="Invoice terms" note="Payment and invoice conditions">
            <TextareaField label="Invoice terms" value={docForm.invoiceTerms} disabled={isReadOnly} onChange={(event) => updateDocField("invoiceTerms", event.target.value)} placeholder="Example: Payment due within 7 days from invoice date." help="Printed on invoice documents." />
          </CopyAccordion>

          <CopyAccordion title="Warranty terms" note="Warranty rules customers should understand">
            <TextareaField label="Warranty terms" value={docForm.warrantyTerms} disabled={isReadOnly} onChange={(event) => updateDocField("warrantyTerms", event.target.value)} placeholder="Example: Warranty void if the item is physically damaged." help="Printed on warranty documents." />
          </CopyAccordion>

          <CopyAccordion title="Proforma and delivery note terms" note="Quote validity and delivery acceptance text">
            <div className="svx-settings-form-grid is-two">
              <TextareaField label="Proforma terms" value={docForm.proformaTerms} disabled={isReadOnly} onChange={(event) => updateDocField("proformaTerms", event.target.value)} placeholder="Example: Prices are valid for 3 days from issue date." help="Printed on proforma documents." />
              <TextareaField label="Delivery note terms" value={docForm.deliveryNoteTerms} disabled={isReadOnly} onChange={(event) => updateDocField("deliveryNoteTerms", event.target.value)} placeholder="Example: Please verify all items before signing." help="Printed on delivery note documents." />
            </div>
          </CopyAccordion>
        </div>
      </section>

      <div className="svx-settings-savebar">
        <div>
          <strong>{dirty ? "You have unsaved document changes" : "Document settings are saved"}</strong>
          <p>{isReadOnly ? "Managers can review document settings, but only the owner can save changes." : "Save after editing receipt, invoice, tax, terms, or preview settings."}</p>
        </div>

        <AsyncButton loading={saving} loadingText="Saving..." disabled={!dirty || isReadOnly} onClick={onSave}>
          Save document settings
        </AsyncButton>
      </div>
    </div>
  );
}

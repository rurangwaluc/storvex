import {
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  getDocumentSettings,
  getStoreProfile,
  updateDocumentSettings,
  updateStoreProfile,
} from "../../services/storeApi";
import { getUserRole } from "../../utils/role";

import "./Settings.css";
import "./SettingsGeneral.css";
import "./SettingsDocuments.css";

const HEADER_OPTIONS = [
  {
    value: "LOGO_AND_NAME",
    label: "Logo and business name",
  },
  {
    value: "LOGO_ONLY",
    label: "Logo only",
  },
  {
    value: "NAME_ONLY",
    label: "Business name only",
  },
];

const SIZE_OPTIONS = [
  {
    value: "AUTO",
    label: "Automatic",
  },
  {
    value: "COMPACT",
    label: "Compact",
  },
  {
    value: "STANDARD",
    label: "Standard",
  },
];

const TAX_OPTIONS = [
  {
    value: "NONE",
    label: "No tax",
    rate: 0,
  },
  {
    value: "VAT_18",
    label: "VAT 18%",
    rate: 1800,
  },
  {
    value: "TURNOVER_3_INTERNAL",
    label: "Internal 3%",
    rate: 300,
  },
  {
    value: "VAT_18_PLUS_TURNOVER_3",
    label: "VAT and internal 3%",
    rate: 2100,
  },
  {
    value: "CUSTOM",
    label: "Custom tax",
    rate: null,
  },
];

function cleanString(value) {
  return String(value || "").trim();
}

function documentSnapshot(value) {
  return {
    receiptPrefix:
      value?.receiptPrefix || "RCT",
    invoicePrefix:
      value?.invoicePrefix || "INV",
    warrantyPrefix:
      value?.warrantyPrefix || "WAR",
    proformaPrefix:
      value?.proformaPrefix || "PRF",
    deliveryPrefix:
      value?.deliveryPrefix || "DLV",

    receiptPadding:
      Number(value?.receiptPadding || 6),
    invoicePadding:
      Number(value?.invoicePadding || 6),
    warrantyPadding:
      Number(value?.warrantyPadding || 6),
    proformaPadding:
      Number(value?.proformaPadding || 6),
    deliveryPadding:
      Number(value?.deliveryPadding || 6),

    invoiceTerms:
      value?.invoiceTerms || "",
    warrantyTerms:
      value?.warrantyTerms || "",
    proformaTerms:
      value?.proformaTerms || "",
    deliveryNoteTerms:
      value?.deliveryNoteTerms || "",

    documentPrimaryColor:
      value?.documentPrimaryColor ||
      "#0F4C81",
    documentAccentColor:
      value?.documentAccentColor ||
      "#E8EEF5",

    documentHeaderDisplay:
      value?.documentHeaderDisplay ||
      "LOGO_AND_NAME",
    documentSizeMode:
      value?.documentSizeMode || "AUTO",

    taxMode:
      value?.taxMode || "NONE",
    taxDisplayMode:
      value?.taxDisplayMode || "HIDDEN",
    taxName:
      value?.taxName || "",
    taxRateBps:
      Number(value?.taxRateBps || 0),
    pricesIncludeTax:
      Boolean(value?.pricesIncludeTax),
    showTaxOnCustomerDocuments:
      Boolean(
        value?.showTaxOnCustomerDocuments,
      ),

    deliveryRequireReceiverName:
      value?.deliveryRequireReceiverName ===
      undefined
        ? true
        : Boolean(
            value.deliveryRequireReceiverName,
          ),

    deliveryRequireReceiverPhone:
      Boolean(
        value?.deliveryRequireReceiverPhone,
      ),

    deliveryRequireSignature:
      value?.deliveryRequireSignature ===
      undefined
        ? true
        : Boolean(
            value.deliveryRequireSignature,
          ),

    deliveryRequireDeliveredBy:
      value?.deliveryRequireDeliveredBy ===
      undefined
        ? true
        : Boolean(
            value.deliveryRequireDeliveredBy,
          ),

    deliveryRequireLocation:
      value?.deliveryRequireLocation ===
      undefined
        ? true
        : Boolean(
            value.deliveryRequireLocation,
          ),

    deliveryShowSerialNumbers:
      value?.deliveryShowSerialNumbers ===
      undefined
        ? true
        : Boolean(
            value.deliveryShowSerialNumbers,
          ),

    deliveryAllowPartialDelivery:
      Boolean(
        value?.deliveryAllowPartialDelivery,
      ),

    showDocumentLogo:
      value?.showDocumentLogo === undefined
        ? true
        : Boolean(value.showDocumentLogo),

    showDocumentQr:
      Boolean(value?.showDocumentQr),

    showDocumentWatermark:
      Boolean(value?.showDocumentWatermark),

    showPrintedDate:
      value?.showPrintedDate === undefined
        ? true
        : Boolean(value.showPrintedDate),

    showBusinessContacts:
      value?.showBusinessContacts ===
      undefined
        ? true
        : Boolean(
            value.showBusinessContacts,
          ),

    autoReceiptNumbering:
      value?.autoReceiptNumbering ===
      undefined
        ? true
        : Boolean(
            value.autoReceiptNumbering,
          ),

    autoInvoiceNumbering:
      value?.autoInvoiceNumbering ===
      undefined
        ? true
        : Boolean(
            value.autoInvoiceNumbering,
          ),

    autoWarrantyNumbering:
      value?.autoWarrantyNumbering ===
      undefined
        ? true
        : Boolean(
            value.autoWarrantyNumbering,
          ),

    autoProformaNumbering:
      value?.autoProformaNumbering ===
      undefined
        ? true
        : Boolean(
            value.autoProformaNumbering,
          ),

    autoDeliveryNumbering:
      value?.autoDeliveryNumbering ===
      undefined
        ? true
        : Boolean(
            value.autoDeliveryNumbering,
          ),
  };
}

function profileSnapshot(value) {
  return {
    receiptHeader:
      value?.receiptHeader || "",
    receiptFooter:
      value?.receiptFooter || "",
  };
}

function Field({
  label,
  value,
  disabled,
  onChange,
  className = "",
  maxLength,
}) {
  return (
    <div
      className={[
        "svx-docs-field",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label>{label}</label>

      <input
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  disabled,
  placeholder,
  onChange,
}) {
  return (
    <div className="svx-docs-field">
      <label>{label}</label>

      <textarea
        rows={4}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}) {
  return (
    <label className="svx-docs-toggle">
      <span className="svx-docs-toggle-copy">
        <strong>{label}</strong>

        {description ? (
          <small>{description}</small>
        ) : null}
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      <span
        className="svx-docs-toggle-control"
        aria-hidden="true"
      />
    </label>
  );
}

function SectionHeading({
  title,
  description,
}) {
  return (
    <div className="svx-docs-section-heading">
      <h2>{title}</h2>

      {description ? (
        <p>{description}</p>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  disabled,
  options,
  onChange,
}) {
  return (
    <div className="svx-docs-field">
      <label>{label}</label>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsDocuments() {
  const role = useMemo(
    () => getUserRole(),
    [],
  );

  const isOwner = role === "OWNER";
  const isReadOnly = !isOwner;

  const [documentSettings, setDocumentSettings] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [docForm, setDocForm] =
    useState(documentSnapshot(null));

  const [copyForm, setCopyForm] =
    useState(profileSnapshot(null));

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    let alive = true;

    Promise.allSettled([
      getDocumentSettings(),
      getStoreProfile(),
    ])
      .then(
        ([
          documentResult,
          profileResult,
        ]) => {
          if (!alive) return;

          if (
            documentResult.status ===
            "fulfilled"
          ) {
            const nextSettings =
              documentResult.value
                ?.documentSettings || null;

            setDocumentSettings(
              nextSettings,
            );

            setDocForm(
              documentSnapshot(
                nextSettings,
              ),
            );
          }

          if (
            profileResult.status ===
            "fulfilled"
          ) {
            const nextProfile =
              profileResult.value?.profile ||
              null;

            setProfile(nextProfile);

            setCopyForm(
              profileSnapshot(nextProfile),
            );
          }
        },
      )
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const docDirty = useMemo(() => {
    if (!documentSettings) {
      return false;
    }

    return (
      JSON.stringify(docForm) !==
      JSON.stringify(
        documentSnapshot(
          documentSettings,
        ),
      )
    );
  }, [docForm, documentSettings]);

  const copyDirty = useMemo(() => {
    if (!profile) {
      return false;
    }

    return (
      JSON.stringify(copyForm) !==
      JSON.stringify(
        profileSnapshot(profile),
      )
    );
  }, [copyForm, profile]);

  const dirty = docDirty || copyDirty;

  const taxEnabled =
    docForm.taxMode !== "NONE";

  const showCustomTax =
    docForm.taxMode === "CUSTOM";

  const receiptPreview =
    documentSettings
      ?.receiptNumberPreview ||
    `${docForm.receiptPrefix}-000001`;

  function updateDocField(key, value) {
    setDocForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCopyField(key, value) {
    setCopyForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTaxMode(value) {
    const option = TAX_OPTIONS.find(
      (item) => item.value === value,
    );

    setDocForm((current) => {
      const next = {
        ...current,
        taxMode: value,
      };

      if (option?.rate !== null) {
        next.taxRateBps =
          Number(option?.rate || 0);
      }

      if (value === "NONE") {
        next.taxDisplayMode =
          "HIDDEN";

        next.showTaxOnCustomerDocuments =
          false;
      }

      return next;
    });
  }

  async function onSave() {
    if (isReadOnly) {
      toast.error(
        "Only the owner can update document settings",
      );
      return;
    }

    if (!dirty || saving) {
      return;
    }

    setSaving(true);

    try {
      if (docDirty) {
        const data =
          await updateDocumentSettings({
            ...docForm,
            receiptPadding: Number(
              docForm.receiptPadding,
            ),
            invoicePadding: Number(
              docForm.invoicePadding,
            ),
            warrantyPadding: Number(
              docForm.warrantyPadding,
            ),
            proformaPadding: Number(
              docForm.proformaPadding,
            ),
            deliveryPadding: Number(
              docForm.deliveryPadding,
            ),
            taxRateBps: Number(
              docForm.taxRateBps,
            ),
            taxName:
              cleanString(
                docForm.taxName,
              ) || null,
          });

        const nextSettings =
          data?.documentSettings || null;

        setDocumentSettings(
          nextSettings,
        );

        setDocForm(
          documentSnapshot(
            nextSettings,
          ),
        );
      }

      if (copyDirty) {
        const data =
          await updateStoreProfile({
            receiptHeader:
              cleanString(
                copyForm.receiptHeader,
              ) || null,

            receiptFooter:
              cleanString(
                copyForm.receiptFooter,
              ) || null,
          });

        const nextProfile =
          data?.profile || null;

        setProfile(nextProfile);

        setCopyForm(
          profileSnapshot(nextProfile),
        );
      }

      toast.success(
        "Document settings saved",
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Could not save document settings",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="w-56"
        lines={4}
        showTable={false}
      />
    );
  }

  return (
    <div className="svx-settings-page svx-docs-page">
      <div className="svx-docs-page-heading">
        <div>
          <h1>Documents</h1>
          <p>
            Control how receipts and
            business documents look.
          </p>
        </div>

        {isReadOnly ? (
          <span>View only</span>
        ) : null}
      </div>

      <section className="svx-docs-section">
        <SectionHeading
          title="Appearance"
          description="Choose what customers see at the top of a document."
        />

        <div className="svx-docs-grid is-two">
          <SelectField
            label="Document header"
            value={
              docForm.documentHeaderDisplay
            }
            disabled={isReadOnly}
            options={HEADER_OPTIONS}
            onChange={(value) =>
              updateDocField(
                "documentHeaderDisplay",
                value,
              )
            }
          />

          <SelectField
            label="Document spacing"
            value={
              docForm.documentSizeMode
            }
            disabled={isReadOnly}
            options={SIZE_OPTIONS}
            onChange={(value) =>
              updateDocField(
                "documentSizeMode",
                value,
              )
            }
          />
        </div>

        <div className="svx-docs-toggle-list">
          <Toggle
            label="Show logo"
            checked={
              docForm.showDocumentLogo
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "showDocumentLogo",
                value,
              )
            }
          />

          <Toggle
            label="Show business contact details"
            checked={
              docForm.showBusinessContacts
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "showBusinessContacts",
                value,
              )
            }
          />

          <Toggle
            label="Show printed date"
            checked={
              docForm.showPrintedDate
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "showPrintedDate",
                value,
              )
            }
          />
        </div>
      </section>

      <section className="svx-docs-section">
        <SectionHeading
          title="Document numbers"
          description="Short codes used before each document number."
        />

        <div className="svx-docs-grid is-three">
          <Field
            label="Receipt"
            value={docForm.receiptPrefix}
            disabled={isReadOnly}
            maxLength={10}
            onChange={(value) =>
              updateDocField(
                "receiptPrefix",
                value.toUpperCase(),
              )
            }
          />

          <Field
            label="Invoice"
            value={docForm.invoicePrefix}
            disabled={isReadOnly}
            maxLength={10}
            onChange={(value) =>
              updateDocField(
                "invoicePrefix",
                value.toUpperCase(),
              )
            }
          />

          <Field
            label="Delivery note"
            value={docForm.deliveryPrefix}
            disabled={isReadOnly}
            maxLength={10}
            onChange={(value) =>
              updateDocField(
                "deliveryPrefix",
                value.toUpperCase(),
              )
            }
          />

          <Field
            label="Warranty"
            value={docForm.warrantyPrefix}
            disabled={isReadOnly}
            maxLength={10}
            onChange={(value) =>
              updateDocField(
                "warrantyPrefix",
                value.toUpperCase(),
              )
            }
          />

          <Field
            label="Proforma"
            value={docForm.proformaPrefix}
            disabled={isReadOnly}
            maxLength={10}
            onChange={(value) =>
              updateDocField(
                "proformaPrefix",
                value.toUpperCase(),
              )
            }
          />
        </div>
      </section>

      <section className="svx-docs-section">
        <SectionHeading
          title="Receipt message"
          description="Short text printed on receipts."
        />

        <div className="svx-docs-grid is-two">
          <TextareaField
            label="Receipt header"
            value={copyForm.receiptHeader}
            disabled={isReadOnly}
            placeholder="Example: Thank you for shopping with us."
            onChange={(value) =>
              updateCopyField(
                "receiptHeader",
                value,
              )
            }
          />

          <TextareaField
            label="Receipt footer"
            value={copyForm.receiptFooter}
            disabled={isReadOnly}
            placeholder="Example: Keep this receipt for support."
            onChange={(value) =>
              updateCopyField(
                "receiptFooter",
                value,
              )
            }
          />
        </div>
      </section>

      <section className="svx-docs-section">
        <SectionHeading
          title="Tax"
          description="Only show tax when the business is allowed to charge it."
        />

        <div className="svx-docs-grid is-two">
          <SelectField
            label="Tax type"
            value={docForm.taxMode}
            disabled={isReadOnly}
            options={TAX_OPTIONS}
            onChange={updateTaxMode}
          />

          {showCustomTax ? (
            <Field
              label="Tax name"
              value={docForm.taxName}
              disabled={isReadOnly}
              maxLength={40}
              onChange={(value) =>
                updateDocField(
                  "taxName",
                  value,
                )
              }
            />
          ) : null}

          {showCustomTax ? (
            <div className="svx-docs-field">
              <label>Tax rate</label>

              <div className="svx-docs-rate-input">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={
                    Number(
                      docForm.taxRateBps,
                    ) / 100
                  }
                  disabled={isReadOnly}
                  onChange={(event) =>
                    updateDocField(
                      "taxRateBps",
                      Math.round(
                        Number(
                          event.target.value ||
                            0,
                        ) * 100,
                      ),
                    )
                  }
                />

                <span>%</span>
              </div>
            </div>
          ) : null}
        </div>

        {taxEnabled ? (
          <div className="svx-docs-toggle-list">
            <Toggle
              label="Prices already include tax"
              checked={
                docForm.pricesIncludeTax
              }
              disabled={isReadOnly}
              onChange={(value) =>
                updateDocField(
                  "pricesIncludeTax",
                  value,
                )
              }
            />

            <Toggle
              label="Show tax to customers"
              description="Print tax details on customer documents."
              checked={
                docForm
                  .showTaxOnCustomerDocuments
              }
              disabled={isReadOnly}
              onChange={(value) => {
                updateDocField(
                  "showTaxOnCustomerDocuments",
                  value,
                );

                updateDocField(
                  "taxDisplayMode",
                  value
                    ? "CUSTOMER_FACING"
                    : "HIDDEN",
                );
              }}
            />
          </div>
        ) : null}
      </section>

      <section className="svx-docs-section">
        <SectionHeading
          title="Delivery proof"
          description="Choose what staff must record when goods are handed over."
        />

        <div className="svx-docs-toggle-list is-two">
          <Toggle
            label="Receiver name"
            checked={
              docForm
                .deliveryRequireReceiverName
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryRequireReceiverName",
                value,
              )
            }
          />

          <Toggle
            label="Receiver phone"
            checked={
              docForm
                .deliveryRequireReceiverPhone
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryRequireReceiverPhone",
                value,
              )
            }
          />

          <Toggle
            label="Receiver signature"
            checked={
              docForm
                .deliveryRequireSignature
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryRequireSignature",
                value,
              )
            }
          />

          <Toggle
            label="Delivered by"
            checked={
              docForm
                .deliveryRequireDeliveredBy
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryRequireDeliveredBy",
                value,
              )
            }
          />

          <Toggle
            label="Delivery location"
            checked={
              docForm
                .deliveryRequireLocation
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryRequireLocation",
                value,
              )
            }
          />

          <Toggle
            label="Product serial numbers"
            checked={
              docForm
                .deliveryShowSerialNumbers
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryShowSerialNumbers",
                value,
              )
            }
          />

          <Toggle
            label="Allow partial delivery"
            description="Use when part of an order can be delivered separately."
            checked={
              docForm
                .deliveryAllowPartialDelivery
            }
            disabled={isReadOnly}
            onChange={(value) =>
              updateDocField(
                "deliveryAllowPartialDelivery",
                value,
              )
            }
          />
        </div>
      </section>

      <section className="svx-docs-section">
        <details className="svx-docs-more">
          <summary>
            Additional document notes
          </summary>

          <div className="svx-docs-more-body">
            <TextareaField
              label="Invoice terms"
              value={docForm.invoiceTerms}
              disabled={isReadOnly}
              placeholder="Example: Payment is due within 7 days."
              onChange={(value) =>
                updateDocField(
                  "invoiceTerms",
                  value,
                )
              }
            />

            <TextareaField
              label="Warranty terms"
              value={docForm.warrantyTerms}
              disabled={isReadOnly}
              placeholder="Example: Warranty excludes physical damage."
              onChange={(value) =>
                updateDocField(
                  "warrantyTerms",
                  value,
                )
              }
            />

            <TextareaField
              label="Proforma terms"
              value={docForm.proformaTerms}
              disabled={isReadOnly}
              placeholder="Example: Prices remain valid for 3 days."
              onChange={(value) =>
                updateDocField(
                  "proformaTerms",
                  value,
                )
              }
            />

            <TextareaField
              label="Delivery note terms"
              value={
                docForm.deliveryNoteTerms
              }
              disabled={isReadOnly}
              placeholder="Example: Check all items before signing."
              onChange={(value) =>
                updateDocField(
                  "deliveryNoteTerms",
                  value,
                )
              }
            />
          </div>
        </details>
      </section>

      <section className="svx-docs-section">
        <SectionHeading
          title="Receipt preview"
          description="A simple preview of the current setup."
        />

        <div className="svx-docs-preview">
          <div className="svx-docs-preview-brand">
            {docForm.showDocumentLogo &&
            docForm.documentHeaderDisplay !==
              "NAME_ONLY" ? (
              <div className="svx-docs-preview-logo">
                {profile?.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt=""
                  />
                ) : (
                  <span>Logo</span>
                )}
              </div>
            ) : null}

            {docForm.documentHeaderDisplay !==
            "LOGO_ONLY" ? (
              <strong>
                {profile?.name ||
                  "Business name"}
              </strong>
            ) : null}
          </div>

          <div className="svx-docs-preview-number">
            <span>Receipt</span>
            <strong>
              {receiptPreview}
            </strong>
          </div>

          {copyForm.receiptHeader ? (
            <p>{copyForm.receiptHeader}</p>
          ) : null}

          <div className="svx-docs-preview-lines">
            <span />
            <span />
            <span />
          </div>

          {taxEnabled &&
          docForm
            .showTaxOnCustomerDocuments ? (
            <div className="svx-docs-preview-tax">
              <span>
                {docForm.taxName ||
                  "Tax"}
              </span>

              <strong>
                {(
                  Number(
                    docForm.taxRateBps,
                  ) / 100
                ).toFixed(2)}
                %
              </strong>
            </div>
          ) : null}

          {copyForm.receiptFooter ? (
            <footer>
              {copyForm.receiptFooter}
            </footer>
          ) : null}
        </div>
      </section>

      {dirty && !isReadOnly ? (
        <div className="svx-docs-savebar">
          <div>
            <strong>Unsaved changes</strong>
            <p>
              Save to update your
              documents.
            </p>
          </div>

          <AsyncButton
            loading={saving}
            loadingText="Saving..."
            disabled={saving}
            onClick={onSave}
          >
            Save changes
          </AsyncButton>
        </div>
      ) : null}
    </div>
  );
}

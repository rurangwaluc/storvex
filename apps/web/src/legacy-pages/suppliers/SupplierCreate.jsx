import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { createSupplier } from "../../services/suppliersApi";

const ID_TYPES = [
  { value: "NATIONAL_ID", label: "National identity card" },
  { value: "PASSPORT", label: "Passport" },
];

const SOURCE_TYPES = [
  { value: "BOUGHT", label: "Bought stock" },
  { value: "GIFT", label: "Gifted stock" },
  { value: "TRADE_IN", label: "Trade-in" },
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "OTHER", label: "Other source" },
];

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function textareaClass() {
  return "w-full min-h-[128px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]";
}

function badgeClass(tone = "neutral") {
  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function sourceLabel(value) {
  return SOURCE_TYPES.find((item) => item.value === value)?.label || "Other source";
}

function identityLabel(value) {
  return ID_TYPES.find((item) => item.value === value)?.label || "Identity document";
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h1
        className={cx(
          "mt-3 text-[1.6rem] font-black tracking-[-0.04em] sm:text-[1.95rem]",
          strongText()
        )}
      >
        {title}
      </h1>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Field({ label, required = false, hint, children }) {
  return (
    <div className="min-w-0">
      <label className={cx("mb-1.5 block text-sm font-black", strongText())}>
        {label}
        {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
      </label>

      {children}

      {hint ? (
        <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{hint}</div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative min-h-[124px] overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 break-words text-lg font-black tracking-[-0.03em]", strongText())}>
          {value || "—"}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
        ) : null}
      </div>
    </article>
  );
}

function PreviewPanel({ form }) {
  const hasRequired = cleanString(form.name) && cleanString(form.idNumber);

  return (
    <aside className={cx(pageCard(), "h-fit p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={hasRequired ? "success" : "warning"}>
          {hasRequired ? "Ready to save" : "Missing required details"}
        </Badge>
        <Badge tone="primary">{sourceLabel(form.sourceType)}</Badge>
      </div>

      <div className={cx("mt-5 text-lg font-black tracking-[-0.03em]", strongText())}>
        Supplier snapshot
      </div>

      <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
        This is what the owner and staff will see when reviewing supplier history.
      </p>

      <div className="mt-5 space-y-3">
        <div className={cx(softPanel(), "p-4")}>
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            Supplier
          </div>
          <div className={cx("mt-2 break-words text-sm font-black", strongText())}>
            {cleanString(form.name) || "Not set yet"}
          </div>
          <div className={cx("mt-1 break-words text-xs font-semibold leading-5", mutedText())}>
            {cleanString(form.companyName) || "No company name added"}
          </div>
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            Contact
          </div>
          <div className={cx("mt-2 break-words text-sm font-black", strongText())}>
            {cleanString(form.phone) || "No phone added"}
          </div>
          <div className={cx("mt-1 break-words text-xs font-semibold leading-5", mutedText())}>
            {cleanString(form.email) || "No email added"}
          </div>
        </div>

        <div className={cx(softPanel(), "p-4")}>
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            Proof document
          </div>
          <div className={cx("mt-2 break-words text-sm font-black", strongText())}>
            {identityLabel(form.idType)}
          </div>
          <div className={cx("mt-1 break-words text-xs font-semibold leading-5", mutedText())}>
            {cleanString(form.idNumber) || "Document number not added"}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function SupplierCreate() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    idType: "NATIONAL_ID",
    idNumber: "",
    phone: "",
    email: "",
    address: "",
    sourceType: "BOUGHT",
    sourceDetails: "",
    notes: "",
    companyName: "",
    taxId: "",
  });

  const completion = useMemo(() => {
    const required = [form.name, form.idNumber];
    const completed = required.filter((item) => cleanString(item)).length;
    return `${completed}/${required.length}`;
  }, [form.name, form.idNumber]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;

    const payload = {
      name: cleanString(form.name),
      idType: form.idType,
      idNumber: cleanString(form.idNumber),
      phone: cleanString(form.phone) || null,
      email: cleanString(form.email) || null,
      address: cleanString(form.address) || null,
      sourceType: form.sourceType,
      sourceDetails: cleanString(form.sourceDetails) || null,
      notes: cleanString(form.notes) || null,
      companyName: cleanString(form.companyName) || null,
      taxId: cleanString(form.taxId) || null,
    };

    if (!payload.name) {
      toast.error("Supplier name is required");
      return;
    }

    if (!payload.idNumber) {
      toast.error("Document number is required");
      return;
    }

    setSaving(true);

    try {
      const data = await createSupplier(payload);
      const supplierId = data?.supplier?.id || data?.id || "";

      toast.success("Supplier created");

      if (supplierId) {
        nav(`/app/suppliers/${supplierId}`);
      } else {
        nav("/app/suppliers");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to create supplier");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">Supplier records</Badge>
                <Badge tone={completion === "2/2" ? "success" : "warning"}>
                  Required details {completion}
                </Badge>
              </div>

              <SectionHeading
                eyebrow="Suppliers"
                title="Add supplier"
                subtitle="Create a clean supplier profile with identity proof, contact information, source category, and notes for safer stock origin tracking."
              />
            </div>

            <button type="button" onClick={() => nav("/app/suppliers")} className={secondaryBtn()}>
              Back to suppliers
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-3">
          <SummaryCard
            label="Supplier"
            value={cleanString(form.name) || "Not set"}
            note="Person, trader, or company name"
            tone={cleanString(form.name) ? "success" : "warning"}
          />
          <SummaryCard
            label="Proof document"
            value={identityLabel(form.idType)}
            note={cleanString(form.idNumber) || "Document number missing"}
            tone={cleanString(form.idNumber) ? "success" : "warning"}
          />
          <SummaryCard
            label="Stock source"
            value={sourceLabel(form.sourceType)}
            note="How this supplier usually provides items"
            tone="info"
          />
        </div>
      </section>

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className={cx(pageCard(), "overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <SectionHeading
              eyebrow="Supplier information"
              title="Profile details"
              subtitle="Keep this understandable for store owners and staff. Do not enter system references here."
            />
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            <div className={cx(softPanel(), "p-5 sm:p-6")}>
              <div className={cx("text-sm font-black", strongText())}>Main details</div>
              <p className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                Required information used to identify the supplier.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Field label="Supplier name" required hint="Use the name staff will recognize.">
                    <input
                      className="app-input"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                      placeholder="Example: John, ABC Phones Ltd"
                      required
                    />
                  </Field>
                </div>

                <Field label="Proof document" hint="Used to reduce risk when tracking stock origin.">
                  <select
                    className="app-input"
                    value={form.idType}
                    onChange={(event) => setField("idType", event.target.value)}
                  >
                    {ID_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Document number" required hint="National identity number or passport number.">
                  <input
                    className="app-input"
                    value={form.idNumber}
                    onChange={(event) => setField("idNumber", event.target.value)}
                    placeholder="Enter document number"
                    required
                  />
                </Field>
              </div>
            </div>

            <div className={cx(softPanel(), "p-5 sm:p-6")}>
              <div className={cx("text-sm font-black", strongText())}>Contact information</div>
              <p className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                Optional, but useful for follow-up, payments, and issue resolution.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Phone">
                  <input
                    className="app-input"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    placeholder="+2507..."
                  />
                </Field>

                <Field label="Email">
                  <input
                    className="app-input"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    placeholder="supplier@example.com"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Address">
                    <input
                      className="app-input"
                      value={form.address}
                      onChange={(event) => setField("address", event.target.value)}
                      placeholder="Example: Kigali, Gasabo"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className={cx(softPanel(), "p-5 sm:p-6")}>
              <div className={cx("text-sm font-black", strongText())}>Business information</div>
              <p className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                Add company details when the supplier operates as a business.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Company name">
                  <input
                    className="app-input"
                    value={form.companyName}
                    onChange={(event) => setField("companyName", event.target.value)}
                    placeholder="Example: ABC Phones Ltd"
                  />
                </Field>

                <Field label="Tax number">
                  <input
                    className="app-input"
                    value={form.taxId}
                    onChange={(event) => setField("taxId", event.target.value)}
                    placeholder="TIN or tax reference"
                  />
                </Field>

                <Field label="Usual stock source">
                  <select
                    className="app-input"
                    value={form.sourceType}
                    onChange={(event) => setField("sourceType", event.target.value)}
                  >
                    {SOURCE_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Source details">
                  <input
                    className="app-input"
                    value={form.sourceDetails}
                    onChange={(event) => setField("sourceDetails", event.target.value)}
                    placeholder="Example: bought in Dubai"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Internal notes" hint="Use for trust level, warnings, or follow-up details.">
                    <textarea
                      className={textareaClass()}
                      rows={5}
                      value={form.notes}
                      onChange={(event) => setField("notes", event.target.value)}
                      placeholder="Example: trusted supplier, verify invoice before large purchases..."
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => nav("/app/suppliers")} className={secondaryBtn()} disabled={saving}>
                Cancel
              </button>

              <AsyncButton type="submit" loading={saving} loadingText="Saving..." className={primaryBtn()}>
                Save supplier
              </AsyncButton>
            </div>
          </div>
        </section>

        <PreviewPanel form={form} />
      </form>
    </div>
  );
}
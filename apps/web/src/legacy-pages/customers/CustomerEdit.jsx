// frontend-stores/src/pages/customers/CustomerEdit.jsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getCustomer, updateCustomer } from "../../services/customersApi";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function shell() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function panel() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-soft)]";
}

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return [
    "w-full min-h-[140px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]",
    "px-4 py-3 text-sm leading-6 text-[var(--color-text)]",
    "outline-none transition placeholder:text-[var(--color-text-muted)]",
    "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]",
    "resize-y shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
  ].join(" ");
}

function labelClass() {
  return cx("mb-1.5 block text-sm font-medium", strongText());
}

function secondaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90",
    disabled && "pointer-events-none cursor-not-allowed opacity-60"
  );
}

function SkeletonLine({ className = "" }) {
  return <div className={cx("animate-pulse rounded-full bg-[var(--color-surface)]", className)} />;
}

function InfoTile({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "danger"
      ? "text-[var(--color-danger)]"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-300"
        : strongText();

  return (
    <div className={cx(panel(), "p-4")}>
      <div className={cx("text-[10px] font-semibold uppercase tracking-[0.16em]", mutedText())}>
        {label}
      </div>
      <div className={cx("mt-2 text-sm font-bold leading-6", valueClass)}>
        {value || "—"}
      </div>
    </div>
  );
}

function FormSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={cx(
          "relative h-6 w-11 rounded-full transition",
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface)]"
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-card)] shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </span>

      <span className={cx("text-sm font-medium", strongText())}>Allow WhatsApp follow-up</span>
    </button>
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-6">
      <section className={cx(shell(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="mt-4 h-8 w-56 max-w-full" />
              <SkeletonLine className="mt-3 h-4 w-full max-w-[620px]" />
              <SkeletonLine className="mt-2 h-4 w-full max-w-[440px]" />
            </div>

            <div className="h-11 w-36 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={cx(panel(), "space-y-5 p-5 sm:p-6")}>
            <SkeletonLine className="h-5 w-40" />
            <SkeletonLine className="h-4 w-72 max-w-full" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index}>
                  <SkeletonLine className="mb-2 h-3 w-24" />
                  <div className="h-11 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
                </div>
              ))}
            </div>

            <SkeletonLine className="h-32 w-full rounded-2xl" />
          </div>

          <section className={cx(shell(), "h-[360px] animate-pulse p-5 sm:p-6")} />
        </div>
      </section>
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  tinNumber: "",
  idNumber: "",
  notes: "",
  whatsappOptIn: false,
};

export default function CustomerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadCustomer() {
      if (!id) {
        setLoading(false);
        setCustomer(null);
        return;
      }

      try {
        setLoading(true);

        const data = await getCustomer(id);

        if (!mountedRef.current) return;

        setCustomer(data || null);
        setForm({
          name: data?.name || "",
          phone: data?.phone || "",
          email: data?.email || "",
          address: data?.address || "",
          tinNumber: data?.tinNumber || "",
          idNumber: data?.idNumber || "",
          notes: data?.notes || "",
          whatsappOptIn: Boolean(data?.whatsappOptIn),
        });
      } catch (error) {
        console.error(error);

        if (mountedRef.current) {
          toast.error(error?.message || "Failed to load customer");
          setCustomer(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    void loadCustomer();
  }, [id]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (saving) return;

    const name = String(form.name || "").trim();
    const phone = String(form.phone || "").trim();

    if (!name) {
      toast.error("Customer name is required");
      return;
    }

    if (!phone) {
      toast.error("Phone number is required");
      return;
    }

    try {
      setSaving(true);

      await updateCustomer(id, {
        name,
        phone,
        email: String(form.email || "").trim() || null,
        address: String(form.address || "").trim() || null,
        tinNumber: String(form.tinNumber || "").trim() || null,
        idNumber: String(form.idNumber || "").trim() || null,
        notes: String(form.notes || "").trim() || null,
        whatsappOptIn: Boolean(form.whatsappOptIn),
      });

      toast.success("Customer updated");
      navigate("/app/customers");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <EditSkeleton />;
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <section className={cx(shell(), "p-6 text-center")}>
          <h1 className={cx("text-2xl font-black tracking-tight", strongText())}>
            Customer could not be loaded
          </h1>

          <p className={cx("mx-auto mt-2 max-w-xl text-sm leading-6", mutedText())}>
            This customer was not found or cannot be opened from this store.
          </p>

          <div className="mt-6">
            <Link to="/app/customers" className={secondaryBtn()}>
              Back to Customers
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={cx(shell(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Customer records
              </div>

              <h1 className={cx("mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", strongText())}>
                Edit Customer
              </h1>

              <p className={cx("mt-2 text-sm leading-6", mutedText())}>
                Update the customer profile while keeping their sales, credit, repair, warranty,
                and receipt history connected.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/app/customers" className={secondaryBtn(saving)}>
                Back to Customers
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className={cx(panel(), "p-5 sm:p-6")}>
              <div>
                <h2 className={cx("text-base font-black tracking-tight", strongText())}>
                  Customer details
                </h2>

                <p className={cx("mt-1 text-sm leading-6", mutedText())}>
                  Keep the record clean and useful for staff. Only name and phone are required.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass()}>
                    Name <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <input
                    className={inputClass()}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass()}>
                    Phone <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <input
                    className={inputClass()}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    disabled={saving}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass()}>Email</label>
                  <input
                    className={inputClass()}
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className={labelClass()}>Address</label>
                  <input
                    className={inputClass()}
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className={labelClass()}>TIN number</label>
                  <input
                    className={inputClass()}
                    value={form.tinNumber}
                    onChange={(e) => setField("tinNumber", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className={labelClass()}>ID number</label>
                  <input
                    className={inputClass()}
                    value={form.idNumber}
                    onChange={(e) => setField("idNumber", e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass()}>Notes</label>
                  <textarea
                    className={textareaClass()}
                    rows={5}
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Internal notes about this customer..."
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <FormSwitch
                  checked={form.whatsappOptIn}
                  onChange={(value) => setField("whatsappOptIn", value)}
                  disabled={saving}
                />

                <p className={cx("mt-2 text-xs leading-5", mutedText())}>
                  Use this only when the customer agrees to receive WhatsApp updates or follow-ups.
                </p>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Link to="/app/customers" className={secondaryBtn(saving)}>
                Cancel
              </Link>

              <AsyncButton
                type="submit"
                loading={saving}
                loadingText="Updating..."
                variant="primary"
              >
                Update Customer
              </AsyncButton>
            </div>
          </form>

          <aside className="space-y-5">
            <section className={cx(shell(), "p-5 sm:p-6 xl:sticky xl:top-5")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
                Review
              </div>

              <h2 className={cx("mt-2 text-base font-black tracking-tight", strongText())}>
                Customer summary
              </h2>

              <p className={cx("mt-1 text-sm leading-6", mutedText())}>
                Check the profile before saving changes.
              </p>

              <div className="mt-5 grid gap-3">
                <InfoTile label="Name" value={form.name || "Not provided"} />
                <InfoTile label="Phone" value={form.phone || "Not provided"} />
                <InfoTile label="Email" value={form.email || "Not provided"} />
                <InfoTile
                  label="WhatsApp"
                  value={form.whatsappOptIn ? "Allowed" : "Not allowed"}
                  tone={form.whatsappOptIn ? "success" : "neutral"}
                />
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
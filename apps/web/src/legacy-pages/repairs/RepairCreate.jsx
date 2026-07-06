import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getCurrentShopType, supportsRepairs } from "../../utils/categoryFeatures";
import { listCustomers } from "../../services/customersApi";
import { createRepair } from "../../services/repairsApi";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}


function RepairsUnavailable() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-[var(--shadow-card)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-soft)]">
          Not used for this business type
        </div>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text)]">
          Repairs are not enabled here
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
          Repair jobs are meant for businesses that actually receive customer items for service, such as electronics, spare parts, and selected lighting/service shops.
        </p>
      </section>
    </div>
  );
}

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-soft)]";
const card = () =>
  "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const panel = () =>
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
const input = () => "app-input";

function primaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function secondaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90",
    disabled && "cursor-not-allowed opacity-60",
  );
}

const EMPTY_FORM = {
  customerId: "",
  device: "",
  serial: "",
  issue: "",
  warrantyEnd: "",
};

function normalizeCustomers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function FieldLabel({ children, required = false }) {
  return (
    <label className={cx("mb-1.5 block text-sm font-medium", strong())}>
      {children}
      {required ? <span className="ml-0.5 text-[var(--color-danger)]">*</span> : null}
    </label>
  );
}

function FieldHelp({ children }) {
  return <p className={cx("mt-1.5 text-xs leading-5", muted())}>{children}</p>;
}

function CreateSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
        <div className="h-9 w-56 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded-full bg-[var(--color-surface-2)]" />
      </div>

      <div className={cx(card(), "space-y-5 p-5 sm:p-6")}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index}>
            <div className="mb-2 h-3 w-24 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
            <div className="h-11 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RepairCreate() {
  const shopType = getCurrentShopType();
  if (!supportsRepairs(shopType)) return <RepairsUnavailable />;

  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);

        const data = await listCustomers();

        if (!mountedRef.current) return;

        const rows = normalizeCustomers(data).filter((customer) => customer.isActive !== false);
        setCustomers(rows);
      } catch (error) {
        if (!mountedRef.current) return;

        toast.error(error?.message || "Failed to load customers");
        setCustomers([]);
      } finally {
        if (mountedRef.current) setLoadingCustomers(false);
      }
    }

    void loadCustomers();
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === form.customerId) || null;
  }, [customers, form.customerId]);

  async function handleSubmit(event) {
    event.preventDefault();

    const device = String(form.device || "").trim();
    const issue = String(form.issue || "").trim();
    const serial = String(form.serial || "").trim();

    if (!form.customerId) {
      toast.error("Select a customer");
      return;
    }

    if (!device) {
      toast.error("Device name is required");
      return;
    }

    if (!issue) {
      toast.error("Issue description is required");
      return;
    }

    setSaving(true);

    try {
      await createRepair({
        customerId: form.customerId,
        device,
        serial: serial || null,
        issue,
        warrantyEnd: form.warrantyEnd || null,
      });

      toast.success("Repair logged");
      navigate("/app/repairs");
    } catch (error) {
      toast.error(error?.message || "Failed to create repair");
    } finally {
      setSaving(false);
    }
  }

  if (loadingCustomers) {
    return <CreateSkeleton />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
            Operations
          </div>

          <h1 className={cx("mt-2 text-[1.7rem] font-black tracking-tight", strong())}>
            New repair
          </h1>

          <p className={cx("mt-2 text-sm leading-6", muted())}>
            Log a customer device intake. You can assign a technician and update progress from the repairs list.
          </p>
        </div>

        <Link to="/app/repairs" className={secondaryBtn(saving)}>
          Back to repairs
        </Link>
      </div>

      <div className={cx(card(), "p-5 sm:p-6")}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <FieldLabel required>Customer</FieldLabel>

            <select
              className={input()}
              value={form.customerId}
              onChange={(event) => setField("customerId", event.target.value)}
              disabled={saving}
              required
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.phone ? ` — ${customer.phone}` : ""}
                </option>
              ))}
            </select>

            <FieldHelp>
              Only active customers appear here. Create the customer first if they are not listed.
            </FieldHelp>
          </div>

          {selectedCustomer ? (
            <div className={cx(panel(), "p-4")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Selected customer
              </div>
              <div className={cx("mt-2 text-sm font-bold", strong())}>
                {selectedCustomer.name}
              </div>
              <div className={cx("mt-1 text-xs", muted())}>
                {selectedCustomer.phone || "No phone saved"}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel required>Device</FieldLabel>

              <input
                className={input()}
                placeholder="Example: Samsung Galaxy A54"
                value={form.device}
                onChange={(event) => setField("device", event.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div>
              <FieldLabel>Serial / IMEI</FieldLabel>

              <input
                className={input()}
                placeholder="Optional"
                value={form.serial}
                onChange={(event) => setField("serial", event.target.value)}
                disabled={saving}
              />

              <FieldHelp>Helps identify the exact device if there is a dispute.</FieldHelp>
            </div>
          </div>

          <div>
            <FieldLabel required>Issue description</FieldLabel>

            <textarea
              className="min-h-[112px] w-full resize-y rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]"
              placeholder="Describe the fault or complaint reported by the customer…"
              value={form.issue}
              onChange={(event) => setField("issue", event.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="max-w-xs">
            <FieldLabel>Warranty end date</FieldLabel>

            <input
              type="date"
              className={input()}
              value={form.warrantyEnd}
              onChange={(event) => setField("warrantyEnd", event.target.value)}
              disabled={saving}
            />

            <FieldHelp>Leave blank if no warranty applies to this device.</FieldHelp>
          </div>

          <div className={cx(panel(), "p-4 text-sm leading-6", muted())}>
            The repair starts as{" "}
            <span className={cx("font-semibold", strong())}>Received</span>. Assign a technician
            and update the status after the record is created.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Link to="/app/repairs" className={secondaryBtn(saving)}>
              Cancel
            </Link>

            <AsyncButton type="submit" loading={saving} loadingText="Logging..." className={primaryBtn(saving)}>
              Log repair
            </AsyncButton>
          </div>
        </form>
      </div>
    </div>
  );
}
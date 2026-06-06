import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { listCustomers } from "../../services/customersApi";
import { getRepair, updateRepair } from "../../services/repairsApi";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
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

function normalizeCustomers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeRepair(data) {
  const repair = data?.repair || data || {};

  return {
    id: repair.id || null,
    customerId: repair.customerId || "",
    customer: repair.customer || null,
    device: repair.device || "",
    serial: repair.serial || "",
    issue: repair.issue || "",
    status: repair.status || "RECEIVED",
    warrantyEnd: repair.warrantyEnd || "",
    technician: repair.technician || null,
    createdAt: repair.createdAt || null,
  };
}

function toInputDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
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

function EditSkeleton() {
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

export default function RepairEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [repair, setRepair] = useState(null);

  const [form, setForm] = useState({
    customerId: "",
    device: "",
    serial: "",
    issue: "",
    warrantyEnd: "",
  });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);

        const [customersData, repairData] = await Promise.all([
          listCustomers(),
          getRepair(id),
        ]);

        if (!mountedRef.current) return;

        const normalized = normalizeRepair(repairData);
        const customerRows = normalizeCustomers(customersData).filter(
          (customer) => customer.isActive !== false || customer.id === normalized.customerId,
        );

        setCustomers(customerRows);
        setRepair(normalized);

        setForm({
          customerId: normalized.customerId || "",
          device: normalized.device || "",
          serial: normalized.serial || "",
          issue: normalized.issue || "",
          warrantyEnd: toInputDate(normalized.warrantyEnd),
        });
      } catch (error) {
        if (!mountedRef.current) return;

        toast.error(error?.message || "Failed to load repair");
        setRepair(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    void load();
  }, [id]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === form.customerId) || repair?.customer || null;
  }, [customers, form.customerId, repair]);

  async function handleSubmit(event) {
    event.preventDefault();

    const device = String(form.device || "").trim();
    const issue = String(form.issue || "").trim();
    const serial = String(form.serial || "").trim();

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
      await updateRepair(id, {
        device,
        serial: serial || null,
        issue,
        warrantyEnd: form.warrantyEnd || null,
      });

      toast.success("Repair updated");
      navigate("/app/repairs");
    } catch (error) {
      toast.error(error?.message || "Failed to update repair");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <EditSkeleton />;
  }

  if (!repair) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <section className={cx(card(), "p-6 text-center")}>
          <h1 className={cx("text-2xl font-black tracking-tight", strong())}>
            Repair could not be loaded
          </h1>

          <p className={cx("mx-auto mt-2 max-w-xl text-sm leading-6", muted())}>
            This repair was not found or cannot be opened from the current store location.
          </p>

          <div className="mt-6">
            <Link to="/app/repairs" className={secondaryBtn()}>
              Back to repairs
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
            Operations
          </div>

          <h1 className={cx("mt-2 text-[1.7rem] font-black tracking-tight", strong())}>
            Edit repair
          </h1>

          <p className={cx("mt-2 text-sm leading-6", muted())}>
            Correct the intake details for this customer repair. Status and technician changes are handled from the repair list.
          </p>
        </div>

        <Link to="/app/repairs" className={secondaryBtn(saving)}>
          Back to repairs
        </Link>
      </div>

      <div className={cx(card(), "p-5 sm:p-6")}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={cx(panel(), "p-4")}>
            <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
              Repair summary
            </div>

            <div className={cx("mt-2 text-sm font-bold", strong())}>
              {repair.device || "Repair"}
            </div>

            <div className={cx("mt-1 text-xs leading-5", muted())}>
              Status: {repair.status || "RECEIVED"} • Logged: {formatDate(repair.createdAt)}
              {repair.technician?.name ? ` • Technician: ${repair.technician.name}` : ""}
            </div>
          </div>

          <div>
            <FieldLabel>Customer</FieldLabel>

            <select
              className={input()}
              value={form.customerId}
              disabled
              onChange={(event) => setField("customerId", event.target.value)}
            >
              <option value="">Customer not shown</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.phone ? ` — ${customer.phone}` : ""}
                </option>
              ))}
            </select>

            <FieldHelp>
              Customer cannot be changed here to keep the repair record traceable.
            </FieldHelp>
          </div>

          {selectedCustomer ? (
            <div className={cx(panel(), "p-4")}>
              <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
                Customer
              </div>
              <div className={cx("mt-2 text-sm font-bold", strong())}>
                {selectedCustomer.name || "Customer"}
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
            This screen only edits the repair intake details. Use the repairs list to assign a technician,
            update progress, archive, or delete the repair.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Link to="/app/repairs" className={secondaryBtn(saving)}>
              Cancel
            </Link>

            <AsyncButton type="submit" loading={saving} loadingText="Saving..." className={primaryBtn(saving)}>
              Save repair
            </AsyncButton>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { cn } from "../../lib/cn";
import AsyncButton from "../../components/ui/AsyncButton";
import TableSkeleton from "../../components/ui/TableSkeleton";
import "./Customers.css";
import {
  createCustomer,
  deactivateCustomer,
  getCustomerLedger,
  listCustomers,
  reactivateCustomer,
  updateCustomer,
} from "../../services/customersApi";

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-soft)]";
const danger = () => "text-[var(--color-danger)]";

const card = () => "svx-customer-card";

const panel = () => "svx-customer-panel";

const raised = () => "svx-customer-panel";

function formatMoney(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

function normalizeCustomerResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function normalizeLedgerResponse(data) {
  return data || {
    customer: null,
    summary: {
      totalSales: 0,
      totalAll: 0,
      totalPaid: 0,
      totalOutstanding: 0,
    },
    sales: [],
  };
}

function PulseBar({ className = "" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-full bg-[var(--color-surface)]",
        className,
      )}
    />
  );
}

function Pill({ children, tone = "neutral" }) {
  const cls =
    tone === "success"
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-amber-500/14 text-amber-700 dark:text-amber-300"
        : tone === "danger"
          ? "bg-[rgba(219,80,74,0.14)] text-[var(--color-danger)]"
          : tone === "info"
            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            : "bg-[var(--color-surface)] text-[var(--color-text-muted)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function InfoStat({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "danger" ? danger() : tone === "success" ? "text-emerald-600" : strong();

  return (
    <div className={cn(raised(), "p-3")}>
      <div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", muted())}>
        {label}
      </div>
      <div className={cn("mt-1.5 text-sm font-bold", valueClass)}>{value || "—"}</div>
    </div>
  );
}

function EmptyState({ title, text, action = null }) {
  return (
    <div className={cn(panel(), "px-5 py-12 text-center")}>
      <div className={cn("text-sm font-semibold", strong())}>{title}</div>
      <div className={cn("mx-auto mt-1 max-w-md text-xs leading-5", muted())}>{text}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function CustomerListPageSkeleton() {
  return (
    <div className="svx-customers-page space-y-6">
      <div className={cn(card(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <PulseBar className="h-3 w-16" />
              <PulseBar className="mt-4 h-8 w-44 max-w-full" />
              <PulseBar className="mt-3 h-4 w-full max-w-[520px]" />
              <PulseBar className="mt-2 h-4 w-full max-w-[440px]" />
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
              <div className="h-11 w-36 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4 sm:px-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={cn(panel(), "p-3")}>
              <PulseBar className="h-3 w-16" />
              <PulseBar className="mt-3 h-7 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className={cn(card(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="h-11 w-full max-w-xs animate-pulse rounded-2xl bg-[var(--color-surface)]" />
            <div className="h-11 w-32 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
          </div>
        </div>

        <div className="hidden lg:block">
          <TableSkeleton rows={8} cols={6} />
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={cn(panel(), "space-y-2 p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <PulseBar className="h-4 w-36" />
                  <PulseBar className="h-3 w-24" />
                  <PulseBar className="h-3 w-28" />
                </div>
                <PulseBar className="h-6 w-16 rounded-full" />
              </div>
              <div className="mt-3 flex gap-2">
                <PulseBar className="h-8 w-16 rounded-2xl" />
                <PulseBar className="h-8 w-16 rounded-2xl" />
                <PulseBar className="h-8 w-20 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
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

function CustomerFormModal({ initial, onSave, onClose, busy }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial || {}) });
  const isEdit = Boolean(initial?.id);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!String(form.name || "").trim()) {
      toast.error("Customer name is required");
      return;
    }

    if (!String(form.phone || "").trim()) {
      toast.error("Phone number is required");
      return;
    }

    onSave(form);
  }

  const labelClass = cn("mb-1.5 block text-sm font-medium", strong());

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close customer form"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div
        className={cn(
          card(),
          "relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6",
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className={cn("text-lg font-black tracking-tight", strong())}>
              {isEdit ? "Edit customer" : "New customer"}
            </div>
            <div className={cn("mt-1 text-xs leading-5", muted())}>
              {isEdit
                ? "Update customer details while keeping their history connected."
                : "Create a customer profile for sales, credit follow-up, and communication."}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn(
              "rounded-xl p-1.5 transition hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-60",
              muted(),
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Name <span className={danger()}>*</span>
              </label>
              <input
                className="app-input"
                value={form.name || ""}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Phone <span className={danger()}>*</span>
              </label>
              <input
                className="app-input"
                value={form.phone || ""}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="07x xxx xxxx"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                className="app-input"
                type="email"
                value={form.email || ""}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                className="app-input"
                value={form.address || ""}
                onChange={(event) => setField("address", event.target.value)}
                placeholder="Physical address"
              />
            </div>

            <div>
              <label className={labelClass}>TIN number</label>
              <input
                className="app-input"
                value={form.tinNumber || ""}
                onChange={(event) => setField("tinNumber", event.target.value)}
                placeholder="TIN / VAT number"
              />
            </div>

            <div>
              <label className={labelClass}>ID number</label>
              <input
                className="app-input"
                value={form.idNumber || ""}
                onChange={(event) => setField("idNumber", event.target.value)}
                placeholder="National ID / Passport"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-ring)]"
                rows={5}
                value={form.notes || ""}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Internal notes about this customer…"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                form.whatsappOptIn ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface)]",
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-[var(--color-card)] shadow transition-transform",
                  form.whatsappOptIn ? "translate-x-5" : "translate-x-0.5",
                )}
              />

              <input
                type="checkbox"
                className="sr-only"
                checked={Boolean(form.whatsappOptIn)}
                onChange={(event) => setField("whatsappOptIn", event.target.checked)}
              />
            </div>

            <span className={cn("text-sm font-medium", strong())}>
              Customer accepts WhatsApp updates
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <AsyncButton
              type="submit"
              loading={busy}
              loadingText={isEdit ? "Saving..." : "Creating..."}
              variant="primary"
              className="flex-1"
            >
              {isEdit ? "Save changes" : "Create customer"}
            </AsyncButton>

            <AsyncButton
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={busy}
              className="flex-1"
            >
              Cancel
            </AsyncButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function LedgerDrawer({ customerId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLedger() {
      try {
        setLoading(true);

        const result = await getCustomerLedger(customerId, {}, { signal: controller.signal });

        if (!controller.signal.aborted) {
          setLedger(normalizeLedgerResponse(result));
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          toast.error(error?.message || "Failed to load customer history");
          setLedger(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadLedger();

    return () => controller.abort();
  }, [customerId]);

  const sales = Array.isArray(ledger?.sales) ? ledger.sales : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close customer history"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className={cn(card(), "relative z-10 flex w-full max-w-xl flex-col overflow-hidden")}>
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <div className={cn("text-lg font-black tracking-tight", strong())}>
              {loading ? "Loading..." : ledger?.customer?.name || "Customer history"}
            </div>
            <div className={cn("mt-1 text-xs", muted())}>
              Purchases, payments, and outstanding balance
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-xl p-1.5 hover:opacity-75", muted())}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 18L18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={cn(panel(), "space-y-2 p-4")}>
                <PulseBar className="h-3 w-32" />
                <PulseBar className="h-3 w-full" />
                <PulseBar className="h-3 w-3/4" />
              </div>
            ))
          ) : !ledger ? (
            <EmptyState title="No customer history" text="Could not load this customer's history." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InfoStat label="Sales" value={ledger.summary?.totalSales ?? "0"} />
                <InfoStat label="Total value" value={formatMoney(ledger.summary?.totalAll)} />
                <InfoStat label="Paid" value={formatMoney(ledger.summary?.totalPaid)} tone="success" />
                <InfoStat
                  label="Outstanding"
                  value={formatMoney(ledger.summary?.totalOutstanding)}
                  tone={Number(ledger.summary?.totalOutstanding || 0) > 0 ? "danger" : "success"}
                />
              </div>

              {sales.length > 0 ? (
                <div className="space-y-3">
                  <div className={cn("text-sm font-bold", strong())}>Sales history</div>

                  {sales.map((sale) => (
                    <div key={sale.id} className={cn(panel(), "p-3")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className={cn("text-sm font-bold", strong())}>
                            {sale.receiptNumber || sale.invoiceNumber || sale.id?.slice(-8) || "Sale"}
                          </div>
                          <div className={cn("text-xs", muted())}>{formatDate(sale.createdAt)}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={sale.saleType === "CREDIT" ? "warning" : "success"}>
                            {sale.saleType || "SALE"}
                          </Pill>

                          <Pill
                            tone={
                              sale.status === "PAID"
                                ? "success"
                                : sale.status === "OVERDUE"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {sale.status || "OPEN"}
                          </Pill>

                          <span className={cn("text-sm font-bold", strong())}>
                            {formatMoney(sale.total)}
                          </span>
                        </div>
                      </div>

                      {Number(sale.balanceDue || 0) > 0 ? (
                        <div className={cn("mt-1.5 text-xs font-semibold", danger())}>
                          Balance due: {formatMoney(sale.balanceDue)}
                        </div>
                      ) : null}

                      {Array.isArray(sale.payments) && sale.payments.length > 0 ? (
                        <div className={cn("mt-2 text-xs leading-5", muted())}>
                          Payments:{" "}
                          {sale.payments
                            .map((payment) => `${formatMoney(payment.amount)} ${payment.method || ""}`.trim())
                            .join(" ")}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No sales history"
                  text="This customer does not have sales recorded yet."
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  busy,
  danger: isDanger = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div className={cn(card(), "relative z-10 w-full max-w-sm space-y-4 p-6")}>
        <div className={cn("text-base font-black tracking-tight", strong())}>{title}</div>
        <div className={cn("text-sm leading-6", muted())}>{message}</div>

        <div className="flex gap-2">
          <AsyncButton
            loading={busy}
            loadingText="Working..."
            variant={isDanger ? "secondary" : "primary"}
            onClick={onConfirm}
            className={cn(
              "flex-1",
              isDanger && "!bg-[var(--color-danger)] text-white hover:opacity-95",
            )}
          >
            {confirmLabel}
          </AsyncButton>

          <AsyncButton variant="secondary" onClick={onClose} disabled={busy} className="flex-1">
            Cancel
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}

export default function CustomerList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [withOutstanding, setWithOutstanding] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formBusy, setFormBusy] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [ledgerId, setLedgerId] = useState(null);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function load(options = {}) {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    if (options.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await listCustomers(
        {
          q: q.trim() || undefined,
          includeInactive: showInactive,
          source: sourceFilter,
          withOutstanding,
        },
        {
          signal: controller.signal,
        },
      );

      if (
        !mountedRef.current ||
        controller.signal.aborted
      ) {
        return;
      }

      setCustomers(
        normalizeCustomerResponse(data),
      );

      setCustomerSummary(
        data?.summary || null,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to load customers",
      );

      setCustomers([]);
      setCustomerSummary(null);
    } finally {
      if (
        !mountedRef.current ||
        controller.signal.aborted
      ) {
        return;
      }

      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showInactive,
    sourceFilter,
    withOutstanding,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load({
        silent: true,
      });
    }, 250);

    return () => clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = customers;

  const stats = useMemo(
    () => ({
      active: customers.filter(
        (customer) =>
          customer.isActive !== false,
      ).length,

      marketplace:
        Number(
          customerSummary?.marketplace || 0,
        ) +
        Number(
          customerSummary?.both || 0,
        ),

      totalBusiness:
        customerSummary?.totalBusiness ??
        customers.reduce(
          (sum, customer) =>
            sum +
            Number(
              customer.totalBusiness || 0,
            ),
          0,
        ),

      totalDebt:
        customerSummary?.totalOutstanding ??
        customers.reduce(
          (sum, customer) =>
            sum +
            Number(
              customer.outstanding || 0,
            ),
          0,
        ),
    }),
    [
      customers,
      customerSummary,
    ],
  );

  function openCreate() {
    setEditTarget(null);
    setShowForm(true);
  }

  function openEdit(customer) {
    setEditTarget(customer);
    setShowForm(true);
  }

  async function handleSave(form) {
    setFormBusy(true);

    try {
      const payload = {
        name: String(form.name || "").trim(),
        phone: String(form.phone || "").trim(),
        email: String(form.email || "").trim() || null,
        address: String(form.address || "").trim() || null,
        tinNumber: String(form.tinNumber || "").trim() || null,
        idNumber: String(form.idNumber || "").trim() || null,
        notes: String(form.notes || "").trim() || null,
        whatsappOptIn: Boolean(form.whatsappOptIn),
      };

      if (editTarget?.id) {
        const updated = await updateCustomer(editTarget.id, payload);

        setCustomers((current) =>
          current.map((customer) =>
            customer.id === editTarget.id
              ? {
                  ...customer,
                  ...updated,
                  outstanding: customer.outstanding || updated?.outstanding || 0,
                }
              : customer,
          ),
        );

        toast.success("Customer updated");
      } else {
        const created = await createCustomer(payload);

        setCustomers((current) => [{ ...created, outstanding: 0 }, ...current]);

        toast.success("Customer created");
      }

      setShowForm(false);
      setEditTarget(null);
    } catch (error) {
      toast.error(error?.message || "Failed to save customer");
    } finally {
      if (mountedRef.current) setFormBusy(false);
    }
  }

  async function handleDeactivate() {
    if (!confirmTarget?.customer) return;

    setConfirmBusy(true);

    try {
      await deactivateCustomer(confirmTarget.customer.id);

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === confirmTarget.customer.id
            ? { ...customer, isActive: false }
            : customer,
        ),
      );

      toast.success("Customer deactivated");
      setConfirmTarget(null);
    } catch (error) {
      toast.error(error?.message || "Failed to deactivate customer");
    } finally {
      if (mountedRef.current) setConfirmBusy(false);
    }
  }

  async function handleReactivate() {
    if (!confirmTarget?.customer) return;

    setConfirmBusy(true);

    try {
      const updated = await reactivateCustomer(confirmTarget.customer.id);

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === confirmTarget.customer.id
            ? {
                ...customer,
                ...updated,
                isActive: true,
                outstanding: customer.outstanding || updated?.outstanding || 0,
              }
            : customer,
        ),
      );

      toast.success("Customer reactivated");
      setConfirmTarget(null);
    } catch (error) {
      toast.error(error?.message || "Failed to reactivate customer");
    } finally {
      if (mountedRef.current) setConfirmBusy(false);
    }
  }

  if (loading && customers.length === 0) {
    return <CustomerListPageSkeleton />;
  }

  return (
    <div className="svx-customers-page space-y-6">
      <section className={cn(card(), "svx-customer-shell overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", soft())}>
                CRM
              </div>

              <h1
                className={cn(
                  "mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]",
                  strong(),
                )}
              >
                Customers
              </h1>

              <p className={cn("mt-2 max-w-3xl text-sm leading-6", muted())}>
                Manage Store and Marketplace customers together, including purchases,
                latest activity, contact details, and outstanding balances.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center">
              <AsyncButton
                loading={refreshing}
                loadingText="Refreshing..."
                variant="secondary"
                onClick={() => load({ silent: true })}
              >
                Refresh
              </AsyncButton>

              <AsyncButton loading={false} variant="primary" onClick={openCreate}>
                New customer
              </AsyncButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4 sm:px-6">
          <InfoStat
            label="Active"
            value={stats.active}
          />

          <InfoStat
            label="Marketplace customers"
            value={stats.marketplace}
          />

          <InfoStat
            label="Total business"
            value={formatMoney(
              stats.totalBusiness,
            )}
          />

          <InfoStat
            label="Outstanding"
            value={formatMoney(
              stats.totalDebt,
            )}
            tone={
              stats.totalDebt > 0
                ? "danger"
                : "success"
            }
          />
        </div>
      </section>

      <section className={cn(card(), "svx-customer-shell overflow-hidden")}>
          <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
            <div className="svx-customer-filter-layout">
              <input
                className="app-input svx-customer-search"
                placeholder="Search name, phone, email, TIN, or ID…"
                value={q}
                onChange={(event) =>
                  setQ(event.target.value)
                }
              />

              <div className="svx-customer-filters">
                <label className="svx-customer-filter-field">
                  <span>Customer source</span>

                  <select
                    className="app-input"
                    value={sourceFilter}
                    onChange={(event) =>
                      setSourceFilter(
                        event.target.value,
                      )
                    }
                  >
                    <option value="ALL">
                      All customers
                    </option>

                    <option value="STORE">
                      Store
                    </option>

                    <option value="MARKETPLACE">
                      Marketplace
                    </option>

                    <option value="BOTH">
                      Store and Marketplace
                    </option>
                  </select>
                </label>

                <button
                  type="button"
                  className={cn(
                    "svx-customer-filter-button",
                    withOutstanding &&
                      "is-active",
                  )}
                  aria-pressed={withOutstanding}
                  onClick={() =>
                    setWithOutstanding(
                      (current) => !current,
                    )
                  }
                >
                  With unpaid balance
                </button>

                <button
                  type="button"
                  className={cn(
                    "svx-customer-filter-button",
                    showInactive &&
                      "is-active",
                  )}
                  aria-pressed={showInactive}
                  onClick={() =>
                    setShowInactive(
                      (current) => !current,
                    )
                  }
                >
                  {showInactive
                    ? "Including inactive"
                    : "Active only"}
                </button>
              </div>
            </div>
          </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="svx-customer-table w-full table-fixed">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                  {[
                    "Customer",
                    "Source",
                    "Latest activity",
                    "Total business",
                    "Outstanding",
                    "Actions",
                  ].map(
                  (heading) => (
                    <th
                      key={heading}
                      className={cn(
                        "px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em]",
                        muted(),
                      )}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <TableSkeleton rows={8} cols={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className={cn("text-sm font-semibold", strong())}>No customers found</div>
                    <div className={cn("mt-1 text-xs", muted())}>
                      Try another search or create a new customer.
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => navigate(`/app/customers/${customer.id}`)}
                    className={cn(
                      "cursor-pointer border-b border-[var(--color-border)] transition hover:bg-[var(--customer-neutral-panel)]",
                      customer.isActive === false && "opacity-50",
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className={cn("text-sm font-bold", strong())}>{customer.name}</div>
                      <div className={cn("mt-1 space-y-0.5 text-xs", muted())}>
                        <div>{customer.phone}</div>
                        {customer.email ? <div>{customer.email}</div> : null}
                      </div>
                    </td>

                      <td className="px-5 py-3">
                        <span className="svx-customer-source">
                          {customer.source === "BOTH"
                            ? "Store and Marketplace"
                            : customer.source === "MARKETPLACE"
                              ? "Marketplace"
                              : "Store"}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div
                          className={cn(
                            "text-sm font-semibold",
                            strong(),
                          )}
                        >
                          {formatDate(
                            customer.lastActivityAt,
                          )}
                        </div>

                        <div
                          className={cn(
                            "mt-1 text-xs",
                            muted(),
                          )}
                        >
                          {Number(
                            customer.totalSales || 0,
                          )}{" "}
                          {Number(
                            customer.totalSales || 0,
                          ) === 1
                            ? "sale"
                            : "sales"}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div
                          className={cn(
                            "text-sm font-bold",
                            strong(),
                          )}
                        >
                          {formatMoney(
                            customer.totalBusiness,
                          )}
                        </div>

                        {Number(
                          customer.marketplaceOrders || 0,
                        ) > 0 ? (
                          <div
                            className={cn(
                              "mt-1 text-xs",
                              muted(),
                            )}
                          >
                            {customer.marketplaceOrders} Marketplace{" "}
                            {Number(
                              customer.marketplaceOrders,
                            ) === 1
                              ? "order"
                              : "orders"}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-5 py-3">
                        {Number(
                          customer.outstanding || 0,
                        ) > 0 ? (
                          <span
                            className={cn(
                              "text-sm font-bold",
                              danger(),
                            )}
                          >
                            {formatMoney(
                              customer.outstanding,
                            )}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "text-sm",
                              muted(),
                            )}
                          >
                            None
                          </span>
                        )}
                      </td>

                    <td className="px-5 py-3">
                        <div className="svx-customer-row-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setLedgerId(customer.id);
                            }}
                          >
                            History
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(customer);
                            }}
                          >
                            Edit
                          </button>

                          {customer.isActive !== false ? (
                            <button
                              type="button"
                              className="is-danger"
                              onClick={(event) => {
                                event.stopPropagation();

                                setConfirmTarget({
                                  customer,
                                  action: "deactivate",
                                });
                              }}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="is-primary"
                              onClick={(event) => {
                                event.stopPropagation();

                                setConfirmTarget({
                                  customer,
                                  action: "reactivate",
                                });
                              }}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={cn(panel(), "space-y-2 p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-36 animate-pulse rounded-full bg-[var(--color-surface)]" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-surface)]" />
                  </div>
                  <div className="h-9 w-16 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <EmptyState title="No customers found" text="Try adjusting your search." />
          ) : (
            filtered.map((customer) => (
              <Link
                key={customer.id}
                to={`/app/customers/${customer.id}`}
                className={cn(panel(), "block p-4 transition hover:border-[var(--color-primary)]", customer.isActive === false && "opacity-50")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cn("truncate text-sm font-bold", strong())}>
                      {customer.name}
                    </div>
                    <div className={cn("mt-0.5 text-xs", muted())}>{customer.phone}</div>
                    {customer.email ? (
                      <div className={cn("text-xs", muted())}>{customer.email}</div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill tone={customer.isActive !== false ? "success" : "neutral"}>
                      {customer.isActive !== false ? "Active" : "Inactive"}
                    </Pill>

                    {Number(customer.outstanding || 0) > 0 ? (
                      <Pill tone="danger">{formatMoney(customer.outstanding)}</Pill>
                    ) : null}
                  </div>
                </div>

                  <div className="svx-customer-mobile-summary">
                    <div>
                      <span>Source</span>
                      <strong>
                        {customer.source === "BOTH"
                          ? "Store and Marketplace"
                          : customer.source === "MARKETPLACE"
                            ? "Marketplace"
                            : "Store"}
                      </strong>
                    </div>

                    <div>
                      <span>Total business</span>
                      <strong>
                        {formatMoney(
                          customer.totalBusiness,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Latest activity</span>
                      <strong>
                        {formatDate(
                          customer.lastActivityAt,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Sales</span>
                      <strong>
                        {Number(
                          customer.totalSales || 0,
                        )}
                      </strong>
                    </div>
                  </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setLedgerId(customer.id);
                    }}
                    className="whitespace-nowrap rounded-2xl bg-[var(--customer-neutral-panel)] px-3 py-2 text-xs font-bold text-[var(--color-text)]"
                  >
                    Quick history
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openEdit(customer);
                    }}
                    className="whitespace-nowrap rounded-2xl bg-[var(--customer-neutral-panel)] px-3 py-2 text-xs font-bold text-[var(--color-text)]"
                  >
                    Quick edit
                  </button>

                  {customer.isActive !== false ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setConfirmTarget({ customer, action: "deactivate" });
                      }}
                      className="whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-semibold text-[var(--color-danger)]"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setConfirmTarget({ customer, action: "reactivate" });
                      }}
                      className="whitespace-nowrap rounded-2xl px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {!loading ? (
          <div className={cn("border-t border-[var(--color-border)] px-5 py-3 text-xs", muted())}>
            Showing {filtered.length} of {customers.length} customer{customers.length === 1 ? "" : "s"}
          </div>
        ) : null}
      </section>

      {showForm ? (
        <CustomerFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => {
            if (formBusy) return;
            setShowForm(false);
            setEditTarget(null);
          }}
          busy={formBusy}
        />
      ) : null}

      {confirmTarget ? (
        <ConfirmModal
          title={
            confirmTarget.action === "deactivate"
              ? "Deactivate customer?"
              : "Reactivate customer?"
          }
          message={
            confirmTarget.action === "deactivate"
              ? `This will hide ${confirmTarget.customer.name} from active customer lists. Their history stays saved.`
              : `This will make ${confirmTarget.customer.name} active again.`
          }
          confirmLabel={confirmTarget.action === "deactivate" ? "Deactivate" : "Reactivate"}
          onConfirm={
            confirmTarget.action === "deactivate" ? handleDeactivate : handleReactivate
          }
          onClose={() => {
            if (confirmBusy) return;
            setConfirmTarget(null);
          }}
          busy={confirmBusy}
          danger={confirmTarget.action === "deactivate"}
        />
      ) : null}

      {ledgerId ? <LedgerDrawer customerId={ledgerId} onClose={() => setLedgerId(null)} /> : null}
    </div>
  );
}

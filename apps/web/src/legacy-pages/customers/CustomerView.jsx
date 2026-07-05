import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import "./Customers.css";
import {
  getCustomer,
  getCustomerLedger,
} from "../../services/customersApi";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function card() {
  return "svx-customer-card";
}

function panel() {
  return "svx-customer-panel";
}

function strong() {
  return "text-[var(--color-text)]";
}

function muted() {
  return "text-[var(--color-text-muted)]";
}

function soft() {
  return "text-[var(--color-text-soft)]";
}

function danger() {
  return "text-[var(--color-danger)]";
}

function formatMoney(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

function normalizeLedger(data) {
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
            : "bg-[var(--customer-neutral-panel)] text-[var(--color-text-muted)]";

  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", cls)}>
      {children}
    </span>
  );
}

function InfoTile({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "danger" ? danger() : tone === "success" ? "text-emerald-600 dark:text-emerald-300" : strong();

  return (
    <div className={cx(panel(), "p-4")}>
      <div className={cx("text-[10px] font-bold uppercase tracking-[0.16em]", soft())}>{label}</div>
      <div className={cx("mt-2 break-words text-sm font-black leading-6", valueClass)}>{value || "—"}</div>
    </div>
  );
}

function SkeletonLine({ className = "" }) {
  return <div className={cx("animate-pulse rounded-full bg-[var(--customer-neutral-panel)]", className)} />;
}

function CustomerViewSkeleton() {
  return (
    <div className="svx-customers-page space-y-6">
      <section className={cx(card(), "svx-customer-shell overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="mt-4 h-8 w-56 max-w-full" />
          <SkeletonLine className="mt-3 h-4 w-full max-w-[620px]" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={cx(panel(), "p-4")}>
              <SkeletonLine className="h-3 w-20" />
              <SkeletonLine className="mt-3 h-6 w-28" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LedgerSaleRow({ sale }) {
  const total =
    sale.totalAmount ??
    sale.total ??
    sale.grandTotal ??
    sale.amount ??
    0;

  const paid =
    sale.amountPaid ??
    sale.paidAmount ??
    sale.totalPaid ??
    0;

  const balance =
    sale.balanceDue ??
    sale.outstanding ??
    Math.max(0, Number(total || 0) - Number(paid || 0));

  const status = balance > 0 ? "Open balance" : "Cleared";

  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--customer-neutral-card)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={balance > 0 ? "danger" : "success"}>{status}</Pill>
            {sale.saleNumber ? <Pill>{sale.saleNumber}</Pill> : null}
          </div>

          <div className={cx("mt-3 text-sm font-black", strong())}>
            {formatMoney(total)}
          </div>

          <div className={cx("mt-1 space-y-0.5 text-xs font-semibold leading-5", muted())}>
            <div>Paid {formatMoney(paid)}</div>
            <div>Balance {formatMoney(balance)}</div>
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className={cx("text-[10px] font-bold uppercase tracking-[0.16em]", soft())}>Sale date</div>
          <div className={cx("mt-1 text-sm font-black", strong())}>
            {formatDate(sale.createdAt || sale.saleDate)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerView() {
  const { id } = useParams();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState(normalizeLedger(null));

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadCustomer(options = {}) {
    if (!id) return;

    if (options.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [customerData, ledgerData] = await Promise.all([
        getCustomer(id),
        getCustomerLedger(id),
      ]);

      if (!mountedRef.current) return;

      setCustomer(customerData || null);
      setLedger(normalizeLedger(ledgerData));
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to load customer");
      if (mountedRef.current) {
        setCustomer(null);
        setLedger(normalizeLedger(null));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    void loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const summary = ledger?.summary || {};
  const sales = Array.isArray(ledger?.sales) ? ledger.sales : [];

  const totalSales = Number(summary.totalSales ?? sales.length ?? 0);
  const totalAll = Number(summary.totalAll || 0);
  const totalPaid = Number(summary.totalPaid || 0);
  const totalOutstanding = Number(summary.totalOutstanding || customer?.outstanding || 0);

  const followUpNote = useMemo(() => {
    if (totalOutstanding > 0) return "Customer has an open balance. Follow up before giving more credit.";
    if (customer?.whatsappOptIn) return "Customer allows WhatsApp follow-up.";
    return "Customer is clear. Keep sales, warranty, and repair history connected here.";
  }, [customer?.whatsappOptIn, totalOutstanding]);

  if (loading) {
    return <CustomerViewSkeleton />;
  }

  if (!customer) {
    return (
      <div className="svx-customers-page space-y-6">
        <section className={cx(card(), "p-6 text-center")}>
          <h1 className={cx("text-2xl font-black tracking-tight", strong())}>Customer could not be loaded</h1>
          <p className={cx("mx-auto mt-2 max-w-xl text-sm leading-6", muted())}>
            This customer was not found or cannot be opened from this store.
          </p>
          <div className="mt-6">
            <Link
              to="/app/customers"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--customer-neutral-card)] px-5 text-sm font-bold text-[var(--color-text)]"
            >
              Back to Customers
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="svx-customers-page space-y-6">
      <section className={cx(card(), "svx-customer-shell overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className={cx("text-[11px] font-bold uppercase tracking-[0.18em]", soft())}>
                Customer profile
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className={cx("text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", strong())}>
                  {customer.name}
                </h1>

                <Pill tone={customer.isActive !== false ? "success" : "neutral"}>
                  {customer.isActive !== false ? "Active" : "Inactive"}
                </Pill>

                {totalOutstanding > 0 ? <Pill tone="danger">Owes {formatMoney(totalOutstanding)}</Pill> : null}
              </div>

              <p className={cx("mt-2 max-w-3xl text-sm font-semibold leading-6", muted())}>
                {followUpNote}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <AsyncButton
                loading={refreshing}
                loadingText="Refreshing..."
                variant="secondary"
                onClick={() => loadCustomer({ silent: true })}
              >
                Refresh
              </AsyncButton>

              <Link
                to={`/app/customers/${id}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-white transition hover:opacity-95"
              >
                Edit customer
              </Link>

              <Link
                to="/app/customers"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--customer-neutral-card)] px-5 text-sm font-bold text-[var(--color-text)] transition hover:opacity-90"
              >
                Back
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
          <InfoTile label="Outstanding" value={formatMoney(totalOutstanding)} tone={totalOutstanding > 0 ? "danger" : "success"} />
          <InfoTile label="Total bought" value={formatMoney(totalAll)} />
          <InfoTile label="Total paid" value={formatMoney(totalPaid)} tone="success" />
          <InfoTile label="Credit sales" value={totalSales} />
        </div>
      </section>

      <section className="space-y-5">
        <section className={cx(card(), "svx-customer-shell p-5 sm:p-6")}>
          <div>
            <div className={cx("text-[11px] font-bold uppercase tracking-[0.18em]", soft())}>Customer ledger</div>
            <h2 className={cx("mt-2 text-lg font-black tracking-tight", strong())}>Credit and payment history</h2>
            <p className={cx("mt-1 text-sm leading-6", muted())}>
              See what this customer bought on credit, how much was paid, and what remains.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {sales.length ? (
              sales.slice(0, 12).map((sale) => (
                <LedgerSaleRow key={sale.id || sale.saleNumber} sale={sale} />
              ))
            ) : (
              <div className={cx(panel(), "p-5 text-center")}>
                <div className={cx("text-sm font-black", strong())}>No credit history yet</div>
                <p className={cx("mx-auto mt-2 max-w-md text-xs font-semibold leading-5", muted())}>
                  Credit sales made for this customer will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={cx(card(), "svx-customer-shell p-5 sm:p-6")}>
          <div>
            <div className={cx("text-[11px] font-bold uppercase tracking-[0.18em]", soft())}>Contact</div>
            <h2 className={cx("mt-2 text-lg font-black tracking-tight", strong())}>Customer details</h2>
            <p className={cx("mt-1 text-sm leading-6", muted())}>
              Keep contact, tax, and follow-up details clear for staff.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <InfoTile label="Phone" value={customer.phone} />
            <InfoTile label="Email" value={customer.email || "—"} />
            <InfoTile label="Address" value={customer.address || "—"} />
            <InfoTile label="TIN number" value={customer.tinNumber || "—"} />
            <InfoTile label="ID number" value={customer.idNumber || "—"} />
            <InfoTile
              label="WhatsApp"
              value={customer.whatsappOptIn ? "Allowed for follow-up" : "Not allowed"}
              tone={customer.whatsappOptIn ? "success" : "neutral"}
            />
          </div>

          {customer.notes ? (
            <div className={cx(panel(), "mt-4 p-4")}>
              <div className={cx("text-[10px] font-bold uppercase tracking-[0.16em]", soft())}>Notes</div>
              <div className={cx("mt-2 text-sm font-semibold leading-6", muted())}>{customer.notes}</div>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}

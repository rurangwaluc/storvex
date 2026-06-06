import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  addDealPayment,
  getDeal,
  getDealPayments,
  markPaid,
  markReceived,
  markReturned,
  markSold,
} from "../../services/interStoreApi";

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
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return "w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
}

function successBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[#16a34a] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function warningBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[#d9a700] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function dangerBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-danger)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function formatMoney(n) {
  return `RWF ${Number(n || 0).toLocaleString()}`;
}

function toDateLabel(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function toDateTimeLabel(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusMeta(status) {
  const map = {
    BORROWED: {
      label: "Borrowed",
      chip:
        "border border-[#f7b267]/35 bg-[#f7a541] text-[#3b2206] dark:border-[#f7a541]/22 dark:bg-[#f7a541] dark:text-[#1b1206]",
    },
    RECEIVED: {
      label: "Received",
      chip:
        "border border-[#59b8ff]/35 bg-[#4aa8ff] text-[#071b2b] dark:border-[#4aa8ff]/22 dark:bg-[#4aa8ff] dark:text-[#06131f]",
    },
    SOLD: {
      label: "Sold",
      chip:
        "border border-[#d7ef4a]/35 bg-[#d7ef4a] text-[#283103] dark:border-[#d7ef4a]/22 dark:bg-[#d7ef4a] dark:text-[#182001]",
    },
    PAID: {
      label: "Paid",
      chip:
        "border border-[#8ef0ea]/35 bg-[#8ef0ea] text-[#083232] dark:border-[#8ef0ea]/22 dark:bg-[#8ef0ea] dark:text-[#041d1d]",
    },
    RETURNED: {
      label: "Returned",
      chip:
        "border border-[#ffd36e]/35 bg-[#ffd36e] text-[#3a2804] dark:border-[#ffd36e]/22 dark:bg-[#ffd36e] dark:text-[#1f1603]",
    },
  };

  return (
    map[String(status || "").toUpperCase()] || {
      label: String(status || "Unknown"),
      chip:
        "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]",
    }
  );
}

function StatusPill({ status }) {
  const meta = statusMeta(status);

  return (
    <span
      className={cx(
        "inline-flex min-h-[2rem] items-center justify-center rounded-full px-4 py-1.5 text-xs font-black tracking-[0.01em] shadow-[var(--shadow-soft)]",
        meta.chip
      )}
    >
      {meta.label}
    </span>
  );
}

function SummaryStat({ label, value, note, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-300"
      : tone === "danger"
      ? "text-[var(--color-danger)]"
      : strongText();

  return (
    <div className="rounded-[22px] bg-[var(--color-surface-2)] p-4 shadow-[var(--shadow-soft)]">
      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>
      <div className={cx("mt-2 text-xl font-black tracking-tight", toneClass)}>{value}</div>
      {note ? <div className={cx("mt-2 text-xs leading-5", mutedText())}>{note}</div> : null}
    </div>
  );
}

function InfoCard({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "bg-[#dcfce7]"
      : tone === "warning"
      ? "bg-[#fff1c9]"
      : tone === "danger"
      ? "bg-[rgba(219,80,74,0.12)]"
      : "bg-[var(--color-surface-2)]";

  return (
    <div className={cx("rounded-[22px] p-4 shadow-[var(--shadow-soft)]", toneCls)}>
      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>
      <div className={cx("mt-2 text-sm font-bold leading-6", strongText())}>{value || "—"}</div>
      {sub ? <div className={cx("mt-2 text-xs leading-5", mutedText())}>{sub}</div> : null}
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}
      <h2 className={cx("mt-3 text-[1.45rem] font-black tracking-tight", strongText())}>{title}</h2>
      {text ? <p className={cx("mt-2 text-sm leading-6", mutedText())}>{text}</p> : null}
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <label className={cx("text-sm font-medium", strongText())}>{label}</label>
      <div className="mt-2">{children}</div>
      {hint ? <div className={cx("mt-2 text-xs leading-5", mutedText())}>{hint}</div> : null}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className={cx(pageCard(), "p-6")}>
        <div className="h-4 w-24 rounded bg-[var(--color-surface-2)]" />
        <div className="mt-3 h-9 w-64 rounded bg-[var(--color-surface-2)]" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-[var(--color-surface-2)]" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[22px] bg-[var(--color-surface-2)] p-4 shadow-[var(--shadow-soft)]">
            <div className="h-3 w-24 rounded bg-[var(--color-surface-3)]" />
            <div className="mt-3 h-7 w-32 rounded bg-[var(--color-surface-3)]" />
            <div className="mt-2 h-3 w-40 rounded bg-[var(--color-surface-3)]" />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className={cx(pageCard(), "p-6")}>
            <div className="h-6 w-40 rounded bg-[var(--color-surface-2)]" />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 rounded-[22px] bg-[var(--color-surface-2)]" />
              ))}
            </div>
          </div>

          <div className={cx(pageCard(), "p-6")}>
            <div className="h-6 w-32 rounded bg-[var(--color-surface-2)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 rounded-[22px] bg-[var(--color-surface-2)]" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className={cx(pageCard(), "h-[320px]")} />
          <div className={cx(pageCard(), "h-[280px]")} />
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  open,
  tone = "neutral",
  title,
  subtitle,
  children,
  confirmLabel,
  confirmClassName,
  loading,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  const barTone =
    tone === "success"
      ? "bg-[#16a34a]"
      : tone === "warning"
      ? "bg-[#d9a700]"
      : tone === "danger"
      ? "bg-[var(--color-danger)]"
      : "bg-[var(--color-primary)]";

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
        onClick={loading ? undefined : onClose}
      />
      <div className="absolute inset-0 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center">
          <div className={cx(pageCard(), "w-full overflow-hidden")}>
            <div className={cx("h-1.5", barTone)} />
            <div className="p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl">
                  <h3 className={cx("text-2xl font-black tracking-tight", strongText())}>{title}</h3>
                  {subtitle ? (
                    <p className={cx("mt-2 text-sm leading-6", mutedText())}>{subtitle}</p>
                  ) : null}
                </div>

                <button type="button" onClick={onClose} disabled={loading} className={secondaryBtn()}>
                  Close
                </button>
              </div>

              <div className="mt-6">{children}</div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} disabled={loading} className={secondaryBtn()}>
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={confirmClassName}
                >
                  {loading ? "Saving..." : confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterStoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({
    owed: 0,
    totalPaid: 0,
    balanceDue: 0,
    count: 0,
  });

  const [busyAction, setBusyAction] = useState("");

  const [sellForm, setSellForm] = useState({
    soldPrice: "",
    soldQuantity: "1",
  });

  const [returnForm, setReturnForm] = useState({
    returnedQuantity: "1",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    note: "",
  });

  const [markPaidForm, setMarkPaidForm] = useState({
    paidAmount: "",
    paymentMethod: "CASH",
  });

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  async function loadAll() {
    try {
      setLoading(true);

      const [dealData, paymentsData] = await Promise.all([
        getDeal(String(id)),
        getDealPayments(String(id)),
      ]);

      setDeal(dealData || null);
      setPayments(Array.isArray(paymentsData?.payments) ? paymentsData.payments : []);
      setPaymentSummary(
        paymentsData?.summary || {
          owed: 0,
          totalPaid: 0,
          balanceDue: 0,
          count: 0,
        }
      );

      setSellForm({
        soldPrice: dealData?.soldPrice ? String(Number(dealData.soldPrice)) : "",
        soldQuantity: "1",
      });

      setReturnForm({ returnedQuantity: "1" });

      setMarkPaidForm({
        paidAmount:
          paymentsData?.summary?.balanceDue > 0
            ? String(Number(paymentsData.summary.balanceDue))
            : "",
        paymentMethod: "CASH",
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load deal");
      setDeal(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [id]);

  const supplierLabel = useMemo(() => {
    if (!deal) return "—";
    return deal.supplierTenantId
      ? "Internal store"
      : deal.externalSupplierName || "External supplier";
  }, [deal]);

  const canReceive = deal?.status === "BORROWED";
  const canReturn = deal?.status === "BORROWED" || deal?.status === "RECEIVED";
  const canSell = deal?.status === "RECEIVED";
  const canAddPayment = deal?.status === "SOLD";
  const canMarkPaid = deal?.status === "SOLD";

  const remainingUnits = useMemo(() => {
    if (!deal) return 0;
    return (
      Number(deal.quantity || 0) -
      Number(deal.soldQuantity || 0) -
      Number(deal.returnedQuantity || 0)
    );
  }, [deal]);

  async function runAction(key, fn, successMessage) {
    try {
      setBusyAction(key);
      await fn();
      toast.success(successMessage);
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Action failed");
    } finally {
      setBusyAction("");
    }
  }

  async function handleReceive() {
    await runAction("receive", () => markReceived(String(id)), "Deal marked as received");
  }

  async function handleReturn() {
    const qty = Number(returnForm.returnedQuantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Returned quantity must be more than 0");
      return;
    }

    await runAction(
      "return",
      () =>
        markReturned(String(id), {
          returnedQuantity: Math.floor(qty),
        }),
      "Return recorded"
    );

    setReturnModalOpen(false);
  }

  async function handleSell() {
    const soldQuantity = Number(sellForm.soldQuantity);
    const soldPrice = Number(sellForm.soldPrice);

    if (!Number.isFinite(soldQuantity) || soldQuantity <= 0) {
      toast.error("Sold quantity must be more than 0");
      return;
    }

    if (sellForm.soldPrice !== "" && (!Number.isFinite(soldPrice) || soldPrice <= 0)) {
      toast.error("Sold price must be more than 0");
      return;
    }

    await runAction(
      "sell",
      () =>
        markSold(String(id), {
          soldQuantity: Math.floor(soldQuantity),
          soldPrice: sellForm.soldPrice === "" ? undefined : soldPrice,
        }),
      "Sale recorded"
    );

    setSellModalOpen(false);
  }

  async function handleAddPayment() {
    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Payment amount must be more than 0");
      return;
    }

    await runAction(
      "payment",
      () =>
        addDealPayment(String(id), {
          amount,
          method: paymentForm.method,
          note: String(paymentForm.note || "").trim() || null,
        }),
      "Payment recorded"
    );

    setPaymentForm({
      amount: "",
      method: "CASH",
      note: "",
    });
  }

  async function handleMarkPaid() {
    const paidAmount = Number(markPaidForm.paidAmount);

    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      toast.error("Paid amount must be more than 0");
      return;
    }

    await runAction(
      "paid",
      () =>
        markPaid(String(id), {
          paidAmount,
          paymentMethod: markPaidForm.paymentMethod,
        }),
      "Deal marked as paid"
    );
  }

  if (loading) {
    return <PageSkeleton />;
  }

  if (!deal) {
    return (
      <div className={cx(pageCard(), "px-5 py-12 text-center")}>
        <div className={cx("text-lg font-semibold", strongText())}>Deal not found</div>
        <div className={cx("mt-2 text-sm", mutedText())}>
          This deal could not be loaded.
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => navigate("/app/interstore")}
            className={secondaryBtn()}
          >
            Back to inter-store
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ActionModal
        open={sellModalOpen}
        tone="warning"
        title="Record sale"
        subtitle="Confirm how many units were sold and the selling price before updating the deal."
        loading={busyAction === "sell"}
        onClose={() => {
          if (busyAction === "sell") return;
          setSellModalOpen(false);
        }}
        onConfirm={handleSell}
        confirmLabel="Confirm sale"
        confirmClassName={warningBtn()}
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard label="Product" value={deal.productName} />
            <InfoCard label="Reseller" value={deal.resellerName} />
            <InfoCard label="Units remaining" value={String(Math.max(remainingUnits, 0))} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="Sold quantity"
              hint="Use the exact number sold from this deal."
            >
              <input
                type="number"
                min="1"
                className={inputClass()}
                value={sellForm.soldQuantity}
                onChange={(e) =>
                  setSellForm((prev) => ({ ...prev, soldQuantity: e.target.value }))
                }
              />
            </FormField>

            <FormField
              label="Sold price"
              hint="Optional. Leave empty to keep current sale price."
            >
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass()}
                value={sellForm.soldPrice}
                onChange={(e) =>
                  setSellForm((prev) => ({ ...prev, soldPrice: e.target.value }))
                }
                placeholder="Optional"
              />
            </FormField>
          </div>

          <div className="rounded-[22px] bg-[#fff1c9] px-4 py-3 text-sm text-[#8a6500]">
            You are about to record{" "}
            <span className="font-semibold">{sellForm.soldQuantity || 0}</span> sold unit(s).
          </div>
        </div>
      </ActionModal>

      <ActionModal
        open={returnModalOpen}
        tone="danger"
        title="Record return"
        subtitle="Confirm how many unsold units are being returned to the supplier."
        loading={busyAction === "return"}
        onClose={() => {
          if (busyAction === "return") return;
          setReturnModalOpen(false);
        }}
        onConfirm={handleReturn}
        confirmLabel="Confirm return"
        confirmClassName={dangerBtn()}
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoCard label="Product" value={deal.productName} />
            <InfoCard label="Supplier" value={supplierLabel} />
            <InfoCard label="Units remaining" value={String(Math.max(remainingUnits, 0))} />
          </div>

          <FormField
            label="Returned quantity"
            hint="Return only the quantity still unsold and physically available."
          >
            <input
              type="number"
              min="1"
              className={inputClass()}
              value={returnForm.returnedQuantity}
              onChange={(e) => setReturnForm({ returnedQuantity: e.target.value })}
            />
          </FormField>

          <div className="rounded-[22px] bg-[rgba(219,80,74,0.12)] px-4 py-3 text-sm text-[var(--color-danger)]">
            You are about to return{" "}
            <span className="font-semibold">{returnForm.returnedQuantity || 0}</span> unit(s).
          </div>
        </div>
      </ActionModal>

      <div className="space-y-6">
        <section className={cx(pageCard(), "p-6")}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="Inter-store detail"
                title={deal.productName || "Unnamed product"}
                text="Full operational view for this deal: supplier, reseller, movement, payment progress, and next allowed action."
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill status={deal.status} />
                <StatusPill status={deal.supplierTenantId ? "RECEIVED" : "BORROWED"} />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/app/interstore")}
                className={secondaryBtn()}
              >
                Back to deals
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <SummaryStat
            label="Agreed price"
            value={formatMoney(deal.agreedPrice)}
            note="Price promised to supplier"
          />
          <SummaryStat
            label="Amount owed"
            value={formatMoney(paymentSummary.owed)}
            note="Based on sold quantity"
            tone={paymentSummary.owed > 0 ? "warning" : "neutral"}
          />
          <SummaryStat
            label="Paid so far"
            value={formatMoney(paymentSummary.totalPaid)}
            note={`${paymentSummary.count} payment(s) recorded`}
            tone={paymentSummary.totalPaid > 0 ? "success" : "neutral"}
          />
          <SummaryStat
            label="Balance due"
            value={formatMoney(paymentSummary.balanceDue)}
            note={paymentSummary.balanceDue > 0 ? "Still outstanding" : "No remaining balance"}
            tone={paymentSummary.balanceDue > 0 ? "danger" : "success"}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <SectionHeading
                eyebrow="Overview"
                title="Deal overview"
                text="A clear business summary of the deal without needing to dig into raw data."
              />

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="Serial number" value={deal.serial} />
                <InfoCard label="Supplier" value={supplierLabel} sub={deal.externalSupplierPhone || null} />
                <InfoCard label="Reseller" value={deal.resellerName} sub={deal.resellerPhone || null} />
                <InfoCard label="Reseller store" value={deal.resellerStore || "—"} />
                <InfoCard label="Quantity" value={String(deal.quantity || 0)} />
                <InfoCard label="Sold quantity" value={String(deal.soldQuantity || 0)} />
                <InfoCard label="Returned quantity" value={String(deal.returnedQuantity || 0)} />
                <InfoCard label="Due date" value={toDateLabel(deal.dueDate)} />
                <InfoCard label="Created" value={toDateLabel(deal.createdAt)} sub={toDateTimeLabel(deal.createdAt)} />
              </div>

              {deal.notes ? (
                <div className="mt-4 rounded-[22px] bg-[var(--color-surface-2)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
                  {deal.notes}
                </div>
              ) : null}
            </section>

            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <SectionHeading
                eyebrow="Payments"
                title="Payment progress"
                text="Record installments and keep the running supplier balance visible at all times."
              />

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <SummaryStat label="Owed" value={formatMoney(paymentSummary.owed)} />
                <SummaryStat label="Total paid" value={formatMoney(paymentSummary.totalPaid)} />
                <SummaryStat
                  label="Balance due"
                  value={formatMoney(paymentSummary.balanceDue)}
                  tone={paymentSummary.balanceDue > 0 ? "danger" : "success"}
                />
              </div>

              {canAddPayment ? (
                <div className={cx(softPanel(), "mt-5 p-5")}>
                  <div className={cx("text-sm font-semibold", strongText())}>Add installment payment</div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      label="Amount"
                      hint="Record the exact amount received for this installment."
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass()}
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0"
                      />
                    </FormField>

                    <FormField
                      label="Method"
                      hint="How this payment was received."
                    >
                      <select
                        className={inputClass()}
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                      >
                        <option value="CASH">Cash</option>
                        <option value="MOMO">MoMo</option>
                        <option value="BANK">Bank</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </FormField>

                    <div className="md:col-span-2">
                      <FormField
                        label="Note"
                        hint="Optional note for audit clarity."
                      >
                        <textarea
                          className={cx(textareaClass(), "min-h-[110px]")}
                          value={paymentForm.note}
                          onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Optional note about this payment"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <AsyncButton
                      loading={busyAction === "payment"}
                      onClick={handleAddPayment}
                      className={successBtn()}
                    >
                      Record payment
                    </AsyncButton>
                  </div>
                </div>
              ) : null}

              {payments.length === 0 ? (
                <div className={cx("mt-5 rounded-[22px] bg-[var(--color-surface-2)] px-4 py-8 text-center text-sm", mutedText())}>
                  No payments recorded yet.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className={cx(softPanel(), "p-4")}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className={cx("text-sm font-semibold", strongText())}>
                            {formatMoney(payment.amount)}
                          </div>
                          <div className={cx("mt-1 text-sm", mutedText())}>
                            {payment.method || "—"}
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <div className={cx("text-sm", strongText())}>
                            {toDateTimeLabel(payment.createdAt)}
                          </div>
                        </div>
                      </div>

                      {payment.note ? (
                        <div className={cx("mt-3 text-sm leading-6", mutedText())}>{payment.note}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <SectionHeading
                eyebrow="Actions"
                title="Next actions"
                text="Only show what still makes sense for this deal right now."
              />

              <div className="mt-5 flex flex-col gap-3">
                {canReceive ? (
                  <AsyncButton
                    loading={busyAction === "receive"}
                    onClick={handleReceive}
                    className={successBtn()}
                  >
                    Mark as received
                  </AsyncButton>
                ) : null}

                {canSell ? (
                  <button
                    type="button"
                    onClick={() => setSellModalOpen(true)}
                    disabled={busyAction !== ""}
                    className={warningBtn()}
                  >
                    Record sale
                  </button>
                ) : null}

                {canReturn ? (
                  <button
                    type="button"
                    onClick={() => setReturnModalOpen(true)}
                    disabled={busyAction !== ""}
                    className={dangerBtn()}
                  >
                    Record return
                  </button>
                ) : null}

                {canMarkPaid ? (
                  <div className={cx(softPanel(), "p-4")}>
                    <div className={cx("text-sm font-semibold", strongText())}>Complete payment</div>

                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <FormField
                        label="Paid amount"
                        hint="Enter the final amount paid to close this deal."
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass()}
                          value={markPaidForm.paidAmount}
                          onChange={(e) => setMarkPaidForm((prev) => ({ ...prev, paidAmount: e.target.value }))}
                          placeholder="Enter final paid amount"
                        />
                      </FormField>

                      <FormField
                        label="Method"
                        hint="Final settlement method."
                      >
                        <select
                          className={inputClass()}
                          value={markPaidForm.paymentMethod}
                          onChange={(e) => setMarkPaidForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                        >
                          <option value="CASH">Cash</option>
                          <option value="MOMO">MoMo</option>
                          <option value="BANK">Bank</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </FormField>

                      <AsyncButton
                        loading={busyAction === "paid"}
                        onClick={handleMarkPaid}
                        className={primaryBtn()}
                      >
                        Mark fully paid
                      </AsyncButton>
                    </div>
                  </div>
                ) : null}

                {!canReceive && !canSell && !canReturn && !canAddPayment && !canMarkPaid ? (
                  <div className={cx(softPanel(), "px-4 py-6 text-sm leading-6", mutedText())}>
                    No further operational action is needed for this deal right now.
                  </div>
                ) : null}
              </div>
            </section>

            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <SectionHeading
                eyebrow="Timeline"
                title="Movement timeline"
                text="Every critical stage of this deal in one clean place."
              />

              <div className="mt-5 space-y-3">
                <InfoCard label="Borrowed at" value={toDateTimeLabel(deal.borrowedAt)} />
                <InfoCard label="Taken at" value={toDateTimeLabel(deal.takenAt)} />
                <InfoCard label="Received at" value={toDateTimeLabel(deal.receivedAt)} />
                <InfoCard label="Sold at" value={toDateTimeLabel(deal.soldAt)} />
                <InfoCard label="Returned at" value={toDateTimeLabel(deal.returnedAt)} />
                <InfoCard label="Paid at" value={toDateTimeLabel(deal.paidAt)} />
              </div>
            </section>

            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <SectionHeading
                eyebrow="Discipline"
                title="Operational rules"
                text="These keep inter-store accountability strong as the module grows."
              />

              <div className="mt-5 space-y-3">
                {[
                  "Receive first before recording a sale.",
                  "Return only unsold quantity still physically available.",
                  "Use payment records for installments before final closure.",
                  "Mark fully paid only when supplier settlement is truly complete.",
                  "Keep serial-based deals strict and explainable later.",
                ].map((item) => (
                  <div key={item} className={cx(softPanel(), "px-4 py-3 text-sm leading-6", mutedText())}>
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
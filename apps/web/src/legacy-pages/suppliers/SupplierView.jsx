import "./Suppliers.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  createSupplierBill,
  createSupplierPayment,
  getSupplierBalance,
  getSupplierById,
  listSupplierBills,
  listSupplierPayments,
  listSupplierSupplies,
} from "../../services/suppliersApi";
import { getCashDrawerStatus, isDrawerOpen } from "../../services/cashDrawerApi";

const EMPTY_BILL_ITEM = {
  productName: "",
  quantity: "1",
  unitCost: "",
  notes: "",
};

const EMPTY_BILL_FORM = {
  dueDate: "",
  documentRef: "",
  notes: "",
  items: [EMPTY_BILL_ITEM],
};

const EMPTY_PAYMENT_FORM = {
  billId: "",
  amount: "",
  method: "CASH",
  reference: "",
  note: "",
};

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
  return "svx-supplier-card";
}

function softPanel() {
  return "svx-supplier-panel";
}

function primaryBtn() {
  return "svx-supplier-primary";
}

function secondaryBtn() {
  return "svx-supplier-secondary";
}

function dangerBtn() {
  return "svx-supplier-danger";
}

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return "svx-supplier-textarea";
}

function badgeClass(tone = "neutral") {
  if (tone === "primary") return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  if (tone === "success") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  if (tone === "warning") return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  if (tone === "danger") return "bg-red-500/10 text-red-600 dark:text-red-300";
  if (tone === "info") return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black", badgeClass(tone), className)}>
      {children}
    </span>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "RWF 0";
  return `RWF ${Math.round(n).toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function compactDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "00000000";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function generatedBillNumber(existingBills = []) {
  const todayKey = compactDateKey();
  const prefix = `SUP-BILL-${todayKey}`;
  const matchingToday = Array.isArray(existingBills)
    ? existingBills.filter((bill) => cleanString(bill?.billNumber).startsWith(prefix)).length
    : 0;

  return `${prefix}-${String(matchingToday + 1).padStart(3, "0")}`;
}

function uniqueCleanValues(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => cleanString(value))
        .filter(Boolean),
    ),
  );
}

function supplierSupplyItemOptions(supplies = []) {
  const options = [];

  supplies.forEach((supply) => {
    const rows = Array.isArray(supply?.items) ? supply.items : [];
    rows.forEach((item) => {
      const name =
        cleanString(item?.productName) ||
        cleanString(item?.name) ||
        cleanString(item?.product?.name);

      if (!name) return;

      options.push({
        productId: cleanString(item?.productId || item?.product?.id),
        productName: name,
        unitCost: Number(item?.buyPrice || item?.unitCost || item?.cost || 0),
        notes: cleanString(supply?.documentRef) ? `From ${supply.documentRef}` : "",
      });
    });
  });

  const seen = new Set();
  return options.filter((option) => {
    const key = `${option.productId || ""}-${option.productName}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prettyEnum(value) {
  const text = cleanString(value).replaceAll("_", " ").toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function statusTone(status) {
  const key = cleanString(status).toUpperCase();
  if (key === "PAID") return "success";
  if (key === "PARTIAL") return "warning";
  if (key === "OVERDUE") return "danger";
  if (key === "UNPAID") return "info";
  return "neutral";
}

function branchDisplayName(branch) {
  if (!branch) return "Current branch";
  const name = cleanString(branch.name) || "Branch";
  const code = cleanString(branch.code);
  return code ? `${code} — ${name}` : name;
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h1 className={cx("mt-3 text-[1.65rem] font-black tracking-[-0.045em] sm:text-[2rem]", strongText())}>
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

function SummaryCard({ label, value, note, tone = "primary" }) {
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
    <article className={cx(pageCard(), "relative min-h-[132px] overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />
      <div className="pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>{label}</div>
        <div className={cx("mt-2 break-words text-[1.35rem] font-black tracking-[-0.04em]", strongText())}>{value}</div>
        {note ? <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div> : null}
      </div>
    </article>
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
      {hint ? <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{hint}</div> : null}
    </div>
  );
}

function EmptyPanel({ title, text }) {
  return (
    <div className={cx(softPanel(), "p-5 text-center")}>
      <div className={cx("text-sm font-black", strongText())}>{title}</div>
      <p className={cx("mx-auto mt-2 max-w-md text-xs font-semibold leading-5", mutedText())}>{text}</p>
    </div>
  );
}

function BillRow({ bill }) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(bill.status)}>{prettyEnum(bill.status)}</Badge>
            {bill.billNumber ? <Badge tone="neutral">{bill.billNumber}</Badge> : null}
          </div>
          <div className={cx("mt-3 text-sm font-black", strongText())}>
            {formatMoney(bill.totalAmount)} bill
          </div>
          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
            Paid {formatMoney(bill.paidAmount)} — Balance {formatMoney(bill.balanceDue)}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Due date</div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>{formatDate(bill.dueDate)}</div>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ payment }) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={payment.method === "CASH" ? "warning" : "info"}>{prettyEnum(payment.method)}</Badge>
            {payment.bill?.billNumber ? <Badge tone="neutral">{payment.bill.billNumber}</Badge> : null}
          </div>
          <div className={cx("mt-3 text-sm font-black", strongText())}>{formatMoney(payment.amount)}</div>
          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
            {payment.reference ? `Ref: ${payment.reference}` : payment.note || "Supplier payment recorded"}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Paid on</div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>{formatDate(payment.paidAt)}</div>
        </div>
      </div>
    </div>
  );
}

function SupplyRow({ supply }) {
  return (
    <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge tone="primary">{prettyEnum(supply.sourceType || "BOUGHT")}</Badge>
          <div className={cx("mt-3 text-sm font-black", strongText())}>
            {formatMoney(supply.totalCost)} stock received
          </div>
          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
            {Number(supply.itemsCount || 0)} item{Number(supply.itemsCount || 0) === 1 ? "" : "s"} — {branchDisplayName(supply.branch)}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Received</div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>{formatDate(supply.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

export default function SupplierView() {
  const { id } = useParams();

  const [supplier, setSupplier] = useState(null);
  const [balance, setBalance] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [cashDrawerStatus, setCashDrawerStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [billBusy, setBillBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);

  const [billForm, setBillForm] = useState(EMPTY_BILL_FORM);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);

  const openBills = useMemo(
    () => bills.filter((bill) => Number(bill.balanceDue || 0) > 0 && bill.status !== "CANCELLED"),
    [bills],
  );

  const billTotal = useMemo(
    () => billForm.items.reduce((sum, item) => sum + toNumber(item.quantity, 0) * toNumber(item.unitCost, 0), 0),
    [billForm.items],
  );

  const selectedPaymentBill = useMemo(
    () => openBills.find((bill) => bill.id === paymentForm.billId) || null,
    [openBills, paymentForm.billId],
  );

  const paymentAmount = toNumber(paymentForm.amount, 0);
  const paymentMethod = cleanString(paymentForm.method).toUpperCase();
  const cashDrawerIsOpen = isDrawerOpen(cashDrawerStatus);
  const cashPaymentBlocked = paymentMethod === "CASH" && !cashDrawerIsOpen;
  const paymentTooHigh = selectedPaymentBill && paymentAmount > Number(selectedPaymentBill.balanceDue || 0);

  const autoBillNumber = useMemo(() => generatedBillNumber(bills), [bills]);

  const documentReferenceOptions = useMemo(
    () => uniqueCleanValues(supplies.map((supply) => supply?.documentRef)),
    [supplies],
  );

  const billItemOptions = useMemo(() => supplierSupplyItemOptions(supplies), [supplies]);

  useEffect(() => {
    void loadAll();
    void loadCashDrawer();
  }, [id]);

  useEffect(() => {
    if (!paymentForm.billId && openBills.length) {
      setPaymentForm((current) => ({ ...current, billId: openBills[0].id }));
    }
  }, [openBills, paymentForm.billId]);

  async function loadAll() {
    try {
      setLoading(true);
      const [supplierRes, balanceRes, billsRes, paymentsRes, suppliesRes] = await Promise.all([
        getSupplierById(id),
        getSupplierBalance(id),
        listSupplierBills(id),
        listSupplierPayments(id),
        listSupplierSupplies(id),
      ]);

      setSupplier(supplierRes?.supplier || supplierRes || null);
      setBalance(balanceRes || null);
      setBills(Array.isArray(billsRes?.bills) ? billsRes.bills : []);
      setPayments(Array.isArray(paymentsRes?.payments) ? paymentsRes.payments : []);
      setSupplies(Array.isArray(suppliesRes?.supplies) ? suppliesRes.supplies : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load supplier");
    } finally {
      setLoading(false);
    }
  }

  async function loadCashDrawer() {
    try {
      const status = await getCashDrawerStatus();
      setCashDrawerStatus(status);
    } catch (err) {
      console.error(err);
      setCashDrawerStatus(null);
    }
  }

  function updateBillItem(index, patch) {
    setBillForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function addBillItem() {
    setBillForm((current) => ({
      ...current,
      items: [...current.items, EMPTY_BILL_ITEM],
    }));
  }

  function removeBillItem(index) {
    setBillForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function submitBill(event) {
    event.preventDefault();

    const cleanItems = billForm.items.filter((item) => cleanString(item.productName));

    if (!cleanItems.length) {
      toast.error("Add at least one item to the bill.");
      return;
    }

    try {
      setBillBusy(true);
      await createSupplierBill(id, { ...billForm, items: cleanItems });
      toast.success("Supplier bill created");
      setBillForm(EMPTY_BILL_FORM);
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create supplier bill");
    } finally {
      setBillBusy(false);
    }
  }

  async function submitPayment(event) {
    event.preventDefault();

    if (!paymentForm.billId) {
      toast.error("Choose the supplier bill being paid.");
      return;
    }

    if (paymentAmount <= 0) {
      toast.error("Payment amount must be more than 0.");
      return;
    }

    if (paymentTooHigh) {
      toast.error("Payment is higher than the bill balance.");
      return;
    }

    if (cashPaymentBlocked) {
      toast.error("Open the cash drawer before paying this supplier with cash.");
      return;
    }

    try {
      setPaymentBusy(true);
      await createSupplierPayment(id, paymentForm);
      toast.success("Supplier payment recorded");
      setPaymentForm(EMPTY_PAYMENT_FORM);
      await Promise.all([loadAll(), loadCashDrawer()]);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to record supplier payment");
    } finally {
      setPaymentBusy(false);
    }
  }

  if (loading) {
    return <PageSkeleton title="Supplier" />;
  }

  if (!supplier) {
    return (
      <main className="svx-supplier-page">
        <div className="svx-supplier-shell">
          <EmptyPanel title="Supplier not found" text="This supplier could not be loaded." />
        </div>
      </main>
    );
  }

  return (
    <main className="svx-supplier-page">
      <div className="svx-supplier-shell">
        <section className="svx-supplier-hero">
        <div className="svx-supplier-hero-inner">
          <div>
            <span className="svx-supplier-eyebrow">Supplier profile</span>
            <h1 className="svx-supplier-title">{supplier.name || "Unnamed supplier"}</h1>
            <p className="svx-supplier-subtitle">
              Control what came from this supplier, what you owe, what you paid, and the proof behind every supplier transaction.
            </p>
          </div>

          <div className="svx-supplier-hero-actions">
            <Link to="/app/suppliers" className={secondaryBtn()}>
              Back to suppliers
            </Link>
            <Link to={`/app/suppliers/${id}/supplies/new`} className={primaryBtn()}>
              Restock from supplier
            </Link>
          </div>
        </div>

        <div className="svx-supplier-summary-grid mt-6">
          <SummaryCard
            label="You owe"
            value={formatMoney(balance?.totals?.balanceDue)}
            note={`${Number(balance?.totals?.openBills || 0)} open bill${Number(balance?.totals?.openBills || 0) === 1 ? "" : "s"}`}
            tone={Number(balance?.totals?.balanceDue || 0) > 0 ? "warning" : "success"}
          />
          <SummaryCard
            label="Total bought"
            value={formatMoney(balance?.totals?.totalBilled)}
            note="Bills recorded for this supplier"
            tone="primary"
          />
          <SummaryCard
            label="Already paid"
            value={formatMoney(balance?.totals?.totalPaid)}
            note={`${Number(balance?.totals?.paymentsCount || 0)} payment${Number(balance?.totals?.paymentsCount || 0) === 1 ? "" : "s"}`}
            tone="info"
          />
          <SummaryCard
            label="Last supply"
            value={formatDate(balance?.lastSupply?.createdAt)}
            note={balance?.lastSupply?.documentRef ? `Ref: ${balance.lastSupply.documentRef}` : "Latest stock received"}
            tone="success"
          />
        </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
        <div className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                eyebrow="Open bills"
                title="Money owed to supplier"
                subtitle="These are supplier bills that are unpaid, partly paid, or overdue."
              />
              <Badge tone={openBills.length ? "warning" : "success"}>
                {openBills.length ? `${openBills.length} open` : "Nothing owed"}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {openBills.length ? (
                openBills.slice(0, 8).map((bill) => <BillRow key={bill.id} bill={bill} />)
              ) : (
                <EmptyPanel title="No open bills yet" text="When a supplier gives products on credit, the bill will appear here." />
              )}
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Restock history"
              title="Stock received"
              subtitle="Stock received from this supplier. This is separate from money paid out."
            />

            <div className="mt-5 space-y-3">
              {supplies.length ? (
                supplies.slice(0, 6).map((supply) => <SupplyRow key={supply.id} supply={supply} />)
              ) : (
                <EmptyPanel title="No stock received yet" text="Use Restock from supplier when items enter the branch." />
              )}
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Payment history"
              title="Money paid to supplier"
              subtitle="Every supplier payment must be visible here, including cash, MoMo, bank, and other methods."
            />

            <div className="mt-5 space-y-3">
              {payments.length ? (
                payments.slice(0, 8).map((payment) => <PaymentRow key={payment.id} payment={payment} />)
              ) : (
                <EmptyPanel title="No supplier payments yet" text="Payments will appear here after you pay a supplier bill." />
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Create bill"
              title="Create supplier bill"
              subtitle="Record what this supplier gave you. Payments are recorded separately so money movement stays clean."
            />

            <form className="mt-5 space-y-4" onSubmit={submitBill}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Bill number" hint="Generated by Storvex.">
                    <input
                      className={inputClass()}
                      value={autoBillNumber}
                      readOnly
                      aria-readonly="true"
                    />
                  </Field>

                <Field label="Due date">
                  <input
                    type="date"
                    className={inputClass()}
                    value={billForm.dueDate}
                    onChange={(event) => setBillForm((current) => ({ ...current, dueDate: event.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Document reference" hint="Search a received document, or type one if it is not listed.">
                  <input
                    className={inputClass()}
                    value={billForm.documentRef}
                    onChange={(event) => setBillForm((current) => ({ ...current, documentRef: event.target.value }))}
                    placeholder="Search invoice, delivery note, or reference"
                    list="supplier-document-reference-options"
                  />
                  <datalist id="supplier-document-reference-options">
                    {documentReferenceOptions.map((ref) => (
                      <option key={ref} value={ref} />
                    ))}
                  </datalist>
                </Field>

              <div className="space-y-3">
                {billForm.items.map((item, index) => (
                  <div key={index} className={cx(softPanel(), "space-y-3 p-4")}>
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone="primary">Item {index + 1}</Badge>
                      {billForm.items.length > 1 ? (
                        <button type="button" className={dangerBtn()} onClick={() => removeBillItem(index)}>
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <Field label="Item name" required hint="Search received items first. You can still type a new item if it is not listed.">
                        <input
                          className={inputClass()}
                          value={item.productName}
                          onChange={(event) => {
                            const value = event.target.value;
                            const selected = billItemOptions.find(
                              (option) => option.productName.toLowerCase() === value.toLowerCase(),
                            );

                            updateBillItem(index, selected
                              ? {
                                  productId: selected.productId,
                                  productName: selected.productName,
                                  unitCost: selected.unitCost || item.unitCost,
                                  notes: selected.notes || item.notes,
                                }
                              : { productName: value, productId: "" });
                          }}
                          placeholder="Search item, material, part, or product"
                          list={`supplier-bill-item-options-${index}`}
                          required
                        />
                        <datalist id={`supplier-bill-item-options-${index}`}>
                          {billItemOptions.map((option) => (
                            <option key={`${option.productId || option.productName}-${index}`} value={option.productName} />
                          ))}
                        </datalist>
                      </Field>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Quantity" required>
                        <input
                          type="number"
                          min="1"
                          className={inputClass()}
                          value={item.quantity}
                          onChange={(event) => updateBillItem(index, { quantity: event.target.value })}
                          required
                        />
                      </Field>

                      <Field label="Buying cost" required>
                        <input
                          type="number"
                          min="0"
                          className={inputClass()}
                          value={item.unitCost}
                          onChange={(event) => updateBillItem(index, { unitCost: event.target.value })}
                          placeholder="0"
                          required
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className={secondaryBtn()} onClick={addBillItem}>
                Add another item
              </button>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Bill total</div>
                <div className={cx("mt-2 text-xl font-black tracking-[-0.04em]", strongText())}>{formatMoney(billTotal)}</div>
                <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                  This becomes supplier balance. Payment is recorded below.
                </div>
              </div>

              <Field label="Notes">
                <textarea
                  className={textareaClass()}
                  value={billForm.notes}
                  onChange={(event) => setBillForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Optional notes about this bill"
                />
              </Field>

              <button type="submit" className={cx(primaryBtn(), "w-full")} disabled={billBusy || billTotal <= 0}>
                {billBusy ? "Creating bill..." : "Create supplier bill"}
              </button>
            </form>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Pay supplier"
              title="Record supplier payment"
              subtitle="Cash payments reduce the open cash drawer. If cash is not enough, Storvex declines the payment."
            />

            <form className="mt-5 space-y-4" onSubmit={submitPayment}>
              <Field label="Bill being paid" required>
                <select
                  className={inputClass()}
                  value={paymentForm.billId}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, billId: event.target.value }))}
                  required
                >
                  <option value="">Choose bill</option>
                  {openBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {(bill.billNumber || "Supplier bill")} — {formatMoney(bill.balanceDue)} left
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Amount" required>
                  <input
                    type="number"
                    min="1"
                    className={inputClass()}
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="0"
                    required
                  />
                </Field>

                <Field label="Method" required>
                  <select
                    className={inputClass()}
                    value={paymentForm.method}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, method: event.target.value }))}
                    required
                  >
                    <option value="CASH">Cash</option>
                    <option value="MOMO">MoMo</option>
                    <option value="BANK">Bank</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
              </div>

              {selectedPaymentBill ? (
                <div className={cx(softPanel(), "p-4")}>
                  <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Selected bill balance</div>
                  <div className={cx("mt-2 text-lg font-black", strongText())}>{formatMoney(selectedPaymentBill.balanceDue)}</div>
                </div>
              ) : null}

              {cashPaymentBlocked ? (
                <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-700 dark:text-amber-200">
                  Open the cash drawer before paying this supplier with cash.
                </div>
              ) : null}

              {paymentTooHigh ? (
                <div className="rounded-[22px] border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold leading-6 text-red-700 dark:text-red-200">
                  Payment is higher than this bill balance.
                </div>
              ) : null}

              <Field label="Reference">
                <input
                  className={inputClass()}
                  value={paymentForm.reference}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))}
                  placeholder="MoMo code, bank ref, or receipt number"
                />
              </Field>

              <Field label="Note">
                <textarea
                  className={textareaClass()}
                  value={paymentForm.note}
                  onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Optional payment note"
                />
              </Field>

              <button
                type="submit"
                className={cx(primaryBtn(), "w-full")}
                disabled={
                  paymentBusy ||
                  !paymentForm.billId ||
                  paymentAmount <= 0 ||
                  paymentTooHigh ||
                  cashPaymentBlocked
                }
              >
                {paymentBusy ? "Recording payment..." : cashPaymentBlocked ? "Open cash drawer first" : "Record supplier payment"}
              </button>
            </form>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Supplier details"
              title="Supplier details"
              subtitle="Keep identity and contact details clear for payment follow-up."
            />

            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Phone</div>
                <div className={cx("mt-2 text-sm font-black", strongText())}>{supplier.phone || "—"}</div>
              </div>
              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Company</div>
                <div className={cx("mt-2 text-sm font-black", strongText())}>{supplier.companyName || "Individual supplier"}</div>
              </div>
              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Address</div>
                <div className={cx("mt-2 text-sm font-black", strongText())}>{supplier.address || "—"}</div>
              </div>
            </div>
          </section>
        </aside>
      </section>
      </div>
    </main>
  );
}

import "./Suppliers.css";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  createSupplierBill,
  updateSupplierBill,
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
        quantity: String(Number(item?.quantity || item?.qty || 1) || 1),
        unitCost: Number(item?.buyPrice || item?.unitCost || item?.cost || 0),
        documentRef: cleanString(supply?.documentRef),
        notes: cleanString(supply?.documentRef) ? `From ${supply.documentRef}` : "",
      });
    });
  });

  const seen = new Set();
  return options.filter((option) => {
    const key = `${option.productId || ""}-${option.productName}-${option.documentRef}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function includesSearch(value, query) {
  const q = cleanString(query).toLowerCase();
  if (!q) return true;
  return cleanString(value).toLowerCase().includes(q);
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


function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function supplierBillToEditForm(bill) {
  return {
    billNumber: bill?.billNumber || "",
    documentRef: bill?.documentRef || "",
    dueDate: toDateInputValue(bill?.dueDate),
    notes: bill?.notes || "",
    items: Array.isArray(bill?.items) && bill.items.length
      ? bill.items.map((item) => ({
          productId: item.productId || "",
          productName: item.productName || "",
          quantity: String(item.quantity || 1),
          unitCost: String(item.unitCost || ""),
          notes: item.notes || "",
        }))
      : [{ ...EMPTY_BILL_ITEM }],
  };
}

function BillRow({ bill, onView }) {
  return (
    <button
      type="button"
      onClick={() => onView?.(bill)}
      className="w-full rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left transition hover:border-[var(--color-primary)]"
    >
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
            {bill.documentRef ? ` — Ref: ${bill.documentRef}` : ""}
          </div>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Due date</div>
          <div className={cx("mt-1 text-sm font-black", strongText())}>{formatDate(bill.dueDate)}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--color-primary)]">
          Open bill details →
        </span>
        <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-black text-[var(--color-text-muted)]">
          View or edit
        </span>
      </div>
    </button>
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
  const canUsePortal = typeof document !== "undefined";

  const [supplier, setSupplier] = useState(null);
  const [balance, setBalance] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [cashDrawerStatus, setCashDrawerStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [billBusy, setBillBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [billEditBusy, setBillEditBusy] = useState(false);

  const [billForm, setBillForm] = useState(EMPTY_BILL_FORM);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [activePanel, setActivePanel] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [billEditForm, setBillEditForm] = useState(null);
  const [billEditMessage, setBillEditMessage] = useState("");

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

  const matchingDocumentReferences = useMemo(() => {
    return documentReferenceOptions
      .filter((ref) => includesSearch(ref, billForm.documentRef))
      .slice(0, 6);
  }, [billForm.documentRef, documentReferenceOptions]);

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

  function chooseReceivedItemForBill(index, option) {
    updateBillItem(index, {
      productId: option.productId,
      productName: option.productName,
      quantity: option.quantity || "1",
      unitCost: option.unitCost || "",
      notes: option.notes || "",
    });

    if (option.documentRef && !cleanString(billForm.documentRef)) {
      setBillForm((current) => ({ ...current, documentRef: option.documentRef }));
    }
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


  function startBillEdit(bill) {
    setBillEditMessage("");
    setBillEditForm(supplierBillToEditForm(bill));
  }

  function cancelBillEdit() {
    setBillEditMessage("");
    setBillEditForm(null);
  }

  function updateBillEditField(field, value) {
    setBillEditForm((current) => ({
      ...(current || supplierBillToEditForm(selectedBill)),
      [field]: value,
    }));
  }

  function updateBillEditItem(index, field, value) {
    setBillEditForm((current) => {
      const base = current || supplierBillToEditForm(selectedBill);
      return {
        ...base,
        items: base.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      };
    });
  }

  function addBillEditItem() {
    setBillEditForm((current) => {
      const base = current || supplierBillToEditForm(selectedBill);
      return {
        ...base,
        items: [...base.items, { ...EMPTY_BILL_ITEM }],
      };
    });
  }

  function removeBillEditItem(index) {
    setBillEditForm((current) => {
      const base = current || supplierBillToEditForm(selectedBill);
      if (base.items.length <= 1) return base;

      return {
        ...base,
        items: base.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  async function submitBillEdit(event) {
    event.preventDefault();
    if (!selectedBill || !billEditForm) return;

    const hasPayments = Number(selectedBill.paidAmount || 0) > 0;
    const payload = {
      billNumber: billEditForm.billNumber,
      documentRef: billEditForm.documentRef,
      dueDate: billEditForm.dueDate,
      notes: billEditForm.notes,
      ...(hasPayments ? {} : { items: billEditForm.items }),
    };

    try {
      setBillEditBusy(true);
      const response = await updateSupplierBill(id, selectedBill.id, payload);
      const updatedBill = response.bill;

      await loadAll();

      setSelectedBill(updatedBill);
      setBillEditForm(null);
      setBillEditMessage("Supplier bill updated successfully.");
    } catch (err) {
      setBillEditMessage(err?.message || "Failed to update supplier bill.");
    } finally {
      setBillEditBusy(false);
    }
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
      setActivePanel("");
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
      setActivePanel("");
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

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "bill" ? "" : "bill")}
            className={cx(
              pageCard(),
              "svx-supplier-action-card p-5 text-left transition hover:border-[var(--color-primary)]",
              activePanel === "bill" ? "border-[var(--color-primary)]" : ""
            )}
          >
            <Badge tone="warning">Create bill</Badge>
            <div className={cx("mt-4 text-lg font-black tracking-[-0.03em]", strongText())}>
              Create supplier bill
            </div>
            <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
              Use a received invoice, delivery note, or item from restock history.
            </div>

            <div className="mt-5 inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--color-primary)]">
              {activePanel === "bill" ? "Close bill form" : "Open bill form →"}
            </div>
          </button>

          <button
            type="button"
            onClick={() => openBills.length ? setActivePanel(activePanel === "payment" ? "" : "payment") : null}
            disabled={!openBills.length}
            className={cx(
              pageCard(),
              "svx-supplier-action-card p-5 text-left transition hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60",
              activePanel === "payment" ? "border-[var(--color-primary)]" : ""
            )}
          >
            <Badge tone={openBills.length ? "success" : "neutral"}>
              Pay supplier
            </Badge>
            <div className={cx("mt-4 text-lg font-black tracking-[-0.03em]", strongText())}>
              Record supplier payment
            </div>
            <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
              {openBills.length ? "Choose an open bill and record cash, MoMo, bank, or other payment." : "Create a supplier bill first."}
            </div>

            <div className="mt-5 inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--color-primary)]">
              {activePanel === "payment" ? "Close payment form" : openBills.length ? "Open payment form →" : "Create bill first"}
            </div>
          </button>

        </section>

        <section className="svx-supplier-profile-board">
        <div className="svx-supplier-ledger-stack">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                eyebrow="Supplier bills"
                title="Bills from this supplier"
                subtitle="Open bills appear here until they are fully paid."
              />
              <Badge tone={openBills.length ? "warning" : "success"}>
                {openBills.length ? `${openBills.length} open` : "Nothing owed"}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {openBills.length ? (
                openBills.slice(0, 8).map((bill) => (
                  <BillRow key={bill.id} bill={bill} onView={setSelectedBill} />
                ))
              ) : (
                <EmptyPanel title="No supplier bills yet" text="Create a supplier bill when the supplier gives stock now and you will pay later." />
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

        <aside className="svx-supplier-side-stack">
          {activePanel === "bill" && canUsePortal
            ? createPortal(
                <div className="svx-supplier-modal-layer" role="dialog" aria-modal="true">
                  <section className={cx(pageCard(), "svx-supplier-modal-card p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Create bill"
              title="Create supplier bill"
              subtitle="Create the bill from a received invoice, receipt, delivery note, or restock item."
            />

            <div className="mt-5 flex justify-end">
              <button type="button" className={secondaryBtn()} onClick={() => setActivePanel("")}>
                Close popup
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={submitBill}>
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

              <Field label="Document reference" hint="Start typing and choose a received invoice, receipt, or delivery note number.">
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

                {matchingDocumentReferences.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matchingDocumentReferences.map((ref) => (
                      <button
                        key={ref}
                        type="button"
                        className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-black text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-text)]"
                        onClick={() => setBillForm((current) => ({ ...current, documentRef: ref }))}
                      >
                        {ref}
                      </button>
                    ))}
                  </div>
                ) : cleanString(billForm.documentRef) ? (
                  <div className={cx("mt-3 text-xs font-bold leading-5", mutedText())}>
                    No received document found. This bill will use a new reference.
                  </div>
                ) : null}
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

                    <Field label="Item name" required hint="Start typing and choose from received stock. Quantity and buying cost fill automatically.">
                      <input
                        className={inputClass()}
                        value={item.productName}
                        onChange={(event) => {
                          const value = event.target.value;
                          updateBillItem(index, { productName: value, productId: "" });
                        }}
                        placeholder="Search received item, material, part, or product"
                        list={`supplier-bill-item-options-${index}`}
                        required
                      />
                      <datalist id={`supplier-bill-item-options-${index}`}>
                        {billItemOptions.map((option) => (
                          <option key={`${option.productId || option.productName}-${option.documentRef}-${index}`} value={option.productName} />
                        ))}
                      </datalist>

                      {billItemOptions.filter((option) => includesSearch(option.productName, item.productName)).slice(0, 6).length ? (
                        <div className="mt-3 grid gap-2">
                          {billItemOptions
                            .filter((option) => includesSearch(option.productName, item.productName))
                            .slice(0, 6)
                            .map((option) => (
                              <button
                                key={`${option.productId || option.productName}-${option.documentRef}-${index}`}
                                type="button"
                                className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-left transition hover:border-[var(--color-primary)]"
                                onClick={() => chooseReceivedItemForBill(index, option)}
                              >
                                <div className={cx("text-sm font-black", strongText())}>{option.productName}</div>
                                <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                                  {[
                                    option.documentRef ? `Ref: ${option.documentRef}` : "",
                                    option.quantity ? `Qty: ${option.quantity}` : "",
                                    option.unitCost ? `Cost: ${formatMoney(option.unitCost)}` : "",
                                  ].filter(Boolean).join(" · ")}
                                </div>
                              </button>
                            ))}
                        </div>
                      ) : cleanString(item.productName) ? (
                        <div className={cx("mt-3 text-xs font-bold leading-5", mutedText())}>
                          No received item found. You can still type a new item for this bill.
                        </div>
                      ) : null}
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
                </div>,
                document.body
              )
            : null}

          {activePanel === "payment" && canUsePortal
            ? createPortal(
                <div className="svx-supplier-modal-layer" role="dialog" aria-modal="true">
                  <section className={cx(pageCard(), "svx-supplier-modal-card p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Pay supplier"
              title="Record supplier payment"
              subtitle="Choose an open bill, then record how the supplier was paid."
            />

            <div className="mt-5 flex justify-end">
              <button type="button" className={secondaryBtn()} onClick={() => setActivePanel("")}>
                Close popup
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={submitPayment}>
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
                </div>,
                document.body
              )
            : null}

          <section className={cx(pageCard(), "svx-supplier-contact-card p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Supplier contact"
              title="Contact details"
              subtitle="Keep supplier identity clear for bills, payments, and follow-up."
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

        {selectedBill && canUsePortal
          ? createPortal(
              <div className="svx-supplier-modal-layer" role="dialog" aria-modal="true">
                <section className={cx(pageCard(), "svx-supplier-modal-card p-5 sm:p-6")}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                eyebrow="Supplier bill"
                title={selectedBill.billNumber || "Supplier bill"}
                subtitle="Review this supplier bill, payment state, balance, and document proof."
              />

              <div className="flex flex-wrap gap-2">
                {!billEditForm ? (
                  <button type="button" className={primaryBtn()} onClick={() => startBillEdit(selectedBill)}>
                    Edit bill
                  </button>
                ) : null}
                <button
                  type="button"
                  className={secondaryBtn()}
                  onClick={() => {
                    setSelectedBill(null);
                    setBillEditForm(null);
                    setBillEditMessage("");
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Status</div>
                <div className={cx("mt-2 text-sm font-black", strongText())}>{prettyEnum(selectedBill.status)}</div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Document reference</div>
                <div className={cx("mt-2 text-sm font-black", strongText())}>{selectedBill.documentRef || "—"}</div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Bill total</div>
                <div className={cx("mt-2 text-lg font-black", strongText())}>{formatMoney(selectedBill.totalAmount)}</div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Balance left</div>
                <div className={cx("mt-2 text-lg font-black", strongText())}>{formatMoney(selectedBill.balanceDue)}</div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Paid</div>
                <div className={cx("mt-2 text-lg font-black", strongText())}>{formatMoney(selectedBill.paidAmount)}</div>
              </div>

              <div className={cx(softPanel(), "p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Due date</div>
                <div className={cx("mt-2 text-sm font-black", strongText())}>{formatDate(selectedBill.dueDate)}</div>
              </div>
            </div>

            {selectedBill.notes ? (
              <div className={cx(softPanel(), "mt-4 p-4")}>
                <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>Notes</div>
                <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>{selectedBill.notes}</div>
              </div>
            ) : null}

            {billEditMessage ? (
              <div className="mt-5 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 text-sm font-black text-[var(--color-text)]">
                {billEditMessage}
              </div>
            ) : null}

            {billEditForm ? (
              <form className="mt-5 space-y-4" onSubmit={submitBillEdit}>
                {Number(selectedBill.paidAmount || 0) > 0 ? (
                  <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold leading-6 text-amber-700 dark:text-amber-200">
                    This bill already has payments. You can edit bill number, document reference, due date, and notes. Items and total are locked to protect payment history.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Bill number">
                    <input
                      className={inputClass()}
                      value={billEditForm.billNumber}
                      onChange={(event) => updateBillEditField("billNumber", event.target.value)}
                      placeholder="Supplier bill number"
                    />
                  </Field>

                  <Field label="Document reference">
                    <input
                      className={inputClass()}
                      value={billEditForm.documentRef}
                      onChange={(event) => updateBillEditField("documentRef", event.target.value)}
                      placeholder="Invoice, receipt, or delivery note"
                    />
                  </Field>

                  <Field label="Due date">
                    <input
                      type="date"
                      className={inputClass()}
                      value={billEditForm.dueDate}
                      onChange={(event) => updateBillEditField("dueDate", event.target.value)}
                    />
                  </Field>

                  <Field label="Notes">
                    <input
                      className={inputClass()}
                      value={billEditForm.notes}
                      onChange={(event) => updateBillEditField("notes", event.target.value)}
                      placeholder="Optional bill note"
                    />
                  </Field>
                </div>

                {Number(selectedBill.paidAmount || 0) <= 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className={cx("text-sm font-black", strongText())}>Bill items</div>
                        <div className={cx("text-xs font-semibold", mutedText())}>
                          Edit item names, quantities, and buying cost before any payment is recorded.
                        </div>
                      </div>
                      <button type="button" className={secondaryBtn()} onClick={addBillEditItem}>
                        Add item
                      </button>
                    </div>

                    {billEditForm.items.map((item, index) => (
                      <div key={index} className={cx(softPanel(), "grid grid-cols-1 gap-3 p-4 sm:grid-cols-2")}>
                        <Field label="Item name" required>
                          <input
                            className={inputClass()}
                            value={item.productName}
                            onChange={(event) => updateBillEditItem(index, "productName", event.target.value)}
                            placeholder="Item name"
                            required
                          />
                        </Field>

                        <Field label="Quantity" required>
                          <input
                            type="number"
                            min="1"
                            className={inputClass()}
                            value={item.quantity}
                            onChange={(event) => updateBillEditItem(index, "quantity", event.target.value)}
                            required
                          />
                        </Field>

                        <Field label="Buying cost" required>
                          <input
                            type="number"
                            min="0"
                            className={inputClass()}
                            value={item.unitCost}
                            onChange={(event) => updateBillEditItem(index, "unitCost", event.target.value)}
                            required
                          />
                        </Field>

                        <Field label="Item note">
                          <input
                            className={inputClass()}
                            value={item.notes}
                            onChange={(event) => updateBillEditItem(index, "notes", event.target.value)}
                            placeholder="Optional"
                          />
                        </Field>

                        {billEditForm.items.length > 1 ? (
                          <div className="sm:col-span-2">
                            <button type="button" className={secondaryBtn()} onClick={() => removeBillEditItem(index)}>
                              Remove item
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" className={secondaryBtn()} onClick={cancelBillEdit}>
                    Cancel edit
                  </button>
                  <button type="submit" className={primaryBtn()} disabled={billEditBusy}>
                    {billEditBusy ? "Saving..." : "Save bill changes"}
                  </button>
                </div>
              </form>
            ) : null}
                </section>
              </div>,
              document.body
            )
          : null}

      </div>
    </main>
  );
}

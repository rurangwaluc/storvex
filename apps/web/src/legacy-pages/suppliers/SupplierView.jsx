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
  createSupplierPurchaseOrder,
  getSupplierBalance,
  getSupplierById,
  listSupplierBills,
  listSupplierPayments,
  listSupplierPurchaseOrders,
  listSupplierSupplies,
  updateSupplierPurchaseOrder,
  updateSupplierPurchaseOrderStatus,
} from "../../services/suppliersApi";
import { getCashDrawerStatus, isDrawerOpen } from "../../services/cashDrawerApi";
import { searchProducts } from "../../services/inventoryApi";

const EMPTY_BILL_ITEM = {
  productName: "",
  quantity: "1",
  unitCost: "",
  notes: "",
};

const EMPTY_BILL_FORM = {
  dueDate: "",
  documentRef: "",
  purchaseOrderId: "",
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

const EMPTY_PURCHASE_ORDER_ITEM = {
  productId: "",
  productName: "",
  productSearch: "",
  quantity: "1",
  unitCost: "",
};

const EMPTY_PURCHASE_ORDER_FORM = {
  orderDate: "",
  note: "",
  items: [EMPTY_PURCHASE_ORDER_ITEM],
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

function productOptionLabel(product) {
  const name = cleanString(product?.name) || "Unnamed product";
  const sku = cleanString(product?.sku || product?.barcode || product?.serial);
  return sku ? `${name} — ${sku}` : name;
}

function productNameById(products, productId) {
  const product = products.find((item) => item.id === productId);
  return productOptionLabel(product);
}

function purchaseOrderStatusTone(status) {
  const value = cleanString(status).toUpperCase();
  if (value === "RECEIVED") return "success";
  if (value === "ORDERED") return "primary";
  if (value === "CANCELLED") return "danger";
  return "neutral";
}

function purchaseOrderStatusLabel(status) {
  const value = cleanString(status).toUpperCase();
  if (value === "ORDERED") return "Ordered";
  if (value === "RECEIVED") return "Received";
  if (value === "CANCELLED") return "Cancelled";
  return "Draft";
}

function purchaseOrderNumber(order) {
  const shortId = cleanString(order?.id).slice(0, 8).toUpperCase();
  return shortId ? `PO-${shortId}` : "Purchase order";
}

function PurchaseOrderRow({ order, busy, onEdit, onCopy, onPrint, onMarkOrdered, onCancel }) {
  const status = cleanString(order?.status).toUpperCase();
  const canEdit = status === "DRAFT";
  const canMarkOrdered = status === "DRAFT";
  const canCancel = status === "DRAFT" || status === "ORDERED";

  return (
    <div className={cx(softPanel(), "p-4")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={purchaseOrderStatusTone(order.status)}>{purchaseOrderStatusLabel(order.status)}</Badge>
            <span className={cx("text-xs font-black uppercase tracking-[0.14em]", softText())}>
              {purchaseOrderNumber(order)}
            </span>
          </div>

          <div className={cx("mt-3 text-base font-black tracking-[-0.02em]", strongText())}>
            {formatMoney(order.totalAmount)}
          </div>

          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
            {Number(order.itemsCount || 0)} item line{Number(order.itemsCount || 0) === 1 ? "" : "s"}
          </div>
          <div className={cx("text-xs font-semibold leading-5", mutedText())}>
            {Number(order.totalQuantity || 0)} total unit{Number(order.totalQuantity || 0) === 1 ? "" : "s"}
          </div>
          <div className={cx("text-xs font-semibold leading-5", mutedText())}>
            Ordered date: {formatDate(order.orderDate || order.createdAt)}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-start gap-2 md:justify-end">
          {canEdit ? (
            <button
              type="button"
              disabled={busy === order.id}
              onClick={() => onEdit(order)}
              className={secondaryBtn()}
            >
              Edit draft
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onCopy(order)}
            className={secondaryBtn()}
          >
            Copy summary
          </button>

          <button
            type="button"
            onClick={() => onPrint(order)}
            className={secondaryBtn()}
          >
            Print / Download
          </button>

          {canMarkOrdered ? (
            <button
              type="button"
              disabled={busy === order.id}
              onClick={() => onMarkOrdered(order)}
              className={secondaryBtn()}
            >
              {busy === order.id ? "Updating..." : "Mark ordered"}
            </button>
          ) : null}

          {canCancel ? (
            <button
              type="button"
              disabled={busy === order.id}
              onClick={() => onCancel(order)}
              className={dangerBtn()}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {Array.isArray(order.items) && order.items.length ? (
        <div className="mt-4 grid grid-cols-1 gap-2">
          {order.items.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[16px] bg-[var(--color-surface-2)] px-3 py-2"
            >
              <div className={cx("truncate text-xs font-black", strongText())}>
                {item.productName || item.product?.name || "Unnamed item"}
              </div>
              <div className={cx("text-xs font-black", mutedText())}>
                {Number(item.quantity || 0)} × {formatMoney(item.unitCost)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {order.note ? (
        <div className={cx("mt-3 text-xs font-semibold leading-5", mutedText())}>{order.note}</div>
      ) : null}
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
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashDrawerStatus, setCashDrawerStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [billBusy, setBillBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [billEditBusy, setBillEditBusy] = useState(false);

  const [billForm, setBillForm] = useState(EMPTY_BILL_FORM);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const [activePanel, setActivePanel] = useState("");
  const [activeLedgerTab, setActiveLedgerTab] = useState("overview");
  const [selectedBill, setSelectedBill] = useState(null);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState(EMPTY_PURCHASE_ORDER_FORM);
  const [purchaseOrderBusy, setPurchaseOrderBusy] = useState(false);
  const [editingPurchaseOrder, setEditingPurchaseOrder] = useState(null);
  const [purchaseOrderStatusBusy, setPurchaseOrderStatusBusy] = useState("");
  const [purchaseOrderProductResults, setPurchaseOrderProductResults] = useState({});
  const [purchaseOrderProductBusy, setPurchaseOrderProductBusy] = useState({});
  const [billEditForm, setBillEditForm] = useState(null);
  const [billEditMessage, setBillEditMessage] = useState("");

  const openBills = useMemo(
    () => bills.filter((bill) => Number(bill.balanceDue || 0) > 0 && bill.status !== "CANCELLED"),
    [bills],
  );

  const activePurchaseOrders = useMemo(
    () => purchaseOrders.filter((order) => !["RECEIVED", "CANCELLED"].includes(cleanString(order.status).toUpperCase())),
    [purchaseOrders],
  );

  const billPurchaseOrderOptions = useMemo(
    () => purchaseOrders.filter((order) => cleanString(order.status).toUpperCase() !== "CANCELLED"),
    [purchaseOrders],
  );

  const purchaseOrderTotalAmount = useMemo(
    () =>
      purchaseOrderForm.items.reduce(
        (sum, item) => sum + toNumber(item.quantity, 0) * toNumber(item.unitCost, 0),
        0,
      ),
    [purchaseOrderForm.items],
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

  const purchaseOrderDisplayLimit = activeLedgerTab === "overview" ? 3 : 30;
  const billDisplayLimit = activeLedgerTab === "overview" ? 3 : 30;
  const supplyDisplayLimit = activeLedgerTab === "overview" ? 3 : 30;
  const paymentDisplayLimit = activeLedgerTab === "overview" ? 3 : 30;

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
      const [supplierRes, balanceRes, billsRes, paymentsRes, suppliesRes, purchaseOrdersRes] = await Promise.all([
        getSupplierById(id),
        getSupplierBalance(id),
        listSupplierBills(id),
        listSupplierPayments(id),
        listSupplierSupplies(id),
        listSupplierPurchaseOrders(id),
      ]);

      setSupplier(supplierRes?.supplier || supplierRes || null);
      setBalance(balanceRes || null);
      setBills(Array.isArray(billsRes?.bills) ? billsRes.bills : []);
      setPayments(Array.isArray(paymentsRes?.payments) ? paymentsRes.payments : []);
      setSupplies(Array.isArray(suppliesRes?.supplies) ? suppliesRes.supplies : []);
      setPurchaseOrders(Array.isArray(purchaseOrdersRes?.purchaseOrders) ? purchaseOrdersRes.purchaseOrders : []);
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
      purchaseOrderId: billEditForm.purchaseOrderId,
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


  function updatePurchaseOrderItem(index, patch) {
    setPurchaseOrderForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }

  function addPurchaseOrderItem() {
    setPurchaseOrderForm((current) => ({
      ...current,
      items: [...current.items, { ...EMPTY_PURCHASE_ORDER_ITEM }],
    }));
  }

  function removePurchaseOrderItem(index) {
    setPurchaseOrderForm((current) => {
      if (current.items.length <= 1) return current;
      return {
        ...current,
        items: current.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function extractProductList(response) {
    if (Array.isArray(response?.products)) return response.products;
    if (Array.isArray(response?.items)) return response.items;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response)) return response;
    return [];
  }

  async function searchPurchaseOrderProduct(index) {
    const item = purchaseOrderForm.items[index];
    const query = cleanString(item?.productSearch);

    if (query.length < 2) {
      toast.error("Type at least 2 letters to search products.");
      return;
    }

    try {
      setPurchaseOrderProductBusy((current) => ({ ...current, [index]: true }));

      const response = await searchProducts({
        search: query,
        q: query,
        query,
        term: query,
        limit: 8,
        pageSize: 8,
      });

      const results = extractProductList(response).slice(0, 8);

      setPurchaseOrderProductResults((current) => ({
        ...current,
        [index]: results,
      }));

      if (!results.length) {
        toast.error("No matching products found.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to search products.");
    } finally {
      setPurchaseOrderProductBusy((current) => ({ ...current, [index]: false }));
    }
  }

  function choosePurchaseOrderProduct(index, product) {
    const label = productOptionLabel(product);
    const expectedCost =
      product?.costPrice ??
      product?.buyPrice ??
      product?.purchasePrice ??
      product?.lastBuyPrice ??
      "";

    updatePurchaseOrderItem(index, {
      productId: product.id,
      productName: product.name || label,
      productSearch: label,
      unitCost: expectedCost !== "" && expectedCost != null ? String(expectedCost) : purchaseOrderForm.items[index]?.unitCost || "",
    });

    setProducts((current) => {
      if (current.some((item) => item.id === product.id)) return current;
      return [...current, product];
    });

    setPurchaseOrderProductResults((current) => ({
      ...current,
      [index]: [],
    }));
  }

  function purchaseOrderToForm(order) {
    return {
      orderDate: order?.orderDate ? String(order.orderDate).slice(0, 10) : "",
      note: order?.note || "",
      items: Array.isArray(order?.items) && order.items.length
        ? order.items.map((item) => {
            const productName = item.productName || item.product?.name || "";
            return {
              ...EMPTY_PURCHASE_ORDER_ITEM,
              productId: item.productId || item.product?.id || "",
              productName,
              productSearch: productName,
              quantity: String(Number(item.quantity || 1)),
              unitCost: String(Number(item.unitCost || 0)),
            };
          })
        : [{ ...EMPTY_PURCHASE_ORDER_ITEM }],
    };
  }

  function startPurchaseOrderEdit(order) {
    setEditingPurchaseOrder(order);
    setPurchaseOrderForm(purchaseOrderToForm(order));
    setActivePanel("purchaseOrder");
  }

  function resetPurchaseOrderForm() {
    setEditingPurchaseOrder(null);
    setPurchaseOrderForm(EMPTY_PURCHASE_ORDER_FORM);
    setPurchaseOrderProductResults({});
    setPurchaseOrderProductBusy({});
  }

  async function copyPurchaseOrderSummary(order) {
    const items = Array.isArray(order.items) ? order.items : [];

    const lines = [
      `Hello ${supplier?.name || "Supplier"}, please confirm this purchase order.`,
      "",
      `Purchase order: ${purchaseOrderNumber(order)}`,
      `Status: ${purchaseOrderStatusLabel(order.status)}`,
      `Order date: ${formatDate(order.orderDate || order.createdAt)}`,
      `Expected total: ${formatMoney(order.totalAmount)}`,
      "",
      "Items:",
      ...items.map((item) => {
        const name = item.productName || item.product?.name || "Item";
        return `- ${name}: ${Number(item.quantity || 0)} item${Number(item.quantity || 0) === 1 ? "" : "s"} at ${formatMoney(item.unitCost)} each`;
      }),
      order.note ? "" : null,
      order.note ? `Note: ${order.note}` : null,
      "",
      "Please confirm availability, quantity, and delivery time.",
    ].filter((line) => line != null);

    const summary = lines.join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Purchase order summary copied");
    } catch (err) {
      console.error(err);
      toast.error("Could not copy purchase order summary");
    }
  }


  function escapeDocumentText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getRegisteredBusinessName() {
    const directName =
      supplier?.business?.registeredName ||
      supplier?.business?.name ||
      supplier?.tenant?.registeredName ||
      supplier?.tenant?.name ||
      supplier?.businessName ||
      supplier?.tenantName ||
      balance?.business?.registeredName ||
      balance?.business?.name ||
      balance?.tenant?.registeredName ||
      balance?.tenant?.name;

    if (cleanString(directName)) return cleanString(directName);

    try {
      const possibleKeys = [
        "storvex_business",
        "storvexBusiness",
        "business",
        "tenant",
        "currentBusiness",
        "activeBusiness",
      ];

      for (const key of possibleKeys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw);
        const name =
          parsed?.registeredName ||
          parsed?.businessName ||
          parsed?.name ||
          parsed?.tenantName ||
          parsed?.business?.registeredName ||
          parsed?.business?.name ||
          parsed?.tenant?.registeredName ||
          parsed?.tenant?.name;

        if (cleanString(name)) return cleanString(name);
      }
    } catch {
      // Local storage is only a fallback. Ignore bad values.
    }

    return "Business purchase order";
  }

  function printPurchaseOrder(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    const poNumber = purchaseOrderNumber(order);
    const supplierName = supplier?.name || "Supplier";
    const businessName = getRegisteredBusinessName();

    const rows = items
      .map((item, index) => {
        const name = item.productName || item.product?.name || "Item";
        const quantity = Number(item.quantity || 0);
        const unitCost = Number(item.unitCost || 0);
        const total = quantity * unitCost;

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeDocumentText(name)}</td>
            <td class="num">${quantity.toLocaleString("en-US")}</td>
            <td class="num">${escapeDocumentText(formatMoney(unitCost))}</td>
            <td class="num">${escapeDocumentText(formatMoney(total))}</td>
          </tr>
        `;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeDocumentText(poNumber)} - ${escapeDocumentText(businessName)} Purchase Order</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      color: #111827;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 32px;
    }
    .top {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 2px solid #111827;
      padding-bottom: 24px;
    }
    .brand {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
      color: #111827;
    }
    h1 {
      margin: 8px 0 0;
      font-size: 34px;
      letter-spacing: -0.04em;
    }
    .po-number {
      margin-top: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #374151;
    }
    .meta {
      text-align: right;
      font-size: 13px;
      line-height: 1.8;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 28px;
    }
    .box {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }
    .label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .value {
      font-size: 15px;
      font-weight: 800;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 28px;
      font-size: 13px;
    }
    th {
      text-align: left;
      padding: 12px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6b7280;
    }
    td {
      padding: 14px 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      font-weight: 700;
    }
    .num { text-align: right; white-space: nowrap; }
    .total {
      margin-top: 22px;
      display: flex;
      justify-content: flex-end;
    }
    .total-box {
      min-width: 280px;
      border: 1px solid #111827;
      border-radius: 14px;
      padding: 16px;
    }
    .total-box span {
      display: block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .total-box strong {
      display: block;
      margin-top: 8px;
      font-size: 24px;
    }
    .note {
      margin-top: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.7;
      font-weight: 700;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 52px;
    }
    .signature {
      border-top: 1px solid #111827;
      padding-top: 10px;
      font-size: 12px;
      font-weight: 800;
      color: #374151;
    }
    .actions {
      max-width: 900px;
      margin: 18px auto 0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    button {
      border: 0;
      border-radius: 12px;
      padding: 12px 16px;
      font-weight: 800;
      cursor: pointer;
    }
    .primary { background: #2563eb; color: #ffffff; }
    .secondary { background: #f3f4f6; color: #111827; }
    @media print {
      body { padding: 0; }
      .page { border: 0; border-radius: 0; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div>
        <div class="brand">${escapeDocumentText(businessName)}</div>
        <h1>Purchase Order</h1>
        <div class="po-number">${escapeDocumentText(poNumber)}</div>
      </div>
      <div class="meta">
        <div><strong>Status:</strong> ${escapeDocumentText(purchaseOrderStatusLabel(order.status))}</div>
        <div><strong>Order date:</strong> ${escapeDocumentText(formatDate(order.orderDate || order.createdAt))}</div>
        <div><strong>Created:</strong> ${escapeDocumentText(formatDate(order.createdAt))}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div class="label">Business</div>
        <div class="value">${escapeDocumentText(businessName)}</div>
      </div>
      <div class="box">
        <div class="label">Supplier</div>
        <div class="value">${escapeDocumentText(supplierName)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Unit cost</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="5">No items</td></tr>'}
      </tbody>
    </table>

    <div class="total">
      <div class="total-box">
        <span>Expected total</span>
        <strong>${escapeDocumentText(formatMoney(order.totalAmount))}</strong>
      </div>
    </div>

    ${order.note ? `<div class="note"><div class="label">Note</div>${escapeDocumentText(order.note)}</div>` : ""}

    <div class="signatures">
      <div class="signature">Prepared / approved by</div>
      <div class="signature">Supplier confirmation</div>
    </div>
  </div>

  <div class="actions">
    <button class="secondary" onclick="window.close()">Close</button>
    <button class="primary" onclick="window.print()">Print / Save PDF</button>
  </div>
</body>
</html>`;

    const existingFrame = document.getElementById("storvex-purchase-order-print-frame");
    if (existingFrame) {
      existingFrame.remove();
    }

    const frame = document.createElement("iframe");
    frame.id = "storvex-purchase-order-print-frame";
    frame.title = "Purchase order print";
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";

    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument || frameWindow?.document;

    if (!frameWindow || !frameDocument) {
      frame.remove();
      toast.error("Could not prepare purchase order document.");
      return;
    }

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    window.setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch (err) {
        console.error(err);
        toast.error("Could not print purchase order.");
      }
    }, 250);
  }

  async function submitPurchaseOrder(event) {
    event.preventDefault();

    const cleanItems = purchaseOrderForm.items.filter((item) => cleanString(item.productId));

    if (!cleanItems.length) {
      toast.error("Choose at least one product for the purchase order.");
      return;
    }

    const invalidItem = cleanItems.find((item) => toNumber(item.quantity, 0) <= 0 || toNumber(item.unitCost, 0) < 0);
    if (invalidItem) {
      toast.error("Each purchase order item needs a valid quantity and cost.");
      return;
    }

    try {
      setPurchaseOrderBusy(true);

      if (editingPurchaseOrder?.id) {
        await updateSupplierPurchaseOrder(id, editingPurchaseOrder.id, { ...purchaseOrderForm, items: cleanItems });
        toast.success("Purchase order updated");
      } else {
        await createSupplierPurchaseOrder(id, { ...purchaseOrderForm, items: cleanItems });
        toast.success("Purchase order created");
      }

      resetPurchaseOrderForm();
      setActivePanel("");
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create purchase order");
    } finally {
      setPurchaseOrderBusy(false);
    }
  }

  async function changePurchaseOrderStatus(order, status) {
    try {
      setPurchaseOrderStatusBusy(order.id);
      await updateSupplierPurchaseOrderStatus(id, order.id, status);
      toast.success(status === "ORDERED" ? "Purchase order marked ordered" : "Purchase order updated");
      await loadAll();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update purchase order");
    } finally {
      setPurchaseOrderStatusBusy("");
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

        <section className="svx-supplier-profile-board">
        <div className="svx-supplier-ledger-stack">
          <section className={cx(pageCard(), "p-3 sm:p-4")}>
            <div className="svx-supplier-tabs" role="tablist" aria-label="Supplier work area">
              {[
                { key: "overview", label: "Overview", count: null },
                { key: "purchaseOrders", label: "Purchase orders", count: purchaseOrders.length },
                { key: "bills", label: "Bills", count: bills.length },
                { key: "stock", label: "Stock received", count: supplies.length },
                { key: "payments", label: "Payments", count: payments.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeLedgerTab === tab.key}
                  onClick={() => setActiveLedgerTab(tab.key)}
                  className={cx("svx-supplier-tab", activeLedgerTab === tab.key && "is-active")}
                >
                  <span>{tab.label}</span>
                  {tab.count != null ? <strong>{tab.count}</strong> : null}
                </button>
              ))}
            </div>
          </section>

          {activeLedgerTab === "overview" ? (
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeading
                  eyebrow="Overview"
                  title="Supplier control center"
                  subtitle="A quick view of orders, bills, received stock, and payments. Open a tab when you need the full list."
                />
                <Badge tone={Number(balance?.totals?.balanceDue || 0) > 0 ? "warning" : "success"}>
                  {Number(balance?.totals?.balanceDue || 0) > 0 ? "Money owed" : "Settled"}
                </Badge>
              </div>

              <div className="svx-supplier-overview-grid mt-5">
                <button
                  type="button"
                  className="svx-supplier-overview-tile"
                  onClick={() => setActiveLedgerTab("purchaseOrders")}
                >
                  <span>Purchase orders</span>
                  <strong>{purchaseOrders.length}</strong>
                  <em>{activePurchaseOrders.length ? `${activePurchaseOrders.length} active` : "No active orders"}</em>
                </button>

                <button
                  type="button"
                  className="svx-supplier-overview-tile"
                  onClick={() => setActiveLedgerTab("bills")}
                >
                  <span>Bills</span>
                  <strong>{bills.length}</strong>
                  <em>{openBills.length ? `${openBills.length} open` : "Nothing owed"}</em>
                </button>

                <button
                  type="button"
                  className="svx-supplier-overview-tile"
                  onClick={() => setActiveLedgerTab("stock")}
                >
                  <span>Stock received</span>
                  <strong>{supplies.length}</strong>
                  <em>{supplies[0] ? formatDate(supplies[0].createdAt) : "No stock yet"}</em>
                </button>

                <button
                  type="button"
                  className="svx-supplier-overview-tile"
                  onClick={() => setActiveLedgerTab("payments")}
                >
                  <span>Payments</span>
                  <strong>{payments.length}</strong>
                  <em>{payments[0] ? formatMoney(payments[0].amount) : "No payments yet"}</em>
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={primaryBtn()}
                  onClick={() => {
                    resetPurchaseOrderForm();
                    setActivePanel("purchaseOrder");
                  }}
                >
                  Create purchase order
                </button>
                <button type="button" className={secondaryBtn()} onClick={() => setActivePanel("bill")}>
                  Create bill
                </button>
                <button
                  type="button"
                  className={secondaryBtn()}
                  disabled={!openBills.length}
                  onClick={() => openBills.length ? setActivePanel("payment") : null}
                >
                  Record payment
                </button>
              </div>
            </section>
          ) : null}
          {activeLedgerTab === "purchaseOrders" ? (
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                eyebrow="Purchase orders"
                title="Orders planned for this supplier"
                subtitle="Purchase orders are requests to buy. They are separate from received stock, supplier bills, and payments."
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={activePurchaseOrders.length ? "primary" : "success"}>
                  {activePurchaseOrders.length ? `${activePurchaseOrders.length} active` : "No active orders"}
                </Badge>
                <button
                  type="button"
                  className={primaryBtn()}
                  onClick={() => {
                    resetPurchaseOrderForm();
                    setActivePanel("purchaseOrder");
                  }}
                >
                  Create purchase order
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {purchaseOrders.length ? (
                purchaseOrders.slice(0, purchaseOrderDisplayLimit).map((order) => (
                  <PurchaseOrderRow
                    key={order.id}
                    order={order}
                    busy={purchaseOrderStatusBusy}
                    onEdit={startPurchaseOrderEdit}
                    onCopy={copyPurchaseOrderSummary}
                    onPrint={printPurchaseOrder}
                    onMarkOrdered={(item) => changePurchaseOrderStatus(item, "ORDERED")}
                    onCancel={(item) => changePurchaseOrderStatus(item, "CANCELLED")}
                  />
                ))
              ) : (
                <EmptyPanel title="No purchase orders yet" text="Create a purchase order when you want to request stock from this supplier before it arrives." />
              )}

              {activeLedgerTab === "overview" && purchaseOrders.length > purchaseOrderDisplayLimit ? (
                <button
                  type="button"
                  className={secondaryBtn()}
                  onClick={() => setActiveLedgerTab("purchaseOrders")}
                >
                  View all purchase orders
                </button>
              ) : null}
            </div>
          </section>
          ) : null}

          {activeLedgerTab === "bills" ? (
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                eyebrow="Supplier bills"
                title="Bills from this supplier"
                subtitle="Open bills appear here until they are fully paid."
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={openBills.length ? "warning" : "success"}>
                  {openBills.length ? `${openBills.length} open` : "Nothing owed"}
                </Badge>
                <button
                  type="button"
                  className={primaryBtn()}
                  onClick={() => setActivePanel("bill")}
                >
                  Create bill
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {openBills.length ? (
                openBills.slice(0, billDisplayLimit).map((bill) => (
                  <BillRow key={bill.id} bill={bill} onView={setSelectedBill} />
                ))
              ) : (
                <EmptyPanel title="No supplier bills yet" text="Create a supplier bill when the supplier gives stock now and you will pay later." />
              )}

              {activeLedgerTab === "overview" && openBills.length > billDisplayLimit ? (
                <button
                  type="button"
                  className={secondaryBtn()}
                  onClick={() => setActiveLedgerTab("bills")}
                >
                  View all bills
                </button>
              ) : null}
            </div>
          </section>
          ) : null}

          {activeLedgerTab === "stock" ? (
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <SectionHeading
              eyebrow="Restock history"
              title="Stock received"
              subtitle="Stock received from this supplier. This is separate from money paid out."
            />

            <div className="mt-5 space-y-3">
              {supplies.length ? (
                supplies.slice(0, supplyDisplayLimit).map((supply) => <SupplyRow key={supply.id} supply={supply} />)
              ) : (
                <EmptyPanel title="No stock received yet" text="Use Restock from supplier when items enter the branch." />
              )}

              {activeLedgerTab === "overview" && supplies.length > supplyDisplayLimit ? (
                <button
                  type="button"
                  className={secondaryBtn()}
                  onClick={() => setActiveLedgerTab("stock")}
                >
                  View all stock received
                </button>
              ) : null}
            </div>
          </section>
          ) : null}

          {activeLedgerTab === "payments" ? (
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <SectionHeading
                eyebrow="Payment history"
                title="Money paid to supplier"
                subtitle="Every supplier payment must be visible here, including cash, MoMo, bank, and other methods."
              />
              <button
                type="button"
                className={primaryBtn()}
                disabled={!openBills.length}
                onClick={() => openBills.length ? setActivePanel("payment") : null}
              >
                Record payment
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {payments.length ? (
                payments.slice(0, paymentDisplayLimit).map((payment) => <PaymentRow key={payment.id} payment={payment} />)
              ) : (
                <EmptyPanel title="No supplier payments yet" text="Payments will appear here after you pay a supplier bill." />
              )}

              {activeLedgerTab === "overview" && payments.length > paymentDisplayLimit ? (
                <button
                  type="button"
                  className={secondaryBtn()}
                  onClick={() => setActiveLedgerTab("payments")}
                >
                  View all payments
                </button>
              ) : null}
            </div>
          </section>
          ) : null}
        </div>

        <aside className="svx-supplier-side-stack">
          {activePanel === "purchaseOrder" && canUsePortal
            ? createPortal(
                <div className="svx-supplier-modal-layer" role="dialog" aria-modal="true">
                  <section className={cx(pageCard(), "svx-supplier-modal-card p-5 sm:p-6")}>
                    <SectionHeading
                      eyebrow="Purchase order"
                      title={editingPurchaseOrder ? "Edit purchase order" : "Create purchase order"}
                      subtitle="Plan what you want from this supplier. Stock and money are recorded later when goods arrive and bills are paid."
                    />

                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        className={secondaryBtn()}
                        onClick={() => {
                          setActivePanel("");
                          resetPurchaseOrderForm();
                        }}
                      >
                        Close popup
                      </button>
                    </div>

                    <form className="mt-4 space-y-4" onSubmit={submitPurchaseOrder}>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Order date">
                          <input
                            type="date"
                            className={inputClass()}
                            value={purchaseOrderForm.orderDate}
                            onChange={(event) =>
                              setPurchaseOrderForm((current) => ({ ...current, orderDate: event.target.value }))
                            }
                          />
                        </Field>

                        <div className={cx(softPanel(), "p-4")}>
                          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                            Expected total
                          </div>
                          <div className={cx("mt-2 text-xl font-black", strongText())}>
                            {formatMoney(purchaseOrderTotalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {purchaseOrderForm.items.map((item, index) => (
                          <div key={index} className={cx(softPanel(), "space-y-3 p-4")}>
                            <div className="flex items-center justify-between gap-3">
                              <div className={cx("text-sm font-black", strongText())}>Item {index + 1}</div>
                              {purchaseOrderForm.items.length > 1 ? (
                                <button
                                  type="button"
                                  className={dangerBtn()}
                                  onClick={() => removePurchaseOrderItem(index)}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(110px,0.45fr)_minmax(140px,0.55fr)]">
                              <Field label="Product" required>
                                <div className="flex gap-2">
                                  <input
                                    className={inputClass()}
                                    value={item.productSearch}
                                    onChange={(event) =>
                                      updatePurchaseOrderItem(index, {
                                        productSearch: event.target.value,
                                        productId: "",
                                        productName: "",
                                      })
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        void searchPurchaseOrderProduct(index);
                                      }
                                    }}
                                    placeholder="Search product name, SKU, barcode..."
                                    required
                                  />
                                  <button
                                    type="button"
                                    className={secondaryBtn()}
                                    disabled={Boolean(purchaseOrderProductBusy[index])}
                                    onClick={() => searchPurchaseOrderProduct(index)}
                                  >
                                    {purchaseOrderProductBusy[index] ? "Searching..." : "Search"}
                                  </button>
                                </div>

                                {Array.isArray(purchaseOrderProductResults[index]) && purchaseOrderProductResults[index].length ? (
                                  <div className="mt-2 grid gap-2">
                                    {purchaseOrderProductResults[index].map((product) => (
                                      <button
                                        key={product.id}
                                        type="button"
                                        className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-left transition hover:border-[var(--color-primary)]"
                                        onClick={() => choosePurchaseOrderProduct(index, product)}
                                      >
                                        <div className={cx("truncate text-xs font-black", strongText())}>
                                          {productOptionLabel(product)}
                                        </div>
                                        <div className={cx("mt-1 text-[11px] font-semibold", mutedText())}>
                                          Cost: {formatMoney(product.costPrice ?? product.buyPrice ?? product.purchasePrice ?? 0)}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}

                                {item.productId ? (
                                  <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
                                    Selected: <span className={cx("font-black", strongText())}>{item.productName || productNameById(products, item.productId)}</span>
                                  </div>
                                ) : null}
                              </Field>

                              <Field label="Quantity" required>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  className={inputClass()}
                                  value={item.quantity}
                                  onChange={(event) => updatePurchaseOrderItem(index, { quantity: event.target.value })}
                                  required
                                />
                              </Field>

                              <Field label="Expected cost" required>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  className={inputClass()}
                                  value={item.unitCost}
                                  onChange={(event) => updatePurchaseOrderItem(index, { unitCost: event.target.value })}
                                  placeholder="0"
                                  required
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button type="button" className={secondaryBtn()} onClick={addPurchaseOrderItem}>
                        Add another item
                      </button>

                      <Field label="Notes">
                        <textarea
                          className={textareaClass()}
                          value={purchaseOrderForm.note}
                          onChange={(event) =>
                            setPurchaseOrderForm((current) => ({ ...current, note: event.target.value }))
                          }
                          placeholder="Delivery request, expected timing, supplier instruction..."
                        />
                      </Field>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={secondaryBtn()}
                          onClick={() => {
                            setActivePanel("");
                            resetPurchaseOrderForm();
                          }}
                        >
                          Cancel
                        </button>
                        <button type="submit" disabled={purchaseOrderBusy} className={primaryBtn()}>
                          {purchaseOrderBusy ? (editingPurchaseOrder ? "Saving..." : "Creating...") : editingPurchaseOrder ? "Save purchase order" : "Create purchase order"}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>,
                document.body
              )
            : null}

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

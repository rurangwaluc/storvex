import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { createWarranty } from "../../services/warrantiesApi";
import { getSale, listSales } from "../../services/posApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const PAGE_SIZE = 10;

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `RWF ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safeAmount)}`;
}

function formatNumber(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-RW", {
    dateStyle: "medium",
  });
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsToDate(dateText, months) {
  const date = dateText ? new Date(dateText) : new Date();

  if (Number.isNaN(date.getTime())) return "";

  date.setMonth(date.getMonth() + Number(months || 0));

  return date.toISOString().slice(0, 10);
}

function addDaysToDate(dateText, days) {
  const date = dateText ? new Date(dateText) : new Date();

  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + Number(days || 0));

  return date.toISOString().slice(0, 10);
}

function activeStoreLocationFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "current store location";
}

function pageCard() {
  return "rounded-[30px] border border-[var(--doc-line-soft)] bg-[var(--doc-surface)] shadow-[0_14px_40px_rgba(15,46,92,0.055)] dark:shadow-none";
}

function softPanel() {
  return "rounded-[24px] border border-[var(--doc-line-soft)] bg-[var(--doc-soft)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--doc-line-soft)] bg-[var(--doc-soft)] px-4 text-sm font-bold text-[var(--doc-text)] outline-none transition placeholder:text-[var(--doc-muted)] focus:border-[var(--doc-blue)] focus:ring-4 focus:ring-[rgba(7, 92, 255, 0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function textareaClass() {
  return "min-h-[132px] w-full rounded-[20px] border border-[var(--doc-line-soft)] bg-[var(--doc-soft)] px-4 py-3 text-sm font-bold text-[var(--doc-text)] outline-none transition placeholder:text-[var(--doc-muted)] focus:border-[var(--doc-blue)] focus:ring-4 focus:ring-[rgba(7, 92, 255, 0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return cx(
    buttonBase(),
    "border border-[var(--doc-blue)] bg-[var(--doc-blue)] text-white shadow-[0_14px_28px_rgba(7,92,255,0.18)] hover:-translate-y-0.5"
  );
}

function secondaryBtn() {
  return cx(
    buttonBase(),
    "border border-[var(--doc-line)] bg-[var(--doc-surface)] text-[var(--doc-text)] shadow-none hover:-translate-y-0.5 hover:border-[var(--doc-blue)] hover:bg-[var(--doc-soft)] hover:text-[var(--doc-blue)]"
  );
}

function successBtn() {
  return cx(
    buttonBase(),
    "border border-[var(--doc-green)] bg-[var(--doc-green)] text-white shadow-[0_14px_28px_rgba(12,171,102,0.16)] hover:-translate-y-0.5"
  );
}

function saleReferenceLabel(sale) {
  return (
    cleanString(sale?.receiptNumber) ||
    cleanString(sale?.invoiceNumber) ||
    cleanString(sale?.number) ||
    "Sale"
  );
}

function customerName(sale) {
  return (
    cleanString(sale?.customer?.name) ||
    cleanString(sale?.customerName) ||
    "Walk-in customer"
  );
}

function customerPhone(sale) {
  return (
    cleanString(sale?.customer?.phone) ||
    cleanString(sale?.customerPhone) ||
    "No phone saved"
  );
}

function cashierName(sale) {
  return cleanString(sale?.cashier?.name) || cleanString(sale?.cashierName) || "—";
}

function storeLocationLabel(sale) {
  const location = sale?.branch || {};
  const code = cleanString(location?.code);
  const name = cleanString(location?.name);

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return activeStoreLocationFromStorage();
}

function saleStatusTone(status) {
  const text = String(status || "").toUpperCase();

  if (["PAID", "COMPLETED", "ACTIVE"].includes(text)) return "success";
  if (["PARTIAL", "UNPAID", "PENDING"].includes(text)) return "warning";
  if (["CANCELLED", "EXPIRED", "OVERDUE"].includes(text)) return "danger";

  return "neutral";
}

function matchesSaleQuery(sale, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    sale?.receiptNumber,
    sale?.invoiceNumber,
    sale?.number,
    customerName(sale),
    customerPhone(sale),
    cashierName(sale),
    sale?.saleType,
    sale?.status,
    storeLocationLabel(sale),
  ]
    .map((item) => String(item || "").toLowerCase())
    .join(" ");

  return haystack.includes(q);
}

function normalizeSaleDetail(raw) {
  const sale = raw?.sale || raw || {};
  const items = Array.isArray(sale?.items) ? sale.items : [];

  return {
    ...sale,
    id: sale?.id || null,
    receiptNumber: sale?.receiptNumber || null,
    invoiceNumber: sale?.invoiceNumber || null,
    total: Number(sale?.total || 0),
    createdAt: sale?.createdAt || null,
    saleType: sale?.saleType || null,
    status: sale?.status || null,
    customer: sale?.customer || null,
    cashier: sale?.cashier || (sale?.cashierName ? { name: sale.cashierName } : null),
    branch: sale?.branch || null,
    items,
  };
}

function itemKey(item, index) {
  return cleanString(item?.id) || `${cleanString(item?.productId) || "product"}-${index}`;
}

function itemProductId(item) {
  return cleanString(item?.productId || item?.product?.id);
}

function itemName(item) {
  return (
    cleanString(item?.product?.name) ||
    cleanString(item?.productName) ||
    cleanString(item?.name) ||
    "Covered product"
  );
}

function itemSerial(item) {
  return cleanString(item?.product?.serial) || cleanString(item?.serial) || "";
}

function itemQuantity(item) {
  return Number(item?.quantity || 1);
}

function itemPrice(item) {
  return Number(item?.price ?? item?.unitPrice ?? item?.sellPrice ?? 0);
}

function buildSelectableItemsFromSaleDetail(detail) {
  const items = Array.isArray(detail?.items) ? detail.items : [];

  return items.map((item, index) => ({
    key: itemKey(item, index),
    checked: true,
    saleItemId: item?.id ? String(item.id) : "",
    productId: itemProductId(item),
    unitLabel: itemName(item),
    serial: itemSerial(item),
    imei1: cleanString(item?.imei1),
    imei2: cleanString(item?.imei2),
    quantity: itemQuantity(item),
    price: itemPrice(item),
  }));
}

function StatusBadge({ tone = "neutral", children }) {
  const cls =
    tone === "danger"
      ? "bg-[var(--doc-red-soft)] text-[var(--doc-red)]"
      : tone === "warning"
        ? "bg-[var(--doc-orange-soft)] text-[var(--doc-orange)]"
        : tone === "success"
          ? "bg-[var(--doc-green-soft)] text-[var(--doc-green)]"
          : "bg-[var(--doc-soft)] text-[var(--doc-muted)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em]",
        cls
      )}
    >
      {children}
    </span>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--doc-soft)]", className)} />
  );
}

function CreateSkeleton() {
  return (
    <div className="svx-doc-center-page space-y-5">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {[1, 2, 3].map((item) => (
            <section key={item} className={cx(pageCard(), "p-5")}>
              <SkeletonBlock className="h-7 w-44" />
              <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
              <SkeletonBlock className="mt-5 h-12 w-full" />
            </section>
          ))}
        </div>

        <section className={cx(pageCard(), "p-5")}>
          <SkeletonBlock className="h-7 w-32" />
          <SkeletonBlock className="mt-5 h-44 w-full" />
        </section>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const dot =
    tone === "danger"
      ? "bg-[var(--doc-red)]"
      : tone === "warning"
        ? "bg-[var(--doc-orange)]"
        : tone === "success"
          ? "bg-[var(--doc-green)]"
          : "bg-[var(--doc-blue)]";

  return (
    <article className={cx(pageCard(), "p-5")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--doc-muted)]">
          {label}
        </p>
        <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
      </div>

      <p className="mt-3 break-words text-2xl font-black tracking-[-0.03em] text-[var(--doc-text)]">
        {value}
      </p>

      {note ? (
        <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--doc-muted)]">
          {note}
        </p>
      ) : null}
    </article>
  );
}

function InfoTile({ label, value, tone = "neutral", compact = false }) {
  const valueClass =
    tone === "danger"
      ? "text-[var(--doc-red)]"
      : tone === "warning"
        ? "text-[var(--doc-orange)]"
        : tone === "success"
          ? "text-[var(--doc-green)]"
          : "text-[var(--doc-text)]";

  return (
    <div className={cx(softPanel(), compact ? "p-3" : "p-4")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--doc-muted)]">
        {label}
      </p>

      <p className={cx("mt-2 break-words font-black leading-6", compact ? "text-[13px]" : "text-sm", valueClass)}>
        {value || "—"}
      </p>
    </div>
  );
}

function SaleOption({ sale, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full border-b border-[var(--doc-line-soft)] px-4 py-4 text-left transition last:border-b-0",
        selected ? "bg-[var(--doc-soft)]" : "hover:bg-[var(--doc-soft)]"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-[var(--doc-text)]">
              {saleReferenceLabel(sale)}
            </div>

            <StatusBadge tone={saleStatusTone(sale?.status)}>
              {sale?.status || "Sale"}
            </StatusBadge>
          </div>

          <p className="mt-1 truncate text-sm font-semibold text-[var(--doc-muted)]">
            {customerName(sale)} • {customerPhone(sale)}
          </p>

          <p className="mt-1 text-xs font-bold text-[var(--doc-muted)]">
            {formatDate(sale?.createdAt)} • Staff: {cashierName(sale)}
          </p>
        </div>

        <div className="shrink-0 text-sm font-black text-[var(--doc-text)]">
          {formatMoney(sale?.total || 0)}
        </div>
      </div>
    </button>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--doc-line-soft)] bg-[var(--doc-soft)] p-8 text-center">
      <h3 className="text-base font-black text-[var(--doc-text)]">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--doc-muted)]">
        {text}
      </p>
    </div>
  );
}

function CoveredItemCard({ item, index, onChange }) {
  return (
    <article
      className={cx(
        "rounded-[24px] border p-4 transition",
        item.checked
          ? "border-[var(--doc-line-soft)] bg-[var(--doc-surface)] shadow-[0_14px_28px_rgba(7,92,255,0.10)]"
          : "border-[var(--doc-line-soft)] bg-[var(--doc-soft)] opacity-75"
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(event) => onChange(index, "checked", event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[var(--doc-line-soft)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-[var(--doc-text)]">
              {item.unitLabel || `Sold product ${index + 1}`}
            </h3>

            <StatusBadge tone={item.checked ? "success" : "neutral"}>
              {item.checked ? "Covered" : "Not covered"}
            </StatusBadge>
          </div>

          <p className="mt-1 text-xs font-bold text-[var(--doc-muted)]">
            Qty: {formatNumber(item.quantity || 1)} • Sold for {formatMoney(item.price || 0)}
          </p>

          {item.checked ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Product label
                </span>
                <input
                  value={item.unitLabel}
                  onChange={(event) => onChange(index, "unitLabel", event.target.value)}
                  className={inputClass()}
                  placeholder="Product name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Serial
                </span>
                <input
                  value={item.serial}
                  onChange={(event) => onChange(index, "serial", event.target.value)}
                  className={inputClass()}
                  placeholder="Serial number"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  IMEI 1
                </span>
                <input
                  value={item.imei1}
                  onChange={(event) => onChange(index, "imei1", event.target.value)}
                  className={inputClass()}
                  placeholder="Optional"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  IMEI 2
                </span>
                <input
                  value={item.imei2}
                  onChange={(event) => onChange(index, "imei2", event.target.value)}
                  className={inputClass()}
                  placeholder="Optional"
                />
              </label>
            </div>
          ) : (
            <p className="mt-3 text-sm font-medium text-[var(--doc-muted)]">
              This product will not appear on the warranty certificate.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function WarrantyCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const saleIdFromQuery = cleanString(searchParams.get("saleId"));

  const dropdownRef = useRef(null);
  const mountedRef = useRef(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    saleRef: "",
    policy: "",
    startsAt: todayInputDate(),
    endsAt: "",
    durationMonths: "12",
    durationDays: "",
  });

  const [saleQuery, setSaleQuery] = useState("");
  const [allSales, setAllSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedSaleLoading, setSelectedSaleLoading] = useState(false);
  const [selectableItems, setSelectableItems] = useState([]);

  const [activeStoreLocation, setActiveStoreLocation] = useState(() =>
    activeStoreLocationFromStorage()
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSelectableItem(index, key, value) {
    setSelectableItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  }

  function toggleAllCovered(nextChecked) {
    setSelectableItems((prev) => prev.map((item) => ({ ...item, checked: nextChecked })));
  }

  async function loadSales({ silent = false } = {}) {
    try {
      if (!silent) setInitialLoading(true);
      setSalesLoading(true);

      const data = await listSales();
      if (!mountedRef.current) return;

      const rows = Array.isArray(data?.sales)
        ? data.sales
        : Array.isArray(data)
          ? data
          : [];

      setAllSales(rows);
      setActiveStoreLocation(activeStoreLocationFromStorage());
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "warranty-sales-load-blocked" })) {
        toast.error(error?.message || "Failed to load sales");
      }

      setAllSales([]);
    } finally {
      if (!mountedRef.current) return;
      setSalesLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
  if (!saleIdFromQuery || !allSales.length || selectedSale || selectedSaleLoading) return;

  const saleRow = allSales.find((sale) => String(sale.id) === saleIdFromQuery);

  if (saleRow) {
    void applySelectedSale(saleRow);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [saleIdFromQuery, allSales.length, selectedSale?.id, selectedSaleLoading]);

  useEffect(() => {
    void loadSales();

    function onStoreLocationChanged() {
      setActiveStoreLocation(activeStoreLocationFromStorage());
      setSelectedSale(null);
      setSelectableItems([]);
      setSaleQuery("");
      setForm((prev) => ({ ...prev, saleRef: "" }));
      void loadSales({ silent: true });
    }

    window.addEventListener("storvex:branch-changed", onStoreLocationChanged);
    window.addEventListener("storvex:workspace-refreshed", onStoreLocationChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onStoreLocationChanged);
      window.removeEventListener("storvex:workspace-refreshed", onStoreLocationChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onDocumentClick(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    if (!form.startsAt) return;

    if (form.durationMonths) {
      updateField("endsAt", addMonthsToDate(form.startsAt, form.durationMonths));
      return;
    }

    if (form.durationDays) {
      updateField("endsAt", addDaysToDate(form.startsAt, form.durationDays));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startsAt, form.durationMonths, form.durationDays]);

  const filteredSales = useMemo(() => {
    return allSales.filter((sale) => matchesSaleQuery(sale, saleQuery)).slice(0, PAGE_SIZE);
  }, [allSales, saleQuery]);

  const selectedCoveredItems = useMemo(() => {
    return selectableItems.filter(
      (item) => item.checked && cleanString(item.saleItemId) && cleanString(item.productId)
    );
  }, [selectableItems]);

  const totalSoldItems = selectableItems.length;
  const totalCoveredItems = selectedCoveredItems.length;
  const excludedItems = Math.max(0, totalSoldItems - totalCoveredItems);

  async function applySelectedSale(saleRow) {
    try {
      setSelectedSaleLoading(true);

      const detailRaw = await getSale(saleRow.id);
      const detail = normalizeSaleDetail(detailRaw);
      const ref = saleReferenceLabel(detail);

      setSelectedSale(detail);
      setSelectableItems(buildSelectableItemsFromSaleDetail(detail));
      setForm((prev) => ({ ...prev, saleRef: ref }));
      setSaleQuery(ref);
      setShowDropdown(false);
    } catch (error) {
      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "warranty-sale-detail-blocked" })) {
        toast.error(error?.message || "Failed to load selected sale");
      }
    } finally {
      setSelectedSaleLoading(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();

    if (!cleanString(form.saleRef)) {
      toast.error("Choose a sale first");
      return;
    }

    if (!selectedSale?.id) {
      toast.error("Choose a valid sale first");
      return;
    }

    if (!cleanString(form.policy)) {
      toast.error("Add the warranty terms");
      return;
    }

    if (!selectedCoveredItems.length) {
      toast.error("Choose at least one sold product to cover");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        saleRef: cleanString(form.saleRef),
        policy: cleanString(form.policy),
        startsAt: form.startsAt || undefined,
        endsAt: form.endsAt || undefined,
        durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        units: selectedCoveredItems.map((item) => ({
          saleItemId: String(item.saleItemId),
          productId: String(item.productId),
          unitLabel: cleanString(item.unitLabel) || undefined,
          serial: cleanString(item.serial) || undefined,
          imei1: cleanString(item.imei1) || undefined,
          imei2: cleanString(item.imei2) || undefined,
        })),
      };

      const result = await createWarranty(payload);
      const createdId = result?.warranty?.id || result?.id;

      toast.success("Warranty created");

      if (createdId) {
        navigate(`/app/documents/warranties/${encodeURIComponent(createdId)}/preview`);
        return;
      }

      navigate("/app/documents/warranties");
    } catch (error) {
      console.error(error);

      if (handleSubscriptionBlockedError(error, { toastId: "warranty-create-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to create warranty");
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return <CreateSkeleton />;
  }

  return (
    <div className="svx-doc-center-page space-y-5">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--doc-blue)]">
              Warranty
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--doc-text)] sm:text-3xl">
              Create warranty
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--doc-muted)]">
              Choose a real sale from{" "}
              <span className="font-black text-[var(--doc-text)]">
                {activeStoreLocation}
              </span>
              , select the sold products to cover, and issue a clean warranty certificate.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link to="/app/documents/warranties" className={secondaryBtn()}>
              Warranties
            </Link>

            <Link to="/app/documents" className={secondaryBtn()}>
              Documents
            </Link>

            
          </div>
        </div>
      </section>

      <section className="grid gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Sale"
          value={selectedSale ? saleReferenceLabel(selectedSale) : "None"}
          note={
            selectedSale
              ? `${customerName(selectedSale)} • ${customerPhone(selectedSale)}`
              : "Choose a sale first"
          }
          tone={selectedSale ? "success" : "warning"}
        />

        <SummaryCard
          label="Products"
          value={formatNumber(totalSoldItems)}
          note="Products in sale"
        />

        <SummaryCard
          label="Covered"
          value={formatNumber(totalCoveredItems)}
          note="Included on warranty"
          tone={totalCoveredItems > 0 ? "success" : "warning"}
        />

        <SummaryCard
          label="Excluded"
          value={formatNumber(excludedItems)}
          note="Excluded from warranty"
          tone={excludedItems > 0 ? "warning" : "neutral"}
        />
      </section>

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--doc-text)]">
                Select sale
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--doc-muted)]">
                Search by receipt, customer, phone, staff member, or store location.
              </p>
            </div>

            <div className="relative mt-5" ref={dropdownRef}>
              <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[var(--doc-muted)]">
                <SearchIcon />
              </span>

              <input
                value={saleQuery}
                onChange={(event) => {
                  setSaleQuery(event.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className={cx(inputClass(), "pl-11")}
                placeholder="Search sale, customer, phone, receipt, or location..."
              />

              {showDropdown ? (
                <div className="absolute z-40 mt-2 max-h-96 w-full overflow-auto rounded-[24px] border border-[var(--doc-line-soft)] bg-[var(--doc-surface)] shadow-[0_14px_40px_rgba(15,46,92,0.055)] dark:shadow-none">
                  {salesLoading || selectedSaleLoading ? (
                    <div className="p-4 text-sm font-bold text-[var(--doc-muted)]">
                      Loading sales...
                    </div>
                  ) : filteredSales.length === 0 ? (
                    <div className="p-4 text-sm font-bold text-[var(--doc-muted)]">
                      No sales found.
                    </div>
                  ) : (
                    filteredSales.map((sale) => (
                      <SaleOption
                        key={sale.id}
                        sale={sale}
                        selected={selectedSale?.id === sale.id}
                        onClick={() => applySelectedSale(sale)}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {selectedSale ? (
              <div className="mt-5 rounded-[26px] border border-[var(--doc-green)]/25 bg-[var(--doc-green-soft)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--doc-green)]">
                      Sale selected
                    </p>

                    <h3 className="mt-1 text-base font-black text-[var(--doc-text)]">
                      {saleReferenceLabel(selectedSale)}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-[var(--doc-muted)]">
                      {customerName(selectedSale)} • {customerPhone(selectedSale)}
                    </p>

                    <p className="mt-2 text-xs font-bold text-[var(--doc-muted)]">
                      {formatDate(selectedSale?.createdAt)} • {formatMoney(selectedSale?.total)} •
                      Staff: {cashierName(selectedSale)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={secondaryBtn()}
                    onClick={() => {
                      setSelectedSale(null);
                      setSelectableItems([]);
                      setSaleQuery("");
                      setForm((prev) => ({ ...prev, saleRef: "" }));
                    }}
                  >
                    Change sale
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--doc-text)]">
                Warranty details
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--doc-muted)]">
                Choose coverage dates and write clear terms the customer can understand.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Starts
                </span>
                <input
                  value={form.startsAt}
                  onChange={(event) => updateField("startsAt", event.target.value)}
                  className={inputClass()}
                  type="date"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Ends
                </span>
                <input
                  value={form.endsAt}
                  onChange={(event) => updateField("endsAt", event.target.value)}
                  className={inputClass()}
                  type="date"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Months
                </span>
                <input
                  value={form.durationMonths}
                  onChange={(event) =>
                    updateField("durationMonths", event.target.value.replace(/[^\d]/g, ""))
                  }
                  className={inputClass()}
                  inputMode="numeric"
                  placeholder="Example: 12"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Extra days
                </span>
                <input
                  value={form.durationDays}
                  onChange={(event) =>
                    updateField("durationDays", event.target.value.replace(/[^\d]/g, ""))
                  }
                  className={inputClass()}
                  inputMode="numeric"
                  placeholder="Optional"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--doc-muted)]">
                  Warranty terms
                </span>
                <textarea
                  value={form.policy}
                  onChange={(event) => updateField("policy", event.target.value)}
                  className={textareaClass()}
                  placeholder="Example: Covers factory faults only. Physical damage, water damage, software issues, and unauthorized repair are not covered."
                  required
                />
              </label>
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--doc-text)]">
                  Products covered
                </h2>

                <p className="mt-1 text-sm font-medium leading-6 text-[var(--doc-muted)]">
                  Keep checked only the products that should be covered by this warranty.
                </p>
              </div>

              {selectedSale && selectableItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleAllCovered(true)} className={secondaryBtn()}>
                    Select all
                  </button>

                  <button type="button" onClick={() => toggleAllCovered(false)} className={secondaryBtn()}>
                    Unselect all
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedSale ? (
              <div className="mt-5">
                <EmptyState
                  title="Choose a sale first"
                  text="Sold products from the selected sale will appear here."
                />
              </div>
            ) : selectableItems.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="No sold products found"
                  text="This sale did not return products that can be covered."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {selectableItems.map((item, index) => (
                  <CoveredItemCard
                    key={item.key}
                    item={item}
                    index={index}
                    onChange={updateSelectableItem}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6 xl:sticky xl:top-[96px]")}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--doc-blue)]">
              Review
            </p>

            <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--doc-text)]">
              Warranty summary
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--doc-muted)]">
              Check everything before creating the certificate.
            </p>

            <div className="mt-5 grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <InfoTile
                label="Sale"
                value={selectedSale ? saleReferenceLabel(selectedSale) : "Not selected"}
                tone={selectedSale ? "success" : "warning"}
                compact
              />

              <InfoTile
                label="Customer"
                value={
                  selectedSale
                    ? `${customerName(selectedSale)} • ${customerPhone(selectedSale)}`
                    : "—"
                }
                compact
              />

              <InfoTile label="Covered products" value={formatNumber(totalCoveredItems)} compact />
              <InfoTile label="Starts" value={form.startsAt || "—"} compact />
              <InfoTile label="Ends" value={form.endsAt || "Auto / derived"} compact />
              <InfoTile
                label="Terms"
                value={cleanString(form.policy) ? "Provided" : "Missing"}
                tone={cleanString(form.policy) ? "success" : "warning"}
                compact
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 max-[360px]:grid-cols-1">
              <AsyncButton type="submit" loading={saving} className={cx(successBtn(), "w-full")}>
                <ShieldIcon />
                Create warranty
              </AsyncButton>

              <Link to="/app/documents/warranties" className={cx(secondaryBtn(), "w-full")}>
                Cancel
              </Link>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
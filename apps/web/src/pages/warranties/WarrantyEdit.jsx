import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getSale } from "../../services/posApi";
import { getWarranty, updateWarranty } from "../../services/warrantiesApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

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

function toInputDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
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
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function textareaClass() {
  return "min-h-[132px] w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function primaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
  );
}

function secondaryBtn() {
  return cx(
    buttonBase(),
    "bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
  );
}

function successBtn() {
  return cx(
    buttonBase(),
    "bg-emerald-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
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

function warrantyReferenceLabel(warranty) {
  return (
    cleanString(warranty?.warrantyNumber) ||
    cleanString(warranty?.number) ||
    cleanString(warranty?.id) ||
    "Warranty"
  );
}

function customerName(saleOrWarranty) {
  return (
    cleanString(saleOrWarranty?.customer?.name) ||
    cleanString(saleOrWarranty?.customerName) ||
    "Walk-in customer"
  );
}

function customerPhone(saleOrWarranty) {
  return (
    cleanString(saleOrWarranty?.customer?.phone) ||
    cleanString(saleOrWarranty?.customerPhone) ||
    "No phone saved"
  );
}

function cashierName(saleOrWarranty) {
  return (
    cleanString(saleOrWarranty?.cashier?.name) ||
    cleanString(saleOrWarranty?.cashierName) ||
    "—"
  );
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

function normalizeWarrantyDetail(raw) {
  const warranty = raw?.warranty || raw || {};
  const units = Array.isArray(warranty?.units) ? warranty.units : [];

  return {
    ...warranty,
    id: warranty?.id || null,
    number: warranty?.number || warranty?.warrantyNumber || null,
    warrantyNumber: warranty?.warrantyNumber || warranty?.number || null,
    saleId: warranty?.saleId || warranty?.sale?.id || null,
    policy: warranty?.policy || "",
    durationMonths:
      warranty?.durationMonths === null || warranty?.durationMonths === undefined
        ? ""
        : warranty.durationMonths,
    durationDays:
      warranty?.durationDays === null || warranty?.durationDays === undefined
        ? ""
        : warranty.durationDays,
    startsAt: warranty?.startsAt || null,
    endsAt: warranty?.endsAt || null,
    createdAt: warranty?.createdAt || null,
    customer: warranty?.customer || null,
    cashierName: warranty?.cashierName || null,
    receiptNumber: warranty?.receiptNumber || warranty?.sale?.receiptNumber || null,
    invoiceNumber: warranty?.invoiceNumber || warranty?.sale?.invoiceNumber || null,
    saleDate: warranty?.saleDate || warranty?.sale?.createdAt || null,
    units,
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

function buildSelectableItemsFromSaleAndWarranty(sale, warranty) {
  const saleItems = Array.isArray(sale?.items) ? sale.items : [];
  const warrantyUnits = Array.isArray(warranty?.units) ? warranty.units : [];

  const unitMap = new Map(
    warrantyUnits.map((unit) => [
      String(unit.saleItemId || ""),
      {
        id: unit?.id || "",
        serial: unit?.serial || "",
        imei1: unit?.imei1 || "",
        imei2: unit?.imei2 || "",
        unitLabel: unit?.unitLabel || "",
      },
    ])
  );

  return saleItems.map((item, index) => {
    const saleItemId = String(item?.id || "");
    const existing = unitMap.get(saleItemId) || null;

    return {
      key: itemKey(item, index),
      checked: Boolean(existing),
      warrantyUnitId: existing?.id || "",
      saleItemId,
      productId: itemProductId(item),
      unitLabel: existing?.unitLabel || itemName(item),
      serial: existing?.serial || itemSerial(item),
      imei1: existing?.imei1 || "",
      imei2: existing?.imei2 || "",
      quantity: itemQuantity(item),
      price: itemPrice(item),
    };
  });
}

function StatusBadge({ tone = "neutral", children }) {
  const cls =
    tone === "danger"
      ? "bg-red-500/10 text-red-600"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-600"
        : tone === "success"
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

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
    <div className={cx("animate-pulse rounded-[22px] bg-[var(--color-surface-2)]", className)} />
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-5">
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
      ? "bg-red-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "success"
          ? "bg-emerald-500"
          : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5")}>
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[rgba(74,163,255,0.08)] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        <p className="mt-3 truncate text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
          {value}
        </p>

        {note ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function InfoTile({ label, value, tone = "neutral" }) {
  const valueClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "success"
          ? "text-emerald-600"
          : "text-[var(--color-text)]";

  return (
    <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <p className={cx("mt-2 break-words text-sm font-black leading-6", valueClass)}>
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-8 text-center">
      <h3 className="text-base font-black text-[var(--color-text)]">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
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
          ? "border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] opacity-75"
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(event) => onChange(index, "checked", event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[var(--color-border)]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-[var(--color-text)]">
              {item.unitLabel || `Sold product ${index + 1}`}
            </h3>

            <StatusBadge tone={item.checked ? "success" : "neutral"}>
              {item.checked ? "Covered" : "Not covered"}
            </StatusBadge>
          </div>

          <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
            Qty: {formatNumber(item.quantity || 1)} • Sold for {formatMoney(item.price || 0)}
          </p>

          {item.checked ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
            <p className="mt-3 text-sm font-medium text-[var(--color-text-muted)]">
              This product will not appear on the warranty certificate.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function WarrantyEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [warranty, setWarranty] = useState(null);
  const [sale, setSale] = useState(null);

  const [form, setForm] = useState({
    policy: "",
    startsAt: "",
    endsAt: "",
    durationMonths: "",
    durationDays: "",
  });

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

  async function loadWarranty() {
    if (!id) return;

    setLoading(true);

    try {
      const warrantyRaw = await getWarranty(id);
      const normalizedWarranty = normalizeWarrantyDetail(warrantyRaw);

      if (!normalizedWarranty?.saleId) {
        throw new Error("Linked sale is missing");
      }

      const saleRaw = await getSale(normalizedWarranty.saleId);
      const normalizedSale = normalizeSaleDetail(saleRaw);

      if (!mountedRef.current) return;

      setWarranty(normalizedWarranty);
      setSale(normalizedSale);
      setActiveStoreLocation(storeLocationLabel(normalizedSale));

      setForm({
        policy: normalizedWarranty.policy || "",
        startsAt: toInputDate(normalizedWarranty.startsAt),
        endsAt: toInputDate(normalizedWarranty.endsAt),
        durationMonths:
          normalizedWarranty.durationMonths === null ||
          normalizedWarranty.durationMonths === undefined
            ? ""
            : String(normalizedWarranty.durationMonths),
        durationDays:
          normalizedWarranty.durationDays === null ||
          normalizedWarranty.durationDays === undefined
            ? ""
            : String(normalizedWarranty.durationDays),
      });

      setSelectableItems(
        buildSelectableItemsFromSaleAndWarranty(normalizedSale, normalizedWarranty)
      );
    } catch (error) {
      if (!mountedRef.current) return;

      console.error(error);

      if (!handleSubscriptionBlockedError(error, { toastId: "warranty-edit-load-blocked" })) {
        toast.error(error?.message || "Failed to load warranty");
      }

      setWarranty(null);
      setSale(null);
      setSelectableItems([]);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadWarranty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    function onStoreLocationChanged() {
      setActiveStoreLocation(activeStoreLocationFromStorage());
      void loadWarranty();
    }

    window.addEventListener("storvex:branch-changed", onStoreLocationChanged);
    window.addEventListener("storvex:workspace-refreshed", onStoreLocationChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onStoreLocationChanged);
      window.removeEventListener("storvex:workspace-refreshed", onStoreLocationChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const selectedCoveredItems = useMemo(() => {
    return selectableItems.filter(
      (item) => item.checked && cleanString(item.saleItemId) && cleanString(item.productId)
    );
  }, [selectableItems]);

  const totalSoldItems = selectableItems.length;
  const totalCoveredItems = selectedCoveredItems.length;
  const excludedItems = Math.max(0, totalSoldItems - totalCoveredItems);

  async function onSubmit(event) {
    event.preventDefault();

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
      await updateWarranty(id, {
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
      });

      toast.success("Warranty updated");
      navigate(`/app/documents/warranties/${encodeURIComponent(id)}/preview`);
    } catch (error) {
      console.error(error);

      if (handleSubscriptionBlockedError(error, { toastId: "warranty-update-blocked" })) {
        return;
      }

      toast.error(error?.response?.data?.message || error?.message || "Failed to update warranty");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <EditSkeleton />;
  }

  if (!warranty) {
    return (
      <div className="space-y-5">
        <section className={cx(pageCard(), "p-6 text-center")}>
          <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">
            Warranty could not be loaded
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
            This warranty was not found or cannot be opened from the current store location.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/app/documents/warranties" className={secondaryBtn()}>
              Warranties
            </Link>

            <button type="button" onClick={loadWarranty} className={primaryBtn()}>
              Try again
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[rgba(74,163,255,0.10)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Warranty
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              Edit warranty
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Update{" "}
              <span className="font-black text-[var(--color-text)]">
                {warrantyReferenceLabel(warranty)}
              </span>{" "}
              for{" "}
              <span className="font-black text-[var(--color-text)]">
                {activeStoreLocation}
              </span>
              . Keep the warranty clear, accurate, and linked to the original sale.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <Link to="/app/documents/warranties" className={secondaryBtn()}>
              Warranties
            </Link>

            <Link
              to={`/app/documents/warranties/${encodeURIComponent(id)}/preview`}
              className={secondaryBtn()}
            >
              Preview
            </Link>

            <Link to="/app/documents" className={primaryBtn()}>
              Documents
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Warranty"
          value={warrantyReferenceLabel(warranty)}
          note="Current certificate"
          tone="success"
        />

        <SummaryCard
          label="Sale"
          value={sale ? saleReferenceLabel(sale) : "Missing"}
          note={sale ? `${customerName(sale)} • ${customerPhone(sale)}` : "Linked sale unavailable"}
          tone={sale ? "success" : "danger"}
        />

        <SummaryCard
          label="Covered"
          value={formatNumber(totalCoveredItems)}
          note="Products still covered"
          tone={totalCoveredItems > 0 ? "success" : "warning"}
        />

        <SummaryCard
          label="Excluded"
          value={formatNumber(excludedItems)}
          note="Products not covered"
          tone={excludedItems > 0 ? "warning" : "neutral"}
        />
      </section>

      <form onSubmit={onSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                1. Linked sale
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                This warranty stays attached to the original sale.
              </p>
            </div>

            {sale ? (
              <div className="mt-5 rounded-[26px] border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                      Linked sale
                    </p>

                    <h3 className="mt-1 text-base font-black text-[var(--color-text)]">
                      {saleReferenceLabel(sale)}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
                      {customerName(sale)} • {customerPhone(sale)}
                    </p>

                    <p className="mt-2 text-xs font-bold text-[var(--color-text-muted)]">
                      {formatDate(sale?.createdAt)} • {formatMoney(sale?.total)} • Staff:{" "}
                      {cashierName(sale)}
                    </p>
                  </div>

                  <StatusBadge tone={saleStatusTone(sale?.status)}>
                    {sale?.status || "Sale"}
                  </StatusBadge>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Linked sale unavailable"
                  text="The warranty exists, but the sale details could not be loaded."
                />
              </div>
            )}
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                2. Warranty terms
              </h2>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Update coverage dates and terms shown on the customer certificate.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
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
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  3. Covered products
                </h2>

                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Keep checked only the sold products that should remain covered.
                </p>
              </div>

              {sale && selectableItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleAllCovered(true)} className={secondaryBtn()}>
                    Select all
                  </button>

                  <button type="button" onClick={() => toggleAllCovered(false)} className={secondaryBtn()}>
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>

            {!sale ? (
              <div className="mt-5">
                <EmptyState
                  title="Sale information missing"
                  text="Covered products cannot be edited until the linked sale is available."
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
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Review
            </p>

            <h2 className="mt-2 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
              Warranty summary
            </h2>

            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Check everything before saving changes.
            </p>

            <div className="mt-5 grid gap-3">
              <InfoTile
                label="Warranty"
                value={warrantyReferenceLabel(warranty)}
                tone="success"
              />

              <InfoTile
                label="Sale"
                value={sale ? saleReferenceLabel(sale) : "Unavailable"}
                tone={sale ? "success" : "danger"}
              />

              <InfoTile
                label="Customer"
                value={sale ? `${customerName(sale)} • ${customerPhone(sale)}` : "—"}
              />

              <InfoTile label="Covered products" value={formatNumber(totalCoveredItems)} />
              <InfoTile label="Starts" value={form.startsAt || "—"} />
              <InfoTile label="Ends" value={form.endsAt || "Auto / derived"} />
              <InfoTile
                label="Terms"
                value={cleanString(form.policy) ? "Provided" : "Missing"}
                tone={cleanString(form.policy) ? "success" : "warning"}
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <AsyncButton type="submit" loading={saving} className={successBtn()}>
                <ShieldIcon />
                Save warranty
              </AsyncButton>

              <Link
                to={`/app/documents/warranties/${encodeURIComponent(id)}/preview`}
                className={secondaryBtn()}
              >
                Cancel
              </Link>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
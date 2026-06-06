import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import InlineSpinner from "../../components/ui/InlineSpinner";

import {
  createSale,
  getQuickPicks,
  PAYMENT_METHOD_OPTIONS,
  paymentMethodTouchesCashDrawer,
} from "../../services/posApi";
import { searchProducts } from "../../services/inventoryApi";
import { listCustomers } from "../../services/customersApi";
import { getCashDrawerStatus } from "../../services/cashDrawerApi";
import { getDocumentSettings } from "../../services/storeApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";

const PAGE_SIZE = 10;

function formatMoney(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(safe)}`;
}

function formatNumber(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeTaxMode(value) {
  const mode = String(value || "NONE").trim().toUpperCase();

  if (
    mode === "NONE" ||
    mode === "VAT_18" ||
    mode === "TURNOVER_3_INTERNAL" ||
    mode === "VAT_18_PLUS_TURNOVER_3" ||
    mode === "CUSTOM"
  ) {
    return mode;
  }

  return "NONE";
}

function normalizeTaxDisplayMode(value) {
  const mode = String(value || "HIDDEN").trim().toUpperCase();

  if (mode === "HIDDEN" || mode === "CUSTOMER_FACING" || mode === "INTERNAL_ONLY") {
    return mode;
  }

  return "HIDDEN";
}

function defaultTaxRateBps(mode, fallback = 0) {
  if (mode === "VAT_18") return 1800;
  if (mode === "TURNOVER_3_INTERNAL") return 300;
  if (mode === "VAT_18_PLUS_TURNOVER_3") return 2100;

  const n = Number(fallback || 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(10000, Math.floor(n))) : 0;
}

function defaultTaxName(mode, fallback = "") {
  const clean = cleanString(fallback);
  if (clean) return clean;

  if (mode === "VAT_18") return "VAT 18% included";
  if (mode === "TURNOVER_3_INTERNAL") return "Turnover tax estimate 3% included";
  if (mode === "VAT_18_PLUS_TURNOVER_3") return "Tax 21% included";
  if (mode === "CUSTOM") return "Tax included";

  return "Tax";
}

function computeTaxPreview(subtotal, settings) {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  const taxMode = normalizeTaxMode(settings?.taxMode);
  const taxDisplayMode = normalizeTaxDisplayMode(settings?.taxDisplayMode);
  const taxRateBps = defaultTaxRateBps(taxMode, settings?.taxRateBps);
  const showTaxOnCustomerDocuments = Boolean(settings?.showTaxOnCustomerDocuments);

  const pricesIncludeTax = taxMode !== "NONE" && taxRateBps > 0;

  const showTaxLine =
    taxMode !== "NONE" &&
    taxDisplayMode === "CUSTOMER_FACING" &&
    showTaxOnCustomerDocuments &&
    taxRateBps > 0;

  let taxableSubtotal = safeSubtotal;
  let taxAmount = 0;
  let total = safeSubtotal;

  if (showTaxLine) {
    taxAmount = Math.round((safeSubtotal * taxRateBps) / (10000 + taxRateBps));
    taxableSubtotal = Math.max(0, safeSubtotal - taxAmount);
    total = safeSubtotal;
  }

  return {
    subtotal: safeSubtotal,
    taxableSubtotal,
    taxAmount,
    total,
    taxName: defaultTaxName(taxMode, settings?.taxName),
    taxMode,
    taxDisplayMode,
    taxRateBps,
    pricesIncludeTax,
    showTaxLine,
    customerFacing: showTaxLine,
  };
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function productPrice(product) {
  return Number(product?.sellPrice ?? product?.price ?? 0);
}

function activeBranchNameFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "this branch";
}

function pageCard() {
  return "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[24px] bg-[var(--color-surface-2)]";
}

function inputClass() {
  return "h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

function textareaClass() {
  return "min-h-[110px] w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonBase() {
  return "inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryButton() {
  return cx(
    buttonBase(),
    "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:bg-[var(--color-surface-3)]",
  );
}

function primaryButton() {
  return cx(
    buttonBase(),
    "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] hover:-translate-y-0.5 hover:opacity-95",
  );
}

function warningButton() {
  return cx(
    buttonBase(),
    "bg-amber-500 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function dangerButton() {
  return cx(
    buttonBase(),
    "bg-red-600 text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5",
  );
}

function StatusBadge({ tone = "neutral", children }) {
  const classes =
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
        classes,
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

function PosSaleSkeleton() {
  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full rounded-[18px]" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={cx(pageCard(), "p-5")}>
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-24" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className={cx(pageCard(), "p-5")}>
              <SkeletonBlock className="h-7 w-40" />
              <SkeletonBlock className="mt-3 h-4 w-72 max-w-full" />
              <SkeletonBlock className="mt-5 h-12 w-full" />
            </div>
          ))}
        </div>

        <div className={cx(pageCard(), "p-5")}>
          <SkeletonBlock className="h-7 w-28" />
          <SkeletonBlock className="mt-4 h-28 w-full" />
          <SkeletonBlock className="mt-4 h-14 w-full" />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral", loading = false }) {
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
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[var(--color-surface-3)] opacity-45 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <span className={cx("h-2.5 w-2.5 rounded-full", dot)} />
        </div>

        {loading ? (
          <>
            <SkeletonBlock className="mt-4 h-8 w-28" />
            <SkeletonBlock className="mt-2 h-4 w-36" />
          </>
        ) : (
          <>
            <p className="mt-3 truncate text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              {value}
            </p>

            {note ? (
              <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                {note}
              </p>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-center">
      <h3 className="text-base font-black text-[var(--color-text)]">{title}</h3>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}

function MiniStep({ number, title, active }) {
  return (
    <div
      className={cx(
        "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition",
        active
          ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
      )}
    >
      <span
        className={cx(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
          active
            ? "bg-[var(--color-primary-contrast)]/15 text-[var(--color-primary-contrast)]"
            : "bg-[var(--color-card)] text-[var(--color-text)]",
        )}
      >
        {number}
      </span>
      <span>{title}</span>
    </div>
  );
}

function SaleModeButton({ active, tone, title, text, onClick }) {
  const activeClass = tone === "success" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[24px] p-4 text-left transition hover:-translate-y-0.5",
        active
          ? cx(activeClass, "shadow-[var(--shadow-soft)]")
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <span className="block text-sm font-black">{title}</span>
      <span
        className={cx(
          "mt-2 block text-xs font-semibold leading-5",
          active ? "text-white/85" : "text-[var(--color-text-muted)]",
        )}
      >
        {text}
      </span>
    </button>
  );
}

function PaymentMethodCard({ option, active, onClick }) {
  const simpleDescription =
    option.value === "CASH"
      ? "Customer gives physical cash."
      : option.value === "MOMO"
        ? "Customer pays by mobile money."
        : option.value === "CARD"
          ? "Customer pays by card."
          : option.value === "BANK"
            ? "Customer pays by bank transfer or deposit."
            : "Use when the payment does not fit the other options.";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[22px] p-4 text-left transition hover:-translate-y-0.5",
        active
          ? "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black">{option.label}</div>
          <div
            className={cx(
              "mt-2 text-xs font-semibold leading-5",
              active
                ? "text-[var(--color-primary-contrast)] opacity-80"
                : "text-[var(--color-text-muted)]",
            )}
          >
            {simpleDescription}
          </div>
        </div>

        {active ? (
          <span className="rounded-full border border-[var(--color-primary-contrast)]/20 bg-[var(--color-primary-contrast)]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary-contrast)]">
            Chosen
          </span>
        ) : null}
      </div>
    </button>
  );
}

function ProductRow({ product, onAdd }) {
  const stock = productStock(product);
  const disabled = !Number.isFinite(stock) || stock <= 0;

  return (
    <article
      className={cx(
        "rounded-[24px] bg-[var(--color-surface-2)] p-4 transition",
        disabled ? "opacity-60" : "hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-black text-[var(--color-text)]">
            {product.name}
          </div>

          <div className="mt-1 truncate text-sm font-semibold text-[var(--color-text-muted)]">
            {[product.brand, product.category, product.sku].filter(Boolean).join(" • ") ||
              "No category"}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge tone={stock <= 0 ? "danger" : "success"}>
              {stock <= 0 ? "Out" : `${formatNumber(stock)} available`}
            </StatusBadge>

            {product.serial ? <StatusBadge>{product.serial}</StatusBadge> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
            {formatMoney(productPrice(product))}
          </div>

          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={disabled}
            className={cx(
              "inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-black transition disabled:cursor-not-allowed",
              disabled
                ? "bg-[var(--color-card)] text-[var(--color-text-muted)]"
                : "bg-emerald-500/10 text-emerald-600 hover:-translate-y-0.5",
            )}
          >
            {disabled ? "Unavailable" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CustomerCard({ customer, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[24px] p-4 text-left transition",
        active
          ? "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
          : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{customer.name}</div>
          <div
            className={cx(
              "mt-1 text-xs font-semibold",
              active
                ? "text-[var(--color-primary-contrast)] opacity-80"
                : "text-[var(--color-text-muted)]",
            )}
          >
            {customer.phone || "No phone saved"}
          </div>

          {customer.email ? (
            <div
              className={cx(
                "mt-1 truncate text-xs font-semibold",
                active
                  ? "text-[var(--color-primary-contrast)] opacity-80"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              {customer.email}
            </div>
          ) : null}
        </div>

        {active ? (
          <span className="rounded-full border border-[var(--color-primary-contrast)]/20 bg-[var(--color-primary-contrast)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-primary-contrast)]">
            Selected
          </span>
        ) : null}
      </div>
    </button>
  );
}

function CartItemCard({ item, onDec, onInc, onRemove }) {
  return (
    <article className="rounded-[24px] bg-[var(--color-surface-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--color-text)]">{item.name}</div>
          <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            Price: <span className="text-[var(--color-text)]">{formatMoney(item.price)}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            Available:{" "}
            <span className="text-[var(--color-text)]">{formatNumber(item.stockQty)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.productId)}
          className="text-xs font-black text-red-600 transition hover:opacity-80"
        >
          Remove
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDec(item.productId)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-card)] text-lg font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            −
          </button>

          <div className="min-w-[2.25rem] text-center text-base font-black text-[var(--color-text)]">
            {item.quantity}
          </div>

          <button
            type="button"
            onClick={() => onInc(item.productId)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-card)] text-lg font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
          >
            +
          </button>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
            Total
          </div>
          <div className="mt-1 text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
            {formatMoney(item.price * item.quantity)}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PosSale() {
  const navigate = useNavigate();

  const [bootLoading, setBootLoading] = useState(true);
  const [activeBranchLabel, setActiveBranchLabel] = useState(() => activeBranchNameFromStorage());

  const [productResults, setProductResults] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [quickBest, setQuickBest] = useState([]);
  const [quickLatest, setQuickLatest] = useState([]);
  const [quickLoading, setQuickLoading] = useState(true);

  const [customers, setCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customersLoading, setCustomersLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [savingSale, setSavingSale] = useState(false);

  const [saleType, setSaleType] = useState("CASH");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");

  const [customerMode, setCustomerMode] = useState("WALKIN");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    tinNumber: "",
    idNumber: "",
    notes: "",
  });

  const [dueDate, setDueDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  const [drawerLoading, setDrawerLoading] = useState(true);
  const [drawerStatus, setDrawerStatus] = useState(null);
  const [drawerRefreshBusy, setDrawerRefreshBusy] = useState(false);

  const [documentSettings, setDocumentSettings] = useState(null);
  const [documentSettingsLoading, setDocumentSettingsLoading] = useState(true);

  const searchTimer = useRef(null);
  const mountedRef = useRef(true);
  const productReqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  async function loadDrawerStatus({ silent = false } = {}) {
    if (!silent) setDrawerRefreshBusy(true);
    setDrawerLoading(true);

    try {
      const status = await getCashDrawerStatus();
      if (!mountedRef.current) return;

      setDrawerStatus(status);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "drawer-status-blocked" })) {
        setDrawerStatus(null);
      }
    } finally {
      if (!mountedRef.current) return;

      setDrawerLoading(false);
      setDrawerRefreshBusy(false);
    }
  }

  async function loadDocumentSettings() {
    setDocumentSettingsLoading(true);

    try {
      const data = await getDocumentSettings();
      if (!mountedRef.current) return;

      setDocumentSettings(data?.documentSettings || null);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "document-settings-load-blocked" })) {
        setDocumentSettings(null);
      }
    } finally {
      if (!mountedRef.current) return;
      setDocumentSettingsLoading(false);
    }
  }

  async function loadCustomers() {
    setCustomersLoading(true);

    try {
      const result = await listCustomers();
      if (!mountedRef.current) return;

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.customers)
          ? result.customers
          : [];

      setCustomers(list);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "customers-load-blocked" })) {
        toast.error(error?.message || "Failed to load customers");
      }

      setCustomers([]);
    } finally {
      if (!mountedRef.current) return;
      setCustomersLoading(false);
    }
  }

  async function loadQuickPicks() {
    setQuickLoading(true);

    try {
      const data = await getQuickPicks({
        periodDays: 7,
        limit: PAGE_SIZE,
      });

      if (!mountedRef.current) return;

      setQuickBest(Array.isArray(data?.bestSellers) ? data.bestSellers.slice(0, PAGE_SIZE) : []);
      setQuickLatest(Array.isArray(data?.latest) ? data.latest.slice(0, PAGE_SIZE) : []);
    } catch (error) {
      if (!mountedRef.current) return;

      if (!handleSubscriptionBlockedError(error, { toastId: "quick-picks-blocked" })) {
        setQuickBest([]);
        setQuickLatest([]);
      }
    } finally {
      if (!mountedRef.current) return;
      setQuickLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBootLoading(true);

      try {
        await Promise.all([
          loadQuickPicks(),
          loadCustomers(),
          loadDrawerStatus({ silent: true }),
          loadDocumentSettings(),
        ]);
      } finally {
        if (!cancelled && mountedRef.current) setBootLoading(false);
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onBranchChanged() {
      setActiveBranchLabel(activeBranchNameFromStorage());
      setCart([]);
      setProductResults([]);
      setProductQuery("");
      loadQuickPicks();
      loadDrawerStatus({ silent: true });
      loadDocumentSettings();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const q = productQuery.trim();

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!q) {
      setProductResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const myReqId = ++productReqIdRef.current;

    searchTimer.current = setTimeout(async () => {
      try {
        const result = await searchProducts({
          q,
          limit: PAGE_SIZE,
        });

        if (cancelled || !mountedRef.current) return;
        if (myReqId !== productReqIdRef.current) return;

        setProductResults(Array.isArray(result?.products) ? result.products.slice(0, PAGE_SIZE) : []);
      } catch (error) {
        if (cancelled || !mountedRef.current) return;
        if (myReqId !== productReqIdRef.current) return;

        if (!handleSubscriptionBlockedError(error, { toastId: "product-search-blocked" })) {
          setProductResults([]);
        }
      } finally {
        if (cancelled || !mountedRef.current) return;
        if (myReqId !== productReqIdRef.current) return;

        setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [productQuery]);

  useEffect(() => {
    if (saleType === "CASH") {
      setDueDate("");
      setAmountPaid("");
    }

    if (saleType === "CREDIT" && customerMode === "WALKIN") {
      setCustomerMode("PICK");
    }
  }, [saleType, customerMode]);

  function onProductKeyDown(event) {
    if (event.key !== "Enter") return;

    const first = productResults[0];
    if (!first) return;

    event.preventDefault();
    addToCart(first);
  }

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();

    const source = q
      ? customers.filter((customer) => {
          const name = String(customer.name || "").toLowerCase();
          const phone = String(customer.phone || "").toLowerCase();
          const email = String(customer.email || "").toLowerCase();
          const tinNumber = String(customer.tinNumber || "").toLowerCase();
          const idNumber = String(customer.idNumber || "").toLowerCase();

          return (
            name.includes(q) ||
            phone.includes(q) ||
            email.includes(q) ||
            tinNumber.includes(q) ||
            idNumber.includes(q)
          );
        })
      : customers;

    return source.slice(0, PAGE_SIZE);
  }, [customers, customerQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => customer.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  }, [cart]);

  const taxPreview = useMemo(() => {
    return computeTaxPreview(subtotal, documentSettings);
  }, [subtotal, documentSettings]);

  const total = taxPreview.total;

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [cart]);

  const showQuickPicks = !productQuery.trim();
  const quickList = quickBest.length > 0 ? quickBest : quickLatest;
  const quickTitle = quickBest.length > 0 ? "Best sellers" : "Latest products";

  const drawerOpen = Boolean(drawerStatus?.openSession?.id);
  const blockCashSales = Boolean(drawerStatus?.settings?.blockCashSales ?? true);
  const selectedMethodTouchesDrawer = paymentMethodTouchesCashDrawer(paymentMethod);

  const cashAmountTakenNow = selectedMethodTouchesDrawer
    ? saleType === "CASH"
      ? total
      : Number(amountPaid || 0)
    : 0;

  const hasCashDrawerRisk =
    selectedMethodTouchesDrawer &&
    blockCashSales &&
    !drawerOpen &&
    cashAmountTakenNow > 0;

  const drawerSummary = selectedMethodTouchesDrawer
    ? {
        value: drawerLoading ? "Checking..." : drawerOpen ? "Open" : "Closed",
        note: blockCashSales ? "Needed for cash received now" : "Cash can be recorded",
        tone: drawerOpen ? "success" : "danger",
      }
    : {
        value: "Not needed",
        note: "Selected method does not use the drawer",
        tone: "neutral",
      };

  const saleModeLabel = saleType === "CREDIT" ? "Pay later" : "Paid now";

  const activeStep = useMemo(() => {
    if (cart.length > 0) return 4;
    if (productQuery.trim() || quickList.length > 0 || productResults.length > 0) return 3;
    if (customerMode !== "WALKIN" || selectedCustomerId || customerForm.name) return 2;
    return 1;
  }, [
    cart.length,
    productQuery,
    quickList.length,
    productResults.length,
    customerMode,
    selectedCustomerId,
    customerForm.name,
  ]);

  function setCustomerField(key, value) {
    setCustomerForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetCustomerSelection() {
    setSelectedCustomerId("");
    setCustomerQuery("");
  }

  function resetCustomerForm() {
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      tinNumber: "",
      idNumber: "",
      notes: "",
    });
  }

  function addToCart(product) {
    const stock = productStock(product);

    if (!Number.isFinite(stock) || stock <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);

      if (existing) {
        if (existing.quantity + 1 > stock) {
          toast.error("You cannot sell more than available stock");
          return prev;
        }

        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: productPrice(product),
          quantity: 1,
          stockQty: stock,
        },
      ];
    });
  }

  function increaseQty(productId) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;

        if (item.quantity + 1 > Number(item.stockQty || 0)) {
          toast.error("You cannot sell more than available stock");
          return item;
        }

        return { ...item, quantity: item.quantity + 1 };
      }),
    );
  }

  function decreaseQty(productId) {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
      ),
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  function validateCustomerForSale() {
    if (customerMode === "WALKIN") {
      if (saleType === "CREDIT") {
        return { ok: false, message: "Pay-later sales need a saved customer." };
      }

      return { ok: true };
    }

    if (customerMode === "PICK") {
      if (!selectedCustomerId) {
        return { ok: false, message: "Choose a customer first." };
      }

      return { ok: true };
    }

    const name = cleanString(customerForm.name);
    const phone = cleanString(customerForm.phone);

    if (!name || !phone) {
      return { ok: false, message: "Customer name and phone are required." };
    }

    return { ok: true };
  }

  function buildCustomerPayload() {
    if (customerMode === "PICK" && selectedCustomerId) {
      return { customerId: selectedCustomerId };
    }

    if (customerMode === "NEW") {
      const customerPayload = {
        name: cleanString(customerForm.name),
        phone: cleanString(customerForm.phone),
        email: cleanString(customerForm.email) || null,
        address: cleanString(customerForm.address) || null,
        tinNumber: cleanString(customerForm.tinNumber) || null,
        idNumber: cleanString(customerForm.idNumber) || null,
        notes: cleanString(customerForm.notes) || null,
      };

      return {
        customer: customerPayload,
        customerName: customerPayload.name,
        customerPhone: customerPayload.phone,
        customerEmail: customerPayload.email,
        customerAddress: customerPayload.address,
        customerTinNumber: customerPayload.tinNumber,
        customerIdNumber: customerPayload.idNumber,
        customerNotes: customerPayload.notes,
      };
    }

    return {};
  }

  async function completeSale() {
    if (cart.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    if (hasCashDrawerRisk) {
      toast.error("Open the cash drawer before taking cash.");
      return;
    }

    const customerValidation = validateCustomerForSale();

    if (!customerValidation.ok) {
      toast.error(customerValidation.message);
      return;
    }

    if (saleType === "CREDIT" && !dueDate) {
      toast.error("Choose when the customer should pay.");
      return;
    }

    const paid = Number(amountPaid || 0);

    if (saleType === "CREDIT" && paid > total) {
      toast.error("Deposit cannot be more than the final sale total.");
      return;
    }

    setSavingSale(true);

    try {
      const payload = {
        saleType,
        paymentMethod,
        paymentReference: cleanString(paymentReference),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        ...buildCustomerPayload(),
      };

      if (saleType === "CREDIT") {
        payload.dueDate = dueDate;
        payload.amountPaid = Number.isFinite(paid) && paid > 0 ? paid : 0;
      }

      const result = await createSale(payload);
      const saleId = result?.sale?.id || result?.saleId;

      if (!saleId) {
        toast.error("Sale was saved, but the receipt could not be opened.");
        return;
      }

      clearCart();
      resetCustomerSelection();
      resetCustomerForm();
      setCustomerMode("WALKIN");
      setDueDate("");
      setAmountPaid("");
      setPaymentMethod("CASH");
      setPaymentReference("");

      toast.success("Sale completed");
      await loadCustomers();
      void loadDrawerStatus({ silent: true });

      navigate(`/app/pos/sales/${saleId}`);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "sale-create-blocked" })) {
        return;
      }

      if (
        error?.code === "CASH_DRAWER_CLOSED" ||
        String(error?.message || "").toLowerCase().includes("cash drawer")
      ) {
        toast.error("Open the cash drawer before taking cash.");
        void loadDrawerStatus({ silent: true });
        return;
      }

      toast.error(error?.message || "Failed to complete sale");
    } finally {
      setSavingSale(false);
    }
  }

  if (bootLoading) {
    return <PosSaleSkeleton />;
  }

  return (
    <div className="space-y-5">
      <section className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-[260px] w-[260px] rounded-full bg-[var(--color-surface-3)] opacity-40 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
              Sales
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)] sm:text-3xl">
              New sale
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--color-text-muted)]">
              Sell from{" "}
              <span className="font-black text-[var(--color-text)]">{activeBranchLabel}</span>.
              Pick how the customer pays, choose the customer, add products, then finish.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
            <button type="button" onClick={() => navigate("/app/pos/sales")} className={secondaryButton()}>
              Sales list
            </button>

            <button type="button" onClick={() => navigate("/app/pos/credit")} className={secondaryButton()}>
              Pay later
            </button>

            <button type="button" onClick={() => navigate("/app/pos/drawer")} className={primaryButton()}>
              Cash drawer
            </button>
          </div>
        </div>

        <div className="relative mt-5 flex gap-2 overflow-x-auto pb-1">
          <MiniStep number="1" title="Payment" active={activeStep === 1} />
          <MiniStep number="2" title="Customer" active={activeStep === 2} />
          <MiniStep number="3" title="Products" active={activeStep === 3} />
          <MiniStep number="4" title="Finish" active={activeStep === 4} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Products" value={formatNumber(cartItemsCount)} note="Units in this sale" tone="neutral" />

        <SummaryCard
          label="Sale total"
          value={formatMoney(total)}
          note={
            documentSettingsLoading
              ? "Checking document rules"
              : taxPreview.showTaxLine
                ? taxPreview.taxName
                : saleModeLabel
          }
          tone={saleType === "CREDIT" ? "warning" : "success"}
          loading={documentSettingsLoading}
        />

        <SummaryCard
          label="Customer"
          value={
            customerMode === "WALKIN"
              ? "Walk-in"
              : customerMode === "PICK"
                ? selectedCustomer?.name || "Choose customer"
                : customerForm.name || "New customer"
          }
          note={
            customerMode === "WALKIN"
              ? "Quick paid-now sale"
              : customerMode === "PICK"
                ? selectedCustomer?.phone || "Saved customer"
                : customerForm.phone || "Will be saved during sale"
          }
          tone={saleType === "CREDIT" && customerMode === "WALKIN" ? "danger" : "neutral"}
          loading={customersLoading}
        />

        <SummaryCard
          label="Cash drawer"
          value={drawerSummary.value}
          note={drawerSummary.note}
          tone={drawerSummary.tone}
          loading={drawerLoading && selectedMethodTouchesDrawer}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                1. How is the customer paying?
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Use paid now when money is received today. Use pay later when the customer will owe a balance.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SaleModeButton
                active={saleType === "CASH"}
                tone="success"
                title="Paid now"
                text="Money is received today. Cash needs an open drawer. MoMo, Card, Bank, and Other do not."
                onClick={() => setSaleType("CASH")}
              />

              <SaleModeButton
                active={saleType === "CREDIT"}
                tone="warning"
                title="Pay later"
                text="Use when a saved customer will pay all or part of the balance later."
                onClick={() => setSaleType("CREDIT")}
              />
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-[var(--color-text)]">Payment method</h3>

              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Only physical cash affects the drawer. MoMo, Card, Bank, and Other payments do not touch cash drawer money.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <PaymentMethodCard
                    key={option.value}
                    option={option}
                    active={paymentMethod === option.value}
                    onClick={() => setPaymentMethod(option.value)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Payment note
                </span>
                <input
                  className={inputClass()}
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="Example: MoMo code or bank slip"
                />
              </label>

              {saleType === "CREDIT" ? (
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Deposit paid now
                  </span>
                  <input
                    inputMode="numeric"
                    className={inputClass()}
                    value={amountPaid}
                    onChange={(event) => setAmountPaid(normalizeDigits(event.target.value))}
                    placeholder="0"
                  />
                </label>
              ) : null}
            </div>

            {saleType === "CREDIT" ? (
              <div className="mt-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Pay-by date
                  </span>
                  <input
                    type="date"
                    className={inputClass()}
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {hasCashDrawerRisk ? (
              <div className="mt-4 rounded-[24px] bg-red-500/10 px-4 py-3 text-sm font-bold leading-6 text-red-600">
                Cash is being received, but the drawer is closed. Open the drawer before finishing this sale.
              </div>
            ) : null}

            {selectedMethodTouchesDrawer ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <AsyncButton loading={drawerRefreshBusy} onClick={() => loadDrawerStatus({ silent: false })} variant="secondary">
                  Check drawer
                </AsyncButton>

                {!drawerOpen ? (
                  <button type="button" onClick={() => navigate("/app/pos/drawer")} className={dangerButton()}>
                    Open drawer page
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] bg-[var(--color-surface-2)] px-4 py-3 text-sm font-bold leading-6 text-[var(--color-text-muted)]">
                This payment method does not use the cash drawer.
              </div>
            )}
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  2. Customer
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Walk-in is fine for paid-now sales. Pay-later sales need a known customer.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (saleType === "CREDIT") {
                      toast.error("Pay-later sales need a saved customer.");
                      return;
                    }

                    setCustomerMode("WALKIN");
                    resetCustomerSelection();
                  }}
                  className={customerMode === "WALKIN" ? primaryButton() : secondaryButton()}
                >
                  Walk-in
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("PICK");
                    resetCustomerForm();
                  }}
                  className={customerMode === "PICK" ? primaryButton() : secondaryButton()}
                >
                  Existing
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode("NEW");
                    resetCustomerSelection();
                  }}
                  className={customerMode === "NEW" ? primaryButton() : secondaryButton()}
                >
                  New
                </button>
              </div>
            </div>

            {customerMode === "WALKIN" ? (
              <div className={cx(softPanel(), "mt-5 p-4")}>
                <div className="text-sm font-black text-[var(--color-text)]">Walk-in customer selected</div>
                <div className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Best for quick paid-now sales when customer details do not need to be saved.
                </div>
              </div>
            ) : null}

            {customerMode === "PICK" ? (
              <div className="mt-5">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Find customer
                  </span>

                  <input
                    className={inputClass()}
                    placeholder="Search by name, phone, email, TIN, or ID..."
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                  />
                </label>

                <div className="mt-4">
                  {customersLoading ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {[1, 2, 3, 4].map((item) => (
                        <SkeletonBlock key={item} className="h-28 w-full" />
                      ))}
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <EmptyState title="No customer found" text="Try another name, phone, or email." />
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        {filteredCustomers.map((customer) => (
                          <CustomerCard
                            key={customer.id}
                            customer={customer}
                            active={selectedCustomerId === customer.id}
                            onClick={() => setSelectedCustomerId(customer.id)}
                          />
                        ))}
                      </div>

                      <p className="mt-3 text-xs font-bold text-[var(--color-text-muted)]">
                        Showing the best {PAGE_SIZE} matches. Search to find more.
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {customerMode === "NEW" ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Full name
                  </span>
                  <input
                    className={inputClass()}
                    value={customerForm.name}
                    onChange={(event) => setCustomerField("name", event.target.value)}
                    placeholder="Customer name"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Phone
                  </span>
                  <input
                    className={inputClass()}
                    value={customerForm.phone}
                    onChange={(event) => setCustomerField("phone", event.target.value)}
                    placeholder="Phone number"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Email
                  </span>
                  <input
                    className={inputClass()}
                    value={customerForm.email}
                    onChange={(event) => setCustomerField("email", event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Address
                  </span>
                  <input
                    className={inputClass()}
                    value={customerForm.address}
                    onChange={(event) => setCustomerField("address", event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    TIN number
                  </span>
                  <input
                    className={inputClass()}
                    value={customerForm.tinNumber}
                    onChange={(event) => setCustomerField("tinNumber", event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    ID number
                  </span>
                  <input
                    className={inputClass()}
                    value={customerForm.idNumber}
                    onChange={(event) => setCustomerField("idNumber", event.target.value)}
                    placeholder="Optional"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-[12px] font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Notes
                  </span>
                  <textarea
                    className={textareaClass()}
                    value={customerForm.notes}
                    onChange={(event) => setCustomerField("notes", event.target.value)}
                    placeholder="Optional customer notes"
                  />
                </label>
              </div>
            ) : null}
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  3. Add products
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Search and add products. The first 10 suggestions are shown first.
                </p>
              </div>

              <div className="w-full max-w-md">
                <input
                  className={inputClass()}
                  placeholder="Search by name, product code, or serial..."
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  onKeyDown={onProductKeyDown}
                />
              </div>
            </div>

            {!showQuickPicks && searching ? (
              <div className="mt-4">
                <InlineSpinner label="Searching products..." />
              </div>
            ) : null}

            {showQuickPicks ? (
              quickLoading ? (
                <div className="mt-5 grid gap-3">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <SkeletonBlock key={item} className="h-28 w-full" />
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-[var(--color-text)]">{quickTitle}</div>
                    <StatusBadge tone="success">Tap to add</StatusBadge>
                  </div>

                  {quickList.length === 0 ? (
                    <div className="mt-4">
                      <EmptyState
                        title="No suggestions yet"
                        text="Products will appear here after you create products or start selling."
                      />
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {quickList.map((product) => (
                        <ProductRow key={product.id} product={product} onAdd={addToCart} />
                      ))}
                    </div>
                  )}
                </div>
              )
            ) : productResults.length === 0 && !searching ? (
              <div className="mt-5">
                <EmptyState title="No products found" text="Try another product name, code, or serial." />
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {productResults.map((product) => (
                  <ProductRow key={product.id} product={product} onAdd={addToCart} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6 xl:sticky xl:top-[96px]")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                  4. Finish sale
                </h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                  Review products before saving.
                </p>
              </div>

              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-black text-[var(--color-text-muted)] transition hover:text-red-600 disabled:opacity-50"
                disabled={!cart.length}
              >
                Clear
              </button>
            </div>

            {!cart.length ? (
              <div className="mt-5">
                <EmptyState title="Cart is empty" text="Add products from the left side to start the sale." />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {cart.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    onDec={decreaseQty}
                    onInc={increaseQty}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-[var(--color-border)] pt-5">
              <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                      Products subtotal
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      Customer selling price
                    </div>
                  </div>

                  <div className="text-right text-base font-black text-[var(--color-text)]">
                    {formatMoney(taxPreview.subtotal)}
                  </div>
                </div>

                {taxPreview.showTaxLine ? (
                  <div className="mt-3 space-y-3 border-t border-[var(--color-border)] pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-[var(--color-text)]">
                          Subtotal before tax
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Tax is already included in prices
                        </div>
                      </div>

                      <div className="text-right text-sm font-black text-[var(--color-text)]">
                        {formatMoney(taxPreview.taxableSubtotal)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-[var(--color-text)]">
                          {taxPreview.taxName}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Shown as included tax
                        </div>
                      </div>

                      <div className="text-right text-sm font-black text-amber-600">
                        {formatMoney(taxPreview.taxAmount)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-[20px] bg-[var(--color-card)] px-4 py-3 text-xs font-bold leading-5 text-[var(--color-text-muted)]">
                    No customer-facing tax will be shown for this sale.
                  </div>
                )}

                <div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--color-border)] pt-4">
                  <div>
                    <div className="text-sm font-bold text-[var(--color-text-muted)]">Final total</div>
                    <div className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      {saleModeLabel} — {paymentMethod}
                    </div>
                  </div>

                  <div className="text-right text-[1.8rem] font-black tracking-[-0.04em] text-[var(--color-text)]">
                    {formatMoney(total)}
                  </div>
                </div>
              </div>

              {saleType === "CREDIT" ? (
                <div className="mt-3 rounded-[22px] bg-[var(--color-surface-2)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[var(--color-text)]">Deposit paid now</div>
                      <div className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                        Remaining balance after deposit
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-[var(--color-text)]">
                        {formatMoney(Number(amountPaid || 0))}
                      </div>
                      <div className="mt-1 text-xs font-black text-amber-600">
                        {formatMoney(Math.max(0, total - Number(amountPaid || 0)))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <AsyncButton
                loading={savingSale}
                onClick={completeSale}
                disabled={!cart.length || hasCashDrawerRisk}
                className={cx("mt-5 w-full", saleType === "CREDIT" ? warningButton() : primaryButton())}
              >
                {saleType === "CREDIT" ? "Finish pay-later sale" : "Finish sale"}
              </AsyncButton>

              {hasCashDrawerRisk ? (
                <button type="button" onClick={() => navigate("/app/pos/drawer")} className={cx(dangerButton(), "mt-3 w-full")}>
                  Open cash drawer
                </button>
              ) : null}

              <p className="mt-4 text-center text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                Stock will reduce from {activeBranchLabel} after the sale is completed.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
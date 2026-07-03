import "./Suppliers.css";
// frontend-stores/src/pages/suppliers/SupplierSupplyCreate.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import {
  createSupplierSupply,
  getSupplierById,
  listSupplierSupplies,
} from "../../services/suppliersApi";
import { searchProducts } from "../../services/inventoryApi";

const SOURCE_TYPES = [
  { value: "BOUGHT", label: "Bought stock" },
  { value: "GIFT", label: "Gifted stock" },
  { value: "TRADE_IN", label: "Trade-in" },
  { value: "CONSIGNMENT", label: "Consignment" },
  { value: "OTHER", label: "Other source" },
];

const EMPTY_ITEM = {
  productId: "",
  productName: "",
  productSearch: "",
  category: "",
  subcategory: "",
  subcategoryOther: "",
  brand: "",
  serial: "",
  quantity: "1",
  buyPrice: "",
  sellPrice: "",
  notes: "",
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
  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className
      )}
    >
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
  const n = Number(value);
  if (!Number.isFinite(n)) return "RWF 0";
  return `RWF ${Math.round(n).toLocaleString("en-US")}`;
}

function sourceLabel(value) {
  return SOURCE_TYPES.find((item) => item.value === value)?.label || "Other source";
}

function extractProductsResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function productNameOf(product) {
  return cleanString(product?.name || product?.productName || product?.title);
}

function productCategoryOf(product) {
  return cleanString(product?.category || product?.categoryName || product?.type);
}

function productBrandOf(product) {
  return cleanString(product?.brand || product?.maker || product?.manufacturer);
}

function productSellPriceOf(product) {
  return Number(
    product?.sellingPrice ??
      product?.sellPrice ??
      product?.price ??
      product?.retailPrice ??
      0
  );
}

function productBuyPriceOf(product) {
  return Number(
    product?.buyingPrice ??
      product?.buyPrice ??
      product?.costPrice ??
      product?.purchasePrice ??
      0
  );
}

function productStockOf(product) {
  return Number(
    product?.effectiveStockQty ??
      product?.branchStockQty ??
      product?.stockQty ??
      product?.qtyOnHand ??
      0
  );
}

function uniqueCleanValues(values = []) {
  return Array.from(new Set(values.map((value) => cleanString(value)).filter(Boolean)));
}

function getCurrentBranchName() {
  return (
    cleanString(localStorage.getItem("activeBranchName")) ||
    cleanString(localStorage.getItem("activeBranchCode")) ||
    cleanString(localStorage.getItem("tenantName")) ||
    "Current branch"
  );
}

function getCurrentLocationLabel() {
  return cleanString(localStorage.getItem("workspaceLocation"));
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h1
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.95rem]",
          strongText()
        )}
      >
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

function Field({ label, required = false, hint, children }) {
  return (
    <div className="min-w-0">
      <label className={cx("mb-1.5 block text-sm font-black", strongText())}>
        {label}
        {required ? <span className="text-[var(--color-danger)]"> *</span> : null}
      </label>

      {children}

      {hint ? (
        <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{hint}</div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
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
    <article className={cx(pageCard(), "relative min-h-[124px] overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 break-words text-lg font-black tracking-[-0.03em]", strongText())}>
          {value || "—"}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
        ) : null}
      </div>
    </article>
  );
}

function MiniStat({ label, value, note, tone = "neutral" }) {
  return (
    <div className={cx(softPanel(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
            {label}
          </div>
          <div className={cx("mt-2 break-words text-sm font-black leading-6", strongText())}>
            {value || "—"}
          </div>
        </div>

        {tone !== "neutral" ? (
          <Badge tone={tone}>{tone === "success" ? "OK" : "Check"}</Badge>
        ) : null}
      </div>

      {note ? (
        <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div>
      ) : null}
    </div>
  );
}

function ItemCard({
  item,
  index,
  canRemove,
  onChange,
  onRemove,
  productResults = [],
  productSearchBusy = false,
  onSearchProducts,
  onChooseProduct,
  onClearProduct,
}) {
  const quantity = toNumber(item.quantity, 0);
  const buyPrice = toNumber(item.buyPrice, 0);
  const sellPrice = toNumber(item.sellPrice, 0);
  const totalCost = quantity * buyPrice;
  const expectedSales = quantity * sellPrice;

  function setField(key, value) {
    onChange(index, { ...item, [key]: value });
  }

  return (
    <section className={cx(pageCard(), "overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">Item {index + 1}</Badge>
              {cleanString(item.serial) ? <Badge tone="success">Serial saved</Badge> : null}
            </div>

            <div className={cx("mt-3 text-lg font-black tracking-[-0.03em]", strongText())}>
              {cleanString(item.productName) || "New stock item"}
            </div>

            <div className={cx("mt-1 text-sm font-semibold leading-6", mutedText())}>
              Record item, quantity, buying cost, selling price, and proof details.
            </div>
          </div>

          {canRemove ? (
            <button type="button" onClick={() => onRemove(index)} className={dangerBtn()}>
              Remove item
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 min-[620px]:grid-cols-2">
          <div className="md:col-span-2">
              <Field
                label="Search existing item or create new"
                required
                hint="Storvex searches while you type to avoid duplicate stock records. If it is not found, keep typing the new item name."
              >
                <div className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className={inputClass()}
                    value={item.productSearch || item.productName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setField("productSearch", value);
                      setField("productName", value);
                      if (item.productId) setField("productId", "");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onSearchProducts?.(index, item.productSearch || item.productName);
                      }
                    }}
                    placeholder="Search item, material, part, product, brand, or code"
                    required
                  />

                  <button
                    type="button"
                    className={secondaryBtn()}
                    onClick={() => onSearchProducts?.(index, item.productSearch || item.productName)}
                    disabled={productSearchBusy}
                  >
                    {productSearchBusy ? "Searching..." : "Search"}
                  </button>
                </div>

                {item.productId ? (
                  <div className="mt-3 rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div className="text-xs font-black text-emerald-300">
                      Existing item selected
                    </div>
                    <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                      Storvex will add quantity to this item instead of creating a duplicate.
                    </div>
                    <button
                      type="button"
                      className={cx(secondaryBtn(), "mt-3")}
                      onClick={() => onClearProduct?.(index)}
                    >
                      Clear selected item
                    </button>
                  </div>
                ) : null}

                {!item.productId && productSearchBusy ? (
                  <div className={cx("mt-3 rounded-[18px] border border-[var(--color-border)] p-3 text-xs font-bold", mutedText())}>
                    Searching existing stock items...
                  </div>
                ) : null}

                {!item.productId &&
                !productSearchBusy &&
                cleanString(item.productSearch || item.productName).length >= 2 &&
                (!Array.isArray(productResults) || productResults.length === 0) ? (
                  <div className="mt-3 rounded-[18px] border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="text-xs font-black text-amber-300">
                      No existing item found
                    </div>
                    <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                      Continue typing and Storvex will create this as a new item when you save.
                    </div>
                  </div>
                ) : null}

                {!item.productId && Array.isArray(productResults) && productResults.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {productResults.slice(0, 6).map((product) => {
                      const name = productNameOf(product);
                      const stock = productStockOf(product);

                      return (
                        <button
                          key={product.id || name}
                          type="button"
                          className="rounded-[18px] border border-[var(--color-border)] bg-[#111318] p-3 text-left transition hover:border-[var(--color-primary)]"
                          onClick={() => onChooseProduct?.(index, product)}
                        >
                          <div className={cx("text-sm font-black", strongText())}>
                            {name || "Unnamed item"}
                          </div>
                          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                            {[productCategoryOf(product), productBrandOf(product), `Current stock: ${stock}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </Field>
            </div>

          <Field label="Category">
            <input
              className={inputClass()}
              value={item.category}
              onChange={(event) => setField("category", event.target.value)}
              placeholder="Example: Hardware, lighting, spare part, kitchen item..."
            />
          </Field>

          <Field label="Brand">
            <input
              className={inputClass()}
              value={item.brand}
              onChange={(event) => setField("brand", event.target.value)}
              placeholder="Example: Brand, maker, model, or supplier line..."
            />
          </Field>

          <Field label="Tracking code / serial / part number" hint="Useful for serial items, parts, models, warranty items, or high-value stock.">
            <input
              className={inputClass()}
              value={item.serial}
              onChange={(event) => setField("serial", event.target.value)}
              placeholder="Optional tracking code"
            />
          </Field>

          <Field label="Quantity" required>
            <input
              type="number"
              min="1"
              className={inputClass()}
              value={item.quantity}
              onChange={(event) => setField("quantity", event.target.value)}
              required
            />
          </Field>

          <Field label="Buying cost" required hint="Cost paid per item.">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass()}
              value={item.buyPrice}
              onChange={(event) => setField("buyPrice", event.target.value)}
              placeholder="0"
              required
            />
          </Field>

          <Field label="Selling price" required hint="Selling price per item.">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass()}
              value={item.sellPrice}
              onChange={(event) => setField("sellPrice", event.target.value)}
              placeholder="0"
              required
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Item notes">
              <textarea
                className={textareaClass()}
                value={item.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Condition, packaging, warranty, supplier promise, or receiving note..."
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          <MiniStat
            label="Quantity"
            value={quantity || "—"}
            note="Units being recorded"
            tone={quantity > 0 ? "success" : "warning"}
          />
          <MiniStat
            label="Total cost"
            value={formatMoney(totalCost)}
            note="Quantity × buying price"
            tone={totalCost > 0 ? "warning" : "neutral"}
          />
          <MiniStat
            label="Expected sales"
            value={formatMoney(expectedSales)}
            note="Quantity × selling price"
            tone={expectedSales > 0 ? "success" : "neutral"}
          />
        </div>
      </div>
    </section>
  );
}

function PreviewPanel({
  supplier,
  currentBranchName,
  currentLocationLabel,
  sourceType,
  documentRef,
  items,
  alsoUpdateStock,
}) {
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, toNumber(item.quantity, 0)), 0);
  const totalCost = items.reduce((sum, item) => {
    const qty = Math.max(0, toNumber(item.quantity, 0));
    const buy = Math.max(0, toNumber(item.buyPrice, 0));
    return sum + qty * buy;
  }, 0);

  const expectedSales = items.reduce((sum, item) => {
    const qty = Math.max(0, toNumber(item.quantity, 0));
    const sell = Math.max(0, toNumber(item.sellPrice, 0));
    return sum + qty * sell;
  }, 0);

  const missingNames = items.filter((item) => !cleanString(item.productName)).length;

  return (
    <aside className={cx(pageCard(), "h-fit p-5 sm:p-6")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={missingNames ? "warning" : "success"}>
          {missingNames ? "Needs review" : "Ready"}
        </Badge>
        <Badge tone="primary">{sourceLabel(sourceType)}</Badge>
      </div>

      <div className={cx("mt-5 text-lg font-black tracking-[-0.03em]", strongText())}>
        Restock snapshot
      </div>

      <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
        Review what will be added to the current selling location before saving.
      </p>

      <div className="mt-5 space-y-3">
        <MiniStat
          label="Supplier"
          value={supplier?.name || "Supplier"}
          note={supplier?.phone || supplier?.companyName || "Supplier profile"}
          tone="info"
        />

        <MiniStat
          label="Receiving location"
          value={currentBranchName}
          note={currentLocationLabel || "Stock will be recorded for the current location"}
          tone="success"
        />

        <MiniStat
          label="Document reference"
          value={cleanString(documentRef) || "Not added"}
          note="Invoice, receipt, or purchase note"
        />

        <MiniStat
          label="Stock update"
          value={alsoUpdateStock ? "Add to stock now" : "Record only"}
          note={
            alsoUpdateStock
              ? "Stock quantities will be updated immediately"
              : "Supply will be saved without changing stock"
          }
          tone={alsoUpdateStock ? "success" : "warning"}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1180px]:grid-cols-1">
        <SummaryCard label="Lines" value={totalItems} note="Different item lines in this restock" />
        <SummaryCard label="Units" value={totalQuantity} note="Total quantity received" tone="info" />
        <SummaryCard label="Total cost" value={formatMoney(totalCost)} note="Expected purchase cost" tone="warning" />
        <SummaryCard
          label="Expected sales"
          value={formatMoney(expectedSales)}
          note="Potential selling value"
          tone="success"
        />
      </div>
    </aside>
  );
}

export default function SupplierSupplyCreate() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [supplyHistory, setSupplyHistory] = useState([]);
  const [productResultsByIndex, setProductResultsByIndex] = useState({});
  const [productSearchBusyByIndex, setProductSearchBusyByIndex] = useState({});

  const [form, setForm] = useState({
    sourceType: "BOUGHT",
    sourceDetails: "",
    documentRef: "",
    notes: "",
    alsoUpdateStock: true,
    items: [{ ...EMPTY_ITEM }],
  });

  const currentBranchName = useMemo(() => getCurrentBranchName(), []);
  const currentLocationLabel = useMemo(() => getCurrentLocationLabel(), []);

  const previousDocumentRefs = useMemo(
    () => uniqueCleanValues(supplyHistory.map((supply) => supply?.documentRef)),
    [supplyHistory],
  );

  const totals = useMemo(() => {
    const items = Array.isArray(form.items) ? form.items : [];

    const totalQuantity = items.reduce(
      (sum, item) => sum + Math.max(0, toNumber(item.quantity, 0)),
      0
    );

    const totalCost = items.reduce((sum, item) => {
      const qty = Math.max(0, toNumber(item.quantity, 0));
      const buy = Math.max(0, toNumber(item.buyPrice, 0));
      return sum + qty * buy;
    }, 0);

    const expectedSales = items.reduce((sum, item) => {
      const qty = Math.max(0, toNumber(item.quantity, 0));
      const sell = Math.max(0, toNumber(item.sellPrice, 0));
      return sum + qty * sell;
    }, 0);

    return {
      itemLines: items.length,
      totalQuantity,
      totalCost,
      expectedSales,
    };
  }, [form.items]);

  useEffect(() => {
    let alive = true;

    async function loadSupplier() {
      setLoading(true);

      try {
        const [data, suppliesData] = await Promise.all([
            getSupplierById(String(id)),
            listSupplierSupplies(String(id)),
          ]);

          setSupplier(data?.supplier || data || null);
          setSupplyHistory(Array.isArray(suppliesData?.supplies) ? suppliesData.supplies : []);
      } catch (err) {
        console.error(err);

        if (!alive) return;

        setSupplier(null);
        toast.error(err?.response?.data?.message || err?.message || "Failed to load supplier");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadSupplier();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const timers = [];

    form.items.forEach((item, index) => {
      const query = cleanString(item.productSearch || item.productName);

      if (item.productId || query.length < 2) {
        setProductResultsByIndex((prev) => {
          if (!prev[index]?.length) return prev;
          return { ...prev, [index]: [] };
        });
        return;
      }

      const timer = window.setTimeout(() => {
        searchExistingProductsForItem(index, query, { silent: true });
      }, 450);

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [form.items]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, nextItem) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
    }));
  }

  async function searchExistingProductsForItem(index, query, options = {}) {
    const clean = cleanString(query);

    if (clean.length < 2) {
      toast.error("Type at least 2 letters to search existing items.");
      return;
    }

    try {
      setProductSearchBusyByIndex((prev) => ({ ...prev, [index]: true }));

      const data = await searchProducts({ q: clean, limit: 8 });
      const products = extractProductsResponse(data);

      setProductResultsByIndex((prev) => ({ ...prev, [index]: products }));

      if (!products.length && !options.silent) {
        toast("No existing item found. You can save it as a new item.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to search existing items");
    } finally {
      setProductSearchBusyByIndex((prev) => ({ ...prev, [index]: false }));
    }
  }

  function chooseExistingProduct(index, product) {
    const name = productNameOf(product);

    if (!name) {
      toast.error("This item has no usable name.");
      return;
    }

    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          productId: cleanString(product.id),
          productName: name,
          productSearch: name,
          category: productCategoryOf(product) || item.category,
          brand: productBrandOf(product) || item.brand,
          buyPrice: productBuyPriceOf(product) || item.buyPrice,
          sellPrice: productSellPriceOf(product) || item.sellPrice,
        };
      }),
    }));

    setProductResultsByIndex((prev) => ({ ...prev, [index]: [] }));
    toast.success("Existing item selected");
  }

  function clearSelectedProduct(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          productId: "",
          productSearch: item.productName,
        };
      }),
    }));
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        items: nextItems.length ? nextItems : [{ ...EMPTY_ITEM }],
      };
    });
  }

  function validatePayload(payload) {
    if (!payload.items.length) {
      toast.error("Add at least one item.");
      return false;
    }

    for (let index = 0; index < payload.items.length; index += 1) {
      const item = payload.items[index];
      const row = index + 1;

      if (!item.productName) {
        toast.error(`Item ${row}: product name is required.`);
        return false;
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        toast.error(`Item ${row}: quantity must be more than 0.`);
        return false;
      }

      if (!Number.isFinite(item.buyPrice) || item.buyPrice < 0) {
        toast.error(`Item ${row}: buying price must be 0 or more.`);
        return false;
      }

      if (!Number.isFinite(item.sellPrice) || item.sellPrice < 0) {
        toast.error(`Item ${row}: selling price must be 0 or more.`);
        return false;
      }
    }

    return true;
  }

  async function submit(event) {
    event.preventDefault();

    if (saving) return;

    const payload = {
      sourceType: form.sourceType,
      sourceDetails: cleanString(form.sourceDetails) || null,
      documentRef: cleanString(form.documentRef) || null,
      notes: cleanString(form.notes) || null,
      alsoUpdateStock: Boolean(form.alsoUpdateStock),
      items: form.items.map((item) => ({
        productId: cleanString(item.productId) || null,
        productName: cleanString(item.productName),
        category: cleanString(item.category) || null,
        subcategory: cleanString(item.subcategory) || null,
        subcategoryOther: cleanString(item.subcategoryOther) || null,
        brand: cleanString(item.brand) || null,
        serial: cleanString(item.serial) || null,
        quantity: Math.floor(toNumber(item.quantity, 0)),
        buyPrice: toNumber(item.buyPrice, NaN),
        sellPrice: toNumber(item.sellPrice, NaN),
        notes: cleanString(item.notes) || null,
      })),
    };

    if (!validatePayload(payload)) return;

    setSaving(true);

    try {
      await createSupplierSupply(String(id), payload);

      toast.success(
        payload.alsoUpdateStock
          ? "Supply saved and stock updated"
          : "Supply saved"
      );

      navigate(`/app/suppliers/${id}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to save supplier supply");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={4} variant="default" />;
  }

  if (!supplier) {
    return (
      <div className="svx-supplier-page">
        <div className="svx-supplier-shell">
        <section className={cx(pageCard(), "p-6 text-center")}>
          <div className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>
            Supplier not found
          </div>

          <p className={cx("mx-auto mt-2 max-w-md text-sm font-semibold leading-6", mutedText())}>
            This supplier could not be found, or you no longer have access to it.
          </p>

          <div className="mt-5">
            <button type="button" onClick={() => navigate("/app/suppliers")} className={secondaryBtn()}>
              Back to suppliers
            </button>
          </div>
        </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">Supplier restock</Badge>
                <Badge tone="success">{currentBranchName}</Badge>
                <Badge tone={form.alsoUpdateStock ? "success" : "warning"}>
                  {form.alsoUpdateStock ? "Stock will be updated" : "Record only"}
                </Badge>
              </div>

              <SectionHeading
                eyebrow="Suppliers"
                title="Record supplier restock"
                subtitle="Record items received from this supplier and choose whether quantities should be added to the current selling location now."
              />
            </div>

            <button
              type="button"
              onClick={() => navigate(`/app/suppliers/${id}`)}
              className={secondaryBtn()}
              disabled={saving}
            >
              Back to supplier
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 min-[560px]:grid-cols-2 min-[980px]:grid-cols-4">
          <SummaryCard
            label="Supplier"
            value={supplier.name || "Supplier"}
            note={supplier.phone || supplier.companyName || "Supplier profile"}
            tone="info"
          />
          <SummaryCard
            label="Receiving location"
            value={currentBranchName}
            note={currentLocationLabel || "Current selling location"}
            tone="success"
          />
          <SummaryCard
            label="Units"
            value={totals.totalQuantity}
            note={`${totals.itemLines} item line${totals.itemLines === 1 ? "" : "s"}`}
            tone="primary"
          />
          <SummaryCard
            label="Total cost"
            value={formatMoney(totals.totalCost)}
            note={`Expected sales: ${formatMoney(totals.expectedSales)}`}
            tone="warning"
          />
        </div>
      </section>

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className={cx(pageCard(), "overflow-hidden")}>
            <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
              <SectionHeading
                eyebrow="Supply details"
                title="Source and document proof"
                subtitle="Add invoice, receipt, or delivery reference so the stock origin stays clear."
              />
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className={cx(softPanel(), "p-5 sm:p-6")}>
                <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
                  <Field label="How this stock came in">
                    <select
                      className={inputClass()}
                      value={form.sourceType}
                      onChange={(event) => setField("sourceType", event.target.value)}
                    >
                      {SOURCE_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Invoice, receipt, or delivery reference" hint="Type a new reference or reuse a previous one from this supplier.">
                      <input
                        className={inputClass()}
                        value={form.documentRef}
                        onChange={(event) => setField("documentRef", event.target.value)}
                        placeholder="Example: INV-2026-001"
                        list="supplier-restock-document-reference-options"
                      />
                      <datalist id="supplier-restock-document-reference-options">
                        {previousDocumentRefs.map((ref) => (
                          <option key={ref} value={ref} />
                        ))}
                      </datalist>
                    </Field>

                  <div className="md:col-span-2">
                    <Field label="Source details">
                      <input
                        className={inputClass()}
                        value={form.sourceDetails}
                        onChange={(event) => setField("sourceDetails", event.target.value)}
                        placeholder="Example: received by manager, delivered by supplier, checked at branch..."
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <label className={cx(softPanel(), "flex cursor-pointer items-start gap-3 p-4")}>
                      <input
                        type="checkbox"
                        checked={Boolean(form.alsoUpdateStock)}
                        onChange={(event) => setField("alsoUpdateStock", event.target.checked)}
                        className="mt-1 h-4 w-4 rounded"
                      />

                      <div>
                        <div className={cx("text-sm font-black", strongText())}>
                          Add these quantities to stock now
                        </div>
                        <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                          Keep this enabled when the items have physically arrived at the current selling location.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Restock notes">
                      <textarea
                        className={textareaClass()}
                        value={form.notes}
                        onChange={(event) => setField("notes", event.target.value)}
                        placeholder="Supplier promise, payment note, warranty terms, or receiving note..."
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {form.items.map((item, index) => (
            <ItemCard
              key={index}
              item={item}
              index={index}
              canRemove={form.items.length > 1}
              onChange={setItem}
              onRemove={removeItem}
              productResults={productResultsByIndex[index] || []}
              productSearchBusy={Boolean(productSearchBusyByIndex[index])}
              onSearchProducts={searchExistingProductsForItem}
              onChooseProduct={chooseExistingProduct}
              onClearProduct={clearSelectedProduct}
            />
          ))}

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className={cx("text-sm font-black", strongText())}>Need to add another item?</div>
                <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                  Add another line when the supplier delivered more than one item.
                </div>
              </div>

              <button type="button" onClick={addItem} className={secondaryBtn()} disabled={saving}>
                Add another item
              </button>
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate(`/app/suppliers/${id}`)}
                className={secondaryBtn()}
                disabled={saving}
              >
                Cancel
              </button>

              <AsyncButton type="submit" loading={saving} loadingText="Saving..." className={primaryBtn()}>
                Save supplier restock
              </AsyncButton>
            </div>
          </section>
        </div>

        <PreviewPanel
          supplier={supplier}
          currentBranchName={currentBranchName}
          currentLocationLabel={currentLocationLabel}
          sourceType={form.sourceType}
          documentRef={form.documentRef}
          items={form.items}
          alsoUpdateStock={form.alsoUpdateStock}
        />
      </form>
    </div>
  );
}
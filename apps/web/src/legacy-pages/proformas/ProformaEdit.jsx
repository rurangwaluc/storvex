import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getProformaById, updateProforma } from "../../services/proformasApi";
import { searchProducts } from "../../services/inventoryApi";
import "./Proformas.css";

function makeEmptyItem() {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
    id: null,
    productId: "",
    productName: "",
    sku: "",
    category: "",
    stockQty: 0,
    description: "",
    quantity: 1,
    unitPrice: "",
    discountPercent: "",
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value, currency = "RWF") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function clampPercent(value) {
  const number = toNumber(value);
  if (number < 0) return 0;
  if (number > 100) return 100;
  return number;
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function productPrice(product) {
  return (
    product?.sellPrice ??
    product?.sellingPrice ??
    product?.listingPrice ??
    product?.price ??
    product?.unitPrice ??
    0
  );
}

function productStock(product) {
  return product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0;
}

function normalizeProforma(raw) {
  const doc = raw?.proforma || raw || {};
  const items = Array.isArray(doc?.items) ? doc.items : [];

  return {
    id: doc?.id || null,
    number: doc?.number || null,
    status: doc?.status || "DRAFT",
    customerName: doc?.customerName || "",
    customerPhone: doc?.customerPhone || "",
    customerEmail: doc?.customerEmail || "",
    customerAddress: doc?.customerAddress || "",
    currency: doc?.currency || "RWF",
    validUntil: doc?.validUntil || null,
    notes: doc?.notes || "",
    createdAt: doc?.createdAt || null,
    convertedToSaleId: doc?.convertedToSaleId || null,
    items: items.map((item, index) => ({
      key: item?.id || `row-${index}`,
      id: item?.id || null,
      productId: item?.productId || "",
      productName: item?.productName || item?.product?.name || "",
      sku: item?.product?.sku || item?.sku || "",
      category: item?.product?.category || item?.category || "",
      stockQty: productStock(item?.product || item),
      description: item?.serial || item?.description || "",
      quantity: Number(item?.quantity || 1),
      unitPrice: Number(item?.unitPrice || 0),
      discountPercent: Number(item?.discountPercent || 0),
    })),
  };
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="svx-proforma-summary-row">
      <span>{label}</span>
      <strong className={strong ? "is-strong" : ""}>{value || "—"}</strong>
    </div>
  );
}

function StatusCheck({ active, children }) {
  return (
    <div className={`svx-proforma-check ${active ? "is-active" : ""}`}>
      <span>{active ? "✓" : "•"}</span>
      <strong>{children}</strong>
    </div>
  );
}

function ProductResult({ product, onPick }) {
  return (
    <button type="button" onClick={onPick} className="svx-proforma-button">
      {product?.name || "Unnamed product"} · Stock {productStock(product)} ·{" "}
      {money(productPrice(product))}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="svx-proforma-page">
      <section className="svx-proforma-hero">
        <p className="svx-proforma-eyebrow">Loading</p>
        <h1>Loading proforma...</h1>
      </section>
    </div>
  );
}

export default function ProformaEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const debounceRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [documentData, setDocumentData] = useState(null);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    validUntil: "",
    notes: "",
  });

  const [items, setItems] = useState([makeEmptyItem()]);
  const [searchState, setSearchState] = useState({});

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);

        const raw = await getProformaById(id);
        const doc = normalizeProforma(raw);

        if (!mountedRef.current) return;

        setDocumentData(doc);
        setForm({
          customerName: doc.customerName || "",
          customerPhone: doc.customerPhone || "",
          customerEmail: doc.customerEmail || "",
          customerAddress: doc.customerAddress || "",
          validUntil: toInputDate(doc.validUntil),
          notes: doc.notes || "",
        });
        setItems(doc.items?.length ? doc.items : [makeEmptyItem()]);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to load proforma");
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    void load();
  }, [id]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index, key, value) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  }

  function addItem() {
    setItems((prev) => [...prev, makeEmptyItem()]);
  }

  function removeItem(index) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function setItemSearch(key, patch) {
    setSearchState((prev) => ({
      ...prev,
      [key]: {
        q: "",
        results: [],
        searching: false,
        ...(prev[key] || {}),
        ...patch,
      },
    }));
  }

  async function runSearch(itemKey, q) {
    try {
      setItemSearch(itemKey, { searching: true });

      const data = await searchProducts({
        q,
        limit: 20,
      });

      setItemSearch(itemKey, {
        searching: false,
        results: Array.isArray(data?.products) ? data.products : [],
      });
    } catch (error) {
      console.error(error);
      setItemSearch(itemKey, {
        searching: false,
        results: [],
      });
    }
  }

  function handleSearchChange(itemKey, value) {
    setItemSearch(itemKey, { q: value });

    const trimmed = value.trim();

    if (!trimmed) {
      setItemSearch(itemKey, { results: [], searching: false });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(itemKey, trimmed), 250);
  }

  function pickProduct(index, product) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId: product?.id || "",
              productName: product?.name || "",
              sku: product?.sku || "",
              category: product?.category || "",
              stockQty: productStock(product),
              unitPrice: productPrice(product),
            }
          : item
      )
    );

    const itemKey = items[index]?.key;
    if (itemKey) {
      setItemSearch(itemKey, { q: "", results: [], searching: false });
    }
  }

  const calculatedItems = useMemo(() => {
    return items.map((item) => {
      const quantity = Math.max(1, parseInt(item.quantity || 1, 10) || 1);
      const unitPrice = Math.max(0, toNumber(item.unitPrice));
      const discountPercent = clampPercent(item.discountPercent);

      const gross = quantity * unitPrice;
      const discount = gross * (discountPercent / 100);
      const total = Math.max(0, gross - discount);

      return {
        ...item,
        quantity,
        unitPrice,
        discountPercent,
        gross,
        discount,
        total,
      };
    });
  }, [items]);

  const validItems = useMemo(() => {
    return calculatedItems.filter((item) => cleanText(item.productName));
  }, [calculatedItems]);

  const subtotal = useMemo(
    () => validItems.reduce((sum, item) => sum + Number(item.gross || 0), 0),
    [validItems]
  );

  const discountTotal = useMemo(
    () => validItems.reduce((sum, item) => sum + Number(item.discount || 0), 0),
    [validItems]
  );

  const grandTotal = useMemo(
    () => validItems.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [validItems]
  );

  const readyToSave = Boolean(cleanText(form.customerName)) && validItems.length > 0;

  async function onSubmit(e) {
    e.preventDefault();

    if (!cleanText(form.customerName)) {
      toast.error("Customer name is required");
      return;
    }

    if (!validItems.length) {
      toast.error("Add at least one product");
      return;
    }

    try {
      setSaving(true);

      await updateProforma(id, {
        customerName: cleanText(form.customerName),
        customerPhone: cleanText(form.customerPhone) || undefined,
        customerEmail: cleanText(form.customerEmail) || undefined,
        customerAddress: cleanText(form.customerAddress) || undefined,
        validUntil: form.validUntil || null,
        notes: cleanText(form.notes) || undefined,
        currency: documentData?.currency || "RWF",
        items: validItems.map((item) => ({
          productId: item.productId || undefined,
          productName: cleanText(item.productName),
          serial: cleanText(item.description) || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      toast.success("Proforma updated");
      navigate(`/app/documents/proformas/${encodeURIComponent(id)}/preview`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to update proforma");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="svx-proforma-page">
      <section className="svx-proforma-hero">
        <div className="svx-proforma-hero-main">
          <div>
            <p className="svx-proforma-eyebrow">Document editing</p>
            <h1>Edit proforma</h1>
            <p>
              Update the quotation while keeping Storvex document rules intact. Numbering,
              staff identity, tax behavior, and final document governance stay system-controlled.
            </p>

            <div className="svx-proforma-badges">
              <span>{documentData?.number || "Auto numbered"}</span>
              <span>{documentData?.status || "DRAFT"}</span>
              <span>No payment recorded</span>
            </div>
          </div>

          <div className="svx-proforma-hero-actions">
            <Link to="/app/documents/proformas" className="svx-proforma-button">
              Proformas
            </Link>

            <Link
              to={`/app/documents/proformas/${encodeURIComponent(id)}/preview`}
              className="svx-proforma-button"
            >
              Preview
            </Link>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} className="svx-proforma-layout">
        <main className="svx-proforma-main">
          <section className="svx-proforma-panel">
            <div className="svx-proforma-section-head">
              <div>
                <p className="svx-proforma-eyebrow">Customer quotation</p>
                <h2>Customer details</h2>
                <span>Keep only customer details needed for the quotation.</span>
              </div>
            </div>

            <div className="svx-proforma-grid">
              <label className="svx-proforma-field svx-proforma-span-2">
                <span>Customer name</span>
                <input
                  value={form.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  placeholder="Customer or business name"
                  required
                />
              </label>

              <label className="svx-proforma-field">
                <span>Phone</span>
                <input
                  value={form.customerPhone}
                  onChange={(e) => updateField("customerPhone", e.target.value)}
                  placeholder="Customer phone"
                />
              </label>

              <label className="svx-proforma-field">
                <span>Email</span>
                <input
                  value={form.customerEmail}
                  onChange={(e) => updateField("customerEmail", e.target.value)}
                  placeholder="Customer email"
                  type="email"
                />
              </label>

              <label className="svx-proforma-field">
                <span>Address</span>
                <input
                  value={form.customerAddress}
                  onChange={(e) => updateField("customerAddress", e.target.value)}
                  placeholder="Customer address"
                />
              </label>

              <label className="svx-proforma-field">
                <span>Valid until</span>
                <input
                  value={form.validUntil}
                  onChange={(e) => updateField("validUntil", e.target.value)}
                  type="date"
                />
              </label>

              <label className="svx-proforma-field svx-proforma-span-2">
                <span>Terms and notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Quotation conditions, availability, delivery note, or special remarks..."
                  rows={5}
                />
              </label>
            </div>
          </section>

          <section className="svx-proforma-panel">
            <div className="svx-proforma-section-head is-row">
              <div>
                <p className="svx-proforma-eyebrow">Commercial lines</p>
                <h2>Quoted products</h2>
                <span>Search inventory inside each product card, then adjust quantity and discount.</span>
              </div>

              <button type="button" onClick={addItem} className="svx-proforma-button">
                Add product
              </button>
            </div>

            <div className="svx-proforma-items">
              {calculatedItems.map((item, index) => {
                const itemSearch = searchState[item.key] || {
                  q: "",
                  results: [],
                  searching: false,
                };

                return (
                  <article key={item.key} className="svx-proforma-item">
                    <div className="svx-proforma-item-head">
                      <div>
                        <strong>Product {index + 1}</strong>
                        <span>
                          {cleanText(item.productName)
                            ? `${item.sku || "No SKU"} · ${item.category || "No category"} · Stock ${
                                item.stockQty ?? 0
                              }`
                            : "Search product first"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="svx-proforma-button is-danger"
                        disabled={calculatedItems.length === 1}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="svx-proforma-field svx-proforma-span-2">
                      <span>Search inventory</span>
                      <input
                        value={itemSearch.q}
                        onChange={(e) => handleSearchChange(item.key, e.target.value)}
                        placeholder="Type product name, SKU, brand, model, or part number..."
                      />

                      {itemSearch.q.trim() ? (
                        <div className="svx-proforma-items" style={{ marginTop: 12 }}>
                          {itemSearch.searching ? (
                            <div className="svx-proforma-line-total">
                              <span>Status</span>
                              <strong>Searching...</strong>
                            </div>
                          ) : itemSearch.results.length === 0 ? (
                            <div className="svx-proforma-line-total">
                              <span>Status</span>
                              <strong>No products found</strong>
                            </div>
                          ) : (
                            itemSearch.results.map((product) => (
                              <ProductResult
                                key={product.id}
                                product={product}
                                onPick={() => pickProduct(index, product)}
                              />
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="svx-proforma-item-grid">
                      <label className="svx-proforma-field svx-proforma-span-2">
                        <span>Product</span>
                        <input
                          value={item.productName}
                          readOnly
                          placeholder="Select product from search above"
                        />
                      </label>

                      <label className="svx-proforma-field">
                        <span>Quantity</span>
                        <input
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          type="number"
                          min="1"
                        />
                      </label>

                      <label className="svx-proforma-field">
                        <span>Selling price</span>
                        <input value={money(item.unitPrice, documentData?.currency || "RWF")} readOnly />
                      </label>

                      <label className="svx-proforma-field">
                        <span>Discount %</span>
                        <input
                          value={item.discountPercent}
                          onChange={(e) => updateItem(index, "discountPercent", e.target.value)}
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                        />
                      </label>

                      <div className="svx-proforma-line-total">
                        <span>Line total</span>
                        <strong>{money(item.total, documentData?.currency || "RWF")}</strong>
                      </div>

                      <label className="svx-proforma-field svx-proforma-span-2">
                        <span>Product note</span>
                        <input
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Serial, model, condition, compatibility, or warranty note"
                        />
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="svx-proforma-side">
          <section className="svx-proforma-summary">
            <div>
              <p className="svx-proforma-eyebrow">Live quotation</p>
              <h2>Edit summary</h2>
              <span>Review what changed before saving the proforma.</span>
            </div>

            <div className="svx-proforma-checks">
              <StatusCheck active={Boolean(cleanText(form.customerName))}>Customer selected</StatusCheck>
              <StatusCheck active={Boolean(form.validUntil)}>Validity date set</StatusCheck>
              <StatusCheck active={validItems.length > 0}>At least one product</StatusCheck>
              <StatusCheck active={readyToSave}>Ready to save</StatusCheck>
            </div>

            <div className="svx-proforma-summary-list">
              <SummaryRow label="Document" value={documentData?.number || "—"} />
              <SummaryRow label="Customer" value={form.customerName} />
              <SummaryRow label="Valid until" value={form.validUntil} />
              <SummaryRow label="Products" value={String(validItems.length)} />
              <SummaryRow label="Subtotal" value={money(subtotal, documentData?.currency || "RWF")} />
              <SummaryRow label="Discount" value={money(discountTotal, documentData?.currency || "RWF")} />
              <SummaryRow label="Tax" value="From settings" />
              <SummaryRow
                label="Grand total"
                value={money(grandTotal, documentData?.currency || "RWF")}
                strong
              />
            </div>

            <div className="svx-proforma-summary-actions">
              <AsyncButton type="submit" loading={saving} loadingText="Saving..." variant="primary">
                Save proforma
              </AsyncButton>

              <Link
                to={`/app/documents/proformas/${encodeURIComponent(id)}/preview`}
                className="svx-proforma-button"
              >
                Cancel
              </Link>
            </div>

            <p className="svx-proforma-footnote">
              Editing does not record payment. It only updates the customer quotation.
            </p>
          </section>
        </aside>
      </form>
    </div>
  );
}
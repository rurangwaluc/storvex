import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { createProforma } from "../../services/proformasApi";
import { searchProducts } from "../../services/inventoryApi";
import "./Proformas.css";

function makeEmptyItem() {
  return {
    key: `new-${Math.random().toString(36).slice(2, 10)}`,
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

function makeItemFromPrefill(item) {
  const source = item && typeof item === "object" ? item : {};

  return {
    ...makeEmptyItem(),
    key: `prefill-${Math.random().toString(36).slice(2, 10)}`,
    productId: cleanText(source.productId),
    productName: cleanText(source.productName),
    sku: cleanText(source.sku),
    category: cleanText(source.category),
    stockQty: Number(source.stockQty || 0),
    description: cleanText(source.description),
    quantity: Math.max(1, parseInt(source.quantity || 1, 10) || 1),
    unitPrice: Number(source.unitPrice || 0),
    discountPercent: "",
  };
}

function readStoredWhatsAppPrefill() {
  try {
    const raw = sessionStorage.getItem("storvex:whatsapp-proforma-prefill");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearStoredWhatsAppPrefill() {
  try {
    sessionStorage.removeItem("storvex:whatsapp-proforma-prefill");
  } catch {
    // Session storage can be unavailable in private or restricted webviews.
  }
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
  return (
    product?.effectiveStockQty ??
    product?.branchStockQty ??
    product?.stockQty ??
    0
  );
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
      {product?.name || "Unnamed product"} · Stock {productStock(product)} · {money(productPrice(product))}
    </button>
  );
}

export default function ProformaCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const debounceRef = useRef(null);
  const whatsappPrefillRef = useRef(location.state?.proformaPrefill || readStoredWhatsAppPrefill());
  const whatsappPrefill = whatsappPrefillRef.current;

  const [form, setForm] = useState({
    customerId: cleanText(whatsappPrefill?.customerId),
    customerName: cleanText(whatsappPrefill?.customerName),
    customerPhone: cleanText(whatsappPrefill?.customerPhone),
    customerEmail: cleanText(whatsappPrefill?.customerEmail),
    customerAddress: cleanText(whatsappPrefill?.customerAddress),
    validUntil: "",
    notes: cleanText(whatsappPrefill?.notes),
    reference: cleanText(whatsappPrefill?.reference),
    source: cleanText(whatsappPrefill?.source),
    conversationId: cleanText(whatsappPrefill?.conversationId),
    draftSaleId: cleanText(whatsappPrefill?.draftSaleId),
  });

  const [items, setItems] = useState(() => {
    const prefillItems = Array.isArray(whatsappPrefill?.items)
      ? whatsappPrefill.items.map(makeItemFromPrefill).filter((item) => cleanText(item.productName))
      : [];

    return prefillItems.length ? prefillItems : [makeEmptyItem()];
  });
  const [saving, setSaving] = useState(false);

  const [searchState, setSearchState] = useState({});

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  const readyToCreate = Boolean(cleanText(form.customerName)) && validItems.length > 0;

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

      const payload = {
        customerId: cleanText(form.customerId) || undefined,
        customerName: cleanText(form.customerName),
        customerPhone: cleanText(form.customerPhone) || undefined,
        customerEmail: cleanText(form.customerEmail) || undefined,
        customerAddress: cleanText(form.customerAddress) || undefined,
        validUntil: form.validUntil || undefined,
        reference: cleanText(form.reference) || undefined,
        notes: cleanText(form.notes) || undefined,
        source: cleanText(form.source) || undefined,
        conversationId: cleanText(form.conversationId) || undefined,
        draftSaleId: cleanText(form.draftSaleId) || undefined,
        currency: "RWF",
        status: "DRAFT",
        items: validItems.map((item) => ({
          productId: item.productId || undefined,
          productName: cleanText(item.productName),
          serial: cleanText(item.description) || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const result = await createProforma(payload);
      const createdId = result?.proforma?.id;

      clearStoredWhatsAppPrefill();
      toast.success("Proforma created");

      if (createdId) {
        navigate(`/app/documents/proformas/${encodeURIComponent(createdId)}/preview`);
        return;
      }

      navigate("/app/documents/proformas");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to create proforma");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="svx-proforma-page">
      <section className="svx-proforma-hero">
        <div className="svx-proforma-hero-main">
          <div>
            <p className="svx-proforma-eyebrow">Document creation</p>
            <h1>New proforma</h1>
            <p>
              Create a professional customer quotation before issuing an invoice.
              Proforma number, tax behavior, staff identity, and document rules are controlled by Storvex.
            </p>

            <div className="svx-proforma-badges">
              <span>Quotation only</span>
              <span>No payment recorded</span>
              <span>Auto numbered</span>
            </div>
          </div>

          <div className="svx-proforma-hero-actions">
            <Link to="/app/documents/proformas" className="svx-proforma-button">
              Proformas
            </Link>
            <Link to="/app/documents" className="svx-proforma-button">
              Document center
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
                <span>Capture only what is needed to send and approve the quotation.</span>
              </div>
            </div>

            {form.source === "WHATSAPP" ? (
              <div className="svx-proforma-source-card">
                <strong>WhatsApp quotation</strong>
                <span>
                  Prefilled from customer conversation{form.draftSaleId ? " and active sale draft" : ""}.
                </span>
              </div>
            ) : null}

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
                <span>Search inventory inside each product card, then adjust quantity and allowed discount.</span>
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
                            ? `${item.sku || "No SKU"} · ${item.category || "No category"} · Stock ${item.stockQty ?? 0}`
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
                        <input value={money(item.unitPrice)} readOnly />
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
                        <strong>{money(item.total)}</strong>
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
              <h2>Quotation summary</h2>
              <span>Review what an owner needs before creating the proforma.</span>
            </div>

            <div className="svx-proforma-checks">
              <StatusCheck active={Boolean(cleanText(form.customerName))}>Customer selected</StatusCheck>
              <StatusCheck active={Boolean(form.validUntil)}>Validity date set</StatusCheck>
              <StatusCheck active={validItems.length > 0}>At least one product</StatusCheck>
              <StatusCheck active={readyToCreate}>Ready to create</StatusCheck>
            </div>

            <div className="svx-proforma-summary-list">
              <SummaryRow label="Customer" value={form.customerName} />
              {form.source === "WHATSAPP" ? <SummaryRow label="Source" value="WhatsApp" /> : null}
              <SummaryRow label="Valid until" value={form.validUntil} />
              <SummaryRow label="Products" value={String(validItems.length)} />
              <SummaryRow label="Subtotal" value={money(subtotal)} />
              <SummaryRow label="Discount" value={money(discountTotal)} />
              <SummaryRow label="Tax" value="From settings" />
              <SummaryRow label="Grand total" value={money(grandTotal)} strong />
            </div>

            <div className="svx-proforma-summary-actions">
              <AsyncButton type="submit" loading={saving} loadingText="Creating..." variant="primary">
                Create proforma
              </AsyncButton>

              <Link to="/app/documents/proformas" className="svx-proforma-button">
                Cancel
              </Link>
            </div>

            <p className="svx-proforma-footnote">
              This creates a quotation only. No receipt, payment, or balance is recorded.
            </p>
          </section>
        </aside>
      </form>
    </div>
  );
}
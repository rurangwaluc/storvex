import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Heart,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import MarketplaceRequestPanel from "./MarketplaceRequestPanel";


import {
  marketplaceComparisonCategory,
  marketplaceComparisonFields,
  marketplaceFieldValue,
} from "./marketplaceCategoryDefinitions";

function cleanString(value) {
  return String(value || "").trim();
}

function formatMoney(value, currency = "RWF") {
  const amount = Math.max(0, Number(value || 0));
  const code =
    cleanString(currency).toUpperCase() || "RWF";

  if (code === "RWF") {
    return `Rwf ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}

function productUrl(item) {
  return `/marketplace/${encodeURIComponent(
    item.seller.slug,
  )}/${encodeURIComponent(item.slug)}`;
}

function EmptyPanel({ icon: Icon, title, text }) {
  return (
    <div className="svx-marketplace-customer-empty">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function ProductIdentity({ item, onClose }) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const unavailable =
    item.seller.temporarilyClosed ||
    Number(item.availableQuantity || 0) <= 0;

  const imageUrl =
    item.image?.thumbnailUrl ||
    item.image?.url ||
    "";

  return (
    <div className="svx-marketplace-customer-product">
      <Link
        to={productUrl(item)}
        className="svx-marketplace-customer-product-image"
        onClick={onClose}
        aria-label={`View ${item.title}`}
      >
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt=""
            width={
              Number(
                item.image?.thumbnailWidth,
              ) || 480
            }
            height={
              Number(
                item.image?.thumbnailHeight,
              ) || 480
            }
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="svx-marketplace-product-placeholder">
            <Package
              size={30}
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <small>Image unavailable</small>
          </span>
        )}
      </Link>

      <div className="svx-marketplace-customer-product-copy">
        <div className="svx-marketplace-customer-product-store">
          <Store
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span>{item.seller.name}</span>
        </div>

        <Link
          to={productUrl(item)}
          className="svx-marketplace-customer-product-title"
          onClick={onClose}
        >
          {item.title}
        </Link>

        <span
          className={[
            "svx-marketplace-customer-product-status",
            unavailable
              ? "is-unavailable"
              : "is-available",
          ].join(" ")}
        >
          {item.seller.temporarilyClosed
            ? "Store temporarily closed"
            : unavailable
              ? "Currently unavailable"
              : `${Math.max(
                  0,
                  Number(item.availableQuantity || 0),
                )} available`}
        </span>

        <strong className="svx-marketplace-customer-product-price">
          {formatMoney(item.price, item.currency)}
        </strong>
      </div>
    </div>
  );
}

function CartPanel({
  store,
  onClose,
  notify,
}) {
  const [requestOpen, setRequestOpen] =
    useState(false);

  const validSellerGroups = new Set(
    store.cart
      .filter(
        (item) =>
          item?.seller?.slug &&
          item?.slug &&
          !item?.seller?.temporarilyClosed &&
          Number(item?.availableQuantity || 0) > 0 &&
          Number(item?.quantity || 0) > 0,
      )
      .map((item) => item.seller.slug),
  );

  const sellerCount = new Set(
    store.cart
      .map((item) => item?.seller?.slug)
      .filter(Boolean),
  ).size;

  if (requestOpen) {
    return (
      <MarketplaceRequestPanel
        cart={store.cart}
        onBack={() => setRequestOpen(false)}
        onClose={onClose}
        notify={notify}
      />
    );
  }

  return (
    <>
      <header className="svx-marketplace-customer-panel-head">
        <div>
          <span>Your cart</span>

          <h2>
            {store.cartCount
              ? `${store.cartCount} product${
                  store.cartCount === 1 ? "" : "s"
                }`
              : "Cart is empty"}
          </h2>

          {store.cart.length ? (
            <p>
              From {sellerCount}{" "}
              {sellerCount === 1 ? "store" : "stores"}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
        >
          <X size={21} strokeWidth={2} />
        </button>
      </header>

      <div className="svx-marketplace-customer-panel-body">
        {!store.cart.length ? (
          <EmptyPanel
            icon={ShoppingCart}
            title="Your cart is empty"
            text="Browse available products and add the ones you want to request."
          />
        ) : (
          <div className="svx-marketplace-cart-list">
            {store.cart.map((item) => {
              const maximum = Math.max(
                1,
                Number(item.availableQuantity || 1),
              );

              return (
                <article
                  key={item.key}
                  className="svx-marketplace-cart-row"
                >
                  <ProductIdentity
                    item={item}
                    onClose={onClose}
                  />

                  <div className="svx-marketplace-cart-controls">
                    <div>
                      <span>Quantity</span>

                      <div className="svx-marketplace-cart-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            store.updateCartQuantity(
                              item.key,
                              item.quantity - 1,
                            )
                          }
                          disabled={item.quantity <= 1}
                          aria-label={`Reduce ${item.title} quantity`}
                        >
                          <Minus
                            size={17}
                            strokeWidth={2}
                          />
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() =>
                            store.updateCartQuantity(
                              item.key,
                              item.quantity + 1,
                            )
                          }
                          disabled={
                            item.quantity >= maximum
                          }
                          aria-label={`Increase ${item.title} quantity`}
                        >
                          <Plus
                            size={17}
                            strokeWidth={2}
                          />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="svx-marketplace-remove-button"
                      onClick={() =>
                        store.removeFromCart(item.key)
                      }
                    >
                      <Trash2
                        size={17}
                        strokeWidth={2}
                      />
                      <span>Remove</span>
                    </button>
                  </div>

                  <footer className="svx-marketplace-cart-line-total">
                    <span>
                      {item.quantity} ×{" "}
                      {formatMoney(
                        item.price,
                        item.currency,
                      )}
                    </span>

                    <div>
                      <small>Product total</small>
                      <strong>
                        {formatMoney(
                          item.price * item.quantity,
                          item.currency,
                        )}
                      </strong>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {store.cart.length ? (
        <footer className="svx-marketplace-customer-panel-footer">
          <div className="svx-marketplace-request-summary">
            <div>
              <span>Products</span>
              <strong>{store.cartCount}</strong>
            </div>

            <div className="is-total">
              <span>Estimated total</span>
              <strong>
                {formatMoney(
                  store.cartSubtotal,
                  store.cart[0]?.currency,
                )}
              </strong>
            </div>
          </div>

          <div className="svx-marketplace-request-note">
            <Check
              size={18}
              strokeWidth={2}
              aria-hidden="true"
            />

            <p>
              Stock and price are confirmed by the store
              before your request becomes a sale.
            </p>
          </div>

          <button
            type="button"
            className="svx-marketplace-request-button"
            disabled={validSellerGroups.size === 0}
            onClick={() => setRequestOpen(true)}
          >
            Continue to request
            <ArrowRight
              size={18}
              strokeWidth={2}
            />
          </button>
        </footer>
      ) : null}
    </>
  );
}

function WishlistPanel({
  store,
  onClose,
  notify,
}) {
  return (
    <>
      <header className="svx-marketplace-customer-panel-head">
        <div>
          <span>Saved products</span>

          <h2>
            {store.wishlist.length
              ? `${store.wishlist.length} ${
                  store.wishlist.length === 1
                    ? "product"
                    : "products"
                } saved`
              : "No saved products"}
          </h2>

          {store.wishlist.length ? (
            <p>
              Products you kept for later.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close saved products"
        >
          <X size={19} />
        </button>
      </header>

      <div className="svx-marketplace-customer-panel-body">
        {!store.wishlist.length ? (
          <EmptyPanel
            icon={Heart}
            title="Save products for later"
            text="Use the heart button on a product to keep it here."
          />
        ) : (
          <div className="svx-marketplace-wishlist-list">
            {store.wishlist.map((item) => {
              const unavailable =
                item.seller.temporarilyClosed ||
                item.availableQuantity <= 0;

              const category =
                cleanString(
                  item.category ||
                    item.comparisonCategory,
                );

              return (
                <article
                  key={item.key}
                  className="svx-marketplace-wishlist-row"
                >
                  <Link
                    to={productUrl(item)}
                    className="svx-marketplace-wishlist-image"
                    onClick={onClose}
                    aria-label={`View ${item.title}`}
                  >
                    {item.image?.url ? (
                      <img
                        src={item.image.url}
                        alt={
                          item.image.altText ||
                          item.title
                        }
                      />
                    ) : (
                      <Heart
                        size={26}
                        aria-hidden="true"
                      />
                    )}
                  </Link>

                  <div className="svx-marketplace-wishlist-copy">
                    <div className="svx-marketplace-wishlist-store">
                      <Store size={13} />
                      <span>{item.seller.name}</span>
                    </div>

                    <Link
                      to={productUrl(item)}
                      className="svx-marketplace-wishlist-title"
                      onClick={onClose}
                    >
                      {item.title}
                    </Link>

                    {category ? (
                      <span className="svx-marketplace-wishlist-category">
                        {category}
                      </span>
                    ) : null}

                    <strong className="svx-marketplace-wishlist-price">
                      {formatMoney(
                        item.price,
                        item.currency,
                      )}
                    </strong>

                    <span
                      className={[
                        "svx-marketplace-wishlist-availability",
                        unavailable
                          ? "is-unavailable"
                          : "is-available",
                      ].join(" ")}
                    >
                      {item.seller.temporarilyClosed
                        ? "Store temporarily closed"
                        : item.availableQuantity <= 0
                          ? "Currently unavailable"
                          : "Available"}
                    </span>
                  </div>

                  <div className="svx-marketplace-wishlist-actions">
                    <Link
                      to={productUrl(item)}
                      className="svx-marketplace-wishlist-view"
                      onClick={onClose}
                    >
                      View product
                      <ArrowRight size={16} />
                    </Link>

                    <button
                      type="button"
                      className="svx-marketplace-wishlist-cart"
                      disabled={unavailable}
                      onClick={() => {
                        const result =
                          store.addToCart(item);

                        if (result.ok) {
                          notify(
                            `${item.title} added to cart`,
                          );
                        }
                      }}
                    >
                      <ShoppingCart size={16} />
                      Add to cart
                    </button>

                    <button
                      type="button"
                      className="svx-marketplace-wishlist-remove"
                      onClick={() =>
                        store.removeFromWishlist(
                          item.key,
                        )
                      }
                      aria-label={`Remove ${item.title} from saved products`}
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function ComparePanel({
  store,
  onClose,
  notify,
}) {
  const products = store.compare;

  const comparisonFields =
    marketplaceComparisonFields(products);

  const canRank = products.length > 1;

  const lowestPrice = canRank
    ? Math.min(
        ...products.map((item) =>
          Math.max(0, Number(item.price || 0)),
        ),
      )
    : null;

  const highestStock = canRank
    ? Math.max(
        ...products.map((item) =>
          Math.max(
            0,
            Number(item.availableQuantity || 0),
          ),
        ),
      )
    : null;

  const comparisonCategory =
    products.length
      ? marketplaceComparisonCategory(products[0])
      : "";

  function productUrl(item) {
    return `/marketplace/${encodeURIComponent(
      item.seller.slug,
    )}/${encodeURIComponent(item.slug)}`;
  }

  function addToCart(item) {
    const result = store.addToCart(item);

    if (!result.ok) {
      notify(
        result.reason === "STORE_CLOSED"
          ? "This store is temporarily closed."
          : "This product is not available.",
        "error",
      );
      return;
    }

    notify(`${item.title} added to cart`);
  }

  function renderValueRow({
    key,
    label,
    value,
    best,
    bestLabel,
  }) {
    return (
      <div
        key={key}
        className="svx-marketplace-compare-table-row"
      >
        <div className="svx-marketplace-compare-table-label">
          {label}
        </div>

        {products.map((item) => {
          const finalValue =
            typeof value === "function"
              ? value(item)
              : value;

          const isBest =
            canRank &&
            typeof best === "function" &&
            best(item);

          return (
            <div
              key={`${key}-${item.key}`}
              className={[
                "svx-marketplace-compare-table-value",
                isBest ? "is-best" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>{finalValue}</span>

              {isBest && bestLabel ? (
                <small>{bestLabel}</small>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <header className="svx-marketplace-customer-panel-head">
        <div>
          <span>Product comparison</span>

          <h2>
            {products.length
              ? `${products.length} of 4 selected`
              : "Nothing selected"}
          </h2>

          {comparisonCategory ? (
            <p className="svx-marketplace-compare-category">
              Compare products from the same category
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close comparison"
        >
          <X size={19} />
        </button>
      </header>

      <div className="svx-marketplace-customer-panel-body">
        {!products.length ? (
          <EmptyPanel
            icon={GitCompareArrows}
            title="Compare similar products"
            text="Choose products from the same category to compare price, stock, delivery, and specifications."
          />
        ) : (
          <div className="svx-marketplace-compare-workspace">
            {products.length === 1 ? (
              <div className="svx-marketplace-compare-guidance">
                <GitCompareArrows size={20} />

                <div>
                  <strong>
                    Add another product to compare
                  </strong>

                  <p>
                    Choose another product from the same
                    category to compare price, stock,
                    delivery, and important details.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="svx-marketplace-compare-mobile">
              {products.map((item, index) => {
                const unavailable =
                  item.seller.temporarilyClosed ||
                  Number(item.availableQuantity || 0) <= 0;

                const isLowestPrice =
                  canRank &&
                  Number(item.price) === lowestPrice;

                const isHighestStock =
                  canRank &&
                  Number(item.availableQuantity || 0) ===
                    highestStock;

                return (
                  <article
                    key={`mobile-${item.key}`}
                    className="svx-marketplace-compare-mobile-card"
                  >
                    <div className="svx-marketplace-compare-mobile-position">
                      <span>Product {index + 1}</span>

                      <button
                        type="button"
                        onClick={() =>
                          store.removeFromCompare(item.key)
                        }
                        aria-label={`Remove ${item.title} from comparison`}
                      >
                        <X size={17} strokeWidth={2} />
                        Remove
                      </button>
                    </div>

                    <div className="svx-marketplace-compare-mobile-product">
                      <Link
                        to={productUrl(item)}
                        className="svx-marketplace-compare-mobile-image"
                        onClick={onClose}
                        aria-label={`View ${item.title}`}
                      >
                        {item.image?.url ? (
                          <img
                            src={
                              item.image.thumbnailUrl ||
                              item.image.url
                            }
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span>
                            <Package
                              size={28}
                              strokeWidth={1.7}
                              aria-hidden="true"
                            />
                            <small>Image unavailable</small>
                          </span>
                        )}
                      </Link>

                      <div className="svx-marketplace-compare-mobile-copy">
                        <p>
                          <Store
                            size={14}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                          <span>{item.seller.name}</span>
                        </p>

                        <Link
                          to={productUrl(item)}
                          onClick={onClose}
                        >
                          {item.title}
                        </Link>

                        <strong>
                          {formatMoney(
                            item.price,
                            item.currency,
                          )}
                        </strong>

                        {item.onSale ? (
                          <del>
                            {formatMoney(
                              item.regularPrice,
                              item.currency,
                            )}
                          </del>
                        ) : null}
                      </div>
                    </div>

                    <div className="svx-marketplace-compare-mobile-summary">
                      <div
                        className={
                          isLowestPrice ? "is-best" : ""
                        }
                      >
                        <span>Current price</span>

                        <strong>
                          {formatMoney(
                            item.price,
                            item.currency,
                          )}
                        </strong>

                        {isLowestPrice ? (
                          <small>Lowest price</small>
                        ) : null}
                      </div>

                      <div
                        className={
                          isHighestStock ? "is-best" : ""
                        }
                      >
                        <span>Available stock</span>

                        <strong>
                          {Math.max(
                            0,
                            Number(
                              item.availableQuantity || 0,
                            ),
                          )}{" "}
                          available
                        </strong>

                        {isHighestStock ? (
                          <small>Highest stock</small>
                        ) : null}
                      </div>

                      <div>
                        <span>Pickup</span>

                        <strong>
                          {item.pickupEnabled
                            ? "Available"
                            : "Not available"}
                        </strong>
                      </div>

                      <div>
                        <span>Delivery</span>

                        <strong>
                          {item.deliveryEnabled
                            ? "Available"
                            : "Not available"}
                        </strong>
                      </div>
                    </div>

                    {comparisonFields.length ? (
                      <dl className="svx-marketplace-compare-mobile-details">
                        {comparisonFields.map((field) => (
                          <div key={field.key}>
                            <dt>{field.label}</dt>

                            <dd>
                              {marketplaceFieldValue(
                                item,
                                field,
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    <div className="svx-marketplace-compare-mobile-actions">
                      <Link
                        to={productUrl(item)}
                        onClick={onClose}
                      >
                        View product
                        <ArrowRight
                          size={17}
                          strokeWidth={2}
                        />
                      </Link>

                      <button
                        type="button"
                        disabled={unavailable}
                        onClick={() => addToCart(item)}
                      >
                        <ShoppingCart
                          size={17}
                          strokeWidth={2}
                        />
                        {unavailable
                          ? "Unavailable"
                          : "Add to cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="svx-marketplace-compare-table-scroll">
              <div
                className="svx-marketplace-compare-table"
                style={{
                  "--compare-columns": products.length,
                }}
              >
                <div className="svx-marketplace-compare-products-row">
                  <div className="svx-marketplace-compare-table-label is-product-label">
                    Product
                  </div>

                  {products.map((item) => (
                    <article
                      key={item.key}
                      className="svx-marketplace-compare-product"
                    >
                      <button
                        type="button"
                        className="svx-marketplace-compare-remove"
                        onClick={() =>
                          store.removeFromCompare(item.key)
                        }
                        aria-label={`Remove ${item.title} from comparison`}
                      >
                        <X size={15} />
                      </button>

                      <Link
                        to={productUrl(item)}
                        className="svx-marketplace-compare-product-image"
                        aria-label={`View ${item.title}`}
                      >
                        {item.image?.url ? (
                          <img
                            src={item.image.url}
                            alt={
                              item.image.altText ||
                              item.title
                            }
                          />
                        ) : null}
                      </Link>

                      <div className="svx-marketplace-compare-product-copy">
                        <p>
                          <Store size={13} />
                          <span>{item.seller.name}</span>
                        </p>

                        <Link to={productUrl(item)}>
                          {item.title}
                        </Link>

                        <strong>
                          {formatMoney(
                            item.price,
                            item.currency,
                          )}
                        </strong>

                        {item.onSale ? (
                          <del>
                            {formatMoney(
                              item.regularPrice,
                              item.currency,
                            )}
                          </del>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className="svx-marketplace-compare-cart-button"
                        disabled={
                          item.seller.temporarilyClosed ||
                          item.availableQuantity <= 0
                        }
                        onClick={() => addToCart(item)}
                      >
                        <ShoppingCart size={16} />
                        Add to cart
                      </button>
                    </article>
                  ))}
                </div>

                <div className="svx-marketplace-compare-section-heading">
                  <span>Buying decision</span>
                </div>

                {renderValueRow({
                  key: "current-price",
                  label: "Current price",
                  value: (item) =>
                    formatMoney(
                      item.price,
                      item.currency,
                    ),
                  best: (item) =>
                    Number(item.price) === lowestPrice,
                  bestLabel: "Lowest",
                })}

                {products.some((item) => item.onSale)
                  ? renderValueRow({
                      key: "normal-price",
                      label: "Normal price",
                      value: (item) =>
                        item.onSale
                          ? formatMoney(
                              item.regularPrice,
                              item.currency,
                            )
                          : "—",
                    })
                  : null}

                {renderValueRow({
                  key: "stock",
                  label: "Available stock",
                  value: (item) =>
                    `${item.availableQuantity} available`,
                  best: (item) =>
                    Number(item.availableQuantity) ===
                    highestStock,
                  bestLabel: "Highest",
                })}

                {renderValueRow({
                  key: "pickup",
                  label: "Pickup",
                  value: (item) =>
                    item.pickupEnabled ? (
                      <span className="svx-marketplace-compare-yes">
                        <Check size={15} />
                        Available
                      </span>
                    ) : (
                      "Not available"
                    ),
                })}

                {renderValueRow({
                  key: "delivery",
                  label: "Delivery",
                  value: (item) =>
                    item.deliveryEnabled ? (
                      <span className="svx-marketplace-compare-yes">
                        <Check size={15} />
                        Available
                      </span>
                    ) : (
                      "Not available"
                    ),
                })}

                {renderValueRow({
                  key: "store",
                  label: "Store",
                  value: (item) => item.seller.name,
                })}

                {comparisonFields.length ? (
                  <>
                    <div className="svx-marketplace-compare-section-heading">
                      <span>Product details</span>
                    </div>

                    {comparisonFields.map((field) =>
                      renderValueRow({
                        key: field.key,
                        label: field.label,
                        value: (item) =>
                          marketplaceFieldValue(
                            item,
                            field,
                          ),
                      }),
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function MarketplaceCustomerPanel({
  open,
  mode,
  store,
  onClose,
  onModeChange,
  notify,
}) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setRendered(true);
      setVisible(false);

      /*
       * Allow the closed position to be painted before
       * applying the visible state. Two animation frames
       * prevent mobile browsers from skipping the entrance.
       */
      let secondFrame = null;

      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(firstFrame);

        if (secondFrame !== null) {
          window.cancelAnimationFrame(secondFrame);
        }
      };
    }

    setVisible(false);

    closeTimerRef.current = window.setTimeout(() => {
      setRendered(false);
      closeTimerRef.current = null;
    }, 760);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!rendered) return undefined;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousOverscroll =
      body.style.overscrollBehavior;

    body.classList.add(
      "svx-marketplace-customer-open",
    );
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      body.classList.remove(
        "svx-marketplace-customer-open",
      );
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior =
        previousOverscroll;
    };
  }, [rendered]);

  useEffect(() => {
    if (!visible) return undefined;

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );

    firstFocusable?.focus?.({
      preventScroll: true,
    });

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      );

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [visible, onClose]);

  if (!rendered) return null;

  const activeItems =
    mode === "wishlist"
      ? store.wishlist
      : mode === "compare"
        ? store.compare
        : store.cart;

  const empty = activeItems.length === 0;

  return (
    <div
      className={[
        "svx-marketplace-customer-layer",
        visible ? "is-visible" : "is-closing",
        empty ? "is-empty" : "has-items",
        `mode-${mode}`,
      ].join(" ")}
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="svx-marketplace-customer-backdrop"
        onClick={onClose}
        aria-label="Close customer panel"
        tabIndex={visible ? 0 : -1}
      />

      <aside
        ref={panelRef}
        className="svx-marketplace-customer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={
          mode === "wishlist"
            ? "Saved products"
            : mode === "compare"
              ? "Product comparison"
              : "Shopping cart"
        }
      >
        <div
          className="svx-marketplace-customer-drag-handle"
          aria-hidden="true"
        >
          <span />
        </div>

        <nav className="svx-marketplace-customer-tabs">
          <button
            type="button"
            className={mode === "cart" ? "is-active" : ""}
            onClick={() => onModeChange("cart")}
          >
            <ShoppingCart size={15} />
            Cart
            {store.cartCount ? (
              <b>{store.cartCount}</b>
            ) : null}
          </button>

          <button
            type="button"
            className={
              mode === "wishlist" ? "is-active" : ""
            }
            onClick={() => onModeChange("wishlist")}
          >
            <Heart size={15} />
            Wishlist
            {store.wishlist.length ? (
              <b>{store.wishlist.length}</b>
            ) : null}
          </button>

          <button
            type="button"
            className={
              mode === "compare" ? "is-active" : ""
            }
            onClick={() => onModeChange("compare")}
          >
            <GitCompareArrows size={15} />
            Compare
            {store.compare.length ? (
              <b>{store.compare.length}</b>
            ) : null}
          </button>
        </nav>

        {mode === "wishlist" ? (
          <WishlistPanel
            store={store}
            onClose={onClose}
            notify={notify}
          />
        ) : mode === "compare" ? (
          <ComparePanel
            store={store}
            onClose={onClose}
            notify={notify}
          />
        ) : (
          <CartPanel
            store={store}
            onClose={onClose}
            notify={notify}
          />
        )}
      </aside>
    </div>
  );
}

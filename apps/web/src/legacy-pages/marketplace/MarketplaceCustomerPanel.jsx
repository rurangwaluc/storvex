import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

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

function ProductIdentity({ item }) {
  return (
    <div className="svx-marketplace-customer-product">
      <Link
        to={productUrl(item)}
        className="svx-marketplace-customer-product-image"
      >
        {item.image?.url ? (
          <img
            src={item.image.url}
            alt={item.image.altText || item.title}
          />
        ) : null}
      </Link>

      <div>
        <span>
          <Store size={12} />
          {item.seller.name}
        </span>

        <Link to={productUrl(item)}>
          <strong>{item.title}</strong>
        </Link>

        <b>
          {formatMoney(item.price, item.currency)}
        </b>
      </div>
    </div>
  );
}

function CartPanel({
  store,
  onClose,
  onOpenMode,
}) {
  return (
    <>
      <header className="svx-marketplace-customer-panel-head">
        <div>
          <span>Your cart</span>
          <h2>
            {store.cartCount
              ? `${store.cartCount} item${
                  store.cartCount === 1 ? "" : "s"
                }`
              : "Cart is empty"}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close cart"
        >
          <X size={19} />
        </button>
      </header>

      <div className="svx-marketplace-customer-panel-body">
        {!store.cart.length ? (
          <EmptyPanel
            icon={ShoppingCart}
            title="Your cart is ready"
            text="Add available products, then review quantities before sending a request."
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
                  <ProductIdentity item={item} />

                  <div className="svx-marketplace-cart-row-actions">
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
                        <Minus size={14} />
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
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="svx-marketplace-remove-button"
                      onClick={() =>
                        store.removeFromCart(item.key)
                      }
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <footer>
                    <span>
                      {item.quantity} ×{" "}
                      {formatMoney(
                        item.price,
                        item.currency,
                      )}
                    </span>

                    <strong>
                      {formatMoney(
                        item.price * item.quantity,
                        item.currency,
                      )}
                    </strong>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {store.cart.length ? (
        <footer className="svx-marketplace-customer-panel-footer">
          <div>
            <span>Estimated subtotal</span>
            <strong>
              {formatMoney(
                store.cartSubtotal,
                store.cart[0]?.currency,
              )}
            </strong>
          </div>

          <p>
            Stock and price will be checked again before
            the request is sent.
          </p>

          <button
            type="button"
            className="svx-marketplace-request-button"
            disabled
          >
            <ShoppingCart size={16} />
            Continue to request
          </button>

          <small>
            Order requests are the next backend step. No
            internal sale is created from this cart.
          </small>

          <div className="svx-marketplace-panel-secondary-actions">
            <button
              type="button"
              onClick={() => onOpenMode("wishlist")}
            >
              <Heart size={15} />
              Wishlist
            </button>

            <button
              type="button"
              onClick={() => onOpenMode("compare")}
            >
              <GitCompareArrows size={15} />
              Compare
            </button>
          </div>
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
              ? `${store.wishlist.length} saved`
              : "Wishlist is empty"}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close wishlist"
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
            {store.wishlist.map((item) => (
              <article
                key={item.key}
                className="svx-marketplace-wishlist-row"
              >
                <ProductIdentity item={item} />

                <div>
                  <button
                    type="button"
                    className="svx-marketplace-wishlist-cart"
                    disabled={
                      item.seller.temporarilyClosed ||
                      item.availableQuantity <= 0
                    }
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
                    <ShoppingCart size={15} />
                    Add to cart
                  </button>

                  <button
                    type="button"
                    className="svx-marketplace-remove-button"
                    onClick={() =>
                      store.removeFromWishlist(item.key)
                    }
                    aria-label={`Remove ${item.title} from wishlist`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
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
  const comparisonFields =
    marketplaceComparisonFields(store.compare);

  const lowestPrice = store.compare.length
    ? Math.min(
        ...store.compare.map((item) =>
          Math.max(0, Number(item.price || 0)),
        ),
      )
    : null;

  const highestStock = store.compare.length
    ? Math.max(
        ...store.compare.map((item) =>
          Math.max(
            0,
            Number(item.availableQuantity || 0),
          ),
        ),
      )
    : null;

  const comparisonCategory =
    store.compare.length
      ? marketplaceComparisonCategory(
          store.compare[0],
        )
      : "";

  return (
    <>
      <header className="svx-marketplace-customer-panel-head">
        <div>
          <span>Product comparison</span>
          <h2>
            {store.compare.length
              ? `${store.compare.length} product${
                  store.compare.length === 1 ? "" : "s"
                }`
              : "Nothing selected"}
          </h2>

          {comparisonCategory ? (
            <p className="svx-marketplace-compare-category">
              Comparing products in the same category
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
        {!store.compare.length ? (
          <EmptyPanel
            icon={GitCompareArrows}
            title="Compare similar products"
            text="Choose products from the same category to see their differences here."
          />
        ) : (
          <div className="svx-marketplace-compare-scroll">
            <div
              className="svx-marketplace-compare-grid"
              style={{
                "--compare-columns":
                  store.compare.length,
              }}
            >
              {store.compare.map((item) => (
                <article
                  key={item.key}
                  className="svx-marketplace-compare-card"
                >
                  <button
                    type="button"
                    className="svx-marketplace-compare-remove"
                    onClick={() =>
                      store.removeFromCompare(item.key)
                    }
                    aria-label={`Remove ${item.title} from comparison`}
                  >
                    <X size={14} />
                  </button>

                  <ProductIdentity item={item} />

                  <div className="svx-marketplace-compare-section">
                    <h4>Buying decision</h4>

                    <dl>
                      <div
                        className={
                          Number(item.price) ===
                          lowestPrice
                            ? "is-best"
                            : ""
                        }
                      >
                        <dt>Current price</dt>
                        <dd>
                          {formatMoney(
                            item.price,
                            item.currency,
                          )}

                          {Number(item.price) ===
                          lowestPrice ? (
                            <small>Lowest</small>
                          ) : null}
                        </dd>
                      </div>

                      {item.onSale ? (
                        <div>
                          <dt>Normal price</dt>
                          <dd>
                            {formatMoney(
                              item.regularPrice,
                              item.currency,
                            )}
                          </dd>
                        </div>
                      ) : null}

                      <div
                        className={
                          Number(
                            item.availableQuantity,
                          ) === highestStock
                            ? "is-best"
                            : ""
                        }
                      >
                        <dt>Available stock</dt>
                        <dd>
                          {item.availableQuantity}

                          {Number(
                            item.availableQuantity,
                          ) === highestStock ? (
                            <small>Highest</small>
                          ) : null}
                        </dd>
                      </div>

                      <div>
                        <dt>Pickup</dt>
                        <dd>
                          {item.pickupEnabled ? (
                            <Check size={14} />
                          ) : (
                            "No"
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Delivery</dt>
                        <dd>
                          {item.deliveryEnabled ? (
                            <Check size={14} />
                          ) : (
                            "No"
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>Store</dt>
                        <dd>{item.seller.name}</dd>
                      </div>
                    </dl>
                  </div>

                  {comparisonFields.length ? (
                    <div className="svx-marketplace-compare-section">
                      <h4>Product details</h4>

                      <dl>
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
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="svx-marketplace-wishlist-cart"
                    disabled={
                      item.seller.temporarilyClosed ||
                      item.availableQuantity <= 0
                    }
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
                    <ShoppingCart size={15} />
                    Add to cart
                  </button>
                </article>
              ))}
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
            ? "Wishlist"
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
            onOpenMode={onModeChange}
          />
        )}
      </aside>
    </div>
  );
}

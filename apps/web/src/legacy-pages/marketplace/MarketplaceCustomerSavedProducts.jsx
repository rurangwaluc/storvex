import {
  ArrowRight,
  GitCompareArrows,
  Heart,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  formatMoney,
} from "./MarketplaceHome";
import {
  useMarketplaceCustomerStore,
} from "./marketplaceCustomerStore";

function cleanString(value) {
  return String(value || "").trim();
}

function productUrl(item) {
  return `/marketplace/${encodeURIComponent(
    item.seller.slug,
  )}/${encodeURIComponent(item.slug)}`;
}

function categoryLabel(item) {
  const source = cleanString(
    item.comparisonCategory ||
      item.category ||
      item.attributes?.businessCategory,
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

  if (
    source.includes("electronic") ||
    source.includes("phone") ||
    source.includes("computer")
  ) {
    return "Electronics";
  }

  if (
    source.includes("hardware") ||
    source.includes("building") ||
    source.includes("construction")
  ) {
    return "Hardware and building materials";
  }

  if (
    source.includes("home") ||
    source.includes("kitchen") ||
    source.includes("household")
  ) {
    return "Home and kitchen materials";
  }

  if (
    source.includes("light") ||
    source.includes("bulb") ||
    source.includes("lamp")
  ) {
    return "Lighting";
  }

  if (
    source.includes("spare") ||
    source.includes("part") ||
    source.includes("replacement")
  ) {
    return "Spare parts";
  }

  return cleanString(
    item.category ||
      item.comparisonCategory,
  );
}

function SavedProductCard({
  item,
  store,
  onMessage,
}) {
  const unavailable =
    item.seller.temporarilyClosed ||
    Number(item.availableQuantity || 0) <= 0;

  const inCart =
    store.isInCart(item.key);

  const inCompare =
    store.isInCompare(item.key);

  function addToCart() {
    const result =
      store.addToCart(item);

    if (result.ok) {
      onMessage(
        `${item.title} was added to your cart.`,
      );
      return;
    }

    if (result.reason === "STORE_CLOSED") {
      onMessage(
        "This store is temporarily closed.",
        "error",
      );
      return;
    }

    if (result.reason === "STOCK_LIMIT") {
      onMessage(
        "You already added all currently available stock.",
        "error",
      );
      return;
    }

    onMessage(
      "This product is currently unavailable.",
      "error",
    );
  }

  function changeCompare() {
    const result =
      store.toggleCompare(item);

    if (result.reason === "LIMIT") {
      onMessage(
        "You can compare up to four products.",
        "error",
      );
      return;
    }

    if (result.reason === "CATEGORY") {
      onMessage(
        "Choose products from the same category to compare.",
        "error",
      );
      return;
    }

    onMessage(
      result.active
        ? `${item.title} was added to compare.`
        : `${item.title} was removed from compare.`,
    );
  }

  return (
    <article className="svx-account-saved-card">
      <Link
        to={productUrl(item)}
        className="svx-account-saved-image"
        aria-label={`View ${item.title}`}
      >
        {item.image?.url ? (
          <img
            src={item.image.url}
            alt={
              item.image.altText ||
              item.title
            }
            loading="lazy"
          />
        ) : (
          <ShoppingBag
            size={28}
            aria-hidden="true"
          />
        )}
      </Link>

      <div className="svx-account-saved-copy">
        <div className="svx-account-saved-store">
          <Store size={13} />
          <span>{item.seller.name}</span>
        </div>

        <Link
          to={productUrl(item)}
          className="svx-account-saved-title"
        >
          {item.title}
        </Link>

        {categoryLabel(item) ? (
          <span className="svx-account-saved-category">
            {categoryLabel(item)}
          </span>
        ) : null}

        <div className="svx-account-saved-price-row">
          <strong>
            {formatMoney(
              item.price,
              item.currency,
            )}
          </strong>

          <span
            className={
              unavailable
                ? "is-unavailable"
                : "is-available"
            }
          >
            {item.seller.temporarilyClosed
              ? "Store closed"
              : unavailable
                ? "Unavailable"
                : "Available"}
          </span>
        </div>
      </div>

      <div className="svx-account-saved-actions">
        <Link
          to={productUrl(item)}
          className="svx-account-saved-view"
        >
          View product
          <ArrowRight size={16} />
        </Link>

        <button
          type="button"
          className="svx-account-saved-cart"
          disabled={unavailable}
          onClick={addToCart}
        >
          <ShoppingCart size={16} />
          {inCart
            ? "Add another"
            : "Add to cart"}
        </button>

        <button
          type="button"
          className={[
            "svx-account-saved-compare",
            inCompare ? "is-active" : "",
          ].join(" ")}
          onClick={changeCompare}
        >
          <GitCompareArrows size={16} />
          {inCompare
            ? "In compare"
            : "Compare"}
        </button>

        <button
          type="button"
          className="svx-account-saved-remove"
          onClick={() => {
            store.removeFromWishlist(
              item.key,
            );

            onMessage(
              `${item.title} was removed from saved products.`,
            );
          }}
        >
          <Trash2 size={15} />
          Remove
        </button>
      </div>
    </article>
  );
}

export default function MarketplaceCustomerSavedProducts() {
  const store =
    useMarketplaceCustomerStore();

  const [message, setMessage] =
    useState(null);

  const [visibleCount, setVisibleCount] =
    useState(6);

  useEffect(() => {
    if (!message) return undefined;

    const timeout =
      window.setTimeout(() => {
        setMessage(null);
      }, 3200);

    return () =>
      window.clearTimeout(timeout);
  }, [message]);

  function showMessage(
    text,
    type = "success",
  ) {
    setMessage({
      text,
      type,
    });
  }

  return (
    <section className="svx-account-saved-section">
      <div className="svx-customer-account-section-heading">
        <div>
          <h2>Saved products</h2>

          <p>
            Products you kept for later.
          </p>
        </div>

        {store.wishlist.length ? (
          <strong className="svx-account-saved-count">
            {store.wishlist.length}{" "}
            {store.wishlist.length === 1
              ? "product"
              : "products"}
          </strong>
        ) : null}
      </div>

      {message ? (
        <p
          className={[
            "svx-account-saved-message",
            message.type === "error"
              ? "is-error"
              : "is-success",
          ].join(" ")}
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      {!store.wishlist.length ? (
        <div className="svx-account-saved-empty">
          <Heart
            size={30}
            aria-hidden="true"
          />

          <h3>You have no saved products yet</h3>

          <p>
            Use the heart button on a product to keep it here.
          </p>

          <Link to="/marketplace">
            Browse products
            <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="svx-account-saved-grid">
          {store.wishlist
            .slice(0, visibleCount)
            .map((item) => (
            <SavedProductCard
              key={item.key}
              item={item}
              store={store}
              onMessage={showMessage}
            />
          ))}
        </div>
      )}

      {store.wishlist.length > 6 ? (
        <div className="svx-account-saved-pagination">
          <button
            type="button"
            onClick={() =>
              setVisibleCount(
                visibleCount >=
                  store.wishlist.length
                  ? 6
                  : store.wishlist.length,
              )
            }
          >
            {visibleCount >=
            store.wishlist.length
              ? "Show less"
              : `Show ${
                  store.wishlist.length -
                  visibleCount
                } more`}
          </button>
        </div>
      ) : null}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Cpu,
  Drill,
  Eye,
  GitCompareArrows,
  Heart,
  Home,
  LampCeiling,
  ShieldCheck,
  Tag,
  MessageCircle,
  MapPin,
  Menu,
  Moon,
  PackageSearch,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Sun,
  UserRound,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import {
  Link,
  useLocation,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
  listMarketplaceProducts,
  listMarketplaceStores,
} from "../../services/marketplaceApi";
import {
  marketplaceQueryKeys,
} from "../../lib/marketplaceQueryKeys";
import { useTheme } from "../../hooks/useTheme";
import MarketplaceCustomerPanel from "./MarketplaceCustomerPanel";
import MarketplaceHeader from "./MarketplaceHeader";
import {
  useMarketplaceCustomerSession,
} from "./MarketplaceCustomerSession";
import {
  MARKETPLACE_CUSTOMER_PANEL_EVENT,
  marketplaceProductKey,
  syncMarketplaceProductSnapshots,
  useMarketplaceCustomerStore,
} from "./marketplaceCustomerStore";
import {
  trackMarketplaceActivityQuietly,
} from "./marketplaceAnalytics";
import {
  marketplaceCardAttributes,
  marketplaceDiscountPercent,
} from "./marketplaceCategoryDefinitions";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";
import "./MarketplaceCustomerPanel.css";
import "./MarketplaceHomePremium.css";
import "./MarketplaceProductCard.css";
import "./MarketplaceHomeFinish.css";

const logoSrc = "/storvex_dark.webp";
const whiteLogoSrc = "/storvex_white.webp";
const iconSrc = "/storvex_icon.webp";

const marketplaceCategories = [
  {
    name: "Electronics",
    shortName: "Electronics",
    slug: "electronics",
    description: "Phones, laptops and accessories",
    image: "/marketplace/categories/electronics.webp",
    icon: Cpu,
  },
  {
    name: "Hardware / Quincaillerie",
    shortName: "Hardware",
    slug: "hardware",
    description: "Tools, materials and fittings",
    image: "/marketplace/categories/hardware.webp",
    icon: Drill,
  },
  {
    name: "Home & kitchen materials",
    shortName: "Home & kitchen",
    slug: "home-and-kitchen",
    description: "Cookware and home materials",
    image: "/marketplace/categories/home-kitchen.webp",
    icon: Home,
  },
  {
    name: "Lighting",
    shortName: "Lighting",
    slug: "lighting",
    description: "Bulbs, ceiling and outdoor lights",
    image: "/marketplace/categories/lighting.webp",
    icon: LampCeiling,
  },
  {
    name: "Spare parts",
    shortName: "Spare parts",
    slug: "spare-parts",
    description: "Batteries and replacement parts",
    image: "/marketplace/categories/spare-parts.webp",
    icon: Wrench,
  },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function marketplaceImageSource(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return cleanString(value);
  }

  return cleanString(
    value.url ||
    value.publicUrl ||
    value.imageUrl ||
    value.src,
  );
}

export function formatMoney(value, currency) {
  const amount = Math.max(
    0,
    Number(value || 0),
  );

  const currencyCode =
    cleanString(currency).toUpperCase();

  if (!currencyCode) {
    return new Intl.NumberFormat(
      "en",
      {
        maximumFractionDigits: 2,
      },
    ).format(amount);
  }

  try {
    return new Intl.NumberFormat(
      "en",
      {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "code",
      },
    )
      .format(amount)
      .replace(/\u00a0/g, " ");
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
}

export function marketplaceErrorMessage(error) {
  return (
    error?.message ||
    error?.data?.message ||
    "Marketplace could not be loaded. Check your connection and try again."
  );
}

export { MarketplaceHeader };


function marketplaceCardDescription(
  value,
  maximumWords = 9,
) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) {
    return "";
  }

  const preview = words
    .slice(0, maximumWords)
    .join(" ")
    .replace(/[.,;:!?]+$/, "");

  return `${preview}...`;
}

/* STORVEX STEP 230 — FOUR PRODUCT CARD FIXES */

/* STORVEX STEP 255 — INFINITE NEW ARRIVALS
   Reuses the existing universal ProductCard.
*/
function InfiniteProductCarousel({
  products,
  loading,
  error,
  onRetry,
  sectionId = "marketplace-products",
  eyebrow = "Recently added",
  title = "New Arrivals",
  viewAllTo = "/marketplace/shop",
}) {
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = products.length;
  const canLoop = count > 1;

  // Three identical sequences provide seamless wraparound.
  const repeated = canLoop
    ? [0, 1, 2].flatMap((cycle) =>
        products.map((product, index) => ({
          product,
          key: `${cycle}-${index}-${product.slug}`,
        })),
      )
    : products.map((product, index) => ({
        product,
        key: `single-${index}-${product.slug}`,
      }));

  useEffect(() => {
    const preference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const update = () => setReducedMotion(preference.matches);
    update();

    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !canLoop) return undefined;

    const positionAtMiddle = () => {
      const previous = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = track.scrollWidth / 3;
      track.style.scrollBehavior = previous;
    };

    // Wait until layout widths are available.
    const frame = window.requestAnimationFrame(positionAtMiddle);

    return () => window.cancelAnimationFrame(frame);
  }, [canLoop, count]);

  const normalizePosition = () => {
    const track = trackRef.current;
    if (!track || !canLoop) return;

    const sequenceWidth = track.scrollWidth / 3;
    if (sequenceWidth <= 0) return;

    const left = track.scrollLeft;
    let corrected = left;

    if (left < sequenceWidth * 0.5) {
      corrected = left + sequenceWidth;
    } else if (left > sequenceWidth * 1.5) {
      corrected = left - sequenceWidth;
    }

    if (corrected !== left) {
      const previous = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = corrected;
      track.style.scrollBehavior = previous;
    }
  };

  const move = (direction) => {
    const track = trackRef.current;
    if (!track || !canLoop) return;

    const first = track.querySelector(
      ".svx-marketplace-product-card",
    );

    if (!first) return;

    const gap = parseFloat(
      window.getComputedStyle(track).columnGap,
    ) || 0;

    const distance =
      first.getBoundingClientRect().width + gap;

    track.scrollBy({
      left: direction * distance,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  };

  useEffect(() => {
    if (!canLoop || reducedMotion) return undefined;

    const interval = window.setInterval(() => {
      if (
        pausedRef.current ||
        document.hidden ||
        !trackRef.current
      ) {
        return;
      }

      const track = trackRef.current;
      const first = track.querySelector(
        ".svx-marketplace-product-card",
      );

      if (!first) return;

      const gap = parseFloat(
        window.getComputedStyle(track).columnGap,
      ) || 0;

      track.scrollBy({
        left: first.getBoundingClientRect().width + gap,
        behavior: "smooth",
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [canLoop, reducedMotion, count]);

  return (
    <section
      id={sectionId}
      className="svx-commerce-section svx-new-arrivals-section"
      aria-labelledby={`${sectionId}-title`}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onFocusCapture={() => {
        pausedRef.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          pausedRef.current = false;
        }
      }}
      onTouchStart={() => {
        pausedRef.current = true;
      }}
      onTouchEnd={() => {
        pausedRef.current = false;
      }}
      onTouchCancel={() => {
        pausedRef.current = false;
      }}
    >
      <div className="svx-commerce-section-heading svx-new-arrivals-heading">
        <div>
          <span>{eyebrow}</span>
          <h2 id={`${sectionId}-title`}>{title}</h2>
        </div>

        <div className="svx-new-arrivals-actions">
          {canLoop && (
            <div className="svx-new-arrivals-navigation">
              <button
                type="button"
                aria-label={`Previous ${title} product`}
                onClick={() => move(-1)}
              >
                <ArrowLeft size={18} />
              </button>

              <button
                type="button"
                aria-label={`Next ${title} product`}
                onClick={() => move(1)}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          <Link
            to={viewAllTo}
            className="svx-commerce-view-all-products svx-new-arrivals-view-all"
          >
            <span>View all</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {loading ? <LoadingProducts /> : null}

      {!loading && error ? (
        <div className="svx-commerce-state">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && count === 0 ? (
        <div className="svx-commerce-state">
          <p>More new products are coming soon.</p>
        </div>
      ) : null}

      {!loading && !error && count > 0 ? (
        <div className="svx-new-arrivals-viewport">
          <div
          ref={trackRef}
          className="svx-commerce-product-grid svx-new-arrivals-track"
          role="region"
          aria-label={`${title} products`}
          tabIndex={0}
          onScroll={normalizePosition}
        >
          {repeated.map(({ product, key }) => (
            <ProductCard key={key} product={product} />
          ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ProductCard({ product }) {
  const navigate = useNavigate();

  const customerStore =
    useMarketplaceCustomerStore();

  const key = marketplaceProductKey(product);

  const images =
    Array.isArray(product?.images) &&
    product.images.length
      ? product.images
      : product?.image
        ? [product.image]
        : [];

  const [activeImageIndex, setActiveImageIndex] =
    useState(0);

  const [compareMessage, setCompareMessage] =
    useState("");

  const productUrl = `/marketplace/${encodeURIComponent(
    product.seller.slug,
  )}/${encodeURIComponent(product.slug)}`;

  const inCart = customerStore.isInCart(key);

  const inWishlist =
    customerStore.isInWishlist(key);

  const inCompare =
    customerStore.isInCompare(key);

  const primaryImage =
    images[0] || product.image;

  const activeImage =
    images[activeImageIndex] || primaryImage;

  const activeImageSrc =
    marketplaceImageSource(activeImage) ||
    marketplaceImageSource(primaryImage);

  const discountPercent =
    marketplaceDiscountPercent(product);

  const ratingValue = Math.max(
    0,
    Math.min(
      5,
      Number(
        product.averageRating ||
          product.rating?.average ||
          0,
      ),
    ),
  );

  const reviewCount = Math.max(
    0,
    Number(
      product.reviewCount ||
        product.rating?.count ||
        0,
    ),
  );

  const hasRatings =
    ratingValue > 0 &&
    reviewCount > 0;

  const saleSaving = product.onSale
    ? Math.max(
        0,
        Number(product.regularPrice || 0) -
          Number(product.price || 0),
      )
    : 0;

  useEffect(() => {
    if (activeImageIndex >= images.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, images.length]);

  function trackProductCardOpen() {
    trackMarketplaceActivityQuietly({
      eventType: "PRODUCT_CARD_OPEN",
      storeSlug: product.seller.slug,
      productSlug: product.slug,
      source: "product-card",
    });
  }

  function viewProduct(event) {
    event?.stopPropagation();
    trackProductCardOpen();
    navigate(productUrl);
  }

  function openProductCard(event) {
    if (
      event.target.closest(
        "button, a, input, select, textarea",
      )
    ) {
      return;
    }

    viewProduct();
  }

  function handleProductCardKeyDown(event) {
    if (
      event.target !== event.currentTarget ||
      !["Enter", " "].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    viewProduct();
  }

  function toggleCart(event) {
    event?.stopPropagation();

    if (inCart) {
      customerStore.removeFromCart(key);

      toast.success(
        `${product.title} removed from cart`,
      );

      return;
    }

    const result =
      customerStore.addToCart(product);

    if (!result.ok) {
      toast.error(
        result.reason === "STORE_CLOSED"
          ? "This store is temporarily closed."
          : "This product is not available.",
      );

      return;
    }

    trackMarketplaceActivityQuietly({
      eventType: "ADD_TO_CART",
      storeSlug: product.seller.slug,
      productSlug: product.slug,
      source: "product-card",
    });

    toast.success(
      `${product.title} added to cart`,
    );
  }

  function toggleWishlist(event) {
    event?.stopPropagation();

    const active =
      customerStore.toggleWishlist(product);

    if (active) {
      trackMarketplaceActivityQuietly({
        eventType: "SAVE_PRODUCT",
        storeSlug: product.seller.slug,
        productSlug: product.slug,
        source: "product-card",
      });
    }

    toast.success(
      active
        ? `${product.title} saved to wishlist`
        : `${product.title} removed from wishlist`,
    );
  }

  function toggleCompare(event) {
    event?.stopPropagation();

    const result =
      customerStore.toggleCompare(product);

    if (result.reason === "LIMIT") {
      setCompareMessage(
        "You can compare up to 4 products.",
      );

      toast.error(
        "You can compare up to 4 products.",
      );
    } else if (result.reason === "CATEGORY") {
      setCompareMessage(
        "Compare products from the same category.",
      );

      toast.error(
        "Choose products from the same category.",
      );
    } else {
      setCompareMessage("");

      if (result.active) {
        trackMarketplaceActivityQuietly({
          eventType: "ADD_TO_COMPARE",
          storeSlug: product.seller.slug,
          productSlug: product.slug,
          source: "product-card",
        });
      }

      toast.success(
        result.active
          ? `${product.title} added to comparison`
          : `${product.title} removed from comparison`,
      );
    }

    if (result.reason) {
      window.setTimeout(() => {
        setCompareMessage("");
      }, 2600);
    }
  }

  return (
    <article
      className={cx(
        "svx-commerce-product-card",
        "svx-marketplace-product-card",
        product.onSale && "is-on-sale",
      )}
      role="link"
      tabIndex={0}
      aria-label={`View ${product.title}`}
      onClick={openProductCard}
      onKeyDown={handleProductCardKeyDown}
    >
        <div className="svx-marketplace-product-card__badges svx-marketplace-product-card__topline">
          {product.onSale ? (
            <span className="is-sale">
              Sale {discountPercent}% off
            </span>
          ) : null}

          {product.seller?.temporarilyClosed ? (
            <span className="is-closed">
              Store closed
            </span>
          ) : product.availability === "out_of_stock" ? (
            <span className="is-low-stock">Out of stock</span>
          ) : product.availability === "unavailable" ? (
            <span className="is-low-stock">Unavailable</span>
          ) : (
            <span className="is-available">
              In stock
            </span>
          )}
        </div>

      <div className="svx-marketplace-product-card__visual">
        <Link
          to={productUrl}
          className="svx-marketplace-product-card__image"
          aria-label={`View ${product.title}`}
          onClick={(event) => {
            if (event.currentTarget.dataset.svxSwiped === "1") {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.dataset.svxSwiped = "";
              return;
            }
            trackProductCardOpen();
          }}
          onMouseMove={(event) => {
            const count = Math.min(images.length, 4);
            if (count <= 1) return;

            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;

            const x = Math.max(
              0,
              Math.min(rect.width - 0.001, event.clientX - rect.left),
            );

            const next = Math.min(
              count - 1,
              Math.floor((x / rect.width) * count),
            );

            setActiveImageIndex((current) =>
              current === next ? current : next
            );
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;

            event.currentTarget.dataset.svxStartX =
              String(touch.clientX);
            event.currentTarget.dataset.svxSwiped = "";
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            const startX = Number(
              event.currentTarget.dataset.svxStartX
            );

            if (!touch || !Number.isFinite(startX)) return;

            const difference = touch.clientX - startX;
            const count = Math.min(images.length, 4);

            if (count > 1 && Math.abs(difference) >= 35) {
              event.currentTarget.dataset.svxSwiped = "1";
              event.preventDefault();
              event.stopPropagation();

              setActiveImageIndex((current) =>
                Math.max(
                  0,
                  Math.min(
                    count - 1,
                    current + (difference < 0 ? 1 : -1),
                  ),
                ),
              );
            }

            delete event.currentTarget.dataset.svxStartX;
          }}
        >
          {activeImageSrc ? (
            <img
              src={activeImageSrc}
              alt={
                activeImage?.altText ||
                primaryImage?.altText ||
                product.title
              }
              loading="lazy"
              decoding="async"
            />
          ) : (
            <ShoppingBag
              size={44}
              aria-hidden="true"
            />
          )}
        </Link>



        <div className="svx-marketplace-product-card__visual-actions">
          <button
            type="button"
            className={cx(
              inWishlist && "is-active",
            )}
            onClick={toggleWishlist}
            aria-label={
              inWishlist
                ? `Remove ${product.title} from wishlist`
                : `Add ${product.title} to wishlist`
            }
            aria-pressed={inWishlist}
            title={
              inWishlist
                ? "Remove from wishlist"
                : "Add to wishlist"
            }
          >
            <Heart
              size={21}
              fill={
                inWishlist
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        </div>

      </div>

      <div className="svx-marketplace-product-card__gallery-rail">
        {images.length > 0 ? (
          <div
            className="svx-marketplace-product-card__image-switcher"
            aria-label="Choose product image"
          >
            {images.slice(0, 4).map(
              (image, index) => (
                <button
                  type="button"
                  key={`${marketplaceImageSource(
                    image,
                  )}-${index}`}
                  className={
                    activeImageIndex === index
                      ? "is-active"
                      : ""
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveImageIndex(index);
                  }}
                  onMouseEnter={() => {
                    setActiveImageIndex(index);
                  }}
                  onFocus={() => {
                    setActiveImageIndex(index);
                  }}
                  aria-label={`Show product image ${
                    index + 1
                  }`}
                  aria-pressed={
                    activeImageIndex === index
                  }
                />
              ),
            )}
          </div>
        ) : null}
      </div>

      <div className="svx-marketplace-product-card__content">
        <div className="svx-marketplace-product-card__seller">
          <span className="svx-marketplace-product-card__seller-name">
            {product.seller?.name}
          </span>
        </div>

        <h3>{product.title}</h3>

        <div className="svx-marketplace-product-card__meta-row">
        <div
          className="svx-marketplace-product-card__rating"
          aria-label={
            hasRatings
              ? `${ratingValue.toFixed(1)} out of 5 from ${reviewCount} reviews`
              : "No product reviews yet"
          }
        >
          {hasRatings ? (
<span
            className="svx-marketplace-product-card__stars"
            aria-hidden="true"
          >
            {Array.from({ length: 5 }).map(
              (_, index) => (
                <Star
                  key={index}
                  size={16}
                  strokeWidth={2}
                  fill={
                    hasRatings &&
                    index < Math.round(ratingValue)
                      ? "currentColor"
                      : "none"
                  }
                />
              ),
            )}
          </span>
          ) : null}

          <span>
            {hasRatings
              ? `${ratingValue.toFixed(1)} (${reviewCount})`
              : "No reviews yet"}
          </span>
        </div>

        <div className="svx-marketplace-product-card__secondary-actions" aria-label="More product actions">
          <button
            type="button"
            className={cx(
              inCompare && "is-active",
            )}
            onClick={toggleCompare}
            aria-label={
              inCompare
                ? `Remove ${product.title} from comparison`
                : `Compare ${product.title}`
            }
            aria-pressed={inCompare}
            title={
              inCompare
                ? "Remove from comparison"
                : "Compare product"
            }
          >
            <GitCompareArrows size={20} />
          </button>
          <button
            type="button"
            className="svx-marketplace-product-card__open"
            onClick={viewProduct}
            aria-label={`View ${product.title}`}
            title="View product"
          >
            <Eye size={23} />
          </button>
        </div>

        </div>

        <div className="svx-marketplace-product-card__checkout-row">
          <div className="svx-marketplace-product-card__pricing">
          <div className="svx-marketplace-product-card__price-line">
            <strong>
              {formatMoney(
                product.price,
                product.currency,
              )}
            </strong>

            {product.onSale ? (
              <del>
                {formatMoney(
                  product.regularPrice,
                  product.currency,
                )}
              </del>
            ) : null}
          </div>

          {product.onSale && saleSaving > 0 ? (
            <small>
              Save{" "}
              {formatMoney(
                saleSaving,
                product.currency,
              )}{" "}
              ({discountPercent}%)
            </small>
          ) : null}
        </div>

        <div className="svx-marketplace-product-card__purchase-actions">
          <button
            type="button"
            className={cx(
              "svx-marketplace-product-card__cart",
              inCart && "is-active",
            )}
            onClick={toggleCart}
            aria-pressed={inCart}
          >
            {inCart ? (
              <Check size={22} />
            ) : (
              <ShoppingCart size={22} />
            )}

            <span>
              {inCart ? "In cart" : "Add to cart"}
            </span>
          </button>


        </div>

        </div>

        <span
          className="svx-marketplace-product-card__message"
          role="status"
          aria-live="polite"
        >
          {compareMessage}
        </span>
      </div>
    </article>
  );
}

/* STORVEX STEP 280 — REFERENCE FEATURED STORES
   Compact card based on the user-approved screenshot.
   Store directory cards are not changed.
*/
function FeaturedMarketplaceStoreCard({
  store,
  previewProducts = [],
}) {
  const location = [
    store.location?.locality || store.location?.sector,
    store.location?.area || store.location?.district,
  ].filter(Boolean).join(", ");

  const previews = previewProducts
    .filter((product) => product.seller?.slug === store.slug)
    .map((product) => {
      const images = Array.isArray(product.images)
        ? product.images
        : [];

      const selected = images[0] || product.primaryImage;

      return {
        slug: product.slug,
        title: product.title,
        src: marketplaceImageSource(selected),
      };
    })
    .filter((item) => Boolean(item.src))
    .slice(0, 4);

  return (
    <Link
      to={`/marketplace/stores/${encodeURIComponent(store.slug)}`}
      className="svx-reference-store-card"
      aria-label={`Explore ${store.name}`}
    >
      <div className="svx-reference-store-card__identity">
        <span className="svx-reference-store-card__logo">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Store size={22} aria-hidden="true" />
          )}
        </span>

        <span className="svx-reference-store-card__details">
          <strong>{store.name}</strong>
          {location ? (
            <small title={location}>{location}</small>
          ) : null}
          <small>
            {store.availableProductCount} products
          </small>
        </span>
      </div>

      <div className="svx-reference-store-card__bottom">
        <span className="svx-reference-store-card__previews">
          {previews.map((preview) => (
            <img
              key={preview.slug}
              src={preview.src}
              alt={preview.title}
              loading="lazy"
              decoding="async"
            />
          ))}
        </span>

        <span
          className="svx-reference-store-card__arrow"
          aria-hidden="true"
        >
          <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}

export function StoreCard({ store }) {
  const place = [
    store.location?.locality ||
      store.location?.sector,
    store.location?.area ||
      store.location?.district,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      to={`/marketplace/stores/${encodeURIComponent(store.slug)}`}
      className="svx-commerce-store-card"
    >
      <div className="svx-commerce-store-logo">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={`${store.name} logo`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <Store
            size={25}
            strokeWidth={1.9}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="svx-commerce-store-details">
        <div>
          <h3>{store.name}</h3>

          <span
            className={
              store.temporarilyClosed ? "is-closed" : "is-open"
            }
          >
            {store.temporarilyClosed
              ? "Temporarily closed"
              : "Open for requests"}
          </span>
        </div>

        {place ? (
          <p>
            <MapPin size={13} />
            {place}
          </p>
        ) : null}

        <div className="svx-commerce-store-services">
          <span>
            <ShoppingBag size={13} />
            {store.availableProductCount} products
          </span>

          {store.pickupEnabled ? <span>Pickup</span> : null}
          {store.deliveryEnabled ? <span>Delivery</span> : null}
        </div>
      </div>

      <ChevronRight size={18} />
    </Link>
  );
}

export function LoadingProducts() {
  return (
    <div className="svx-commerce-product-grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="svx-commerce-product-card is-loading"
        >
          <span />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

export function MarketplaceFooter({
  showCta = true,
  homepageVariant = false,
} = {}) {
  const year = new Date().getFullYear();

  return (
    <section className="svx-footer-section">
      <div
        className={cx(
          "svx-footer-shell",
          !showCta && "is-compact",
        )}
      >
        {showCta ? (
          <div className="svx-footer-cta">
            <div className="svx-footer-cta-copy">
              <h2>
                Put your products where customers are already looking.
              </h2>

              <p>
                Manage your store with Storvex, publish selected products,
                and confirm every order request before it becomes a
                sale.
              </p>
            </div>

            <div className="svx-footer-cta-actions">
              <Link to="/signup" className="svx-footer-primary">
                <span>Start selling on Storvex</span>
                <ArrowRight size={17} />
              </Link>

              <Link to="/login" className="svx-footer-secondary">
                Owner access
              </Link>
            </div>

            <div className="svx-footer-cta-points">
              <span>
                <Check size={15} />
                Publish only what is available
              </span>

              <span>
                <Check size={15} />
                Keep stock and sales connected
              </span>

              <span>
                <Check size={15} />
                Confirm before recording a sale
              </span>
            </div>
          </div>
        ) : null}

        <footer className="svx-footer-main">
          <div className="svx-commerce-footer-grid">
            <div className="svx-footer-brand">
              <Link
                to="/marketplace"
                className="svx-footer-brand-mark"
                aria-label="Storvex Marketplace home"
              >
                <img
                  src={
                    homepageVariant
                      ? "/storvex-header-tricolor.png"
                      : whiteLogoSrc
                  }
                  alt="Storvex"
                  draggable="false"
                />
              </Link>

              <p>
                Discover products from local businesses using Storvex
                to manage stock, sales, and customer fulfilment.
              </p>

              <span className="svx-footer-location">
                Built in Rwanda for real stores
              </span>
            </div>

            <div className="svx-commerce-footer-links">
              <div>
                <h3>Marketplace</h3>
                <Link to="/marketplace/shop">
                    Browse products
                  </Link>
                <Link to="/marketplace/stores">
                  Explore stores
                </Link>
              </div>

              <div>
                <h3>For businesses</h3>
                <Link to="/">
                  Storvex for business
                </Link>
                <Link to="/signup">
                  Create owner account
                </Link>
                <Link to="/login">
                  Owner access
                </Link>
              </div>

              <div>
                <h3>Support</h3>
                <a
                  href="https://wa.me/250785587830"
                  target="_blank"
                  rel="noreferrer"
                >
                  Contact on WhatsApp
                </a>

                <a
                  href="https://webimpactlab.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Built by WebImpact Lab
                </a>
              </div>
            </div>
          </div>

          <div className="svx-footer-bottom">
            <p>
              Storvex is a product operated by RURAXIS LTD, a company registered in Rwanda.
              <br />
              © {year} RURAXIS LTD. All rights reserved.
            </p>

            <div>
              <Link to="/">About Storvex</Link>
              <Link to="/marketplace/stores">Sell on Storvex</Link>
            </div>

            <span>Rwanda</span>
          </div>
        </footer>
      </div>
    </section>
  );
}

export default function MarketplaceHome() {
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * Marketplace is a normal document page, not a drawer or modal.
   * Release any stale scroll lock carried over through SPA navigation.
   */
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;

    body.style.removeProperty("overflow");
    body.style.removeProperty("overflow-y");
    body.style.removeProperty("position");
    body.style.removeProperty("inset");
    body.style.removeProperty("width");

    root.style.removeProperty("overflow");
    root.style.removeProperty("overflow-y");

    body.classList.remove(
      "overflow-hidden",
      "modal-open",
      "drawer-open",
      "menu-open",
      "no-scroll",
    );

    root.classList.remove(
      "overflow-hidden",
      "modal-open",
      "drawer-open",
      "menu-open",
      "no-scroll",
    );
  }, []);

  const initialSearch = cleanString(
    searchParams.get("search"),
  );
  const initialCategory = cleanString(
    searchParams.get("category"),
  );
  const initialSort =
    cleanString(searchParams.get("sort")) || "newest";
  const initialFulfilment = cleanString(
    searchParams.get("fulfilment"),
  );
  const initialMinimumPrice = cleanString(
    searchParams.get("minPrice"),
  );
  const initialMaximumPrice = cleanString(
    searchParams.get("maxPrice"),
  );
  const initialOnSale =
    searchParams.get("onSale") === "true";
  const initialPage = Math.max(
    1,
    Number.parseInt(
      searchParams.get("page") || "1",
      10,
    ) || 1,
  );

  const [searchInput, setSearchInput] =
    useState(initialSearch);
  const [search, setSearch] =
    useState(initialSearch);
  const [category, setCategory] =
    useState(initialCategory);
  const [sort, setSort] =
    useState(initialSort);
  const [fulfilment, setFulfilment] =
    useState(initialFulfilment);
  const [minimumPrice, setMinimumPrice] =
    useState(initialMinimumPrice);
  const [maximumPrice, setMaximumPrice] =
    useState(initialMaximumPrice);
  const [onSaleOnly, setOnSaleOnly] =
    useState(initialOnSale);
  const [page, setPage] =
    useState(initialPage);
  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const homeProductParams = useMemo(
    () => ({
      search,
      category,
      sort: "newest",
      page: 1,
      limit: 12,
    }),
    [
      search,
      category,
    ],
  );

  const homeStoreParams = useMemo(
    () => ({
      search,
      limit: 5,
    }),
    [
      search,
    ],
  );

  const productsQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.products(
        homeProductParams,
      ),
    queryFn: () =>
      listMarketplaceProducts(
        homeProductParams,
      ),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  /* STORVEX STEP 273 — ON SALE
     Request genuine active discounts independently.
  */
  const onSaleParams = useMemo(
    () => ({
      sort: "newest",
      page: 1,
      limit: 8,
      onSale: true,
    }),
    [],
  );

  const onSaleQuery = useQuery({
    queryKey: marketplaceQueryKeys.products(onSaleParams),
    queryFn: () => listMarketplaceProducts(onSaleParams),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const storesQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.stores(
        homeStoreParams,
      ),
    queryFn: () =>
      listMarketplaceStores(
        homeStoreParams,
      ),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const productData =
    productsQuery.data || null;
  const storeData =
    storesQuery.data || null;

  const products =
    Array.isArray(productData?.products)
      ? productData.products
      : [];

  const stores =
    Array.isArray(storeData?.stores)
      ? storeData.stores
      : [];

  const apiCategories =
    Array.isArray(productData?.categories)
      ? productData.categories
      : [];

  const pagination = {
    page: Number(
      productData?.pagination?.page || 1,
    ),
    limit: Number(
      productData?.pagination?.limit || 24,
    ),
    total: Number(
      productData?.pagination?.total || 0,
    ),
    pages: Math.max(
      1,
      Number(
        productData?.pagination?.pages || 1,
      ),
    ),
    hasPreviousPage: Boolean(
      productData?.pagination?.hasPreviousPage,
    ),
    hasNextPage: Boolean(
      productData?.pagination?.hasNextPage,
    ),
  };

  const loading =
    productsQuery.isPending ||
    storesQuery.isPending;

  const queryError =
    productsQuery.error ||
    storesQuery.error;

  const error = queryError
    ? marketplaceErrorMessage(queryError)
    : "";

  async function loadMarketplace() {
    await Promise.all([
      productsQuery.refetch(),
      storesQuery.refetch(),
    ]);
  }

  useEffect(() => {
    syncMarketplaceProductSnapshots(products);
  }, [products]);

  useEffect(() => {
    const next = {};

    if (search) next.search = search;
    if (category) next.category = category;

    if (sort && sort !== "newest") {
      next.sort = sort;
    }

    if (fulfilment) {
      next.fulfilment = fulfilment;
    }

    if (minimumPrice) {
      next.minPrice = minimumPrice;
    }

    if (maximumPrice) {
      next.maxPrice = maximumPrice;
    }

    if (onSaleOnly) {
      next.onSale = "true";
    }

    if (page > 1) {
      next.page = String(page);
    }

    setSearchParams(next, {
      replace: true,
    });
  }, [
    search,
    category,
    sort,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
    page,
    setSearchParams,
  ]);

  const visibleCategories = useMemo(() => {
    const known = new Set(apiCategories.map((item) => item.toLowerCase()));

    return marketplaceCategories.map((item) => ({
      ...item,
      available:
        apiCategories.length === 0 ||
        known.has(item.name.toLowerCase()),
    }));
  }, [apiCategories]);

  const resultsLabel =
    pagination.total === 1
      ? "1 available product"
      : `${pagination.total.toLocaleString()} available products`;

  const activeFilterCount = [
    category,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
  ].filter(Boolean).length;

  const pageNumbers = useMemo(() => {
    const totalPages = Math.max(
      1,
      pagination.pages,
    );

    const candidates = new Set([
      1,
      totalPages,
      pagination.page - 2,
      pagination.page - 1,
      pagination.page,
      pagination.page + 1,
      pagination.page + 2,
    ]);

    return Array.from(candidates)
      .filter(
        (value) =>
          value >= 1 &&
          value <= totalPages,
      )
      .sort((left, right) => left - right);
  }, [
    pagination.page,
    pagination.pages,
  ]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(cleanString(searchInput));
  }

  function chooseCategory(value) {
    setPage(1);
    setCategory(value);

    document
      .getElementById("marketplace-products")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function goToPage(nextPage) {
    const targetPage = Math.max(
      1,
      Math.min(
        pagination.pages,
        Number(nextPage || 1),
      ),
    );

    if (targetPage === pagination.page) {
      return;
    }

    setPage(targetPage);

    window.requestAnimationFrame(() => {
      document
        .getElementById("marketplace-products")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setSort("newest");
    setFulfilment("");
    setMinimumPrice("");
    setMaximumPrice("");
    setOnSaleOnly(false);
    setPage(1);
    setFiltersOpen(false);
  }

  return (
    <div className="storvex-landing storvex-marketplace svx-marketplace-home">
      <MarketplaceHeader />

      <main>

        <section className="svx-locked-hero" aria-labelledby="svx-locked-hero-title">
          <div className="svx-locked-hero__shell">
            <div className="svx-locked-hero__panel">
              <div className="svx-locked-hero__main">
                <div className="svx-locked-hero__copy">
                  <span className="svx-locked-hero__eyebrow">
                    Local stores. Real products. Your way.
                  </span>

                  <h1 id="svx-locked-hero-title">
                    Shop Trusted<br />
                    Products From<br />
                    Real Retail Stores <span aria-hidden="true">✦</span>
                  </h1>

                  <p>
                    Discover quality products from independent retail
                    businesses on Storvex. Compare options, request directly,
                    and get what you need — all in one place.
                  </p>

                  <div className="svx-locked-hero__actions">
                    <Link
                      to="/marketplace/shop"
                      className="svx-locked-hero__action"
                    >
                      Browse Products
                      <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
                    </Link>

                    <a
                      className="svx-locked-hero__how"
                      href="#marketplace-how-it-works"
                    >
                      How it works
                      <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <div className="svx-locked-hero__visual" aria-hidden="true">
                  <img
                    className="svx-locked-hero__art--light"
                    src="/marketplace/storvex-marketplace-hero-products.png"
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                  <img
                    className="svx-locked-hero__art--dark"
                    src="/marketplace/storvex-marketplace-hero-products.png"
                    alt=""
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>

              <nav
                id="marketplace-categories"
                className="svx-locked-hero__categories"
                aria-label="Shop by business category"
              >
                {marketplaceCategories.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/marketplace/category/${item.slug}`}
                    className="svx-locked-hero__category"
                    aria-label={`Browse ${item.shortName}`}
                  >
                    <span className="svx-locked-hero__category-image">
                      <img
                        className="svx-locked-hero__category-art--light"
                        src={`/marketplace/category-art/${item.slug}.png`}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        aria-hidden="true"
                      />
                      <img
                        className="svx-locked-hero__category-art--dark"
                        src={`/marketplace/category-art/${item.slug}.png`}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="svx-locked-hero__category-label">
                      {item.shortName}
                    </span>
                    <ArrowRight
                      className="svx-locked-hero__category-arrow"
                      size={15}
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </nav>

              {category ? (
                <div className="svx-locked-hero__selection">
                  <span>Category filter: {category}</span>
                  <button
                    type="button"
                    onClick={() => chooseCategory("")}
                  >
                    Clear selection
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="svx-commerce-page-shell">
          {/* STORVEX STEP 158 — FEATURED PRODUCTS */}
          {!search && !category && !loading && !error && products.length > 0 ? (
            <section
              className="svx-commerce-section svx-featured-products"
              aria-labelledby="svx-featured-products-title"
            >
              <div className="svx-commerce-section-heading">
                <div>
                  <span>Discover on Storvex</span>
                  <h2 id="svx-featured-products-title">
                    Featured Products
                  </h2>
                </div>
                <Link
                  to="/marketplace/shop"
                  className="svx-commerce-view-all-products"
                >
                  <span>View all products</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              <div className="svx-commerce-product-grid">
                {products.slice(0, 4).map((product) => (
                  <ProductCard
                    key={`${product.seller.slug}-${product.slug}`}
                    product={product}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {search || category ? (
          <div
            id="marketplace-products"
            className="svx-commerce-section"
          >
            <div className="svx-commerce-section-heading">
              <div>
                <span>
                  {category || search
                    ? "Matching products"
                    : "Recently added"}
                </span>

                <h2>
                  {category
                    ? category
                    : search
                      ? `Results for “${search}”`
                      : "New arrivals"}
                </h2>
              </div>

              {/* STORVEX STEP 250 — NEW ARRIVALS CAROUSEL */}
              {!search && !category && (
                <div className="svx-new-arrivals-navigation">
                  <button
                    type="button"
                    aria-label="Scroll New Arrivals left"
                    onClick={() => {
                      const track = document.getElementById(
                        "svx-new-arrivals-track"
                      );
                      if (!track) return;
                      track.scrollBy({
                        left: -track.clientWidth * 0.85,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <button
                    type="button"
                    aria-label="Scroll New Arrivals right"
                    onClick={() => {
                      const track = document.getElementById(
                        "svx-new-arrivals-track"
                      );
                      if (!track) return;
                      track.scrollBy({
                        left: track.clientWidth * 0.85,
                        behavior: "smooth",
                      });
                    }}
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}

              <Link
                to="/marketplace/shop"
                className="svx-commerce-view-all-products"
              >
                <span>Browse all products</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {loading ? <LoadingProducts /> : null}

            {!loading && error ? (
              <div className="svx-commerce-state">
                <AlertCircle size={31} />
                <h2>
                  Marketplace is temporarily unavailable
                </h2>
                <p>{error}</p>

                <button
                  type="button"
                  onClick={loadMarketplace}
                >
                  <RefreshCw size={16} />
                  Try again
                </button>
              </div>
            ) : null}

            {!loading &&
            !error &&
            products.length === 0 ? (
              <div className="svx-commerce-state">
                <PackageSearch size={34} />
                <h2>No matching products found</h2>
                <p>
                  Browse the complete shop to see
                  other available products.
                </p>

                <Link to="/marketplace/shop">
                  Browse all products
                </Link>
              </div>
            ) : null}

            {!loading &&
            !error &&
            products.length > 0 ? (
              <div
                id="svx-new-arrivals-track"
                className={
                  search || category
                    ? "svx-commerce-product-grid"
                    : "svx-commerce-product-grid svx-new-arrivals-track"
                }
                role="region"
                aria-label="New Arrivals products"
                tabIndex={0}
              >
                {/* STORVEX STEP 246 — DISTINCT NEW ARRIVALS */}
                {(search || category
                  ? products.slice(0, 8)
                  : products.slice(4, 12)
                ).map(
                  (product) => (
                    <ProductCard
                      key={`${product.seller.slug}-${product.slug}`}
                      product={product}
                    />
                  ),
                )}
              </div>
            ) : null}
          </div>

          ) : (
            <InfiniteProductCarousel
              products={products.slice(4, 12)}
              loading={loading}
              error={error}
              onRetry={loadMarketplace}
            />
          )}

          {/* STORVEX STEP 273 — ON SALE */}
          {!search &&
          !category &&
          onSaleQuery.isSuccess &&
          Array.isArray(onSaleQuery.data?.products) &&
          onSaleQuery.data.products.some(
            (product) =>
              product.onSale === true &&
              Number(product.regularPrice) >
                Number(product.price),
          ) ? (
            <InfiniteProductCarousel
              sectionId="marketplace-on-sale"
              eyebrow="Limited-time offers"
              title="On Sale"
              viewAllTo="/marketplace/shop?onSale=true"
              products={onSaleQuery.data.products.filter(
                (product) =>
                  product.onSale === true &&
                  Number(product.regularPrice) >
                    Number(product.price),
              )}
              loading={false}
              error={null}
              onRetry={() => onSaleQuery.refetch()}
            />
          ) : null}

          {!loading && !error && stores.length > 0 ? (
            <section className="svx-commerce-section svx-reference-stores">
              <div className="svx-commerce-section-heading">
                <div>
                  <span>Shop from local retail businesses</span>
                  <h2>Featured Stores</h2>
                  <p className="svx-reference-stores__intro">
                    Explore products from local retail businesses.
                  </p>
                </div>

                <Link
                  to="/marketplace/stores"
                  className="svx-commerce-view-all-stores"
                >
                  <span>View all stores</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              <div className="svx-reference-stores__grid">
                {stores.slice(0, 5).map((store) => (
                  <FeaturedMarketplaceStoreCard
                    key={store.slug}
                    store={store}
                    previewProducts={products}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* STORVEX STEP 282 — FOUR BENEFIT REFERENCE */}
          <section
            className="svx-commerce-section svx-why-shop"
            aria-labelledby="svx-why-shop-title"
          >
            <h2 id="svx-why-shop-title">
              Why Shop on Storvex?
            </h2>

            <div className="svx-why-shop__benefits">
              <div className="svx-why-shop__benefit">
                <span className="svx-why-shop__icon is-green">
                  <ShieldCheck size={23} aria-hidden="true" />
                </span>
                <span>
                  <strong>Real Retail Stores</strong>
                  <small>Discover products from independent businesses.</small>
                </span>
              </div>

              <div className="svx-why-shop__benefit">
                <span className="svx-why-shop__icon is-blue">
                  <Tag size={23} aria-hidden="true" />
                </span>
                <span>
                  <strong>Clear Prices</strong>
                  <small>See prices and compare product options.</small>
                </span>
              </div>

              <div className="svx-why-shop__benefit">
                <span className="svx-why-shop__icon is-lime">
                  <Truck size={23} aria-hidden="true" />
                </span>
                <span>
                  <strong>Pickup or Delivery</strong>
                  <small>Arrange fulfilment with participating sellers.</small>
                </span>
              </div>

              <div className="svx-why-shop__benefit">
                <span className="svx-why-shop__icon is-whatsapp">
                  <MessageCircle size={23} aria-hidden="true" />
                </span>
                <span>
                  <strong>Contact Sellers</strong>
                  <small>Ask questions or send purchase requests directly.</small>
                </span>
              </div>
            </div>
          </section>
        </section>
      </main>

      {/* STORVEX STEP 286 — SHOPPING CTA */}
      <section
        className="svx-shopping-cta"
        aria-labelledby="svx-shopping-cta-title"
      >
        <div className="svx-shopping-cta__copy">
          <h2 id="svx-shopping-cta-title">
            Ready to Start Shopping?
          </h2>

          <p>
            Discover products from local retail stores on Storvex.
          </p>

          <div className="svx-shopping-cta__actions">
            <Link
              to="/marketplace/shop"
              className="svx-shopping-cta__primary"
            >
              Explore Products
              <ArrowRight size={17} aria-hidden="true" />
            </Link>

            <Link
              to="/marketplace/stores"
              className="svx-shopping-cta__secondary"
            >
              Browse Stores
            </Link>
          </div>
        </div>

        {/* STORVEX STEP 289 SHOPPING ARTWORK */}
        <div
          className="svx-shopping-cta__visual"
          aria-hidden="true"
        >
          <img
            className="svx-shopping-cta__artwork"
            src="/marketplace/storvex-shopping-collection.webp"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      <MarketplaceFooter showCta={false} homepageVariant />
    </div>
  );
}

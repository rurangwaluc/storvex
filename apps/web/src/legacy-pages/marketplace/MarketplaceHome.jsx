import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  AlertCircle,
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

export function formatMoney(value, currency = "RWF") {
  const amount = Math.max(0, Number(value || 0));
  const currencyCode = cleanString(currency).toUpperCase() || "RWF";

  if (currencyCode === "RWF") {
    return `Rwf ${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
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
      <div className="svx-marketplace-product-card__visual">
        <Link
          to={productUrl}
          className="svx-marketplace-product-card__image"
          aria-label={`View ${product.title}`}
          onClick={trackProductCardOpen}
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

        <div className="svx-marketplace-product-card__badges">
          {product.onSale ? (
            <span className="is-sale">
              Sale {discountPercent}% off
            </span>
          ) : null}

          {product.seller?.temporarilyClosed ? (
            <span className="is-closed">
              Store closed
            </span>
          ) : product.availableQuantity <= 3 ? (
            <span className="is-low-stock">
              Few remaining
            </span>
          ) : (
            <span className="is-available">
              In stock
            </span>
          )}
        </div>

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

        </div>

        {images.length > 1 ? (
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

        <div
          className="svx-marketplace-product-card__rating"
          aria-label={
            hasRatings
              ? `${ratingValue.toFixed(1)} out of 5 from ${reviewCount} reviews`
              : "No product reviews yet"
          }
        >
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

          <span>
            {hasRatings
              ? `${ratingValue.toFixed(1)} (${reviewCount})`
              : "No reviews yet"}
          </span>
        </div>

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

export function StoreCard({ store }) {
  const place = [
    store.location?.sector,
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
                  src={whiteLogoSrc}
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
              © {year} Storvex. All rights reserved.
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
      limit: 8,
    }),
    [
      search,
      category,
    ],
  );

  const homeStoreParams = useMemo(
    () => ({
      search,
      limit: 4,
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

        <section className="svx-home-hero">
          <div className="svx-home-shell">
            <div className="svx-home-hero-layout">
              <div className="svx-home-hero-copy">
                <span className="svx-home-eyebrow">
                  Local products. Current availability.
                </span>

                <h1>
                  Find what local stores have ready.
                  <strong>Compare it. Request it. Get it your way.</strong>
                </h1>

                <p>
                  Browse products from local businesses using Storvex.
                  Compare price, stock and fulfilment, then send your
                  request directly to the seller.
                </p>

                <div className="svx-home-hero-actions">
                  <a
                    href="#marketplace-categories"
                    className="svx-home-primary-action"
                  >
                    Browse available products
                    <ArrowRight
                      size={18}
                      strokeWidth={2}
                    />
                  </a>

                  <a
                    href="#marketplace-how-it-works"
                    className="svx-home-how-action"
                  >
                    <span>
                      <ArrowRight
                        size={17}
                        strokeWidth={2}
                      />
                    </span>

                    How it works
                  </a>
                </div>
              </div>

              <div className="svx-home-hero-visual">
                <div className="svx-home-hero-image-wrap">
                  <img
                    src="/marketplace-hero.png"
                    alt="Products and business essentials available through Storvex Marketplace"
                    className="svx-home-hero-image"
                    loading="eager"
                    decoding="async"
                  />

                  <div className="svx-home-hero-image-label">
                    <img
                      src={iconSrc}
                      alt=""
                      aria-hidden="true"
                    />

                    <span>
                      <strong>Storvex Marketplace</strong>
                      <small>
                        Local stores. Current inventory.
                      </small>
                    </span>
                  </div>
                </div>
              </div>

              <div className="svx-home-hero-benefits">
                <div>
                  <PackageSearch size={21} />

                  <span>
                    <strong>Available products</strong>
                    <small>
                      See products local stores have published
                    </small>
                  </span>
                </div>

                <div>
                  <Store size={21} />

                  <span>
                    <strong>Request directly</strong>
                    <small>
                      The seller confirms before it becomes a sale
                    </small>
                  </span>
                </div>

                <div>
                  <GitCompareArrows size={21} />

                  <span>
                    <strong>Compare clearly</strong>
                    <small>
                      Review price, stock and fulfilment
                    </small>
                  </span>
                </div>

                <div>
                  <Truck size={21} />

                  <span>
                    <strong>Pickup or delivery</strong>
                    <small>
                      Arrange fulfilment with the store
                    </small>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="svx-commerce-page-shell">
          <section
            id="marketplace-categories"
            className="svx-commerce-section svx-category-showcase"
          >
            <div className="svx-category-showcase__header">
              <div>
                <span>Browse categories</span>
                <h2>Shop by business category</h2>
              </div>

              <div className="svx-category-showcase__actions">
                {category ? (
                  <button
                    type="button"
                    className="svx-category-showcase__clear"
                    onClick={() => chooseCategory("")}
                  >
                    Clear selection
                    <X size={15} strokeWidth={2} />
                  </button>
                ) : null}

                <Link
                  to="/marketplace/shop"
                  className="svx-category-showcase__all"
                >
                  Browse all products
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>

            <div className="svx-category-showcase__grid">
              {marketplaceCategories.map((item) => (
                <Link
                  key={item.slug}
                  to={`/marketplace/category/${item.slug}`}
                  className="svx-category-showcase__card"
                  aria-label={`Browse ${item.shortName}`}
                >
                  <span className="svx-category-showcase__media">
                    <img
                      src={item.image}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>

                  <span className="svx-category-showcase__body">
                    <span className="svx-category-showcase__copy">
                      <strong>{item.shortName}</strong>
                      <small>{item.description}</small>
                    </span>

                    <span
                      className="svx-category-showcase__open"
                      aria-hidden="true"
                    >
                      <ArrowRight
                        size={16}
                        strokeWidth={2}
                      />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {!loading && !error && stores.length > 0 ? (
            <div className="svx-commerce-section">
              <div className="svx-commerce-section-heading">
                <div>
                  <span>Featured on Storvex</span>
                  <h2>Featured stores</h2>
                </div>

                <Link
                  to="/marketplace/stores"
                  className="svx-commerce-view-all-stores"
                >
                  <span>View all stores</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              <div className="svx-commerce-store-grid">
                {stores.slice(0, 4).map((store) => (
                  <StoreCard key={store.slug} store={store} />
                ))}
              </div>
            </div>
          ) : null}

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
              <div className="svx-commerce-product-grid">
                {products.slice(0, 8).map(
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

          <section className="svx-commerce-trust">
            <div>
              <Settings2 size={24} />
              <span>
                <strong>Managed through Storvex</strong>
                Sellers control what becomes public.
              </span>
            </div>

            <div>
              <Check size={24} />
              <span>
                <strong>Confirmed before handover</strong>
                A request is not automatically recorded as a sale.
              </span>
            </div>

            <div>
              <Truck size={24} />
              <span>
                <strong>Pickup or seller delivery</strong>
                Final arrangements are confirmed by the store.
              </span>
            </div>
          </section>
        </section>
      </main>

      <MarketplaceFooter />
    </div>
  );
}

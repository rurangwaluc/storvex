import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Cpu,
  Drill,
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

const logoSrc = "/storvex_dark.webp";
const whiteLogoSrc = "/storvex_white.webp";
const iconSrc = "/storvex_icon.webp";

const marketplaceCategories = [
  {
    name: "Electronics",
    shortName: "Electronics",
    description: "Phones, laptops, TVs and accessories",
    icon: Cpu,
  },
  {
    name: "Hardware / Quincaillerie",
    shortName: "Hardware",
    description: "Tools, building materials and fittings",
    icon: Drill,
  },
  {
    name: "Home & kitchen materials",
    shortName: "Home & kitchen",
    description: "Cookware, sinks, tiles and home materials",
    icon: Home,
  },
  {
    name: "Lighting",
    shortName: "Lighting",
    description: "Bulbs, ceiling lights and flood lights",
    icon: LampCeiling,
  },
  {
    name: "Spare parts",
    shortName: "Spare parts",
    description: "Screens, batteries, filters and parts",
    icon: Wrench,
  },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
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

  const primaryImage = images[0] || product.image;
  const secondaryImage = images[1] || null;
  const activeImage =
    images[activeImageIndex] || primaryImage;

  const discountPercent =
    marketplaceDiscountPercent(product);

  const descriptionPreview =
    marketplaceCardDescription(
      product.description,
    );

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

  function openProductCard(event) {
    if (
      event.target.closest(
        "button, a, input, select, textarea",
      )
    ) {
      return;
    }

    trackProductCardOpen();
    navigate(productUrl);
  }

  function handleProductCardKeyDown(event) {
    if (
      event.target !== event.currentTarget ||
      !["Enter", " "].includes(event.key)
    ) {
      return;
    }

    event.preventDefault();
    trackProductCardOpen();
    navigate(productUrl);
  }

  function toggleCart() {
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

  function toggleWishlist() {
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

  function toggleCompare() {
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
        product.onSale && "is-on-sale",
      )}
      role="link"
      tabIndex={0}
      aria-label={`View ${product.title}`}
      onClick={openProductCard}
      onKeyDown={handleProductCardKeyDown}
    >
      <div className="svx-commerce-product-media">
        <Link
          to={productUrl}
          className="svx-commerce-product-image"
          aria-label={`View ${product.title}`}
          onClick={trackProductCardOpen}
        >
          {primaryImage ? (
            <>
              <img
                className="svx-commerce-product-image-primary"
                src={
                  activeImage?.url ||
                  primaryImage.url
                }
                alt={
                  activeImage?.altText ||
                  primaryImage.altText ||
                  product.title
                }
                loading="lazy"
              />

              {secondaryImage ? (
                <img
                  className="svx-commerce-product-image-secondary"
                  src={secondaryImage.url}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                />
              ) : null}
            </>
          ) : null}

          <div className="svx-commerce-product-badges">
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
              <span>Few remaining</span>
            ) : (
              <span className="is-available">
                Available
              </span>
            )}
          </div>
        </Link>

        <div className="svx-commerce-product-quick-actions">
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
              size={17}
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
            <GitCompareArrows size={17} />
          </button>
        </div>

        {images.length > 1 ? (
          <div
            className="svx-commerce-product-image-switcher"
            aria-label="Choose product image"
          >
            {images.slice(0, 4).map((image, index) => (
              <button
                type="button"
                key={`${image.url}-${index}`}
                className={
                  activeImageIndex === index
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  setActiveImageIndex(index)
                }
                aria-label={`Show product image ${
                  index + 1
                }`}
                aria-pressed={
                  activeImageIndex === index
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="svx-commerce-product-content">
        <div className="svx-commerce-product-main-link">
          <p>
            <Store size={13} />
            <span>{product.seller?.name}</span>
          </p>

          <h3>{product.title}</h3>
        </div>

        {descriptionPreview ? (
          <p className="svx-commerce-product-description">
            {descriptionPreview}
          </p>
        ) : null}

        <div
          className={cx(
            "svx-commerce-product-price",
            product.onSale && "is-sale",
          )}
        >
          <div className="svx-commerce-product-price-copy">
            {product.onSale ? (
              <span className="svx-commerce-product-sale-label">
                Sale price
              </span>
            ) : null}

            <div className="svx-commerce-product-price-values">
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
              <small className="svx-commerce-product-saving">
                Save{" "}
                {formatMoney(
                  saleSaving,
                  product.currency,
                )}
              </small>
            ) : null}
          </div>


        </div>

        <button
          type="button"
          className={cx(
            "svx-commerce-product-cart-button",
            inCart && "is-active",
          )}
          onClick={toggleCart}
          aria-pressed={inCart}
        >
          {inCart ? (
            <Check size={16} />
          ) : (
            <ShoppingCart size={16} />
          )}

          <span>
            {inCart ? "In cart" : "Add to cart"}
          </span>
        </button>

        <span
          className="svx-commerce-product-action-message"
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
      <div className="svx-footer-shell">
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

  const [products, setProducts] =
    useState([]);
  const [stores, setStores] =
    useState([]);
  const [apiCategories, setApiCategories] =
    useState([]);
  const [pagination, setPagination] =
    useState({
      page: initialPage,
      limit: 24,
      total: 0,
      pages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productData, storeData] =
        await Promise.all([
          listMarketplaceProducts({
            search,
            category,
            sort: "newest",
            page: 1,
            limit: 8,
          }),
          listMarketplaceStores({
            search,
            limit: 4,
          }),
        ]);

      setProducts(
        Array.isArray(productData?.products)
          ? productData.products
          : [],
      );

      setApiCategories(
        Array.isArray(productData?.categories)
          ? productData.categories
          : [],
      );

      setPagination({
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
      });

      setStores(
        Array.isArray(storeData?.stores)
          ? storeData.stores
          : [],
      );
    } catch (loadError) {
      setError(marketplaceErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [
    search,
    category,
    sort,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
    page,
  ]);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

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
    <div className="storvex-landing storvex-marketplace">
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
          <div className="svx-commerce-section">
            <div className="svx-commerce-section-heading">
              <div>
                <span>Categories</span>
                <h2>Browse categories</h2>
              </div>

              {category ? (
                <button type="button" onClick={() => chooseCategory("")}>
                  Clear category
                </button>
              ) : null}
            </div>

            <div className="svx-commerce-category-grid">
              {marketplaceCategories.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    type="button"
                    key={item.name}
                    className={category === item.name ? "is-active" : ""}
                    onClick={() => chooseCategory(item.name)}
                  >
                    <span>
                      <Icon size={25} strokeWidth={2} />
                    </span>

                    <div>
                      <strong>{item.shortName}</strong>
                      <small>{item.description}</small>
                    </div>

                    <ArrowRight size={17} />
                  </button>
                );
              })}
            </div>
          </div>

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

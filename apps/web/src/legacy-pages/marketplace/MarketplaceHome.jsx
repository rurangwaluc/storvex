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
  Truck,
  Wrench,
  X,
} from "lucide-react";
import {
  Link,
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
import {
  marketplaceProductKey,
  syncMarketplaceProductSnapshots,
  useMarketplaceCustomerStore,
} from "./marketplaceCustomerStore";
import {
  marketplaceCardAttributes,
  marketplaceDiscountPercent,
} from "./marketplaceCategoryDefinitions";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";

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

function formatMoney(value, currency = "RWF") {
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

function marketplaceErrorMessage(error) {
  return (
    error?.message ||
    error?.data?.message ||
    "Marketplace could not be loaded. Check your connection and try again."
  );
}

function MarketplaceHeader() {
  const { isDark, toggleTheme } = useTheme();
  const customerStore = useMarketplaceCustomerStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] =
    useState(false);
  const [customerPanelMode, setCustomerPanelMode] =
    useState("cart");
  const headerRef = useRef(null);

  function openCustomerPanel(mode) {
    setMenuOpen(false);
    setCustomerPanelMode(mode);
    setCustomerPanelOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleOutside(event) {
      if (!headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, {
      passive: true,
    });
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!customerPanelOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setCustomerPanelOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [customerPanelOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className={cx(
          "svx-header",
          menuOpen && "is-menu-open",
        )}
      >
        <div className="svx-header-inner">
          <Link
            to="/"
            aria-label="Storvex home"
            className="svx-logo-link"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src={isDark ? whiteLogoSrc : logoSrc}
              alt="Storvex"
              className="svx-header-logo"
              draggable="false"
            />
          </Link>

          <nav
            className="svx-nav"
            aria-label="Marketplace navigation"
          >
            <Link to="/">For businesses</Link>
            <Link
              to="/marketplace"
              className="svx-marketplace-nav-active"
            >
              Marketplace
            </Link>
          </nav>

          <div className="svx-header-actions">
            <div className="svx-marketplace-customer-actions">
              <button
                type="button"
                onClick={() =>
                  openCustomerPanel("wishlist")
                }
                aria-label={`Open wishlist with ${customerStore.wishlist.length} products`}
              >
                <Heart size={17} />
                {customerStore.wishlist.length ? (
                  <b>
                    {customerStore.wishlist.length}
                  </b>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() =>
                  openCustomerPanel("compare")
                }
                aria-label={`Open comparison with ${customerStore.compare.length} products`}
              >
                <GitCompareArrows size={17} />
                {customerStore.compare.length ? (
                  <b>
                    {customerStore.compare.length}
                  </b>
                ) : null}
              </button>

              <button
                type="button"
                className="is-cart"
                onClick={() =>
                  openCustomerPanel("cart")
                }
                aria-label={`Open cart with ${customerStore.cartCount} items`}
              >
                <ShoppingCart size={17} />
                <span>Cart</span>
                {customerStore.cartCount ? (
                  <b>{customerStore.cartCount}</b>
                ) : null}
              </button>
            </div>

            <button
              type="button"
              className="svx-theme-toggle"
              onClick={toggleTheme}
              aria-label={
                isDark
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-pressed={isDark}
            >
              <span
                className={cx(
                  "svx-theme-option",
                  !isDark && "active",
                )}
              >
                <Sun size={15} strokeWidth={2.4} />
              </span>

              <span
                className={cx(
                  "svx-theme-option",
                  isDark && "active",
                )}
              >
                <Moon size={15} strokeWidth={2.4} />
              </span>
            </button>

            <Link
              to="/login"
              className="svx-login-link"
            >
              Owner access
            </Link>

            <Link
              to="/signup"
              className="svx-header-cta"
            >
              Sell on Storvex
            </Link>

            <button
              type="button"
              className="svx-mobile-menu-button"
              onClick={() =>
                setMenuOpen((current) => !current)
              }
              aria-label={
                menuOpen ? "Close menu" : "Open menu"
              }
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <X size={21} strokeWidth={2.4} />
              ) : (
                <Menu size={21} strokeWidth={2.4} />
              )}
            </button>
          </div>
        </div>

        <div
          className="svx-mobile-menu"
          aria-hidden={!menuOpen}
        >
          <nav className="svx-mobile-menu-panel">
            <Link
              to="/"
              className="svx-mobile-menu-link"
              onClick={() => setMenuOpen(false)}
            >
              <span>For businesses</span>
            </Link>

            <Link
              to="/marketplace"
              className="svx-mobile-menu-link"
              onClick={() => setMenuOpen(false)}
            >
              <span>Marketplace</span>
            </Link>

            <button
              type="button"
              className="svx-mobile-menu-link"
              onClick={() =>
                openCustomerPanel("cart")
              }
            >
              <span>Cart</span>
              <b>{customerStore.cartCount}</b>
            </button>

            <button
              type="button"
              className="svx-mobile-menu-link"
              onClick={() =>
                openCustomerPanel("wishlist")
              }
            >
              <span>Wishlist</span>
              <b>{customerStore.wishlist.length}</b>
            </button>

            <button
              type="button"
              className="svx-mobile-menu-link"
              onClick={() =>
                openCustomerPanel("compare")
              }
            >
              <span>Compare</span>
              <b>{customerStore.compare.length}</b>
            </button>

            <div className="svx-mobile-menu-actions">
              <Link
                to="/login"
                className="svx-mobile-menu-secondary"
                onClick={() => setMenuOpen(false)}
              >
                Owner access
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <MarketplaceCustomerPanel
        open={customerPanelOpen}
        mode={customerPanelMode}
        store={customerStore}
        onClose={() =>
          setCustomerPanelOpen(false)
        }
        onModeChange={setCustomerPanelMode}
        notify={(message) =>
          toast.success(message)
        }
      />
    </>
  );
}

function marketplaceCardDescription(
  value,
  maximumLength = 92,
) {
  const description = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!description) {
    return "";
  }

  if (description.length <= maximumLength) {
    return `${description.replace(/[.]+$/, "")}...`;
  }

  const shortened = description
    .slice(0, maximumLength + 1)
    .replace(/\s+\S*$/, "")
    .trim();

  return `${shortened.replace(/[.]+$/, "")}...`;
}

function ProductCard({ product }) {
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

  function openProductCard(event) {
    if (
      event.target.closest(
        "button, a, input, select, textarea",
      )
    ) {
      return;
    }

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

    toast.success(
      `${product.title} added to cart`,
    );
  }

  function toggleWishlist() {
    const active =
      customerStore.toggleWishlist(product);

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

function StoreCard({ store }) {
  const place = [
    store.location?.sector,
    store.location?.district,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      to={`/marketplace/${encodeURIComponent(store.slug)}`}
      className="svx-commerce-store-card"
    >
      <div className="svx-commerce-store-logo">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt="" loading="lazy" />
        ) : (
          <Store size={25} />
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

function LoadingProducts() {
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

function MarketplaceFooter() {
  const year = new Date().getFullYear();

  return (
    <section className="svx-footer-section">
      <div className="svx-footer-shell">
        <div className="svx-footer-cta">
          <div>
            <span className="svx-footer-kicker">
              Built for real stores
            </span>

            <h2>Want customers to discover your products?</h2>

            <p>
              Run your store with Storvex and publish selected products
              when you are ready.
            </p>
          </div>

          <div className="svx-footer-cta-actions">
            <Link to="/signup" className="svx-footer-primary">
              Sell on Storvex
            </Link>
          </div>
        </div>

        <footer className="svx-footer-main">
          <div className="svx-commerce-footer-grid">
            <div className="svx-footer-brand">
              <img
                src={whiteLogoSrc}
                alt="Storvex"
                draggable="false"
              />

              <p>
                Discover products from businesses managing their sales,
                stock and customer fulfilment with Storvex.
              </p>
            </div>

            <div className="svx-commerce-footer-links">
              <div>
                <h3>Marketplace</h3>
                <Link to="/marketplace">Browse products</Link>
                <Link to="/marketplace">Explore stores</Link>
              </div>

              <div>
                <h3>For businesses</h3>
                <Link to="/">Storvex system</Link>
                <Link to="/signup">Create owner account</Link>
                <Link to="/login">Owner access</Link>
              </div>

              <div>
                <h3>Support</h3>
                <a
                  href="https://wa.me/250785587830"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
                <a
                  href="https://webimpactlab.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  WebImpact Lab
                </a>
              </div>
            </div>
          </div>

          <div className="svx-footer-bottom">
            <p>© {year} Storvex. All rights reserved.</p>

            <div>
              <Link to="/">About Storvex</Link>
              <Link to="/signup">Sell on Marketplace</Link>
            </div>

            <div>
              <span>Rwanda</span>
            </div>
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

  const initialSearch = cleanString(searchParams.get("search"));
  const initialCategory = cleanString(
    searchParams.get("category"),
  );

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);

  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productData, storeData] = await Promise.all([
        listMarketplaceProducts({
          search,
          category,
          limit: 36,
        }),
        listMarketplaceStores({
          search,
          limit: 8,
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
  }, [search, category]);

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

    setSearchParams(next, { replace: true });
  }, [search, category, setSearchParams]);

  const visibleCategories = useMemo(() => {
    const known = new Set(apiCategories.map((item) => item.toLowerCase()));

    return marketplaceCategories.map((item) => ({
      ...item,
      available:
        apiCategories.length === 0 ||
        known.has(item.name.toLowerCase()),
    }));
  }, [apiCategories]);

  const featuredProducts = products.slice(0, 8);
  const remainingProducts = products.slice(8);

  const resultsLabel =
    products.length === 1
      ? "1 available product"
      : `${products.length} available products`;

  function submitSearch(event) {
    event.preventDefault();
    setSearch(cleanString(searchInput));
  }

  function chooseCategory(value) {
    setCategory(value);
    window.scrollTo({
      top: 520,
      behavior: "smooth",
    });
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
  }

  return (
    <div className="storvex-landing storvex-marketplace">
      <MarketplaceHeader />

      <main>

        <nav className="svx-commerce-category-nav">
          <div>
            <button
              type="button"
              className={!category ? "is-active" : ""}
              onClick={() => chooseCategory("")}
            >
              All products
            </button>

            {marketplaceCategories.map((item) => (
              <button
                type="button"
                key={item.name}
                className={category === item.name ? "is-active" : ""}
                onClick={() => chooseCategory(item.name)}
              >
                {item.shortName}
              </button>
            ))}
          </div>
        </nav>

        <section className="svx-commerce-hero">
          <div className="svx-commerce-hero-inner">
            <div className="svx-marketplace-hero-final">
              <div className="svx-marketplace-hero-copy">


                <h1>
                  Find products available from local stores.
                </h1>

                <p>
                  Search products and sellers, compare what is
                  available, then confirm pickup or delivery directly
                  with the store.
                </p>

                <form
                  className="svx-marketplace-hero-search"
                  onSubmit={submitSearch}
                >
                  <Search size={19} strokeWidth={2.2} />

                  <input
                    value={searchInput}
                    onChange={(event) =>
                      setSearchInput(event.target.value)
                    }
                    placeholder="Search products or stores"
                    aria-label="Search products or stores"
                  />

                  <button type="submit">Search</button>
                </form>

                <a
                  href="#marketplace-products"
                  className="svx-marketplace-hero-link"
                >
                  Browse available products
                  <ArrowRight size={15} />
                </a>
              </div>

              <div
                className="svx-marketplace-hero-visual"
                aria-hidden="true"
              >
                <div className="svx-marketplace-network">
                  <svg
                    viewBox="0 0 620 390"
                    role="presentation"
                    focusable="false"
                  >
                    <g className="svx-marketplace-network-lines">
                      <path d="M310 188 L128 88" />
                      <path d="M310 188 L492 88" />
                      <path d="M310 188 L105 276" />
                      <path d="M310 188 L515 276" />
                      <path d="M310 188 L310 326" />
                    </g>

                    <g className="svx-marketplace-network-node">
                      <rect
                        x="58"
                        y="48"
                        width="140"
                        height="76"
                        rx="12"
                      />
                      <circle cx="88" cy="76" r="15" />
                      <path d="M81 70h14v12H81z" />
                      <path d="M85 67h6" />
                      <text x="145" y="76">Electronics</text>
                      <text className="is-muted" x="145" y="96">
                        Phones and devices
                      </text>
                    </g>

                    <g className="svx-marketplace-network-node">
                      <rect
                        x="422"
                        y="48"
                        width="140"
                        height="76"
                        rx="12"
                      />
                      <circle cx="452" cy="76" r="15" />
                      <path d="M445 83l14-14" />
                      <path d="M451 69l8 8" />
                      <text x="509" y="76">Hardware</text>
                      <text className="is-muted" x="509" y="96">
                        Tools and materials
                      </text>
                    </g>

                    <g className="svx-marketplace-network-node">
                      <rect
                        x="35"
                        y="242"
                        width="155"
                        height="76"
                        rx="12"
                      />
                      <circle cx="66" cy="270" r="15" />
                      <path d="M58 271l8-7 8 7v9H58z" />
                      <text x="130" y="270">
                        Home &amp; kitchen
                      </text>
                      <text className="is-muted" x="130" y="290">
                        Everyday materials
                      </text>
                    </g>

                    <g className="svx-marketplace-network-node">
                      <rect
                        x="430"
                        y="242"
                        width="155"
                        height="76"
                        rx="12"
                      />
                      <circle cx="461" cy="270" r="15" />
                      <path d="M456 276h10" />
                      <path d="M457 272a6 6 0 1 1 8 0" />
                      <text x="525" y="270">Lighting</text>
                      <text className="is-muted" x="525" y="290">
                        Bulbs and fixtures
                      </text>
                    </g>

                    <g className="svx-marketplace-network-node">
                      <rect
                        x="245"
                        y="320"
                        width="130"
                        height="54"
                        rx="12"
                      />
                      <circle cx="272" cy="347" r="14" />
                      <path d="M266 353l12-12" />
                      <circle cx="267" cy="352" r="3" />
                      <text x="326" y="344">Spare parts</text>
                      <text className="is-muted" x="326" y="360">
                        Parts and replacements
                      </text>
                    </g>

                    <g className="svx-marketplace-network-center">
                      <rect
                        className="svx-marketplace-hub-shell"
                        x="234"
                        y="117"
                        width="152"
                        height="142"
                        rx="24"
                      />

                      <rect
                        className="svx-marketplace-hub-icon"
                        x="281"
                        y="132"
                        width="58"
                        height="52"
                        rx="16"
                      />

                      <path d="M292 154h36l-4-12h-28z" />
                      <path d="M296 154v22h28v-22" />
                      <path d="M304 176v-11h12v11" />
                      <path d="M292 154c0 6 9 6 9 0" />
                      <path d="M301 154c0 6 9 6 9 0" />
                      <path d="M310 154c0 6 9 6 9 0" />
                      <path d="M319 154c0 6 9 6 9 0" />

                      <text
                        className="svx-marketplace-hub-title"
                        x="310"
                        y="205"
                      >
                        Storvex
                      </text>

                      <text
                        className="svx-marketplace-hub-copy"
                        x="310"
                        y="224"
                      >
                        Local stores and available stock
                      </text>

                      <text
                        className="svx-marketplace-hub-copy"
                        x="310"
                        y="240"
                      >
                        Pickup or seller delivery
                      </text>
                    </g>
                  </svg>

                  <div className="svx-marketplace-network-status">
                    <span>
                      <Check size={15} />
                      Available stock
                    </span>

                    <span>
                      <Store size={15} />
                      Local sellers
                    </span>

                    <span>
                      <Truck size={15} />
                      Pickup or delivery
                    </span>
                  </div>
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
                    ? "Search results"
                    : "Fresh on Marketplace"}
                </span>

                <h2>
                  {category
                    ? category
                    : search
                      ? `Results for “${search}”`
                      : "New and available products"}
                </h2>
              </div>

              <strong>{loading ? "Loading" : resultsLabel}</strong>
            </div>

            {loading ? <LoadingProducts /> : null}

            {!loading && error ? (
              <div className="svx-commerce-state">
                <AlertCircle size={31} />
                <h2>Marketplace is temporarily unavailable</h2>
                <p>{error}</p>

                <button type="button" onClick={loadMarketplace}>
                  <RefreshCw size={16} />
                  Try again
                </button>
              </div>
            ) : null}

            {!loading && !error && products.length === 0 ? (
              <div className="svx-commerce-state">
                <PackageSearch size={34} />
                <h2>No matching products found</h2>
                <p>
                  Change your search or category to see other available
                  products.
                </p>

                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : null}

            {!loading &&
            !error &&
            featuredProducts.length > 0 ? (
              <div className="svx-commerce-product-grid">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={`${product.seller.slug}-${product.slug}`}
                    product={product}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {!loading &&
          !error &&
          remainingProducts.length > 0 ? (
            <div className="svx-commerce-section">
              <div className="svx-commerce-section-heading">
                <div>
                  <span>More to explore</span>
                  <h2>More available products</h2>
                </div>
              </div>

              <div className="svx-commerce-product-grid">
                {remainingProducts.map((product) => (
                  <ProductCard
                    key={`${product.seller.slug}-${product.slug}`}
                    product={product}
                  />
                ))}
              </div>
            </div>
          ) : null}

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

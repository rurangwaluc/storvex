import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Cpu,
  Drill,
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
  Store,
  Sun,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import {
  listMarketplaceProducts,
  listMarketplaceStores,
} from "../../services/marketplaceApi";
import { useTheme } from "../../hooks/useTheme";

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

  try {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleOutside(event) {
      if (!headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
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

  return (
    <header
      ref={headerRef}
      className={cx("svx-header", menuOpen && "is-menu-open")}
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

        <nav className="svx-nav" aria-label="Marketplace navigation">
          <Link to="/">For businesses</Link>
          <Link to="/marketplace" className="svx-marketplace-nav-active">
            Marketplace
          </Link>

        </nav>

        <div className="svx-header-actions">
          <button
            type="button"
            className="svx-theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-pressed={isDark}
          >
            <span className={cx("svx-theme-option", !isDark && "active")}>
              <Sun size={15} strokeWidth={2.4} />
            </span>

            <span className={cx("svx-theme-option", isDark && "active")}>
              <Moon size={15} strokeWidth={2.4} />
            </span>
          </button>

          <Link to="/login" className="svx-login-link">
            Owner access
          </Link>

          <Link to="/signup" className="svx-header-cta">
            Sell on Storvex
          </Link>

          <button
            type="button"
            className="svx-mobile-menu-button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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
  );
}

function ProductCard({ product }) {
  return (
    <Link
      to={`/marketplace/${encodeURIComponent(
        product.seller.slug,
      )}/${encodeURIComponent(product.slug)}`}
      className="svx-commerce-product-card"
    >
      <div className="svx-commerce-product-image">
        <img
          src={product.image?.url}
          alt={product.image?.altText || product.title}
          loading="lazy"
        />

        {product.seller?.temporarilyClosed ? (
          <span className="is-closed">Store closed</span>
        ) : product.availableQuantity <= 3 ? (
          <span>Few remaining</span>
        ) : (
          <span className="is-available">Available</span>
        )}
      </div>

      <div className="svx-commerce-product-content">
        <p>
          <Store size={13} />
          {product.seller?.name}
        </p>

        <h3>{product.title}</h3>

        <div className="svx-commerce-product-meta">
          {product.pickupEnabled ? <span>Pickup</span> : null}
          {product.deliveryEnabled ? <span>Delivery</span> : null}
        </div>

        <div className="svx-commerce-product-price">
          <strong>
            {formatMoney(product.price, product.currency)}
          </strong>

          <span>
            View
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
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
            <div className="svx-marketplace-masthead">
              <div className="svx-marketplace-masthead-copy">
                <span>Storvex Marketplace</span>

                <h1>Find products from local stores.</h1>

                <p>
                  Search available products and stores, then confirm
                  pickup or delivery directly with the seller.
                </p>
              </div>

              <form
                className="svx-marketplace-masthead-search"
                onSubmit={submitSearch}
              >
                <Search size={20} strokeWidth={2.2} />

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

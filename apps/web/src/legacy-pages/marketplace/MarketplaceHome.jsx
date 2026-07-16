import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Menu,
  Moon,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Sun,
  Truck,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import {
  listMarketplaceProducts,
  listMarketplaceStores,
} from "../../services/marketplaceApi";
import { useTheme } from "../../hooks/useTheme";
import "./MarketplacePublic.css";

const darkLogo = "/storvex_dark.webp";
const whiteLogo = "/storvex_white.webp";

const DESKTOP_PRODUCT_LIMIT = 8;
const MOBILE_PRODUCT_LIMIT = 6;
const FEATURED_STORE_LIMIT = 4;

const MAIN_CATEGORIES = [
  {
    key: "Electronics",
    label: "Electronics",
    description: "Phones, computers, TVs and accessories",
  },
  {
    key: "Hardware",
    label: "Hardware",
    description: "Building materials, tools and supplies",
  },
  {
    key: "Home & kitchen",
    label: "Home & kitchen",
    description: "Cookware, appliances and home products",
  },
  {
    key: "Lighting",
    label: "Lighting",
    description: "Bulbs, fixtures, cables and solar lights",
  },
  {
    key: "Spare parts",
    label: "Spare parts",
    description: "Replacement parts and components",
  },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return cleanString(value).toLocaleLowerCase();
}

function formatMoney(value, currency = "RWF") {
  const amount = Number(value || 0);

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

function productSubcategory(product) {
  return cleanString(
    product?.subcategory ||
      product?.attributes?.subcategory ||
      product?.attributes?.subCategory,
  );
}

function productSubSubcategory(product) {
  return cleanString(
    product?.subSubcategory ||
      product?.attributes?.subSubcategory ||
      product?.attributes?.sub_subcategory ||
      product?.attributes?.productType,
  );
}

function storePlace(store) {
  return [
    cleanString(store?.location?.sector),
    cleanString(store?.location?.district),
  ]
    .filter(Boolean)
    .join(", ");
}

function isFeaturedStoreEligible(store) {
  return Boolean(
    store?.featuredEligible ||
      store?.marketplaceFeaturedStoreEligible ||
      store?.entitlements?.marketplaceFeaturedStoreEligible,
  );
}

function useMobileViewport() {
  const [mobile, setMobile] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(max-width: 760px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");

    function update() {
      setMobile(media.matches);
    }

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

function MarketplaceHeader() {
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function closeOutside(event) {
      if (!headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function closeEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("touchstart", closeOutside, {
      passive: true,
    });
    document.addEventListener("keydown", closeEscape);

    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("touchstart", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className={cx(
        "svx-public-marketplace-header",
        menuOpen && "is-open",
      )}
    >
      <div className="svx-public-marketplace-header-inner">
        <Link
          to="/"
          className="svx-public-marketplace-logo"
          aria-label="Storvex home"
          onClick={() => setMenuOpen(false)}
        >
          <img src={isDark ? whiteLogo : darkLogo} alt="Storvex" />
        </Link>

        <nav className="svx-public-marketplace-desktop-nav">
          <Link to="/">For businesses</Link>

          <Link to="/marketplace" className="is-active">
            Marketplace
          </Link>

          <Link to="/login">Owner access</Link>

          <button
            type="button"
            className="svx-public-marketplace-theme"
            onClick={toggleTheme}
            aria-label={
              isDark ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <Link to="/signup" className="svx-public-marketplace-sell">
            Sell on Storvex
          </Link>
        </nav>

        <div className="svx-public-marketplace-mobile-actions">
          <button
            type="button"
            className="svx-public-marketplace-theme"
            onClick={toggleTheme}
            aria-label={
              isDark ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            className="svx-public-marketplace-menu-button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="svx-public-marketplace-mobile-menu">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            For businesses
          </Link>

          <Link
            to="/marketplace"
            className="is-active"
            onClick={() => setMenuOpen(false)}
          >
            Marketplace
          </Link>

          <Link to="/login" onClick={() => setMenuOpen(false)}>
            Owner access
          </Link>

          <Link
            to="/signup"
            className="is-primary"
            onClick={() => setMenuOpen(false)}
          >
            Sell on Storvex
          </Link>
        </div>
      ) : null}
    </header>
  );
}

function LoadingGrid({ count = 8 }) {
  return (
    <div
      className="svx-public-marketplace-loading-grid"
      aria-label="Loading Marketplace"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="svx-public-marketplace-loading-card">
          <span />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <Link
      to={`/marketplace/${encodeURIComponent(
        product.seller.slug,
      )}/${encodeURIComponent(product.slug)}`}
      className="svx-public-product-card"
    >
      <div className="svx-public-product-image">
        <img
          src={product.image?.url}
          alt={product.image?.altText || product.title}
          loading="lazy"
        />

        {product.seller?.temporarilyClosed ? (
          <span className="is-closed">Temporarily closed</span>
        ) : Number(product.availableQuantity || 0) <= 3 ? (
          <span>Few remaining</span>
        ) : null}
      </div>

      <div className="svx-public-product-body">
        <p className="svx-public-product-store">
          <Store size={14} />
          {product.seller?.name}
        </p>

        <h3>{product.title}</h3>

        <div className="svx-public-product-meta">
          {product.category ? <span>{product.category}</span> : null}

          {product.pickupEnabled ? <span>Pickup</span> : null}

          {product.deliveryEnabled ? <span>Delivery</span> : null}
        </div>

        <div className="svx-public-product-bottom">
          <strong>{formatMoney(product.price, product.currency)}</strong>

          <span>
            View
            <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function StoreCard({ store }) {
  const place = storePlace(store);

  return (
    <Link
      to={`/marketplace/${encodeURIComponent(store.slug)}`}
      className="svx-public-store-card"
    >
      <div className="svx-public-store-logo">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt="" loading="lazy" />
        ) : (
          <Store size={23} />
        )}
      </div>

      <div className="svx-public-store-copy">
        <div className="svx-public-store-title">
          <h3>{store.name}</h3>

          <span
            className={
              store.temporarilyClosed ? "is-closed" : "is-open"
            }
          >
            {store.temporarilyClosed ? "Closed" : "Open"}
          </span>
        </div>

        {place ? (
          <p>
            <MapPin size={14} />
            {place}
          </p>
        ) : null}

        <div className="svx-public-store-facts">
          <span>
            <ShoppingBag size={14} />
            {store.availableProductCount} available
          </span>

          {store.pickupEnabled ? <span>Pickup</span> : null}

          {store.deliveryEnabled ? (
            <span>
              <Truck size={14} />
              Delivery
            </span>
          ) : null}
        </div>
      </div>

      <ArrowRight size={18} />
    </Link>
  );
}

function FilterChoice({
  checked,
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      className={cx(
        "svx-market-filter-choice",
        checked && "is-selected",
      )}
      onClick={onClick}
      aria-pressed={checked}
    >
      <span>{checked ? <Check size={14} /> : null}</span>
      {label}
    </button>
  );
}

function MobileFilterDrawer({
  open,
  onClose,
  draft,
  setDraft,
  categories,
  subcategories,
  subSubcategories,
  stores,
  locations,
  onApply,
  onClear,
}) {
  const [categoryLevel, setCategoryLevel] = useState("filters");

  useEffect(() => {
    if (!open) {
      setCategoryLevel("filters");
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeEscape(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  function chooseCategory(value) {
    setDraft((current) => ({
      ...current,
      category: value,
      subcategory: "",
      subSubcategory: "",
    }));

    if (value) setCategoryLevel("subcategory");
    else setCategoryLevel("filters");
  }

  function chooseSubcategory(value) {
    setDraft((current) => ({
      ...current,
      subcategory: value,
      subSubcategory: "",
    }));

    if (value && subSubcategories.length) {
      setCategoryLevel("subSubcategory");
    } else {
      setCategoryLevel("filters");
    }
  }

  function chooseSubSubcategory(value) {
    setDraft((current) => ({
      ...current,
      subSubcategory: value,
    }));
    setCategoryLevel("filters");
  }

  return (
    <div className="svx-market-filter-drawer" role="dialog" aria-modal="true">
      <button
        type="button"
        className="svx-market-filter-backdrop"
        onClick={onClose}
        aria-label="Close filters"
      />

      <section className="svx-market-filter-sheet">
        <header>
          {categoryLevel !== "filters" ? (
            <button
              type="button"
              onClick={() => {
                if (categoryLevel === "subSubcategory") {
                  setCategoryLevel("subcategory");
                } else {
                  setCategoryLevel("filters");
                }
              }}
              aria-label="Go back"
            >
              <ChevronLeft size={21} />
            </button>
          ) : (
            <span />
          )}

          <strong>
            {categoryLevel === "filters"
              ? "Filters"
              : categoryLevel === "subcategory"
                ? draft.category || "Category"
                : draft.subcategory || "Subcategory"}
          </strong>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={21} />
          </button>
        </header>

        {categoryLevel === "subcategory" ? (
          <div className="svx-market-mobile-category-list">
            <button type="button" onClick={() => chooseSubcategory("")}>
              <span>All {draft.category}</span>
              <ChevronRight size={18} />
            </button>

            {subcategories.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => chooseSubcategory(item)}
              >
                <span>{item}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : null}

        {categoryLevel === "subSubcategory" ? (
          <div className="svx-market-mobile-category-list">
            <button
              type="button"
              onClick={() => chooseSubSubcategory("")}
            >
              <span>All {draft.subcategory}</span>
              <ChevronRight size={18} />
            </button>

            {subSubcategories.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => chooseSubSubcategory(item)}
              >
                <span>{item}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : null}

        {categoryLevel === "filters" ? (
          <div className="svx-market-filter-sheet-body">
            <section>
              <h3>Category</h3>

              <button
                type="button"
                className="svx-market-filter-select"
                onClick={() => setCategoryLevel("category")}
              >
                <span>
                  {[
                    draft.category,
                    draft.subcategory,
                    draft.subSubcategory,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "All categories"}
                </span>
                <ChevronRight size={18} />
              </button>

              {categoryLevel === "category" ? null : null}
            </section>

            <section>
              <h3>Store</h3>

              <select
                value={draft.store}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    store: event.target.value,
                  }))
                }
              >
                <option value="">All stores</option>

                {stores.map((store) => (
                  <option key={store.slug} value={store.slug}>
                    {store.name}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3>Location</h3>

              <select
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
              >
                <option value="">All locations</option>

                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3>Receiving options</h3>

              <div className="svx-market-filter-choice-grid">
                <FilterChoice
                  checked={draft.pickup}
                  label="Pickup"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      pickup: !current.pickup,
                    }))
                  }
                />

                <FilterChoice
                  checked={draft.delivery}
                  label="Delivery"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      delivery: !current.delivery,
                    }))
                  }
                />
              </div>
            </section>

            <section>
              <h3>Price</h3>

              <div className="svx-market-filter-price">
                <label>
                  <span>Minimum</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={draft.minPrice}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        minPrice: event.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>

                <label>
                  <span>Maximum</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={draft.maxPrice}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        maxPrice: event.target.value,
                      }))
                    }
                    placeholder="Any"
                  />
                </label>
              </div>
            </section>
          </div>
        ) : null}

        {categoryLevel === "category" ? (
          <div className="svx-market-mobile-category-list is-overlay-list">
            <button type="button" onClick={() => chooseCategory("")}>
              <span>All categories</span>
              <ChevronRight size={18} />
            </button>

            {categories.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => chooseCategory(item)}
              >
                <span>{item}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        ) : null}

        {categoryLevel === "filters" ? (
          <footer>
            <button type="button" onClick={onClear}>
              Clear
            </button>

            <button type="button" className="is-primary" onClick={onApply}>
              Show products
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}

export default function MarketplaceHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mobile = useMobileViewport();

  const initialFilters = useMemo(
    () => ({
      search: cleanString(searchParams.get("search")),
      category: cleanString(searchParams.get("category")),
      subcategory: cleanString(searchParams.get("subcategory")),
      subSubcategory: cleanString(searchParams.get("subSubcategory")),
      store: cleanString(searchParams.get("store")),
      location: cleanString(searchParams.get("location")),
      pickup: searchParams.get("pickup") === "true",
      delivery: searchParams.get("delivery") === "true",
      minPrice: cleanString(searchParams.get("minPrice")),
      maxPrice: cleanString(searchParams.get("maxPrice")),
    }),
    [],
  );

  const [searchInput, setSearchInput] = useState(initialFilters.search);
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);

  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productData, storeData] = await Promise.all([
        listMarketplaceProducts({
          search: filters.search,
          category: filters.category,
          limit: 60,
        }),
        listMarketplaceStores({
          search: filters.search,
          limit: 60,
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
        Array.isArray(storeData?.stores) ? storeData.stores : [],
      );
    } catch (loadError) {
      setError(marketplaceErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.category]);

  useEffect(() => {
    loadMarketplace();
  }, [loadMarketplace]);

  useEffect(() => {
    const next = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value === "" || value === false || value == null) return;
      next[key] = String(value);
    });

    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  const storesBySlug = useMemo(
    () => new Map(stores.map((store) => [store.slug, store])),
    [stores],
  );

  const enrichedProducts = useMemo(
    () =>
      products.map((product) => {
        const fullStore = storesBySlug.get(product?.seller?.slug);

        return {
          ...product,
          seller: {
            ...(product.seller || {}),
            ...(fullStore || {}),
          },
          pickupEnabled:
            product.pickupEnabled ??
            fullStore?.pickupEnabled ??
            false,
          deliveryEnabled:
            product.deliveryEnabled ??
            fullStore?.deliveryEnabled ??
            false,
        };
      }),
    [products, storesBySlug],
  );

  const categories = useMemo(() => {
    const values = [
      ...MAIN_CATEGORIES.map((item) => item.label),
      ...apiCategories,
      ...enrichedProducts.map((product) => product.category),
    ]
      .map(cleanString)
      .filter(Boolean);

    return Array.from(new Set(values));
  }, [apiCategories, enrichedProducts]);

  const subcategories = useMemo(() => {
    const selectedCategory = normalizeLower(
      draftFilters.category || filters.category,
    );

    return Array.from(
      new Set(
        enrichedProducts
          .filter(
            (product) =>
              !selectedCategory ||
              normalizeLower(product.category) === selectedCategory,
          )
          .map(productSubcategory)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [
    draftFilters.category,
    filters.category,
    enrichedProducts,
  ]);

  const subSubcategories = useMemo(() => {
    const selectedSubcategory = normalizeLower(
      draftFilters.subcategory || filters.subcategory,
    );

    return Array.from(
      new Set(
        enrichedProducts
          .filter(
            (product) =>
              !selectedSubcategory ||
              normalizeLower(productSubcategory(product)) ===
                selectedSubcategory,
          )
          .map(productSubSubcategory)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [
    draftFilters.subcategory,
    filters.subcategory,
    enrichedProducts,
  ]);

  const locations = useMemo(
    () =>
      Array.from(
        new Set(stores.map(storePlace).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [stores],
  );

  const filteredProducts = useMemo(() => {
    const selectedSubcategory = normalizeLower(filters.subcategory);
    const selectedSubSubcategory = normalizeLower(
      filters.subSubcategory,
    );
    const selectedLocation = normalizeLower(filters.location);
    const minimum = Number(filters.minPrice);
    const maximum = Number(filters.maxPrice);
    const hasMinimum =
      filters.minPrice !== "" && Number.isFinite(minimum);
    const hasMaximum =
      filters.maxPrice !== "" && Number.isFinite(maximum);

    return enrichedProducts.filter((product) => {
      const seller = product.seller || {};
      const price = Number(product.price || 0);

      if (
        filters.store &&
        cleanString(seller.slug) !== filters.store
      ) {
        return false;
      }

      if (
        selectedSubcategory &&
        normalizeLower(productSubcategory(product)) !==
          selectedSubcategory
      ) {
        return false;
      }

      if (
        selectedSubSubcategory &&
        normalizeLower(productSubSubcategory(product)) !==
          selectedSubSubcategory
      ) {
        return false;
      }

      if (
        selectedLocation &&
        normalizeLower(storePlace(seller)) !== selectedLocation
      ) {
        return false;
      }

      if (filters.pickup && !product.pickupEnabled) return false;
      if (filters.delivery && !product.deliveryEnabled) return false;
      if (hasMinimum && price < minimum) return false;
      if (hasMaximum && price > maximum) return false;

      return Number(product.availableQuantity || 0) > 0;
    });
  }, [enrichedProducts, filters]);

  const featuredStores = useMemo(
    () =>
      stores
        .filter(isFeaturedStoreEligible)
        .filter(
          (store) =>
            Number(store.availableProductCount || 0) > 0 &&
            !store.temporarilyClosed,
        )
        .slice(0, FEATURED_STORE_LIMIT),
    [stores],
  );

  const visibleProductLimit = mobile
    ? MOBILE_PRODUCT_LIMIT
    : DESKTOP_PRODUCT_LIMIT;

  const visibleProducts = filteredProducts.slice(
    0,
    visibleProductLimit,
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filters.category,
        filters.subcategory,
        filters.subSubcategory,
        filters.store,
        filters.location,
        filters.pickup,
        filters.delivery,
        filters.minPrice,
        filters.maxPrice,
      ].filter(Boolean).length,
    [filters],
  );

  function submitSearch(event) {
    event.preventDefault();

    const search = cleanString(searchInput);

    setFilters((current) => ({
      ...current,
      search,
    }));

    setDraftFilters((current) => ({
      ...current,
      search,
    }));
  }

  function chooseCategory(category) {
    setFilters((current) => ({
      ...current,
      category,
      subcategory: "",
      subSubcategory: "",
    }));

    setDraftFilters((current) => ({
      ...current,
      category,
      subcategory: "",
      subSubcategory: "",
    }));
  }

  function clearFilters() {
    const empty = {
      search: "",
      category: "",
      subcategory: "",
      subSubcategory: "",
      store: "",
      location: "",
      pickup: false,
      delivery: false,
      minPrice: "",
      maxPrice: "",
    };

    setSearchInput("");
    setFilters(empty);
    setDraftFilters(empty);
    setFilterOpen(false);
  }

  function openFilters() {
    setDraftFilters(filters);
    setFilterOpen(true);
  }

  function applyFilters() {
    setFilters({
      ...draftFilters,
      search: filters.search,
    });
    setFilterOpen(false);
  }

  return (
    <div className="svx-public-marketplace">
      <MarketplaceHeader />

      <main>
        <section className="svx-market-search-section">
          <div className="svx-market-search-inner">
            <div className="svx-market-search-copy">
              <span>Storvex Marketplace</span>
              <h1>Find products available from real stores.</h1>
              <p>
                Search products, compare stores and confirm pickup or
                delivery directly with the seller.
              </p>
            </div>

            <form onSubmit={submitSearch}>
              <Search size={20} />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value)
                }
                placeholder="Search products or stores"
                aria-label="Search Marketplace"
              />

              <button type="submit">Search</button>
            </form>
          </div>
        </section>

        <section className="svx-market-category-band">
          <div>
            <button
              type="button"
              className={cx(
                "svx-market-category-button",
                !filters.category && "is-active",
              )}
              onClick={() => chooseCategory("")}
            >
              All products
            </button>

            {MAIN_CATEGORIES.map((item) => (
              <button
                type="button"
                key={item.key}
                className={cx(
                  "svx-market-category-button",
                  filters.category === item.label && "is-active",
                )}
                onClick={() => chooseCategory(item.label)}
              >
                {item.label}
              </button>
            ))}

            <button
              type="button"
              className="svx-market-category-filter-button"
              onClick={openFilters}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount ? (
                <span>{activeFilterCount}</span>
              ) : null}
            </button>
          </div>
        </section>

        <section className="svx-market-main-shell">
          {featuredStores.length ? (
            <section className="svx-public-store-section">
              <div className="svx-public-section-heading">
                <div>
                  <span>Featured stores</span>
                  <h2>Stores with products available now</h2>
                </div>

                <button type="button">
                  View all stores
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="svx-public-store-grid">
                {featuredStores.map((store) => (
                  <StoreCard key={store.slug} store={store} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="svx-public-products-section">
            <div className="svx-public-section-heading">
              <div>
                <span>New and available products</span>
                <h2>
                  {filters.category || "Products available now"}
                </h2>
              </div>

              <div className="svx-market-results-actions">
                <strong>
                  {loading
                    ? "Loading"
                    : `${filteredProducts.length} ${
                        filteredProducts.length === 1
                          ? "product"
                          : "products"
                      }`}
                </strong>

                <button type="button" onClick={openFilters}>
                  <Filter size={16} />
                  Filter
                  {activeFilterCount ? (
                    <span>{activeFilterCount}</span>
                  ) : null}
                </button>
              </div>
            </div>

            {activeFilterCount ? (
              <div className="svx-market-active-filters">
                {filters.category ? (
                  <button
                    type="button"
                    onClick={() => chooseCategory("")}
                  >
                    {filters.category}
                    <X size={14} />
                  </button>
                ) : null}

                {filters.subcategory ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        subcategory: "",
                        subSubcategory: "",
                      }))
                    }
                  >
                    {filters.subcategory}
                    <X size={14} />
                  </button>
                ) : null}

                {filters.store ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        store: "",
                      }))
                    }
                  >
                    {storesBySlug.get(filters.store)?.name ||
                      filters.store}
                    <X size={14} />
                  </button>
                ) : null}

                {filters.pickup ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        pickup: false,
                      }))
                    }
                  >
                    Pickup
                    <X size={14} />
                  </button>
                ) : null}

                {filters.delivery ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        delivery: false,
                      }))
                    }
                  >
                    Delivery
                    <X size={14} />
                  </button>
                ) : null}

                <button
                  type="button"
                  className="is-clear"
                  onClick={clearFilters}
                >
                  Clear all
                </button>
              </div>
            ) : null}

            {loading ? (
              <LoadingGrid
                count={
                  mobile
                    ? MOBILE_PRODUCT_LIMIT
                    : DESKTOP_PRODUCT_LIMIT
                }
              />
            ) : null}

            {!loading && error ? (
              <div className="svx-public-marketplace-state">
                <AlertCircle size={30} />
                <h2>Marketplace is temporarily unavailable</h2>
                <p>{error}</p>

                <button type="button" onClick={loadMarketplace}>
                  <RefreshCw size={16} />
                  Try again
                </button>
              </div>
            ) : null}

            {!loading && !error && !visibleProducts.length ? (
              <div className="svx-public-marketplace-state">
                <PackageSearch size={32} />
                <h2>No matching products found</h2>
                <p>
                  Change the search, category, store or price filters
                  to see other available products.
                </p>

                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : null}

            {!loading && !error && visibleProducts.length ? (
              <>
                <div className="svx-public-product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={`${product.seller.slug}-${product.slug}`}
                      product={product}
                    />
                  ))}
                </div>

                {filteredProducts.length > visibleProducts.length ? (
                  <div className="svx-market-view-more">
                    <button type="button">
                      View all {filteredProducts.length} products
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          <section className="svx-market-receiving-section">
            <article>
              <Store size={22} />

              <div>
                <h3>Confirm with the store</h3>
                <p>
                  Ask the seller to confirm the product before you
                  travel or arrange delivery.
                </p>
              </div>
            </article>

            <article>
              <ShoppingBag size={22} />

              <div>
                <h3>Pickup from the store</h3>
                <p>
                  Collect confirmed products from the seller’s store
                  when pickup is available.
                </p>
              </div>
            </article>

            <article>
              <Truck size={22} />

              <div>
                <h3>Seller managed delivery</h3>
                <p>
                  The store confirms the address, delivery fee and
                  delivery time with the customer.
                </p>
              </div>
            </article>
          </section>

          <section className="svx-market-seller-cta">
            <div>
              <span>For retailers</span>
              <h2>Manage your store and reach more customers.</h2>
              <p>
                Run sales, stock, staff and Marketplace products from
                one Storvex workspace.
              </p>
            </div>

            <Link to="/signup">
              Sell on Storvex
              <ArrowRight size={17} />
            </Link>
          </section>
        </section>
      </main>

      <footer className="svx-public-marketplace-footer">
        <div>
          <img src={whiteLogo} alt="Storvex" />

          <p>
            Products from businesses managing their stores with
            Storvex.
          </p>
        </div>

        <nav>
          <Link to="/">For businesses</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/login">Owner access</Link>
        </nav>
      </footer>

      <MobileFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        draft={draftFilters}
        setDraft={setDraftFilters}
        categories={categories}
        subcategories={subcategories}
        subSubcategories={subSubcategories}
        stores={stores}
        locations={locations}
        onApply={applyFilters}
        onClear={clearFilters}
      />
    </div>
  );
}

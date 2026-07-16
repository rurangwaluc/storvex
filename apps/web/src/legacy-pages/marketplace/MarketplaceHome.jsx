import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  MapPin,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Truck,
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

function cleanString(value) {
  return String(value || "").trim();
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

function MarketplaceHeader() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="svx-public-marketplace-header">
      <div className="svx-public-marketplace-header-inner">
        <Link to="/" className="svx-public-marketplace-logo" aria-label="Storvex home">
          <img src={isDark ? whiteLogo : darkLogo} alt="Storvex" />
        </Link>

        <nav>
          <Link to="/marketplace" className="is-active">
            Marketplace
          </Link>
          <Link to="/signup">Sell on Storvex</Link>
          <Link to="/login">Owner access</Link>

          <button type="button" onClick={toggleTheme}>
            {isDark ? "Light" : "Dark"}
          </button>
        </nav>
      </div>
    </header>
  );
}

function LoadingGrid() {
  return (
    <div className="svx-public-marketplace-loading-grid" aria-label="Loading Marketplace">
      {Array.from({ length: 8 }).map((_, index) => (
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
      to={`/marketplace/${encodeURIComponent(product.seller.slug)}/${encodeURIComponent(product.slug)}`}
      className="svx-public-product-card"
    >
      <div className="svx-public-product-image">
        <img
          src={product.image?.url}
          alt={product.image?.altText || product.title}
          loading="lazy"
        />

        {product.seller?.temporarilyClosed ? (
          <span className="is-closed">Store temporarily closed</span>
        ) : product.availableQuantity <= 3 ? (
          <span>Few remaining</span>
        ) : null}
      </div>

      <div className="svx-public-product-body">
        <p className="svx-public-product-store">
          <Store size={14} />
          {product.seller?.name}
        </p>

        <h2>{product.title}</h2>

        {product.category ? (
          <span className="svx-public-product-category">{product.category}</span>
        ) : null}

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
  const place = [store.location?.sector, store.location?.district]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      to={`/marketplace/${encodeURIComponent(store.slug)}`}
      className="svx-public-store-card"
    >
      <div className="svx-public-store-logo">
        {store.logoUrl ? (
          <img src={store.logoUrl} alt="" loading="lazy" />
        ) : (
          <Store size={24} />
        )}
      </div>

      <div className="svx-public-store-copy">
        <div className="svx-public-store-title">
          <h3>{store.name}</h3>

          {store.temporarilyClosed ? (
            <span>Temporarily closed</span>
          ) : (
            <span className="is-open">Open for requests</span>
          )}
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
            {store.availableProductCount} products
          </span>

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

export default function MarketplaceHome() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = cleanString(searchParams.get("search"));
  const initialCategory = cleanString(searchParams.get("category"));

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);

  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);

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

      setProducts(Array.isArray(productData?.products) ? productData.products : []);
      setCategories(
        Array.isArray(productData?.categories) ? productData.categories : [],
      );
      setStores(Array.isArray(storeData?.stores) ? storeData.stores : []);
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

  const resultsLabel = useMemo(() => {
    if (loading) return "Loading products";
    if (products.length === 1) return "1 available product";
    return `${products.length} available products`;
  }, [loading, products.length]);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(cleanString(searchInput));
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
  }

  return (
    <div className="svx-public-marketplace">
      <MarketplaceHeader />

      <main>
        <section className="svx-public-marketplace-hero">
          <div className="svx-public-marketplace-hero-inner">
            <div>
              <span className="svx-public-marketplace-kicker">
                Products from real stores
              </span>

              <h1>Find what is available before visiting the store.</h1>

              <p>
                Browse products published by Storvex businesses. Contact the store,
                confirm availability, then arrange pickup or seller-managed delivery.
              </p>
            </div>

            <form onSubmit={submitSearch}>
              <Search size={20} />

              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search phones, lighting, hardware, spare parts..."
                aria-label="Search Marketplace"
              />

              <button type="submit">Search</button>
            </form>
          </div>
        </section>

        <section className="svx-public-marketplace-shell">
          {stores.length > 0 && !loading && !error ? (
            <div className="svx-public-store-section">
              <div className="svx-public-section-heading">
                <div>
                  <span>Stores</span>
                  <h2>Businesses you can explore</h2>
                </div>
              </div>

              <div className="svx-public-store-grid">
                {stores.map((store) => (
                  <StoreCard key={store.slug} store={store} />
                ))}
              </div>
            </div>
          ) : null}

          <div className="svx-public-products-section">
            <div className="svx-public-section-heading">
              <div>
                <span>Marketplace catalogue</span>
                <h2>Available products</h2>
              </div>

              <strong>{resultsLabel}</strong>
            </div>

            {categories.length > 0 ? (
              <div className="svx-public-category-row">
                <button
                  type="button"
                  className={!category ? "is-active" : ""}
                  onClick={() => setCategory("")}
                >
                  All products
                </button>

                {categories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? "is-active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            {loading ? <LoadingGrid /> : null}

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

            {!loading && !error && products.length === 0 ? (
              <div className="svx-public-marketplace-state">
                <PackageSearch size={32} />
                <h2>No matching products found</h2>
                <p>
                  Change the search or category to see other available products.
                </p>

                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : null}

            {!loading && !error && products.length > 0 ? (
              <div className="svx-public-product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={`${product.seller.slug}-${product.slug}`}
                    product={product}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="svx-public-marketplace-footer">
        <div>
          <img src={whiteLogo} alt="Storvex" />

          <p>
            Discover products from businesses managing their stores with Storvex.
          </p>
        </div>

        <div>
          <Link to="/">About Storvex</Link>
          <Link to="/signup">Sell on Marketplace</Link>
          <Link to="/login">Owner access</Link>
        </div>
      </footer>
    </div>
  );
}

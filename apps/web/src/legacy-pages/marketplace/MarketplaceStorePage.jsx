import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  MapPin,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  Truck,
  X,
} from "lucide-react";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  getMarketplaceStore,
  listMarketplaceProducts,
} from "../../services/marketplaceApi";
import {
  LoadingProducts,
  MarketplaceFooter,
  MarketplaceHeader,
  ProductCard,
} from "./MarketplaceHome";
import {
  syncMarketplaceProductSnapshots,
} from "./marketplaceCustomerStore";
import {
  trackMarketplaceActivityQuietly,
} from "./marketplaceAnalytics";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";

const STORE_PAGE_SIZE = 12;

const sortOptions = [
  {
    value: "newest",
    label: "Newest",
  },
  {
    value: "price_asc",
    label: "Lowest price",
  },
  {
    value: "price_desc",
    label: "Highest price",
  },
  {
    value: "name",
    label: "Product name",
  },
];

const priceRanges = [
  {
    label: "Under 100K",
    minimum: "",
    maximum: "100000",
  },
  {
    label: "100K to 500K",
    minimum: "100000",
    maximum: "500000",
  },
  {
    label: "500K to 1M",
    minimum: "500000",
    maximum: "1000000",
  },
  {
    label: "Above 1M",
    minimum: "1000000",
    maximum: "",
  },
];

function cleanString(value) {
  return String(value || "").trim();
}

function cleanPrice(value) {
  const cleaned = String(value || "")
    .replace(/[^\d]/g, "")
    .replace(/^0+(?=\d)/, "");

  return cleaned;
}

function marketplaceErrorMessage(error) {
  return (
    error?.message ||
    error?.data?.message ||
    "This store could not be loaded. Check your connection and try again."
  );
}

function createWhatsAppUrl(phone, storeName) {
  const digits = String(phone || "")
    .replace(/[^\d]/g, "");

  if (!digits) return "";

  const message = encodeURIComponent(
    `Hello ${storeName}, I found your store on Storvex.`,
  );

  return `https://wa.me/${digits}?text=${message}`;
}

function releaseScrollLock() {
  document.body.style.removeProperty(
    "overflow",
  );
}

export default function MarketplaceStorePage() {
  const { storeSlug = "" } =
    useParams();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const initialSearch = cleanString(
    searchParams.get("search"),
  );

  const initialCategory = cleanString(
    searchParams.get("category"),
  );

  const initialSort =
    cleanString(
      searchParams.get("sort"),
    ) || "newest";

  const initialFulfilment = cleanString(
    searchParams.get("fulfilment"),
  );

  const initialMinimumPrice = cleanPrice(
    searchParams.get("minPrice"),
  );

  const initialMaximumPrice = cleanPrice(
    searchParams.get("maxPrice"),
  );

  const initialOnSale =
    searchParams.get("onSale") === "true";

  const initialPage = Math.max(
    1,
    Number(
      searchParams.get("page"),
    ) || 1,
  );

  const [storeDetails, setStoreDetails] =
    useState(null);

  const [categories, setCategories] =
    useState([]);

  const [products, setProducts] =
    useState([]);

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

  const [loadingStore, setLoadingStore] =
    useState(true);

  const [
    loadingProducts,
    setLoadingProducts,
  ] = useState(true);

  const [storeError, setStoreError] =
    useState("");

  const [
    productsError,
    setProductsError,
  ] = useState("");

  const [sortOpen, setSortOpen] =
    useState(false);

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const sortRef = useRef(null);
  const trackedStoreSlugRef = useRef("");
  const trackedSearchKeyRef = useRef("");

  const [pagination, setPagination] =
    useState({
      page: initialPage,
      limit: STORE_PAGE_SIZE,
      total: 0,
      pages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

  const selectedSort =
    sortOptions.find(
      (option) => option.value === sort,
    ) || sortOptions[0];

  const selectedPriceRange =
    priceRanges.find(
      (range) =>
        range.minimum === minimumPrice &&
        range.maximum === maximumPrice,
    ) || null;

  const activeFilterCount = [
    category,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
  ].filter(Boolean).length;

  const loadStore = useCallback(
    async () => {
      setLoadingStore(true);
      setStoreError("");

      try {
        const result =
          await getMarketplaceStore(
            storeSlug,
            {
              page: 1,
              limit: 1,
            },
          );

        setStoreDetails(
          result?.store || null,
        );

        setCategories(
          Array.isArray(result?.categories)
            ? result.categories
            : [],
        );
      } catch (error) {
        setStoreDetails(null);
        setStoreError(
          marketplaceErrorMessage(error),
        );
      } finally {
        setLoadingStore(false);
      }
    },
    [storeSlug],
  );

  const loadProducts = useCallback(
    async () => {
      setLoadingProducts(true);
      setProductsError("");

      try {
        const result =
          await listMarketplaceProducts({
            store: storeSlug,
            search,
            category,
            sort,
            fulfilment,
            minPrice: minimumPrice,
            maxPrice: maximumPrice,
            onSale:
              onSaleOnly || undefined,
            page,
            limit: STORE_PAGE_SIZE,
          });

        const nextProducts =
          Array.isArray(result?.products)
            ? result.products
            : [];

        setProducts(nextProducts);

        setPagination({
          page: Number(
            result?.pagination?.page || 1,
          ),
          limit: Number(
            result?.pagination?.limit ||
              STORE_PAGE_SIZE,
          ),
          total: Number(
            result?.pagination?.total || 0,
          ),
          pages: Math.max(
            1,
            Number(
              result?.pagination?.pages || 1,
            ),
          ),
          hasPreviousPage: Boolean(
            result?.pagination
              ?.hasPreviousPage,
          ),
          hasNextPage: Boolean(
            result?.pagination
              ?.hasNextPage,
          ),
        });
      } catch (error) {
        setProducts([]);
        setProductsError(
          marketplaceErrorMessage(error),
        );
      } finally {
        setLoadingProducts(false);
      }
    },
    [
      category,
      fulfilment,
      maximumPrice,
      minimumPrice,
      onSaleOnly,
      page,
      search,
      sort,
      storeSlug,
    ],
  );

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  useEffect(() => {
    if (
      !storeDetails ||
      !storeSlug ||
      trackedStoreSlugRef.current === storeSlug
    ) {
      return;
    }

    trackedStoreSlugRef.current = storeSlug;

    trackMarketplaceActivityQuietly({
      eventType: "STORE_VIEW",
      storeSlug,
      source: "store-page",
    });
  }, [storeDetails, storeSlug]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    syncMarketplaceProductSnapshots(
      products,
    );
  }, [products]);

  useEffect(() => {
    const normalizedSearch =
      cleanString(search);

    if (
      !normalizedSearch ||
      loadingProducts ||
      productsError
    ) {
      return;
    }

    const eventType =
      pagination.total > 0
        ? "SEARCH"
        : "SEARCH_NO_RESULTS";

    const trackingKey = [
      storeSlug,
      normalizedSearch.toLowerCase(),
      eventType,
      pagination.total,
    ].join(":");

    if (
      trackedSearchKeyRef.current ===
      trackingKey
    ) {
      return;
    }

    trackedSearchKeyRef.current =
      trackingKey;

    trackMarketplaceActivityQuietly({
      eventType,
      storeSlug,
      searchTerm: normalizedSearch,
      source: "store-search",
      metadata: {
        resultCount: pagination.total,
        page,
        category: category || undefined,
      },
    });
  }, [
    category,
    loadingProducts,
    page,
    pagination.total,
    productsError,
    search,
    storeSlug,
  ]);

  useEffect(() => {
    const next = {};

    if (search) {
      next.search = search;
    }

    if (category) {
      next.category = category;
    }

    if (sort !== "newest") {
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
    category,
    fulfilment,
    maximumPrice,
    minimumPrice,
    onSaleOnly,
    page,
    search,
    setSearchParams,
    sort,
  ]);

  useEffect(() => {
    if (!sortOpen) {
      return undefined;
    }

    function closeSort(event) {
      if (
        sortRef.current &&
        !sortRef.current.contains(
          event.target,
        )
      ) {
        setSortOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setSortOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      closeSort,
    );

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeSort,
      );

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!filtersOpen) {
      releaseScrollLock();
      return undefined;
    }

    document.body.style.overflow =
      "hidden";

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setFiltersOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      releaseScrollLock();

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [filtersOpen]);

  const pageNumbers = useMemo(() => {
    const totalPages = Math.max(
      1,
      pagination.pages,
    );

    return Array.from(
      new Set([
        1,
        totalPages,
        pagination.page - 2,
        pagination.page - 1,
        pagination.page,
        pagination.page + 1,
        pagination.page + 2,
      ]),
    )
      .filter(
        (value) =>
          value >= 1 &&
          value <= totalPages,
      )
      .sort(
        (left, right) =>
          left - right,
      );
  }, [
    pagination.page,
    pagination.pages,
  ]);

  const location = [
    storeDetails?.location?.sector,
    storeDetails?.location?.district,
  ]
    .filter(Boolean)
    .join(", ");

  const whatsappUrl =
    storeDetails?.whatsappAvailable
      ? createWhatsAppUrl(
          storeDetails.customerPhone,
          storeDetails.name,
        )
      : "";

  const resultsLabel =
    pagination.total === 1
      ? "1 product"
      : `${pagination.total.toLocaleString()} products`;

  function scrollToProducts() {
    window.requestAnimationFrame(() => {
      document
        .getElementById(
          "marketplace-store-products",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    });
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(
      cleanString(searchInput),
    );
    scrollToProducts();
  }

  function chooseCategory(value) {
    setPage(1);
    setCategory(value);
  }

  function choosePriceRange(range) {
    setPage(1);

    if (
      selectedPriceRange?.label ===
      range.label
    ) {
      setMinimumPrice("");
      setMaximumPrice("");
      return;
    }

    setMinimumPrice(range.minimum);
    setMaximumPrice(range.maximum);
  }

  function resetFilters() {
    setCategory("");
    setFulfilment("");
    setMinimumPrice("");
    setMaximumPrice("");
    setOnSaleOnly(false);
    setPage(1);
  }

  function clearEverything() {
    setSearchInput("");
    setSearch("");
    resetFilters();
  }

  function goToPage(nextPage) {
    const target = Math.max(
      1,
      Math.min(
        nextPage,
        pagination.pages,
      ),
    );

    if (target === pagination.page) {
      return;
    }

    setPage(target);
    scrollToProducts();
  }

  return (
    <div className="storvex-landing storvex-marketplace">
      <MarketplaceHeader />

      <main className="svx-business-page">
        {loadingStore ? (
          <section className="svx-business-loading">
            <span />
            <i />
            <i />
          </section>
        ) : storeError ||
          !storeDetails ? (
          <section className="svx-business-error">
            <Store size={34} />
            <h1>Store unavailable</h1>

            <p>
              {storeError ||
                "This store is not currently available on Storvex."}
            </p>

            <Link to="/marketplace/stores">
              <ArrowLeft size={16} />
              Explore stores
            </Link>
          </section>
        ) : (
          <>
            <section className="svx-business-hero">
              <div className="svx-business-hero-inner">
                <Link
                  to="/marketplace/stores"
                  className="svx-business-back"
                >
                  <ArrowLeft size={16} />
                  All stores
                </Link>

                <div className="svx-business-identity">
                  <div className="svx-business-logo">
                    {storeDetails.logoUrl ? (
                      <img
                        src={storeDetails.logoUrl}
                        alt={`${storeDetails.name} logo`}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <Store size={34} />
                    )}
                  </div>

                  <div className="svx-business-copy">
                    <div className="svx-business-name-row">
                      <h1>
                        {storeDetails.name}
                      </h1>

                      <span
                        className={
                          storeDetails
                            .temporarilyClosed
                            ? "is-closed"
                            : "is-open"
                        }
                      >
                        {storeDetails
                          .temporarilyClosed
                          ? "Temporarily closed"
                          : "Open for requests"}
                      </span>
                    </div>

                    {storeDetails.description ? (
                      <p>
                        {storeDetails.description}
                      </p>
                    ) : null}

                    <div className="svx-business-facts">
                      {location ? (
                        <span>
                          <MapPin size={15} />
                          {location}
                        </span>
                      ) : null}

                      <span>
                        <ShoppingBag size={15} />
                        {
                          storeDetails
                            .availableProductCount
                        }{" "}
                        products
                      </span>

                      {storeDetails.pickupEnabled ? (
                        <span>
                          <Store size={15} />
                          Pickup
                        </span>
                      ) : null}

                      {storeDetails.deliveryEnabled ? (
                        <span>
                          <Truck size={15} />
                          Delivery
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="svx-business-contact"
                    >
                      <MessageCircle size={17} />
                      Contact store
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section
              id="marketplace-store-products"
              className="svx-business-products"
            >
              <div className="svx-business-products-head">
                <div>
                  <span>Available now</span>
                  <h2>
                    Products from this store
                  </h2>
                  <p>
                    {loadingProducts
                      ? "Loading products..."
                      : resultsLabel}
                  </p>
                </div>

                <form
                  className="svx-shop-search"
                  onSubmit={submitSearch}
                >
                  <Search size={18} />

                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) =>
                      setSearchInput(
                        event.target.value,
                      )
                    }
                    placeholder={`Search ${storeDetails.name}`}
                    aria-label={`Search products from ${storeDetails.name}`}
                  />

                  <button type="submit">
                    Search
                  </button>
                </form>
              </div>

              <div className="svx-business-filter-toolbar">
                <button
                  type="button"
                  className="svx-business-filter-trigger"
                  onClick={() =>
                    setFiltersOpen(true)
                  }
                >
                  <Settings2 size={17} />
                  Filters

                  {activeFilterCount ? (
                    <b>
                      {activeFilterCount}
                    </b>
                  ) : null}
                </button>

                <div
                  ref={sortRef}
                  className="svx-shop-sort"
                >
                  <span>Sort</span>

                  <button
                    type="button"
                    className="svx-shop-sort-trigger"
                    onClick={() =>
                      setSortOpen(
                        (current) =>
                          !current,
                      )
                    }
                    aria-haspopup="listbox"
                    aria-expanded={sortOpen}
                  >
                    <span>
                      {selectedSort.label}
                    </span>

                    <ChevronDown size={16} />
                  </button>

                  {sortOpen ? (
                    <div
                      className="svx-shop-sort-menu"
                      role="listbox"
                    >
                      {sortOptions.map(
                        (option) => {
                          const selected =
                            option.value === sort;

                          return (
                            <button
                              type="button"
                              key={option.value}
                              className={
                                selected
                                  ? "is-selected"
                                  : ""
                              }
                              role="option"
                              aria-selected={
                                selected
                              }
                              onClick={() => {
                                setPage(1);
                                setSort(
                                  option.value,
                                );
                                setSortOpen(
                                  false,
                                );
                              }}
                            >
                              <span>
                                {option.label}
                              </span>

                              {selected ? (
                                <Check size={15} />
                              ) : null}
                            </button>
                          );
                        },
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={
                  filtersOpen
                    ? "svx-business-product-layout is-filter-open"
                    : "svx-business-product-layout"
                }
              >
                {filtersOpen ? (
                  <button
                    type="button"
                    className="svx-business-filter-backdrop"
                    aria-label="Close filters"
                    onClick={() =>
                      setFiltersOpen(false)
                    }
                  />
                ) : null}

                <aside className="svx-business-filters">
                  <div className="svx-business-filters-head">
                    <div>
                      <strong>Filters</strong>
                      <small>
                        Find the right product
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFiltersOpen(false)
                      }
                      aria-label="Close filters"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <section>
                    <h3>Categories</h3>

                    <button
                      type="button"
                      className={
                        !category
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        chooseCategory("")
                      }
                    >
                      <span>All products</span>
                      {!category ? (
                        <Check size={15} />
                      ) : null}
                    </button>

                    {categories.map((item) => (
                      <button
                        type="button"
                        key={item}
                        className={
                          category === item
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          chooseCategory(item)
                        }
                      >
                        <span>{item}</span>

                        {category === item ? (
                          <Check size={15} />
                        ) : null}
                      </button>
                    ))}
                  </section>

                  <section>
                    <h3>Price</h3>

                    <div className="svx-business-price-fields">
                      <label>
                        <span>Minimum</span>

                        <div>
                          <b>Rwf</b>
                          <input
                            inputMode="numeric"
                            value={minimumPrice}
                            onChange={(event) => {
                              setPage(1);
                              setMinimumPrice(
                                cleanPrice(
                                  event.target.value,
                                ),
                              );
                            }}
                            placeholder="0"
                          />
                        </div>
                      </label>

                      <label>
                        <span>Maximum</span>

                        <div>
                          <b>Rwf</b>
                          <input
                            inputMode="numeric"
                            value={maximumPrice}
                            onChange={(event) => {
                              setPage(1);
                              setMaximumPrice(
                                cleanPrice(
                                  event.target.value,
                                ),
                              );
                            }}
                            placeholder="Any"
                          />
                        </div>
                      </label>
                    </div>

                    <div className="svx-business-price-presets">
                      {priceRanges.map(
                        (range) => (
                          <button
                            type="button"
                            key={range.label}
                            className={
                              selectedPriceRange
                                ?.label ===
                              range.label
                                ? "is-active"
                                : ""
                            }
                            onClick={() =>
                              choosePriceRange(
                                range,
                              )
                            }
                          >
                            {range.label}
                          </button>
                        ),
                      )}
                    </div>
                  </section>

                  <section>
                    <h3>Receive your order</h3>

                    <label className="svx-shop-choice">
                      <input
                        type="radio"
                        name="store-fulfilment"
                        checked={
                          fulfilment === ""
                        }
                        onChange={() => {
                          setPage(1);
                          setFulfilment("");
                        }}
                      />
                      <span>
                        Pickup or delivery
                      </span>
                    </label>

                    {storeDetails.pickupEnabled ? (
                      <label className="svx-shop-choice">
                        <input
                          type="radio"
                          name="store-fulfilment"
                          checked={
                            fulfilment ===
                            "pickup"
                          }
                          onChange={() => {
                            setPage(1);
                            setFulfilment(
                              "pickup",
                            );
                          }}
                        />
                        <span>Pickup</span>
                      </label>
                    ) : null}

                    {storeDetails.deliveryEnabled ? (
                      <label className="svx-shop-choice">
                        <input
                          type="radio"
                          name="store-fulfilment"
                          checked={
                            fulfilment ===
                            "delivery"
                          }
                          onChange={() => {
                            setPage(1);
                            setFulfilment(
                              "delivery",
                            );
                          }}
                        />
                        <span>Delivery</span>
                      </label>
                    ) : null}
                  </section>

                  <section>
                    <h3>Offers</h3>

                    <label className="svx-shop-choice">
                      <input
                        type="checkbox"
                        checked={onSaleOnly}
                        onChange={(event) => {
                          setPage(1);
                          setOnSaleOnly(
                            event.target.checked,
                          );
                        }}
                      />

                      <span>On sale</span>
                    </label>
                  </section>

                  {activeFilterCount ? (
                    <button
                      type="button"
                      className="svx-business-clear-filters"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="svx-business-view-results"
                    onClick={() =>
                      setFiltersOpen(false)
                    }
                  >
                    View {resultsLabel}
                  </button>
                </aside>

                <div className="svx-business-product-results">
                  {loadingProducts ? (
                    <LoadingProducts />
                  ) : null}

                  {!loadingProducts &&
                  productsError ? (
                    <div className="svx-commerce-state">
                      <RefreshCw size={30} />

                      <h2>
                        Products are unavailable
                      </h2>

                      <p>{productsError}</p>

                      <button
                        type="button"
                        onClick={loadProducts}
                      >
                        Try again
                      </button>
                    </div>
                  ) : null}

                  {!loadingProducts &&
                  !productsError &&
                  products.length === 0 ? (
                    <div className="svx-commerce-state">
                      <PackageSearch size={34} />

                      <h2>No products found</h2>

                      <p>
                        Change your search or
                        filters to see more
                        products.
                      </p>

                      <button
                        type="button"
                        onClick={clearEverything}
                      >
                        Clear search and filters
                      </button>
                    </div>
                  ) : null}

                  {!loadingProducts &&
                  !productsError &&
                  products.length > 0 ? (
                    <>
                      <div className="svx-commerce-product-grid">
                        {products.map(
                          (product) => (
                            <ProductCard
                              key={`${product.seller.slug}-${product.slug}`}
                              product={product}
                            />
                          ),
                        )}
                      </div>

                      {pagination.pages > 1 ? (
                        <nav
                          className="svx-marketplace-pagination"
                          aria-label="Store product pages"
                        >
                          <button
                            type="button"
                            disabled={
                              !pagination
                                .hasPreviousPage
                            }
                            onClick={() =>
                              goToPage(
                                pagination.page -
                                  1,
                              )
                            }
                          >
                            Previous
                          </button>

                          <span className="svx-marketplace-pagination-summary">
                            Page {pagination.page}{" "}
                            of {pagination.pages}
                          </span>

                          <div className="svx-marketplace-pagination-pages">
                            {pageNumbers.map(
                              (
                                pageNumber,
                                index,
                              ) => {
                                const previous =
                                  pageNumbers[
                                    index - 1
                                  ];

                                return (
                                  <span
                                    key={pageNumber}
                                  >
                                    {previous &&
                                    pageNumber -
                                      previous >
                                      1 ? (
                                      <i>…</i>
                                    ) : null}

                                    <button
                                      type="button"
                                      className={
                                        pageNumber ===
                                        pagination.page
                                          ? "is-active"
                                          : ""
                                      }
                                      aria-current={
                                        pageNumber ===
                                        pagination.page
                                          ? "page"
                                          : undefined
                                      }
                                      onClick={() =>
                                        goToPage(
                                          pageNumber,
                                        )
                                      }
                                    >
                                      {pageNumber}
                                    </button>
                                  </span>
                                );
                              },
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={
                              !pagination
                                .hasNextPage
                            }
                            onClick={() =>
                              goToPage(
                                pagination.page +
                                  1,
                              )
                            }
                          >
                            Next
                          </button>
                        </nav>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <MarketplaceFooter showCta={false} />
    </div>
  );
}

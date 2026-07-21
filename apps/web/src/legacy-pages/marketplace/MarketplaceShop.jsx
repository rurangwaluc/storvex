import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  PackageSearch,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import {
  useSearchParams,
} from "react-router-dom";

import {
  listMarketplaceProducts,
} from "../../services/marketplaceApi";
import {
  syncMarketplaceProductSnapshots,
} from "./marketplaceCustomerStore";
import {
  LoadingProducts,
  MarketplaceFooter,
  MarketplaceHeader,
  ProductCard,
} from "./MarketplaceHome";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";

const SHOP_PAGE_SIZE = 24;

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

const shopCategories = [
  {
    value: "Electronics",
    label: "Electronics",
    subcategories: [
      "Phones",
      "Laptops",
      "Computers",
      "Televisions",
      "Accessories",
    ],
  },
  {
    value: "Hardware / Quincaillerie",
    label: "Hardware",
    subcategories: [
      "Building materials",
      "Construction materials",
      "Tools",
      "Plumbing",
      "Paint",
    ],
  },
  {
    value: "Home & kitchen materials",
    label: "Home & kitchen",
    subcategories: [
      "Kitchen",
      "Cookware",
      "Tiles",
      "Sinks",
    ],
  },
  {
    value: "Lighting",
    label: "Lighting",
    subcategories: [
      "Bulbs",
      "LED",
    ],
  },
  {
    value: "Spare parts",
    label: "Spare parts",
    subcategories: [
      "Auto parts",
      "Replacement parts",
    ],
  },
];

function cleanString(value) {
  return String(value || "").trim();
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function marketplaceErrorMessage(error) {
  return (
    error?.message ||
    error?.data?.message ||
    "Products could not be loaded. Check your connection and try again."
  );
}

function releasePageScrollLock() {
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
}

export default function MarketplaceShop() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  useEffect(() => {
    releasePageScrollLock();
  }, []);

  const initialSearch = cleanString(
    searchParams.get("search"),
  );
  const initialCategory = cleanString(
    searchParams.get("category"),
  );
  const initialSubcategory = cleanString(
    searchParams.get("subcategory"),
  );
  const initialSort =
    cleanString(searchParams.get("sort")) ||
    "newest";
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
  const [subcategory, setSubcategory] =
    useState(initialSubcategory);
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
  const [sortOpen, setSortOpen] =
    useState(false);
  const sortRef = useRef(null);
  const [
    expandedCategory,
    setExpandedCategory,
  ] = useState(initialCategory);

  const [products, setProducts] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [pagination, setPagination] =
    useState({
      page: initialPage,
      limit: SHOP_PAGE_SIZE,
      total: 0,
      pages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

  const selectedCategory = useMemo(
    () =>
      shopCategories.find(
        (item) => item.value === category,
      ) || null,
    [category],
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const productData =
        await listMarketplaceProducts({
          search,
          category,
          subcategory,
          sort,
          fulfilment,
          minPrice: minimumPrice,
          maxPrice: maximumPrice,
          onSale: onSaleOnly || undefined,
          page,
          limit: SHOP_PAGE_SIZE,
        });

      const nextProducts =
        Array.isArray(productData?.products)
          ? productData.products
          : [];

      setProducts(nextProducts);

      setPagination({
        page: Number(
          productData?.pagination?.page || 1,
        ),
        limit: Number(
          productData?.pagination?.limit ||
            SHOP_PAGE_SIZE,
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
          productData?.pagination
            ?.hasPreviousPage,
        ),
        hasNextPage: Boolean(
          productData?.pagination
            ?.hasNextPage,
        ),
      });
    } catch (loadError) {
      setError(
        marketplaceErrorMessage(loadError),
      );
    } finally {
      setLoading(false);
    }
  }, [
    search,
    category,
    subcategory,
    sort,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
    page,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    syncMarketplaceProductSnapshots(
      products,
    );
  }, [products]);

  useEffect(() => {
    const next = {};

    if (search) next.search = search;
    if (category) next.category = category;
    if (subcategory) {
      next.subcategory = subcategory;
    }

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
    subcategory,
    sort,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
    page,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!sortOpen) return undefined;

    function closeSort(event) {
      if (
        sortRef.current &&
        !sortRef.current.contains(event.target)
      ) {
        setSortOpen(false);
      }
    }

    function closeSortOnEscape(event) {
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
      closeSortOnEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeSort,
      );
      document.removeEventListener(
        "keydown",
        closeSortOnEscape,
      );
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!filtersOpen) return undefined;

    const previousOverflow =
      document.body.style.overflow;

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
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [filtersOpen]);

  const resultsLabel =
    pagination.total === 1
      ? "1 product"
      : `${pagination.total.toLocaleString()} products`;

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

  const priceSummary =
    minimumPrice || maximumPrice
      ? minimumPrice && maximumPrice
        ? `Rwf ${Number(
            minimumPrice,
          ).toLocaleString()} to Rwf ${Number(
            maximumPrice,
          ).toLocaleString()}`
        : minimumPrice
          ? `From Rwf ${Number(
              minimumPrice,
            ).toLocaleString()}`
          : `Up to Rwf ${Number(
              maximumPrice,
            ).toLocaleString()}`
      : "Any price";

  const activeFilterCount = [
    category,
    subcategory,
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
      .sort(
        (left, right) => left - right,
      );
  }, [
    pagination.page,
    pagination.pages,
  ]);

  function scrollToProducts() {
    window.requestAnimationFrame(() => {
      document
        .getElementById(
          "marketplace-shop-products",
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
    setSearch(cleanString(searchInput));
    scrollToProducts();
  }

  function chooseAllProducts() {
    setPage(1);
    setCategory("");
    setSubcategory("");
    setExpandedCategory("");
  }

  function chooseCategory(item) {
    const usesMobileFilters =
      window.matchMedia(
        "(max-width: 900px)",
      ).matches;

    setPage(1);

    if (category !== item.value) {
      setCategory(item.value);
      setSubcategory("");
    }

    if (usesMobileFilters) {
      setExpandedCategory((current) =>
        current === item.value
          ? ""
          : item.value,
      );
    } else {
      setExpandedCategory("");
    }
  }

  function chooseSubcategory(
    categoryValue,
    value,
  ) {
    setPage(1);
    setCategory(categoryValue);
    setSubcategory(value);
    setExpandedCategory(categoryValue);
    setFiltersOpen(false);
  }

  function choosePriceRange(range) {
    setPage(1);
    setMinimumPrice(range.minimum);
    setMaximumPrice(range.maximum);
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
    scrollToProducts();
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setSubcategory("");
    setExpandedCategory("");
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

      <main className="svx-shop">
        <header className="svx-shop-head">
          <div className="svx-shop-head-inner">
            <div className="svx-shop-title">
              <span>Shop products</span>

              <h1>
                Products from local stores
              </h1>

              <p>
                Find products, compare prices
                and choose pickup or delivery.
              </p>
            </div>

            <form
              className="svx-shop-search"
              onSubmit={submitSearch}
            >
              <Search size={18} />

              <input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Search products or stores"
                aria-label="Search products or stores"
              />

              <button type="submit">
                Search
              </button>
            </form>
          </div>
        </header>

        <section
          id="marketplace-shop-products"
          className="svx-shop-catalogue"
        >
          <div className="svx-shop-catalogue-head">
            <div>
              <h2>
                {subcategory ||
                  selectedCategory?.label ||
                  (search
                    ? `Results for “${search}”`
                    : "Products")}
              </h2>

              <p>
                {loading
                  ? "Loading products..."
                  : resultsLabel}
              </p>
            </div>

            <div className="svx-shop-catalogue-actions">
              <button
                type="button"
                className="svx-shop-filter-trigger"
                onClick={() =>
                  setFiltersOpen(true)
                }
                aria-expanded={filtersOpen}
              >
                <Settings2 size={17} />
                Filters

                {activeFilterCount > 0 ? (
                  <b>{activeFilterCount}</b>
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
                      (current) => !current,
                    )
                  }
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                >
                  <span>
                    {selectedSort.label}
                  </span>

                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                  />
                </button>

                {sortOpen ? (
                  <div
                    className="svx-shop-sort-menu"
                    role="listbox"
                    aria-label="Sort products"
                  >
                    {sortOptions.map(
                      (option) => {
                        const isSelected =
                          option.value === sort;

                        return (
                          <button
                            type="button"
                            key={option.value}
                            className={
                              isSelected
                                ? "is-selected"
                                : ""
                            }
                            role="option"
                            aria-selected={
                              isSelected
                            }
                            onClick={() => {
                              setPage(1);
                              setSort(
                                option.value,
                              );
                              setSortOpen(false);
                            }}
                          >
                            <span>
                              {option.label}
                            </span>

                            {isSelected ? (
                              <Check
                                size={15}
                                aria-hidden="true"
                              />
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={cx(
              "svx-shop-layout",
              filtersOpen &&
                "is-filter-open",
            )}
          >
            {filtersOpen ? (
              <button
                type="button"
                className="svx-shop-filter-backdrop"
                onClick={() =>
                  setFiltersOpen(false)
                }
                aria-label="Close filters"
              />
            ) : null}

            <aside className="svx-shop-filters">
              <div className="svx-shop-filters-head">
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

              <section className="svx-shop-filter-section">
                <h3>Categories</h3>

                <button
                  type="button"
                  className={cx(
                    "svx-shop-category-all",
                    !category && "is-active",
                  )}
                  onClick={chooseAllProducts}
                >
                  All products
                </button>

                <div className="svx-shop-category-tree">
                  {shopCategories.map(
                    (item) => {
                      const isExpanded =
                        expandedCategory ===
                        item.value;
                      const isSelected =
                        category === item.value;

                      return (
                        <div
                          key={item.value}
                          className={cx(
                            "svx-shop-category-group",
                            isSelected &&
                              "is-selected",
                            isExpanded &&
                              "is-open",
                          )}
                        >
                          <button
                            type="button"
                            className="svx-shop-category-row"
                            onClick={() =>
                              chooseCategory(item)
                            }
                            aria-expanded={
                              isExpanded
                            }
                          >
                            <span>
                              {item.label}
                            </span>

                            {isExpanded ? (
                              <ChevronDown
                                size={16}
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                              />
                            )}
                          </button>

                          <div
                            className="svx-shop-subcategory-list"
                            aria-label={`${item.label} subcategories`}
                          >
                            <strong>
                              {item.label}
                            </strong>

                            <button
                              type="button"
                              className={
                                isSelected &&
                                !subcategory
                                  ? "is-active"
                                  : ""
                              }
                              onClick={() =>
                                chooseSubcategory(
                                  item.value,
                                  "",
                                )
                              }
                            >
                              All {item.label}
                            </button>

                            {item.subcategories.map(
                              (child) => (
                                <button
                                  type="button"
                                  key={child}
                                  className={
                                    subcategory ===
                                    child
                                      ? "is-active"
                                      : ""
                                  }
                                  onClick={() =>
                                    chooseSubcategory(
                                      item.value,
                                      child,
                                    )
                                  }
                                >
                                  {child ===
                                  "Televisions"
                                    ? "TVs"
                                    : child}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              <section className="svx-shop-filter-section svx-shop-price-section">
                <div className="svx-shop-filter-title">
                  <h3>Price</h3>
                  <span>{priceSummary}</span>
                </div>

                <div className="svx-shop-price-control">
                  <label>
                    <span>Minimum</span>

                    <div className="svx-shop-money-input">
                      <b>Rwf</b>

                      <input
                        type="number"
                        min="0"
                        step="1000"
                        inputMode="numeric"
                        value={minimumPrice}
                        onChange={(event) => {
                          setPage(1);
                          setMinimumPrice(
                            event.target.value,
                          );
                        }}
                        placeholder="0"
                        aria-label="Minimum price"
                      />
                    </div>
                  </label>

                  <span
                    className="svx-shop-price-divider"
                    aria-hidden="true"
                  >
                    to
                  </span>

                  <label>
                    <span>Maximum</span>

                    <div className="svx-shop-money-input">
                      <b>Rwf</b>

                      <input
                        type="number"
                        min="0"
                        step="1000"
                        inputMode="numeric"
                        value={maximumPrice}
                        onChange={(event) => {
                          setPage(1);
                          setMaximumPrice(
                            event.target.value,
                          );
                        }}
                        placeholder="Any"
                        aria-label="Maximum price"
                      />
                    </div>
                  </label>
                </div>

                <div
                  className="svx-shop-price-presets"
                  aria-label="Common price ranges"
                >
                  {priceRanges.map((range) => (
                    <button
                      type="button"
                      key={range.label}
                      className={
                        selectedPriceRange?.label ===
                        range.label
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        choosePriceRange(range)
                      }
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="svx-shop-filter-section">
                <h3>Receive your order</h3>

                <label className="svx-shop-choice">
                  <input
                    type="radio"
                    name="shop-delivery"
                    checked={!fulfilment}
                    onChange={() => {
                      setPage(1);
                      setFulfilment("");
                    }}
                  />
                  <span>
                    Pickup or delivery
                  </span>
                </label>

                <label className="svx-shop-choice">
                  <input
                    type="radio"
                    name="shop-delivery"
                    checked={
                      fulfilment === "pickup"
                    }
                    onChange={() => {
                      setPage(1);
                      setFulfilment("pickup");
                    }}
                  />
                  <span>Pickup</span>
                </label>

                <label className="svx-shop-choice">
                  <input
                    type="radio"
                    name="shop-delivery"
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
              </section>

              <section className="svx-shop-filter-section">
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

              {activeFilterCount > 0 ||
              search ? (
                <button
                  type="button"
                  className="svx-shop-clear"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              ) : null}

              <button
                type="button"
                className="svx-shop-view-results"
                onClick={() =>
                  setFiltersOpen(false)
                }
              >
                View products
              </button>
            </aside>

            <div className="svx-shop-results">
              {loading ? (
                <LoadingProducts />
              ) : null}

              {!loading && error ? (
                <div className="svx-commerce-state">
                  <RefreshCw size={30} />
                  <h2>
                    Products are unavailable
                  </h2>
                  <p>{error}</p>

                  <button
                    type="button"
                    onClick={loadProducts}
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {!loading &&
              !error &&
              products.length === 0 ? (
                <div className="svx-commerce-state">
                  <PackageSearch size={34} />
                  <h2>
                    No products found
                  </h2>
                  <p>
                    Try another category, price
                    or search.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              ) : null}

              {!loading &&
              !error &&
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
                      aria-label="Product pages"
                    >
                      <button
                        type="button"
                        disabled={
                          !pagination
                            .hasPreviousPage
                        }
                        onClick={() =>
                          goToPage(
                            pagination.page - 1,
                          )
                        }
                      >
                        Previous
                      </button>

                      <span className="svx-marketplace-pagination-summary">
                        Page {pagination.page} of{" "}
                        {pagination.pages}
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
                          !pagination.hasNextPage
                        }
                        onClick={() =>
                          goToPage(
                            pagination.page + 1,
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
      </main>

      <MarketplaceFooter showCta={false} />
    </div>
  );
}

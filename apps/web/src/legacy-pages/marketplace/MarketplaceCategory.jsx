import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Home,
  PackageSearch,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Tags,
  Truck,
  X,
} from "lucide-react";
import {
  Link,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  getMarketplaceCatalogue,
  listMarketplaceProducts,
  listMarketplaceStores,
} from "../../services/marketplaceApi";
import {
  marketplaceQueryKeys,
} from "../../lib/marketplaceQueryKeys";
import {
  normalizeMarketplaceCategoryQuery,
} from "../../lib/marketplaceCategoryQuery";
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
import "./MarketplaceCustomerPanel.css";
import "./MarketplaceCategoryReference.css";
import "./MarketplaceProductCard.css";
import "./MarketplaceCategoryResponsive.css";

const DEFAULT_CATEGORY_PAGE_SIZE = 24;

const categoryPageSizes = [
  12,
  24,
  48,
];

const categoryHeroImages = {
  electronics:
    "/marketplace/categories/electronics.webp",
  hardware:
    "/marketplace/categories/hardware.webp",
  "home-and-kitchen":
    "/marketplace/categories/home-kitchen.webp",
  lighting:
    "/marketplace/categories/lighting.webp",
  "spare-parts":
    "/marketplace/categories/spare-parts.webp",
};

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

function findCategoryPath(categories, slug) {
  const target = cleanString(slug);

  if (!target) return null;

  for (const category of categories) {
    if (category.slug === target) {
      return {
        category,
        subcategory: null,
        leafCategory: null,
        breadcrumbs: [category],
      };
    }

    for (const subcategory of category.children || []) {
      if (subcategory.slug === target) {
        return {
          category,
          subcategory,
          leafCategory: null,
          breadcrumbs: [
            category,
            subcategory,
          ],
        };
      }

      for (
        const leafCategory
        of subcategory.children || []
      ) {
        if (leafCategory.slug === target) {
          return {
            category,
            subcategory,
            leafCategory,
            breadcrumbs: [
              category,
              subcategory,
              leafCategory,
            ],
          };
        }
      }
    }
  }

  return null;
}

function pageNumbersFor(pagination) {
  const totalPages = Math.max(
    1,
    Number(pagination.pages || 1),
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
}

export default function MarketplaceCategory({
  categorySlugOverride = "",
  initialCatalogueData,
  initialProductData,
  initialStoresData,
  serverIntro = null,
} = {}) {
  const { categorySlug: routeCategorySlug = "" } = useParams();
  const categorySlug = categorySlugOverride || routeCategorySlug;

  const [searchParams, setSearchParams] =
    useSearchParams();

  const initialQuery = normalizeMarketplaceCategoryQuery(searchParams);
  const initialSearch = initialQuery.search;
  const initialSort = initialQuery.sort;
  const initialFulfilment = initialQuery.fulfilment;
  const initialMinimumPrice = initialQuery.minPrice;
  const initialMaximumPrice = initialQuery.maxPrice;
  const initialOnSale = initialQuery.onSale;
  const initialStore = initialQuery.store;
  const initialPageSize = initialQuery.limit;
  const initialPage = initialQuery.page;

  const [subcategoryOpen, setSubcategoryOpen] =
    useState(false);

  const [searchInput, setSearchInput] =
    useState(initialSearch);
  const [search, setSearch] =
    useState(initialSearch);
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
  const [storeSlug, setStoreSlug] =
    useState(initialStore);
  const [pageSize, setPageSize] =
    useState(initialPageSize);
  const [page, setPage] =
    useState(initialPage);

  const [filtersOpen, setFiltersOpen] =
    useState(false);
  const [sortOpen, setSortOpen] =
    useState(false);
  const sortRef = useRef(null);

  const catalogueQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.catalogue(),
    queryFn: getMarketplaceCatalogue,
    initialData: initialCatalogueData,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const catalogueData =
    catalogueQuery.data || null;

  const catalogue =
    Array.isArray(catalogueData?.categories)
      ? catalogueData.categories
      : [];

  const catalogueLoading =
    catalogueQuery.isPending;

  const catalogueError =
    catalogueQuery.error
      ? marketplaceErrorMessage(
          catalogueQuery.error,
        )
      : "";

  const categoryPath = useMemo(
    () =>
      findCategoryPath(
        catalogue,
        categorySlug,
      ),
    [catalogue, categorySlug],
  );

  const selectedNode =
    categoryPath?.leafCategory ||
    categoryPath?.subcategory ||
    categoryPath?.category ||
    null;

  const categoryQuery =
    categoryPath?.category?.slug || "";

  const categoryHeroImage =
    categoryHeroImages[categoryQuery] || null;

  const subcategoryQuery =
    categoryPath?.subcategory?.slug || "";

  const leafCategoryQuery =
    categoryPath?.leafCategory?.slug || "";

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
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
    storeSlug,
  ].filter(Boolean).length;

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

  const storeParams = useMemo(
    () => ({
      sort: "name",
      limit: 100,
    }),
    [],
  );

  const storesQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.stores(
        storeParams,
      ),
    queryFn: () =>
      listMarketplaceStores(
        storeParams,
      ),
    initialData: initialStoresData,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const storesData =
    storesQuery.data || null;

  const stores =
    Array.isArray(storesData?.stores)
      ? storesData.stores
      : [];

  const productParams = useMemo(
    () => ({
      search,
      category: categoryQuery,
      subcategory:
        subcategoryQuery || undefined,
      leafCategory:
        leafCategoryQuery || undefined,
      sort,
      fulfilment,
      minPrice: minimumPrice,
      maxPrice: maximumPrice,
      onSale:
        onSaleOnly || undefined,
      store:
        storeSlug || undefined,
      page,
      limit: pageSize,
    }),
    [
      search,
      categoryQuery,
      subcategoryQuery,
      leafCategoryQuery,
      sort,
      fulfilment,
      minimumPrice,
      maximumPrice,
      onSaleOnly,
      storeSlug,
      page,
      pageSize,
    ],
  );

  const productsQuery = useQuery({
    queryKey:
      marketplaceQueryKeys.products(
        productParams,
      ),
    queryFn: () =>
      listMarketplaceProducts(
        productParams,
      ),
    initialData: initialProductData,
    enabled:
      !catalogueLoading &&
      Boolean(categoryPath),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const productData =
    productsQuery.data || null;

  const products =
    Array.isArray(productData?.products)
      ? productData.products
      : [];

  const pagination = {
    page: Number(
      productData?.pagination?.page || page,
    ),
    limit: Number(
      productData?.pagination?.limit ||
        pageSize,
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
  };

  const resultsLabel =
    pagination.total === 1
      ? "1 product"
      : `${pagination.total.toLocaleString()} products`;

  const pageNumbers = useMemo(
    () => pageNumbersFor(pagination),
    [
      pagination.page,
      pagination.pages,
    ],
  );

  const loading =
    productsQuery.isPending &&
    productsQuery.fetchStatus !== "idle";

  const error =
    productsQuery.error
      ? marketplaceErrorMessage(
          productsQuery.error,
        )
      : "";

  function loadCatalogue() {
    return catalogueQuery.refetch();
  }

  function loadProducts() {
    return productsQuery.refetch();
  }

  useEffect(() => {
    syncMarketplaceProductSnapshots(
      products,
    );
  }, [products]);

  useEffect(() => {
    const next = {};

    if (search) next.search = search;

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

    if (storeSlug) {
      next.store = storeSlug;
    }

    if (
      pageSize !== DEFAULT_CATEGORY_PAGE_SIZE
    ) {
      next.limit = String(pageSize);
    }

    if (page > 1) {
      next.page = String(page);
    }

    setSearchParams(next, {
      replace: true,
    });
  }, [
    search,
    sort,
    fulfilment,
    minimumPrice,
    maximumPrice,
    onSaleOnly,
    storeSlug,
    pageSize,
    page,
    setSearchParams,
  ]);

  useEffect(() => {
    setSubcategoryOpen(false);
  }, [categorySlug]);

  useEffect(() => {
    if (!subcategoryOpen) return undefined;

    const previousOverflow =
      document.body.style.overflow;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setSubcategoryOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
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
  }, [subcategoryOpen]);

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

  useEffect(() => {
    setPage(1);
  }, [categorySlug]);

  function scrollToProducts() {
    window.requestAnimationFrame(() => {
      document
        .getElementById(
          "marketplace-category-products",
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
    setSort("newest");
    setFulfilment("");
    setMinimumPrice("");
    setMaximumPrice("");
    setOnSaleOnly(false);
    setStoreSlug("");
    setPageSize(
      DEFAULT_CATEGORY_PAGE_SIZE,
    );
    setPage(1);
    setFiltersOpen(false);
  }

  if (catalogueLoading) {
    return (
      <div className="storvex-landing storvex-marketplace svx-category-route">
        <MarketplaceHeader />

        <main className="svx-category-page">
          <div className="svx-category-page__loading">
            <LoadingProducts />
          </div>
        </main>

        <MarketplaceFooter showCta={false} />
      </div>
    );
  }

  if (catalogueError) {
    return (
      <div className="storvex-landing storvex-marketplace svx-category-route">
        <MarketplaceHeader />

        <main className="svx-category-page">
          <div className="svx-commerce-state">
            <RefreshCw size={30} />
            <h1>Categories are unavailable</h1>
            <p>{catalogueError}</p>

            <button
              type="button"
              onClick={loadCatalogue}
            >
              Try again
            </button>
          </div>
        </main>

        <MarketplaceFooter showCta={false} />
      </div>
    );
  }

  if (!categoryPath) {
    return (
      <div className="storvex-landing storvex-marketplace svx-category-route">
        <MarketplaceHeader />

        <main className="svx-category-page">
          <div className="svx-commerce-state">
            <PackageSearch size={34} />
            <h1>Category not found</h1>
            <p>
              This Marketplace category does not
              exist.
            </p>

            <Link to="/marketplace/shop">
              Browse all products
            </Link>
          </div>
        </main>

        <MarketplaceFooter showCta={false} />
      </div>
    );
  }

  return (
    <div className="storvex-landing storvex-marketplace svx-category-route">
      <MarketplaceHeader />

      <main className="svx-category-page">
        <header className="svx-category-page__hero">
          <div className="svx-category-page__hero-inner">
            <nav
              className="svx-category-breadcrumbs"
              aria-label="Breadcrumb"
            >
              <Link to="/marketplace">
                <Home size={14} />
                Marketplace
              </Link>

              {categoryPath.breadcrumbs.map(
                (item, index) => (
                  <span key={item.key}>
                    <ChevronRight size={14} />

                    {index ===
                    categoryPath.breadcrumbs.length -
                      1 ? (
                      <strong>
                        {item.label}
                      </strong>
                    ) : (
                      <Link
                        to={`/marketplace/category/${encodeURIComponent(
                          item.slug,
                        )}`}
                      >
                        {item.label}
                      </Link>
                    )}
                  </span>
                ),
              )}
            </nav>

            {serverIntro || (
            <div className="svx-category-page__intro">
              {categoryHeroImage ? (
                <div className="svx-category-page__hero-media">
                  <img
                    src={categoryHeroImage}
                    alt=""
                    aria-hidden="true"
                  />
                </div>
              ) : null}

              <div className="svx-category-page__intro-copy">
                <span>
                  {categoryPath.category.label}
                </span>

                <h1>{selectedNode.label}</h1>

                <p>
                  {selectedNode.description ||
                    categoryPath.category
                      .description}
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
                  placeholder={`Search ${selectedNode.label.toLowerCase()}`}
                  aria-label={`Search ${selectedNode.label}`}
                />

                <button type="submit">
                  Search
                </button>
              </form>
            </div>
            )}

            {serverIntro ? (
              <form
                className="svx-shop-search svx-category-seo-search"
                onSubmit={submitSearch}
              >
                <Search size={18} />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={`Search ${selectedNode.label.toLowerCase()}`}
                  aria-label={`Search ${selectedNode.label}`}
                />
                <button type="submit">Search</button>
              </form>
            ) : null}

            {categoryPath.category.children
              ?.length ? (
              <>
                <nav
                  className="svx-category-page__quick-links"
                  aria-label={`${categoryPath.category.label} categories`}
                >
                  <Link
                    to={`/marketplace/category/${categoryPath.category.slug}`}
                    className={
                      !categoryPath.subcategory
                        ? "is-active"
                        : ""
                    }
                  >
                    All
                  </Link>

                  {categoryPath.category.children.map(
                    (item) => (
                      <Link
                        key={item.key}
                        to={`/marketplace/category/${item.slug}`}
                        className={
                          categoryPath.subcategory
                            ?.slug === item.slug
                            ? "is-active"
                            : ""
                        }
                      >
                        {item.label}
                      </Link>
                    ),
                  )}
                </nav>

                <div className="svx-mobile-category-selector">
                  <button
                    type="button"
                    className={cx(
                      "svx-mobile-category-selector__trigger",
                      subcategoryOpen && "is-open",
                    )}
                    onClick={() =>
                      setSubcategoryOpen(
                        (current) => !current,
                      )
                    }
                    aria-haspopup="dialog"
                    aria-expanded={subcategoryOpen}
                  >
                    <Tags
                      size={19}
                      strokeWidth={1.9}
                    />

                    <span>
                      <small>Shop section</small>
                      <strong>
                        {categoryPath.subcategory
                          ?.label || "All products"}
                      </strong>
                    </span>

                    <ChevronDown
                      size={18}
                      strokeWidth={1.9}
                    />
                  </button>

                  <div
                    className={cx(
                      "svx-mobile-category-selector__overlay",
                      subcategoryOpen && "is-open",
                    )}
                    aria-hidden={!subcategoryOpen}
                  >
                      <button
                        type="button"
                        className="svx-mobile-category-selector__backdrop"
                        onClick={() =>
                          setSubcategoryOpen(false)
                        }
                        aria-label="Close shop sections"
                      />

                      <section
                        className="svx-mobile-category-selector__sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Choose a shop section"
                      >
                        <header>
                          <div>
                            <small>
                              {categoryPath.category.label}
                            </small>

                            <h2>Choose a shop section</h2>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSubcategoryOpen(false)
                            }
                            aria-label="Close shop sections"
                          >
                            <X
                              size={21}
                              strokeWidth={1.9}
                            />
                          </button>
                        </header>

                        <nav
                          aria-label={`${categoryPath.category.label} shop sections`}
                        >
                          <Link
                            to={`/marketplace/category/${categoryPath.category.slug}`}
                            className={
                              !categoryPath.subcategory
                                ? "is-active"
                                : ""
                            }
                            onClick={() =>
                              setSubcategoryOpen(false)
                            }
                          >
                            <span>All products</span>

                            {!categoryPath.subcategory ? (
                              <Check
                                size={18}
                                strokeWidth={2}
                              />
                            ) : (
                              <ChevronRight
                                size={18}
                                strokeWidth={1.8}
                              />
                            )}
                          </Link>

                          {categoryPath.category.children.map(
                            (item) => {
                              const isSelected =
                                categoryPath.subcategory
                                  ?.slug === item.slug;

                              return (
                                <Link
                                  key={item.key}
                                  to={`/marketplace/category/${item.slug}`}
                                  className={
                                    isSelected
                                      ? "is-active"
                                      : ""
                                  }
                                  onClick={() =>
                                    setSubcategoryOpen(false)
                                  }
                                >
                                  <span>{item.label}</span>

                                  {isSelected ? (
                                    <Check
                                      size={18}
                                      strokeWidth={2}
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={18}
                                      strokeWidth={1.8}
                                    />
                                  )}
                                </Link>
                              );
                            },
                          )}
                        </nav>
                      </section>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </header>

        <section
          id="marketplace-category-products"
          className="svx-shop-catalogue svx-category-page__catalogue"
        >
          <div className="svx-shop-catalogue-head">
            <div>
              <h2>Available products</h2>

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

                  <ChevronDown size={16} />
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
          </div>

          <div
            className={cx(
              "svx-shop-layout",
              "svx-category-page__layout",
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

            <aside
              className="svx-shop-filters svx-category-page__filters"
              role="dialog"
              aria-modal={filtersOpen ? "true" : undefined}
              aria-label="Product filters"
              aria-hidden={!filtersOpen && undefined}
            >
              <div className="svx-shop-filters-head">
                <div>
                  <strong>Filters</strong>
                  <small>
                    Refine these results
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

                  <span className="svx-shop-price-divider">
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

                <div className="svx-shop-price-presets">
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

                {[
                  {
                    value: "",
                    label:
                      "Pickup or delivery",
                  },
                  {
                    value: "pickup",
                    label: "Pickup",
                  },
                  {
                    value: "delivery",
                    label: "Delivery",
                  },
                ].map((option) => (
                  <label
                    className="svx-shop-choice"
                    key={
                      option.value ||
                      "all-fulfilment"
                    }
                  >
                    <input
                      type="radio"
                      name="category-delivery"
                      checked={
                        fulfilment ===
                        option.value
                      }
                      onChange={() => {
                        setPage(1);
                        setFulfilment(
                          option.value,
                        );
                      }}
                    />

                    <span>{option.label}</span>
                  </label>
                ))}
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

              {stores.length > 0 ? (
                <section className="svx-shop-filter-section">
                  <h3>Store</h3>

                  <label className="svx-category-store-filter">
                    <Store size={15} />

                    <select
                      value={storeSlug}
                      onChange={(event) => {
                        setPage(1);
                        setStoreSlug(
                          event.target.value,
                        );
                      }}
                      aria-label="Filter by store"
                    >
                      <option value="">
                        All stores
                      </option>

                      {stores.map((storeItem) => (
                        <option
                          key={storeItem.slug}
                          value={storeItem.slug}
                        >
                          {storeItem.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown size={15} />
                  </label>
                </section>
              ) : null}

              <div className="svx-shop-filter-actions">
                {activeFilterCount > 0 ||
                search ? (
                  <button
                    type="button"
                    className="svx-shop-clear"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                ) : (
                  <span
                    className="svx-shop-filter-actions__spacer"
                    aria-hidden="true"
                  />
                )}

                <button
                  type="button"
                  className="svx-shop-view-results"
                  onClick={() =>
                    setFiltersOpen(false)
                  }
                >
                  View products
                </button>
              </div>
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
                    {search || activeFilterCount > 0
                      ? "No matching products found"
                      : "No products are listed in this category yet"}
                  </h2>
                  <p>
                    {search || activeFilterCount > 0
                      ? "Try another search or clear the filters."
                      : "Browse Marketplace or check another category."}
                  </p>

                  {search || activeFilterCount > 0 ? (
                    <button type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  ) : (
                    <Link to="/marketplace">Browse Marketplace</Link>
                  )}
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
                        Showing{" "}
                        {(
                          (pagination.page - 1) *
                            pagination.limit +
                          1
                        ).toLocaleString()}
                        –
                        {Math.min(
                          pagination.page *
                            pagination.limit,
                          pagination.total,
                        ).toLocaleString()}{" "}
                        of{" "}
                        {pagination.total.toLocaleString()}{" "}
                        products
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
                                key={
                                  pageNumber
                                }
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

                      <label className="svx-category-page-size">
                        <select
                          value={pageSize}
                          onChange={(event) => {
                            setPage(1);
                            setPageSize(
                              Number(
                                event.target.value,
                              ),
                            );
                          }}
                          aria-label="Products per page"
                        >
                          {categoryPageSizes.map(
                            (size) => (
                              <option
                                key={size}
                                value={size}
                              >
                                {size} per page
                              </option>
                            ),
                          )}
                        </select>

                        <ChevronDown size={15} />
                      </label>
                    </nav>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <section className="svx-category-trust-strip">
        <div>
          <span>
            <ShieldCheck size={22} />
            <b>Genuine products</b>
            <small>
              Products from verified local stores
            </small>
          </span>

          <span>
            <Tags size={22} />
            <b>Clear pricing</b>
            <small>
              Compare normal and sale prices
            </small>
          </span>

          <span>
            <Truck size={22} />
            <b>Pickup or delivery</b>
            <small>
              Choose how to receive your order
            </small>
          </span>

          <span>
            <RotateCcw size={22} />
            <b>Direct store support</b>
            <small>
              Confirm details with the seller
            </small>
          </span>
        </div>
      </section>

      <MarketplaceFooter showCta={false} />
    </div>
  );
}

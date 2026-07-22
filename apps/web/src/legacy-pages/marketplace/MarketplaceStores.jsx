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
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  Store,
  X,
} from "lucide-react";
import {
  useSearchParams,
} from "react-router-dom";

import {
  listMarketplaceStores,
} from "../../services/marketplaceApi";
import {
  MarketplaceFooter,
  MarketplaceHeader,
  StoreCard,
} from "./MarketplaceHome";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";

const STORES_PAGE_SIZE = 18;

const sortOptions = [
  {
    value: "name",
    label: "Store name",
  },
  {
    value: "newest",
    label: "Newest stores",
  },
  {
    value: "products",
    label: "Most products",
  },
];

function cleanString(value) {
  return String(value || "").trim();
}

function marketplaceErrorMessage(error) {
  return (
    error?.message ||
    error?.data?.message ||
    "Stores could not be loaded. Check your connection and try again."
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

function LoadingStores() {
  return (
    <div className="svx-store-directory-grid">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="svx-store-directory-skeleton"
          >
            <span />

            <div>
              <i />
              <i />
              <i />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

export default function MarketplaceStores() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [searchInput, setSearchInput] =
    useState(
      cleanString(
        searchParams.get("search"),
      ),
    );

  const [search, setSearch] =
    useState(
      cleanString(
        searchParams.get("search"),
      ),
    );

  const [district, setDistrict] =
    useState(
      cleanString(
        searchParams.get("district"),
      ),
    );

  const [fulfilment, setFulfilment] =
    useState(
      cleanString(
        searchParams.get("fulfilment"),
      ),
    );

  const [openOnly, setOpenOnly] =
    useState(
      searchParams.get("openOnly") ===
        "true",
    );

  const [sort, setSort] =
    useState(
      cleanString(
        searchParams.get("sort"),
      ) || "name",
    );

  const [page, setPage] =
    useState(
      Math.max(
        1,
        Number(
          searchParams.get("page"),
        ) || 1,
      ),
    );

  const [stores, setStores] =
    useState([]);

  const [districts, setDistricts] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: STORES_PAGE_SIZE,
      total: 0,
      pages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [sortOpen, setSortOpen] =
    useState(false);

  const sortRef = useRef(null);
  const districtRef = useRef(null);

  const [
    districtOpen,
    setDistrictOpen,
  ] = useState(false);

  const selectedSort =
    sortOptions.find(
      (option) => option.value === sort,
    ) || sortOptions[0];

  const loadStores = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await listMarketplaceStores({
            search,
            district,
            fulfilment,
            openOnly:
              openOnly ? true : "",
            sort,
            page,
            limit: STORES_PAGE_SIZE,
          });

        setStores(
          Array.isArray(result?.stores)
            ? result.stores
            : [],
        );

        setDistricts(
          Array.isArray(result?.districts)
            ? result.districts
            : [],
        );

        setPagination({
          page:
            result?.pagination?.page || 1,
          limit:
            result?.pagination?.limit ||
            STORES_PAGE_SIZE,
          total:
            result?.pagination?.total || 0,
          pages: Math.max(
            1,
            result?.pagination?.pages || 1,
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
      } catch (requestError) {
        setStores([]);
        setError(
          marketplaceErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [
      district,
      fulfilment,
      openOnly,
      page,
      search,
      sort,
    ],
  );

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    const next =
      new URLSearchParams();

    if (search) {
      next.set("search", search);
    }

    if (district) {
      next.set(
        "district",
        district,
      );
    }

    if (fulfilment) {
      next.set(
        "fulfilment",
        fulfilment,
      );
    }

    if (openOnly) {
      next.set(
        "openOnly",
        "true",
      );
    }

    if (sort !== "name") {
      next.set("sort", sort);
    }

    if (page > 1) {
      next.set(
        "page",
        String(page),
      );
    }

    setSearchParams(next, {
      replace: true,
    });
  }, [
    district,
    fulfilment,
    openOnly,
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
    if (!districtOpen) {
      return undefined;
    }

    function closeDistrictDropdown(event) {
      if (
        districtRef.current &&
        !districtRef.current.contains(
          event.target,
        )
      ) {
        setDistrictOpen(false);
      }
    }

    function closeDistrictOnEscape(event) {
      if (event.key === "Escape") {
        setDistrictOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      closeDistrictDropdown,
    );

    document.addEventListener(
      "keydown",
      closeDistrictOnEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeDistrictDropdown,
      );

      document.removeEventListener(
        "keydown",
        closeDistrictOnEscape,
      );
    };
  }, [districtOpen]);

  useEffect(() => {
    if (!filtersOpen) {
      releasePageScrollLock();
      return undefined;
    }

    document.body.style.overflow =
      "hidden";

    return releasePageScrollLock;
  }, [filtersOpen]);

  const resultsLabel =
    pagination.total === 1
      ? "1 store"
      : `${pagination.total.toLocaleString()} stores`;

  const activeFilterCount = [
    district,
    fulfilment,
    openOnly ? "open" : "",
  ].filter(Boolean).length;

  const visiblePageNumbers =
    useMemo(() => {
      return Array.from(
        new Set([
          1,
          pagination.pages,
          pagination.page - 2,
          pagination.page - 1,
          pagination.page,
          pagination.page + 1,
          pagination.page + 2,
        ]),
      )
        .filter(
          (number) =>
            number >= 1 &&
            number <= pagination.pages,
        )
        .sort(
          (left, right) =>
            left - right,
        );
    }, [
      pagination.page,
      pagination.pages,
    ]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(
      cleanString(searchInput),
    );
  }

  function resetFilters() {
    setPage(1);
    setDistrict("");
    setFulfilment("");
    setOpenOnly(false);
  }

  function clearEverything() {
    setSearchInput("");
    setSearch("");
    resetFilters();
  }

  function goToPage(nextPage) {
    const targetPage = Math.max(
      1,
      Math.min(
        nextPage,
        pagination.pages,
      ),
    );

    if (
      targetPage === pagination.page
    ) {
      return;
    }

    setPage(targetPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="storvex-landing storvex-marketplace svx-store-directory-page">
      <MarketplaceHeader />

      <main className="svx-shop">
        <header className="svx-shop-head">
          <div className="svx-shop-head-inner">
            <div className="svx-shop-title">
              <span>
                Local businesses
              </span>

              <h1>Explore stores</h1>

              <p>
                Find local stores and browse
                products they currently have
                available.
              </p>
            </div>

            <form
              className="svx-shop-search"
              onSubmit={submitSearch}
            >
              <Search
                size={18}
                aria-hidden="true"
              />

              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Search stores"
                aria-label="Search stores"
              />

              <button type="submit">
                Search
              </button>
            </form>
          </div>
        </header>

        <section className="svx-shop-catalogue">
          <div className="svx-shop-catalogue-head">
            <div>
              <h2>Stores</h2>
              <p>{resultsLabel}</p>
            </div>

            <div className="svx-shop-catalogue-actions">
              <button
                type="button"
                className="svx-shop-filter-trigger"
                onClick={() =>
                  setFiltersOpen(true)
                }
              >
                <Settings2 size={16} />
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
          </div>

          <div
            className={
              filtersOpen
                ? "svx-shop-layout is-filter-open"
                : "svx-shop-layout"
            }
          >
            {filtersOpen ? (
              <button
                type="button"
                className="svx-shop-filter-backdrop"
                aria-label="Close filters"
                onClick={() =>
                  setFiltersOpen(false)
                }
              />
            ) : null}

            <aside className="svx-shop-filters">
              <div className="svx-shop-filters-head">
                <div>
                  <strong>Filters</strong>
                  <small>
                    Narrow stores by location
                    and service.
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
                <h3>Location</h3>

                <div
                  ref={districtRef}
                  className={
                    districtOpen
                      ? "svx-store-district-dropdown is-open"
                      : "svx-store-district-dropdown"
                  }
                >
                  <button
                    type="button"
                    className="svx-store-district-trigger"
                    onClick={() =>
                      setDistrictOpen(
                        (current) =>
                          !current,
                      )
                    }
                    aria-haspopup="listbox"
                    aria-expanded={districtOpen}
                  >
                    <MapPin
                      size={15}
                      aria-hidden="true"
                    />

                    <span>
                      {district ||
                        "All districts"}
                    </span>

                    <ChevronDown
                      size={15}
                      aria-hidden="true"
                    />
                  </button>

                  {districtOpen ? (
                    <div
                      className="svx-store-district-menu"
                      role="listbox"
                      aria-label="Choose district"
                    >
                      <button
                        type="button"
                        className={
                          !district
                            ? "is-selected"
                            : ""
                        }
                        role="option"
                        aria-selected={!district}
                        onClick={() => {
                          setPage(1);
                          setDistrict("");
                          setDistrictOpen(false);
                        }}
                      >
                        <span>All districts</span>

                        {!district ? (
                          <Check size={15} />
                        ) : null}
                      </button>

                      {districts.map(
                        (item) => {
                          const selected =
                            item === district;

                          return (
                            <button
                              type="button"
                              key={item}
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
                                setDistrict(
                                  item,
                                );
                                setDistrictOpen(
                                  false,
                                );
                              }}
                            >
                              <span>{item}</span>

                              {selected ? (
                                <Check
                                  size={15}
                                />
                              ) : null}
                            </button>
                          );
                        },
                      )}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="svx-shop-filter-section">
                <h3>
                  Available services
                </h3>

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
                  <span>Any service</span>
                </label>

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
                  <span>
                    Pickup available
                  </span>
                </label>

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
                  <span>
                    Delivery available
                  </span>
                </label>
              </section>

              <section className="svx-shop-filter-section">
                <h3>Availability</h3>

                <label className="svx-shop-choice">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(event) => {
                      setPage(1);
                      setOpenOnly(
                        event.target.checked,
                      );
                    }}
                  />

                  <span>
                    Open for requests
                  </span>
                </label>
              </section>

              {activeFilterCount ? (
                <button
                  type="button"
                  className="svx-shop-clear"
                  onClick={resetFilters}
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
                View {resultsLabel}
              </button>
            </aside>

            <div className="svx-shop-results svx-store-directory-results">
              {loading ? (
                <LoadingStores />
              ) : error ? (
                <div className="svx-store-directory-state">
                  <Store size={30} />
                  <h2>
                    Stores could not be loaded
                  </h2>
                  <p>{error}</p>

                  <button
                    type="button"
                    onClick={loadStores}
                  >
                    <RefreshCw size={16} />
                    Try again
                  </button>
                </div>
              ) : stores.length ? (
                <>
                  <div className="svx-store-directory-grid">
                    {stores.map((store) => (
                      <StoreCard
                        key={store.slug}
                        store={store}
                      />
                    ))}
                  </div>

                  {pagination.pages > 1 ? (
                    <nav
                      className="svx-marketplace-pagination"
                      aria-label="Stores pages"
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
                        Page {pagination.page}{" "}
                        of {pagination.pages}
                      </span>

                      <div className="svx-marketplace-pagination-pages">
                        {visiblePageNumbers.map(
                          (
                            pageNumber,
                            index,
                          ) => {
                            const previous =
                              visiblePageNumbers[
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
                            pagination.page + 1,
                          )
                        }
                      >
                        Next
                      </button>
                    </nav>
                  ) : null}
                </>
              ) : (
                <div className="svx-store-directory-state">
                  <Store size={30} />
                  <h2>No stores found</h2>

                  <p>
                    Change your search or
                    filters to discover more
                    stores.
                  </p>

                  {search ||
                  activeFilterCount ? (
                    <button
                      type="button"
                      onClick={clearEverything}
                    >
                      Clear search and filters
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <MarketplaceFooter showCta={false} />
    </div>
  );
}

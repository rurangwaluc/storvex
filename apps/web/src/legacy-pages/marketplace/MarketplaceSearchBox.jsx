import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  LoaderCircle,
  Search,
  Store,
} from "lucide-react";
import {
  useNavigate,
} from "react-router-dom";

import {
  listMarketplaceProducts,
} from "../../services/marketplaceApi";

import "./MarketplaceSearchBox.css";

const MINIMUM_QUERY_LENGTH = 3;
const SUGGESTION_LIMIT = 6;
const SEARCH_DELAY = 250;

function cleanString(value) {
  return String(value || "").trim();
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function productImageSource(product) {
  const image =
    product?.image ||
    product?.images?.[0] ||
    null;

  if (typeof image === "string") {
    return image;
  }

  return (
    image?.thumbnailUrl ||
    image?.url ||
    ""
  );
}

function formatMoney(value, currency = "RWF") {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "";
  }

  const formatted =
    new Intl.NumberFormat("en-RW", {
      maximumFractionDigits: 0,
    }).format(amount);

  return currency === "RWF"
    ? `Rwf ${formatted}`
    : `${currency} ${formatted}`;
}

function productUrl(product) {
  const storeSlug =
    cleanString(product?.seller?.slug);
  const productSlug =
    cleanString(product?.slug);

  if (!storeSlug || !productSlug) {
    return "";
  }

  return `/marketplace/${encodeURIComponent(
    storeSlug,
  )}/${encodeURIComponent(productSlug)}`;
}

function searchResultsUrl(query) {
  const cleanQuery = cleanString(query);

  return cleanQuery
    ? `/marketplace/shop?search=${encodeURIComponent(
        cleanQuery,
      )}`
    : "/marketplace/shop";
}

export default function MarketplaceSearchBox({
  className = "",
  value,
  onChange,
  onSubmit,
  placeholder = "Search products",
}) {
  const navigate = useNavigate();

  const rootRef = useRef(null);
  const requestRef = useRef(null);

  const [suggestions, setSuggestions] =
    useState([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [open, setOpen] =
    useState(false);
  const [focused, setFocused] =
    useState(false);
  const [activeIndex, setActiveIndex] =
    useState(-1);

  const query = cleanString(value);
  const canSearch =
    query.length >= MINIMUM_QUERY_LENGTH;

  const itemCount =
    suggestions.length +
    (canSearch ? 1 : 0);

  useEffect(() => {
    if (!canSearch) {
      requestRef.current?.abort();
      requestRef.current = null;

      setSuggestions([]);
      setLoading(false);
      setError("");
      setOpen(false);
      setActiveIndex(-1);

      return undefined;
    }

    const timer = window.setTimeout(
      async () => {
        requestRef.current?.abort();

        const controller =
          new AbortController();

        requestRef.current = controller;

        setLoading(true);
        setError("");
        setOpen(true);
        setActiveIndex(-1);

        try {
          const response =
            await listMarketplaceProducts(
              {
                search: query,
                page: 1,
                limit: SUGGESTION_LIMIT,
                sort: "name",
              },
              {
                signal: controller.signal,
              },
            );

          if (controller.signal.aborted) {
            return;
          }

          setSuggestions(
            Array.isArray(response?.products)
              ? response.products.slice(
                  0,
                  SUGGESTION_LIMIT,
                )
              : [],
          );
        } catch (requestError) {
          if (
            controller.signal.aborted ||
            requestError?.code ===
              "ERR_CANCELED"
          ) {
            return;
          }

          setSuggestions([]);
          setError(
            "Quick results could not be loaded.",
          );
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      },
      SEARCH_DELAY,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [canSearch, query]);

  useEffect(() => {
    function closeOutside(event) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setFocused(false);
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener(
      "pointerdown",
      closeOutside,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOutside,
      );
    };
  }, []);

  useEffect(
    () => () => {
      requestRef.current?.abort();
    },
    [],
  );

  function openProduct(product) {
    const url = productUrl(product);

    if (!url) return;

    setOpen(false);
    setFocused(false);
    setActiveIndex(-1);

    navigate(url);
  }

  function openAllResults() {
    setOpen(false);
    setFocused(false);
    setActiveIndex(-1);

    navigate(searchResultsUrl(query));
  }

  function handleInputChange(event) {
    onChange?.(event.target.value);

    setFocused(true);
    setOpen(
      cleanString(event.target.value).length >=
        MINIMUM_QUERY_LENGTH,
    );
  }

  function handleInputFocus() {
    setFocused(true);

    if (canSearch) {
      setOpen(true);
    }
  }

  function handleSubmit(event) {
    setOpen(false);
    setFocused(false);
    setActiveIndex(-1);

    onSubmit?.(event);
  }

  function handleInputKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (
      !open ||
      !canSearch ||
      itemCount === 0
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((current) =>
        current >= itemCount - 1
          ? 0
          : current + 1,
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((current) =>
        current <= 0
          ? itemCount - 1
          : current - 1,
      );

      return;
    }

    if (
      event.key === "Enter" &&
      activeIndex >= 0
    ) {
      event.preventDefault();

      if (
        activeIndex <
        suggestions.length
      ) {
        openProduct(
          suggestions[activeIndex],
        );
      } else {
        openAllResults();
      }
    }
  }

  const showPanel =
    focused &&
    open &&
    canSearch;

  return (
    <div
      ref={rootRef}
      className={cx(
        "smh-searchbox-shell",
        showPanel && "is-open",
      )}
    >
      <form
        className={cx(
          className,
          "smh-searchbox-form",
        )}
        onSubmit={handleSubmit}
        role="search"
      >
        <Search
          size={19}
          aria-hidden="true"
        />

        <input
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls="marketplace-search-suggestions"
          aria-activedescendant={
            activeIndex >= 0
              ? `marketplace-search-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          spellCheck="false"
        />

        <button type="submit">
          Search
        </button>
      </form>

      {showPanel ? (
        <div
          id="marketplace-search-suggestions"
          className="smh-searchbox-panel"
          role="listbox"
          aria-label={`Search suggestions for ${query}`}
        >
          <div className="smh-searchbox-heading">
            <div>
              <strong>
                Product matches
              </strong>

              <span>
                Results update as you type
              </span>
            </div>

            {loading ? (
              <LoaderCircle
                size={18}
                className="is-spinning"
                aria-label="Loading suggestions"
              />
            ) : null}
          </div>

          {loading &&
          suggestions.length === 0 ? (
            <div className="smh-searchbox-loading">
              {[0, 1, 2].map((item) => (
                <div key={item}>
                  <i />
                  <span>
                    <b />
                    <small />
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {!loading &&
          !error &&
          suggestions.length > 0 ? (
            <div className="smh-searchbox-results">
              {suggestions.map(
                (product, index) => {
                  const image =
                    productImageSource(product);

                  const unavailable =
                    product?.seller
                      ?.temporarilyClosed;

                  return (
                    <button
                      id={`marketplace-search-option-${index}`}
                      key={`${product.seller?.slug}-${product.slug}`}
                      type="button"
                      role="option"
                      aria-selected={
                        activeIndex === index
                      }
                      className={cx(
                        "smh-searchbox-product",
                        activeIndex === index &&
                          "is-active",
                      )}
                      onPointerMove={() =>
                        setActiveIndex(index)
                      }
                      onClick={() =>
                        openProduct(product)
                      }
                    >
                      <span className="smh-searchbox-image">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Search
                            size={22}
                            aria-hidden="true"
                          />
                        )}
                      </span>

                      <span className="smh-searchbox-copy">
                        <strong>
                          {product.title}
                        </strong>

                        <span>
                          <Store
                            size={13}
                            aria-hidden="true"
                          />

                          {product.seller?.name ||
                            "Marketplace store"}
                        </span>
                      </span>

                      <span className="smh-searchbox-price">
                        <strong>
                          {formatMoney(
                            product.price,
                            product.currency,
                          )}
                        </strong>

                        <small
                          className={
                            unavailable
                              ? "is-closed"
                              : Number(
                                    product.availableQuantity ||
                                      0,
                                  ) <= 3
                                ? "is-low"
                                : "is-available"
                          }
                        >
                          {unavailable
                            ? "Store closed"
                            : Number(
                                  product.availableQuantity ||
                                    0,
                                ) <= 3
                              ? "Few remaining"
                              : "In stock"}
                        </small>
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          ) : null}

          {!loading &&
          !error &&
          suggestions.length === 0 ? (
            <div className="smh-searchbox-empty">
              <Search
                size={25}
                aria-hidden="true"
              />

              <div>
                <strong>
                  No quick matches
                </strong>

                <span>
                  Search all products for
                  {" "}
                  “{query}”
                </span>
              </div>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="smh-searchbox-error">
              <span>{error}</span>
              <small>
                You can still view the full
                search page.
              </small>
            </div>
          ) : null}

          <button
            id={`marketplace-search-option-${suggestions.length}`}
            type="button"
            role="option"
            aria-selected={
              activeIndex ===
              suggestions.length
            }
            className={cx(
              "smh-searchbox-view-all",
              activeIndex ===
                suggestions.length &&
                "is-active",
            )}
            onPointerMove={() =>
              setActiveIndex(
                suggestions.length,
              )
            }
            onClick={openAllResults}
          >
            <span>
              View all results for
              {" "}
              <strong>“{query}”</strong>
            </span>

            <ArrowRight
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}

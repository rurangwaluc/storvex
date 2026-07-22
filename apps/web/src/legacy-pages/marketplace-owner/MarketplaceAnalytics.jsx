import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  Eye,
  PackageSearch,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import {
  getOwnerMarketplaceAnalytics,
} from "../../services/marketplaceOwnerApi";
import MarketplaceOwnerHeader from "./MarketplaceOwnerHeader";
import "./MarketplaceOwner.css";
import "./MarketplaceAnalytics.css";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const PRODUCT_BATCH_SIZE = 6;
const OPPORTUNITY_BATCH_SIZE = 5;

function toNumber(value) {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatNumber(value) {
  return Math.round(
    toNumber(value),
  ).toLocaleString("en-US");
}

function formatMoney(
  value,
  currency = "RWF",
) {
  return `${currency} ${Math.round(
    toNumber(value),
  ).toLocaleString("en-US")}`;
}

function formatPercent(value) {
  return `${toNumber(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 1,
    },
  )}%`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  tone,
  featured = false,
}) {
  return (
    <article
      className={[
        "svx-market-analytics-metric",
        `is-${tone}`,
        featured ? "is-featured" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="svx-market-analytics-metric-top">
        <span>
          <Icon
            size={19}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>

        <p>{label}</p>
      </div>

      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action = null,
}) {
  return (
    <header className="svx-market-analytics-section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>

        {description ? (
          <p>{description}</p>
        ) : null}
      </div>

      {action}
    </header>
  );
}

function EmptyState({
  icon: Icon = PackageSearch,
  title,
  text,
}) {
  return (
    <div className="svx-market-analytics-empty">
      <Icon
        size={24}
        aria-hidden="true"
      />

      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div
      className="svx-market-analytics-skeleton"
      aria-label="Loading store performance"
      aria-busy="true"
    >
      <section className="svx-market-analytics-metrics">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <article key={index}>
            <span className="svx-market-owner-skeleton is-short" />
            <span className="svx-market-owner-skeleton is-wide" />
            <span className="svx-market-owner-skeleton" />
          </article>
        ))}
      </section>

      <section className="svx-market-analytics-skeleton-grid">
        <div>
          <span className="svx-market-owner-skeleton is-wide" />
          <span className="svx-market-owner-skeleton" />
          <span className="svx-market-owner-skeleton" />
        </div>

        <div>
          <span className="svx-market-owner-skeleton is-wide" />
          <span className="svx-market-owner-skeleton" />
        </div>
      </section>
    </div>
  );
}

export default function MarketplaceAnalytics() {
  const [days, setDays] =
    useState(30);

  const [analytics, setAnalytics] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    visibleProductCount,
    setVisibleProductCount,
  ] = useState(PRODUCT_BATCH_SIZE);

  const [
    visibleSearchCount,
    setVisibleSearchCount,
  ] = useState(OPPORTUNITY_BATCH_SIZE);

  const [
    visibleViewedCount,
    setVisibleViewedCount,
  ] = useState(OPPORTUNITY_BATCH_SIZE);

  const loadAnalytics = useCallback(
    async ({
      refresh = false,
    } = {}) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const result =
          await getOwnerMarketplaceAnalytics({
            days,
          });

        setAnalytics(
          result?.analytics || null,
        );
      } catch (loadError) {
        console.error(loadError);

        const message =
          loadError?.message ||
          "Store performance could not be loaded.";

        setError(message);

        if (!refresh) {
          setAnalytics(null);
        }

        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days],
  );

  useEffect(() => {
    setVisibleProductCount(
      PRODUCT_BATCH_SIZE,
    );

    setVisibleSearchCount(
      OPPORTUNITY_BATCH_SIZE,
    );

    setVisibleViewedCount(
      OPPORTUNITY_BATCH_SIZE,
    );

    void loadAnalytics();
  }, [loadAnalytics]);

  const summary =
    analytics?.summary || {};

  const requests =
    analytics?.requests || {};

  const tracking =
    analytics?.tracking || {};

  const products =
    Array.isArray(
      analytics?.products,
    )
      ? analytics.products
      : [];

  const searches =
    Array.isArray(
      analytics?.searches,
    )
      ? analytics.searches
      : [];

  const trackingStart =
    formatDate(
      tracking.startedAt,
    );

  const hasTrackedActivity =
    toNumber(summary.storeViews) > 0 ||
    toNumber(summary.productViews) > 0 ||
    toNumber(summary.cartAdds) > 0 ||
    toNumber(
      tracking.trackedOrderRequests,
    ) > 0;

  const topProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          toNumber(product.views) > 0 ||
          toNumber(product.requests) > 0 ||
          toNumber(product.cartAdds) > 0 ||
          toNumber(
            product.completedRevenue,
          ) > 0,
      ),
    [products],
  );

  const missingSearches = useMemo(
    () =>
      searches.filter(
        (item) =>
          toNumber(
            item.noResults,
          ) > 0,
      ),
    [searches],
  );

  const viewedWithoutOrders =
    useMemo(
      () =>
        products
          .filter(
            (product) =>
              toNumber(product.views) > 0 &&
              toNumber(
                product.trackedRequests,
              ) === 0,
          )
          .sort(
            (left, right) =>
              toNumber(right.views) -
              toNumber(left.views),
          ),
      [products],
    );

  const visibleProducts =
    topProducts.slice(
      0,
      visibleProductCount,
    );

  const visibleSearches =
    missingSearches.slice(
      0,
      visibleSearchCount,
    );

  const visibleViewedProducts =
    viewedWithoutOrders.slice(
      0,
      visibleViewedCount,
    );

  const hasMoreProducts =
    visibleProductCount <
    topProducts.length;

  const hasMoreSearches =
    visibleSearchCount <
    missingSearches.length;

  const hasMoreViewedProducts =
    visibleViewedCount <
    viewedWithoutOrders.length;

  const actionItems = useMemo(() => {
    const items = [];

    if (missingSearches.length) {
      items.push({
        title: "Add products customers cannot find",
        text: `${missingSearches.length} search ${
          missingSearches.length === 1
            ? "term has"
            : "terms have"
        } returned no products.`,
        to: "/app/inventory",
        label: "Review stock",
      });
    }

    if (viewedWithoutOrders.length) {
      items.push({
        title: "Improve products receiving views",
        text: `${viewedWithoutOrders.length} viewed product${
          viewedWithoutOrders.length === 1
            ? " has"
            : "s have"
        } not produced a tracked order.`,
        to: "/app/inventory",
        label: "Improve listings",
      });
    }

    if (
      toNumber(summary.cartAdds) > 0 &&
      toNumber(
        tracking.trackedOrderRequests,
      ) === 0
    ) {
      items.push({
        title: "Customers stop after adding to cart",
        text: "Check prices, availability, delivery details and store contact information.",
        to: "/app/settings/marketplace",
        label: "Review store setup",
      });
    }

    return items.slice(0, 3);
  }, [
    missingSearches,
    summary.cartAdds,
    tracking.trackedOrderRequests,
    viewedWithoutOrders,
  ]);

  return (
    <div className="svx-market-owner-page svx-market-analytics-page">
      <div className="svx-market-owner-shell">
        <MarketplaceOwnerHeader
          title="Store performance"
          description="See customer interest, Marketplace orders and the products that need your attention."
        />

        <section className="svx-market-analytics-controls">
          <div>
            <span>Time period</span>

            <div
              className="svx-market-analytics-range"
              aria-label="Analytics time period"
            >
              {RANGE_OPTIONS.map(
                (option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      days === option.value
                        ? "is-active"
                        : ""
                    }
                    aria-pressed={
                      days === option.value
                    }
                    onClick={() =>
                      setDays(option.value)
                    }
                  >
                    {option.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <button
            type="button"
            className="svx-market-analytics-refresh"
            disabled={
              loading || refreshing
            }
            onClick={() =>
              void loadAnalytics({
                refresh: true,
              })
            }
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "is-spinning"
                  : ""
              }
              aria-hidden="true"
            />

            <span>
              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </span>
          </button>
        </section>

        {loading ? (
          <AnalyticsSkeleton />
        ) : error || !analytics ? (
          <section className="svx-market-analytics-error">
            <PackageSearch
              size={28}
              aria-hidden="true"
            />

            <h2>Store performance unavailable</h2>
            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                void loadAnalytics()
              }
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            {!hasTrackedActivity ? (
              <section className="svx-market-analytics-start-note">
                <div>
                  <Eye
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <strong>
                    Customer activity tracking has just started
                  </strong>

                  <p>
                    Historical Marketplace orders are shown below.
                    Visitor, view, cart and conversion information
                    will begin filling as customers use your store.
                    {trackingStart
                      ? ` Tracking began on ${trackingStart}.`
                      : ""}
                  </p>
                </div>
              </section>
            ) : trackingStart ? (
              <p className="svx-market-analytics-tracking-note">
                Tracked customer activity began on{" "}
                <strong>{trackingStart}</strong>.
                Historical orders remain included in sales totals.
              </p>
            ) : null}

            <section
              className="svx-market-analytics-metrics"
              aria-label="Marketplace performance summary"
            >
              <MetricCard
                icon={Store}
                label="Marketplace sales"
                value={formatMoney(
                  summary.marketplaceRevenue,
                )}
                note={`${formatNumber(
                  summary.completedOrders,
                )} completed orders`}
                tone="purple"
                featured
              />

              <MetricCard
                icon={ShoppingBag}
                label="Order requests"
                value={formatNumber(
                  summary.orderRequests,
                )}
                note={`${formatNumber(
                  requests.requested,
                )} waiting for review`}
                tone="green"
                featured
              />

              <MetricCard
                icon={Users}
                label="Tracked visitors"
                value={formatNumber(
                  summary.uniqueVisitors,
                )}
                note={`${formatNumber(
                  summary.storeViews,
                )} tracked store visits`}
                tone="blue"
              />

              <MetricCard
                icon={Eye}
                label="Product views"
                value={formatNumber(
                  summary.productViews,
                )}
                note={`${formatNumber(
                  summary.cartAdds,
                )} cart additions`}
                tone="orange"
              />
            </section>

            <section className="svx-market-analytics-order-summary">
              <div>
                <span>Waiting for review</span>
                <strong>
                  {formatNumber(
                    requests.requested,
                  )}
                </strong>
              </div>

              <div>
                <span>Confirmed</span>
                <strong>
                  {formatNumber(
                    requests.confirmed,
                  )}
                </strong>
              </div>

              <div>
                <span>Average completed order</span>
                <strong>
                  {formatMoney(
                    summary.averageOrderValue,
                  )}
                </strong>
              </div>
            </section>

            <div className="svx-market-analytics-content-grid">
              <section className="svx-market-analytics-panel svx-market-analytics-products-panel">
                <SectionHeading
                  eyebrow="Products"
                  title="Products driving Marketplace sales"
                  description="The products receiving orders, views or cart activity in this period."
                  action={
                    <Link to="/app/inventory">
                      Manage products
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                      />
                    </Link>
                  }
                />

                {topProducts.length ? (
                  <div className="svx-market-analytics-list-shell">
                    <div
                      className={[
                        "svx-market-analytics-list-scroll",
                        hasMoreProducts
                          ? "is-scrollable"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="svx-market-analytics-product-list">
                        {visibleProducts.map(
                          (product) => (
                            <article
                              key={
                                product.productId
                              }
                            >
                              <div className="svx-market-analytics-product-copy">
                                <strong
                                  title={product.title}
                                >
                                  {product.title}
                                </strong>

                                <span>
                                  {product.category ||
                                    "Marketplace product"}
                                </span>
                              </div>

                              <div>
                                <span>Views</span>
                                <strong>
                                  {formatNumber(
                                    product.views,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>Cart</span>
                                <strong>
                                  {formatNumber(
                                    product.cartAdds,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>Orders</span>
                                <strong>
                                  {formatNumber(
                                    product.requests,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>Completed sales</span>
                                <strong>
                                  {formatMoney(
                                    product.completedRevenue,
                                  )}
                                </strong>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    </div>

                    {hasMoreProducts ? (
                      <div className="svx-market-analytics-list-footer">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleProductCount(
                              (current) =>
                                current +
                                PRODUCT_BATCH_SIZE,
                            )
                          }
                        >
                          Load more products
                        </button>

                        <span>
                          Showing{" "}
                          {formatNumber(
                            visibleProducts.length,
                          )}{" "}
                          of{" "}
                          {formatNumber(
                            topProducts.length,
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <EmptyState
                    title="No product activity yet"
                    text="Product performance will appear after customers view or order products."
                  />
                )}
              </section>

              <section className="svx-market-analytics-panel">
                <SectionHeading
                  eyebrow="Customer journey"
                  title="From visit to order"
                  description={
                    hasTrackedActivity
                      ? "See how tracked activity moves towards an order."
                      : "Customer activity is needed before a conversion rate can be calculated."
                  }
                />

                <div className="svx-market-analytics-journey">
                  <div>
                    <span>Store visits</span>
                    <strong>
                      {formatNumber(
                        summary.storeViews,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Product views</span>
                    <strong>
                      {formatNumber(
                        summary.productViews,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Added to cart</span>
                    <strong>
                      {formatNumber(
                        summary.cartAdds,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Tracked orders</span>
                    <strong>
                      {formatNumber(
                        tracking.trackedOrderRequests,
                      )}
                    </strong>
                  </div>
                </div>

                <div className="svx-market-analytics-conversion">
                  <span>
                    Product view to order
                  </span>

                  <strong>
                    {hasTrackedActivity
                      ? formatPercent(
                          summary.productConversionRate,
                        )
                      : "Not enough data"}
                  </strong>
                </div>
              </section>
            </div>

            <section className="svx-market-analytics-panel svx-market-analytics-opportunities">
              <SectionHeading
                eyebrow="Opportunities"
                title="What needs your attention"
                description="Missing searches, viewed products and store issues worth reviewing."
              />

              <div className="svx-market-analytics-opportunity-grid">
                <div>
                  <h3>Searches without products</h3>

                  {missingSearches.length ? (
                    <div className="svx-market-analytics-list-shell">
                      <div
                        className={[
                          "svx-market-analytics-list-scroll",
                          "is-compact",
                          hasMoreSearches
                            ? "is-scrollable"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="svx-market-analytics-search-list">
                          {visibleSearches.map(
                            (item) => (
                              <article
                                key={item.term}
                              >
                                <span>
                                  <Search
                                    size={17}
                                    aria-hidden="true"
                                  />
                                </span>

                                <div>
                                  <strong
                                    title={item.term}
                                  >
                                    {item.term}
                                  </strong>

                                  <small>
                                    {formatNumber(
                                      item.noResults,
                                    )}{" "}
                                    search
                                    {toNumber(
                                      item.noResults,
                                    ) === 1
                                      ? ""
                                      : "es"}{" "}
                                    without products
                                  </small>
                                </div>
                              </article>
                            ),
                          )}
                        </div>
                      </div>

                      {hasMoreSearches ? (
                        <div className="svx-market-analytics-list-footer is-compact">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleSearchCount(
                                (current) =>
                                  current +
                                  OPPORTUNITY_BATCH_SIZE,
                              )
                            }
                          >
                            Load more
                          </button>

                          <span>
                            {formatNumber(
                              visibleSearches.length,
                            )}{" "}
                            of{" "}
                            {formatNumber(
                              missingSearches.length,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Search}
                      title="No missing searches"
                      text="Recorded searches found matching products."
                    />
                  )}
                </div>

                <div>
                  <h3>Viewed but not ordered</h3>

                  {viewedWithoutOrders.length ? (
                    <div className="svx-market-analytics-list-shell">
                      <div
                        className={[
                          "svx-market-analytics-list-scroll",
                          "is-compact",
                          hasMoreViewedProducts
                            ? "is-scrollable"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="svx-market-analytics-opportunity-list">
                          {visibleViewedProducts.map(
                            (product) => (
                              <article
                                key={
                                  product.productId
                                }
                              >
                                <div>
                                  <strong
                                    title={product.title}
                                  >
                                    {product.title}
                                  </strong>

                                  <span>
                                    {formatNumber(
                                      product.views,
                                    )}{" "}
                                    product views
                                  </span>
                                </div>

                                <Link to="/app/inventory">
                                  Review
                                </Link>
                              </article>
                            ),
                          )}
                        </div>
                      </div>

                      {hasMoreViewedProducts ? (
                        <div className="svx-market-analytics-list-footer is-compact">
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleViewedCount(
                                (current) =>
                                  current +
                                  OPPORTUNITY_BATCH_SIZE,
                              )
                            }
                          >
                            Load more
                          </button>

                          <span>
                            {formatNumber(
                              visibleViewedProducts.length,
                            )}{" "}
                            of{" "}
                            {formatNumber(
                              viewedWithoutOrders.length,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <EmptyState
                      title="No missed product opportunity"
                      text="Viewed products without tracked orders will appear here."
                    />
                  )}
                </div>

                <div>
                  <h3>Recommended actions</h3>

                  {actionItems.length ? (
                    <div className="svx-market-analytics-actions">
                      {actionItems.map(
                        (action) => (
                          <article
                            key={action.title}
                          >
                            <strong>
                              {action.title}
                            </strong>

                            <p>
                              {action.text}
                            </p>

                            <Link
                              to={action.to}
                            >
                              {action.label}
                              <ArrowRight
                                size={15}
                                aria-hidden="true"
                              />
                            </Link>
                          </article>
                        ),
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      title="Nothing urgent"
                      text="No clear Marketplace issue needs action in this period."
                    />
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

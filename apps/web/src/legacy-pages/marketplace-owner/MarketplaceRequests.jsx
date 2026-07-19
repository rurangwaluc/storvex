import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  listOwnerMarketplaceRequests,
} from "../../services/marketplaceOwnerApi";
import MarketplaceOwnerHeader from "./MarketplaceOwnerHeader";
import "./MarketplaceOwner.css";

const STATUS_FILTERS = [
  {
    value: "ALL",
    label: "All",
  },
  {
    value: "REQUESTED",
    label: "New",
  },
  {
    value: "CONFIRMED",
    label: "Confirmed",
  },
  {
    value: "PREPARING",
    label: "Preparing",
  },
  {
    value: "READY_FOR_PICKUP",
    label: "Ready",
  },
  {
    value: "OUT_FOR_DELIVERY",
    label: "Delivery",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "REJECTED",
    label: "Rejected",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

const PAGE_SIZE = 30;

function cleanString(value) {
  return String(value || "").trim();
}

function formatMoney(
  value,
  currency = "RWF",
) {
  const number = Number(value || 0);

  return `${currency} ${Math.round(
    Number.isFinite(number) ? number : 0,
  ).toLocaleString("en-US")}`;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value) {
  const labels = {
    REQUESTED: "New request",
    CONFIRMED: "Confirmed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    PREPARING: "Preparing",
    READY_FOR_PICKUP: "Ready for pickup",
    OUT_FOR_DELIVERY: "Out for delivery",
    COMPLETED: "Completed",
  };

  return (
    labels[cleanString(value).toUpperCase()] ||
    "Unknown"
  );
}

function fulfilmentLabel(value) {
  return cleanString(value).toUpperCase() ===
    "DELIVERY"
    ? "Delivery"
    : "Pickup";
}

function RequestSkeleton() {
  return (
    <div className="svx-market-owner-list">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="svx-market-owner-row is-loading"
          >
            <div className="svx-market-owner-skeleton is-wide" />
            <div className="svx-market-owner-skeleton" />
            <div className="svx-market-owner-skeleton" />
            <div className="svx-market-owner-skeleton is-short" />
          </div>
        ),
      )}
    </div>
  );
}

function EmptyState({ query, status }) {
  const filtering =
    cleanString(query) ||
    status !== "ALL";

  return (
    <section className="svx-market-owner-empty">
      <div aria-hidden="true">01</div>

      <h2>
        {filtering
          ? "No matching requests"
          : "No customer requests yet"}
      </h2>

      <p>
        {filtering
          ? "Change the search or status filter to see other requests."
          : "New Marketplace requests will appear here as soon as customers submit them."}
      </p>
    </section>
  );
}

export default function MarketplaceRequests() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    newRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalRequests: 0,
  });
  const [page, setPage] = useState(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState("ALL");
  const [loading, setLoading] =
    useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);

  async function loadRequests({
    append = false,
    nextSkip = 0,
  } = {}) {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const result =
        await listOwnerMarketplaceRequests({
          q: cleanString(query) || undefined,
          status:
            status === "ALL"
              ? undefined
              : status,
          take: PAGE_SIZE,
          skip: nextSkip,
        });

      const incoming = Array.isArray(
        result?.requests,
      )
        ? result.requests
        : [];

      setRequests((current) =>
        append
          ? [...current, ...incoming]
          : incoming,
      );

      setSummary(
        result?.summary || {
          newRequests: 0,
          activeRequests: 0,
          completedRequests: 0,
          totalRequests: 0,
        },
      );

      setPage(result?.page || null);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to load Marketplace requests",
      );

      if (!append) {
        setRequests([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [query, status]);

  const shownLabel = useMemo(() => {
    const count = requests.length;

    return `${count} request${
      count === 1 ? "" : "s"
    } shown`;
  }, [requests.length]);

  return (
    <div className="svx-market-owner-page">
      <div className="svx-market-owner-shell">
        <MarketplaceOwnerHeader />

        <section
          className="svx-market-owner-summary"
          aria-label="Marketplace request summary"
        >
          <article>
            <span>New requests</span>
            <strong>
              {summary.newRequests || 0}
            </strong>
            <p>Waiting for your review</p>
          </article>

          <article>
            <span>In progress</span>
            <strong>
              {summary.activeRequests || 0}
            </strong>
            <p>Confirmed or being prepared</p>
          </article>

          <article>
            <span>Completed</span>
            <strong>
              {summary.completedRequests || 0}
            </strong>
            <p>Finished customer requests</p>
          </article>

          <article>
            <span>Total requests</span>
            <strong>
              {summary.totalRequests || 0}
            </strong>
            <p>Matching the current view</p>
          </article>
        </section>

        <section className="svx-market-owner-toolbar">
          <div className="svx-market-owner-search">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />
              <path d="m20 20-3.7-3.7" />
            </svg>

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search request, customer or product"
              aria-label="Search Marketplace requests"
            />
          </div>

          <label className="svx-market-owner-mobile-filter">
            <span>Status</span>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
            >
              {STATUS_FILTERS.map(
                (filter) => (
                  <option
                    key={filter.value}
                    value={filter.value}
                  >
                    {filter.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <div
            className="svx-market-owner-filters"
            aria-label="Request status filters"
          >
            {STATUS_FILTERS.map(
              (filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={
                    status === filter.value
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setStatus(filter.value)
                  }
                >
                  {filter.label}
                </button>
              ),
            )}
          </div>
        </section>

        <section className="svx-market-owner-register">
          <header>
            <div>
              <span>Customer requests</span>
              <h2>Request register</h2>
            </div>

            <p>{shownLabel}</p>
          </header>

          {!loading && requests.length ? (
            <div
              className="svx-market-owner-table-head"
              aria-hidden="true"
            >
              <span>Request</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Fulfilment</span>
              <span>Total</span>
              <span>Status</span>
              <span></span>
            </div>
          ) : null}

          {loading ? (
            <RequestSkeleton />
          ) : requests.length ? (
            <div className="svx-market-owner-list">
              {requests.map((request) => {
                const firstItem =
                  request.items?.[0];
                const extraItems =
                  Number(
                    request?._count?.items || 0,
                  ) - 1;

                return (
                  <button
                    key={request.id}
                    type="button"
                    className="svx-market-owner-row"
                    onClick={() =>
                      navigate(
                        `/app/marketplace/requests/${request.id}`,
                      )
                    }
                  >
                    <div className="svx-market-owner-request-cell">
                      <strong>
                        {request.requestNumber}
                      </strong>
                      <span>
                        {formatDateTime(
                          request.submittedAt,
                        )}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {request.customerName}
                      </strong>
                      <span>
                        {request.customerPhone ||
                          request.customerEmail ||
                          "No contact saved"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {firstItem?.productTitleSnapshot ||
                          "Request items"}
                      </strong>
                      <span>
                        {firstItem
                          ? `${firstItem.quantity} requested`
                          : "No item preview"}
                        {extraItems > 0
                          ? ` and ${extraItems} more`
                          : ""}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {fulfilmentLabel(
                          request.fulfilmentMethod,
                        )}
                      </strong>
                      <span>
                        {request.deliveryCoverage ===
                        "OUTSIDE_KIGALI"
                          ? "Outside Kigali"
                          : request.deliveryCoverage ===
                              "KIGALI"
                            ? "Kigali"
                            : "Store pickup"}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {formatMoney(
                          request.total,
                          request.currency,
                        )}
                      </strong>
                      <span>
                        {request?._count?.items || 0}{" "}
                        item
                        {Number(
                          request?._count?.items ||
                            0,
                        ) === 1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`svx-market-owner-status is-${cleanString(
                          request.status,
                        ).toLowerCase()}`}
                      >
                        {statusLabel(
                          request.status,
                        )}
                      </span>
                    </div>

                    <div className="svx-market-owner-open">
                      <span>Open</span>
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                );
              })}

              {page?.hasMore ? (
                <div className="svx-market-owner-load-more">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() =>
                      void loadRequests({
                        append: true,
                        nextSkip:
                          page.nextSkip || 0,
                      })
                    }
                  >
                    {loadingMore
                      ? "Loading requests..."
                      : "Load more requests"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              query={query}
              status={status}
            />
          )}
        </section>
      </div>
    </div>
  );
}

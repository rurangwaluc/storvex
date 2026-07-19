import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
  getOwnerMarketplaceRequest,
} from "../../services/marketplaceOwnerApi";
import MarketplaceOwnerHeader from "./MarketplaceOwnerHeader";
import "./MarketplaceOwner.css";

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

function readableEnum(value) {
  return cleanString(value)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function DetailSkeleton() {
  return (
    <div className="svx-market-owner-detail-grid">
      <div className="svx-market-owner-detail-main">
        {Array.from({ length: 3 }).map(
          (_, index) => (
            <section
              key={index}
              className="svx-market-owner-detail-card is-loading"
            >
              <div className="svx-market-owner-skeleton is-wide" />
              <div className="svx-market-owner-skeleton" />
              <div className="svx-market-owner-skeleton" />
            </section>
          ),
        )}
      </div>

      <aside className="svx-market-owner-detail-side">
        <section className="svx-market-owner-detail-card is-loading">
          <div className="svx-market-owner-skeleton is-wide" />
          <div className="svx-market-owner-skeleton" />
          <div className="svx-market-owner-skeleton" />
        </section>
      </aside>
    </div>
  );
}

export default function MarketplaceRequestDetail() {
  const { requestId } = useParams();

  const [request, setRequest] =
    useState(null);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let alive = true;

    async function loadRequest() {
      try {
        setLoading(true);

        const result =
          await getOwnerMarketplaceRequest(
            requestId,
          );

        if (alive) {
          setRequest(result?.request || null);
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Failed to load Marketplace request",
        );

        if (alive) {
          setRequest(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadRequest();

    return () => {
      alive = false;
    };
  }, [requestId]);

  const itemCount = useMemo(
    () =>
      Array.isArray(request?.items)
        ? request.items.reduce(
            (sum, item) =>
              sum +
              Number(item.quantity || 0),
            0,
          )
        : 0,
    [request],
  );

  return (
    <div className="svx-market-owner-page svx-market-owner-detail-page">
      <div className="svx-market-owner-shell">
        <MarketplaceOwnerHeader />

        <div className="svx-market-owner-detail-back">
          <Link to="/app/marketplace">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>

            <span>Back to requests</span>
          </Link>
        </div>

        {loading ? (
          <DetailSkeleton />
        ) : !request ? (
          <section className="svx-market-owner-empty">
            <div aria-hidden="true">?</div>

            <h2>Request not found</h2>

            <p>
              This request may have been removed
              or belongs to another business.
            </p>

            <Link to="/app/marketplace">
              Return to requests
            </Link>
          </section>
        ) : (
          <>
            <section className="svx-market-owner-detail-hero">
              <div>
                <span>Customer request</span>

                <h2>{request.requestNumber}</h2>

                <p>
                  Submitted{" "}
                  {formatDateTime(
                    request.submittedAt,
                  )}
                </p>
              </div>

              <span
                className={`svx-market-owner-status is-${cleanString(
                  request.status,
                ).toLowerCase()}`}
              >
                {statusLabel(request.status)}
              </span>
            </section>

            <div className="svx-market-owner-detail-grid">
              <main className="svx-market-owner-detail-main">
                <section className="svx-market-owner-detail-card">
                  <header>
                    <span>Requested products</span>
                    <h3>
                      {itemCount} item
                      {itemCount === 1 ? "" : "s"}
                    </h3>
                  </header>

                  <div className="svx-market-owner-items">
                    {request.items.map((item) => (
                      <article key={item.id}>
                        <div className="svx-market-owner-product-image">
                          {item.productImageSnapshot ? (
                            <img
                              src={
                                item.productImageSnapshot
                              }
                              alt=""
                            />
                          ) : (
                            <span aria-hidden="true">
                              SVX
                            </span>
                          )}
                        </div>

                        <div>
                          <strong>
                            {
                              item.productTitleSnapshot
                            }
                          </strong>

                          <span>
                            {item.productCategorySnapshot ||
                              "Marketplace product"}
                          </span>

                          <p>
                            {item.quantity} ×{" "}
                            {formatMoney(
                              item.unitPrice,
                              request.currency,
                            )}
                          </p>
                        </div>

                        <strong>
                          {formatMoney(
                            item.lineTotal,
                            request.currency,
                          )}
                        </strong>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="svx-market-owner-detail-card">
                  <header>
                    <span>Customer</span>
                    <h3>
                      {request.customerName}
                    </h3>
                  </header>

                  <div className="svx-market-owner-info-grid">
                    <div>
                      <span>Phone</span>
                      <strong>
                        {request.customerPhone ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>
                        {request.customerEmail ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Preferred contact
                      </span>
                      <strong>
                        {readableEnum(
                          request.preferredContact,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Customer note</span>
                      <strong>
                        {request.customerNote ||
                          "No note provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="svx-market-owner-contact-actions">
                    {request.customerPhone ? (
                      <a
                        href={`tel:${request.customerPhone}`}
                      >
                        Call customer
                      </a>
                    ) : null}

                    {request.customerPhone ? (
                      <a
                        href={`https://wa.me/${String(
                          request.customerPhone,
                        ).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open WhatsApp
                      </a>
                    ) : null}

                    {request.customerEmail ? (
                      <a
                        href={`mailto:${request.customerEmail}`}
                      >
                        Send email
                      </a>
                    ) : null}
                  </div>
                </section>

                <section className="svx-market-owner-detail-card">
                  <header>
                    <span>Fulfilment</span>
                    <h3>
                      {readableEnum(
                        request.fulfilmentMethod,
                      )}
                    </h3>
                  </header>

                  <div className="svx-market-owner-info-grid">
                    <div>
                      <span>Method</span>
                      <strong>
                        {readableEnum(
                          request.fulfilmentMethod,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Area</span>
                      <strong>
                        {request.deliveryCoverage
                          ? readableEnum(
                              request.deliveryCoverage,
                            )
                          : "Store pickup"}
                      </strong>
                    </div>

                    <div>
                      <span>District</span>
                      <strong>
                        {request.deliveryDistrict ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div>
                      <span>Sector</span>
                      <strong>
                        {request.deliverySector ||
                          "Not provided"}
                      </strong>
                    </div>

                    <div className="is-wide">
                      <span>Delivery address</span>
                      <strong>
                        {request.deliveryAddress ||
                          "Not required for pickup"}
                      </strong>
                    </div>
                  </div>
                </section>
              </main>

              <aside className="svx-market-owner-detail-side">
                <section className="svx-market-owner-detail-card">
                  <header>
                    <span>Request total</span>
                    <h3>
                      {formatMoney(
                        request.total,
                        request.currency,
                      )}
                    </h3>
                  </header>

                  <div className="svx-market-owner-money-list">
                    <div>
                      <span>Products</span>
                      <strong>
                        {formatMoney(
                          request.subtotal,
                          request.currency,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Delivery</span>
                      <strong>
                        {formatMoney(
                          request.deliveryFee,
                          request.currency,
                        )}
                      </strong>
                    </div>

                    <div className="is-total">
                      <span>Total</span>
                      <strong>
                        {formatMoney(
                          request.total,
                          request.currency,
                        )}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="svx-market-owner-detail-card">
                  <header>
                    <span>Request details</span>
                    <h3>Tracking</h3>
                  </header>

                  <div className="svx-market-owner-side-list">
                    <div>
                      <span>Payment</span>
                      <strong>
                        Confirm with customer
                      </strong>
                    </div>

                    <div>
                      <span>Submitted</span>
                      <strong>
                        {formatDateTime(
                          request.submittedAt,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Last updated</span>
                      <strong>
                        {formatDateTime(
                          request.updatedAt,
                        )}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="svx-market-owner-next-step">
                  <span>Next step</span>

                  <h3>
                    Review stock before confirming
                  </h3>

                  <p>
                    Confirmation, stock reservation
                    and sale creation will be added
                    in the next workflow stage.
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCw,
  Store,
  Truck,
} from "lucide-react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  trackMarketplaceOrder,
} from "../../services/marketplaceApi";

import {
  MarketplaceFooter,
  MarketplaceHeader,
  formatMoney,
  marketplaceErrorMessage,
} from "./MarketplaceHome";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";
import "./MarketplaceOrderTracking.css";

function cleanString(value) {
  return String(value || "").trim();
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-RW",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function fulfilmentLabel(order) {
  return order?.fulfilmentMethod ===
    "DELIVERY"
    ? "Delivery"
    : "Pickup";
}

function paymentLabel(value) {
  const labels = {
    CASH_ON_DELIVERY:
      "Cash on delivery",
    MOMO_ON_DELIVERY:
      "MoMo on delivery",
    PAY_ON_PICKUP:
      "Pay on pickup",
    SELLER_APPROVED_OTHER:
      "Agreed with store",
  };

  return (
    labels[value] ||
    "Pay at handover"
  );
}

function statusIcon(key) {
  if (
    key === "COMPLETED" ||
    key === "READY_FOR_PICKUP"
  ) {
    return PackageCheck;
  }

  if (
    key === "OUT_FOR_DELIVERY"
  ) {
    return Truck;
  }

  if (
    key === "DELIVERY_FAILED" ||
    key === "REJECTED" ||
    key === "CANCELLED"
  ) {
    return AlertCircle;
  }

  if (
    key === "CONFIRMED"
  ) {
    return Check;
  }

  return Clock3;
}

function TrackingSkeleton() {
  return (
    <main className="svx-tracking-main">
      <div className="svx-tracking-shell">
        <div className="svx-tracking-skeleton is-title" />
        <div className="svx-tracking-skeleton is-hero" />
        <div className="svx-tracking-skeleton is-panel" />
        <div className="svx-tracking-skeleton is-panel" />
      </div>
    </main>
  );
}

function TrackingError({
  message,
  onRetry,
}) {
  return (
    <main className="svx-tracking-main">
      <section className="svx-tracking-state">
        <AlertCircle
          size={34}
          aria-hidden="true"
        />

        <p>Order tracking</p>
        <h1>
          We could not load this order
        </h1>

        <span>
          {message}
        </span>

        <div className="svx-tracking-state-actions">
          <button
            type="button"
            onClick={onRetry}
          >
            <RefreshCw
              size={17}
              aria-hidden="true"
            />
            Try again
          </button>

          <Link to="/marketplace">
            Back to Marketplace
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function MarketplaceOrderTracking() {
  const {
    trackingToken,
  } = useParams();

  const [
    order,
    setOrder,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const loadOrder =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await trackMarketplaceOrder(
            trackingToken,
          );

        if (!result?.order) {
          throw new Error(
            "This tracking link is not available.",
          );
        }

        setOrder(result.order);
      } catch (loadError) {
        setOrder(null);
        setError(
          marketplaceErrorMessage(
            loadError,
            "This tracking link could not be loaded.",
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [trackingToken]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  if (loading) {
    return (
      <>
        <MarketplaceHeader />
        <TrackingSkeleton />
        <MarketplaceFooter />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <MarketplaceHeader />
        <TrackingError
          message={error}
          onRetry={loadOrder}
        />
        <MarketplaceFooter />
      </>
    );
  }

  const sellerPhone =
    cleanString(
      order.seller?.phone,
    );

  return (
    <>
      <MarketplaceHeader />

      <main className="svx-tracking-main">
        <div className="svx-tracking-shell">
          <Link
            to="/marketplace"
            className="svx-tracking-back"
          >
            <ArrowLeft
              size={17}
              aria-hidden="true"
            />
            Marketplace
          </Link>

          <header className="svx-tracking-heading">
            <div>
              <p>Order tracking</p>
              <h1>
                {order.orderNumber}
              </h1>
            </div>

            <span
              className={`svx-tracking-status is-${String(
                order.status,
              ).toLowerCase()}`}
            >
              {order.statusLabel}
            </span>
          </header>

          <section className="svx-tracking-summary">
            <div className="svx-tracking-summary-main">
              <span>
                Current update
              </span>

              <h2>
                {order.statusLabel}
              </h2>

              <p>
                {order.status ===
                "REQUESTED"
                  ? `${order.seller.name} has received your order and will confirm it.`
                  : order.status ===
                      "CONFIRMED"
                    ? "The store confirmed your order and reserved the products."
                    : order.status ===
                        "PREPARING"
                      ? "The store is preparing your products."
                      : order.status ===
                          "READY_FOR_PICKUP"
                        ? "Your order is ready. Contact the store before travelling if needed."
                        : order.status ===
                            "OUT_FOR_DELIVERY"
                          ? "Your order has left the store for delivery."
                          : order.status ===
                              "COMPLETED"
                            ? "The order was handed over and payment was recorded."
                            : order.status ===
                                "DELIVERY_FAILED"
                              ? order
                                  .deliveryFailure
                                  ?.message
                              : order.status ===
                                  "REJECTED"
                                ? "The store could not accept this order."
                                : "This order was cancelled."}
              </p>
            </div>

            <dl className="svx-tracking-summary-details">
              <div>
                <dt>
                  Fulfilment
                </dt>
                <dd>
                  {fulfilmentLabel(
                    order,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Payment
                </dt>
                <dd>
                  {paymentLabel(
                    order.paymentMethod,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Total
                </dt>
                <dd>
                  {formatMoney(
                    order.total,
                    order.currency,
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <div className="svx-tracking-layout">
            <section className="svx-tracking-panel">
              <div className="svx-tracking-panel-head">
                <div>
                  <p>Progress</p>
                  <h2>
                    Order timeline
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={loadOrder}
                  aria-label="Refresh order"
                >
                  <RefreshCw
                    size={17}
                    aria-hidden="true"
                  />
                  Refresh
                </button>
              </div>

              <ol className="svx-tracking-timeline">
                {order.timeline.map(
                  (step) => {
                    const Icon =
                      statusIcon(
                        step.key,
                      );

                    return (
                      <li
                        key={step.key}
                        className={
                          step.reached
                            ? "is-reached"
                            : ""
                        }
                      >
                        <span className="svx-tracking-timeline-icon">
                          <Icon
                            size={17}
                            aria-hidden="true"
                          />
                        </span>

                        <div>
                          <strong>
                            {step.label}
                          </strong>

                          {step.at ? (
                            <small>
                              {formatDateTime(
                                step.at,
                              )}
                            </small>
                          ) : (
                            <small>
                              Waiting
                            </small>
                          )}
                        </div>
                      </li>
                    );
                  },
                )}
              </ol>
            </section>

            <aside className="svx-tracking-panel">
              <div className="svx-tracking-panel-head">
                <div>
                  <p>Store</p>
                  <h2>
                    {order.seller.name}
                  </h2>
                </div>

                <Store
                  size={22}
                  aria-hidden="true"
                />
              </div>

              {order.pickupLocation ? (
                <div className="svx-tracking-location">
                  <MapPin
                    size={18}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      {order
                        .pickupLocation
                        .name}
                    </strong>

                    <span>
                      {[
                        order
                          .pickupLocation
                          .address,
                        order
                          .pickupLocation
                          .sector,
                        order
                          .pickupLocation
                          .district,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              ) : null}

              {order.deliveryLocation ? (
                <div className="svx-tracking-location">
                  <MapPin
                    size={18}
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      Delivery area
                    </strong>

                    <span>
                      {[
                        order
                          .deliveryLocation
                          .sector,
                        order
                          .deliveryLocation
                          .district,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "Confirmed with store"}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="svx-tracking-contact-actions">
                {order.seller
                  ?.whatsappHref ? (
                  <a
                    href={
                      order.seller
                        .whatsappHref
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle
                      size={17}
                      aria-hidden="true"
                    />
                    WhatsApp store
                  </a>
                ) : null}

                {order.seller
                  ?.phoneHref ? (
                  <a
                    href={
                      order.seller
                        .phoneHref
                    }
                    className="is-secondary"
                  >
                    <Phone
                      size={17}
                      aria-hidden="true"
                    />
                    {sellerPhone ||
                      "Call store"}
                  </a>
                ) : null}
              </div>
            </aside>
          </div>

          <section className="svx-tracking-panel">
            <div className="svx-tracking-panel-head">
              <div>
                <p>Products</p>
                <h2>
                  Order summary
                </h2>
              </div>

              <strong>
                {order.items.length}{" "}
                {order.items.length ===
                1
                  ? "product"
                  : "products"}
              </strong>
            </div>

            <div className="svx-tracking-items">
              {order.items.map(
                (item) => (
                  <article
                    key={item.id}
                    className="svx-tracking-item"
                  >
                    <div className="svx-tracking-item-image">
                      {item.imageUrl ? (
                        <img
                          src={
                            item.imageUrl
                          }
                          alt={
                            item.title
                          }
                        />
                      ) : (
                        <PackageCheck
                          size={22}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <div className="svx-tracking-item-copy">
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        Quantity{" "}
                        {item.quantity}
                      </span>
                    </div>

                    <b>
                      {formatMoney(
                        item.lineTotal,
                        order.currency,
                      )}
                    </b>
                  </article>
                ),
              )}
            </div>

            <dl className="svx-tracking-money">
              <div>
                <dt>Products</dt>
                <dd>
                  {formatMoney(
                    order.subtotal,
                    order.currency,
                  )}
                </dd>
              </div>

              {order.deliveryFee >
              0 ? (
                <div>
                  <dt>Delivery</dt>
                  <dd>
                    {formatMoney(
                      order.deliveryFee,
                      order.currency,
                    )}
                  </dd>
                </div>
              ) : null}

              <div className="is-total">
                <dt>Total</dt>
                <dd>
                  {formatMoney(
                    order.total,
                    order.currency,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>

      <MarketplaceFooter />
    </>
  );
}

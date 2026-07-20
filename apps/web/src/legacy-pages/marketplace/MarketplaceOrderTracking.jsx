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

function statusMessage(order) {
  const messages = {
    REQUESTED:
      "The store will review the order and confirm whether the products are available.",
    CONFIRMED:
      "Your products are reserved. The store will now prepare the order.",
    PREPARING:
      order?.fulfilmentMethod === "PICKUP"
        ? "The store is preparing your products and will mark the order ready for pickup."
        : "The store is preparing your products before sending them for delivery.",
    READY_FOR_PICKUP:
      "You can collect the order from the pickup location shown below and pay at handover.",
    OUT_FOR_DELIVERY:
      "Keep your phone available so the store or delivery person can reach you.",
    DELIVERY_FAILED:
      "Contact the store to agree on another delivery attempt or another way to receive the order.",
    COMPLETED:
      "Your order has been handed over and payment has been recorded.",
    REJECTED:
      "The store could not accept this order. Contact the store if you need more information.",
    CANCELLED:
      "This order will not continue. You can return to Marketplace and place another order.",
  };

  return (
    messages[order?.status] ||
    "Contact the store if you need help with this order."
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

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const loadOrder =
    useCallback(async (
      mode = "initial",
    ) => {
      const isRefresh =
        mode === "refresh";

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

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
        const message =
          marketplaceErrorMessage(
            loadError,
            "This tracking link could not be loaded.",
          );

        setError(message);

        if (!isRefresh) {
          setOrder(null);
        }
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    }, [trackingToken]);

  useEffect(() => {
    void loadOrder("initial");
  }, [loadOrder]);

  if (loading) {
    return (
      <div className="storvex-landing storvex-marketplace svx-tracking-page">
        <MarketplaceHeader />
        <TrackingSkeleton />
        <MarketplaceFooter showCta={false} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="storvex-landing storvex-marketplace svx-tracking-page">
        <MarketplaceHeader />
        <TrackingError
          message={error}
          onRetry={() =>
            void loadOrder("initial")
          }
        />
        <MarketplaceFooter showCta={false} />
      </div>
    );
  }

  return (
    <div className="storvex-landing storvex-marketplace svx-tracking-page">
      <MarketplaceHeader />

      <main
        className="svx-tracking-main"
        aria-busy={refreshing}
      >
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
              <p>Your order</p>
              <h1>
                Track your order
              </h1>

              <span className="svx-tracking-order-number">
                Order {order.orderNumber}
              </span>
            </div>


          </header>

          <section className="svx-tracking-summary">
            <div className="svx-tracking-summary-main">
              <span>
                Latest update
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
                        ? "Your order is ready for collection."
                        : order.status ===
                            "OUT_FOR_DELIVERY"
                          ? "Your order has left the store for delivery."
                          : order.status ===
                              "COMPLETED"
                            ? "The order was handed over successfully."
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

              <div className="svx-tracking-next-step">
                <strong>
                  What happens next
                </strong>

                <span>
                  {statusMessage(order)}
                </span>
              </div>
            </div>

            <dl className="svx-tracking-summary-details">
              <div>
                <dt>
                  Receive by
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
                  <p>Order progress</p>
                  <h2>
                    Where your order is
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadOrder("refresh")
                  }
                  disabled={refreshing}
                  aria-label={
                    refreshing
                      ? "Refreshing order"
                      : "Refresh order"
                  }
                >
                  <RefreshCw
                    size={17}
                    aria-hidden="true"
                    className={
                      refreshing
                        ? "is-spinning"
                        : undefined
                    }
                  />
                  {refreshing
                    ? "Refreshing"
                    : "Refresh"}
                </button>
              </div>

              {error ? (
                <p
                  className="svx-tracking-refresh-error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

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
                              Not started
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
                  <p>Ordered from</p>
                  <h2>
                    {order.seller.name}
                  </h2>
                </div>
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
                    Call store
                  </a>
                ) : null}
              </div>
            </aside>
          </div>

          <section className="svx-tracking-panel">
            <div className="svx-tracking-panel-head">
              <div>
                <p>Your items</p>
                <h2>
                  What you ordered
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
                <dt>Items</dt>
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
                  <dt>Delivery fee</dt>
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

      <MarketplaceFooter showCta={false} />
    </div>
  );
}

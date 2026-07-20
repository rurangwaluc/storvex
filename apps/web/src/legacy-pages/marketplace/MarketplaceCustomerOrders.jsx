import {
  AlertCircle,
  ArrowRight,
  Clock3,
  PackageCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  loadMarketplaceCustomerOrders,
} from "../../services/marketplaceCustomerAuth";
import {
  formatMoney,
} from "./MarketplaceHome";

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-RW",
    {
      dateStyle: "medium",
    },
  ).format(date);
}

function receiveByLabel(value) {
  return value === "DELIVERY"
    ? "Delivery"
    : "Store pickup";
}

function categoryLabel(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized.includes("electronic") ||
    normalized.includes("phone") ||
    normalized.includes("computer")
  ) {
    return "Electronics";
  }

  if (
    normalized.includes("hardware") ||
    normalized.includes("building") ||
    normalized.includes("construction")
  ) {
    return "Hardware and building materials";
  }

  if (
    normalized.includes("home") ||
    normalized.includes("kitchen") ||
    normalized.includes("household")
  ) {
    return "Home and kitchen materials";
  }

  if (
    normalized.includes("light") ||
    normalized.includes("bulb") ||
    normalized.includes("lamp")
  ) {
    return "Lighting";
  }

  if (
    normalized.includes("spare") ||
    normalized.includes("part") ||
    normalized.includes("replacement")
  ) {
    return "Spare parts";
  }

  return "";
}

function statusIcon(status) {
  if (
    status === "COMPLETED" ||
    status === "READY_FOR_PICKUP"
  ) {
    return PackageCheck;
  }

  if (status === "OUT_FOR_DELIVERY") {
    return Truck;
  }

  if (
    status === "REJECTED" ||
    status === "CANCELLED" ||
    status === "DELIVERY_FAILED"
  ) {
    return AlertCircle;
  }

  return Clock3;
}

function OrdersSkeleton() {
  return (
    <section
      className="svx-customer-orders"
      aria-busy="true"
      aria-label="Loading your orders"
    >
      <div className="svx-customer-orders-heading">
        <div>
          <span className="svx-customer-order-skeleton is-heading" />
          <span className="svx-customer-order-skeleton is-copy" />
        </div>
      </div>

      <div className="svx-customer-orders-list">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="svx-customer-order-card is-skeleton"
          >
            <div className="svx-customer-order-top">
              <span className="svx-customer-order-skeleton is-store" />
              <span className="svx-customer-order-skeleton is-status" />
            </div>

            <span className="svx-customer-order-skeleton is-product" />

            <div className="svx-customer-order-skeleton-details">
              <span />
              <span />
              <span />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyOrders() {
  return (
    <section className="svx-customer-orders">
      <div className="svx-customer-orders-heading">
        <div>
          <h2>My orders</h2>
          <p>
            Your Marketplace orders will appear here.
          </p>
        </div>
      </div>

      <div className="svx-customer-orders-empty">
        <ShoppingBag
          size={30}
          aria-hidden="true"
        />

        <h3>You have not placed an order yet</h3>

        <p>
          Browse products and place your first order.
        </p>

        <Link to="/marketplace">
          Browse products
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}

export default function MarketplaceCustomerOrders() {
  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadOrders =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await loadMarketplaceCustomerOrders();

        setOrders(
          Array.isArray(result?.orders)
            ? result.orders
            : [],
        );
      } catch (requestError) {
        setError(
          requestError?.message ||
            "We could not load your orders.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  if (loading) {
    return <OrdersSkeleton />;
  }

  if (error) {
    return (
      <section className="svx-customer-orders">
        <div className="svx-customer-orders-heading">
          <div>
            <h2>My orders</h2>
            <p>
              Orders placed using your account.
            </p>
          </div>
        </div>

        <div className="svx-customer-orders-error">
          <AlertCircle size={26} />

          <div>
            <h3>We could not load your orders</h3>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders()}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!orders.length) {
    return <EmptyOrders />;
  }

  return (
    <section className="svx-customer-orders">
      <div className="svx-customer-orders-heading">
        <div>
          <h2>My orders</h2>
          <p>
            Follow your orders and see what happens next.
          </p>
        </div>

        <strong>
          {orders.length}{" "}
          {orders.length === 1
            ? "order"
            : "orders"}
        </strong>
      </div>

      <div className="svx-customer-orders-list">
        {orders.map((order) => {
          const StatusIcon =
            statusIcon(order.status);

          const firstItem =
            order.items?.[0];

          const remainingItems =
            Math.max(
              0,
              Number(order.itemCount || 0) - 1,
            );

          return (
            <article
              key={order.id}
              className="svx-customer-order-card"
            >
              <div className="svx-customer-order-top">
                <div>
                  <span>Store</span>
                  <h3>{order.storeName}</h3>
                </div>

                <div
                  className={`svx-customer-order-status is-${String(
                    order.status || "",
                  ).toLowerCase()}`}
                >
                  <StatusIcon size={16} />
                  {order.statusLabel}
                </div>
              </div>

              <div className="svx-customer-order-product">
                {firstItem?.image ? (
                  <img
                    src={firstItem.image}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="svx-customer-order-product-image">
                    <ShoppingBag size={21} />
                  </span>
                )}

                <div>
                  <strong>
                    {firstItem?.name ||
                      "Marketplace order"}
                  </strong>

                  {categoryLabel(
                    firstItem?.category,
                  ) ? (
                    <span>
                      {categoryLabel(
                        firstItem?.category,
                      )}
                    </span>
                  ) : null}

                  {remainingItems > 0 ? (
                    <small>
                      and {remainingItems} more{" "}
                      {remainingItems === 1
                        ? "product"
                        : "products"}
                    </small>
                  ) : null}
                </div>
              </div>

              <dl className="svx-customer-order-details">
                <div>
                  <dt>Order</dt>
                  <dd>{order.orderNumber}</dd>
                </div>

                <div>
                  <dt>Placed</dt>
                  <dd>{formatDate(order.placedAt)}</dd>
                </div>

                <div>
                  <dt>Receive by</dt>
                  <dd>
                    {receiveByLabel(
                      order.fulfilmentMethod,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Total</dt>
                  <dd>
                    {formatMoney(
                      order.total,
                      order.currency,
                    )}
                  </dd>
                </div>
              </dl>

              <Link
                to={`/marketplace/orders/${encodeURIComponent(
                  order.trackingToken,
                )}`}
                className="svx-customer-order-link"
              >
                View order
                <ArrowRight size={17} />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

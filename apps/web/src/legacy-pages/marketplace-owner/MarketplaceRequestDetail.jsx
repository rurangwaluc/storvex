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
  cancelOwnerMarketplaceRequest,
  completePickupOwnerMarketplaceRequest,
  confirmOwnerMarketplaceRequest,
  getOwnerMarketplaceRequest,
  markOutForDeliveryOwnerMarketplaceRequest,
  markReadyOwnerMarketplaceRequest,
  rejectOwnerMarketplaceRequest,
  startPreparingOwnerMarketplaceRequest,
} from "../../services/marketplaceOwnerApi";
import {
  listBranches,
} from "../../services/branchApi";
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
    REQUESTED: "New order request",
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

function normalizeWhatsAppPhone(value) {
  let digits = cleanString(value).replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0") && digits.length === 10) {
    digits = `250${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith("7")) {
    digits = `250${digits}`;
  }

  return digits;
}

function fulfilmentLabel(request) {
  if (request?.fulfilmentMethod === "DELIVERY") {
    if (request?.deliveryCoverage === "OUTSIDE_KIGALI") {
      return "Delivery outside Kigali";
    }

    return "Delivery in Kigali";
  }

  return "Store pickup";
}

function pickupLocationDetails(request) {
  const status = cleanString(
    request?.status,
  ).toUpperCase();

  if (
    request?.fulfilmentMethod !==
      "PICKUP" ||
    status === "REQUESTED"
  ) {
    return null;
  }

  const branch =
    request?.fulfilmentBranch;

  if (!branch) {
    return null;
  }

  const name = cleanString(
    branch.name,
  );

  const addressParts = [];

  [
    branch.address,
    branch.sector,
    branch.district,
  ].forEach((value) => {
    const cleaned = cleanString(value);

    if (
      cleaned &&
      !addressParts.some(
        (existing) =>
          existing.toLowerCase() ===
          cleaned.toLowerCase(),
      )
    ) {
      addressParts.push(cleaned);
    }
  });

  const phone = cleanString(
    branch.phone,
  );

  if (
    !name &&
    !addressParts.length &&
    !phone
  ) {
    return null;
  }

  return {
    name,
    address:
      addressParts.join(", "),
    phone,
  };
}

function requestProductWording(request) {
  const productCount = Array.isArray(request?.items)
    ? request.items.length
    : 0;

  const isMultiple = productCount > 1;

  return {
    isMultiple,
    product: isMultiple
      ? "products"
      : "product",
    productIs: isMultiple
      ? "products are"
      : "product is",
    productHas: isMultiple
      ? "products have"
      : "product has",
    requestedProducts: isMultiple
      ? "Order items"
      : "Order item",
    yourProducts: isMultiple
      ? "your products"
      : "your product",
    yourProductsSentence: isMultiple
      ? "Your products"
      : "Your product",
  };
}

function ownerReplyStatusMessage(request) {
  const status = cleanString(
    request?.status,
  ).toUpperCase();

  const {
    product,
    productIs,
    productHas,
    yourProducts,
    yourProductsSentence,
  } = requestProductWording(request);

  const messages = {
    REQUESTED:
      `We received your order request and are checking whether the ${productIs} available.`,

    CONFIRMED:
      `Your order has been confirmed. The ${productIs} available and ${productHas} been reserved for you.`,

    PREPARING:
      `We are preparing ${yourProducts}.`,

    READY_FOR_PICKUP:
      `${yourProductsSentence} ${
        product === "products"
          ? "are"
          : "is"
      } ready for pickup.`,

    OUT_FOR_DELIVERY:
      `${yourProductsSentence} ${
        product === "products"
          ? "are"
          : "is"
      } now out for delivery.`,

    COMPLETED:
      "Your order has been completed. Thank you for choosing us.",

    REJECTED:
      `We are sorry, but we are unable to fulfil your order for the requested ${product}.`,

    CANCELLED:
      "This order has been cancelled.",
  };

  return (
    messages[status] ||
    "We are contacting you with an update about your order."
  );
}

function buildOwnerMessage(
  request,
  {
    whatsapp = false,
  } = {},
) {
  const businessName =
    cleanString(request?.sellerNameSnapshot) ||
    cleanString(request?.seller?.name) ||
    "The store";

  const customerName =
    cleanString(request?.customerName) ||
    "Customer";

  const requestNumber =
    cleanString(request?.requestNumber);

  const items = Array.isArray(request?.items)
    ? request.items
    : [];

  const {
    requestedProducts,
  } = requestProductWording(request);

  const title = (value) =>
    whatsapp
      ? `*${value}*`
      : value;

  const lines = [
    `Hello ${customerName},`,
    "",
    `This is ${businessName} with an update about your order.`,
    "",
    title("Order number"),
    requestNumber,
    "",
    title("Status"),
    statusLabel(request?.status),
    "",
    ownerReplyStatusMessage(request),
    "",
    title(requestedProducts),
    "",
  ];

  items.forEach((item, index) => {
    const quantity = Number(
      item?.quantity || 0,
    );

    const productName =
      cleanString(
        item?.productTitleSnapshot,
      ) ||
      `Product ${index + 1}`;

    lines.push(
      whatsapp
        ? `*${index + 1}. ${productName}*`
        : `${index + 1}. ${productName}`,
      "",
      title("Quantity"),
      String(quantity),
      "",
      title("Amount"),
      formatMoney(
        item?.lineTotal,
        request?.currency,
      ),
    );

    if (
      cleanString(
        item?.productUrlSnapshot,
      )
    ) {
      lines.push(
        "",
        title("View product"),
        cleanString(
          item.productUrlSnapshot,
        ),
      );
    }

    lines.push("");
  });

  lines.push(
    title("Total"),
    formatMoney(
      request?.total,
      request?.currency,
    ),
    "",
    title("Fulfilment"),
    fulfilmentLabel(request),
  );

  const pickupLocation =
    pickupLocationDetails(request);

  if (pickupLocation) {
    lines.push(
      "",
      title("Pickup location"),
    );

    if (pickupLocation.name) {
      lines.push(
        pickupLocation.name,
      );
    }

    if (pickupLocation.address) {
      lines.push(
        "",
        title("Address"),
        pickupLocation.address,
      );
    }

    if (pickupLocation.phone) {
      lines.push(
        "",
        title("Phone"),
        pickupLocation.phone,
      );
    }
  }

  if (
    request?.fulfilmentMethod ===
      "DELIVERY" &&
    cleanString(
      request?.deliveryAddress,
    )
  ) {
    lines.push(
      "",
      title("Delivery address"),
      cleanString(
        request.deliveryAddress,
      ),
    );
  }

  if (
    request?.fulfilmentMethod ===
      "DELIVERY" &&
    cleanString(
      request?.deliveryDistrict,
    )
  ) {
    lines.push(
      "",
      title("District"),
      cleanString(
        request.deliveryDistrict,
      ),
    );
  }

  if (
    request?.fulfilmentMethod ===
      "DELIVERY" &&
    cleanString(
      request?.deliverySector,
    )
  ) {
    lines.push(
      "",
      title("Sector"),
      cleanString(
        request.deliverySector,
      ),
    );
  }

  lines.push(
    "",
    statusLabel(request?.status) ===
      "New order"
      ? "Please reply to confirm that you would like us to continue with this order request."
      : "Please reply here if you need any help.",
    "",
    "Thank you,",
    businessName,
  );

  return lines.join("\n");
}

function buildOwnerWhatsAppMessage(request) {
  return buildOwnerMessage(
    request,
    {
      whatsapp: true,
    },
  );
}

function buildOwnerEmailMessage(request) {
  return buildOwnerMessage(
    request,
    {
      whatsapp: false,
    },
  );
}

function buildOwnerEmailSubject(request) {
  const businessName =
    cleanString(request?.sellerNameSnapshot) ||
    cleanString(request?.seller?.name) ||
    "Store";

  return `${businessName} — Order ${cleanString(
    request?.requestNumber,
  )}`;
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

  const [actionBusy, setActionBusy] =
    useState(false);

  const [pendingAction, setPendingAction] =
    useState("");

  const [completionPaymentMethod, setCompletionPaymentMethod] =
    useState("OTHER");
  const [completionPaymentReference, setCompletionPaymentReference] =
    useState("");

  const [deliveryFee, setDeliveryFee] =
    useState("");
  const [branches, setBranches] =
    useState([]);
  const [
    fulfilmentBranchId,
    setFulfilmentBranchId,
  ] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadRequest() {
      try {
        setLoading(true);

        const [
          result,
          branchResult,
        ] = await Promise.all([
          getOwnerMarketplaceRequest(
            requestId,
          ),
          listBranches(),
        ]);

        if (alive) {
          const nextRequest =
            result?.request || null;

          const activeBranches =
            Array.isArray(
              branchResult?.branches,
            )
              ? branchResult.branches.filter(
                  (branch) =>
                    branch?.status ===
                    "ACTIVE",
                )
              : [];

          setRequest(nextRequest);
          setBranches(activeBranches);

          setFulfilmentBranchId(
            nextRequest
              ?.fulfilmentBranchId ||
              activeBranches.find(
                (branch) =>
                  branch?.isMain,
              )?.id ||
              activeBranches[0]?.id ||
              "",
          );
        }
      } catch (error) {
        console.error(error);

        toast.error(
          error?.message ||
            "Failed to load customer order",
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

  const isNewRequest =
    cleanString(request?.status).toUpperCase() ===
    "REQUESTED";

  const requiresDeliveryFee =
    request?.fulfilmentMethod === "DELIVERY" &&
    request?.deliveryCoverage ===
      "OUTSIDE_KIGALI";

  async function handleConfirmRequest() {
    if (!request || actionBusy) {
      return;
    }

    const payload = {
      fulfilmentBranchId,
    };

    if (!fulfilmentBranchId) {
      toast.error(
        "Choose the location fulfilling this order.",
      );
      return;
    }

    if (requiresDeliveryFee) {
      const amount = Number(deliveryFee);

      if (
        deliveryFee === "" ||
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        toast.error(
          "Enter a valid delivery cost before confirming.",
        );
        return;
      }

      payload.deliveryFee = amount;
    }

    try {
      setActionBusy(true);

      const result =
        await confirmOwnerMarketplaceRequest(
          request.id,
          payload,
        );

      setRequest(
        result?.request || request,
      );

      setPendingAction("");

      toast.success(
        "Order confirmed and stock reserved.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to confirm order",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleStatusAction(
    action,
  ) {
    if (!request || actionBusy) {
      return;
    }

    const actions = {
      START_PREPARING: {
        run:
          startPreparingOwnerMarketplaceRequest,
        success:
          "Order marked as preparing.",
        fallback:
          "Failed to start preparing order",
      },
      READY_FOR_PICKUP: {
        run:
          markReadyOwnerMarketplaceRequest,
        success:
          "Order is ready for pickup.",
        fallback:
          "Failed to mark order ready",
      },
      OUT_FOR_DELIVERY: {
        run:
          markOutForDeliveryOwnerMarketplaceRequest,
        success:
          "Order is out for delivery.",
        fallback:
          "Failed to mark order out for delivery",
      },
      CANCEL: {
        run:
          cancelOwnerMarketplaceRequest,
        success:
          "Order cancelled and reserved stock released.",
        fallback:
          "Failed to cancel order",
      },
    };

    const config = actions[action];

    if (!config) {
      return;
    }

    try {
      setActionBusy(true);

      const result =
        await config.run(
          request.id,
        );

      setRequest(
        result?.request || request,
      );

      setPendingAction("");

      toast.success(config.success);
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          config.fallback,
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCompletePickup() {
    if (
      !request ||
      actionBusy ||
      request.status !== "READY_FOR_PICKUP"
    ) {
      return;
    }

    const paymentMethod = String(
      completionPaymentMethod || "",
    )
      .trim()
      .toUpperCase();

    if (
      ![
        "CASH",
        "MOMO",
        "BANK",
        "OTHER",
      ].includes(paymentMethod)
    ) {
      toast.error(
        "Choose how the payment was received.",
      );
      return;
    }

    try {
      setActionBusy(true);

      const result =
        await completePickupOwnerMarketplaceRequest(
          request.id,
          {
            paymentMethod,
            paymentReference:
              completionPaymentReference.trim() ||
              undefined,
          },
        );

      setRequest(
        result?.request || request,
      );

      setPendingAction("");
      setCompletionPaymentReference("");

      toast.success(
        result?.alreadyCompleted
          ? "This pickup was already completed."
          : "Pickup completed and sale recorded.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to complete pickup",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRejectRequest() {
    if (!request || actionBusy) {
      return;
    }

    try {
      setActionBusy(true);

      const result =
        await rejectOwnerMarketplaceRequest(
          request.id,
        );

      setRequest(
        result?.request || request,
      );

      setPendingAction("");

      toast.success(
        "Order request rejected.",
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error?.message ||
          "Failed to reject order request",
      );
    } finally {
      setActionBusy(false);
    }
  }

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

            <span>Back to orders</span>
          </Link>
        </div>

        {loading ? (
          <DetailSkeleton />
        ) : !request ? (
          <section className="svx-market-owner-empty">
            <div aria-hidden="true">?</div>

            <h2>Request not found</h2>

            <p>
              This order may have been removed
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
                <span>Customer order</span>

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
                    <span>Order items</span>
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
                        href={`https://wa.me/${normalizeWhatsAppPhone(
                          request.customerPhone,
                        )}?text=${encodeURIComponent(
                          buildOwnerWhatsAppMessage(
                            request,
                          ),
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open WhatsApp
                      </a>
                    ) : null}

                    {request.customerEmail ? (
                      <a
                        href={`mailto:${encodeURIComponent(
                          request.customerEmail,
                        )}?subject=${encodeURIComponent(
                          buildOwnerEmailSubject(request),
                        )}&body=${encodeURIComponent(
                          buildOwnerEmailMessage(
                            request,
                          ),
                        )}`}
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
                    <span>Order total</span>
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
                    <span>Order details</span>
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
                      <span>
                        Fulfilment location
                      </span>
                      <strong>
                        {request
                          .fulfilmentBranch
                          ?.name ||
                          "Not chosen yet"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Fulfilment location
                      </span>
                      <strong>
                        {request
                          .fulfilmentBranch
                          ?.name ||
                          "Not chosen yet"}
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
                  {isNewRequest ? (
                    <>
                      <span>Next step</span>

                      <h3>
                        Review stock and confirm
                      </h3>

                      <p>
                        Confirm only when all order
                        items are available. Storvex
                        will reserve the stock without
                        creating a sale.
                      </p>

                      <label className="svx-market-owner-delivery-fee">
                        <span>
                          Fulfilment location
                        </span>

                        <div className="svx-market-owner-order-select">
                          <select
                            value={
                              fulfilmentBranchId
                            }
                            aria-label="Fulfilment location"
                            onChange={(event) =>
                              setFulfilmentBranchId(
                                event.target.value,
                              )
                            }
                            disabled={
                              actionBusy
                            }
                          >
                            <option value="">
                              Choose location
                            </option>

                            {branches.map(
                              (branch) => (
                                <option
                                  key={
                                    branch.id
                                  }
                                  value={
                                    branch.id
                                  }
                                >
                                  {branch.name}
                                  {branch.isMain
                                    ? " — Main"
                                    : ""}
                                </option>
                              ),
                            )}
                          </select>

                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path
                              d="m7 10 5 5 5-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <small>
                          Every order item
                          must be available at this
                          location.
                        </small>
                      </label>



                      {requiresDeliveryFee ? (
                        <label className="svx-market-owner-delivery-fee">
                          <span>
                            Delivery cost
                          </span>

                          <div>
                            <strong>
                              {request.currency ||
                                "RWF"}
                            </strong>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="decimal"
                              value={deliveryFee}
                              onChange={(event) =>
                                setDeliveryFee(
                                  event.target.value,
                                )
                              }
                              placeholder="0"
                              disabled={actionBusy}
                            />
                          </div>

                          <small>
                            The customer will see this
                            amount when the order is
                            confirmed.
                          </small>
                        </label>
                      ) : null}

                      <div className="svx-market-owner-request-actions">
                        <button
                          type="button"
                          className="svx-market-owner-action-button is-reject"
                          onClick={() =>
                            setPendingAction(
                              "REJECT",
                            )
                          }
                          disabled={actionBusy}
                        >
                          Reject order
                        </button>

                        <button
                          type="button"
                          className="svx-market-owner-action-button is-confirm"
                          onClick={() =>
                            setPendingAction(
                              "CONFIRM",
                            )
                          }
                          disabled={actionBusy}
                        >
                          Confirm order
                        </button>
                      </div>

                      {pendingAction ? (
                        <div className="svx-market-owner-action-confirmation">
                          <strong>
                            {pendingAction ===
                            "CONFIRM"
                              ? "Confirm this order?"
                              : "Reject this order request?"}
                          </strong>

                          <p>
                            {pendingAction ===
                            "CONFIRM"
                              ? "Available stock will be reserved. No sale or payment will be created."
                              : "The order will be closed without reserving stock."}
                          </p>

                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAction(
                                  "",
                                )
                              }
                              disabled={actionBusy}
                            >
                              Go back
                            </button>

                            <button
                              type="button"
                              className={
                                pendingAction ===
                                "CONFIRM"
                                  ? "is-confirm"
                                  : "is-reject"
                              }
                              onClick={
                                pendingAction ===
                                "CONFIRM"
                                  ? handleConfirmRequest
                                  : handleRejectRequest
                              }
                              disabled={actionBusy}
                            >
                              {actionBusy
                                ? "Saving..."
                                : pendingAction ===
                                    "CONFIRM"
                                  ? "Yes, confirm"
                                  : "Yes, reject"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span>
                        Order status
                      </span>

                      <h3>
                        {statusLabel(
                          request.status,
                        )}
                      </h3>

                      <p>
                        {request.status ===
                        "CONFIRMED"
                          ? "Stock is reserved for this order. No sale has been created yet."
                          : ownerReplyStatusMessage(
                              request,
                            )}
                      </p>

                      {[
                        "CONFIRMED",
                        "PREPARING",
                      ].includes(
                        request.status,
                      ) ? (
                        <>
                          <div className="svx-market-owner-request-actions">
                            <button
                              type="button"
                              className="svx-market-owner-action-button is-reject"
                              onClick={() =>
                                setPendingAction(
                                  "CANCEL",
                                )
                              }
                              disabled={
                                actionBusy
                              }
                            >
                              Cancel order
                            </button>

                            {request.status ===
                            "CONFIRMED" ? (
                              <button
                                type="button"
                                className="svx-market-owner-action-button is-confirm"
                                onClick={() =>
                                  setPendingAction(
                                    "START_PREPARING",
                                  )
                                }
                                disabled={
                                  actionBusy
                                }
                              >
                                Start preparing
                              </button>
                            ) : request.fulfilmentMethod ===
                              "PICKUP" ? (
                              <button
                                type="button"
                                className="svx-market-owner-action-button is-confirm"
                                onClick={() =>
                                  setPendingAction(
                                    "READY_FOR_PICKUP",
                                  )
                                }
                                disabled={
                                  actionBusy
                                }
                              >
                                Mark ready for pickup
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="svx-market-owner-action-button is-confirm"
                                onClick={() =>
                                  setPendingAction(
                                    "OUT_FOR_DELIVERY",
                                  )
                                }
                                disabled={
                                  actionBusy
                                }
                              >
                                Mark out for delivery
                              </button>
                            )}
                          </div>

                          {pendingAction ? (
                            <div className="svx-market-owner-action-confirmation">
                              <strong>
                                {pendingAction ===
                                "CANCEL"
                                  ? "Cancel this order?"
                                  : pendingAction ===
                                      "START_PREPARING"
                                    ? "Start preparing this order?"
                                    : pendingAction ===
                                        "READY_FOR_PICKUP"
                                      ? "Mark this order ready for pickup?"
                                      : "Mark this order out for delivery?"}
                              </strong>

                              <p>
                                {pendingAction ===
                                "CANCEL"
                                  ? "Reserved stock will be released. No sale or payment will be created."
                                  : "The customer order status will be updated. Reserved stock will remain protected."}
                              </p>

                              <div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPendingAction(
                                      "",
                                    )
                                  }
                                  disabled={
                                    actionBusy
                                  }
                                >
                                  Go back
                                </button>

                                <button
                                  type="button"
                                  className={
                                    pendingAction ===
                                    "CANCEL"
                                      ? "is-reject"
                                      : "is-confirm"
                                  }
                                  onClick={() =>
                                    handleStatusAction(
                                      pendingAction,
                                    )
                                  }
                                  disabled={
                                    actionBusy
                                  }
                                >
                                  {actionBusy
                                    ? "Saving..."
                                    : pendingAction ===
                                        "CANCEL"
                                      ? "Yes, cancel"
                                      : "Yes, update"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  )}
                    {request.status ===
                    "READY_FOR_PICKUP" ? (
                      <div className="svx-market-owner-pickup-completion">
                        <div className="svx-market-owner-pickup-completion-head">
                          <span>Finish pickup</span>

                          <h3>
                            Confirm handover and payment
                          </h3>

                          <p>
                            Complete this order only after the customer has received the products and payment has been received.
                          </p>
                        </div>

                        <label>
                          <span>
                            Payment received through
                          </span>

                          <div className="svx-market-owner-order-select is-payment">
                            <select
                              value={
                                completionPaymentMethod
                              }
                              onChange={(event) =>
                                setCompletionPaymentMethod(
                                  event.target.value,
                                )
                              }
                              disabled={actionBusy}
                              aria-label="Payment received through"
                            >
                              <option value="CASH">
                                Cash
                              </option>

                              <option value="MOMO">
                                MoMo
                              </option>

                              <option value="BANK">
                                Bank
                              </option>

                              <option value="OTHER">
                                Other money
                              </option>
                            </select>

                            <svg
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path
                                d="m7 10 5 5 5-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </label>

                        <label>
                          <span>
                            Payment reference
                          </span>

                          <input
                            type="text"
                            value={
                              completionPaymentReference
                            }
                            onChange={(event) =>
                              setCompletionPaymentReference(
                                event.target.value,
                              )
                            }
                            placeholder="Optional transaction or payment reference"
                            disabled={actionBusy}
                          />
                        </label>

                        <div className="svx-market-owner-pickup-total">
                          <span>
                            Amount received
                          </span>

                          <strong>
                            {formatMoney(
                              request.total,
                              request.currency,
                            )}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="svx-market-owner-action-button is-confirm"
                          onClick={() =>
                            setPendingAction(
                              "COMPLETE_PICKUP",
                            )
                          }
                          disabled={actionBusy}
                        >
                          Complete pickup
                        </button>

                        {pendingAction ===
                        "COMPLETE_PICKUP" ? (
                          <div className="svx-market-owner-action-confirmation">
                            <strong>
                              Complete this pickup?
                            </strong>

                            <p>
                              This creates the sale and receipt, records the payment, reduces sold stock, and completes the order. This action must only be used after handover and payment.
                            </p>

                            <div>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingAction(
                                    "",
                                  )
                                }
                                disabled={actionBusy}
                              >
                                Go back
                              </button>

                              <button
                                type="button"
                                className="svx-market-owner-action-button is-confirm"
                                onClick={
                                  handleCompletePickup
                                }
                                disabled={actionBusy}
                              >
                                {actionBusy
                                  ? "Completing..."
                                  : "Yes, complete pickup"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {request.status ===
                      "COMPLETED" &&
                    request.sale?.id ? (
                      <div className="svx-market-owner-completed-sale">
                        <span>
                          Sale recorded
                        </span>

                        <strong>
                          {request.sale
                            .receiptNumber ||
                            request.sale
                              .invoiceNumber ||
                            "Receipt ready"}
                        </strong>

                        <Link
                          to={`/app/pos/sales/${request.sale.id}`}
                        >
                          View receipt
                        </Link>
                      </div>
                    ) : null}

                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

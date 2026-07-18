import {
  AlertCircle,
  ArrowLeft,
  Check,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Store,
  Truck,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getMarketplaceStore,
  submitMarketplaceRequest,
} from "../../services/marketplaceApi";
import {
  removeMarketplaceCartKeys,
} from "./marketplaceCustomerStore";

const CUSTOMER_DETAILS_STORAGE =
  "storvex-marketplace-customer-details-v1";

function cleanString(value) {
  return String(value || "").trim();
}

function formatMoney(value, currency = "RWF") {
  const amount = Math.max(
    0,
    Number(value || 0),
  );

  const code =
    cleanString(currency).toUpperCase() ||
    "RWF";

  if (code === "RWF") {
    return `Rwf ${new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 0,
      },
    ).format(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString()}`;
  }
}

function marketplaceProductPath(item) {
  const storeSlug = cleanString(item?.seller?.slug);
  const productSlug = cleanString(item?.slug);

  if (!storeSlug || !productSlug) {
    return "/marketplace";
  }

  return `/marketplace/${encodeURIComponent(
    storeSlug,
  )}/${encodeURIComponent(productSlug)}`;
}

function requestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    "marketplace",
    Date.now(),
    Math.random()
      .toString(16)
      .slice(2),
  ].join("-");
}

function readSavedCustomer() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const value = JSON.parse(
      window.localStorage.getItem(
        CUSTOMER_DETAILS_STORAGE,
      ) || "{}",
    );

    return value &&
      typeof value === "object"
      ? value
      : {};
  } catch {
    return {};
  }
}

function saveCustomerDetails(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CUSTOMER_DETAILS_STORAGE,
    JSON.stringify({
      customerName:
        cleanString(value.customerName),
      customerPhone:
        cleanString(value.customerPhone),
      customerEmail:
        cleanString(value.customerEmail),
      deliveryDistrict:
        cleanString(value.deliveryDistrict),
      deliverySector:
        cleanString(value.deliverySector),
    }),
  );
}

function groupCartBySeller(cart) {
  const groups = new Map();

  for (const item of cart) {
    const sellerSlug = cleanString(
      item?.seller?.slug,
    );

    if (
      !sellerSlug ||
      !cleanString(item?.slug) ||
      Number(item?.quantity || 0) <= 0 ||
      Number(item?.availableQuantity || 0) <=
        0 ||
      item?.seller?.temporarilyClosed
    ) {
      continue;
    }

    const current = groups.get(
      sellerSlug,
    ) || {
      sellerSlug,
      sellerName:
        cleanString(item?.seller?.name) ||
        "Marketplace store",
      items: [],
      subtotal: 0,
      currency:
        cleanString(item?.currency) ||
        "RWF",
    };

    current.items.push(item);
    current.subtotal +=
      Math.max(
        0,
        Number(item?.price || 0),
      ) *
      Math.max(
        1,
        Number(item?.quantity || 1),
      );

    groups.set(sellerSlug, current);
  }

  return Array.from(groups.values());
}

function defaultFulfilment(store) {
  if (store?.pickupEnabled) {
    return "PICKUP";
  }

  if (store?.deliveryEnabled) {
    return "DELIVERY";
  }

  return "";
}

function emailDeliverySucceeded(
  communication,
) {
  if (!communication?.email) {
    return null;
  }

  const sellerSent =
    communication.email?.seller?.sent;

  const customerSent =
    communication.email?.customer?.sent;

  return Boolean(
    sellerSent || customerSent,
  );
}

function fieldError(error, fallback) {
  return (
    cleanString(error?.message) ||
    cleanString(error?.data?.message) ||
    fallback
  );
}

export default function MarketplaceRequestPanel({
  cart,
  onBack,
  onClose,
  notify,
}) {
  const groups = useMemo(
    () => groupCartBySeller(cart),
    [cart],
  );

  const [selectedSellerSlug, setSelectedSellerSlug] =
    useState(
      groups[0]?.sellerSlug || "",
    );

  const selectedGroup =
    groups.find(
      (group) =>
        group.sellerSlug ===
        selectedSellerSlug,
    ) ||
    groups[0] ||
    null;

  const [storeLoading, setStoreLoading] =
    useState(true);

  const [storeError, setStoreError] =
    useState("");

  const [store, setStore] =
    useState(null);

  const savedCustomerRef =
    useRef(readSavedCustomer());

  const [form, setForm] = useState(() => ({
    customerName:
      savedCustomerRef.current
        .customerName || "",
    customerPhone:
      savedCustomerRef.current
        .customerPhone || "",
    customerEmail:
      savedCustomerRef.current
        .customerEmail || "",
    preferredContact: "WHATSAPP",
    fulfilmentMethod: "",
    deliveryAddress: "",
    deliveryDistrict:
      savedCustomerRef.current
        .deliveryDistrict || "",
    deliverySector:
      savedCustomerRef.current
        .deliverySector || "",
    customerNote: "",
  }));

  const [clientRequestId, setClientRequestId] =
    useState(requestId);

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState("");

  const [success, setSuccess] =
    useState(null);

  useEffect(() => {
    if (!groups.length) {
      setSelectedSellerSlug("");
      return;
    }

    const stillExists = groups.some(
      (group) =>
        group.sellerSlug ===
        selectedSellerSlug,
    );

    if (!stillExists) {
      setSelectedSellerSlug(
        groups[0].sellerSlug,
      );
    }
  }, [
    groups,
    selectedSellerSlug,
  ]);

  useEffect(() => {
    if (!selectedGroup?.sellerSlug) {
      setStore(null);
      setStoreLoading(false);
      return undefined;
    }

    let active = true;

    setStoreLoading(true);
    setStoreError("");
    setStore(null);
    setSuccess(null);
    setSubmitError("");
    setClientRequestId(requestId());

    getMarketplaceStore(
      selectedGroup.sellerSlug,
      {
        limit: 1,
      },
    )
      .then((result) => {
        if (!active) return;

        const nextStore =
          result?.store || null;

        if (!nextStore) {
          throw new Error(
            "This store is no longer available.",
          );
        }

        setStore(nextStore);

        const fulfilment =
          defaultFulfilment(nextStore);

        const payments =
          normalizedPaymentMethods(
            nextStore,
            fulfilment,
          );

        setForm((current) => ({
          ...current,
          preferredContact:
            nextStore.whatsappAvailable ===
              false &&
            nextStore.emailAvailable
              ? "EMAIL"
              : current.preferredContact,
          fulfilmentMethod:
            fulfilment,
          paymentMethod:
            payments[0] || "",
        }));
      })
      .catch((error) => {
        if (!active) return;

        setStoreError(
          fieldError(
            error,
            "Store details could not be loaded.",
          ),
        );
      })
      .finally(() => {
        if (active) {
          setStoreLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedGroup?.sellerSlug]);

  const paymentMethods = useMemo(
    () =>
      normalizedPaymentMethods(
        store,
        form.fulfilmentMethod,
      ),
    [
      form.fulfilmentMethod,
      store,
    ],
  );

  useEffect(() => {
    if (
      !paymentMethods.includes(
        form.paymentMethod,
      )
    ) {
      setForm((current) => ({
        ...current,
        paymentMethod:
          paymentMethods[0] || "",
      }));
    }
  }, [
    form.paymentMethod,
    paymentMethods,
  ]);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSubmitError("");
  }

  function validate() {
    if (!selectedGroup) {
      return "There are no available products to request.";
    }

    if (!cleanString(form.customerName)) {
      return "Enter your name.";
    }

    if (
      form.preferredContact ===
        "WHATSAPP" &&
      !cleanString(form.customerPhone)
    ) {
      return "Enter your WhatsApp phone number.";
    }

    if (
      form.preferredContact ===
        "EMAIL" &&
      !cleanString(form.customerEmail)
    ) {
      return "Enter your email address.";
    }

    if (!form.fulfilmentMethod) {
      return "Choose pickup or delivery.";
    }

    if (
      form.fulfilmentMethod ===
        "DELIVERY" &&
      !cleanString(form.deliveryAddress)
    ) {
      return "Enter the delivery address.";
    }

    if (!form.paymentMethod) {
      return "Choose how payment will be completed.";
    }

    return "";
  }

  async function submit(event) {
    event.preventDefault();

    const validationMessage =
      validate();

    if (validationMessage) {
      setSubmitError(
        validationMessage,
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      saveCustomerDetails(form);

      const result =
        await submitMarketplaceRequest({
          storeSlug:
            selectedGroup.sellerSlug,
          clientRequestId,
          preferredContact:
            form.preferredContact,
          fulfilmentMethod:
            form.fulfilmentMethod,
          paymentMethod:
            "SELLER_APPROVED_OTHER",
          customerName:
            cleanString(
              form.customerName,
            ),
          customerPhone:
            cleanString(
              form.customerPhone,
            ) || null,
          customerEmail:
            cleanString(
              form.customerEmail,
            ) || null,
          deliveryAddress:
            form.fulfilmentMethod ===
            "DELIVERY"
              ? cleanString(
                  form.deliveryAddress,
                )
              : null,
          deliveryDistrict:
            form.fulfilmentMethod ===
            "DELIVERY"
              ? cleanString(
                  form.deliveryDistrict,
                ) || null
              : null,
          deliverySector:
            form.fulfilmentMethod ===
            "DELIVERY"
              ? cleanString(
                  form.deliverySector,
                ) || null
              : null,
          customerNote:
            cleanString(
              form.customerNote,
            ) || null,
          items:
            selectedGroup.items.map(
              (item) => ({
                productSlug:
                  item.slug,
                quantity:
                  Math.max(
                    1,
                    Number(
                      item.quantity || 1,
                    ),
                  ),
              }),
            ),
        });

      const request =
        result?.request;

      if (!request?.requestNumber) {
        throw new Error(
          "The request was saved, but its confirmation could not be loaded.",
        );
      }

      removeMarketplaceCartKeys(
        selectedGroup.items.map(
          (item) => item.key,
        ),
      );

      setSuccess(request);
      setClientRequestId(requestId());

      notify?.(
        `Request ${request.requestNumber} sent`,
      );

      const whatsappUrl =
        request?.communication
          ?.whatsappUrl;

      if (
        form.preferredContact ===
          "WHATSAPP" &&
        whatsappUrl
      ) {
        window.open(
          whatsappUrl,
          "_blank",
          "noopener,noreferrer",
        );
      }
    } catch (error) {
      const details =
        error?.data?.details;

      if (
        error?.code ===
          "MARKETPLACE_STOCK_CHANGED" &&
        details?.availableQuantity !==
          undefined
      ) {
        setSubmitError(
          `${fieldError(
            error,
            "Available stock changed.",
          )} ${details.availableQuantity} now available.`,
        );
      } else {
        setSubmitError(
          fieldError(
            error,
            "The request could not be sent.",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const remainingGroups =
      groupCartBySeller(
        cart.filter(
          (item) =>
            !selectedGroup?.items.some(
              (submitted) =>
                submitted.key ===
                item.key,
            ),
        ),
      );

    const emailSent =
      emailDeliverySucceeded(
        success.communication,
      );

    return (
      <>
        <header className="svx-marketplace-customer-panel-head">
          <div>
            <span>Request sent</span>
            <h2>
              {success.requestNumber}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close request"
          >
            <X size={19} />
          </button>
        </header>

        <div className="svx-marketplace-customer-panel-body">
          <div className="svx-marketplace-request-success">
            <Check size={30} />

            <h3>
              Your request reached{" "}
              {success.seller?.name ||
                selectedGroup?.sellerName}
            </h3>

            <p>
              The store must confirm stock,
              collection or delivery details,
              and payment before this becomes
              a sale.
            </p>

            <dl>
              <div>
                <dt>Request number</dt>
                <dd>
                  {success.requestNumber}
                </dd>
              </div>

              <div>
                <dt>Total</dt>
                <dd>
                  {formatMoney(
                    success.total,
                    success.currency,
                  )}
                </dd>
              </div>

              <div>
                <dt>Next contact</dt>
                <dd>
                  {success.preferredContact ===
                  "EMAIL"
                    ? emailSent
                      ? "Email sent"
                      : "Request saved. Email delivery needs attention."
                    : "Continue in WhatsApp"}
                </dd>
              </div>
            </dl>

            {remainingGroups.length ? (
              <button
                type="button"
                className="svx-marketplace-request-button"
                onClick={() => {
                  setSuccess(null);
                  setSelectedSellerSlug(
                    remainingGroups[0]
                      .sellerSlug,
                  );
                }}
              >
                Request products from next store
              </button>
            ) : (
              <button
                type="button"
                className="svx-marketplace-request-button"
                onClick={onClose}
              >
                Done
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="svx-marketplace-customer-panel-head">
        <div className="svx-marketplace-request-heading">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to cart"
          >
            <ArrowLeft size={17} />
          </button>

          <span>
            <small>Send request</small>
            <h2>
              Confirm your details
            </h2>
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close request"
        >
          <X size={19} />
        </button>
      </header>

      <form
        className="svx-marketplace-request-form"
        onSubmit={submit}
      >
        <div className="svx-marketplace-customer-panel-body">
          {groups.length > 1 ? (
            <section className="svx-marketplace-request-section">
              <label htmlFor="marketplace-request-store">
                Store
              </label>

              <select
                id="marketplace-request-store"
                value={
                  selectedGroup?.sellerSlug ||
                  ""
                }
                onChange={(event) =>
                  setSelectedSellerSlug(
                    event.target.value,
                  )
                }
                disabled={submitting}
              >
                {groups.map((group) => (
                  <option
                    key={group.sellerSlug}
                    value={group.sellerSlug}
                  >
                    {group.sellerName}
                  </option>
                ))}
              </select>

              <small>
                A separate request is sent
                to each store.
              </small>
            </section>
          ) : null}

          <section className="svx-marketplace-request-store-summary">
            <Store size={18} />

            <span>
              <small>Requesting from</small>
              <strong>
                {selectedGroup?.sellerName}
              </strong>
            </span>

            <b>
              {selectedGroup?.items.length ||
                0}{" "}
              {selectedGroup?.items.length ===
              1
                ? "product"
                : "products"}
            </b>
          </section>

          <section className="svx-marketplace-request-section svx-marketplace-request-products-section">
            <h3>Products in this request</h3>

            <div className="svx-marketplace-request-products">
              {selectedGroup?.items.map((item) => {
                const quantity = Math.max(
                  1,
                  Number(item.quantity || 1),
                );

                const unitPrice = Math.max(
                  0,
                  Number(item.price || 0),
                );

                const path =
                  marketplaceProductPath(item);

                return (
                  <article
                    key={item.key}
                    className="svx-marketplace-request-product"
                  >
                    <a
                      href={path}
                      className="svx-marketplace-request-product-image"
                      aria-label={`View ${item.title}`}
                    >
                      {item.image?.url ? (
                        <img
                          src={item.image.url}
                          alt={
                            item.image.altText ||
                            item.title
                          }
                        />
                      ) : (
                        <PackageCheck
                          size={20}
                          aria-hidden="true"
                        />
                      )}
                    </a>

                    <div className="svx-marketplace-request-product-copy">
                      <a
                        href={path}
                        className="svx-marketplace-request-product-title"
                      >
                        {item.title}
                      </a>

                      <span>
                        {quantity} ×{" "}
                        {formatMoney(
                          unitPrice,
                          item.currency,
                        )}
                      </span>

                      <a
                        href={path}
                        className="svx-marketplace-request-product-link"
                      >
                        View product
                      </a>
                    </div>

                    <strong>
                      {formatMoney(
                        unitPrice * quantity,
                        item.currency,
                      )}
                    </strong>
                  </article>
                );
              })}
            </div>
          </section>

          {storeLoading ? (
            <div className="svx-marketplace-request-loading">
              <LoaderCircle size={20} />
              Loading store options
            </div>
          ) : storeError ? (
            <div className="svx-marketplace-request-error">
              <AlertCircle size={18} />
              <span>{storeError}</span>
            </div>
          ) : (
            <>
              <section className="svx-marketplace-request-section">
                <h3>Your details</h3>

                <div className="svx-marketplace-request-fields">
                  <label>
                    <span>Name</span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={
                        form.customerName
                      }
                      onChange={(event) =>
                        updateField(
                          "customerName",
                          event.target.value,
                        )
                      }
                      placeholder="Your full name"
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    <span>Phone</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={
                        form.customerPhone
                      }
                      onChange={(event) =>
                        updateField(
                          "customerPhone",
                          event.target.value,
                        )
                      }
                      placeholder="07..."
                      disabled={submitting}
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={
                        form.customerEmail
                      }
                      onChange={(event) =>
                        updateField(
                          "customerEmail",
                          event.target.value,
                        )
                      }
                      placeholder="you@example.com"
                      disabled={submitting}
                    />
                  </label>
                </div>
              </section>

              <section className="svx-marketplace-request-section">
                <h3>
                  How should the store contact
                  you?
                </h3>

                <div className="svx-marketplace-request-options">
                  {store?.whatsappAvailable !==
                  false ? (
                    <label>
                      <input
                        type="radio"
                        name="preferredContact"
                        value="WHATSAPP"
                        checked={
                          form.preferredContact ===
                          "WHATSAPP"
                        }
                        onChange={(event) =>
                          updateField(
                            "preferredContact",
                            event.target.value,
                          )
                        }
                        disabled={submitting}
                      />

                      <span>
                        <MessageCircle
                          size={17}
                        />
                        <strong>
                          WhatsApp
                        </strong>
                        <small>
                          Open a prepared message
                          after saving the request.
                        </small>
                      </span>
                    </label>
                  ) : null}

                  {store?.emailAvailable ? (
                    <label>
                      <input
                        type="radio"
                        name="preferredContact"
                        value="EMAIL"
                        checked={
                          form.preferredContact ===
                          "EMAIL"
                        }
                        onChange={(event) =>
                          updateField(
                            "preferredContact",
                            event.target.value,
                          )
                        }
                        disabled={submitting}
                      />

                      <span>
                        <Mail size={17} />
                        <strong>Email</strong>
                        <small>
                          Send the request to the
                          store and receive a copy.
                        </small>
                      </span>
                    </label>
                  ) : null}
                </div>
              </section>

              <section className="svx-marketplace-request-section">
                <h3>How you will receive it</h3>

                {store?.pickupEnabled &&
                store?.deliveryEnabled ? (
                  <div className="svx-marketplace-request-options">
                    <label>
                      <input
                        type="radio"
                        name="fulfilmentMethod"
                        value="PICKUP"
                        checked={
                          form.fulfilmentMethod ===
                          "PICKUP"
                        }
                        onChange={(event) =>
                          updateField(
                            "fulfilmentMethod",
                            event.target.value,
                          )
                        }
                        disabled={submitting}
                      />

                      <span>
                        <PackageCheck size={17} />

                        <strong>
                          Store pickup
                        </strong>

                        <small>
                          The store confirms when
                          your products are ready.
                        </small>
                      </span>
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="fulfilmentMethod"
                        value="DELIVERY"
                        checked={
                          form.fulfilmentMethod ===
                          "DELIVERY"
                        }
                        onChange={(event) =>
                          updateField(
                            "fulfilmentMethod",
                            event.target.value,
                          )
                        }
                        disabled={submitting}
                      />

                      <span>
                        <Truck size={17} />

                        <strong>
                          Seller delivery
                        </strong>

                        <small>
                          The store arranges and
                          confirms delivery.
                        </small>
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="svx-marketplace-request-fixed-option">
                    {store?.deliveryEnabled ? (
                      <Truck size={17} />
                    ) : (
                      <PackageCheck size={17} />
                    )}

                    <span>
                      <strong>
                        {store?.deliveryEnabled
                          ? "Seller delivery"
                          : "Store pickup"}
                      </strong>

                      <small>
                        {store?.deliveryEnabled
                          ? "The store will confirm the delivery arrangements."
                          : "The store will confirm when your products are ready."}
                      </small>
                    </span>
                  </div>
                )}

                {form.fulfilmentMethod ===
                "DELIVERY" ? (
                  <div className="svx-marketplace-request-delivery">
                    <label>
                      <span>
                        Delivery address
                      </span>

                      <textarea
                        value={
                          form.deliveryAddress
                        }
                        onChange={(event) =>
                          updateField(
                            "deliveryAddress",
                            event.target.value,
                          )
                        }
                        placeholder="Area, road, building or nearby landmark"
                        rows={3}
                        disabled={submitting}
                      />
                    </label>

                    <div>
                      <label>
                        <span>District</span>

                        <input
                          type="text"
                          value={
                            form.deliveryDistrict
                          }
                          onChange={(event) =>
                            updateField(
                              "deliveryDistrict",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                        />
                      </label>

                      <label>
                        <span>Sector</span>

                        <input
                          type="text"
                          value={
                            form.deliverySector
                          }
                          onChange={(event) =>
                            updateField(
                              "deliverySector",
                              event.target.value,
                            )
                          }
                          disabled={submitting}
                        />
                      </label>
                    </div>

                    {Number(
                      store.defaultDeliveryFee ||
                        0,
                    ) > 0 ? (
                      <p>
                        <MapPin size={14} />
                        Delivery fee:{" "}
                        {formatMoney(
                          store.defaultDeliveryFee,
                          selectedGroup?.currency,
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="svx-marketplace-request-section">
                <label>
                  <span>
                    Note to store
                  </span>

                  <textarea
                    value={
                      form.customerNote
                    }
                    onChange={(event) =>
                      updateField(
                        "customerNote",
                        event.target.value,
                      )
                    }
                    placeholder="Optional instructions"
                    rows={3}
                    disabled={submitting}
                  />
                </label>
              </section>

              <section className="svx-marketplace-request-total">
                <span>
                  <small>
                    Estimated total
                  </small>
                  <strong>
                    {formatMoney(
                      selectedGroup?.subtotal +
                        (form.fulfilmentMethod ===
                        "DELIVERY"
                          ? Number(
                              store?.defaultDeliveryFee ||
                                0,
                            )
                          : 0),
                      selectedGroup?.currency,
                    )}
                  </strong>
                </span>

                <p>
                  The server checks current
                  stock and price again before
                  saving.
                </p>
              </section>

              {submitError ? (
                <div
                  className="svx-marketplace-request-error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>
                    {submitError}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>

        {!storeLoading &&
        !storeError &&
        store ? (
          <footer className="svx-marketplace-request-footer">
            <button
              type="submit"
              className="svx-marketplace-request-button"
              disabled={
                submitting ||
                !selectedGroup
              }
            >
              {submitting ? (
                <LoaderCircle
                  size={17}
                  className="svx-marketplace-request-spinner"
                />
              ) : form.preferredContact ===
                "EMAIL" ? (
                <Mail size={17} />
              ) : (
                <MessageCircle size={17} />
              )}

              {submitting
                ? "Sending request"
                : form.preferredContact ===
                    "EMAIL"
                  ? "Send request by email"
                  : "Send request by WhatsApp"}
            </button>

            <small>
              This creates a request, not a
              completed sale.
            </small>
          </footer>
        ) : null}
      </form>
    </>
  );
}

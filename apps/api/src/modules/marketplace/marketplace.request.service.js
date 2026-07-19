const crypto = require("crypto");

const prisma = require("../../config/database");
const {
  calculateAvailableQuantity,
  activeMarketplacePricing,
} = require("./marketplace.public.service");
const {
  sendEmailMessage,
} = require("../notifications");

const CONTACT_CHANNELS = new Set([
  "WHATSAPP",
  "EMAIL",
]);

const FULFILMENT_METHODS = new Set([
  "PICKUP",
  "DELIVERY",
]);

const PAYMENT_METHODS = new Set([
  "CASH_ON_DELIVERY",
  "MOMO_ON_DELIVERY",
  "PAY_ON_PICKUP",
  "SELLER_APPROVED_OTHER",
]);

const MAX_REQUEST_ITEMS = 25;

function appError(
  status,
  code,
  message,
  details = null,
) {
  const error = new Error(message);

  error.status = status;
  error.code = code;
  error.details = details;

  return error;
}

function cleanString(value, maxLength = 500) {
  const text = String(value || "").trim();

  return text
    ? text.slice(0, maxLength)
    : null;
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeEmail(value) {
  const email = cleanString(value, 254);

  return email
    ? email.toLowerCase()
    : null;
}

function normalizePhone(value) {
  let phone = String(value || "")
    .trim()
    .replace(/[^\d]/g, "");

  if (!phone) return null;

  if (
    phone.startsWith("07") &&
    phone.length === 10
  ) {
    phone = `250${phone.slice(1)}`;
  }

  return phone;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || ""),
  );
}

function positiveInteger(value) {
  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map(normalizeToken)
    .filter(Boolean)
    .filter(
      (item, index, values) =>
        values.indexOf(item) === index,
    );
}

function marketplaceRequestDateKey(
  now = new Date(),
) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Africa/Kigali",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date(now));

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );

  return [
    values.year,
    values.month,
    values.day,
  ].join("");
}

function marketplaceRequestNumber(
  marketplaceCode,
  dateKey,
  sequence,
) {
  const businessCode = String(
    marketplaceCode || "",
  )
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{3}$/.test(businessCode)) {
    throw appError(
      500,
      "REQUEST_BUSINESS_CODE_INVALID",
      "The business request code is invalid.",
    );
  }

  return `SVX-${businessCode}-${dateKey}-${String(
    sequence,
  ).padStart(3, "0")}`;
}

async function nextMarketplaceRequestNumber(
  tenantId,
  marketplaceCode,
  now = new Date(),
  database = prisma,
) {
  const businessId = cleanString(
    tenantId,
    200,
  );

  if (!businessId) {
    throw appError(
      500,
      "REQUEST_BUSINESS_REQUIRED",
      "The business could not be identified for this request.",
    );
  }

  const dateKey =
    marketplaceRequestDateKey(now);

  const rows = await database.$queryRaw`
    INSERT INTO "MarketplaceRequestDailySequence"
      (
        "tenantId",
        "dateKey",
        "lastNumber",
        "createdAt",
        "updatedAt"
      )
    VALUES
      (
        ${businessId},
        ${dateKey},
        1,
        NOW(),
        NOW()
      )
    ON CONFLICT ("tenantId", "dateKey")
    DO UPDATE SET
      "lastNumber" =
        "MarketplaceRequestDailySequence"."lastNumber" + 1,
      "updatedAt" = NOW()
    RETURNING "lastNumber"
  `;

  const sequence = Number(
    rows?.[0]?.lastNumber,
  );

  if (
    !Number.isInteger(sequence) ||
    sequence < 1
  ) {
    throw appError(
      500,
      "REQUEST_NUMBER_FAILED",
      "The request number could not be created.",
    );
  }

  return marketplaceRequestNumber(
    marketplaceCode,
    dateKey,
    sequence,
  );
}

function trackingToken() {
  return crypto
    .randomBytes(24)
    .toString("hex");
}

function marketplacePublicBaseUrl() {
  const configured =
    cleanString(
      process.env.MARKETPLACE_PUBLIC_URL,
      500,
    ) ||
    cleanString(
      process.env.PUBLIC_WEB_URL,
      500,
    ) ||
    cleanString(
      process.env.WEB_APP_URL,
      500,
    ) ||
    "https://www.storvex.rw";

  return configured.replace(/\/+$/, "");
}

function marketplaceProductUrl(
  storeSlug,
  productSlug,
) {
  const safeStoreSlug =
    encodeURIComponent(
      cleanString(storeSlug, 72) || "",
    );

  const safeProductSlug =
    encodeURIComponent(
      cleanString(productSlug, 120) || "",
    );

  if (
    !safeStoreSlug ||
    !safeProductSlug
  ) {
    return null;
  }

  return `${marketplacePublicBaseUrl()}/marketplace/${safeStoreSlug}/${safeProductSlug}`;
}

function money(value) {
  return Math.max(
    0,
    Number(value || 0),
  );
}

function formatMoney(value, currency = "RWF") {
  const amount = money(value);

  if (
    String(currency || "")
      .toUpperCase() === "RWF"
  ) {
    return `Rwf ${new Intl.NumberFormat(
      "en-US",
      {
        maximumFractionDigits: 0,
      },
    ).format(amount)}`;
  }

  return `${currency} ${new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 2,
    },
  ).format(amount)}`;
}

function validateRequestInput(body = {}) {
  const storeSlug = cleanString(
    body.storeSlug,
    72,
  );

  const clientRequestId = cleanString(
    body.clientRequestId,
    120,
  );

  const preferredContact = normalizeToken(
    body.preferredContact,
  );

  const fulfilmentMethod = normalizeToken(
    body.fulfilmentMethod,
  );

  const deliveryCoverage = normalizeToken(
    body.deliveryCoverage,
  );

  const paymentMethod = normalizeToken(
    body.paymentMethod,
  );

  const customerName = cleanString(
    body.customerName,
    160,
  );

  const customerPhone = normalizePhone(
    body.customerPhone,
  );

  const customerEmail = normalizeEmail(
    body.customerEmail,
  );

  const deliveryAddress = cleanString(
    body.deliveryAddress,
    500,
  );

  const deliveryDistrict = cleanString(
    body.deliveryDistrict,
    120,
  );

  const deliverySector = cleanString(
    body.deliverySector,
    120,
  );

  const customerNote = cleanString(
    body.customerNote,
    1000,
  );

  if (!storeSlug) {
    throw appError(
      400,
      "MARKETPLACE_STORE_REQUIRED",
      "Choose the store receiving this request.",
    );
  }

  if (
    !clientRequestId ||
    clientRequestId.length < 8
  ) {
    throw appError(
      400,
      "CLIENT_REQUEST_ID_REQUIRED",
      "A valid request identifier is required.",
    );
  }

  if (
    !CONTACT_CHANNELS.has(
      preferredContact,
    )
  ) {
    throw appError(
      400,
      "INVALID_CONTACT_CHANNEL",
      "Choose WhatsApp or email.",
    );
  }

  if (
    !FULFILMENT_METHODS.has(
      fulfilmentMethod,
    )
  ) {
    throw appError(
      400,
      "INVALID_FULFILMENT_METHOD",
      "Choose store pickup or delivery.",
    );
  }

  if (
    !PAYMENT_METHODS.has(paymentMethod)
  ) {
    throw appError(
      400,
      "INVALID_PAYMENT_METHOD",
      "Choose an available payment method.",
    );
  }

  if (!customerName) {
    throw appError(
      400,
      "CUSTOMER_NAME_REQUIRED",
      "Enter the customer name.",
    );
  }

  if (
    preferredContact === "WHATSAPP" &&
    !customerPhone
  ) {
    throw appError(
      400,
      "CUSTOMER_PHONE_REQUIRED",
      "Enter the WhatsApp phone number.",
    );
  }

  if (
    preferredContact === "EMAIL" &&
    (
      !customerEmail ||
      !validEmail(customerEmail)
    )
  ) {
    throw appError(
      400,
      "CUSTOMER_EMAIL_REQUIRED",
      "Enter a valid email address.",
    );
  }

  if (
    fulfilmentMethod === "DELIVERY" &&
    !["KIGALI", "OUTSIDE_KIGALI"].includes(
      deliveryCoverage,
    )
  ) {
    throw appError(
      400,
      "DELIVERY_COVERAGE_REQUIRED",
      "Choose Kigali City or outside Kigali.",
    );
  }

  if (
    fulfilmentMethod === "DELIVERY" &&
    !deliveryAddress
  ) {
    throw appError(
      400,
      "DELIVERY_ADDRESS_REQUIRED",
      "Enter the delivery address.",
    );
  }

  if (
    !Array.isArray(body.items) ||
    body.items.length === 0
  ) {
    throw appError(
      400,
      "REQUEST_ITEMS_REQUIRED",
      "Add at least one product.",
    );
  }

  if (
    body.items.length >
    MAX_REQUEST_ITEMS
  ) {
    throw appError(
      400,
      "TOO_MANY_REQUEST_ITEMS",
      `A request can contain up to ${MAX_REQUEST_ITEMS} products.`,
    );
  }

  const itemMap = new Map();

  for (const rawItem of body.items) {
    const productSlug = cleanString(
      rawItem?.productSlug,
      120,
    );

    const quantity = positiveInteger(
      rawItem?.quantity,
    );

    if (!productSlug) {
      throw appError(
        400,
        "PRODUCT_SLUG_REQUIRED",
        "Every requested product must have a valid product reference.",
      );
    }

    if (!quantity) {
      throw appError(
        400,
        "INVALID_REQUEST_QUANTITY",
        "Every requested quantity must be a whole number greater than zero.",
      );
    }

    const existing =
      itemMap.get(productSlug);

    itemMap.set(productSlug, {
      productSlug,
      quantity:
        (existing?.quantity || 0) +
        quantity,
    });
  }

  return {
    storeSlug,
    clientRequestId,
    preferredContact,
    fulfilmentMethod,
    deliveryCoverage:
      fulfilmentMethod === "DELIVERY"
        ? deliveryCoverage
        : null,
    paymentMethod,
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    deliveryDistrict,
    deliverySector,
    customerNote,
    items: Array.from(itemMap.values()),
  };
}

function formatCustomerPhone(value) {
  const digits = normalizePhone(value);

  if (!digits) return null;

  if (
    digits.startsWith("250") &&
    digits.length === 12
  ) {
    return [
      `+${digits.slice(0, 3)}`,
      digits.slice(3, 6),
      digits.slice(6, 9),
      digits.slice(9),
    ].join(" ");
  }

  return value;
}

function buildWhatsappMessage({
  request,
  items,
}) {
  const lines = [
    `Hello ${request.sellerNameSnapshot},`,
    "",
    "I have submitted a product request through Storvex.",
    "",
    "Request number",
    request.requestNumber,
    "",
  ];

  items.forEach((item, index) => {
    if (items.length > 1) {
      lines.push(
        `Product ${index + 1}`,
      );
    } else {
      lines.push("Product");
    }

    lines.push(
      item.productTitleSnapshot,
      "",
      "Quantity",
      String(item.quantity),
      "",
      "Item total",
      formatMoney(
        item.lineTotal,
        request.currency,
      ),
      "",
    );

    if (item.productUrlSnapshot) {
      lines.push(
        "View product",
        item.productUrlSnapshot,
        "",
      );
    }
  });

  lines.push(
    "Total",
    formatMoney(
      request.total,
      request.currency,
    ),
    "",
    "How I will receive it",
    request.fulfilmentMethod === "DELIVERY"
      ? "Seller delivery"
      : "Store pickup",
    "",
  );

  if (
    request.fulfilmentMethod === "DELIVERY"
  ) {
    lines.push(
      "Delivery area",
      request.deliveryCoverage ===
        "OUTSIDE_KIGALI"
        ? "Outside Kigali"
        : "Kigali City",
      "",
    );

    if (request.deliveryAddress) {
      lines.push(
        "Delivery address",
        request.deliveryAddress,
        "",
      );
    }

    const location = [
      request.deliverySector,
      request.deliveryDistrict,
    ]
      .filter(Boolean)
      .join(", ");

    if (location) {
      lines.push(
        "Location",
        location,
        "",
      );
    }
  }

  lines.push(
    "Customer",
    request.customerName,
    "",
  );

  const customerPhone =
    formatCustomerPhone(
      request.customerPhone,
    );

  if (customerPhone) {
    lines.push(
      "Phone",
      customerPhone,
      "",
    );
  }

  if (request.customerNote) {
    lines.push(
      "Note",
      request.customerNote,
      "",
    );
  }

  if (
    request.fulfilmentMethod === "PICKUP"
  ) {
    lines.push(
      "Please confirm availability and let me know when the product is ready for collection.",
    );
  } else if (
    request.deliveryCoverage ===
    "OUTSIDE_KIGALI"
  ) {
    lines.push(
      "Please confirm availability and the delivery cost before processing my request.",
    );
  } else {
    lines.push(
      "Please confirm availability and the delivery arrangements.",
    );
  }

  lines.push(
    "",
    "Thank you.",
  );

  return lines.join("\n");
}

function buildWhatsappUrl(phone, message) {
  const destination = normalizePhone(phone);

  if (!destination) return null;

  return `https://wa.me/${destination}?text=${encodeURIComponent(
    message,
  )}`;
}

function buildRequestEmail({
  request,
  items,
  audience,
}) {
  const isSeller = audience === "SELLER";

  const heading = isSeller
    ? `New Marketplace request ${request.requestNumber}`
    : `Your Marketplace request ${request.requestNumber}`;

  const intro = isSeller
    ? `${request.customerName} sent a new request through the Storvex Marketplace.`
    : `Your request has been sent to ${request.sellerNameSnapshot}. The store will confirm availability and the next steps.`;

  const itemText = items
    .map(
      (item) =>
        [
          item.productTitleSnapshot,
          `Quantity: ${item.quantity}`,
          `Unit price: ${formatMoney(
            item.unitPrice,
            request.currency,
          )}`,
          `Item total: ${formatMoney(
            item.lineTotal,
            request.currency,
          )}`,
          item.productUrlSnapshot
            ? `Product: ${item.productUrlSnapshot}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
    )
    .join("\n\n");

  const text = [
    heading,
    "",
    intro,
    "",
    itemText,
    "",
    `Fulfilment: ${
      request.fulfilmentMethod ===
      "DELIVERY"
        ? "Seller delivery"
        : "Store pickup"
    }`,
    `Payment: ${String(
      request.paymentMethod,
    )
      .toLowerCase()
      .replace(/_/g, " ")}`,
    `Total: ${formatMoney(
      request.total,
      request.currency,
    )}`,
    "",
    `Customer: ${request.customerName}`,
    request.customerPhone
      ? `Phone: ${request.customerPhone}`
      : null,
    request.customerEmail
      ? `Email: ${request.customerEmail}`
      : null,
    request.deliveryAddress
      ? `Delivery address: ${request.deliveryAddress}`
      : null,
    request.customerNote
      ? `Note: ${request.customerNote}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            <strong>${escapeHtml(
              item.productTitleSnapshot,
            )}</strong>
            <div style="margin-top:4px;color:#64748b;">
              Quantity: ${item.quantity}
            </div>

            <div style="margin-top:4px;color:#64748b;">
              Unit price:
              ${escapeHtml(
                formatMoney(
                  item.unitPrice,
                  request.currency,
                ),
              )}
            </div>

            ${
              item.productUrlSnapshot
                ? `
                  <div style="margin-top:8px;">
                    <a
                      href="${escapeHtml(
                        item.productUrlSnapshot,
                      )}"
                      style="color:#2563eb;text-decoration:none;font-weight:700;"
                    >
                      View product
                    </a>
                  </div>
                `
                : ""
            }
          </td>

          <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(
              formatMoney(
                item.lineTotal,
                request.currency,
              ),
            )}
          </td>
        </tr>
      `,
    )
    .join("");

  const html = `
    <div style="margin:0;padding:24px;background:#f6f8fb;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;padding:28px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#2563eb;">
          Storvex Marketplace
        </p>

        <h1 style="margin:0;font-size:24px;line-height:1.25;">
          ${escapeHtml(heading)}
        </h1>

        <p style="margin:16px 0 22px;line-height:1.6;color:#475569;">
          ${escapeHtml(intro)}
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${rows}
        </table>

        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;">
            <strong>Total:</strong>
            ${escapeHtml(
              formatMoney(
                request.total,
                request.currency,
              ),
            )}
          </p>

          <p style="margin:0 0 8px;">
            <strong>Fulfilment:</strong>
            ${
              request.fulfilmentMethod ===
              "DELIVERY"
                ? "Seller delivery"
                : "Store pickup"
            }
          </p>

          <p style="margin:0;">
            <strong>Customer:</strong>
            ${escapeHtml(
              request.customerName,
            )}
          </p>
        </div>
      </div>
    </div>
  `;

  return {
    subject: heading,
    text,
    html,
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const requestProductSelect = {
  id: true,
  tenantId: true,
  name: true,
  sellPrice: true,
  category: true,
  marketplaceTitle: true,
  marketplaceDescription: true,
  marketplacePrice: true,
  marketplaceSalePrice: true,
  marketplaceSaleStartsAt: true,
  marketplaceSaleEndsAt: true,
  marketplaceCategory: true,
  marketplaceSlug: true,
  images: {
    where: {
      isMarketplaceApproved: true,
      imageType: "CLEANED",
    },
    orderBy: [
      { isPrimary: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    take: 1,
    select: {
      url: true,
    },
  },
  branchInventory: {
    select: {
      qtyOnHand: true,
      qtyReserved: true,
    },
  },
};

function serializeCreatedRequest(
  request,
  communication = {},
) {
  return {
    id: request.id,
    requestNumber:
      request.requestNumber,
    trackingToken:
      request.trackingToken,
    status: request.status,
    preferredContact:
      request.preferredContact,
    fulfilmentMethod:
      request.fulfilmentMethod,
    deliveryCoverage:
      request.deliveryCoverage,
    paymentMethod:
      request.paymentMethod,
    currency: request.currency,
    subtotal: request.subtotal,
    deliveryFee:
      request.deliveryFee,
    total: request.total,
    seller: {
      name:
        request.sellerNameSnapshot,
    },
    items: request.items,
    submittedAt:
      request.submittedAt,
    communication,
  };
}

async function notifyMarketplaceOwner(
  request,
) {
  try {
    await prisma.notification.create({
      data: {
        tenantId: request.tenantId,
        type: "ACTION_REQUIRED",
        title: `New Marketplace request ${request.requestNumber}`,
        message: `${request.customerName} requested ${request.items.length} ${
          request.items.length === 1
            ? "product"
            : "products"
        } worth ${formatMoney(
          request.total,
          request.currency,
        )}.`,
        recipientRole: "OWNER",
      },
    });

    return true;
  } catch (error) {
    console.error(
      "Marketplace owner notification failed:",
      error,
    );

    return false;
  }
}

async function sendMarketplaceRequestEmails(
  request,
) {
  const results = {
    seller: null,
    customer: null,
  };

  if (request.sellerEmailSnapshot) {
    const sellerEmail = buildRequestEmail({
      request,
      items: request.items,
      audience: "SELLER",
    });

    results.seller =
      await sendEmailMessage({
        to: request.sellerEmailSnapshot,
        subject: sellerEmail.subject,
        text: sellerEmail.text,
        html: sellerEmail.html,
        entityRef: `marketplace-request-${request.id}-seller`,
      });
  }

  if (request.customerEmail) {
    const customerEmail =
      buildRequestEmail({
        request,
        items: request.items,
        audience: "CUSTOMER",
      });

    results.customer =
      await sendEmailMessage({
        to: request.customerEmail,
        subject: customerEmail.subject,
        text: customerEmail.text,
        html: customerEmail.html,
        entityRef: `marketplace-request-${request.id}-customer`,
      });
  }

  return results;
}

async function submitMarketplaceRequest(
  rawBody = {},
) {
  const input =
    validateRequestInput(rawBody);

  const existing =
    await prisma.marketplaceRequest.findUnique({
      where: {
        clientRequestId:
          input.clientRequestId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

  if (existing) {
    return {
      created: false,
      request: serializeCreatedRequest(
        existing,
        {
          idempotent: true,
        },
      ),
    };
  }

  const seller =
    await prisma.marketplaceSellerProfile.findFirst({
      where: {
        publicSlug: input.storeSlug,
        marketplaceEnabled: true,
        tenant: {
          status: "ACTIVE",
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            currencyCode: true,
            status: true,
          },
        },
      },
    });

  if (!seller) {
    throw appError(
      404,
      "MARKETPLACE_STORE_NOT_FOUND",
      "This Marketplace store is not available.",
    );
  }

  if (seller.temporarilyClosed) {
    throw appError(
      409,
      "MARKETPLACE_STORE_CLOSED",
      "This store is temporarily closed.",
    );
  }

  if (
    input.fulfilmentMethod === "PICKUP" &&
    !seller.pickupEnabled
  ) {
    throw appError(
      409,
      "PICKUP_NOT_AVAILABLE",
      "Store pickup is not available from this seller.",
    );
  }

  if (
    input.fulfilmentMethod === "DELIVERY" &&
    !seller.deliveryEnabled
  ) {
    throw appError(
      409,
      "DELIVERY_NOT_AVAILABLE",
      "Delivery is not available from this seller.",
    );
  }

  if (
    input.preferredContact === "WHATSAPP" &&
    !normalizePhone(seller.tenant.phone)
  ) {
    throw appError(
      409,
      "SELLER_WHATSAPP_NOT_AVAILABLE",
      "This seller is not currently accepting WhatsApp requests.",
    );
  }

  if (
    input.preferredContact === "EMAIL" &&
    !normalizeEmail(seller.tenant.email)
  ) {
    throw appError(
      409,
      "SELLER_EMAIL_NOT_AVAILABLE",
      "This seller is not currently accepting email requests.",
    );
  }

  const allowedPayments = normalizeList(
    seller.paymentMethods,
  );

  if (
    input.paymentMethod !== "SELLER_APPROVED_OTHER" &&
    allowedPayments.length &&
    !allowedPayments.includes(
      input.paymentMethod,
    )
  ) {
    throw appError(
      409,
      "PAYMENT_METHOD_NOT_AVAILABLE",
      "This payment method is not available from the seller.",
    );
  }

  const productSlugs = input.items.map(
    (item) => item.productSlug,
  );

  const products =
    await prisma.product.findMany({
      where: {
        tenantId: seller.tenantId,
        isActive: true,
        marketplaceStatus: "PUBLISHED",
        marketplaceSlug: {
          in: productSlugs,
        },
        images: {
          some: {
            isMarketplaceApproved: true,
            imageType: "CLEANED",
          },
        },
      },
      select: requestProductSelect,
    });

  const productsBySlug = new Map(
    products.map((product) => [
      product.marketplaceSlug,
      product,
    ]),
  );

  const requestItems = [];
  let subtotal = 0;

  for (const requestedItem of input.items) {
    const product = productsBySlug.get(
      requestedItem.productSlug,
    );

    if (!product) {
      throw appError(
        409,
        "MARKETPLACE_PRODUCT_UNAVAILABLE",
        "One or more products are no longer available.",
        {
          productSlug:
            requestedItem.productSlug,
        },
      );
    }

    const availableQuantity =
      calculateAvailableQuantity(
        product.branchInventory,
      );

    if (
      requestedItem.quantity >
      availableQuantity
    ) {
      throw appError(
        409,
        "MARKETPLACE_STOCK_CHANGED",
        `${
          product.marketplaceTitle ||
          product.name
        } no longer has the requested quantity available.`,
        {
          productSlug:
            requestedItem.productSlug,
          requestedQuantity:
            requestedItem.quantity,
          availableQuantity,
        },
      );
    }

    const pricing =
      activeMarketplacePricing(product);

    const unitPrice = money(
      pricing.price,
    );

    const lineTotal =
      unitPrice *
      requestedItem.quantity;

    subtotal += lineTotal;

    requestItems.push({
      productId: product.id,
      productSlugSnapshot:
        product.marketplaceSlug,
      productTitleSnapshot:
        product.marketplaceTitle ||
        product.name,
      productCategorySnapshot:
        product.marketplaceCategory ||
        product.category ||
        null,
      productImageSnapshot:
        product.images?.[0]?.url ||
        null,
      productUrlSnapshot:
        marketplaceProductUrl(
          seller.publicSlug,
          product.marketplaceSlug,
        ),
      quantity:
        requestedItem.quantity,
      unitPrice,
      lineTotal,
    });
  }

  const deliveryFee = 0;
  const total = subtotal;

  let created;

  try {
    created =
      await prisma.marketplaceRequest.create({
        data: {
          tenantId: seller.tenantId,
          requestNumber:
            await nextMarketplaceRequestNumber(
              seller.tenantId,
              seller.marketplaceCode,
            ),
          trackingToken:
            trackingToken(),
          clientRequestId:
            input.clientRequestId,
          preferredContact:
            input.preferredContact,
          fulfilmentMethod:
            input.fulfilmentMethod,
          deliveryCoverage:
            input.deliveryCoverage,
          paymentMethod:
            input.paymentMethod,
          customerName:
            input.customerName,
          customerPhone:
            input.customerPhone,
          customerEmail:
            input.customerEmail,
          deliveryAddress:
            input.deliveryAddress,
          deliveryDistrict:
            input.deliveryDistrict,
          deliverySector:
            input.deliverySector,
          customerNote:
            input.customerNote,
          currency:
            seller.tenant.currencyCode ||
            "RWF",
          subtotal,
          deliveryFee,
          total,
          sellerNameSnapshot:
            seller.displayName ||
            seller.tenant.name,
          sellerPhoneSnapshot:
            normalizePhone(
              seller.tenant.phone,
            ),
          sellerEmailSnapshot:
            normalizeEmail(
              seller.tenant.email,
            ),
          items: {
            create: requestItems,
          },
        },
        include: {
          items: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
  } catch (error) {
    if (error?.code === "P2002") {
      const duplicate =
        await prisma.marketplaceRequest.findUnique({
          where: {
            clientRequestId:
              input.clientRequestId,
          },
          include: {
            items: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        });

      if (duplicate) {
        return {
          created: false,
          request:
            serializeCreatedRequest(
              duplicate,
              {
                idempotent: true,
              },
            ),
        };
      }
    }

    throw error;
  }

  const ownerNotificationSent =
    await notifyMarketplaceOwner(created);

  const communication = {
    ownerNotificationSent,
    whatsappUrl: null,
    email: null,
  };

  if (
    input.preferredContact === "WHATSAPP"
  ) {
    communication.whatsappUrl =
      buildWhatsappUrl(
        created.sellerPhoneSnapshot,
        buildWhatsappMessage({
          request: created,
          items: created.items,
        }),
      );
  }

  if (
    input.preferredContact === "EMAIL"
  ) {
    communication.email =
      await sendMarketplaceRequestEmails(
        created,
      );
  }

  return {
    created: true,
    request: serializeCreatedRequest(
      created,
      communication,
    ),
  };
}

module.exports = {
  submitMarketplaceRequest,
};

module.exports.__private = {
  appError,
  cleanString,
  normalizeToken,
  normalizeEmail,
  normalizePhone,
  normalizeList,
  validateRequestInput,
  marketplaceRequestDateKey,
  marketplaceRequestNumber,
  nextMarketplaceRequestNumber,
  marketplacePublicBaseUrl,
  marketplaceProductUrl,
  buildWhatsappMessage,
  buildWhatsappUrl,
  buildRequestEmail,
  formatMoney,
};

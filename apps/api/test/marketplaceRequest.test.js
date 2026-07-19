const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateRequestInput,
  marketplaceRequestNumber,
  buildWhatsappMessage,
  buildWhatsappUrl,
  normalizePhone,
} = require(
  "../src/modules/marketplace/marketplace.request.service",
).__private;

function validInput(overrides = {}) {
  return {
    storeSlug: "ruraxis",
    clientRequestId:
      "customer-request-0001",
    preferredContact: "WHATSAPP",
    fulfilmentMethod: "PICKUP",
    paymentMethod: "PAY_ON_PICKUP",
    customerName: "Luc Rurangwa",
    customerPhone: "0785587833",
    items: [
      {
        productSlug: "hp-laptop",
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

test(
  "normalizes a valid Marketplace request",
  () => {
    const input = validateRequestInput(
      validInput(),
    );

    assert.equal(
      input.customerPhone,
      "250785587833",
    );

    assert.equal(
      input.preferredContact,
      "WHATSAPP",
    );

    assert.equal(
      input.items.length,
      1,
    );
  },
);

test(
  "merges repeated products in one seller request",
  () => {
    const input = validateRequestInput(
      validInput({
        items: [
          {
            productSlug: "hp-laptop",
            quantity: 1,
          },
          {
            productSlug: "hp-laptop",
            quantity: 2,
          },
        ],
      }),
    );

    assert.deepEqual(input.items, [
      {
        productSlug: "hp-laptop",
        quantity: 3,
      },
    ]);
  },
);

test(
  "requires customer email for email requests",
  () => {
    assert.throws(
      () =>
        validateRequestInput(
          validInput({
            preferredContact: "EMAIL",
            customerPhone: null,
            customerEmail: null,
          }),
        ),
      (error) =>
        error.code ===
        "CUSTOMER_EMAIL_REQUIRED",
    );
  },
);

test(
  "requires delivery coverage for delivery",
  () => {
    assert.throws(
      () =>
        validateRequestInput(
          validInput({
            fulfilmentMethod: "DELIVERY",
            deliveryCoverage: null,
            deliveryAddress: "Kigali",
          }),
        ),
      (error) =>
        error.code ===
        "DELIVERY_COVERAGE_REQUIRED",
    );
  },
);

test(
  "normalizes Kigali delivery coverage",
  () => {
    const input = validateRequestInput(
      validInput({
        fulfilmentMethod: "DELIVERY",
        deliveryCoverage: "KIGALI",
        deliveryAddress: "Kiyovu, Kigali",
      }),
    );

    assert.equal(
      input.deliveryCoverage,
      "KIGALI",
    );
  },
);

test(
  "normalizes outside Kigali delivery coverage",
  () => {
    const input = validateRequestInput(
      validInput({
        fulfilmentMethod: "DELIVERY",
        deliveryCoverage: "OUTSIDE_KIGALI",
        deliveryAddress: "Huye District",
      }),
    );

    assert.equal(
      input.deliveryCoverage,
      "OUTSIDE_KIGALI",
    );
  },
);

test(
  "requires a delivery address for delivery",
  () => {
    assert.throws(
      () =>
        validateRequestInput(
          validInput({
            fulfilmentMethod:
              "DELIVERY",
            deliveryCoverage:
              "KIGALI",
            deliveryAddress: null,
          }),
        ),
      (error) =>
        error.code ===
        "DELIVERY_ADDRESS_REQUIRED",
    );
  },
);

test(
  "rejects zero and decimal quantities",
  () => {
    for (const quantity of [
      0,
      -1,
      1.5,
    ]) {
      assert.throws(
        () =>
          validateRequestInput(
            validInput({
              items: [
                {
                  productSlug:
                    "hp-laptop",
                  quantity,
                },
              ],
            }),
          ),
        (error) =>
          error.code ===
          "INVALID_REQUEST_QUANTITY",
      );
    }
  },
);

test(
  "generates customer-safe request numbers",
  () => {
    const number =
      marketplaceRequestNumber(
        new Date(
          "2026-07-17T10:00:00.000Z",
        ),
      );

    assert.match(
      number,
      /^SVX-20260717-[A-F0-9]{8}$/,
    );
  },
);

test(
  "builds a WhatsApp destination with encoded request details",
  () => {
    const request = {
      requestNumber:
        "SVX-20260717-ABC12345",
      sellerNameSnapshot:
        "RURAXIS LTD",
      customerName:
        "Luc Rurangwa",
      customerPhone:
        "250785587833",
      fulfilmentMethod:
        "PICKUP",
      paymentMethod:
        "PAY_ON_PICKUP",
      currency: "RWF",
      total: 650000,
    };

    const items = [
      {
        productTitleSnapshot:
          "HP Pavilion 15",
        quantity: 1,
        lineTotal: 650000,
      },
    ];

    const message =
      buildWhatsappMessage({
        request,
        items,
      });

    const url = buildWhatsappUrl(
      "0785587833",
      message,
    );

    assert.equal(
      normalizePhone("0785587833"),
      "250785587833",
    );

    assert.match(
      url,
      /^https:\/\/wa\.me\/250785587833\?text=/,
    );

    assert.equal(
      decodeURIComponent(
        url.split("?text=")[1],
      ).includes(
        "SVX-20260717-ABC12345",
      ),
      true,
    );
  },
);

test(
  "exports generic email delivery for Marketplace requests",
  () => {
    const notifications = require(
      "../src/modules/notifications",
    );

    assert.equal(
      typeof notifications.sendEmailMessage,
      "function",
    );
  },
);

test(
  "builds the product URL from validated store and product slugs",
  () => {
    const {
      marketplaceProductUrl,
    } = require(
      "../src/modules/marketplace/marketplace.request.service",
    ).__private;

    const previous =
      process.env.MARKETPLACE_PUBLIC_URL;

    process.env.MARKETPLACE_PUBLIC_URL =
      "https://www.storvex.rw/";

    try {
      assert.equal(
        marketplaceProductUrl(
          "ruraxis-ltd",
          "hp-pavilion-15-6ee692",
        ),
        "https://www.storvex.rw/marketplace/ruraxis-ltd/hp-pavilion-15-6ee692",
      );
    } finally {
      if (previous === undefined) {
        delete process.env
          .MARKETPLACE_PUBLIC_URL;
      } else {
        process.env
          .MARKETPLACE_PUBLIC_URL =
          previous;
      }
    }
  },
);

test(
  "includes product URL in the WhatsApp request message",
  () => {
    const {
      buildWhatsappMessage,
    } = require(
      "../src/modules/marketplace/marketplace.request.service",
    ).__private;

    const message =
      buildWhatsappMessage({
        request: {
          requestNumber:
            "SVX-20260718-12345678",
          sellerNameSnapshot:
            "RURAXIS LTD",
          customerName:
            "Luc Rurangwa",
          customerPhone:
            "250785587833",
          fulfilmentMethod:
            "PICKUP",
          paymentMethod:
            "PAY_ON_PICKUP",
          currency: "RWF",
          total: 650000,
        },
        items: [
          {
            productTitleSnapshot:
              "HP Pavilion 15",
            productUrlSnapshot:
              "https://www.storvex.rw/marketplace/ruraxis-ltd/hp-pavilion-15-6ee692",
            quantity: 1,
            unitPrice: 650000,
            lineTotal: 650000,
          },
        ],
      });

    assert.match(
      message,
      /https:\/\/www\.storvex\.rw\/marketplace\/ruraxis-ltd\/hp-pavilion-15-6ee692/,
    );

    assert.match(
      message,
      /Unit price: Rwf 650,000/,
    );

    assert.match(
      message,
      /Item total: Rwf 650,000/,
    );
  },
);

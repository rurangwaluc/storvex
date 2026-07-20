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
  "normalizes a valid Marketplace order request",
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
    deliveryDistrict: "Nyarugenge",
    deliverySector: "Kiyovu",
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
        deliveryDistrict: "Nyarugenge",
        deliverySector: "Kiyovu",
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
        deliveryDistrict: "Huye",
        deliverySector: "Ngoma",
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
        deliveryDistrict: "Gasabo",
        deliverySector: "Kimironko",
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
  "generates business-specific daily order numbers",
  () => {
    const number =
      marketplaceRequestNumber(
        "RUR",
        "20260717",
        1,
      );

    assert.equal(
      number,
      "SVX-RUR-20260717-001",
    );

    assert.equal(
      marketplaceRequestNumber(
        "RUR",
        "20260717",
        42,
      ),
      "SVX-RUR-20260717-042",
    );

    assert.throws(
      () =>
        marketplaceRequestNumber(
          "R1",
          "20260717",
          1,
        ),
      (error) =>
        error.code ===
        "REQUEST_BUSINESS_CODE_INVALID",
    );
  },
);

test(
  "builds a WhatsApp destination with encoded order details",
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
  "exports generic email delivery for Marketplace order requests",
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
  "formats WhatsApp request labels for easy scanning",
  () => {
    const message = buildWhatsappMessage({
      request: {
        requestNumber:
          "SVX-RUR-20260719-003",
        sellerNameSnapshot:
          "RURAXIS LTD",
        fulfilmentMethod:
          "DELIVERY",
        deliveryCoverage:
          "OUTSIDE_KIGALI",
        deliveryAddress:
          "Near Huye main market",
        deliveryDistrict:
          "Huye",
        deliverySector:
          "Ngoma",
        customerName:
          "Delivery Customer",
        customerPhone:
          "250788000000",
        customerNote: null,
        currency: "RWF",
        total: 650000,
      },
      items: [
        {
          productTitleSnapshot:
            "HP Pavilion 15",
          productUrlSnapshot:
            "https://www.storvex.rw/marketplace/ruraxis-ltd/hp-pavilion-15",
          quantity: 1,
          lineTotal: 650000,
        },
      ],
    });

    assert.match(
      message,
      /\*Order number\*/,
    );
    assert.match(
      message,
      /\*Product\*/,
    );
    assert.match(
      message,
      /\*Quantity\*/,
    );
    assert.match(
      message,
      /\*Item total\*/,
    );
    assert.match(
      message,
      /\*View product\*/,
    );
    assert.match(
      message,
      /\*How I will receive it\*/,
    );
    assert.match(
      message,
      /\*Delivery area\*/,
    );
    assert.match(
      message,
      /\*Delivery address\*/,
    );
  },
);

test(
  "uses singular wording for one pickup product",
  () => {
    const message =
      buildWhatsappMessage({
        request: {
          requestNumber:
            "SVX-RUR-20260719-010",
          sellerNameSnapshot:
            "RURAXIS LTD",
          fulfilmentMethod:
            "PICKUP",
          deliveryCoverage: null,
          customerName:
            "Test Customer",
          customerPhone:
            "250788000000",
          customerNote: null,
          currency: "RWF",
          total: 100000,
        },
        items: [
          {
            productTitleSnapshot:
              "HP Laptop",
            productUrlSnapshot:
              "https://www.storvex.rw/product",
            quantity: 1,
            lineTotal: 100000,
          },
        ],
      });

    assert.match(
      message,
      /when the product is ready for collection/,
    );

    assert.doesNotMatch(
      message,
      /when the products are ready/,
    );
  },
);

test(
  "uses plural wording for several pickup products",
  () => {
    const message =
      buildWhatsappMessage({
        request: {
          requestNumber:
            "SVX-RUR-20260719-011",
          sellerNameSnapshot:
            "RURAXIS LTD",
          fulfilmentMethod:
            "PICKUP",
          deliveryCoverage: null,
          customerName:
            "Test Customer",
          customerPhone:
            "250788000000",
          customerNote: null,
          currency: "RWF",
          total: 150000,
        },
        items: [
          {
            productTitleSnapshot:
              "HP Laptop",
            productUrlSnapshot:
              "https://www.storvex.rw/product-1",
            quantity: 1,
            lineTotal: 100000,
          },
          {
            productTitleSnapshot:
              "Laptop Bag",
            productUrlSnapshot:
              "https://www.storvex.rw/product-2",
            quantity: 1,
            lineTotal: 50000,
          },
        ],
      });

    assert.match(
      message,
      /when the products are ready for collection/,
    );

    assert.doesNotMatch(
      message,
      /when the product is ready/,
    );
  },
);

test(
  "uses singular wording for one Kigali delivery product",
  () => {
    const {
      buildSellerRequestNextStep,
      buildCustomerRequestNextStep,
    } = require(
      "../src/modules/marketplace/marketplace.request.service",
    ).__private;

    const request = {
      sellerNameSnapshot:
        "RURAXIS LTD",
      fulfilmentMethod:
        "DELIVERY",
      deliveryCoverage:
        "KIGALI",
    };

    const items = [{}];

    assert.equal(
      buildSellerRequestNextStep({
        request,
        items,
      }),
      "Please confirm availability and the delivery arrangements for this product.",
    );

    assert.equal(
      buildCustomerRequestNextStep({
        request,
        items,
      }),
      "RURAXIS LTD will confirm availability and the delivery arrangements for this product.",
    );
  },
);

test(
  "uses plural wording for several outside Kigali products",
  () => {
    const {
      buildSellerRequestNextStep,
      buildCustomerRequestNextStep,
    } = require(
      "../src/modules/marketplace/marketplace.request.service",
    ).__private;

    const request = {
      sellerNameSnapshot:
        "RURAXIS LTD",
      fulfilmentMethod:
        "DELIVERY",
      deliveryCoverage:
        "OUTSIDE_KIGALI",
    };

    const items = [{}, {}];

    assert.equal(
      buildSellerRequestNextStep({
        request,
        items,
      }),
      "Please confirm availability for these products and the delivery cost before processing the order.",
    );

    assert.equal(
      buildCustomerRequestNextStep({
        request,
        items,
      }),
      "RURAXIS LTD will confirm availability and the delivery cost for these products.",
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
      /\*Order number\*\nSVX-20260718-12345678/,
    );

    assert.match(
      message,
      /\*Product\*\nHP Pavilion 15/,
    );

    assert.match(
      message,
      /\*Quantity\*\n1/,
    );

    assert.match(
      message,
      /\*Item total\*\nRwf 650,000/,
    );

    assert.match(
      message,
      /\*How I will receive it\*\nStore pickup/,
    );

    assert.match(
      message,
      /\*Phone\*\n\+250 785 587 833/,
    );

    assert.doesNotMatch(
      message,
      /seller approved other/i,
    );

    assert.doesNotMatch(
      message,
      /Payment:/i,
    );
  },
);


test(
  "supports email delivery requests in Kigali",
  () => {
    const input = validateRequestInput(
      validInput({
        preferredContact: "EMAIL",
        customerPhone: null,
        customerEmail: "customer@example.com",
        fulfilmentMethod: "DELIVERY",
        deliveryCoverage: "KIGALI",
        deliveryDistrict: "Gasabo",
        deliverySector: "Kimironko",
        deliveryAddress:
          "KG 11 Avenue, near Kimironko Market",
      }),
    );

    assert.equal(
      input.preferredContact,
      "EMAIL",
    );
    assert.equal(
      input.customerEmail,
      "customer@example.com",
    );
    assert.equal(
      input.customerPhone,
      null,
    );
    assert.equal(
      input.fulfilmentMethod,
      "DELIVERY",
    );
    assert.equal(
      input.deliveryCoverage,
      "KIGALI",
    );
    assert.equal(
      input.deliveryDistrict,
      "Gasabo",
    );
    assert.equal(
      input.deliverySector,
      "Kimironko",
    );
    assert.equal(
      input.deliveryAddress,
      "KG 11 Avenue, near Kimironko Market",
    );
  },
);

test(
  "supports email delivery requests outside Kigali",
  () => {
    const input = validateRequestInput(
      validInput({
        preferredContact: "EMAIL",
        customerPhone: null,
        customerEmail: "customer@example.com",
        fulfilmentMethod: "DELIVERY",
        deliveryCoverage:
          "OUTSIDE_KIGALI",
        deliveryDistrict: "Huye",
        deliverySector: "Ngoma",
        deliveryAddress:
          "Near Huye main market",
      }),
    );

    assert.equal(
      input.preferredContact,
      "EMAIL",
    );
    assert.equal(
      input.fulfilmentMethod,
      "DELIVERY",
    );
    assert.equal(
      input.deliveryCoverage,
      "OUTSIDE_KIGALI",
    );
    assert.equal(
      input.deliveryDistrict,
      "Huye",
    );
    assert.equal(
      input.deliverySector,
      "Ngoma",
    );
  },
);

test(
  "requires district for delivery requests",
  () => {
    assert.throws(
      () =>
        validateRequestInput(
          validInput({
            fulfilmentMethod: "DELIVERY",
            deliveryCoverage: "KIGALI",
            deliveryDistrict: null,
            deliverySector: "Kiyovu",
            deliveryAddress: "KN 4 Avenue",
          }),
        ),
      (error) =>
        error.code ===
        "DELIVERY_DISTRICT_REQUIRED",
    );
  },
);

test(
  "requires sector for delivery requests",
  () => {
    assert.throws(
      () =>
        validateRequestInput(
          validInput({
            fulfilmentMethod: "DELIVERY",
            deliveryCoverage: "KIGALI",
            deliveryDistrict:
              "Nyarugenge",
            deliverySector: null,
            deliveryAddress: "KN 4 Avenue",
          }),
        ),
      (error) =>
        error.code ===
        "DELIVERY_SECTOR_REQUIRED",
    );
  },
);

test(
  "builds the customer email for a Kigali delivery",
  () => {
    const {
      buildRequestEmail,
    } = require(
      "../src/modules/marketplace/marketplace.request.service",
    ).__private;

    const email = buildRequestEmail({
      audience: "CUSTOMER",
      request: {
        requestNumber:
          "SVX-RUR-20260719-003",
        sellerNameSnapshot:
          "RURAXIS LTD",
        customerName:
          "Test Customer",
        customerPhone: null,
        customerEmail:
          "customer@example.com",
        fulfilmentMethod:
          "DELIVERY",
        deliveryCoverage:
          "KIGALI",
        deliveryDistrict:
          "Gasabo",
        deliverySector:
          "Kimironko",
        deliveryAddress:
          "KG 11 Avenue",
        paymentMethod:
          "SELLER_APPROVED_OTHER",
        currency: "RWF",
        total: 650000,
      },
      items: [
        {
          productTitleSnapshot:
            "HP Pavilion 15",
          productUrlSnapshot:
            "https://www.storvex.rw/marketplace/ruraxis-ltd/hp-pavilion-15",
          quantity: 1,
          unitPrice: 650000,
          lineTotal: 650000,
        },
      ],
    });

    assert.match(
      email.subject,
      /SVX-RUR-20260719-003/,
    );
    assert.match(
      email.text,
      /RURAXIS LTD/,
    );
    assert.match(
      email.text,
      /Delivery by RURAXIS LTD/,
    );
    assert.match(
      email.text,
      /HP Pavilion 15/,
    );
    assert.match(
      email.text,
      /Rwf 650,000/,
    );
    assert.match(
      email.html,
      /<strong>Order number:<\/strong>/,
    );
    assert.match(
      email.html,
      /<strong>Product<\/strong>/,
    );
    assert.match(
      email.html,
      /<strong>Quantity:<\/strong>/,
    );
    assert.match(
      email.html,
      /<strong>Item total<\/strong>/,
    );
    assert.match(
      email.html,
      /<strong>View product<\/strong>/,
    );
  },
);

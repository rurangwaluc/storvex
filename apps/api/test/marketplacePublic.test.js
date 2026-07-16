const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateAvailableQuantity,
  chooseApprovedImage,
  serializePublicProduct,
} = require("../src/modules/marketplace/marketplace.public.service");

test("calculates public stock from branch stock minus reservations", () => {
  assert.equal(
    calculateAvailableQuantity([
      { qtyOnHand: 8, qtyReserved: 3 },
      { qtyOnHand: 4, qtyReserved: 1 },
    ]),
    8,
  );
});

test("never exposes negative available stock", () => {
  assert.equal(
    calculateAvailableQuantity([
      { qtyOnHand: 2, qtyReserved: 7 },
    ]),
    0,
  );
});

test("chooses the primary approved cleaned image first", () => {
  const image = chooseApprovedImage([
    {
      url: "original.webp",
      imageType: "ORIGINAL",
      isMarketplaceApproved: true,
      isPrimary: true,
      sortOrder: 0,
    },
    {
      url: "clean-secondary.webp",
      imageType: "CLEANED",
      isMarketplaceApproved: true,
      isPrimary: false,
      sortOrder: 0,
    },
    {
      url: "clean-primary.webp",
      imageType: "CLEANED",
      isMarketplaceApproved: true,
      isPrimary: true,
      sortOrder: 10,
    },
  ]);

  assert.deepEqual(image, {
    url: "clean-primary.webp",
    altText: null,
  });
});

test("hides a product without genuinely available branch stock", () => {
  const product = serializePublicProduct(
    {
      name: "Phone",
      sellPrice: 100000,
      marketplaceSlug: "phone",
      marketplaceTitle: "Phone",
      marketplacePrice: 110000,
      marketplaceCategory: "Phones",
      marketplaceAttributes: {},
      branchInventory: [
        { qtyOnHand: 2, qtyReserved: 2 },
      ],
      images: [
        {
          url: "phone.webp",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      publicSlug: "seller",
      displayName: "Seller",
      pickupEnabled: true,
      deliveryEnabled: false,
      temporarilyClosed: false,
      tenant: {
        name: "Seller",
        logoUrl: null,
        currencyCode: "RWF",
      },
    },
  );

  assert.equal(product, null);
});

test("public product contains only customer-facing values", () => {
  const product = serializePublicProduct(
    {
      id: "internal-id",
      tenantId: "tenant-id",
      name: "Phone",
      costPrice: 50000,
      supplierId: "supplier-id",
      sellPrice: 100000,
      marketplaceSlug: "phone",
      marketplaceTitle: "Phone",
      marketplaceDescription: "Clean phone",
      marketplacePrice: 110000,
      marketplaceCategory: "Phones",
      marketplaceAttributes: {
        storage: "128GB",
      },
      branchInventory: [
        { qtyOnHand: 4, qtyReserved: 1 },
      ],
      images: [
        {
          url: "phone.webp",
          altText: "Phone",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      publicSlug: "seller",
      displayName: "Seller",
      pickupEnabled: true,
      deliveryEnabled: true,
      temporarilyClosed: false,
      tenant: {
        name: "Seller",
        logoUrl: null,
        currencyCode: "RWF",
      },
    },
  );

  assert.equal(product.availableQuantity, 3);
  assert.equal(product.price, 110000);
  assert.equal(product.costPrice, undefined);
  assert.equal(product.supplierId, undefined);
  assert.equal(product.tenantId, undefined);
  assert.equal(product.id, undefined);
});

test("temporarily closed stores remain visible for discovery", () => {
  const product = serializePublicProduct(
    {
      name: "Light",
      sellPrice: 12000,
      marketplaceSlug: "light",
      marketplaceTitle: "LED Light",
      marketplacePrice: 12000,
      marketplaceCategory: "Lighting",
      marketplaceAttributes: {},
      branchInventory: [
        { qtyOnHand: 2, qtyReserved: 0 },
      ],
      images: [
        {
          url: "light.webp",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      publicSlug: "lighting-store",
      displayName: "Lighting Store",
      pickupEnabled: true,
      deliveryEnabled: true,
      temporarilyClosed: true,
      tenant: {
        name: "Lighting Store",
        logoUrl: null,
        currencyCode: "RWF",
      },
    },
  );

  assert.equal(product.seller.temporarilyClosed, true);
});


test("returns multiple approved Marketplace images", () => {
  const product = serializePublicProduct(
    {
      name: "Laptop",
      sellPrice: 700000,
      marketplaceSlug: "laptop",
      marketplaceTitle: "Laptop",
      marketplacePrice: 650000,
      marketplaceCategory: "Electronics",
      marketplaceAttributes: {},
      branchInventory: [
        {
          qtyOnHand: 4,
          qtyReserved: 1,
        },
      ],
      images: [
        {
          url: "laptop-back.webp",
          altText: "Laptop back",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: false,
          sortOrder: 1,
        },
        {
          url: "laptop-front.webp",
          altText: "Laptop front",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      publicSlug: "seller",
      displayName: "Seller",
      pickupEnabled: true,
      deliveryEnabled: false,
      temporarilyClosed: false,
      tenant: {
        name: "Seller",
        currencyCode: "RWF",
      },
    },
  );

  assert.equal(product.images.length, 2);
  assert.equal(
    product.image.url,
    "laptop-front.webp",
  );
  assert.equal(
    product.images[1].url,
    "laptop-back.webp",
  );
});

test("uses an active Marketplace sale price", () => {
  const product = serializePublicProduct(
    {
      name: "Laptop",
      sellPrice: 700000,
      marketplaceSlug: "laptop",
      marketplaceTitle: "Laptop",
      marketplacePrice: 650000,
      marketplaceSalePrice: 600000,
      marketplaceSaleStartsAt: new Date(
        Date.now() - 60000,
      ),
      marketplaceSaleEndsAt: new Date(
        Date.now() + 60000,
      ),
      marketplaceCategory: "Electronics",
      marketplaceAttributes: {},
      branchInventory: [
        {
          qtyOnHand: 4,
          qtyReserved: 1,
        },
      ],
      images: [
        {
          url: "laptop.webp",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      publicSlug: "seller",
      displayName: "Seller",
      pickupEnabled: true,
      deliveryEnabled: false,
      temporarilyClosed: false,
      tenant: {
        name: "Seller",
        currencyCode: "RWF",
      },
    },
  );

  assert.equal(product.onSale, true);
  assert.equal(product.price, 600000);
  assert.equal(product.regularPrice, 650000);
  assert.equal(product.salePrice, 600000);
});

test("ignores an expired Marketplace sale", () => {
  const product = serializePublicProduct(
    {
      name: "Laptop",
      sellPrice: 700000,
      marketplaceSlug: "laptop",
      marketplaceTitle: "Laptop",
      marketplacePrice: 650000,
      marketplaceSalePrice: 600000,
      marketplaceSaleEndsAt: new Date(
        Date.now() - 60000,
      ),
      marketplaceCategory: "Electronics",
      marketplaceAttributes: {},
      branchInventory: [
        {
          qtyOnHand: 4,
          qtyReserved: 1,
        },
      ],
      images: [
        {
          url: "laptop.webp",
          imageType: "CLEANED",
          isMarketplaceApproved: true,
          isPrimary: true,
          sortOrder: 0,
        },
      ],
    },
    {
      publicSlug: "seller",
      displayName: "Seller",
      pickupEnabled: true,
      deliveryEnabled: false,
      temporarilyClosed: false,
      tenant: {
        name: "Seller",
        currencyCode: "RWF",
      },
    },
  );

  assert.equal(product.onSale, false);
  assert.equal(product.price, 650000);
  assert.equal(product.salePrice, null);
});

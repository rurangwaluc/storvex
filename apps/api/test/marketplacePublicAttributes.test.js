const test = require("node:test");
const assert = require("node:assert/strict");

const {
  sanitizePublicMarketplaceAttributes,
} = require("../src/modules/marketplace/marketplace.public.attributes");

test("allows only explicitly approved public Marketplace attributes", () => {
  assert.deepEqual(
    sanitizePublicMarketplaceAttributes({
      brand: " Acme ",
      features: ["Durable", "Portable"],
      costPrice: 100,
      margin: 25,
      supplier: { name: "Private" },
      internalNotes: "Never publish",
    }),
    {
      brand: "Acme",
      features: ["Durable", "Portable"],
    },
  );
});

test("rejects nested and non-scalar public attribute values", () => {
  assert.deepEqual(
    sanitizePublicMarketplaceAttributes({
      brand: { privateValue: "Acme" },
      model: null,
      warranty: "12 months",
    }),
    { warranty: "12 months" },
  );
});

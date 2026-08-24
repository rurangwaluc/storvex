import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateMarketplaceListingQuality,
} from "../src/lib/marketplaceListingQuality.js";

function listing(overrides = {}) {
  return {
    title: "Clear product",
    description: "A clear product description with useful facts for the buyer.",
    price: 10000,
    category: "electronics",
    approvedImageCount: 1,
    attributes: {},
    ...overrides,
  };
}

test("guides a thin generic Electronics phone listing", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "Phone",
    description: "good product",
    subcategory: "phones",
  }));

  assert.equal(result.level, "NEEDS WORK");
  assert.equal(result.recommendations.some((item) => item.includes("exact model")), true);
  assert.equal(result.recommendations.some((item) => item.includes("description")), true);
});

test("recognizes a strong Surface Laptop-style listing", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "Microsoft Surface Laptop 4",
    description: "Used like new with Intel Core i5 processor, 8GB RAM, 256GB SSD and a 14 inch screen.",
    subcategory: "computers",
    leafCategory: "laptops",
  }));

  assert.equal(result.level, "STRONG");
  assert.deepEqual(result.searchVisibilityRecommendations, []);
});

test("suggests the exact model when the description is more specific than the title", () => {
  const input = listing({
    title: "Surface laptop",
    description: "Surface Laptop 4 with Intel Core i5, 8GB RAM, 256GB SSD and a 14 inch screen.",
    subcategory: "computers",
  });
  const snapshot = JSON.stringify(input);
  const result = evaluateMarketplaceListingQuality(input);

  assert.equal(result.level, "STRONG");
  assert.deepEqual(result.searchVisibilityRecommendations, [
    "Use the exact product model in the title.",
  ]);
  assert.equal(JSON.stringify(input), snapshot);
});

test("flags the high-confidence Samsung brand misspelling", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "SUMSUNG A16",
    description: "Phone with Android 14, 8GB RAM, 128GB storage and a 5000mAh battery.",
    subcategory: "phones",
  }));

  assert.deepEqual(result.searchVisibilityRecommendations, [
    "Check the brand spelling in the title.",
  ]);
});

test("flags only narrow invisible title characters without changing quality level", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "HP E\u2060liteBo\u200Cok 1030 G2",
    description: "HP EliteBook 1030 G2 with Core i7, 16GB RAM, 512GB SSD, refurbished and tested.",
    subcategory: "computers",
  }));

  assert.equal(result.level, "STRONG");
  assert.equal(
    result.searchVisibilityRecommendations.includes(
      "Retype the product title using normal visible characters.",
    ),
    true,
  );
});

test("accepts clean and normal international titles", () => {
  const clean = evaluateMarketplaceListingQuality(listing({
    title: "Microsoft Surface Laptop 4",
  }));
  const international = evaluateMarketplaceListingQuality(listing({
    title: "Cafetière Élite – modèle spécial",
    category: "home-and-kitchen",
  }));

  assert.deepEqual(clean.searchVisibilityRecommendations, []);
  assert.deepEqual(international.searchVisibilityRecommendations, []);
});

test("caps search visibility guidance and avoids duplicate model advice", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "SUMSUNG Surface laptop\u200B",
    description: "SUMSUNG Surface laptop 4 with useful product specifications.",
  }));

  assert.equal(result.searchVisibilityRecommendations.length <= 3, true);
  assert.equal(
    result.recommendations.some((recommendation) => recommendation.includes("exact model")),
    false,
  );
});

test("guides an HP USB-C Adapter-style thin listing", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "HP USB-C Adapter",
    description: "Laptop adapter",
    subcategory: "electronics accessories",
  }));

  assert.equal(result.level, "NEEDS WORK");
  assert.equal(
    result.recommendations.some((item) => item.includes("wattage")),
    true,
  );
});

test("guides brand-only and generic accessory titles", () => {
  const lenovo = evaluateMarketplaceListingQuality(listing({ title: "LENOVO" }));
  const mouse = evaluateMarketplaceListingQuality(listing({ title: "Wireless Mouse" }));

  assert.equal(lenovo.recommendations.some((item) => item.includes("exact model")), true);
  assert.equal(mouse.recommendations.some((item) => item.includes("exact model")), true);
});

test("recognizes useful Hardware details", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    category: "hardware",
    title: "Steel claw hammer 450g",
    description: "Steel claw hammer with a 450g head and a non-slip handle for carpentry work.",
    attributes: { productType: "Claw hammer", size: "450g", material: "Steel" },
  }));

  assert.notEqual(result.level, "NEEDS WORK");
});

test("recognizes useful Home and kitchen details", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    category: "home-and-kitchen",
    title: "Stainless steel cooking pot 5L",
    description: "Five litre stainless steel cooking pot with a fitted glass lid.",
    attributes: { productType: "Cooking pot", material: "Stainless steel", capacity: "5L" },
  }));

  assert.notEqual(result.level, "NEEDS WORK");
});

test("recognizes useful Lighting details", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    category: "lighting",
    title: "Solar flood light 100W",
    description: "Outdoor 100 watt solar flood light with battery power and bright 6000K light.",
    attributes: { lightType: "Flood light", wattage: "100W", powerSource: "Solar", colorTemperature: "6000K" },
  }));

  assert.notEqual(result.level, "NEEDS WORK");
});

test("recognizes useful Spare parts compatibility", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    category: "spare-parts",
    title: "Toyota Corolla front brake pads",
    description: "Front brake pad set compatible with Toyota Corolla models from 2014 to 2018.",
    attributes: { partType: "Brake pads", compatibleMake: "Toyota", compatibleModel: "Corolla" },
  }));

  assert.notEqual(result.level, "NEEDS WORK");
});

test("does not penalize clear simple English", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "Samsung A15 128GB",
    description: "Phone is clean and works well.",
    subcategory: "phones",
    attributes: { model: "A15", storage: "128GB", ram: "6GB", condition: "Used" },
  }));

  assert.equal(result.recommendations.some((item) => item.includes("clearer description")), false);
  assert.notEqual(result.level, "NEEDS WORK");
});

test("flags a description that only repeats the title", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "Laptop stand",
    description: "Laptop stand",
  }));

  assert.equal(result.recommendations.some((item) => item.includes("repeating")), true);
});

test("guides a thin laptop stand listing with relevant details", () => {
  const result = evaluateMarketplaceListingQuality(listing({
    title: "Laptop stand",
    description: "Laptop stand",
  }));

  assert.equal(
    result.recommendations.some((item) => item.includes("size, material")),
    true,
  );
});

test("caps recommendations and never mutates the input", () => {
  const input = Object.freeze({
    title: "",
    description: "",
    price: 0,
    category: "spare-parts",
    approvedImageCount: 0,
    attributes: Object.freeze({}),
  });
  const snapshot = JSON.stringify(input);
  const result = evaluateMarketplaceListingQuality(input);

  assert.equal(result.level, "NEEDS WORK");
  assert.equal(result.recommendations.length <= 4, true);
  assert.deepEqual(result.searchVisibilityRecommendations, []);
  assert.equal(JSON.stringify(input), snapshot);
});

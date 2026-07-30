"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MARKETPLACE_CATALOGUE,
  findCatalogueRow,
  publicMarketplaceCatalogue,
  resolveMarketplaceCategoryPath,
  marketplaceCategoryDescendantSlugs,
} = require(
  "../src/modules/marketplace/marketplace.catalogue",
);

test(
  "contains the five Storvex Marketplace departments",
  () => {
    assert.deepEqual(
      MARKETPLACE_CATALOGUE.map(
        (category) => category.slug,
      ),
      [
        "electronics",
        "hardware",
        "home-and-kitchen",
        "lighting",
        "spare-parts",
      ],
    );
  },
);

test(
  "resolves old category aliases",
  () => {
    assert.equal(
      findCatalogueRow(
        "Hardware / Quincaillerie",
      )?.node.slug,
      "hardware",
    );

    assert.equal(
      findCatalogueRow(
        "Home & kitchen materials",
      )?.node.slug,
      "home-and-kitchen",
    );

    assert.equal(
      findCatalogueRow(
        "TVs",
      )?.node.slug,
      "televisions",
    );
  },
);

test(
  "resolves a complete three-level category path",
  () => {
    assert.deepEqual(
      resolveMarketplaceCategoryPath({
        category: "Electronics",
        subcategory: "Computers",
        leafCategory: "Laptops",
      }),
      {
        categoryKey: "ELECTRONICS",
        categorySlug: "electronics",
        categoryLabel: "Electronics",

        subcategoryKey:
          "ELECTRONICS_COMPUTERS",
        subcategorySlug: "computers",
        subcategoryLabel: "Computers",

        leafCategoryKey:
          "ELECTRONICS_COMPUTERS_LAPTOPS",
        leafCategorySlug: "laptops",
        leafCategoryLabel: "Laptops",

        matchedKey:
          "ELECTRONICS_COMPUTERS_LAPTOPS",
        matchedSlug: "laptops",
        matchedLabel: "Laptops",

        depth: 2,
        breadcrumbs: [
          {
            key: "ELECTRONICS",
            slug: "electronics",
            label: "Electronics",
          },
          {
            key: "ELECTRONICS_COMPUTERS",
            slug: "computers",
            label: "Computers",
          },
          {
            key:
              "ELECTRONICS_COMPUTERS_LAPTOPS",
            slug: "laptops",
            label: "Laptops",
          },
        ],
      },
    );
  },
);

test(
  "uses existing Marketplace attributes for backward compatibility",
  () => {
    const result =
      resolveMarketplaceCategoryPath({
        category: "Electronics",
        attributes: {
          subcategory: "Computers",
          subSubcategory: "Monitors",
        },
      });

    assert.equal(
      result.categorySlug,
      "electronics",
    );

    assert.equal(
      result.subcategorySlug,
      "computers",
    );

    assert.equal(
      result.leafCategorySlug,
      "monitors",
    );
  },
);

test(
  "returns null for an unknown category",
  () => {
    assert.equal(
      resolveMarketplaceCategoryPath({
        category: "Unknown department",
      }),
      null,
    );
  },
);

test(
  "returns every descendant slug for category filtering",
  () => {
    const slugs =
      marketplaceCategoryDescendantSlugs(
        "computers",
      );

    assert.deepEqual(
      slugs,
      [
        "computers",
        "laptops",
        "desktops",
        "monitors",
        "computer-accessories",
      ],
    );
  },
);

test(
  "returns a public catalogue without aliases",
  () => {
    const catalogue =
      publicMarketplaceCatalogue();

    assert.equal(
      catalogue[0].slug,
      "electronics",
    );

    assert.equal(
      catalogue[0].children[1].slug,
      "computers",
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        catalogue[0],
        "aliases",
      ),
      false,
    );
  },
);

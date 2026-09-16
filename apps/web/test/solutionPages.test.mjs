import test from "node:test";
import assert from "node:assert/strict";

import {
  getSolutionPage,
  solutionCanonical,
  solutionPages,
} from "../src/lib/seo/solutionPages.js";

test("publishes the seven intended complete and unique solution pages", () => {
  const expectedSlugs = [
    "inventory-management",
    "sales-tracking",
    "cash-control",
    "multi-branch-management",
    "stock-reordering",
    "whatsapp-business",
    "staff-management",
  ];

  assert.deepEqual(
    solutionPages.map((page) => page.slug),
    expectedSlugs,
  );

  for (const field of ["slug", "title", "description", "h1"]) {
    const values = solutionPages.map((page) => page[field]);
    assert.equal(
      new Set(values).size,
      solutionPages.length,
      `${field} must be unique`,
    );
    assert.equal(values.every(Boolean), true, `${field} must be present`);
  }

  for (const field of ["outcomesTitle", "stepsTitle"]) {
    const values = solutionPages.map((page) => page[field]);
    assert.equal(
      new Set(values).size,
      solutionPages.length,
      `${field} must be unique`,
    );
    assert.equal(values.every(Boolean), true, `${field} must be present`);
  }

  for (const page of solutionPages) {
    assert.equal(page.outcomes.length, 3);
    assert.equal(page.steps.length, 4);
    assert.equal(page.connected.length, 3);
    assert.equal(page.related.length, 3);
    assert.equal(["flow", "control", "wide"].includes(page.layout), true);
    assert.equal(solutionCanonical(page.slug), `https://www.storvex.rw/solutions/${page.slug}`);
    assert.equal(getSolutionPage(page.slug), page);
  }
});

test("does not resolve unknown solution slugs", () => {
  assert.equal(getSolutionPage("bad-slug"), null);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  getIndustryPage,
  industryCanonical,
  industryPages,
  isIndustryPageSlug,
} from "../src/lib/seo/industryPages.js";

const approvedSlugs = ["electronics", "hardware", "home-and-kitchen", "lighting", "spare-parts"];

test("publishes exactly five complete and unique industry pages", () => {
  assert.deepEqual(industryPages.map((page) => page.slug), approvedSlugs);

  for (const field of ["slug", "title", "description", "h1", "problemTitle", "dayTitle", "fasterTitle", "toolsTitle", "ctaTitle"]) {
    const values = industryPages.map((page) => page[field]);
    assert.equal(new Set(values).size, 5, `${field} must be unique`);
    assert.equal(values.every(Boolean), true, `${field} must be present`);
  }

  for (const page of industryPages) {
    assert.ok(page.products.length >= 4);
    assert.equal(page.daySteps.length, 3);
    assert.equal(page.facts.length, 4);
    assert.equal(page.faster.length, 3);
    assert.ok(page.tools.length >= 3);
    assert.equal(industryCanonical(page.slug), `https://www.storvex.rw/industries/${page.slug}`);
    assert.equal(getIndustryPage(page.slug), page);
    assert.equal(isIndustryPageSlug(page.slug), true);
  }
});

test("does not resolve or approve unknown industry slugs", () => {
  assert.equal(getIndustryPage("bad-slug"), null);
  assert.equal(isIndustryPageSlug("bad-slug"), false);
});

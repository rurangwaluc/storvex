import assert from "node:assert/strict";
import test from "node:test";

import { tenantMarketFromWorkspace } from "../src/lib/tenantMarket.js";

test("reads authoritative tenant market from the shared workspace", () => {
  assert.deepEqual(
    tenantMarketFromWorkspace({
      tenant: {
        countryCode: "UG",
        currencyCode: "UGX",
        timezone: "Africa/Kampala",
      },
    }),
    {
      countryCode: "UG",
      currencyCode: "UGX",
      timezone: "Africa/Kampala",
    },
  );
});

test("preserves Rwanda fallbacks for historical workspace payloads", () => {
  assert.deepEqual(tenantMarketFromWorkspace({ tenant: {} }), {
    countryCode: "RW",
    currencyCode: "RWF",
    timezone: "Africa/Kigali",
  });
});

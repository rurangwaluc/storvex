import assert from "node:assert/strict";
import test from "node:test";

import {
  formatTenantMoney,
  tenantCurrencyCode,
} from "../src/lib/tenantMoney.js";

import {
  formatTenantDate,
  formatTenantDateTime,
  tenantTimezone,
} from "../src/lib/tenantDateTime.js";

const AFRICAN_MARKETS = [
  ["DZ", "DZD", "Africa/Algiers"],
  ["AO", "AOA", "Africa/Luanda"],
  ["BJ", "XOF", "Africa/Porto-Novo"],
  ["BW", "BWP", "Africa/Gaborone"],
  ["BF", "XOF", "Africa/Ouagadougou"],
  ["BI", "BIF", "Africa/Bujumbura"],
  ["CV", "CVE", "Atlantic/Cape_Verde"],
  ["CM", "XAF", "Africa/Douala"],
  ["CF", "XAF", "Africa/Bangui"],
  ["TD", "XAF", "Africa/Ndjamena"],
  ["KM", "KMF", "Indian/Comoro"],
  ["CD", "CDF", "Africa/Kinshasa"],
  ["CG", "XAF", "Africa/Brazzaville"],
  ["CI", "XOF", "Africa/Abidjan"],
  ["DJ", "DJF", "Africa/Djibouti"],
  ["EG", "EGP", "Africa/Cairo"],
  ["GQ", "XAF", "Africa/Malabo"],
  ["ER", "ERN", "Africa/Asmara"],
  ["SZ", "SZL", "Africa/Mbabane"],
  ["ET", "ETB", "Africa/Addis_Ababa"],
  ["GA", "XAF", "Africa/Libreville"],
  ["GM", "GMD", "Africa/Banjul"],
  ["GH", "GHS", "Africa/Accra"],
  ["GN", "GNF", "Africa/Conakry"],
  ["GW", "XOF", "Africa/Bissau"],
  ["KE", "KES", "Africa/Nairobi"],
  ["LS", "LSL", "Africa/Maseru"],
  ["LR", "LRD", "Africa/Monrovia"],
  ["LY", "LYD", "Africa/Tripoli"],
  ["MG", "MGA", "Indian/Antananarivo"],
  ["MW", "MWK", "Africa/Blantyre"],
  ["ML", "XOF", "Africa/Bamako"],
  ["MR", "MRU", "Africa/Nouakchott"],
  ["MU", "MUR", "Indian/Mauritius"],
  ["MA", "MAD", "Africa/Casablanca"],
  ["MZ", "MZN", "Africa/Maputo"],
  ["NA", "NAD", "Africa/Windhoek"],
  ["NE", "XOF", "Africa/Niamey"],
  ["NG", "NGN", "Africa/Lagos"],
  ["RW", "RWF", "Africa/Kigali"],
  ["ST", "STN", "Africa/Sao_Tome"],
  ["SN", "XOF", "Africa/Dakar"],
  ["SC", "SCR", "Indian/Mahe"],
  ["SL", "SLE", "Africa/Freetown"],
  ["SO", "SOS", "Africa/Mogadishu"],
  ["ZA", "ZAR", "Africa/Johannesburg"],
  ["SS", "SSP", "Africa/Juba"],
  ["SD", "SDG", "Africa/Khartoum"],
  ["TZ", "TZS", "Africa/Dar_es_Salaam"],
  ["TG", "XOF", "Africa/Lome"],
  ["TN", "TND", "Africa/Tunis"],
  ["UG", "UGX", "Africa/Kampala"],
  ["ZM", "ZMW", "Africa/Lusaka"],
  ["ZW", "ZWG", "Africa/Harare"],
];

test("contains exactly 54 African runtime market fixtures", () => {
  assert.equal(AFRICAN_MARKETS.length, 54);
});

test("money and date formatters work for every African market", () => {
  const instant = "2026-09-03T12:00:00Z";

  for (const [countryCode, currencyCode, timezone] of AFRICAN_MARKETS) {
    const market = {
      countryCode,
      currencyCode,
      timezone,
    };

    assert.equal(
      tenantCurrencyCode(market),
      currencyCode,
      `${countryCode}: wrong currency`,
    );

    const money = formatTenantMoney(123456, market);

    assert.ok(
      money.startsWith(`${currencyCode} `),
      `${countryCode}: money formatter returned ${money}`,
    );

    assert.equal(
      tenantTimezone(market),
      timezone,
      `${countryCode}: wrong timezone`,
    );

    assert.doesNotThrow(
      () =>
        new Intl.DateTimeFormat("en", {
          timeZone: timezone,
        }).format(new Date(instant)),
      `${countryCode}: invalid timezone ${timezone}`,
    );

    assert.notEqual(
      formatTenantDate(instant, market),
      "—",
      `${countryCode}: date formatter failed`,
    );

    assert.notEqual(
      formatTenantDateTime(instant, market),
      "—",
      `${countryCode}: datetime formatter failed`,
    );
  }
});

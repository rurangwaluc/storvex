const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeIp,
  requestIpForCountryHint,
  countryHintFromIp,
} = require("../src/lib/geo/countryHint");

test("normalizeIp removes IPv4-mapped IPv6 prefix", () => {
  assert.equal(normalizeIp("::ffff:8.8.8.8"), "8.8.8.8");
});

test("normalizeIp preserves normal IPv4", () => {
  assert.equal(normalizeIp("8.8.8.8"), "8.8.8.8");
});

test("requestIpForCountryHint prefers x-real-ip", () => {
  const req = {
    headers: {
      "x-real-ip": "8.8.8.8",
    },
    socket: {
      remoteAddress: "127.0.0.1",
    },
  };

  assert.equal(requestIpForCountryHint(req), "8.8.8.8");
});

test("countryHintFromIp returns null for localhost", () => {
  assert.equal(countryHintFromIp("127.0.0.1"), null);
});

test("countryHintFromIp ignores countries outside Storvex catalogue", () => {
  // 8.8.8.8 resolves to US in the installed geo database.
  // Storvex currently contains African markets only.
  assert.equal(countryHintFromIp("8.8.8.8"), null);
});


test("countryHintFromIp returns a configured Rwanda market", () => {
  assert.deepEqual(
    countryHintFromIp("197.243.0.1"),
    { countryCode: "RW" },
  );
});

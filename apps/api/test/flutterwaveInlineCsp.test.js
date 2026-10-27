"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(__dirname, "../../web/next.config.mjs"),
  "utf8"
);

function section(from, to) {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);

  assert.ok(start >= 0 && end > start);

  return source.slice(start, end);
}

test("Flutterwave script is development-only", () => {
  const scripts = section(
    "const scriptSources = [",
    "const connectSources = ["
  );

  assert.match(
    scripts,
    /\.\.\.\(isDevelopment[\s\S]*https:\/\/checkout\.flutterwave\.com/
  );
});

test("Flutterwave frames are development-only", () => {
  const frames = section(
    "const frameSources = [",
    "const contentSecurityPolicy = ["
  );

  assert.match(
    frames,
    /\.\.\.\(isDevelopment[\s\S]*https:\/\/checkout\.flutterwave\.com/
  );

  assert.match(
    frames,
    /https:\/\/checkout-v2\.dev-flutterwave\.com/
  );
});

test("existing security restrictions remain", () => {
  assert.match(source, /"frame-ancestors 'none'"/);
  assert.match(source, /"object-src 'none'"/);
  assert.match(source, /"form-action 'self'"/);
  assert.match(source, /key: "Content-Security-Policy"/);
  assert.match(source, /key: "X-Frame-Options"/);
});

test("no production-wide Flutterwave permissions", () => {
  assert.doesNotMatch(
    source,
    /"default-src \*"/
  );

  assert.doesNotMatch(
    source,
    /"frame-src \*"/
  );

  assert.doesNotMatch(
    source,
    /"script-src \*"/
  );
});

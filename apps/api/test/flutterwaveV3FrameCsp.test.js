"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../../..");

function readCsp(mode) {
  const script = `
    import config from "./apps/web/next.config.mjs";

    const rules = await config.headers();

    const csp = rules
      .flatMap(rule => rule.headers || [])
      .find(header =>
        header.key.toLowerCase() ===
        "content-security-policy"
      )?.value;

    if (!csp) {
      throw new Error("Missing Content Security Policy");
    }

    process.stdout.write(csp);
  `;

  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        NODE_ENV: mode,
      },
      encoding: "utf8",
      timeout: 30000,
    }
  );

  assert.equal(
    result.status,
    0,
    result.stderr || "Unable to read CSP"
  );

  return result.stdout;
}

function directive(csp, name) {
  return csp.split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(name + " "));
}

test("development allows the exact Flutterwave v3 frame origin", () => {
  const csp = readCsp("development");
  const frames = directive(csp, "frame-src");

  assert.ok(frames);
  assert.match(
    frames,
    /https:\/\/checkout-v3\.flutterwave\.com/
  );
  assert.match(
    frames,
    /https:\/\/checkout\.flutterwave\.com/
  );
  assert.match(
    frames,
    /https:\/\/checkout-v2\.dev-flutterwave\.com/
  );
});

test("v3 permission is limited to development frames", () => {
  const csp = readCsp("development");

  assert.doesNotMatch(
    directive(csp, "script-src"),
    /checkout-v3\.flutterwave\.com/
  );
});

test("production does not allow Flutterwave checkout frames", () => {
  const csp = readCsp("production");

  assert.doesNotMatch(
    csp,
    /https:\/\/checkout-v3\.flutterwave\.com/
  );
  assert.doesNotMatch(
    csp,
    /https:\/\/checkout\.flutterwave\.com/
  );
  assert.doesNotMatch(
    csp,
    /https:\/\/checkout-v2\.dev-flutterwave\.com/
  );
});

test("frame and object security restrictions are preserved", () => {
  for (const mode of ["development", "production"]) {
    const csp = readCsp(mode);

    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /form-action 'self'/);
    assert.doesNotMatch(csp, /frame-src \*/);
  }
});

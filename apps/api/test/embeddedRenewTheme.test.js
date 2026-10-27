"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");

const renew = fs.readFileSync(
  path.join(root, "apps/web/src/legacy-pages/Billing/Renew.jsx"),
  "utf8"
);

const css = fs.readFileSync(
  path.join(root, "apps/web/src/legacy-pages/Billing/RenewPremium.css"),
  "utf8"
);

const shell = fs.readFileSync(
  path.join(root, "apps/web/src/components/layout/AppShell.jsx"),
  "utf8"
);

test("workspace owns the embedded theme", () => {
  assert.match(
    shell,
    /data-svx-theme=\{isDark \? "dark" : "light"\}/
  );

  assert.match(
    renew,
    /const renewThemeClass = embedded\s*\?\s*""/
  );

  assert.match(
    renew,
    /className=\{`svx-renew-premium \$\{renewThemeClass\}/
  );
});

test("embedded renewal follows workspace dark and light styles", () => {
  assert.match(
    css,
    /\[data-svx-theme="dark"\] \.svx-renew-premium\.is-embedded/
  );

  assert.match(
    css,
    /\[data-svx-theme="light"\] \.svx-renew-premium\.is-embedded/
  );
});

test("standalone renewal retains theme controls", () => {
  assert.match(
    renew,
    /const \{ isDark, toggleTheme \} = useTheme\(\)/
  );

  assert.match(
    renew,
    /onClick=\{toggleTheme\}/
  );

  assert.match(
    css,
    /\.svx-renew-premium\.is-dark/
  );
});

test("embedded page retains approved surface styling", () => {
  assert.match(
    css,
    /\.svx-renew-premium\.is-embedded/
  );

  assert.match(
    css,
    /--rq-card: #202020/
  );

  assert.match(
    css,
    /--rq-card: #ffffff/
  );
});


test("embedded renewal never mounts a second theme hook", () => {
  assert.match(
    renew,
    /export default function Renew\(\{ embedded = false \}\) \{\s*return embedded\s*\?\s*<RenewContent embedded \/>\s*:\s*<StandaloneRenew \/>;/
  );

  const standaloneStart = renew.indexOf(
    "function StandaloneRenew() {"
  );
  const contentStart = renew.indexOf(
    "function RenewContent({",
    standaloneStart
  );

  assert.ok(standaloneStart >= 0);
  assert.ok(contentStart > standaloneStart);

  const standalone = renew.slice(
    standaloneStart,
    contentStart
  );

  assert.match(
    standalone,
    /const \{ isDark, toggleTheme \} = useTheme\(\)/
  );

  const embeddedContent = renew.slice(contentStart);

  assert.doesNotMatch(
    embeddedContent,
    /\buseTheme\s*\(/
  );
});

test("embedded theme remains linked to workspace CSS", () => {
  assert.match(
    shell,
    /data-svx-theme=\{isDark \? "dark" : "light"\}/
  );

  assert.match(
    css,
    /\[data-svx-theme="dark"\] \.svx-renew-premium\.is-embedded/
  );

  assert.match(
    css,
    /\[data-svx-theme="light"\] \.svx-renew-premium\.is-embedded/
  );

  assert.match(
    renew,
    /const renewThemeClass = embedded\s*\?\s*""/
  );
});

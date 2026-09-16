import assert from "node:assert/strict";
import test from "node:test";

import {
  TENANT_SESSION_COOKIE_NAME,
  TENANT_SESSION_MAX_AGE_SECONDS,
  bearerAuthorizationFromTenantSession,
  readTenantSessionToken,
  serializeClearTenantSessionCookie,
  serializeTenantSessionCookie,
} from "../src/lib/server/browserSessionCookie.js";

const TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSJ9.signature";

test(
  "serializes tenant auth as a secure host-only HttpOnly cookie",
  () => {
    const cookie =
      serializeTenantSessionCookie(TOKEN);

    assert.match(
      cookie,
      new RegExp(
        `^${TENANT_SESSION_COOKIE_NAME}=`,
      ),
    );

    assert.match(cookie, /; Path=\//);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; SameSite=Lax/);

    assert.match(
      cookie,
      new RegExp(
        `; Max-Age=${TENANT_SESSION_MAX_AGE_SECONDS}$`,
      ),
    );

    assert.doesNotMatch(
      cookie,
      /Domain=/i,
    );
  },
);

test(
  "reads one valid tenant session cookie among unrelated cookies",
  () => {
    const header = [
      "theme=dark",
      `${TENANT_SESSION_COOKIE_NAME}=${TOKEN}`,
      "locale=en",
    ].join("; ");

    assert.equal(
      readTenantSessionToken(header),
      TOKEN,
    );

    assert.equal(
      bearerAuthorizationFromTenantSession(
        header,
      ),
      `Bearer ${TOKEN}`,
    );
  },
);

test(
  "rejects duplicate tenant session cookies",
  () => {
    const header = [
      `${TENANT_SESSION_COOKIE_NAME}=${TOKEN}`,
      `${TENANT_SESSION_COOKIE_NAME}=${TOKEN}`,
    ].join("; ");

    assert.equal(
      readTenantSessionToken(header),
      null,
    );
  },
);

test(
  "rejects malformed or control-character session values",
  () => {
    assert.equal(
      readTenantSessionToken(
        `${TENANT_SESSION_COOKIE_NAME}=not-a-jwt`,
      ),
      null,
    );

    assert.equal(
      readTenantSessionToken(
        `${TENANT_SESSION_COOKIE_NAME}=${TOKEN}\r\nx-bad: 1`,
      ),
      null,
    );

    assert.equal(
      bearerAuthorizationFromTenantSession(
        `${TENANT_SESSION_COOKIE_NAME}=bad`,
      ),
      null,
    );
  },
);

test(
  "never permits a cookie lifetime beyond the server session window",
  () => {
    assert.throws(
      () =>
        serializeTenantSessionCookie(
          TOKEN,
          {
            maxAgeSeconds:
              TENANT_SESSION_MAX_AGE_SECONDS +
              1,
          },
        ),
      /Invalid tenant session cookie lifetime/,
    );
  },
);

test(
  "clears the exact secure tenant session cookie",
  () => {
    const cookie =
      serializeClearTenantSessionCookie();

    assert.match(
      cookie,
      new RegExp(
        `^${TENANT_SESSION_COOKIE_NAME}=;`,
      ),
    );

    assert.match(cookie, /Path=\//);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=0/);
    assert.match(
      cookie,
      /Expires=Thu, 01 Jan 1970 00:00:00 GMT/,
    );

    assert.doesNotMatch(
      cookie,
      /Domain=/i,
    );
  },
);

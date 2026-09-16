import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_TENANT_LOGO_SIZE_BYTES,
  assertTenantLogoFile,
} from "../src/lib/tenantLogoUploadPolicy.js";

test(
  "browser tenant logo policy matches the 4MB API ceiling",
  () => {
    assert.equal(
      MAX_TENANT_LOGO_SIZE_BYTES,
      4 * 1024 * 1024,
    );
  },
);

test(
  "browser accepts a tenant logo at the 4MB limit",
  () => {
    const file = {
      size:
        MAX_TENANT_LOGO_SIZE_BYTES,
    };

    assert.equal(
      assertTenantLogoFile(file),
      file,
    );
  },
);

test(
  "browser rejects an oversized tenant logo before upload",
  () => {
    assert.throws(
      () =>
        assertTenantLogoFile({
          size:
            MAX_TENANT_LOGO_SIZE_BYTES +
            1,
        }),
      (error) => {
        assert.equal(
          error.code,
          "TENANT_LOGO_TOO_LARGE",
        );

        assert.equal(
          error.message,
          "Business logo must be 4MB or smaller",
        );

        return true;
      },
    );
  },
);

test(
  "browser rejects a missing tenant logo file",
  () => {
    assert.throws(
      () =>
        assertTenantLogoFile(null),
      (error) => {
        assert.equal(
          error.code,
          "TENANT_LOGO_FILE_REQUIRED",
        );

        return true;
      },
    );
  },
);

const assert = require(
  "node:assert/strict",
);
const http = require("node:http");
const test = require("node:test");

const express = require("express");

const {
  MAX_TENANT_LOGO_SIZE_BYTES,
  tenantLogoUpload,
} = require(
  "../src/modules/tenants/tenantLogoUpload",
);

async function withUploadServer(
  callback,
) {
  const app = express();

  app.post(
    "/upload",
    tenantLogoUpload,
    (req, res) => {
      return res.json({
        size:
          req.file?.size || 0,
      });
    },
  );

  const server =
    http.createServer(app);

  await new Promise(
    (resolve, reject) => {
      server.once(
        "error",
        reject,
      );

      server.listen(
        0,
        "127.0.0.1",
        resolve,
      );
    },
  );

  try {
    const address =
      server.address();

    const baseUrl =
      `http://127.0.0.1:${address.port}`;

    await callback(baseUrl);
  } finally {
    await new Promise(
      (resolve) => {
        server.close(resolve);
      },
    );
  }
}

function logoForm(
  size,
  field = "file",
) {
  const form =
    new FormData();

  form.append(
    field,
    new Blob(
      [
        Buffer.alloc(size),
      ],
      {
        type:
          "image/png",
      },
    ),
    "logo.png",
  );

  return form;
}

test(
  "tenant logo upload limit is 4MB",
  () => {
    assert.equal(
      MAX_TENANT_LOGO_SIZE_BYTES,
      4 * 1024 * 1024,
    );
  },
);

test(
  "tenant logo accepts a file at the 4MB limit",
  async () => {
    await withUploadServer(
      async (baseUrl) => {
        const response =
          await fetch(
            `${baseUrl}/upload`,
            {
              method: "POST",
              body: logoForm(
                MAX_TENANT_LOGO_SIZE_BYTES,
              ),
            },
          );

        assert.equal(
          response.status,
          200,
        );

        const body =
          await response.json();

        assert.equal(
          body.size,
          MAX_TENANT_LOGO_SIZE_BYTES,
        );
      },
    );
  },
);

test(
  "tenant logo rejects a file above 4MB with 413",
  async () => {
    await withUploadServer(
      async (baseUrl) => {
        const response =
          await fetch(
            `${baseUrl}/upload`,
            {
              method: "POST",
              body: logoForm(
                MAX_TENANT_LOGO_SIZE_BYTES +
                  1,
              ),
            },
          );

        assert.equal(
          response.status,
          413,
        );

        const body =
          await response.json();

        assert.equal(
          body.code,
          "TENANT_LOGO_TOO_LARGE",
        );

        assert.equal(
          body.message,
          "Business logo must be 4MB or smaller",
        );
      },
    );
  },
);

test(
  "tenant logo rejects an unexpected multipart field with controlled 400",
  async () => {
    await withUploadServer(
      async (baseUrl) => {
        const response =
          await fetch(
            `${baseUrl}/upload`,
            {
              method: "POST",
              body: logoForm(
                1,
                "unexpected",
              ),
            },
          );

        assert.equal(
          response.status,
          400,
        );

        const body =
          await response.json();

        assert.equal(
          body.code,
          "TENANT_LOGO_UPLOAD_INVALID",
        );
      },
    );
  },
);

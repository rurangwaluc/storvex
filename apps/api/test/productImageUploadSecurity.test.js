const assert = require(
  "node:assert/strict",
);

const test = require("node:test");

const {
  MAX_IMAGE_SIZE_BYTES,
  uploadProductImage,
} = require(
  "../src/modules/inventory/inventory.images.controller",
);

test(
  "product image uploads allow files up to 10MB",
  () => {
    assert.equal(
      MAX_IMAGE_SIZE_BYTES,
      10 * 1024 * 1024,
    );
  },
);

test(
  "only the checked multipart product image upload remains exported",
  () => {
    const controller = require(
      "../src/modules/inventory/inventory.images.controller",
    );

    assert.equal(
      typeof uploadProductImage,
      "function",
    );

    assert.equal(
      controller.createProductImageUploadUrl,
      undefined,
    );
  },
);

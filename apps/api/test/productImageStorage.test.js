const assert = require(
  "node:assert/strict",
);

const test = require("node:test");

const {
  STORAGE_VISIBILITY,
  buildPrivateObjectLocation,
  getStorageConfig,
} = require(
  "../src/lib/storage/objectStorage",
);

function withEnv(values, callback) {
  const previous = {};

  for (
    const [name, value]
    of Object.entries(values)
  ) {
    previous[name] =
      process.env[name];

    if (value == null) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (
      const [name, value]
      of Object.entries(previous)
    ) {
      if (value == null) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

test(
  "uses separate private and public image buckets",
  () => {
    withEnv(
      {
        OBJECT_STORAGE_BUCKET:
          "storvex-private",
        OBJECT_STORAGE_PRIVATE_BUCKET:
          "storvex-private",
        OBJECT_STORAGE_PUBLIC_BUCKET:
          "storvex-public",
        OBJECT_STORAGE_PUBLIC_BASE_URL:
          "https://images.example.com",
      },
      () => {
        const privateConfig =
          getStorageConfig(
            STORAGE_VISIBILITY.PRIVATE,
          );

        const publicConfig =
          getStorageConfig(
            STORAGE_VISIBILITY.PUBLIC,
          );

        assert.equal(
          privateConfig.bucket,
          "storvex-private",
        );

        assert.equal(
          privateConfig.publicBaseUrl,
          "",
        );

        assert.equal(
          publicConfig.bucket,
          "storvex-public",
        );

        assert.equal(
          publicConfig.publicBaseUrl,
          "https://images.example.com",
        );
      },
    );
  },
);

test(
  "private database image locations are not public URLs",
  () => {
    assert.equal(
      buildPrivateObjectLocation(
        "product-images-private/a/photo.jpg",
      ),
      "private-object://product-images-private/a/photo.jpg",
    );
  },
);

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const apiRoot = path.resolve(__dirname, "..");

function apiPath(relativePath) {
  return path.join(
    apiRoot,
    relativePath,
  );
}

const storedValues = new Map();
const cachedResponses = new Map();

function cacheKey(...parts) {
  return [
    "storvex",
    ...parts
      .flat()
      .map((part) =>
        String(part ?? "").trim(),
      )
      .filter(Boolean),
  ].join(":");
}

async function cacheGet(key) {
  return storedValues.has(key)
    ? storedValues.get(key)
    : null;
}

async function cacheIncrement(key) {
  const next =
    Number(storedValues.get(key) || 0) + 1;

  storedValues.set(
    key,
    next,
  );

  return next;
}

async function cacheRemember(
  key,
  _ttlSeconds,
  loader,
) {
  if (cachedResponses.has(key)) {
    return {
      value:
        cachedResponses.get(key),
      cache: "HIT",
    };
  }

  const value = await loader();

  cachedResponses.set(
    key,
    value,
  );

  return {
    value,
    cache: "MISS",
  };
}

function stubModule(
  relativePath,
  exports,
) {
  const filename = require.resolve(
    apiPath(relativePath),
  );

  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  };
}

stubModule(
  "src/lib/cache/cache.js",
  {
    cacheGet,
    cacheIncrement,
    cacheKey,
    cacheRemember,
  },
);

const loads = {
  stores: 0,
  store: 0,
  product: 0,
  products: 0,
};

stubModule(
  "src/modules/marketplace/marketplace.public.service.js",
  {
    async listPublicStores(query) {
      loads.stores += 1;

      return {
        stores: [
          {
            slug: "test-store",
          },
        ],
        query,
      };
    },

    async getPublicStore(
      storeSlug,
      query,
    ) {
      loads.store += 1;

      return {
        store: {
          slug: storeSlug,
        },
        products: [],
        query,
      };
    },

    async getPublicProduct(
      storeSlug,
      productSlug,
    ) {
      loads.product += 1;

      return {
        store: {
          slug: storeSlug,
        },
        product: {
          slug: productSlug,
        },
      };
    },

    async listPublicProducts(query) {
      loads.products += 1;

      return {
        products: [
          {
            slug: "test-product",
          },
        ],
        query,
      };
    },

    getPublicMarketplaceCatalogue() {
      return {
        categories: [],
      };
    },
  },
);

stubModule(
  "src/modules/marketplace/marketplace.request.service.js",
  {
    submitMarketplaceRequest:
      async () => null,
  },
);

stubModule(
  "src/modules/marketplace/marketplace.tracking.service.js",
  {
    getTrackedMarketplaceOrder:
      async () => null,
  },
);

stubModule(
  "src/modules/marketplace/marketplace.analytics.service.js",
  {
    recordMarketplaceAnalyticsEvent:
      async () => null,
  },
);

const publicCache = require(
  "../src/modules/marketplace/marketplace.public.cache"
);

const controller = require(
  "../src/modules/marketplace/marketplace.public.controller"
);

function fakeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,

    set(name, value) {
      this.headers[
        String(name).toLowerCase()
      ] = String(value);

      return this;
    },

    status(code) {
      this.statusCode =
        Number(code);

      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function request(
  handler,
  req,
) {
  const res = fakeResponse();

  await handler(
    req,
    res,
  );

  return {
    status: res.statusCode,
    cache:
      res.headers[
        "x-storvex-cache"
      ] || null,
    body: res.body,
  };
}

const publicCases = [
  {
    name: "stores",
    counter: "stores",
    handler:
      controller.listStores,
    request: {
      params: {},
      query: {
        page: "1",
      },
    },
  },
  {
    name: "store",
    counter: "store",
    handler:
      controller.getStore,
    request: {
      params: {
        storeSlug: "test-store",
      },
      query: {
        page: "1",
      },
    },
  },
  {
    name: "product",
    counter: "product",
    handler:
      controller.getProduct,
    request: {
      params: {
        storeSlug: "test-store",
        productSlug:
          "test-product",
      },
      query: {},
    },
  },
  {
    name: "products",
    counter: "products",
    handler:
      controller.listProducts,
    request: {
      params: {},
      query: {
        page: "1",
      },
    },
  },
];

test(
  "uses stable public Marketplace cache identities",
  () => {
    const first =
      publicCache.publicMarketplaceCacheDigest({
        identity: [
          "test-store",
        ],
        query: {
          page: "1",
          sort: "newest",
          search: "phone",
        },
      });

    const reordered =
      publicCache.publicMarketplaceCacheDigest({
        identity: [
          "test-store",
        ],
        query: {
          search: "phone",
          sort: "newest",
          page: "1",
        },
      });

    const anotherStore =
      publicCache.publicMarketplaceCacheDigest({
        identity: [
          "another-store",
        ],
        query: {
          page: "1",
          sort: "newest",
          search: "phone",
        },
      });

    assert.equal(
      first,
      reordered,
    );

    assert.notEqual(
      first,
      anotherStore,
    );
  },
);

test(
  "keeps old product cache aliases on the shared Marketplace generation",
  () => {
    assert.equal(
      publicCache
        .PUBLIC_PRODUCTS_GENERATION_KEY,
      publicCache
        .PUBLIC_MARKETPLACE_GENERATION_KEY,
    );

    assert.equal(
      publicCache
        .getPublicProductsGeneration,
      publicCache
        .getPublicMarketplaceGeneration,
    );

    assert.equal(
      publicCache
        .invalidatePublicProductsCache,
      publicCache
        .invalidatePublicMarketplaceCache,
    );
  },
);

test(
  "caches every public Marketplace read and invalidates them together",
  async () => {
    storedValues.clear();
    cachedResponses.clear();

    for (const key of Object.keys(loads)) {
      loads[key] = 0;
    }

    for (const item of publicCases) {
      const first = await request(
        item.handler,
        item.request,
      );

      assert.equal(
        first.status,
        200,
        `${item.name} first request`,
      );

      assert.equal(
        first.cache,
        "MISS",
        `${item.name} first request`,
      );

      assert.equal(
        loads[item.counter],
        1,
        `${item.name} first loader count`,
      );
    }

    for (const item of publicCases) {
      const second = await request(
        item.handler,
        item.request,
      );

      assert.equal(
        second.status,
        200,
        `${item.name} second request`,
      );

      assert.equal(
        second.cache,
        "HIT",
        `${item.name} second request`,
      );

      assert.equal(
        loads[item.counter],
        1,
        `${item.name} loader must not repeat on HIT`,
      );
    }

    const before =
      await publicCache
        .getPublicMarketplaceGeneration();

    await publicCache
      .invalidatePublicProductsCache();

    const after =
      await publicCache
        .getPublicMarketplaceGeneration();

    assert.equal(
      after,
      before + 1,
    );

    for (const item of publicCases) {
      const refreshed = await request(
        item.handler,
        item.request,
      );

      assert.equal(
        refreshed.cache,
        "MISS",
        `${item.name} after invalidation`,
      );

      assert.equal(
        loads[item.counter],
        2,
        `${item.name} reload after invalidation`,
      );
    }

    for (const item of publicCases) {
      const warmed = await request(
        item.handler,
        item.request,
      );

      assert.equal(
        warmed.cache,
        "HIT",
        `${item.name} warmed again`,
      );

      assert.equal(
        loads[item.counter],
        2,
        `${item.name} loader remains stable`,
      );
    }
  },
);

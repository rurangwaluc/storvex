const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cacheKey,
  cacheRemember,
} = require("../src/lib/cache/cache");

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

test(
  "coalesces concurrent cache misses for the same key",
  async () => {
    const key = cacheKey(
      "test",
      "coalesced-load",
      process.pid,
      Date.now(),
      Math.random(),
    );

    let loaderCalls = 0;

    const loader = async () => {
      loaderCalls += 1;

      await delay(40);

      return {
        loaderCalls,
        value: "shared-result",
      };
    };

    const results = await Promise.all(
      Array.from(
        { length: 12 },
        () =>
          cacheRemember(
            key,
            30,
            loader,
          ),
      ),
    );

    assert.equal(
      loaderCalls,
      1,
    );

    assert.equal(
      results.length,
      12,
    );

    for (const result of results) {
      assert.deepEqual(
        result.value,
        {
          loaderCalls: 1,
          value: "shared-result",
        },
      );

      assert.equal(
        result.cache,
        "MISS",
      );
    }
  },
);

test(
  "does not retain a failed in-flight loader",
  async () => {
    const key = cacheKey(
      "test",
      "failed-load-retry",
      process.pid,
      Date.now(),
      Math.random(),
    );

    let loaderCalls = 0;

    const failingLoader = async () => {
      loaderCalls += 1;

      await delay(20);

      throw new Error(
        "Temporary loader failure",
      );
    };

    const failedResults =
      await Promise.allSettled([
        cacheRemember(
          key,
          30,
          failingLoader,
        ),
        cacheRemember(
          key,
          30,
          failingLoader,
        ),
      ]);

    assert.equal(
      loaderCalls,
      1,
    );

    assert.equal(
      failedResults[0].status,
      "rejected",
    );

    assert.equal(
      failedResults[1].status,
      "rejected",
    );

    const recovered =
      await cacheRemember(
        key,
        30,
        async () => {
          loaderCalls += 1;

          return {
            recovered: true,
          };
        },
      );

    assert.equal(
      loaderCalls,
      2,
    );

    assert.deepEqual(
      recovered,
      {
        value: {
          recovered: true,
        },
        cache: "MISS",
      },
    );
  },
);

test(
  "keeps independent cache keys independent",
  async () => {
    const unique = [
      process.pid,
      Date.now(),
      Math.random(),
    ];

    const firstKey = cacheKey(
      "test",
      "independent-a",
      ...unique,
    );

    const secondKey = cacheKey(
      "test",
      "independent-b",
      ...unique,
    );

    let loaderCalls = 0;

    const result = await Promise.all([
      cacheRemember(
        firstKey,
        30,
        async () => {
          loaderCalls += 1;
          await delay(20);
          return "first";
        },
      ),
      cacheRemember(
        secondKey,
        30,
        async () => {
          loaderCalls += 1;
          await delay(20);
          return "second";
        },
      ),
    ]);

    assert.equal(
      loaderCalls,
      2,
    );

    assert.deepEqual(
      result.map((entry) => entry.value),
      [
        "first",
        "second",
      ],
    );
  },
);

test(
  "rejects invalid cacheRemember arguments",
  async () => {
    await assert.rejects(
      () =>
        cacheRemember(
          "",
          30,
          async () => "value",
        ),
      {
        name: "TypeError",
        message:
          "cacheRemember requires a cache key",
      },
    );

    await assert.rejects(
      () =>
        cacheRemember(
          cacheKey(
            "test",
            "invalid-loader",
          ),
          30,
          null,
        ),
      {
        name: "TypeError",
        message:
          "cacheRemember requires a loader function",
      },
    );
  },
);

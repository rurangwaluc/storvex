const test = require("node:test");
const assert = require("node:assert/strict");

const databasePath = require.resolve(
  "../src/config/database",
);
const tenantDbPath = require.resolve(
  "../src/lib/database/tenantDb",
);

function loadTenantDb(fakePrisma) {
  const previousDatabase =
    require.cache[databasePath];
  const previousTenantDb =
    require.cache[tenantDbPath];

  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: fakePrisma,
  };

  delete require.cache[tenantDbPath];

  const tenantDb = require(tenantDbPath);

  return {
    tenantDb,
    cleanup() {
      delete require.cache[tenantDbPath];

      if (previousTenantDb) {
        require.cache[tenantDbPath] =
          previousTenantDb;
      }

      if (previousDatabase) {
        require.cache[databasePath] =
          previousDatabase;
      } else {
        delete require.cache[databasePath];
      }
    },
  };
}

test(
  "withTenantDb rejects a missing tenant ID before opening a transaction",
  async () => {
    let transactionCalls = 0;

    const fakePrisma = {
      async $transaction() {
        transactionCalls += 1;
      },
    };

    const { tenantDb, cleanup } =
      loadTenantDb(fakePrisma);

    try {
      await assert.rejects(
        tenantDb.withTenantDb(
          null,
          async () => null,
        ),
        (error) =>
          error?.code ===
          "TENANT_CONTEXT_REQUIRED",
      );

      await assert.rejects(
        tenantDb.withTenantDb(
          "   ",
          async () => null,
        ),
        (error) =>
          error?.code ===
          "TENANT_CONTEXT_REQUIRED",
      );

      assert.equal(transactionCalls, 0);
    } finally {
      cleanup();
    }
  },
);

test(
  "withTenantDb sets transaction-local tenant context before using the transaction client",
  async () => {
    let transactionCalls = 0;
    let rawCall = null;
    let callbackClient = null;

    const tx = {
      async $queryRaw(strings, ...values) {
        rawCall = {
          sql: strings.join("?"),
          values,
        };

        return [
          {
            set_config: "tenant-a",
          },
        ];
      },
    };

    const fakePrisma = {
      async $transaction(callback) {
        transactionCalls += 1;
        return callback(tx);
      },
    };

    const { tenantDb, cleanup } =
      loadTenantDb(fakePrisma);

    try {
      const result =
        await tenantDb.withTenantDb(
          "  tenant-a  ",
          async (db) => {
            callbackClient = db;
            return "ok";
          },
        );

      assert.equal(result, "ok");
      assert.equal(transactionCalls, 1);
      assert.equal(callbackClient, tx);

      assert.match(
        rawCall.sql,
        /set_config\s*\(/i,
      );
      assert.match(
        rawCall.sql,
        /app\.tenant_id/i,
      );
      assert.match(
        rawCall.sql,
        /true/i,
      );
      assert.deepEqual(
        rawCall.values,
        ["tenant-a"],
      );
    } finally {
      cleanup();
    }
  },
);

test(
  "withTenantDb propagates callback failures through the transaction",
  async () => {
    const tx = {
      async $queryRaw() {
        return [];
      },
    };

    const fakePrisma = {
      async $transaction(callback) {
        return callback(tx);
      },
    };

    const { tenantDb, cleanup } =
      loadTenantDb(fakePrisma);

    try {
      await assert.rejects(
        tenantDb.withTenantDb(
          "tenant-a",
          async () => {
            throw new Error(
              "callback failed",
            );
          },
        ),
        /callback failed/,
      );
    } finally {
      cleanup();
    }
  },
);

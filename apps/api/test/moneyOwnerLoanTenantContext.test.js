const test = require("node:test");
const assert = require("node:assert/strict");

const databasePath = require.resolve(
  "../src/config/database",
);
const tenantDbPath = require.resolve(
  "../src/lib/database/tenantDb",
);
const controllerPath = require.resolve(
  "../src/modules/money/money.controller",
);

function responseStub() {
  return {
    statusCode: 200,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };
}

function loadController(fakePrisma) {
  const previousDatabase =
    require.cache[databasePath];
  const previousTenantDb =
    require.cache[tenantDbPath];
  const previousController =
    require.cache[controllerPath];

  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: fakePrisma,
  };

  delete require.cache[tenantDbPath];
  delete require.cache[controllerPath];

  const controller = require(controllerPath);

  return {
    controller,

    cleanup() {
      delete require.cache[controllerPath];
      delete require.cache[tenantDbPath];

      if (previousController) {
        require.cache[controllerPath] =
          previousController;
      }

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

function accountFromUpsert(args) {
  const accountType =
    args.where
      .tenantId_branchId_accountType
      .accountType;

  return {
    id: `account-${accountType}`,
    tenantId: "tenant-a",
    branchId: "branch-a",
    accountType,
    balance: 100000,
    label: accountType,
    isSystem: true,
  };
}

function ownerRequest(body = {}) {
  return {
    user: {
      tenantId: "tenant-a",
      id: "user-a",
      role: "OWNER",
      activeBranchId: "branch-a",
    },
    params: {},
    query: {},
    body,
  };
}

test(
  "createLoan uses one tenant-context transaction and preserves tenant ownership",
  async () => {
    let transactionCalls = 0;
    let contextCalls = 0;
    let createArgs = null;

    const tx = {
      async $queryRaw() {
        contextCalls += 1;
        return [];
      },

      ownerLoan: {
        async create(args) {
          createArgs = args;

          return {
            id: "loan-a",
            ...args.data,
          };
        },
      },

      moneyAccount: {
        upsert: async (args) =>
          accountFromUpsert(args),

        update: async () => ({
          id: "account-MOMO",
        }),
      },

      moneyAccountMovement: {
        create: async () => ({
          id: "movement-a",
        }),
      },
    };

    const prisma = {
      async $transaction(callback) {
        transactionCalls += 1;
        return callback(tx);
      },
    };

    const { controller, cleanup } =
      loadController(prisma);

    try {
      const req = ownerRequest({
        type: "GIVEN_OUT",
        partyName: "Customer A",
        amount: 1000,
        paymentMethod: "MOMO",
      });

      const res = responseStub();

      await controller.createLoan(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(transactionCalls, 1);
      assert.equal(contextCalls, 1);

      assert.equal(
        createArgs.data.tenantId,
        "tenant-a",
      );
    } finally {
      cleanup();
    }
  },
);

test(
  "addLoanPayment uses one tenant-context transaction and tenant-scoped lookup",
  async () => {
    let transactionCalls = 0;
    let findArgs = null;
    let paymentArgs = null;

    const tx = {
      async $queryRaw() {
        return [];
      },

      ownerLoan: {
        async findFirst(args) {
          findArgs = args;

          return {
            id: "loan-a",
            tenantId: "tenant-a",
            branchId: "branch-a",
            type: "GIVEN_OUT",
            partyName: "Customer A",
            originalAmount: 1000,
            paidAmount: 0,
            balanceDue: 1000,
            status: "OPEN",
            paymentMethod: "MOMO",
          };
        },

        async update(args) {
          return {
            id: "loan-a",
            tenantId: "tenant-a",
            branchId: "branch-a",
            type: "GIVEN_OUT",
            partyName: "Customer A",
            originalAmount: 1000,
            paidAmount:
              args.data.paidAmount,
            balanceDue:
              args.data.balanceDue,
            status: args.data.status,
            paymentMethod: "MOMO",
            payments: [],
          };
        },
      },

      ownerLoanPayment: {
        async create(args) {
          paymentArgs = args;

          return {
            id: "payment-a",
            ...args.data,
          };
        },
      },

      moneyAccount: {
        upsert: async (args) =>
          accountFromUpsert(args),

        update: async () => ({
          id: "account-MOMO",
        }),
      },

      moneyAccountMovement: {
        create: async () => ({
          id: "movement-a",
        }),
      },
    };

    const prisma = {
      async $transaction(callback) {
        transactionCalls += 1;
        return callback(tx);
      },
    };

    const { controller, cleanup } =
      loadController(prisma);

    try {
      const req = ownerRequest({
        amount: 250,
        method: "MOMO",
      });

      req.params.id = "loan-a";

      const res = responseStub();

      await controller.addLoanPayment(
        req,
        res,
      );

      assert.equal(res.statusCode, 201);
      assert.equal(transactionCalls, 1);

      assert.equal(
        findArgs.where.tenantId,
        "tenant-a",
      );

      assert.equal(
        paymentArgs.data.tenantId,
        "tenant-a",
      );
    } finally {
      cleanup();
    }
  },
);

test(
  "listLoans performs its OwnerLoan read through tenant context with an explicit tenant predicate",
  async () => {
    let transactionCalls = 0;
    let findManyArgs = null;

    const tx = {
      async $queryRaw() {
        return [];
      },

      ownerLoan: {
        async findMany(args) {
          findManyArgs = args;
          return [];
        },
      },
    };

    const prisma = {
      async $transaction(callback) {
        transactionCalls += 1;
        return callback(tx);
      },
    };

    const { controller, cleanup } =
      loadController(prisma);

    try {
      const req = ownerRequest();
      const res = responseStub();

      await controller.listLoans(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(transactionCalls, 1);

      assert.equal(
        findManyArgs.where.tenantId,
        "tenant-a",
      );

      assert.deepEqual(
        res.body,
        {
          loans: [],
          count: 0,
        },
      );
    } finally {
      cleanup();
    }
  },
);

test(
  "updateLoan keeps update and readback in one tenant-context transaction",
  async () => {
    let transactionCalls = 0;
    let updateArgs = null;
    let readArgs = null;

    const tx = {
      async $queryRaw() {
        return [];
      },

      ownerLoan: {
        async updateMany(args) {
          updateArgs = args;

          return {
            count: 1,
          };
        },

        async findFirst(args) {
          readArgs = args;

          return {
            id: "loan-a",
            tenantId: "tenant-a",
            partyName: "Updated",
            originalAmount: 1000,
            paidAmount: 0,
            balanceDue: 1000,
            status: "OPEN",
            paymentMethod: "MOMO",
            payments: [],
          };
        },
      },
    };

    const prisma = {
      async $transaction(callback) {
        transactionCalls += 1;
        return callback(tx);
      },
    };

    const { controller, cleanup } =
      loadController(prisma);

    try {
      const req = ownerRequest({
        partyName: "Updated",
      });

      req.params.id = "loan-a";

      const res = responseStub();

      await controller.updateLoan(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(transactionCalls, 1);

      assert.deepEqual(
        updateArgs.where,
        {
          id: "loan-a",
          tenantId: "tenant-a",
        },
      );

      assert.deepEqual(
        readArgs.where,
        {
          id: "loan-a",
          tenantId: "tenant-a",
        },
      );
    } finally {
      cleanup();
    }
  },
);

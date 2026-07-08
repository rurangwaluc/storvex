const prisma = require("../../config/database");

const LOAN_TYPES = new Set(["GIVEN_OUT", "RECEIVED"]);
const LOAN_STATUSES = new Set(["OPEN", "PARTIAL", "PAID", "CANCELLED"]);
const PAYMENT_METHODS = new Set(["CASH", "MOMO", "BANK", "OTHER"]);
const MONEY_ACCOUNT_TYPES = new Set(["MOMO", "BANK", "OTHER"]);

const ACCOUNT_LABELS = {
  MOMO: "MoMo",
  BANK: "Bank",
  OTHER: "Other money",
};

function cleanString(value) {
  const s = String(value || "").trim();
  return s || null;
}

function cleanUpper(value) {
  return String(value || "").trim().toUpperCase();
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function positiveMoney(value) {
  const n = toMoney(value, 0);
  return n > 0 ? n : 0;
}

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getTenantId(req) {
  return req.user?.tenantId || req.tenantId || null;
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || null;
}

function getActiveBranchId(req) {
  return (
    cleanString(req.user?.activeBranchId) ||
    cleanString(req.user?.branchId) ||
    cleanString(req.branchAccess?.activeBranchId) ||
    cleanString(req.branch?.id) ||
    null
  );
}

function isOwner(req) {
  const roleValues = [
    req.user?.role,
    req.user?.roleName,
    req.user?.type,
    req.user?.accountType,
    req.user?.primaryRole,
    ...(Array.isArray(req.user?.roles) ? req.user.roles : []),
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toUpperCase());

  return roleValues.some((role) =>
    ["OWNER", "TENANT_OWNER", "BUSINESS_OWNER", "CO_OWNER", "PARTNER", "SUPER_OWNER"].includes(role),
  );
}

function normalizeLoanType(value) {
  const v = cleanUpper(value);
  return LOAN_TYPES.has(v) ? v : null;
}

function normalizeLoanStatus(value) {
  const v = cleanUpper(value);
  return LOAN_STATUSES.has(v) ? v : null;
}

function normalizePaymentMethod(value) {
  const v = cleanUpper(value);
  return PAYMENT_METHODS.has(v) ? v : "CASH";
}

function normalizeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function loanStatusFor(balanceDue, originalAmount) {
  const balance = safeNumber(balanceDue);
  const original = safeNumber(originalAmount);

  if (balance <= 0) return "PAID";
  if (balance < original) return "PARTIAL";
  return "OPEN";
}

function methodLabel(method) {
  if (method === "CASH") return "Cash drawer";
  if (method === "MOMO") return "MoMo";
  if (method === "BANK") return "Bank";
  if (method === "OTHER") return "Other money";
  return "Selected money account";
}

function serializeLoan(loan) {
  if (!loan) return null;

  return {
    id: loan.id,
    tenantId: loan.tenantId,
    branchId: loan.branchId || null,
    type: loan.type,
    partyName: loan.partyName,
    partyPhone: loan.partyPhone || null,
    originalAmount: safeNumber(loan.originalAmount),
    paidAmount: safeNumber(loan.paidAmount),
    balanceDue: safeNumber(loan.balanceDue),
    status: loan.status,
    paymentMethod: loan.paymentMethod,
    reference: loan.reference || null,
    note: loan.note || null,
    startedAt: loan.startedAt || null,
    dueDate: loan.dueDate || null,
    createdById: loan.createdById || null,
    createdAt: loan.createdAt || null,
    updatedAt: loan.updatedAt || null,
    archivedAt: loan.archivedAt || null,
    payments: Array.isArray(loan.payments) ? loan.payments.map(serializeLoanPayment) : undefined,
  };
}

function serializeLoanPayment(payment) {
  if (!payment) return null;

  return {
    id: payment.id,
    tenantId: payment.tenantId,
    branchId: payment.branchId || null,
    loanId: payment.loanId,
    amount: safeNumber(payment.amount),
    method: payment.method,
    reference: payment.reference || null,
    note: payment.note || null,
    paidAt: payment.paidAt || null,
    createdById: payment.createdById || null,
    createdAt: payment.createdAt || null,
  };
}

function serializeMoneyAccount(account) {
  if (!account) return null;

  return {
    id: account.id,
    tenantId: account.tenantId,
    branchId: account.branchId || null,
    accountType: account.accountType,
    label: account.label || ACCOUNT_LABELS[account.accountType] || account.accountType,
    balance: safeNumber(account.balance),
    isSystem: Boolean(account.isSystem),
    updatedAt: account.updatedAt || null,
  };
}

async function ensureMoneyAccounts(tx, tenantId, branchId) {
  const accounts = [];

  for (const accountType of MONEY_ACCOUNT_TYPES) {
    const account = await tx.moneyAccount.upsert({
      where: {
        tenantId_branchId_accountType: {
          tenantId,
          branchId,
          accountType,
        },
      },
      create: {
        tenantId,
        branchId,
        accountType,
        label: ACCOUNT_LABELS[accountType],
        balance: 0,
        isSystem: true,
      },
      update: {},
    });

    accounts.push(account);
  }

  return accounts;
}

async function getMoneyAccounts(tenantId, branchId) {
  return prisma.$transaction(async (tx) => {
    const accounts = await ensureMoneyAccounts(tx, tenantId, branchId);
    return accounts.map(serializeMoneyAccount);
  });
}

async function getOpenCashSessionForUpdate(tx, tenantId, branchId) {
  const rows = await tx.$queryRaw`
    select
      cs.id,
      cs.tenant_id,
      cs.branch_id,
      cs.opening_cash,
      coalesce(sum(case when cm.type = 'IN' then cm.amount else 0 end), 0) as total_in,
      coalesce(sum(case when cm.type = 'OUT' then cm.amount else 0 end), 0) as total_out,
      (
        cs.opening_cash
        + coalesce(sum(case when cm.type = 'IN' then cm.amount else 0 end), 0)
        - coalesce(sum(case when cm.type = 'OUT' then cm.amount else 0 end), 0)
      ) as expected_cash
    from public.cash_sessions cs
    left join public.cash_movements cm
      on cm.session_id = cs.id
      and cm.tenant_id = cs.tenant_id
      and cm.branch_id = cs.branch_id
    where cs.tenant_id::text = ${String(tenantId)}::text
      and cs.branch_id::text = ${String(branchId)}::text
      and cs.closed_at is null
    group by cs.id
    order by cs.opened_at desc
    limit 1
  `;

  return rows?.[0] || null;
}

async function recordCashLoanMovement(tx, {
  tenantId,
  branchId,
  amount,
  direction,
  note,
  userId,
}) {
  if (!branchId) {
    const error = new Error("BRANCH_REQUIRED");
    error.status = 400;
    throw error;
  }

  const session = await getOpenCashSessionForUpdate(tx, tenantId, branchId);

  if (!session?.id) {
    const error = new Error("CASH_DRAWER_CLOSED");
    error.status = 409;
    throw error;
  }

  const expectedCash = safeNumber(session.expected_cash);

  if (direction === "OUT" && expectedCash < amount) {
    const error = new Error("INSUFFICIENT_MONEY");
    error.status = 400;
    error.method = "CASH";
    error.available = expectedCash;
    throw error;
  }

  const rows = await tx.$queryRaw`
    insert into public.cash_movements
      (tenant_id, branch_id, session_id, type, reason, amount, note, created_by)
    values
      (
        ${String(tenantId)}::text,
        ${String(branchId)}::text,
        ${String(session.id)}::uuid,
        ${direction},
        'OTHER',
        ${BigInt(Math.round(amount))},
        ${note},
        ${userId ? String(userId) : null}
      )
    returning *
  `;

  return rows?.[0] || null;
}

async function recordNonCashMovement(tx, {
  tenantId,
  branchId,
  method,
  amount,
  direction,
  reason,
  sourceType,
  sourceId,
  note,
  userId,
}) {
  const accounts = await ensureMoneyAccounts(tx, tenantId, branchId);
  const account = accounts.find((item) => item.accountType === method);

  if (!account) {
    const error = new Error("MONEY_ACCOUNT_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const currentBalance = safeNumber(account.balance);

  if (direction === "OUT" && currentBalance < amount) {
    const error = new Error("INSUFFICIENT_MONEY");
    error.status = 400;
    error.method = method;
    error.available = currentBalance;
    throw error;
  }

  const nextBalance = direction === "IN" ? currentBalance + amount : currentBalance - amount;

  if (nextBalance < 0) {
    const error = new Error("INSUFFICIENT_MONEY");
    error.status = 400;
    error.method = method;
    error.available = currentBalance;
    throw error;
  }

  const updated = await tx.moneyAccount.update({
    where: { id: account.id },
    data: {
      balance: nextBalance,
    },
  });

  await tx.moneyAccountMovement.create({
    data: {
      tenantId,
      branchId,
      accountId: account.id,
      direction,
      reason,
      amount,
      balanceBefore: currentBalance,
      balanceAfter: nextBalance,
      sourceType,
      sourceId,
      note,
      createdById: userId,
    },
  });

  return updated;
}

async function recordMoneyMovement(tx, params) {
  if (params.method === "CASH") {
    return recordCashLoanMovement(tx, params);
  }

  return recordNonCashMovement(tx, params);
}

async function getLatestDrawerSnapshot(tenantId, branchId) {
  if (!tenantId || !branchId) {
    return {
      open: false,
      expectedCash: 0,
      openingCash: 0,
      totalIn: 0,
      totalOut: 0,
      movementCount: 0,
      difference: 0,
      session: null,
    };
  }

  const rows = await prisma.$queryRaw`
    select
      cs.id,
      cs.branch_id,
      cs.opening_cash,
      cs.opened_at,
      cs.closed_at,
      cs.counted_cash,
      (
        cs.opening_cash
        + coalesce(sum(case when cm.type = 'IN' then cm.amount else 0 end), 0)
        - coalesce(sum(case when cm.type = 'OUT' then cm.amount else 0 end), 0)
      ) as expected_cash,
      coalesce(sum(case when cm.type = 'IN' then cm.amount else 0 end), 0) as total_in,
      coalesce(sum(case when cm.type = 'OUT' then cm.amount else 0 end), 0) as total_out,
      count(cm.id)::int as movement_count
    from public.cash_sessions cs
    left join public.cash_movements cm
      on cm.session_id = cs.id
      and cm.tenant_id = cs.tenant_id
      and cm.branch_id = cs.branch_id
    where cs.tenant_id::text = ${String(tenantId)}::text
      and cs.branch_id::text = ${String(branchId)}::text
    group by cs.id
    order by
      case when cs.closed_at is null then 0 else 1 end,
      coalesce(cs.closed_at, cs.opened_at) desc
    limit 1
  `;

  const row = rows?.[0] || null;

  if (!row) {
    return {
      open: false,
      expectedCash: 0,
      openingCash: 0,
      totalIn: 0,
      totalOut: 0,
      movementCount: 0,
      difference: 0,
      session: null,
    };
  }

  const expectedCash = safeNumber(row.expected_cash);
  const countedCash =
    row.counted_cash === null || typeof row.counted_cash === "undefined"
      ? null
      : safeNumber(row.counted_cash);

  // For the owner Money page:
  // - open drawer: show expected cash right now
  // - closed drawer: show counted cash if available, otherwise last expected cash
  const displayCash = countedCash === null ? expectedCash : countedCash;

  return {
    open: !row.closed_at,
    expectedCash: displayCash,
    openingCash: safeNumber(row.opening_cash),
    totalIn: safeNumber(row.total_in),
    totalOut: safeNumber(row.total_out),
    movementCount: safeNumber(row.movement_count),
    difference: countedCash === null ? 0 : countedCash - expectedCash,
    session: {
      id: row.id,
      branchId: row.branch_id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      countedCash,
      closingReason: null,
      closingExplanation: null,
    },
  };
}


async function getCustomerMoneySummary(tenantId) {
  const totals = await prisma.sale.aggregate({
    where: {
      tenantId,
      isDraft: false,
      isCancelled: false,
      balanceDue: { gt: 0 },
    },
    _sum: { balanceDue: true },
    _count: { _all: true },
  });

  const grouped = await prisma.sale.groupBy({
    by: ["customerId"],
    where: {
      tenantId,
      isDraft: false,
      isCancelled: false,
      customerId: { not: null },
      balanceDue: { gt: 0 },
    },
    _sum: { balanceDue: true },
    _count: { _all: true },
    orderBy: { _sum: { balanceDue: "desc" } },
    take: 50,
  });

  const customerIds = grouped.map((row) => row.customerId).filter(Boolean);
  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds }, tenantId },
        select: { id: true, name: true, phone: true },
      })
    : [];

  const byId = new Map(customers.map((customer) => [customer.id, customer]));

  return {
    total: safeNumber(totals._sum?.balanceDue),
    count: safeNumber(totals._count?._all),
    top: grouped.map((row) => {
      const customer = byId.get(row.customerId) || {};
      return {
        customerId: row.customerId,
        name: customer.name || "Customer",
        phone: customer.phone || null,
        amount: safeNumber(row._sum?.balanceDue),
        saleCount: safeNumber(row._count?._all),
      };
    }),
  };
}

async function getSupplierMoneySummary(tenantId) {
  const totals = await prisma.supplierBill.aggregate({
    where: {
      tenantId,
      balanceDue: { gt: 0 },
      status: { notIn: ["PAID", "CANCELLED"] },
    },
    _sum: { balanceDue: true },
    _count: { _all: true },
  });

  const grouped = await prisma.supplierBill.groupBy({
    by: ["supplierId"],
    where: {
      tenantId,
      balanceDue: { gt: 0 },
      status: { notIn: ["PAID", "CANCELLED"] },
    },
    _sum: { balanceDue: true },
    _count: { _all: true },
    orderBy: { _sum: { balanceDue: "desc" } },
    take: 50,
  });

  const supplierIds = grouped.map((row) => row.supplierId).filter(Boolean);
  const suppliers = supplierIds.length
    ? await prisma.supplier.findMany({
        where: { id: { in: supplierIds }, tenantId },
        select: { id: true, name: true, phone: true, companyName: true },
      })
    : [];

  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  return {
    total: safeNumber(totals._sum?.balanceDue),
    count: safeNumber(totals._count?._all),
    top: grouped.map((row) => {
      const supplier = byId.get(row.supplierId) || {};
      return {
        supplierId: row.supplierId,
        name: supplier.companyName || supplier.name || "Supplier",
        phone: supplier.phone || null,
        amount: safeNumber(row._sum?.balanceDue),
        billCount: safeNumber(row._count?._all),
      };
    }),
  };
}

async function getLoansSummary(tenantId) {
  const activeWhere = {
    tenantId,
    archivedAt: null,
    status: { notIn: ["PAID", "CANCELLED"] },
  };

  const [given, received, recent] = await Promise.all([
    prisma.ownerLoan.aggregate({
      where: { ...activeWhere, type: "GIVEN_OUT" },
      _sum: { balanceDue: true },
      _count: { _all: true },
    }),
    prisma.ownerLoan.aggregate({
      where: { ...activeWhere, type: "RECEIVED" },
      _sum: { balanceDue: true },
      _count: { _all: true },
    }),
    prisma.ownerLoan.findMany({
      where: { tenantId, archivedAt: null },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    }),
  ]);

  return {
    givenOut: {
      total: safeNumber(given._sum?.balanceDue),
      count: safeNumber(given._count?._all),
    },
    received: {
      total: safeNumber(received._sum?.balanceDue),
      count: safeNumber(received._count?._all),
    },
    recent: recent.map(serializeLoan),
  };
}

async function getPaymentSplit(tenantId) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const salePayments = await prisma.salePayment.groupBy({
    by: ["method"],
    where: {
      tenantId,
      createdAt: { gte: since },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  return salePayments.map((row) => ({
    method: row.method,
    amount: safeNumber(row._sum?.amount),
    count: safeNumber(row._count?._all),
  }));
}

async function getSummary(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const branchId = cleanString(req.query.branchId) || getActiveBranchId(req);

    const [drawer, customersOweMe, iOweSuppliers, loans, paymentSplit, moneyAccounts] =
      await Promise.all([
        getLatestDrawerSnapshot(tenantId, branchId).catch(() => null),
        getCustomerMoneySummary(tenantId),
        getSupplierMoneySummary(tenantId),
        getLoansSummary(tenantId),
        getPaymentSplit(tenantId).catch(() => []),
        getMoneyAccounts(tenantId, branchId).catch(() => []),
      ]);

    const cashIHave = safeNumber(drawer?.expectedCash);
    const moneyComingToMe = safeNumber(customersOweMe.total) + safeNumber(loans.givenOut.total);
    const moneyIOwe = safeNumber(iOweSuppliers.total) + safeNumber(loans.received.total);
    const netPosition = cashIHave + moneyComingToMe - moneyIOwe;

    return res.json({
      branchId,
      summary: {
        cashIHave,
        customersOweMe: customersOweMe.total,
        iOweSuppliers: iOweSuppliers.total,
        loansIGaveOut: loans.givenOut.total,
        loansIReceived: loans.received.total,
        moneyComingToMe,
        moneyIOwe,
        netPosition,
      },
      drawer,
      moneyAccounts,
      customersOweMe,
      iOweSuppliers,
      loans,
      paymentSplit,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("getMoneySummary error:", err);
    return res.status(500).json({ message: "Failed to load money summary" });
  }
}

async function listLoans(req, res) {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const type = normalizeLoanType(req.query.type);
    const status = normalizeLoanStatus(req.query.status);
    const includeArchived = String(req.query.includeArchived || "").toLowerCase() === "true";

    const where = {
      tenantId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(includeArchived ? {} : { archivedAt: null }),
    };

    const loans = await prisma.ownerLoan.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        payments: {
          orderBy: [{ paidAt: "desc" }],
          take: 20,
        },
      },
    });

    return res.json({
      loans: loans.map(serializeLoan),
      count: loans.length,
    });
  } catch (err) {
    console.error("listLoans error:", err);
    return res.status(500).json({ message: "Failed to load loans" });
  }
}

async function createLoan(req, res) {
  try {
    if (!isOwner(req)) {
      return res.status(403).json({ message: "Only the owner can record loans." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const type = normalizeLoanType(req.body?.type);
    const partyName = cleanString(req.body?.partyName);
    const amount = positiveMoney(req.body?.amount ?? req.body?.originalAmount);
    const paymentMethod = normalizePaymentMethod(req.body?.paymentMethod || req.body?.method);
    const branchId = cleanString(req.body?.branchId) || getActiveBranchId(req);
    const userId = getUserId(req);

    if (!type) {
      return res.status(400).json({ message: "Choose whether you gave money out or received money." });
    }

    if (!partyName) {
      return res.status(400).json({ message: "Enter the person or business name." });
    }

    if (!amount) {
      return res.status(400).json({ message: "Loan amount must be greater than 0." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.ownerLoan.create({
        data: {
          tenantId,
          branchId,
          type,
          partyName,
          partyPhone: cleanString(req.body?.partyPhone),
          originalAmount: amount,
          paidAmount: 0,
          balanceDue: amount,
          status: "OPEN",
          paymentMethod,
          reference: cleanString(req.body?.reference),
          note: cleanString(req.body?.note),
          dueDate: normalizeDate(req.body?.dueDate),
          startedAt: normalizeDate(req.body?.startedAt) || new Date(),
          createdById: userId,
        },
      });

      const direction = type === "GIVEN_OUT" ? "OUT" : "IN";
      const reason = type === "GIVEN_OUT" ? "LOAN_GIVEN_OUT" : "LOAN_RECEIVED";
      const note =
        type === "GIVEN_OUT"
          ? `Loan given out to ${partyName}`
          : `Loan received from ${partyName}`;

      await recordMoneyMovement(tx, {
        tenantId,
        branchId,
        method: paymentMethod,
        amount,
        direction,
        reason,
        sourceType: "OwnerLoan",
        sourceId: loan.id,
        note,
        userId,
      });

      return loan;
    });

    return res.status(201).json({
      created: true,
      loan: serializeLoan(result),
    });
  } catch (err) {
    return handleMoneyError(res, err, "Failed to create loan");
  }
}

async function addLoanPayment(req, res) {
  try {
    if (!isOwner(req)) {
      return res.status(403).json({ message: "Only the owner can record loan payments." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const loanId = cleanString(req.params.id);
    const amount = positiveMoney(req.body?.amount);
    const method = normalizePaymentMethod(req.body?.method || req.body?.paymentMethod);
    const branchId = cleanString(req.body?.branchId) || getActiveBranchId(req);
    const userId = getUserId(req);

    if (!loanId) return res.status(400).json({ message: "Loan is required." });
    if (!amount) return res.status(400).json({ message: "Payment amount must be greater than 0." });

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.ownerLoan.findFirst({
        where: {
          id: loanId,
          tenantId,
          archivedAt: null,
          status: { not: "CANCELLED" },
        },
      });

      if (!loan) {
        const error = new Error("LOAN_NOT_FOUND");
        error.status = 404;
        throw error;
      }

      const currentBalance = safeNumber(loan.balanceDue);
      if (amount > currentBalance) {
        const error = new Error("PAYMENT_TOO_HIGH");
        error.status = 400;
        error.remaining = currentBalance;
        throw error;
      }

      const direction = loan.type === "GIVEN_OUT" ? "IN" : "OUT";
      const note =
        loan.type === "GIVEN_OUT"
          ? `Loan repayment from ${loan.partyName}`
          : `Loan repayment to ${loan.partyName}`;

      await recordMoneyMovement(tx, {
        tenantId,
        branchId,
        method,
        amount,
        direction,
        reason: "LOAN_REPAYMENT",
        sourceType: "OwnerLoanPayment",
        sourceId: loan.id,
        note,
        userId,
      });

      const nextPaid = safeNumber(loan.paidAmount) + amount;
      const nextBalance = Math.max(0, safeNumber(loan.originalAmount) - nextPaid);
      const nextStatus = loanStatusFor(nextBalance, loan.originalAmount);

      const payment = await tx.ownerLoanPayment.create({
        data: {
          tenantId,
          branchId,
          loanId,
          amount,
          method,
          reference: cleanString(req.body?.reference),
          note: cleanString(req.body?.note),
          paidAt: normalizeDate(req.body?.paidAt) || new Date(),
          createdById: userId,
        },
      });

      const updated = await tx.ownerLoan.update({
        where: { id: loan.id },
        data: {
          paidAmount: nextPaid,
          balanceDue: nextBalance,
          status: nextStatus,
        },
        include: {
          payments: {
            orderBy: [{ paidAt: "desc" }],
            take: 20,
          },
        },
      });

      return { payment, loan: updated };
    });

    return res.status(201).json({
      created: true,
      payment: serializeLoanPayment(result.payment),
      loan: serializeLoan(result.loan),
    });
  } catch (err) {
    return handleMoneyError(res, err, "Failed to record loan payment");
  }
}

async function updateLoan(req, res) {
  try {
    if (!isOwner(req)) {
      return res.status(403).json({ message: "Only the owner can update loans." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const loanId = cleanString(req.params.id);
    const data = {};

    if (req.body?.partyName !== undefined) {
      const partyName = cleanString(req.body.partyName);
      if (!partyName) return res.status(400).json({ message: "Person or business name cannot be empty." });
      data.partyName = partyName;
    }

    if (req.body?.partyPhone !== undefined) data.partyPhone = cleanString(req.body.partyPhone);
    if (req.body?.reference !== undefined) data.reference = cleanString(req.body.reference);
    if (req.body?.note !== undefined) data.note = cleanString(req.body.note);
    if (req.body?.dueDate !== undefined) data.dueDate = normalizeDate(req.body.dueDate);

    if (req.body?.status !== undefined) {
      const status = normalizeLoanStatus(req.body.status);
      if (!status) return res.status(400).json({ message: "Invalid loan status." });
      data.status = status;
    }

    if (req.body?.archived === true) {
      data.archivedAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No loan changes provided." });
    }

    const updatedMany = await prisma.ownerLoan.updateMany({
      where: { id: loanId, tenantId },
      data,
    });

    if (!updatedMany.count) {
      return res.status(404).json({ message: "Loan not found" });
    }

    const loan = await prisma.ownerLoan.findFirst({
      where: { id: loanId, tenantId },
      include: {
        payments: {
          orderBy: [{ paidAt: "desc" }],
          take: 20,
        },
      },
    });

    return res.json({ updated: true, loan: serializeLoan(loan) });
  } catch (err) {
    return handleMoneyError(res, err, "Failed to update loan");
  }
}

function handleMoneyError(res, err, fallbackMessage) {
  if (err?.message === "CASH_DRAWER_CLOSED") {
    return res.status(409).json({
      message: "Open the cash drawer before using cash for this loan.",
      code: "CASH_DRAWER_CLOSED",
    });
  }

  if (err?.message === "BRANCH_REQUIRED") {
    return res.status(400).json({
      message: "Select a branch before recording cash movement.",
      code: "BRANCH_REQUIRED",
    });
  }

  if (err?.message === "INSUFFICIENT_MONEY") {
    const method = methodLabel(err.method);
    return res.status(400).json({
      message: `${method} does not have enough money for this action.`,
      code: "INSUFFICIENT_MONEY",
      method: err.method,
      available: err.available || 0,
    });
  }

  if (err?.message === "LOAN_NOT_FOUND") {
    return res.status(404).json({ message: "Loan not found" });
  }

  if (err?.message === "PAYMENT_TOO_HIGH") {
    return res.status(400).json({
      message: "Payment is higher than the remaining loan balance.",
      remaining: err.remaining || 0,
    });
  }

  console.error("money error:", err);
  return res.status(err?.status || 500).json({ message: fallbackMessage });
}

module.exports = {
  getSummary,
  listLoans,
  createLoan,
  addLoanPayment,
  updateLoan,
};

// src/modules/expenses/expenses.controller.js
const prisma = require("../../config/database");
const { recordMoneyAccountMovement, handleMoneyAccountError } = require("../money/moneyAccount.service");
const logAudit = require("../../utils/auditLogger");
const {
  AuditAction,
  AuditEntity,
  ExpenseCategory,
} = require("@prisma/client");

const EXPENSE_PAID_FROM_VALUES = [
  "CASH_DRAWER",
  "BANK",
  "MOMO",
  "OWNER_MONEY",
  "OTHER",
];

function getTenantId(req) {
  return req.user?.tenantId || null;
}

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function getActiveStoreLocationId(req) {
  return req.user?.branchId || req.branch?.id || null;
}

function canViewAllStoreLocations(req) {
  return Boolean(req.user?.canViewAllBranches);
}

function allowedStoreLocationIds(req) {
  return Array.isArray(req.user?.allowedBranchIds) ? req.user.allowedBranchIds : [];
}

function toMoneyNumber(value) {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function toBigIntAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return BigInt(Math.round(n));
}

function cleanString(value) {
  const s = value == null ? "" : String(value).trim();
  return s || null;
}

function normalizeExpenseCategory(input) {
  const raw = input == null ? "" : String(input).trim().toUpperCase();
  if (!raw) return null;
  return Object.values(ExpenseCategory).includes(raw) ? raw : null;
}

function normalizeExpensePaidFrom(input) {
  const raw = input == null ? "CASH_DRAWER" : String(input).trim().toUpperCase();
  if (!raw) return "CASH_DRAWER";
  return EXPENSE_PAID_FROM_VALUES.includes(raw) ? raw : null;
}

function moneyMethodFromExpensePaidFrom(paidFrom) {
  const value = String(paidFrom || "").trim().toUpperCase();

  if (value === "BANK") return "BANK";
  if (value === "MOMO") return "MOMO";
  if (value === "OWNER_MONEY") return "OTHER";
  if (value === "OTHER") return "OTHER";

  return null;
}

function makeAccessError(code, message, status = 403, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function resolveExpenseStoreLocationScope(req) {
  const requestedStoreLocationId =
    cleanString(req.query?.branchId) ||
    cleanString(req.headers["x-branch-id"]) ||
    null;

  const allStoreLocationsRequested =
    String(req.query?.allBranches || "")
      .trim()
      .toLowerCase() === "true";

  const allowedIds = allowedStoreLocationIds(req);

  if (allStoreLocationsRequested) {
    if (!canViewAllStoreLocations(req)) {
      throw makeAccessError(
        "STORE_LOCATION_ACCESS_DENIED",
        "You do not have access to view all store locations."
      );
    }

    return {
      mode: "ALL_STORE_LOCATIONS",
      branchId: null,
      storeLocationId: null,
      allowedStoreLocationIds: allowedIds,
    };
  }

  if (requestedStoreLocationId) {
    if (
      !canViewAllStoreLocations(req) &&
      allowedIds.length > 0 &&
      !allowedIds.includes(requestedStoreLocationId)
    ) {
      throw makeAccessError(
        "STORE_LOCATION_ACCESS_DENIED",
        "You do not have access to this store location."
      );
    }

    return {
      mode: "SINGLE_STORE_LOCATION",
      branchId: requestedStoreLocationId,
      storeLocationId: requestedStoreLocationId,
      allowedStoreLocationIds: allowedIds,
    };
  }

  const activeStoreLocationId = getActiveStoreLocationId(req);

  return {
    mode: "SINGLE_STORE_LOCATION",
    branchId: activeStoreLocationId,
    storeLocationId: activeStoreLocationId,
    allowedStoreLocationIds: allowedIds,
  };
}

function applyExpenseStoreLocationScope(where, scope) {
  const next = { ...(where || {}) };

  if (scope?.mode === "SINGLE_STORE_LOCATION" && scope?.branchId) {
    next.branchId = scope.branchId;
  }

  return next;
}

async function ensureWritableStoreLocationAccessOrThrow(req) {
  const tenantId = getTenantId(req);
  const storeLocationId = getActiveStoreLocationId(req);

  if (!tenantId) {
    throw makeAccessError("UNAUTHORIZED", "Unauthorized", 401);
  }

  if (!storeLocationId) {
    throw makeAccessError(
      "STORE_LOCATION_REQUIRED",
      "No active store location selected.",
      400
    );
  }

  const allowedIds = allowedStoreLocationIds(req);

  if (
    !canViewAllStoreLocations(req) &&
    allowedIds.length > 0 &&
    !allowedIds.includes(storeLocationId)
  ) {
    throw makeAccessError(
      "STORE_LOCATION_ACCESS_DENIED",
      "You do not have access to this store location."
    );
  }

  const storeLocation = await prisma.branch.findFirst({
    where: {
      id: storeLocationId,
      tenantId,
      status: {
        in: ["ACTIVE", "CLOSED"],
      },
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      code: true,
      status: true,
      isMain: true,
    },
  });

  if (!storeLocation) {
    throw makeAccessError(
      "STORE_LOCATION_NOT_FOUND",
      "Store location not found.",
      404
    );
  }

  if (storeLocation.status !== "ACTIVE") {
    throw makeAccessError(
      "STORE_LOCATION_NOT_ACTIVE",
      "Selected store location is not active.",
      409
    );
  }

  return storeLocation;
}

function expenseInclude() {
  return {
    createdBy: { select: { id: true, name: true } },
    approvedBy: { select: { id: true, name: true } },
    branch: {
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        isMain: true,
      },
    },
  };
}

function storeLocationScopeForClient(scope) {
  if (!scope) return null;

  return {
    mode: scope.mode,
    storeLocationId: scope.storeLocationId || null,
    allowedStoreLocationIds: scope.allowedStoreLocationIds || [],
  };
}

function handleStoreLocationError(res, error, fallbackMessage) {
  const code = String(error?.code || "");

  if (
    code === "UNAUTHORIZED" ||
    code === "STORE_LOCATION_REQUIRED" ||
    code === "STORE_LOCATION_ACCESS_DENIED" ||
    code === "STORE_LOCATION_NOT_FOUND" ||
    code === "STORE_LOCATION_NOT_ACTIVE" ||
    code === "CASH_DRAWER_NOT_OPEN" ||
    code === "CASH_DRAWER_CASH_NOT_ENOUGH" ||
    code === "EXPENSE_ALREADY_CONNECTED_TO_DRAWER"
  ) {
    return res.status(error.status || 500).json({
      message: error.message,
      code,
      ...(error.expectedCash != null ? { expectedCash: String(error.expectedCash) } : {}),
      ...(error.requiredCash != null ? { requiredCash: String(error.requiredCash) } : {}),
    });
  }

  return res.status(error?.status || 500).json({
    message: error?.message || fallbackMessage,
    code: error?.code || null,
  });
}

async function getOpenCashDrawerSession(tx, tenantId, branchId) {
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

async function createExpenseCashDrawerMovement(tx, { tenantId, branchId, userId, expense }) {
  if (expense.cashDrawerMovementId) {
    throw makeAccessError(
      "EXPENSE_ALREADY_CONNECTED_TO_DRAWER",
      "This expense is already connected to a cash drawer movement.",
      409
    );
  }

  const openSession = await getOpenCashDrawerSession(tx, tenantId, branchId);

  if (!openSession) {
    throw makeAccessError(
      "CASH_DRAWER_NOT_OPEN",
      "Open the cash drawer before approving a cash-paid expense.",
      409
    );
  }

  const amount = toBigIntAmount(expense.amount);
  if (amount == null || amount <= 0n) {
    throw makeAccessError("EXPENSE_AMOUNT_INVALID", "Expense amount must be valid.", 400);
  }

  const expectedCash = BigInt(String(openSession.expected_cash || 0));

  if (expectedCash < amount) {
    throw makeAccessError(
      "CASH_DRAWER_CASH_NOT_ENOUGH",
      "Cash drawer does not have enough expected cash for this expense.",
      409,
      {
        expectedCash,
        requiredCash: amount,
      }
    );
  }

  const note = [
    "Approved business expense",
    expense.title ? `Title: ${expense.title}` : null,
    expense.category ? `Category: ${expense.category}` : null,
    expense.paymentReference ? `Reference: ${expense.paymentReference}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const rows = await tx.$queryRaw`
    insert into public.cash_movements
      (tenant_id, branch_id, session_id, type, reason, amount, note, created_by)
    values
      (
        ${String(tenantId)}::uuid,
        ${String(branchId)}::text,
        ${String(openSession.id)}::uuid,
        'OUT'::cash_movement_type,
        'EXPENSE'::cash_movement_reason,
        ${amount},
        ${note},
        ${String(userId)}::uuid
      )
    returning id, session_id
  `;

  const movement = rows?.[0];

  if (!movement?.id) {
    throw makeAccessError(
      "CASH_DRAWER_MOVEMENT_FAILED",
      "Could not create the cash drawer movement.",
      500
    );
  }

  return {
    cashDrawerSessionId: String(movement.session_id || openSession.id),
    cashDrawerMovementId: String(movement.id),
  };
}

// CREATE EXPENSE
async function createExpense(req, res) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);

  const { title, category, amount, notes, paidFrom, paymentReference } = req.body || {};

  if (!tenantId || !userId) {
    return res.status(401).json({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const cleanTitle = cleanString(title);
  if (!cleanTitle) {
    return res.status(400).json({
      message: "Expense title is required.",
      code: "EXPENSE_TITLE_REQUIRED",
    });
  }

  const cleanCategory = normalizeExpenseCategory(category);
  if (!cleanCategory) {
    return res.status(400).json({
      message: `Expense category must be one of ${Object.values(ExpenseCategory).join(", ")}.`,
      code: "EXPENSE_CATEGORY_INVALID",
    });
  }

  const cleanAmount = toMoneyNumber(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    return res.status(400).json({
      message: "Expense amount must be a positive number.",
      code: "EXPENSE_AMOUNT_INVALID",
    });
  }

  const cleanPaidFrom = normalizeExpensePaidFrom(paidFrom);
  if (!cleanPaidFrom) {
    return res.status(400).json({
      message: `Paid from must be one of ${EXPENSE_PAID_FROM_VALUES.join(", ")}.`,
      code: "EXPENSE_PAID_FROM_INVALID",
    });
  }

  const cleanNotes = cleanString(notes);
  const cleanPaymentReference = cleanString(paymentReference);

  try {
    const storeLocation = await ensureWritableStoreLocationAccessOrThrow(req);

    const expense = await prisma.expense.create({
      data: {
        title: cleanTitle,
        category: cleanCategory,
        amount: cleanAmount,
        notes: cleanNotes,
        status: "PENDING",
        tenantId,
        branchId: storeLocation.id,
        createdById: userId,
        paidFrom: cleanPaidFrom,
        paymentReference: cleanPaymentReference,
      },
      include: expenseInclude(),
    });

    await logAudit({
      tenantId,
      userId,
      action: AuditAction.EXPENSE_CREATED,
      entity: AuditEntity.EXPENSE,
      entityId: expense.id,
      metadata: {
        title: cleanTitle,
        category: cleanCategory,
        amount: cleanAmount,
        paidFrom: cleanPaidFrom,
        paymentReference: cleanPaymentReference,
        storeLocationId: storeLocation.id,
        branchId: storeLocation.id,
      },
    });

    return res.status(201).json(expense);
  } catch (error) {
    console.error("createExpense error:", error);
    return handleStoreLocationError(res, error, "Failed to create expense");
  }
}

// LIST EXPENSES
async function listExpenses(req, res) {
  const tenantId = getTenantId(req);

  if (!tenantId) {
    return res.status(401).json({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const scope = resolveExpenseStoreLocationScope(req);

    const expenses = await prisma.expense.findMany({
      where: applyExpenseStoreLocationScope({ tenantId }, scope),
      orderBy: { createdAt: "desc" },
      include: expenseInclude(),
      take: 200,
    });

    return res.json({
      expenses,
      count: expenses.length,
      storeLocationScope: storeLocationScopeForClient(scope),

      branchScope: {
        mode:
          scope.mode === "ALL_STORE_LOCATIONS"
            ? "ALL_BRANCHES"
            : "SINGLE_BRANCH",
        branchId: scope.branchId || null,
        allowedBranchIds: scope.allowedStoreLocationIds || [],
      },
    });
  } catch (error) {
    console.error("listExpenses error:", error);
    return handleStoreLocationError(res, error, "Failed to fetch expenses");
  }
}

// UPDATE EXPENSE - pending only
async function updateExpense(req, res) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { id } = req.params;

  const { title, category, amount, notes, paidFrom, paymentReference } = req.body || {};

  if (!tenantId || !userId) {
    return res.status(401).json({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const scope = resolveExpenseStoreLocationScope(req);

    const existing = await prisma.expense.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        status: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Expense not found.",
        code: "EXPENSE_NOT_FOUND",
      });
    }

    if (
      scope.mode === "SINGLE_STORE_LOCATION" &&
      scope.branchId &&
      existing.branchId !== scope.branchId
    ) {
      return res.status(403).json({
        message: "You do not have access to this store location.",
        code: "STORE_LOCATION_ACCESS_DENIED",
      });
    }

    if (existing.status === "APPROVED") {
      return res.status(409).json({
        message: "Approved expenses cannot be edited because they are financial records.",
        code: "APPROVED_EXPENSE_CANNOT_BE_EDITED",
      });
    }

    const data = {};

    if (title !== undefined) {
      const cleanTitle = cleanString(title);
      if (!cleanTitle) {
        return res.status(400).json({
          message: "Expense title is required.",
          code: "EXPENSE_TITLE_REQUIRED",
        });
      }
      data.title = cleanTitle;
    }

    if (category !== undefined) {
      const cleanCategory = normalizeExpenseCategory(category);
      if (!cleanCategory) {
        return res.status(400).json({
          message: `Expense category must be one of ${Object.values(ExpenseCategory).join(", ")}.`,
          code: "EXPENSE_CATEGORY_INVALID",
        });
      }
      data.category = cleanCategory;
    }

    if (amount !== undefined) {
      const cleanAmount = toMoneyNumber(amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        return res.status(400).json({
          message: "Expense amount must be a positive number.",
          code: "EXPENSE_AMOUNT_INVALID",
        });
      }
      data.amount = cleanAmount;
    }

    if (paidFrom !== undefined) {
      const cleanPaidFrom = normalizeExpensePaidFrom(paidFrom);
      if (!cleanPaidFrom) {
        return res.status(400).json({
          message: `Paid from must be one of ${EXPENSE_PAID_FROM_VALUES.join(", ")}.`,
          code: "EXPENSE_PAID_FROM_INVALID",
        });
      }
      data.paidFrom = cleanPaidFrom;
    }

    if (paymentReference !== undefined) {
      data.paymentReference = cleanString(paymentReference);
    }

    if (notes !== undefined) {
      data.notes = cleanString(notes);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "No expense changes were provided.",
        code: "EXPENSE_UPDATE_EMPTY",
      });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: expenseInclude(),
    });

    await logAudit({
      tenantId,
      userId,
      action: AuditAction.EXPENSE_CREATED,
      entity: AuditEntity.EXPENSE,
      entityId: id,
      metadata: {
        action: "EXPENSE_UPDATED",
        changedFields: Object.keys(data),
        branchId: existing.branchId || null,
        storeLocationId: existing.branchId || null,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("updateExpense error:", error);
    return handleStoreLocationError(res, error, "Failed to update expense");
  }
}

// APPROVE EXPENSE
async function approveExpense(req, res) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { id } = req.params;

  if (!tenantId || !userId) {
    return res.status(401).json({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const scope = resolveExpenseStoreLocationScope(req);

    const existing = await prisma.expense.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        status: true,
        title: true,
        category: true,
        amount: true,
        paidFrom: true,
        paymentReference: true,
        cashDrawerSessionId: true,
        cashDrawerMovementId: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Expense not found.",
        code: "EXPENSE_NOT_FOUND",
      });
    }

    if (
      scope.mode === "SINGLE_STORE_LOCATION" &&
      scope.branchId &&
      existing.branchId !== scope.branchId
    ) {
      return res.status(403).json({
        message: "You do not have access to this store location.",
        code: "STORE_LOCATION_ACCESS_DENIED",
      });
    }

    if (existing.status === "APPROVED") {
      const approved = await prisma.expense.findFirst({
        where: { id, tenantId },
        include: expenseInclude(),
      });

      return res.json(approved);
    }

    if (!existing.branchId) {
      return res.status(400).json({
        message: "Expense must belong to a store location before approval.",
        code: "EXPENSE_STORE_LOCATION_REQUIRED",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let drawerLink = {};

      if (existing.paidFrom === "CASH_DRAWER") {
        drawerLink = await createExpenseCashDrawerMovement(tx, {
          tenantId,
          branchId: existing.branchId,
          userId,
          expense: existing,
        });
      } else {
        const moneyMethod = moneyMethodFromExpensePaidFrom(existing.paidFrom);

        if (!moneyMethod) {
          throw makeAccessError(
            "EXPENSE_PAYMENT_SOURCE_INVALID",
            "Choose where this expense was paid from.",
            400
          );
        }

        await recordMoneyAccountMovement(tx, {
          tenantId,
          branchId: existing.branchId,
          method: moneyMethod,
          direction: "OUT",
          reason: "OTHER",
          amount: Number(existing.amount || 0),
          sourceType: "Expense",
          sourceId: existing.id,
          note: `Approved expense: ${existing.title || existing.category || existing.id}`,
          createdById: userId,
        });
      }

      await tx.expense.updateMany({
        where: {
          id,
          tenantId,
          status: { not: "APPROVED" },
        },
        data: {
          status: "APPROVED",
          approvedById: userId,
          approvedAt: new Date(),
          ...drawerLink,
        },
      });

      return tx.expense.findFirst({
        where: { id, tenantId },
        include: expenseInclude(),
      });
    });

    await logAudit({
      tenantId,
      userId,
      action: AuditAction.EXPENSE_APPROVED,
      entity: AuditEntity.EXPENSE,
      entityId: id,
      metadata: {
        amount: existing.amount,
        paidFrom: existing.paidFrom,
        paymentReference: existing.paymentReference || null,
        cashDrawerSessionId: updated?.cashDrawerSessionId || null,
        cashDrawerMovementId: updated?.cashDrawerMovementId || null,
        storeLocationId: existing.branchId || null,
        branchId: existing.branchId || null,
      },
    });

    return res.json(updated);
  } catch (error) {
    const moneyHandled = handleMoneyAccountError(res, error);
    if (moneyHandled) return moneyHandled;

    console.error("approveExpense error:", error);
    return handleStoreLocationError(res, error, "Failed to approve expense");
  }
}

// DELETE EXPENSE
async function deleteExpense(req, res) {
  const tenantId = getTenantId(req);
  const userId = getUserId(req);
  const { id } = req.params;

  if (!tenantId || !userId) {
    return res.status(401).json({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const scope = resolveExpenseStoreLocationScope(req);

    const existing = await prisma.expense.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        status: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: "Expense not found.",
        code: "EXPENSE_NOT_FOUND",
      });
    }

    if (
      scope.mode === "SINGLE_STORE_LOCATION" &&
      scope.branchId &&
      existing.branchId !== scope.branchId
    ) {
      return res.status(403).json({
        message: "You do not have access to this store location.",
        code: "STORE_LOCATION_ACCESS_DENIED",
      });
    }

    if (existing.status === "APPROVED") {
      return res.status(409).json({
        message: "Approved expenses cannot be deleted because they are financial records.",
        code: "APPROVED_EXPENSE_CANNOT_BE_DELETED",
      });
    }

    const result = await prisma.expense.deleteMany({
      where: {
        id,
        tenantId,
        status: { not: "APPROVED" },
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        message: "Expense not found or cannot be deleted.",
        code: "EXPENSE_NOT_FOUND_OR_NOT_DELETABLE",
      });
    }

    await logAudit({
      tenantId,
      userId,
      action: AuditAction.EXPENSE_DELETED,
      entity: AuditEntity.EXPENSE,
      entityId: id,
      metadata: {
        storeLocationId: existing.branchId || null,
        branchId: existing.branchId || null,
      },
    });

    return res.json({
      message: "Expense deleted successfully.",
      code: "EXPENSE_DELETED",
    });
  } catch (error) {
    console.error("deleteExpense error:", error);
    return handleStoreLocationError(res, error, "Failed to delete expense");
  }
}

module.exports = {
  createExpense,
  listExpenses,
  updateExpense,
  approveExpense,
  deleteExpense,
};

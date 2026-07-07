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

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMoneyAccountType(method) {
  const value = String(method || "").trim().toUpperCase();

  if (value === "CARD") return "OTHER";
  if (MONEY_ACCOUNT_TYPES.has(value)) return value;

  return null;
}

function methodLabel(method) {
  const accountType = normalizeMoneyAccountType(method);

  if (method === "CASH") return "Cash drawer";
  if (accountType === "MOMO") return "MoMo";
  if (accountType === "BANK") return "Bank";
  if (accountType === "OTHER") return "Other money";

  return "Selected money account";
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

async function recordMoneyAccountMovement(tx, {
  tenantId,
  branchId,
  method,
  direction,
  reason = "OTHER",
  amount,
  sourceType,
  sourceId,
  note,
  createdById,
  allowNegative = false,
}) {
  const accountType = normalizeMoneyAccountType(method);

  if (!accountType) {
    return null;
  }

  const movementAmount = safeNumber(amount);

  if (movementAmount <= 0) {
    return null;
  }

  const accounts = await ensureMoneyAccounts(tx, tenantId, branchId || null);
  const account = accounts.find((item) => item.accountType === accountType);

  if (!account) {
    const error = new Error("MONEY_ACCOUNT_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  const currentBalance = safeNumber(account.balance);
  const normalizedDirection = String(direction || "").trim().toUpperCase();

  if (!["IN", "OUT"].includes(normalizedDirection)) {
    const error = new Error("INVALID_MONEY_DIRECTION");
    error.status = 400;
    throw error;
  }

  const nextBalance =
    normalizedDirection === "IN"
      ? currentBalance + movementAmount
      : currentBalance - movementAmount;

  if (!allowNegative && nextBalance < 0) {
    const error = new Error("INSUFFICIENT_MONEY");
    error.status = 400;
    error.method = accountType;
    error.available = currentBalance;
    throw error;
  }

  const updated = await tx.moneyAccount.update({
    where: { id: account.id },
    data: {
      balance: nextBalance,
    },
  });

  const movement = await tx.moneyAccountMovement.create({
    data: {
      tenantId,
      branchId: branchId || null,
      accountId: account.id,
      direction: normalizedDirection,
      reason,
      amount: movementAmount,
      balanceBefore: currentBalance,
      balanceAfter: nextBalance,
      sourceType: cleanString(sourceType),
      sourceId: cleanString(sourceId),
      note: cleanString(note),
      createdById: cleanString(createdById),
    },
  });

  return {
    account: updated,
    movement,
  };
}

function handleMoneyAccountError(res, err) {
  if (err?.message === "INSUFFICIENT_MONEY") {
    return res.status(400).json({
      message: `${methodLabel(err.method)} does not have enough money for this action.`,
      code: "INSUFFICIENT_MONEY",
      method: err.method,
      available: err.available || 0,
    });
  }

  if (err?.message === "MONEY_ACCOUNT_NOT_FOUND") {
    return res.status(404).json({
      message: "Money account was not found.",
      code: "MONEY_ACCOUNT_NOT_FOUND",
    });
  }

  if (err?.message === "INVALID_MONEY_DIRECTION") {
    return res.status(400).json({
      message: "Money movement direction is invalid.",
      code: "INVALID_MONEY_DIRECTION",
    });
  }

  return null;
}

module.exports = {
  ACCOUNT_LABELS,
  ensureMoneyAccounts,
  handleMoneyAccountError,
  methodLabel,
  normalizeMoneyAccountType,
  recordMoneyAccountMovement,
};

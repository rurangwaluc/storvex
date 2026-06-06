import { apiFetch, getActiveBranchId } from "./apiClient";

const CASH_DRAWER_BASE = "/cash-drawer";

export const CASH_MOVEMENT_TYPES = {
  IN: "IN",
  OUT: "OUT",
};

export const CASH_MOVEMENT_REASONS = {
  FLOAT: "FLOAT",
  WITHDRAWAL: "WITHDRAWAL",
  DEPOSIT: "DEPOSIT",
  EXPENSE: "EXPENSE",
  OTHER: "OTHER",
};

export const CASH_OPENING_REASONS = {
  NORMAL_FLOAT: "NORMAL_FLOAT",
  OWNER_ADDED_STARTING_CASH: "OWNER_ADDED_STARTING_CASH",
  CASH_LEFT_FROM_PREVIOUS_DAY: "CASH_LEFT_FROM_PREVIOUS_DAY",
  CHANGE_MONEY_PREPARED: "CHANGE_MONEY_PREPARED",
  CORRECTION_FROM_PREVIOUS_DRAWER: "CORRECTION_FROM_PREVIOUS_DRAWER",
  OTHER_OPENING_REASON: "OTHER_OPENING_REASON",
};

export const CASH_SHORT_REASONS = {
  CUSTOMER_PAID_LESS_CASH: "CUSTOMER_PAID_LESS_CASH",
  CHANGE_SHORTAGE: "CHANGE_SHORTAGE",
  CASH_REMOVED_NOT_RECORDED: "CASH_REMOVED_NOT_RECORDED",
  EXPENSE_PAID_NOT_RECORDED: "EXPENSE_PAID_NOT_RECORDED",
  COUNTING_MISTAKE: "COUNTING_MISTAKE",
  OTHER_SHORT_CASH_REASON: "OTHER_SHORT_CASH_REASON",
};

export const CASH_OVER_REASONS = {
  CUSTOMER_PAID_EXTRA_CASH: "CUSTOMER_PAID_EXTRA_CASH",
  CASH_SALE_NOT_RECORDED: "CASH_SALE_NOT_RECORDED",
  CASH_ADDED_NOT_RECORDED: "CASH_ADDED_NOT_RECORDED",
  CHANGE_NOT_GIVEN: "CHANGE_NOT_GIVEN",
  COUNTING_MISTAKE: "COUNTING_MISTAKE",
  OTHER_OVER_CASH_REASON: "OTHER_OVER_CASH_REASON",
};

export const CASH_MOVEMENT_TYPE_OPTIONS = [
  {
    value: CASH_MOVEMENT_TYPES.IN,
    label: "Money in",
    description: "Cash added to the active branch drawer.",
  },
  {
    value: CASH_MOVEMENT_TYPES.OUT,
    label: "Money out",
    description: "Cash removed from the active branch drawer.",
  },
];

export const CASH_MOVEMENT_REASON_OPTIONS = [
  {
    value: CASH_MOVEMENT_REASONS.FLOAT,
    label: "Opening float",
    description: "Cash added as working float.",
  },
  {
    value: CASH_MOVEMENT_REASONS.DEPOSIT,
    label: "Deposit",
    description: "Cash received or deposited into the drawer.",
  },
  {
    value: CASH_MOVEMENT_REASONS.WITHDRAWAL,
    label: "Withdrawal",
    description: "Cash removed from the drawer.",
  },
  {
    value: CASH_MOVEMENT_REASONS.EXPENSE,
    label: "Expense",
    description: "Cash used for an operating expense.",
  },
  {
    value: CASH_MOVEMENT_REASONS.OTHER,
    label: "Other",
    description: "Other manual cash movement.",
  },
];

export const CASH_OPENING_REASON_OPTIONS = [
  {
    value: CASH_OPENING_REASONS.NORMAL_FLOAT,
    label: "Normal starting cash",
    description: "The drawer starts with the usual daily cash float.",
  },
  {
    value: CASH_OPENING_REASONS.OWNER_ADDED_STARTING_CASH,
    label: "Owner added starting cash",
    description: "The owner added cash before sales started.",
  },
  {
    value: CASH_OPENING_REASONS.CASH_LEFT_FROM_PREVIOUS_DAY,
    label: "Cash left from previous day",
    description: "Some cash was intentionally left in the drawer after the last close.",
  },
  {
    value: CASH_OPENING_REASONS.CHANGE_MONEY_PREPARED,
    label: "Change money prepared",
    description: "Cash was prepared to give customers change.",
  },
  {
    value: CASH_OPENING_REASONS.CORRECTION_FROM_PREVIOUS_DRAWER,
    label: "Correction from previous drawer",
    description: "The drawer is being opened with a correction from a previous session.",
  },
  {
    value: CASH_OPENING_REASONS.OTHER_OPENING_REASON,
    label: "Other opening reason",
    description: "Use when the reason does not fit the other options.",
  },
];

export const CASH_SHORT_REASON_OPTIONS = [
  {
    value: CASH_SHORT_REASONS.CUSTOMER_PAID_LESS_CASH,
    label: "Customer paid less cash",
    description: "A customer gave less physical cash than expected.",
  },
  {
    value: CASH_SHORT_REASONS.CHANGE_SHORTAGE,
    label: "Change shortage",
    description: "Cash was short because of change handling.",
  },
  {
    value: CASH_SHORT_REASONS.CASH_REMOVED_NOT_RECORDED,
    label: "Cash removed but not recorded",
    description: "Cash left the drawer without a recorded money-out entry.",
  },
  {
    value: CASH_SHORT_REASONS.EXPENSE_PAID_NOT_RECORDED,
    label: "Expense paid but not recorded",
    description: "Cash was used for an expense that was not entered.",
  },
  {
    value: CASH_SHORT_REASONS.COUNTING_MISTAKE,
    label: "Counting mistake",
    description: "The difference may be caused by a counting mistake.",
  },
  {
    value: CASH_SHORT_REASONS.OTHER_SHORT_CASH_REASON,
    label: "Other short cash reason",
    description: "Use when none of the short-cash reasons fit.",
  },
];

export const CASH_OVER_REASON_OPTIONS = [
  {
    value: CASH_OVER_REASONS.CUSTOMER_PAID_EXTRA_CASH,
    label: "Customer paid extra cash",
    description: "A customer gave more cash than expected.",
  },
  {
    value: CASH_OVER_REASONS.CASH_SALE_NOT_RECORDED,
    label: "Cash sale not recorded",
    description: "Cash exists in the drawer but the sale may not have been recorded.",
  },
  {
    value: CASH_OVER_REASONS.CASH_ADDED_NOT_RECORDED,
    label: "Cash added but not recorded",
    description: "Cash was added without a recorded money-in entry.",
  },
  {
    value: CASH_OVER_REASONS.CHANGE_NOT_GIVEN,
    label: "Change not given",
    description: "Extra cash may exist because change was not given correctly.",
  },
  {
    value: CASH_OVER_REASONS.COUNTING_MISTAKE,
    label: "Counting mistake",
    description: "The difference may be caused by a counting mistake.",
  },
  {
    value: CASH_OVER_REASONS.OTHER_OVER_CASH_REASON,
    label: "Other over cash reason",
    description: "Use when none of the over-cash reasons fit.",
  },
];

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function cleanObject(obj) {
  const out = {};

  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }

  return out;
}

function withBranchOptions(options = {}) {
  const branchId =
    cleanString(options.branchId) ||
    cleanString(options.activeBranchId) ||
    cleanString(getActiveBranchId());

  return {
    ...options,
    branchId,
  };
}

function normalizeAmount(value, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return fallback;

  return Math.round(n);
}

function normalizePositiveAmount(value, fallback = 0) {
  const n = normalizeAmount(value, fallback);
  return n > 0 ? n : fallback;
}

function normalizeMovementType(value) {
  const v = cleanString(value).toUpperCase();

  if (v === CASH_MOVEMENT_TYPES.IN) return CASH_MOVEMENT_TYPES.IN;
  if (v === CASH_MOVEMENT_TYPES.OUT) return CASH_MOVEMENT_TYPES.OUT;

  return "";
}

function normalizeMovementReason(value, type) {
  const v = cleanString(value).toUpperCase();

  if (Object.values(CASH_MOVEMENT_REASONS).includes(v)) return v;

  if (type === CASH_MOVEMENT_TYPES.IN) return CASH_MOVEMENT_REASONS.DEPOSIT;
  if (type === CASH_MOVEMENT_TYPES.OUT) return CASH_MOVEMENT_REASONS.WITHDRAWAL;

  return CASH_MOVEMENT_REASONS.OTHER;
}

function normalizeOpeningReason(value) {
  const v = cleanString(value).toUpperCase();

  if (Object.values(CASH_OPENING_REASONS).includes(v)) return v;

  return CASH_OPENING_REASONS.NORMAL_FLOAT;
}

function normalizeShortReason(value) {
  const v = cleanString(value).toUpperCase();

  if (Object.values(CASH_SHORT_REASONS).includes(v)) return v;

  return "";
}

function normalizeOverReason(value) {
  const v = cleanString(value).toUpperCase();

  if (Object.values(CASH_OVER_REASONS).includes(v)) return v;

  return "";
}

function normalizeClosingReason(value, difference = 0) {
  const diff = Number(difference || 0);

  if (diff < 0) return normalizeShortReason(value);
  if (diff > 0) return normalizeOverReason(value);

  return "";
}

function normalizeOpenDrawerPayload(payload = {}) {
  return cleanObject({
    openingCash: normalizeAmount(
      payload.openingCash ?? payload.openingBalance ?? payload.openingAmount ?? payload.amount,
      0,
    ),
    openingAmount: normalizeAmount(
      payload.openingCash ?? payload.openingBalance ?? payload.openingAmount ?? payload.amount,
      0,
    ),
    openingReason: normalizeOpeningReason(payload.openingReason ?? payload.reason),
    openingNote: cleanString(payload.openingNote ?? payload.note),
    note: cleanString(payload.openingNote ?? payload.note),
  });
}

function normalizeCloseDrawerPayload(payload = {}) {
  const countedCash = normalizeAmount(
    payload.countedCash ?? payload.closingCash ?? payload.closingBalance,
    0,
  );

  const expectedCash = Number(payload.expectedCash ?? payload.expectedCashAtClose ?? 0);
  const difference = countedCash - (Number.isFinite(expectedCash) ? expectedCash : 0);
  const closingReason = normalizeClosingReason(
    payload.closingReason ?? payload.differenceReason ?? payload.reason,
    difference,
  );
  const closingExplanation = cleanString(
    payload.closingExplanation ?? payload.differenceExplanation ?? payload.explanation,
  );

  return cleanObject({
    countedCash,
    countedAmount: countedCash,
    closingReason,
    differenceReason: closingReason,
    closingExplanation,
    differenceExplanation: closingExplanation,
    closeNote: cleanString(payload.closeNote ?? payload.note),
    note: cleanString(payload.closeNote ?? payload.note ?? closingExplanation),
  });
}

function normalizeMovementPayload(payload = {}) {
  const type = normalizeMovementType(payload.type);
  const reason = normalizeMovementReason(payload.reason, type);

  return cleanObject({
    type,
    reason,
    amount: normalizePositiveAmount(payload.amount, 0),
    note: cleanString(payload.note),
  });
}

function buildMovementsQuery(params = {}) {
  return cleanObject({
    limit: params.limit,
    branchId: cleanString(params.branchId),
  });
}

function buildSessionsQuery(params = {}) {
  return cleanObject({
    limit: params.limit,
    branchId: cleanString(params.branchId),
  });
}

/**
 * Get active branch drawer status.
 *
 * Backend returns:
 * {
 *   branch,
 *   settings: { blockCashSales },
 *   openSession,
 *   latestSession,
 *   canReopenSameDay
 * }
 */
export function getCashDrawerStatus(params = {}, options = {}) {
  return apiFetch(`${CASH_DRAWER_BASE}/status`, {
    method: "GET",
    query: cleanObject({
      branchId: cleanString(params.branchId),
    }),
    ...withBranchOptions(options),
  });
}

/**
 * List recent drawer sessions for the active branch.
 */
export function getCashDrawerSessions(params = {}, options = {}) {
  return apiFetch(`${CASH_DRAWER_BASE}/sessions`, {
    method: "GET",
    query: buildSessionsQuery(params),
    ...withBranchOptions(options),
  });
}

export function listCashDrawerSessions(params = {}, options = {}) {
  return getCashDrawerSessions(params, options);
}

/**
 * Get one drawer session with its movements.
 */
export function getCashDrawerSession(sessionId, params = {}, options = {}) {
  const safeSessionId = encodeURIComponent(cleanString(sessionId));

  if (!safeSessionId) {
    return Promise.reject(new Error("Cash drawer session is required"));
  }

  return apiFetch(`${CASH_DRAWER_BASE}/sessions/${safeSessionId}`, {
    method: "GET",
    query: cleanObject({
      branchId: cleanString(params.branchId),
    }),
    ...withBranchOptions(options),
  });
}

/**
 * Open drawer for active branch.
 */
export function openCashDrawer(payload = {}, options = {}) {
  const body = normalizeOpenDrawerPayload(payload);

  if (!body.openingReason) {
    return Promise.reject(new Error("Choose why the drawer is starting with this cash."));
  }

  return apiFetch(`${CASH_DRAWER_BASE}/open`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

/**
 * Close drawer for active branch.
 */
export function closeCashDrawer(payload = {}, options = {}) {
  const body = normalizeCloseDrawerPayload(payload);
  const countedCash = Number(body.countedCash || 0);
  const expectedCash = Number(payload.expectedCash ?? payload.expectedCashAtClose ?? 0);
  const difference = countedCash - (Number.isFinite(expectedCash) ? expectedCash : 0);

  if (difference !== 0 && !body.closingReason) {
    return Promise.reject(
      new Error(
        difference < 0
          ? "Choose why counted cash is below expected cash."
          : "Choose why counted cash is above expected cash.",
      ),
    );
  }

  if (difference !== 0 && !body.closingExplanation) {
    return Promise.reject(new Error("Explain the cash difference before closing the drawer."));
  }

  return apiFetch(`${CASH_DRAWER_BASE}/close`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

/**
 * Get manual movements for the active branch open session.
 */
export function getCashDrawerMovements(params = {}, options = {}) {
  return apiFetch(`${CASH_DRAWER_BASE}/movements`, {
    method: "GET",
    query: buildMovementsQuery(params),
    ...withBranchOptions(options),
  });
}

export function listCashMovements(params = {}, options = {}) {
  return getCashDrawerMovements(params, options);
}

/**
 * Record manual cash movement.
 */
export function recordCashDrawerMovement(payload = {}, options = {}) {
  const body = normalizeMovementPayload(payload);

  if (!body.type) {
    return Promise.reject(new Error("Movement type must be IN or OUT"));
  }

  if (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
    return Promise.reject(new Error("Movement amount must be greater than 0"));
  }

  return apiFetch(`${CASH_DRAWER_BASE}/movements`, {
    method: "POST",
    body,
    ...withBranchOptions(options),
  });
}

export function isDrawerOpen(statusPayload) {
  return Boolean(statusPayload?.openSession?.id);
}

export function drawerBlocksCashSales(statusPayload) {
  return Boolean(statusPayload?.settings?.blockCashSales);
}

export function getOpenSessionId(statusPayload) {
  return cleanString(statusPayload?.openSession?.id);
}

export function getDrawerBranchId(statusPayload) {
  return (
    cleanString(statusPayload?.openSession?.branchId) ||
    cleanString(statusPayload?.branch?.id)
  );
}

export function getMovementTypeLabel(type) {
  const normalized = normalizeMovementType(type);
  const found = CASH_MOVEMENT_TYPE_OPTIONS.find((option) => option.value === normalized);

  return found?.label || cleanString(type) || "Unknown";
}

export function getMovementReasonLabel(reason) {
  const normalized = cleanString(reason).toUpperCase();
  const found = CASH_MOVEMENT_REASON_OPTIONS.find((option) => option.value === normalized);

  return found?.label || cleanString(reason) || "Unknown";
}

export function getOpeningReasonLabel(reason) {
  const normalized = cleanString(reason).toUpperCase();
  const found = CASH_OPENING_REASON_OPTIONS.find((option) => option.value === normalized);

  return found?.label || cleanString(reason) || "Unknown";
}

export function getClosingReasonLabel(reason, tone) {
  const normalized = cleanString(reason).toUpperCase();

  const source =
    tone === "SHORT"
      ? CASH_SHORT_REASON_OPTIONS
      : tone === "OVER"
        ? CASH_OVER_REASON_OPTIONS
        : [...CASH_SHORT_REASON_OPTIONS, ...CASH_OVER_REASON_OPTIONS];

  const found = source.find((option) => option.value === normalized);

  return found?.label || cleanString(reason) || "Not needed";
}

export function createCashMovement(payload = {}, options = {}) {
  return recordCashDrawerMovement(payload, options);
}

export const cashDrawerApi = {
  CASH_MOVEMENT_TYPES,
  CASH_MOVEMENT_REASONS,
  CASH_OPENING_REASONS,
  CASH_SHORT_REASONS,
  CASH_OVER_REASONS,

  CASH_MOVEMENT_TYPE_OPTIONS,
  CASH_MOVEMENT_REASON_OPTIONS,
  CASH_OPENING_REASON_OPTIONS,
  CASH_SHORT_REASON_OPTIONS,
  CASH_OVER_REASON_OPTIONS,

  getCashDrawerStatus,
  getCashDrawerSessions,
  listCashDrawerSessions,
  getCashDrawerSession,
  openCashDrawer,
  closeCashDrawer,
  getCashDrawerMovements,
  listCashMovements,
  recordCashDrawerMovement,
  createCashMovement,

  isDrawerOpen,
  drawerBlocksCashSales,
  getOpenSessionId,
  getDrawerBranchId,
  getMovementTypeLabel,
  getMovementReasonLabel,
  getOpeningReasonLabel,
  getClosingReasonLabel,
};

export default cashDrawerApi;
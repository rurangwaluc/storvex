export const STOCK_ADJUSTMENT_REASONS = {
  RESTOCK: [
    {
      value: "SUPPLIER_DELIVERY",
      label: "Supplier delivery",
    },
    {
      value: "CUSTOMER_RETURN",
      label: "Customer return",
    },
    {
      value: "BRANCH_TRANSFER_RECEIVED",
      label: "Branch transfer received",
    },
    {
      value: "OPENING_STOCK",
      label: "Opening stock",
    },
    {
      value: "FOUND_STOCK",
      label: "Stock found",
    },
    {
      value: "OTHER",
      label: "Other reason",
    },
  ],

  LOSS: [
    {
      value: "DAMAGED",
      label: "Damaged",
    },
    {
      value: "MISSING",
      label: "Missing",
    },
    {
      value: "STOLEN",
      label: "Stolen",
    },
    {
      value: "EXPIRED",
      label: "Expired",
    },
    {
      value: "INTERNAL_USE",
      label: "Used inside the business",
    },
    {
      value: "RETURNED_UNSELLABLE",
      label: "Unsellable customer return",
    },
    {
      value: "OTHER",
      label: "Other reason",
    },
  ],

  CORRECTION: [
    {
      value: "PHYSICAL_COUNT",
      label: "Physical stock count",
    },
    {
      value: "PREVIOUS_ENTRY_ERROR",
      label: "Previous entry mistake",
    },
    {
      value: "MISSED_MOVEMENT",
      label: "Missed stock movement",
    },
    {
      value: "DUPLICATE_MOVEMENT",
      label: "Duplicate stock movement",
    },
    {
      value: "WRONG_BRANCH_ALLOCATION",
      label: "Wrong branch allocation",
    },
    {
      value: "OTHER",
      label: "Other reason",
    },
  ],
};

export function stockAdjustmentReasons(type) {
  const normalized = String(type || "")
    .trim()
    .toUpperCase();

  return (
    STOCK_ADJUSTMENT_REASONS[normalized] ||
    []
  );
}

export function defaultStockAdjustmentReason(type) {
  return (
    stockAdjustmentReasons(type)[0]?.value ||
    ""
  );
}

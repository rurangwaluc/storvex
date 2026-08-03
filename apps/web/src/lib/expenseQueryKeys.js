function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export const expenseQueryKeys = {
  all: ["expenses"],

  lists: () => [
    ...expenseQueryKeys.all,
    "list",
  ],

  currentList: (branchId) => [
    ...expenseQueryKeys.lists(),
    "current",
    cleanKeyPart(branchId),
  ],

  allLocationsList: () => [
    ...expenseQueryKeys.lists(),
    "all-locations",
  ],

  list: (scopeMode, branchId) =>
    String(scopeMode || "CURRENT").toUpperCase() === "ALL"
      ? expenseQueryKeys.allLocationsList()
      : expenseQueryKeys.currentList(branchId),
};

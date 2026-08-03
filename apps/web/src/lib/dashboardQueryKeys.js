function cleanKeyPart(value, fallback = "default") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

export const dashboardQueryKeys = {
  all: ["tenant-dashboard"],

  summaries: () => [
    ...dashboardQueryKeys.all,
  ],

  summary: (branchId) => [
    ...dashboardQueryKeys.all,
    cleanKeyPart(branchId),
  ],
};

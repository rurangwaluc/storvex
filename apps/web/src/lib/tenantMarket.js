export function tenantMarketFromWorkspace(workspace) {
  const tenant = workspace?.tenant || workspace?.user?.tenant || null;
  if (!tenant) return null;

  return {
    countryCode: tenant.countryCode || "RW",
    currencyCode: tenant.currencyCode || "RWF",
    timezone: tenant.timezone || "Africa/Kigali",
  };
}

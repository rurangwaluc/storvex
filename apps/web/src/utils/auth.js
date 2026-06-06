export function getTenantRole() {
  const token = localStorage.getItem("tenantToken");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role;
  } catch {
    return null;
  }
}

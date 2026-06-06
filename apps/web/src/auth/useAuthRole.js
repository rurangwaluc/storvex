import { jwtDecode } from "jwt-decode";

export function useAuthRole() {
  const token = localStorage.getItem("tenantToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded.role?.toUpperCase() || null;
  } catch {
    return null;
  }
}

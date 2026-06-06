const KEYS = {
  theme: "storvex-theme",
  tenantToken: "tenantToken",
};

export const storage = {
  getTheme() {
    return localStorage.getItem(KEYS.theme);
  },
  setTheme(value) {
    localStorage.setItem(KEYS.theme, value);
  },
  getTenantToken() {
    return localStorage.getItem(KEYS.tenantToken);
  },
  setTenantToken(value) {
    localStorage.setItem(KEYS.tenantToken, value);
  },
  clearTenantToken() {
    localStorage.removeItem(KEYS.tenantToken);
  },
};
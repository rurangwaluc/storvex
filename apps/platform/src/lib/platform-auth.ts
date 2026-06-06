export type PlatformUserRole =
  | "PLATFORM_OWNER"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT";

export type PlatformAuthUser = {
  id: string;
  name: string;
  email: string;
  role: PlatformUserRole | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type PlatformAuthSession = {
  token: string;
  platformUser: PlatformAuthUser;
};

const PLATFORM_SESSION_KEY = "storvex.platform.session";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getStoredPlatformSession(): PlatformAuthSession | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(PLATFORM_SESSION_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PlatformAuthSession>;

    if (!parsed?.token || !parsed?.platformUser?.id) {
      clearPlatformSession();
      return null;
    }

    return {
      token: String(parsed.token),
      platformUser: {
        id: String(parsed.platformUser.id),
        name: String(parsed.platformUser.name || ""),
        email: String(parsed.platformUser.email || ""),
        role: String(parsed.platformUser.role || ""),
        isActive: parsed.platformUser.isActive,
        createdAt: parsed.platformUser.createdAt,
        updatedAt: parsed.platformUser.updatedAt,
        lastLoginAt: parsed.platformUser.lastLoginAt ?? null,
      },
    };
  } catch {
    clearPlatformSession();
    return null;
  }
}

export function savePlatformSession(session: PlatformAuthSession) {
  if (!isBrowser()) return;

  window.localStorage.setItem(PLATFORM_SESSION_KEY, JSON.stringify(session));
}

/**
 * Compatibility alias.
 * Use this when a file imports storePlatformSession.
 */
export function storePlatformSession(session: PlatformAuthSession) {
  savePlatformSession(session);
}

export function clearPlatformSession() {
  if (!isBrowser()) return;

  window.localStorage.removeItem(PLATFORM_SESSION_KEY);
}

export function hasPlatformSession() {
  return Boolean(getStoredPlatformSession()?.token);
}

export function getPlatformAuthHeader() {
  const session = getStoredPlatformSession();

  if (!session?.token) return {};

  return {
    Authorization: `Bearer ${session.token}`,
  };
}
export const TENANT_SESSION_COOKIE_NAME =
  "__Host-storvex_session";

export const TENANT_SESSION_MAX_AGE_SECONDS =
  8 * 60 * 60;

const MAX_COOKIE_HEADER_LENGTH = 16 * 1024;
const MAX_SESSION_TOKEN_LENGTH = 8 * 1024;

const JWT_PATTERN =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function normalizeSessionToken(value) {
  const token = String(value || "").trim();

  if (
    !token ||
    token.length > MAX_SESSION_TOKEN_LENGTH ||
    /[\u0000-\u001F\u007F]/.test(token) ||
    !JWT_PATTERN.test(token)
  ) {
    return null;
  }

  return token;
}

function normalizeMaxAgeSeconds(value) {
  const maxAge = Number(value);

  if (
    !Number.isInteger(maxAge) ||
    maxAge <= 0 ||
    maxAge > TENANT_SESSION_MAX_AGE_SECONDS
  ) {
    return null;
  }

  return maxAge;
}

export function readTenantSessionToken(
  cookieHeader,
) {
  const header = String(cookieHeader || "");

  if (
    !header ||
    header.length > MAX_COOKIE_HEADER_LENGTH ||
    header.includes("\r") ||
    header.includes("\n")
  ) {
    return null;
  }

  let found = null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator <= 0) continue;

    const name = part
      .slice(0, separator)
      .trim();

    if (name !== TENANT_SESSION_COOKIE_NAME) {
      continue;
    }

    if (found !== null) {
      return null;
    }

    const token = normalizeSessionToken(
      part.slice(separator + 1),
    );

    if (!token) {
      return null;
    }

    found = token;
  }

  return found;
}

export function bearerAuthorizationFromTenantSession(
  cookieHeader,
) {
  const token =
    readTenantSessionToken(cookieHeader);

  return token
    ? `Bearer ${token}`
    : null;
}

export function serializeTenantSessionCookie(
  token,
  {
    maxAgeSeconds =
      TENANT_SESSION_MAX_AGE_SECONDS,
  } = {},
) {
  const cleanToken =
    normalizeSessionToken(token);

  const maxAge =
    normalizeMaxAgeSeconds(
      maxAgeSeconds,
    );

  if (!cleanToken) {
    throw new TypeError(
      "Invalid tenant session token",
    );
  }

  if (!maxAge) {
    throw new TypeError(
      "Invalid tenant session cookie lifetime",
    );
  }

  return [
    `${TENANT_SESSION_COOKIE_NAME}=${cleanToken}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export function serializeClearTenantSessionCookie() {
  return [
    `${TENANT_SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

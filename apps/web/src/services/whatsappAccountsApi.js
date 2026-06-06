import { apiFetch } from "./apiClient";

/**
 * WhatsApp accounts / channel settings API
 *
 * Backend routes in use:
 * - GET    /whatsapp/accounts
 * - POST   /whatsapp/accounts
 * - PATCH  /whatsapp/accounts/:id
 *
 * Response contract currently expected from backend:
 * - listAccounts      -> { accounts: [...] }
 * - createAccount     -> { account: {...} }
 * - updateAccount     -> { account: {...} }
 */

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function normalizeNullableString(value) {
  const s = trimString(value);
  return s || null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  return Boolean(value);
}

function normalizeAccount(raw) {
  const item = ensureObject(raw);

  return {
    id: trimString(item.id),
    tenantId: trimString(item.tenantId),
    phoneNumber: trimString(item.phoneNumber),
    businessName: trimString(item.businessName),
    phoneNumberId: trimString(item.phoneNumberId),
    wabaId: trimString(item.wabaId),
    webhookVerifyToken: trimString(item.webhookVerifyToken),
    appSecret: trimString(item.appSecret),
    hasAccessToken: normalizeBoolean(item.hasAccessToken, false),
    isActive: normalizeBoolean(item.isActive, false),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function buildAccountPayload(payload = {}, { partial = false } = {}) {
  const body = ensureObject(payload);

  const built = {};

  if (!partial || Object.prototype.hasOwnProperty.call(body, "phoneNumber")) {
    built.phoneNumber = normalizeNullableString(body.phoneNumber);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "businessName")) {
    built.businessName = normalizeNullableString(body.businessName);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "phoneNumberId")) {
    built.phoneNumberId = normalizeNullableString(body.phoneNumberId);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "wabaId")) {
    built.wabaId = normalizeNullableString(body.wabaId);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "accessToken")) {
    built.accessToken = normalizeNullableString(body.accessToken);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "webhookVerifyToken")) {
    built.webhookVerifyToken = normalizeNullableString(body.webhookVerifyToken);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "appSecret")) {
    built.appSecret = normalizeNullableString(body.appSecret);
  }

  if (!partial || Object.prototype.hasOwnProperty.call(body, "isActive")) {
    built.isActive = normalizeBoolean(body.isActive, false);
  }

  return built;
}

/**
 * List WhatsApp accounts for the current tenant.
 */
export async function listWhatsAppAccounts() {
  const data = await apiFetch("/whatsapp/accounts");

  return {
    accounts: ensureArray(data?.accounts).map(normalizeAccount),
  };
}

/**
 * Resolve a single account from the list.
 * We do not invent a GET /whatsapp/accounts/:id route that does not exist yet.
 */
export async function getWhatsAppAccount(accountId) {
  const id = trimString(accountId);

  if (!id) {
    return { account: null };
  }

  const data = await listWhatsAppAccounts();
  const account =
    ensureArray(data?.accounts).find((item) => String(item?.id || "") === id) || null;

  return { account };
}

/**
 * Create a WhatsApp account / channel.
 */
export async function createWhatsAppAccount(payload) {
  const body = buildAccountPayload(payload, { partial: false });

  const data = await apiFetch("/whatsapp/accounts", {
    method: "POST",
    body,
  });

  return {
    account: data?.account ? normalizeAccount(data.account) : null,
  };
}

/**
 * Update an existing WhatsApp account / channel.
 */
export async function updateWhatsAppAccount(accountId, payload) {
  const id = trimString(accountId);
  const body = buildAccountPayload(payload, { partial: true });

  const data = await apiFetch(`/whatsapp/accounts/${id}`, {
    method: "PATCH",
    body,
  });

  return {
    account: data?.account ? normalizeAccount(data.account) : null,
  };
}
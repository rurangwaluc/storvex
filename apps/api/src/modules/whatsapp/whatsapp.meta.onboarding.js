"use strict";

const axios = require("axios");

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v24.0";
const GRAPH_ROOT = "https://graph.facebook.com";

function metaError(code, status = 502) {
  const error = new Error(code);
  error.code = code;
  error.status = status;
  return error;
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw metaError("WHATSAPP_META_NOT_CONFIGURED", 503);
  return value;
}

function cleanId(value) {
  const id = String(value || "").trim();
  return /^\d+$/.test(id) ? id : "";
}

function graphUrl(path) {
  return `${GRAPH_ROOT}/${API_VERSION}/${String(path || "").replace(/^\/+/, "")}`;
}

function authHeaders(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

function normalizeProviderFailure(error, fallbackCode) {
  if (error?.code && String(error.code).startsWith("WHATSAPP_")) return error;
  const status = Number(error?.response?.status || 502);
  return metaError(fallbackCode, status >= 400 && status < 500 ? 400 : 502);
}

function validateEmbeddedSignupRedirectUri(value) {
  const raw = String(value || "").trim();
  if (!raw) throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "staticxx.facebook.com" ||
    parsed.pathname !== "/x/connect/xd_arbiter/"
  ) {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const domain = fragment.get("domain");
  const origin = fragment.get("origin");

  if (domain !== "www.storvex.rw") {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  if (!origin) {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  let decodedOrigin;
  try {
    decodedOrigin = decodeURIComponent(origin);
  } catch {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(decodedOrigin);
  } catch {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  if (
    parsedOrigin.protocol !== "https:" ||
    parsedOrigin.hostname !== "www.storvex.rw"
  ) {
    throw metaError("WHATSAPP_META_REDIRECT_URI_INVALID", 400);
  }

  return raw;
}

async function exchangeCode(code, redirectUri, http = axios) {
  const validatedRedirectUri = validateEmbeddedSignupRedirectUri(redirectUri);

  try {
    const response = await http.get(`${GRAPH_ROOT}/${API_VERSION}/oauth/access_token`, {
      params: {
        client_id: requiredEnv("WHATSAPP_META_APP_ID"),
        client_secret: requiredEnv("WHATSAPP_APP_SECRET"),
        redirect_uri: validatedRedirectUri,
        code,
      },
    });

    const token = String(response?.data?.access_token || "").trim();

    if (!token) {
      throw metaError("WHATSAPP_META_EXCHANGE_FAILED", 400);
    }

    return token;
  } catch (error) {
    throw normalizeProviderFailure(error, "WHATSAPP_META_EXCHANGE_FAILED");
  }
}

async function resolveAuthorizedWabaIds({ accessToken, http = axios }) {
  try {
    const response = await http.get(graphUrl("debug_token"), {
      headers: authHeaders(requiredEnv("WHATSAPP_SYSTEM_USER_ACCESS_TOKEN")),
      params: { input_token: accessToken },
    });

    const data = response?.data?.data || {};
    if (data.is_valid !== true) {
      throw metaError("WHATSAPP_META_TOKEN_INVALID", 400);
    }

    const granularScopes = Array.isArray(data.granular_scopes) ? data.granular_scopes : [];

    const wabaIds = granularScopes
      .filter((entry) => entry?.scope === "whatsapp_business_management")
      .flatMap((entry) => Array.isArray(entry?.target_ids) ? entry.target_ids : [])
      .map(cleanId)
      .filter(Boolean);

    return [...new Set(wabaIds)];
  } catch (error) {
    throw normalizeProviderFailure(error, "WHATSAPP_META_ASSET_RESOLUTION_FAILED");
  }
}

async function resolveAuthorizedAssets({ accessToken, wabaHint, phoneHint, http = axios }) {
  try {
    const authorizedWabaIds = await resolveAuthorizedWabaIds({ accessToken, http });
    const wabaIdHint = cleanId(wabaHint);

    let authoritativeWabaId;
    if (wabaIdHint) {
      if (!authorizedWabaIds.includes(wabaIdHint)) {
        throw metaError("WHATSAPP_META_WABA_MISMATCH", 400);
      }
      authoritativeWabaId = wabaIdHint;
    } else if (authorizedWabaIds.length === 1) {
      authoritativeWabaId = authorizedWabaIds[0];
    } else if (authorizedWabaIds.length === 0) {
      throw metaError("WHATSAPP_META_WABA_NOT_FOUND", 400);
    } else {
      throw metaError("WHATSAPP_META_WABA_AMBIGUOUS", 400);
    }

    const wabaResponse = await http.get(graphUrl(authoritativeWabaId), {
      headers: authHeaders(accessToken),
      params: { fields: "id,name" },
    });
    const waba = wabaResponse?.data || {};
    const returnedWabaId = cleanId(waba.id);
    if (!returnedWabaId || returnedWabaId !== authoritativeWabaId) {
      throw metaError("WHATSAPP_META_WABA_MISMATCH", 400);
    }

    const phonesResponse = await http.get(graphUrl(`${authoritativeWabaId}/phone_numbers`), {
      headers: authHeaders(accessToken),
      params: { fields: "id,display_phone_number,verified_name" },
    });
    const phones = Array.isArray(phonesResponse?.data?.data) ? phonesResponse.data.data : [];

    const phoneIdHint = cleanId(phoneHint);
    const selected = phoneIdHint
      ? phones.find((phone) => cleanId(phone?.id) === phoneIdHint)
      : phones.length === 1
        ? phones[0]
        : null;
    const phoneNumberId = cleanId(selected?.id);
    if (!phoneNumberId) throw metaError("WHATSAPP_META_PHONE_NOT_FOUND", 400);

    const phoneResponse = await http.get(graphUrl(phoneNumberId), {
      headers: authHeaders(accessToken),
      params: { fields: "id,display_phone_number,verified_name,status" },
    });
    const phone = phoneResponse?.data || {};
    if (cleanId(phone.id) !== phoneNumberId) {
      throw metaError("WHATSAPP_META_PHONE_MISMATCH", 400);
    }

    const phoneNumber = String(phone.display_phone_number || "").replace(/[^\d]/g, "");
    if (!phoneNumber) throw metaError("WHATSAPP_META_PHONE_NOT_FOUND", 400);

    return {
      wabaId: authoritativeWabaId,
      wabaName: String(waba.name || "").trim() || null,
      phoneNumberId,
      phoneNumber,
      businessName: String(phone.verified_name || waba.name || "").trim() || null,
    };
  } catch (error) {
    throw normalizeProviderFailure(error, "WHATSAPP_META_ASSET_RESOLUTION_FAILED");
  }
}

async function registerPhone({ accessToken, phoneNumberId, http = axios }) {
  try {
    const response = await http.post(
      graphUrl(`${phoneNumberId}/register`),
      { messaging_product: "whatsapp", pin: requiredEnv("WHATSAPP_REGISTRATION_PIN") },
      { headers: authHeaders(accessToken) },
    );
    if (response?.data?.success !== true) throw metaError("WHATSAPP_META_REGISTRATION_FAILED");
  } catch (error) {
    throw normalizeProviderFailure(error, "WHATSAPP_META_REGISTRATION_FAILED");
  }
}

async function subscribeWaba({ accessToken, wabaId, http = axios }) {
  try {
    const response = await http.post(graphUrl(`${wabaId}/subscribed_apps`), null, {
      headers: authHeaders(accessToken),
    });
    if (response?.data?.success !== true) throw metaError("WHATSAPP_META_SUBSCRIPTION_FAILED");
  } catch (error) {
    throw normalizeProviderFailure(error, "WHATSAPP_META_SUBSCRIPTION_FAILED");
  }
}

async function completeMetaOnboarding({ code, redirectUri, sessionInfo, http = axios }) {
  const authorizationCode = String(code || "").trim();
  if (!authorizationCode) throw metaError("WHATSAPP_META_CODE_REQUIRED", 400);

  const accessToken = await exchangeCode(authorizationCode, redirectUri, http);
  const assets = await resolveAuthorizedAssets({
    accessToken,
    wabaHint: sessionInfo?.wabaId,
    phoneHint: sessionInfo?.phoneNumberId,
    http,
  });

  await registerPhone({ accessToken, phoneNumberId: assets.phoneNumberId, http });
  await subscribeWaba({ accessToken, wabaId: assets.wabaId, http });
  return { accessToken, ...assets };
}

module.exports = {
  completeMetaOnboarding,
  exchangeCode,
  registerPhone,
  resolveAuthorizedAssets,
  resolveAuthorizedWabaIds,
  subscribeWaba,
  __private: {
    cleanId,
    graphUrl,
    normalizeProviderFailure,
    validateEmbeddedSignupRedirectUri,
  },
};

import { API_BASE_URL } from "./apiClient";

const TOKEN_KEY =
  "storvex_marketplace_customer_token_v1";

const CUSTOMER_KEY =
  "storvex_marketplace_customer_v1";

const EXPIRY_KEY =
  "storvex_marketplace_customer_expiry_v1";

export const MARKETPLACE_CUSTOMER_SESSION_EVENT =
  "storvex:marketplace-customer-session";

function browserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function cleanString(value) {
  return String(value || "").trim();
}

function safeJsonParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function emitSessionChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      MARKETPLACE_CUSTOMER_SESSION_EVENT,
    ),
  );
}

function marketplaceApiUrl(path) {
  const cleanBase =
    cleanString(API_BASE_URL).replace(/\/+$/, "");

  const cleanPath =
    String(path || "").replace(/^\/+/, "");

  return `${cleanBase}/${cleanPath}`;
}

function publicError(
  response,
  data,
  fallback,
) {
  const error = new Error(
    data?.message ||
      fallback ||
      "The request could not be completed.",
  );

  error.status = response?.status || 0;
  error.code = data?.code || null;
  error.data = data || null;

  return error;
}

export function getMarketplaceCustomerToken() {
  return (
    browserStorage()?.getItem(TOKEN_KEY) ||
    ""
  );
}

export function getStoredMarketplaceCustomer() {
  return safeJsonParse(
    browserStorage()?.getItem(CUSTOMER_KEY),
  );
}

export function getMarketplaceCustomerSession() {
  return {
    token: getMarketplaceCustomerToken(),
    customer:
      getStoredMarketplaceCustomer(),
    expiresAt:
      browserStorage()?.getItem(EXPIRY_KEY) ||
      null,
  };
}

export function saveMarketplaceCustomerSession(
  payload = {},
) {
  const storage = browserStorage();

  if (!storage) return;

  const token = cleanString(payload.token);
  const customer = payload.customer || null;
  const expiresAt =
    cleanString(payload.expiresAt) || "";

  if (!token || !customer?.id) {
    clearMarketplaceCustomerSession();
    return;
  }

  storage.setItem(TOKEN_KEY, token);
  storage.setItem(
    CUSTOMER_KEY,
    JSON.stringify(customer),
  );

  if (expiresAt) {
    storage.setItem(EXPIRY_KEY, expiresAt);
  } else {
    storage.removeItem(EXPIRY_KEY);
  }

  emitSessionChange();
}

export function clearMarketplaceCustomerSession() {
  const storage = browserStorage();

  if (!storage) return;

  storage.removeItem(TOKEN_KEY);
  storage.removeItem(CUSTOMER_KEY);
  storage.removeItem(EXPIRY_KEY);

  emitSessionChange();
}

export async function marketplaceCustomerRequest(
  path,
  options = {},
) {
  const token =
    options.token === undefined
      ? getMarketplaceCustomerToken()
      : cleanString(options.token);

  const headers = {
    Accept: "application/json",
    ...(options.body !== undefined
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      marketplaceApiUrl(path),
      {
        method:
          String(
            options.method || "GET",
          ).toUpperCase(),
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(
                options.body,
              ),
        signal: options.signal,
      },
    );
  } catch {
    throw new Error(
      "Could not connect to Storvex. Check your connection and try again.",
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  const data =
    contentType.includes(
      "application/json",
    )
      ? await response.json()
      : null;

  if (!response.ok) {
    if (
      response.status === 401 &&
      token
    ) {
      clearMarketplaceCustomerSession();
    }

    throw publicError(
      response,
      data,
      "The request could not be completed.",
    );
  }

  return data;
}

export async function registerMarketplaceCustomer(
  payload,
) {
  return marketplaceCustomerRequest(
    "/marketplace/customer/register",
    {
      method: "POST",
      body: payload,
      token: "",
    },
  );
}

export async function loginMarketplaceCustomer(
  payload,
) {
  const result =
    await marketplaceCustomerRequest(
      "/marketplace/customer/login",
      {
        method: "POST",
        body: payload,
        token: "",
      },
    );

  saveMarketplaceCustomerSession(
    result,
  );

  return result;
}

export async function loadMarketplaceCustomer() {
  const token =
    getMarketplaceCustomerToken();

  if (!token) {
    return null;
  }

  const result =
    await marketplaceCustomerRequest(
      "/marketplace/customer/me",
      {
        token,
      },
    );

  if (result?.customer?.id) {
    const current =
      getMarketplaceCustomerSession();

    saveMarketplaceCustomerSession({
      token,
      expiresAt:
        current.expiresAt,
      customer: result.customer,
    });
  }

  return result?.customer || null;
}

export async function logoutMarketplaceCustomer() {
  const token =
    getMarketplaceCustomerToken();

  try {
    if (token) {
      await marketplaceCustomerRequest(
        "/marketplace/customer/logout",
        {
          method: "POST",
          token,
        },
      );
    }
  } finally {
    clearMarketplaceCustomerSession();
  }
}

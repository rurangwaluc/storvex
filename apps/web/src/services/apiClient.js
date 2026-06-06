import axios from "axios";
import {
  isSubscriptionBlockedError,
  toastSubscriptionBlockedError,
} from "../utils/subscriptionError";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "/api";

const ACTIVE_BRANCH_KEYS = [
  "storvex_active_branch_id",
  "activeBranchId",
  "branchId",
];

const ME_CACHE_KEYS = [
  "storvex_me_cache_v2",
  "storvex_me_cache",
];

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

function getToken() {
  return localStorage.getItem("tenantToken") || localStorage.getItem("token") || "";
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function safeJsonParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStorageValue(key) {
  return (
    cleanString(localStorage.getItem(key)) ||
    cleanString(sessionStorage.getItem(key)) ||
    ""
  );
}

function readBranchIdFromMeCache() {
  for (const key of ME_CACHE_KEYS) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    const parsed = safeJsonParse(raw);

    if (!parsed) continue;

    const direct =
      cleanString(parsed?.user?.activeBranchId) ||
      cleanString(parsed?.user?.branchId) ||
      cleanString(parsed?.branchAccess?.activeBranchId) ||
      cleanString(parsed?.activeBranch?.id) ||
      cleanString(parsed?.defaultBranch?.id) ||
      cleanString(parsed?.mainBranch?.id);

    if (direct) return direct;

    const firstAllowed = Array.isArray(parsed?.user?.allowedBranchIds)
      ? cleanString(parsed.user.allowedBranchIds[0])
      : "";

    if (firstAllowed) return firstAllowed;

    const firstBranch = Array.isArray(parsed?.branches)
      ? cleanString(parsed.branches[0]?.id)
      : "";

    if (firstBranch) return firstBranch;
  }

  return "";
}

export function getActiveBranchId() {
  for (const key of ACTIVE_BRANCH_KEYS) {
    const value = readStorageValue(key);
    if (value) return value;
  }

  return readBranchIdFromMeCache();
}

export function setActiveBranchId(branchId) {
  const cleanBranchId = cleanString(branchId);

  if (!cleanBranchId) {
    clearActiveBranchId();
    return;
  }

  localStorage.setItem("storvex_active_branch_id", cleanBranchId);
  localStorage.setItem("activeBranchId", cleanBranchId);
}

export function clearActiveBranchId() {
  for (const key of ACTIVE_BRANCH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

function requestAlreadyHasBranchHeader(headers) {
  if (!headers) return false;

  return Boolean(
    headers["x-branch-id"] ||
      headers["X-Branch-Id"] ||
      headers["x_branch_id"] ||
      headers["X_Branch_Id"],
  );
}

function clearAuthStorage() {
  localStorage.removeItem("tenantToken");
  localStorage.removeItem("token");
  localStorage.removeItem("userRole");
  localStorage.removeItem("tenantId");
  localStorage.removeItem("userId");

  sessionStorage.removeItem("storvex_me_cache_v2");
  sessionStorage.removeItem("storvex_me_cache");

  clearActiveBranchId();
}

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeBranchId = getActiveBranchId();

    if (activeBranchId && !requestAlreadyHasBranchHeader(config.headers)) {
      config.headers["x-branch-id"] = activeBranchId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isSubscriptionBlockedError(error)) {
      toastSubscriptionBlockedError(error, {
        toastId: "subscription-blocked",
      });
    }

    if (error?.response?.status === 401) {
      clearAuthStorage();
    }

    return Promise.reject(error);
  },
);

function buildRequestConfig(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const optionBranchId =
    cleanString(options.branchId) ||
    cleanString(options.activeBranchId) ||
    cleanString(options.query?.branchId);

  if (optionBranchId && !requestAlreadyHasBranchHeader(headers)) {
    headers["x-branch-id"] = optionBranchId;
  }

  const config = {
    url: path,
    method: String(options.method || "GET").toLowerCase(),
    headers,
    params: options.query ? { ...options.query } : undefined,
  };

  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      try {
        config.data = JSON.parse(options.body);
      } catch {
        config.data = options.body;
      }
    } else {
      config.data = options.body;
    }
  }

  if (options.responseType) {
    config.responseType = options.responseType;
  }

  if (options.signal) {
    config.signal = options.signal;
  }

  return config;
}

export async function apiFetch(path, options = {}) {
  try {
    const res = await apiClient.request(buildRequestConfig(path, options));
    return res.data;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Request failed";

    const err = new Error(message);
    err.response = error?.response;
    err.status = error?.response?.status;
    err.code =
      error?.response?.data?.code ||
      error?.code ||
      null;
    err.data = error?.response?.data || null;

    throw err;
  }
}

export default apiClient;
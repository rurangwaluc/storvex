import Constants from "expo-constants";
import { ApiError } from "./errors";
import { useAuthStore } from "../../store/authStore";
import { useBranchStore } from "../../store/branchStore";

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
};

function getBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl;

  if (typeof extraUrl === "string" && extraUrl.length > 0) {
    return extraUrl.replace(/\/$/, "");
  }

  return "http://localhost:5000/api";
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const requiresAuth = options.requiresAuth !== false;
  const token = useAuthStore.getState().token;
  const activeBranchId = useBranchStore.getState().activeBranchId;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (requiresAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (requiresAuth && activeBranchId) {
    headers["x-branch-id"] = activeBranchId;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? payload.message || payload.error || "Something went wrong."
        : "Something went wrong.";

    const code =
      typeof payload === "object" && payload !== null ? payload.code : undefined;

    if (response.status === 401 && requiresAuth) {
      await useAuthStore.getState().logout();
    }

    throw new ApiError({
      message,
      status: response.status,
      code,
      details: payload,
    });
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "POST", body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "PATCH", body }),

  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "PUT", body }),

  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

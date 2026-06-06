// src/services/tenantsApi.js
import { apiFetch } from "./apiClient";


export async function createTenantIntent(data) {
  return apiFetch("/auth/owner-intent", {
    method: "POST",
    body: data,
  });
}

export function getTenantSettings() {
  return apiFetch("/tenants/settings");
}

export function updateTenantSettings(data) {
  return apiFetch("/tenants/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * ✅ Server-side upload (recommended)
 * - Your backend receives multipart/form-data
 * - Backend uploads to R2 using AWS SDK (no browser CORS issues)
 * - If backend is implemented to delete old logoKey, this also handles "replace"
 */
export async function uploadTenantLogoViaApi(file) {
  const form = new FormData();
  form.append("file", file);

  return apiFetch("/tenants/logo/upload", {
    method: "POST",
    body: form,
  });
}

/**
 * ✅ Remove current logo (sets logoKey = null and deletes from R2 on backend)
 * Requires backend route: POST /api/tenants/logo/remove
 */
export function removeTenantLogoViaApi() {
  return apiFetch("/tenants/logo/remove", {
    method: "POST",
  });
}

/**
 * 🚫 Old presigned PUT flow (keep only if you still use it)
 * If you are not using it anymore, delete these to avoid confusion.
 * If you DO keep it, you must handle CORS on R2 and content-type matching.
 */
export function presignTenantLogo(contentType) {
  return apiFetch("/tenants/logo/presign", {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

export async function uploadLogoToPutUrl(putUrl, file) {
  const res = await fetch(putUrl, {
    method: "PUT",
    body: file,
    // IMPORTANT: if your presign included ContentType, you MUST send it here too
    // headers: { "Content-Type": file.type },
  });

  if (!res.ok) {
    throw new Error(`Logo upload failed (HTTP ${res.status})`);
  }
}

export function confirmTenantLogo(key) {
  return apiFetch("/tenants/logo/confirm", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}
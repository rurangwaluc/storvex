import { apiFetch } from "./apiClient";

export function getWorkspaceContext() {
  return apiFetch("/auth/me");
}

export function getStoreProfile() {
  return apiFetch("/store/profile");
}

export function updateStoreProfile(payload = {}) {
  return apiFetch("/store/profile", {
    method: "PATCH",
    body: payload,
  });
}

export function getStoreSetupChecklist() {
  return apiFetch("/store/setup-checklist");
}

export function getDocumentSettings() {
  return apiFetch("/store/document-settings");
}

export function updateDocumentSettings(payload = {}) {
  return apiFetch("/store/document-settings", {
    method: "PATCH",
    body: payload,
  });
}

export function createLogoUploadUrl(payload = {}) {
  return apiFetch("/store/logo-upload-url", {
    method: "POST",
    body: payload,
  });
}

export async function uploadFileToSignedUrl(uploadUrl, file, options = {}) {
  if (!uploadUrl) {
    throw new Error("Missing upload URL");
  }

  if (!file) {
    throw new Error("Missing file");
  }

  const method = options.method || "PUT";
  const headers = {
    ...(options.headers || {}),
  };

  if (file.type && !headers["Content-Type"]) {
    headers["Content-Type"] = file.type;
  }

  const res = await fetch(uploadUrl, {
    method,
    headers,
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Upload failed");
  }

  return true;
}
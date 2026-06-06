// frontend-stores/src/services/branchApi.js
import apiClient from "./apiClient";

function cleanString(value) {
  return String(value || "").trim();
}

function getErrorMessage(error, fallback = "Branch request failed") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeBranchPayload(payload = {}) {
  return {
    name: cleanString(payload.name),
    code: cleanString(payload.code),
    phone: cleanString(payload.phone) || null,
    email: cleanString(payload.email) || null,
    countryCode: cleanString(payload.countryCode) || "RW",
    district: cleanString(payload.district) || null,
    sector: cleanString(payload.sector) || null,
    address: cleanString(payload.address) || null,
  };
}

function normalizeBranchUpdatePayload(payload = {}) {
  const body = {};

  if ("name" in payload) body.name = cleanString(payload.name);
  if ("code" in payload) body.code = cleanString(payload.code);
  if ("phone" in payload) body.phone = cleanString(payload.phone) || null;
  if ("email" in payload) body.email = cleanString(payload.email) || null;
  if ("countryCode" in payload) body.countryCode = cleanString(payload.countryCode) || "RW";
  if ("district" in payload) body.district = cleanString(payload.district) || null;
  if ("sector" in payload) body.sector = cleanString(payload.sector) || null;
  if ("address" in payload) body.address = cleanString(payload.address) || null;

  return body;
}

function assertBranchId(branchId) {
  const id = cleanString(branchId);

  if (!id) {
    throw new Error("Branch ID is required");
  }

  return id;
}

function assertUserId(userId) {
  const id = cleanString(userId);

  if (!id) {
    throw new Error("User ID is required");
  }

  return id;
}

export async function listBranches() {
  try {
    const { data } = await apiClient.get("/branches");
    return data || { branches: [], usage: null, subscription: null, tenant: null };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load branches"));
  }
}

export async function getBranchUsage() {
  try {
    const { data } = await apiClient.get("/branches/usage");
    return data || { usage: null, subscription: null, tenant: null };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to load branch usage"));
  }
}

export async function createBranch(payload) {
  const body = normalizeBranchPayload(payload);

  if (!body.name) {
    throw new Error("Branch name is required");
  }

  if (!body.code) {
    throw new Error("Branch code is required");
  }

  try {
    const { data } = await apiClient.post("/branches", body);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create branch"));
  }
}

export async function updateBranch(branchId, payload) {
  const id = assertBranchId(branchId);
  const body = normalizeBranchUpdatePayload(payload);

  try {
    const { data } = await apiClient.patch(`/branches/${id}`, body);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to update branch"));
  }
}

export async function setMainBranch(branchId) {
  const id = assertBranchId(branchId);

  try {
    const { data } = await apiClient.patch(`/branches/${id}/main`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to set main branch"));
  }
}

export async function archiveBranch(branchId) {
  const id = assertBranchId(branchId);

  try {
    const { data } = await apiClient.patch(`/branches/${id}/archive`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to archive branch"));
  }
}

export async function reactivateBranch(branchId) {
  const id = assertBranchId(branchId);

  try {
    const { data } = await apiClient.patch(`/branches/${id}/reactivate`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to reactivate branch"));
  }
}

export async function assignStaffToBranch(branchId, payload = {}) {
  const id = assertBranchId(branchId);
  const userId = assertUserId(payload.userId);

  const body = {
    userId,
    isDefault: Boolean(payload.isDefault),
    canOperate: payload.canOperate !== false,
    canViewReports: Boolean(payload.canViewReports),
  };

  try {
    const { data } = await apiClient.post(`/branches/${id}/staff`, body);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to assign staff to branch"));
  }
}

export async function removeStaffFromBranch(branchId, userId) {
  const branch = assertBranchId(branchId);
  const user = assertUserId(userId);

  try {
    const { data } = await apiClient.delete(`/branches/${branch}/staff/${user}`);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to remove staff from branch"));
  }
}

export default {
  listBranches,
  getBranchUsage,
  createBranch,
  updateBranch,
  setMainBranch,
  archiveBranch,
  reactivateBranch,
  assignStaffToBranch,
  removeStaffFromBranch,
};
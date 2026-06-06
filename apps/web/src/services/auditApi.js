// frontend-stores/src/services/auditApi.js
import { apiFetch } from "./apiClient";

function cleanString(value) {
  return String(value || "").trim();
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toQuery(params = {}) {
  const q = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const cleanValue = String(value).trim();
    if (!cleanValue) return;

    q.set(key, cleanValue);
  });

  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

function normalizeAuditListPayload(data) {
  return {
    ok: Boolean(data?.ok),
    page: toPositiveInt(data?.page, 1),
    limit: toPositiveInt(data?.limit, 20),
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : 0,
    totalPages: toPositiveInt(data?.totalPages, 1),
    hasNextPage: Boolean(data?.hasNextPage),
    hasPrevPage: Boolean(data?.hasPrevPage),
    viewerAccess: data?.viewerAccess || null,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

function normalizeAuditStatsPayload(data) {
  return {
    ok: Boolean(data?.ok),
    stats: data?.stats || {
      total: 0,
      last24h: 0,
      last7d: 0,
      workspaceWide: 0,
      topEntities: [],
      topActions: [],
      topBranches: [],
      viewerAccess: null,
    },
  };
}

function normalizeAuditBranchesPayload(data) {
  return {
    ok: Boolean(data?.ok),
    branches: Array.isArray(data?.branches) ? data.branches : [],
    viewerAccess: data?.viewerAccess || null,
  };
}

function normalizeAuditDetailPayload(data) {
  return {
    ok: Boolean(data?.ok),
    item: data?.item || null,
  };
}

function buildAuditParams(params = {}) {
  const query = {
    page: toPositiveInt(params.page, 1),
    limit: toPositiveInt(params.limit, 20),
  };

  const q = cleanString(params.q);
  const action = cleanString(params.action);
  const entity = cleanString(params.entity);
  const userId = cleanString(params.userId);
  const branchId = cleanString(params.branchId);
  const from = cleanString(params.from);
  const to = cleanString(params.to);

  if (q) query.q = q;
  if (action) query.action = action;
  if (entity) query.entity = entity;
  if (userId) query.userId = userId;
  if (branchId && branchId !== "ALL") query.branchId = branchId;
  if (from) query.from = from;
  if (to) query.to = to;

  if (typeof params.includeWorkspaceWide === "boolean") {
    query.includeWorkspaceWide = String(params.includeWorkspaceWide);
  }

  return query;
}

export async function getAuditLogs(params = {}) {
  const data = await apiFetch(`/audit${toQuery(buildAuditParams(params))}`);
  return normalizeAuditListPayload(data);
}

export async function getAuditStats(params = {}) {
  const query = {};

  const q = cleanString(params.q);
  const action = cleanString(params.action);
  const entity = cleanString(params.entity);
  const userId = cleanString(params.userId);
  const branchId = cleanString(params.branchId);
  const from = cleanString(params.from);
  const to = cleanString(params.to);

  if (q) query.q = q;
  if (action) query.action = action;
  if (entity) query.entity = entity;
  if (userId) query.userId = userId;
  if (branchId && branchId !== "ALL") query.branchId = branchId;
  if (from) query.from = from;
  if (to) query.to = to;

  if (typeof params.includeWorkspaceWide === "boolean") {
    query.includeWorkspaceWide = String(params.includeWorkspaceWide);
  }

  const data = await apiFetch(`/audit/stats${toQuery(query)}`);
  return normalizeAuditStatsPayload(data);
}

export async function getAuditBranches() {
  const data = await apiFetch("/audit/branches");
  return normalizeAuditBranchesPayload(data);
}

export async function getAuditLogById(id) {
  const auditLogId = cleanString(id);

  if (!auditLogId) {
    throw new Error("Missing audit log id");
  }

  const data = await apiFetch(`/audit/${encodeURIComponent(auditLogId)}`);
  return normalizeAuditDetailPayload(data);
}
import { apiFetch } from "./apiClient";

function normalizeListResponse(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function getRepairs(params = {}) {
  const search = new URLSearchParams();

  if (params.storeLocationId) {
    search.set("branchId", params.storeLocationId);
  }

  if (params.allStoreLocations === true) {
    search.set("allBranches", "true");
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const data = await apiFetch(`/repairs${suffix}`);

  return {
    repairs: normalizeListResponse(data, "repairs"),
    count: Number(data?.count ?? normalizeListResponse(data, "repairs").length),
    storeLocationScope: data?.storeLocationScope || null,
  };
}

export async function getRepair(id) {
  if (!id) throw new Error("Repair ID is required");

  const data = await apiFetch(`/repairs/${encodeURIComponent(id)}`);
  return data?.repair || data;
}

export async function createRepair(payload) {
  const data = await apiFetch("/repairs", {
    method: "POST",
    body: payload,
  });

  return data?.repair || data;
}

export async function updateRepair(id, payload) {
  if (!id) throw new Error("Repair ID is required");

  const data = await apiFetch(`/repairs/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });

  return data?.repair || data;
}

export async function updateRepairStatus(id, status) {
  if (!id) throw new Error("Repair ID is required");

  const data = await apiFetch(`/repairs/${encodeURIComponent(id)}/status`, {
    method: "PUT",
    body: { status },
  });

  return data?.repair || data;
}

export async function archiveRepair(id) {
  if (!id) throw new Error("Repair ID is required");

  return apiFetch(`/repairs/${encodeURIComponent(id)}/archive`, {
    method: "DELETE",
  });
}

export async function deleteRepair(id) {
  if (!id) throw new Error("Repair ID is required");

  return apiFetch(`/repairs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function assignTechnician(repairId, technicianId) {
  if (!repairId) throw new Error("Repair ID is required");

  const data = await apiFetch(`/repairs/${encodeURIComponent(repairId)}/assign`, {
    method: "PUT",
    body: {
      technicianId: technicianId || null,
    },
  });

  return data?.repair || data;
}

export async function getRepairTechnicians(params = {}) {
  const search = new URLSearchParams();

  if (params.storeLocationId) {
    search.set("branchId", params.storeLocationId);
  }

  if (params.allStoreLocations === true) {
    search.set("allBranches", "true");
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const data = await apiFetch(`/repairs/technicians${suffix}`);

  return {
    technicians: normalizeListResponse(data, "technicians"),
    count: Number(data?.count ?? normalizeListResponse(data, "technicians").length),
    storeLocationScope: data?.storeLocationScope || null,
  };
}
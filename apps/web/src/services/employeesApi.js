// frontend-stores/src/services/employeesApi.js
import { apiFetch } from "./apiClient";

function normalizeEmployeesPayload(data) {
  if (Array.isArray(data)) {
    return {
      employees: data,
      subscription: null,
      seatUsage: null,
    };
  }

  return {
    employees: Array.isArray(data?.employees) ? data.employees : [],
    subscription: data?.subscription || null,
    seatUsage: data?.seatUsage || data?.subscriptionUsage || null,
  };
}

function cleanId(id) {
  return String(id || "").trim();
}

function cleanString(value) {
  return String(value || "").trim();
}

function cleanRole(value) {
  return cleanString(value).toUpperCase();
}

function cleanBranchIds(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const ids = [];

  for (const item of value) {
    const id = cleanId(item);
    if (!id || seen.has(id)) continue;

    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function requireEmployeeId(id) {
  const employeeId = cleanId(id);

  if (!employeeId) {
    throw new Error("Employee id is required");
  }

  return employeeId;
}

export async function getEmployees(params = {}) {
  const query = new URLSearchParams();

  const q = cleanString(params.q);
  const role = cleanRole(params.role);

  if (q) query.set("q", q);
  if (role && role !== "ALL") query.set("role", role);
  if (typeof params.isActive === "boolean") {
    query.set("isActive", String(params.isActive));
  }

  const qs = query.toString();
  const data = await apiFetch(qs ? `/employees?${qs}` : "/employees");

  return normalizeEmployeesPayload(data);
}

export async function createEmployee(data = {}) {
  const name = cleanString(data.name);
  const email = cleanString(data.email).toLowerCase();
  const password = String(data.password || "");
  const phone = cleanString(data.phone);
  const role = cleanRole(data.role);
  const branchIds = cleanBranchIds(data.branchIds);
  const defaultBranchId = cleanId(data.defaultBranchId);

  return apiFetch("/employees", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      phone,
      role,
      branchIds,
      defaultBranchId: defaultBranchId || null,
      canViewAllBranches: Boolean(data.canViewAllBranches),
    }),
  });
}

export async function updateEmployee(id, data = {}) {
  const employeeId = requireEmployeeId(id);

  const payload = {};

  if (data.name !== undefined) {
    payload.name = cleanString(data.name);
  }

  if (data.email !== undefined) {
    payload.email = cleanString(data.email).toLowerCase();
  }

  if (data.phone !== undefined) {
    payload.phone = cleanString(data.phone);
  }

  if (data.role !== undefined) {
    payload.role = cleanRole(data.role);
  }

  if (data.password) {
    payload.password = String(data.password);
  }

  if (data.branchIds !== undefined) {
    payload.branchIds = cleanBranchIds(data.branchIds);
  }

  if (data.defaultBranchId !== undefined) {
    payload.defaultBranchId = cleanId(data.defaultBranchId) || null;
  }

  if (data.canViewAllBranches !== undefined) {
    payload.canViewAllBranches = Boolean(data.canViewAllBranches);
  }

  return apiFetch(`/employees/${encodeURIComponent(employeeId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function setEmployeeActiveStatus(id, isActive) {
  const employeeId = requireEmployeeId(id);

  return apiFetch(`/employees/${encodeURIComponent(employeeId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      isActive: Boolean(isActive),
    }),
  });
}

export async function resetEmployeePassword(id, data = {}) {
  const employeeId = requireEmployeeId(id);

  const generate = Boolean(data.generate);
  const password = String(data.password || data.newPassword || "").trim();

  if (!generate && password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  return apiFetch(`/employees/${encodeURIComponent(employeeId)}/reset-password`, {
    method: "POST",
    body: JSON.stringify(
      generate
        ? { generate: true }
        : {
            password,
          }
    ),
  });
}

export async function deleteEmployee(id) {
  const employeeId = requireEmployeeId(id);

  return apiFetch(`/employees/${encodeURIComponent(employeeId)}`, {
    method: "DELETE",
  });
}

export async function getUsersByRole(role) {
  try {
    const data = await getEmployees({ role });
    return data.employees;
  } catch (err) {
    console.error("Error fetching users by role:", err);
    return [];
  }
}
import type {
  ChangeMyPlatformPasswordInput,
  ChangeMyPlatformPasswordResponse,
  CreatePlatformUserInput,
  CreatePlatformUserResponse,
  PlatformLoginResponse,
  PlatformMeResponse,
  PlatformSupportAssignmentResponse,
  PlatformSupportAttachmentDownloadResponse,
  PlatformSupportAttachmentInput,
  PlatformSupportAttachmentUploadResponse,
  PlatformSupportBusinessesResponse,
  PlatformSupportOverviewResponse,
  PlatformSupportReplyResponse,
  PlatformSupportStatusUpdateResponse,
  PlatformSupportTicketDetailResponse,
  PlatformSupportTicketsListResponse,
  PlatformSupportTicketsOverviewResponse,
  PlatformUsersListResponse,
  ResetPlatformUserPasswordInput,
  ResetPlatformUserPasswordResponse,
  UpdateMyPlatformProfileInput,
  UpdateMyPlatformProfileResponse,
  UpdatePlatformUserRoleInput,
  UpdatePlatformUserRoleResponse,
  UpdatePlatformUserStatusInput,
  UpdatePlatformUserStatusResponse,
} from "@/lib/platform-types";

const PLATFORM_API_BASE_URL =
  process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL ||
  "http://localhost:5000/api/platform";

type FetchPlatformOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string;
  body?: unknown;
};

export class PlatformApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "PlatformApiError";
    this.code = code;
    this.status = status;
  }
}

function buildPlatformUrl(path: string) {
  return `${PLATFORM_API_BASE_URL}${path}`;
}

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

async function fetchPlatform<T>(
  path: string,
  options: FetchPlatformOptions = {}
): Promise<T> {
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(buildPlatformUrl(path), {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      `Platform request failed with status ${response.status}`;

    throw new PlatformApiError(message, payload?.code, response.status);
  }

  return payload as T;
}

export async function loginPlatform(input: {
  email: string;
  password: string;
}) {
  return fetchPlatform<PlatformLoginResponse>("/auth/login", {
    method: "POST",
    body: {
      email: input.email.trim(),
      password: input.password,
    },
  });
}

export async function getPlatformMe(token: string) {
  return fetchPlatform<PlatformMeResponse>("/auth/me", { token });
}

export async function getSupportOverview(token: string) {
  return fetchPlatform<PlatformSupportOverviewResponse>("/support/overview", {
    token,
  });
}

export async function listSupportBusinesses(
  token: string,
  params: {
    q?: string;
    attention?: string;
    issue?: string;
    status?: string;
    skip?: number;
    take?: number;
  } = {}
) {
  return fetchPlatform<PlatformSupportBusinessesResponse>(
    `/support/businesses${buildQuery({
      q: params.q?.trim(),
      attention: params.attention?.trim(),
      issue: params.issue?.trim(),
      status: params.status?.trim(),
      skip: params.skip,
      take: params.take,
    })}`,
    { token }
  );
}

export async function listPlatformUsers(
  token: string,
  params: {
    q?: string;
    skip?: number;
    take?: number;
  } = {}
) {
  return fetchPlatform<PlatformUsersListResponse>(
    `/users${buildQuery({
      q: params.q?.trim(),
      skip: params.skip,
      take: params.take,
    })}`,
    { token }
  );
}

export async function createPlatformUser(
  token: string,
  input: CreatePlatformUserInput
) {
  return fetchPlatform<CreatePlatformUserResponse>("/users", {
    method: "POST",
    token,
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role,
    },
  });
}

export async function updatePlatformUserRole(
  token: string,
  userId: string,
  input: UpdatePlatformUserRoleInput
) {
  return fetchPlatform<UpdatePlatformUserRoleResponse>(`/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: { role: input.role },
  });
}

export async function updatePlatformUserStatus(
  token: string,
  userId: string,
  input: UpdatePlatformUserStatusInput
) {
  return fetchPlatform<UpdatePlatformUserStatusResponse>(
    `/users/${userId}/status`,
    {
      method: "PATCH",
      token,
      body: { isActive: input.isActive },
    }
  );
}

export async function resetPlatformUserPassword(
  token: string,
  userId: string,
  input: ResetPlatformUserPasswordInput
) {
  return fetchPlatform<ResetPlatformUserPasswordResponse>(
    `/users/${userId}/password`,
    {
      method: "PATCH",
      token,
      body: { temporaryPassword: input.temporaryPassword },
    }
  );
}

export async function updateMyPlatformProfile(
  token: string,
  input: UpdateMyPlatformProfileInput
) {
  return fetchPlatform<UpdateMyPlatformProfileResponse>("/users/me/profile", {
    method: "PATCH",
    token,
    body: { name: input.name.trim() },
  });
}

export async function changeMyPlatformPassword(
  token: string,
  input: ChangeMyPlatformPasswordInput
) {
  return fetchPlatform<ChangeMyPlatformPasswordResponse>("/users/me/password", {
    method: "PATCH",
    token,
    body: {
      currentPassword: input.currentPassword,
      nextPassword: input.nextPassword,
    },
  });
}

export async function getPlatformSupportTicketsOverview(token: string) {
  return fetchPlatform<PlatformSupportTicketsOverviewResponse>(
    "/support/tickets/overview",
    { token }
  );
}

export async function listPlatformSupportTickets(
  token: string,
  params: {
    q?: string;
    tenantId?: string;
    assignedToPlatformUserId?: string;
    status?: string;
    category?: string;
    priority?: string;
    skip?: number;
    take?: number;
  } = {}
) {
  return fetchPlatform<PlatformSupportTicketsListResponse>(
    `/support/tickets${buildQuery({
      q: params.q?.trim(),
      tenantId: params.tenantId?.trim(),
      assignedToPlatformUserId: params.assignedToPlatformUserId?.trim(),
      status: params.status?.trim(),
      category: params.category?.trim(),
      priority: params.priority?.trim(),
      skip: params.skip,
      take: params.take,
    })}`,
    { token }
  );
}

export async function getPlatformSupportTicketById(
  token: string,
  ticketId: string
) {
  return fetchPlatform<PlatformSupportTicketDetailResponse>(
    `/support/tickets/${ticketId}`,
    { token }
  );
}

export async function replyToPlatformSupportTicket(
  token: string,
  ticketId: string,
  input: {
    message: string;
    attachments?: PlatformSupportAttachmentInput[];
  }
) {
  return fetchPlatform<PlatformSupportReplyResponse>(
    `/support/tickets/${ticketId}/reply`,
    {
      method: "POST",
      token,
      body: input,
    }
  );
}

export async function updatePlatformSupportTicketStatus(
  token: string,
  ticketId: string,
  input: { status: string }
) {
  return fetchPlatform<PlatformSupportStatusUpdateResponse>(
    `/support/tickets/${ticketId}/status`,
    {
      method: "PATCH",
      token,
      body: input,
    }
  );
}

export async function assignPlatformSupportTicket(
  token: string,
  ticketId: string,
  input: { assignedToPlatformUserId: string | null }
) {
  return fetchPlatform<PlatformSupportAssignmentResponse>(
    `/support/tickets/${ticketId}/assign`,
    {
      method: "PATCH",
      token,
      body: input,
    }
  );
}

export async function createSupportAttachmentUpload(
  token: string,
  input: {
    fileName: string;
    fileType: string;
    fileSize: number;
  }
) {
  return fetchPlatform<PlatformSupportAttachmentUploadResponse>(
    "/support/attachments/upload",
    {
      method: "POST",
      token,
      body: input,
    }
  );
}

export async function getPlatformSupportAttachmentDownloadUrl(
  token: string,
  attachmentId: string
) {
  return fetchPlatform<PlatformSupportAttachmentDownloadResponse>(
    `/support/attachments/${attachmentId}/download-url`,
    { token }
  );
}

export async function uploadFileToSignedUrl(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to upload attachment.");
  }
}
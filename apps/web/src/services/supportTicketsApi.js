import { apiFetch } from "./apiClient";

function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();

  return query ? `?${query}` : "";
}

export async function listMySupportTickets(params = {}) {
  return apiFetch(
    `/support/tickets${buildQuery({
      q: params.q,
      status: params.status,
      skip: params.skip,
      take: params.take,
    })}`
  );
}

export async function createSupportTicket(payload) {
  return apiFetch("/support/tickets", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      category: payload.category,
      priority: payload.priority,
      message: payload.message,
      attachments: payload.attachments || [],
    }),
  });
}

export async function getMySupportTicketById(ticketId) {
  return apiFetch(`/support/tickets/${ticketId}`);
}

export async function replyToMySupportTicket(ticketId, payload) {
  return apiFetch(`/support/tickets/${ticketId}/reply`, {
    method: "POST",
    body: JSON.stringify({
      message: payload.message,
      attachments: payload.attachments || [],
    }),
  });
}

export async function closeMySupportTicket(ticketId) {
  return apiFetch(`/support/tickets/${ticketId}/close`, {
    method: "PATCH",
  });
}

export async function createSupportAttachmentUpload(payload) {
  return apiFetch("/support/attachments/upload", {
    method: "POST",
    body: JSON.stringify({
      fileName: payload.fileName,
      fileType: payload.fileType,
      fileSize: payload.fileSize,
    }),
  });
}

export async function getSupportAttachmentDownloadUrl(attachmentId) {
  return apiFetch(`/support/attachments/${attachmentId}/download-url`);
}

export async function uploadSupportFile(uploadUrl, file) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${file.name}`);
  }

  return true;
}
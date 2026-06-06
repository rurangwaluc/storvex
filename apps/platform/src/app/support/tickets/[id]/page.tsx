"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Paperclip,
  RefreshCcw,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AsyncButton } from "@/components/platform/async-button";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import {
  assignPlatformSupportTicket,
  createSupportAttachmentUpload,
  getPlatformSupportAttachmentDownloadUrl,
  getPlatformSupportTicketById,
  listPlatformUsers,
  replyToPlatformSupportTicket,
  updatePlatformSupportTicketStatus,
  uploadFileToSignedUrl,
} from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type {
  PlatformSupportAttachment,
  PlatformSupportAttachmentInput,
  PlatformSupportTicket,
  PlatformSupportTicketStatus,
  PlatformUser,
} from "@/lib/platform-types";

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_OPTIONS: PlatformSupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_TENANT",
  "RESOLVED",
  "CLOSED",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pretty(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "—";

  return text
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value: unknown) {
  const size = Number(value || 0);

  if (!Number.isFinite(size) || size <= 0) return "Open";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function statusTone(status: string): BadgeTone {
  if (status === "OPEN") return "danger";
  if (status === "IN_PROGRESS") return "info";
  if (status === "WAITING_FOR_TENANT") return "warning";
  if (status === "RESOLVED") return "success";
  return "neutral";
}

function priorityTone(priority: string): BadgeTone {
  if (priority === "BUSINESS_BLOCKED" || priority === "URGENT") {
    return "danger";
  }

  if (priority === "HIGH") return "warning";

  return "neutral";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-3 py-1 text-xs font-black",
        tone === "success" && "bg-emerald-100 text-emerald-700",
        tone === "warning" && "bg-amber-100 text-amber-700",
        tone === "danger" && "bg-red-100 text-red-700",
        tone === "info" && "bg-sky-100 text-sky-700",
        tone === "neutral" &&
          "bg-[var(--platform-surface-soft)] text-[var(--platform-text)]"
      )}
    >
      {children}
    </span>
  );
}

function LoadingState() {
  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <div className="platform-card h-36 animate-pulse rounded-[1.7rem]" />
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="platform-card h-[34rem] animate-pulse rounded-[1.7rem]" />
          <div className="platform-card h-[28rem] animate-pulse rounded-[1.7rem]" />
        </div>
      </div>
    </ProtectedPlatformLayout>
  );
}

function AttachmentButton({
  attachment,
  isPlatformMessage,
}: {
  attachment: PlatformSupportAttachment;
  isPlatformMessage: boolean;
}) {
  const [isOpening, setIsOpening] = useState(false);

  async function openAttachment() {
    const session = getStoredPlatformSession();
    const attachmentId = String(attachment.id || "");

    if (!session?.token || !attachmentId || isOpening) return;

    setIsOpening(true);

    try {
      const result = await getPlatformSupportAttachmentDownloadUrl(
        session.token,
        attachmentId
      );

      if (!result.downloadUrl) {
        throw new Error("Download link was not returned.");
      }

      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to open attachment.";
      window.alert(message);
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openAttachment}
      disabled={isOpening}
      className={cx(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-xs font-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        isPlatformMessage
          ? "bg-white/10 text-white"
          : "bg-[var(--platform-surface)] text-[var(--platform-text)]"
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Paperclip className="h-4 w-4 shrink-0" />
        <span className="truncate">{attachment.fileName || "Attachment"}</span>
      </span>

      <span className="inline-flex shrink-0 items-center gap-2">
        {isOpening ? "Opening..." : formatBytes(attachment.fileSize)}
        <Download className="h-4 w-4" />
      </span>
    </button>
  );
}

export default function PlatformSupportTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = String(params?.id || "");

  const [ticket, setTicket] = useState<PlatformSupportTicket | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [selectedStatus, setSelectedStatus] =
    useState<PlatformSupportTicketStatus>("OPEN");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const messages = ticket?.messages || [];

  const canReply = useMemo(() => {
    return Boolean(ticket && ticket.status !== "CLOSED" && replyMessage.trim());
  }, [replyMessage, ticket]);

  const loadTicket = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const session = getStoredPlatformSession();

      if (!session?.token) {
        setError("Platform session not found. Please login again.");
        setIsLoading(false);
        return;
      }

      if (quiet) {
        setIsRefreshing(true);
      }

      try {
        const [ticketResult, usersResult] = await Promise.all([
          getPlatformSupportTicketById(session.token, ticketId),
          listPlatformUsers(session.token, { take: 50 }),
        ]);

        setTicket(ticketResult.ticket);
        setSelectedStatus(ticketResult.ticket.status);
        setSelectedAssigneeId(
          ticketResult.ticket.assignedToPlatformUserId || ""
        );
        setPlatformUsers(usersResult.platformUsers);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load support ticket."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [ticketId]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTicket();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTicket]);

  async function uploadReplyFiles(token: string) {
    const uploadedAttachments: PlatformSupportAttachmentInput[] = [];

    if (!replyFiles.length) return uploadedAttachments;

    setIsUploadingFiles(true);

    try {
      for (const file of replyFiles) {
        const uploadResult = await createSupportAttachmentUpload(token, {
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        });

        await uploadFileToSignedUrl(uploadResult.upload.uploadUrl, file);
        uploadedAttachments.push(uploadResult.attachment);
      }

      return uploadedAttachments;
    } finally {
      setIsUploadingFiles(false);
    }
  }

  async function handleReply() {
    const session = getStoredPlatformSession();
    const message = replyMessage.trim();

    if (!session?.token || !message || !ticket) return;

    setIsSendingReply(true);
    setNotice("");
    setError("");

    try {
      const uploadedAttachments = await uploadReplyFiles(session.token);

      await replyToPlatformSupportTicket(session.token, ticket.id, {
        message,
        attachments: uploadedAttachments,
      });

      setReplyMessage("");
      setReplyFiles([]);
      setNotice("Reply sent.");
      await loadTicket({ quiet: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setIsSendingReply(false);
      setIsUploadingFiles(false);
    }
  }

  async function handleStatusUpdate() {
    const session = getStoredPlatformSession();

    if (!session?.token || !ticket) return;

    setIsUpdatingStatus(true);
    setNotice("");
    setError("");

    try {
      await updatePlatformSupportTicketStatus(session.token, ticket.id, {
        status: selectedStatus,
      });

      setNotice("Ticket status updated.");
      await loadTicket({ quiet: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleAssign() {
    const session = getStoredPlatformSession();

    if (!session?.token || !ticket) return;

    setIsAssigning(true);
    setNotice("");
    setError("");

    try {
      await assignPlatformSupportTicket(session.token, ticket.id, {
        assignedToPlatformUserId: selectedAssigneeId || null,
      });

      setNotice(selectedAssigneeId ? "Ticket assigned." : "Ticket unassigned.");
      await loadTicket({ quiet: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign ticket.");
    } finally {
      setIsAssigning(false);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <Link
                href="/support/tickets"
                className="inline-flex items-center gap-2 text-sm font-black text-[var(--platform-primary)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to tickets
              </Link>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(ticket?.status || "")}>
                  {pretty(ticket?.status)}
                </Badge>
                <Badge tone={priorityTone(ticket?.priority || "")}>
                  {pretty(ticket?.priority)}
                </Badge>
                <Badge>{pretty(ticket?.category)}</Badge>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                {ticket?.title || "Support ticket"}
              </h1>

              <p className="mt-2 text-sm font-semibold platform-muted">
                {ticket?.tenant?.name || "Unknown business"} • Created by{" "}
                {ticket?.createdBy?.name || "Unknown user"} •{" "}
                {formatDate(ticket?.createdAt)}
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={() => loadTicket({ quiet: true })}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AsyncButton>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-[1.5rem] border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <section className="platform-card overflow-hidden rounded-[1.7rem] shadow-sm">
            <div className="border-b border-[var(--platform-border)] p-5">
              <h2 className="text-lg font-black">Conversation</h2>
              <p className="mt-1 text-sm platform-muted">
                Tenant messages and platform replies.
              </p>
            </div>

            <div className="space-y-4 p-5">
              {messages.length ? (
                messages.map((item) => {
                  const isPlatform = item.senderType === "PLATFORM_USER";
                  const senderName = isPlatform
                    ? item.platformUser?.name || "Platform team"
                    : item.tenantUser?.name || "Tenant user";

                  return (
                    <div
                      key={item.id}
                      className={cx(
                        "flex",
                        isPlatform ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cx(
                          "max-w-3xl rounded-[1.4rem] border p-4",
                          isPlatform
                            ? "bg-[var(--platform-primary)] text-white"
                            : "bg-[var(--platform-surface-soft)]"
                        )}
                        style={{
                          borderColor: isPlatform
                            ? "var(--platform-primary)"
                            : "var(--platform-border)",
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black">{senderName}</p>
                          <span
                            className={cx(
                              "text-xs font-bold",
                              isPlatform ? "text-white/75" : "platform-muted"
                            )}
                          >
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                          {item.message}
                        </p>

                        {item.attachments?.length ? (
                          <div className="mt-4 space-y-2">
                            {item.attachments.map((attachment) => (
                              <AttachmentButton
                                key={attachment.id || attachment.fileUrl}
                                attachment={attachment}
                                isPlatformMessage={isPlatform}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-6 text-sm font-bold platform-muted">
                  No messages found.
                </div>
              )}
            </div>

            <div className="border-t border-[var(--platform-border)] p-5">
              <label className="text-sm font-black">Reply to tenant</label>

              <textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                rows={5}
                placeholder={
                  ticket?.status === "CLOSED"
                    ? "This ticket is closed."
                    : "Write a clear reply..."
                }
                disabled={ticket?.status === "CLOSED"}
                className="mt-2 w-full resize-none rounded-2xl border px-4 py-3 text-sm font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: "var(--platform-border)",
                  background: "var(--platform-surface-soft)",
                  color: "var(--platform-text)",
                }}
              />

              <div className="mt-3">
                <label
                  className={cx(
                    "inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition hover:opacity-80",
                    ticket?.status === "CLOSED"
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  )}
                  style={{
                    borderColor: "var(--platform-border)",
                    background: "var(--platform-surface-soft)",
                  }}
                >
                  <Paperclip className="h-4 w-4" />
                  Attach files
                  <input
                    type="file"
                    multiple
                    disabled={ticket?.status === "CLOSED"}
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      setReplyFiles(files.slice(0, 5));
                      event.currentTarget.value = "";
                    }}
                  />
                </label>

                {replyFiles.length ? (
                  <div className="mt-3 space-y-2">
                    {replyFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--platform-surface-soft)] px-4 py-3 text-sm font-bold"
                      >
                        <span className="min-w-0 truncate">{file.name}</span>

                        <button
                          type="button"
                          onClick={() =>
                            setReplyFiles((current) =>
                              current.filter((item) => item !== file)
                            )
                          }
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition hover:bg-[var(--platform-surface)]"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex justify-end">
                <AsyncButton
                  type="button"
                  isLoading={isSendingReply || isUploadingFiles}
                  disabled={!canReply || isSendingReply || isUploadingFiles}
                  onClick={handleReply}
                >
                  <Send className="h-4 w-4" />
                  {isUploadingFiles ? "Uploading..." : "Send reply"}
                </AsyncButton>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--platform-primary-soft)",
                    color: "var(--platform-primary)",
                  }}
                >
                  <Clock className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black">Ticket control</h2>
                  <p className="text-sm platform-muted">Status and ownership.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
                    Status
                  </label>

                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(
                        event.target.value as PlatformSupportTicketStatus
                      )
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-black outline-none"
                    style={{
                      borderColor: "var(--platform-border)",
                      background: "var(--platform-surface-soft)",
                      color: "var(--platform-text)",
                    }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {pretty(status)}
                      </option>
                    ))}
                  </select>

                  <AsyncButton
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    isLoading={isUpdatingStatus}
                    onClick={handleStatusUpdate}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Update status
                  </AsyncButton>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
                    Assigned to
                  </label>

                  <select
                    value={selectedAssigneeId}
                    onChange={(event) =>
                      setSelectedAssigneeId(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-black outline-none"
                    style={{
                      borderColor: "var(--platform-border)",
                      background: "var(--platform-surface-soft)",
                      color: "var(--platform-text)",
                    }}
                  >
                    <option value="">Unassigned</option>
                    {platformUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} — {pretty(user.role)}
                      </option>
                    ))}
                  </select>

                  <AsyncButton
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    isLoading={isAssigning}
                    onClick={handleAssign}
                  >
                    <UserRound className="h-4 w-4" />
                    Save assignment
                  </AsyncButton>
                </div>
              </div>
            </section>

            <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
              <h2 className="text-lg font-black">Business</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-black">{ticket?.tenant?.name || "—"}</p>
                  <p className="mt-1 platform-muted">
                    {ticket?.tenant?.email || "No email"}
                  </p>
                  <p className="mt-1 platform-muted">
                    {ticket?.tenant?.phone || "No phone"}
                  </p>
                </div>

                {ticket?.tenantId ? (
                  <Link
                    href={`/tenants/${ticket.tenantId}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
                    style={{
                      background: "var(--platform-primary)",
                    }}
                  >
                    Open business
                  </Link>
                ) : null}
              </div>
            </section>

            <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
              <h2 className="text-lg font-black">Created by</h2>

              <div className="mt-4 text-sm">
                <p className="font-black">{ticket?.createdBy?.name || "—"}</p>
                <p className="mt-1 platform-muted">
                  {ticket?.createdBy?.email || "No email"}
                </p>
                <p className="mt-1 platform-muted">
                  {ticket?.createdBy?.phone || "No phone"}
                </p>
                <p className="mt-2">
                  <Badge>{pretty(ticket?.createdBy?.role)}</Badge>
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ProtectedPlatformLayout>
  );
}
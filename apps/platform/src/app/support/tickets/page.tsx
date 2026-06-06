// frontend-platform/src/app/support/tickets/page.tsx
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Headphones,
  Inbox,
  MessageSquare,
  RefreshCcw,
  Search,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AsyncButton } from "@/components/platform/async-button";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import {
  getPlatformSupportTicketsOverview,
  listPlatformSupportTickets,
} from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type {
  PlatformSupportTicket,
  PlatformSupportTicketsListResponse,
  PlatformSupportTicketsOverviewResponse,
} from "@/lib/platform-types";

const STATUS_FILTERS = [
  { label: "All tickets", value: "" },
  { label: "Open", value: "OPEN" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Waiting for tenant", value: "WAITING_FOR_TENANT" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

const PRIORITY_FILTERS = [
  { label: "All priorities", value: "" },
  { label: "Normal", value: "NORMAL" },
  { label: "Urgent", value: "URGENT" },
  { label: "Business blocked", value: "BUSINESS_BLOCKED" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
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

function pretty(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "—";

  return text
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status: string) {
  if (status === "OPEN") return "danger";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "WAITING_FOR_TENANT") return "info";
  if (status === "RESOLVED") return "success";
  if (status === "CLOSED") return "neutral";
  return "neutral";
}

function priorityTone(priority: string) {
  if (priority === "BUSINESS_BLOCKED") return "danger";
  if (priority === "URGENT") return "warning";
  return "neutral";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "danger" | "warning" | "success" | "info";
}) {
  const iconStyle =
    tone === "danger"
      ? {
          background: "rgba(220, 38, 38, 0.12)",
          color: "var(--platform-danger)",
        }
      : tone === "warning"
        ? {
            background: "rgba(217, 119, 6, 0.14)",
            color: "var(--platform-warning)",
          }
        : tone === "success"
          ? {
              background: "rgba(22, 163, 74, 0.12)",
              color: "var(--platform-success)",
            }
          : tone === "info"
            ? {
                background: "rgba(7, 125, 203, 0.12)",
                color: "var(--platform-primary)",
              }
            : {
                background: "var(--platform-primary-soft)",
                color: "var(--platform-primary)",
              };

  return (
    <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold platform-muted">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-2 text-sm leading-5 platform-muted">
            {description}
          </p>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={iconStyle}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <div className="platform-card h-40 animate-pulse rounded-[1.7rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="platform-card h-32 animate-pulse rounded-[1.5rem]" />
          <div className="platform-card h-32 animate-pulse rounded-[1.5rem]" />
          <div className="platform-card h-32 animate-pulse rounded-[1.5rem]" />
          <div className="platform-card h-32 animate-pulse rounded-[1.5rem]" />
        </div>
        <div className="platform-card h-96 animate-pulse rounded-[1.7rem]" />
      </div>
    </ProtectedPlatformLayout>
  );
}

export default function PlatformSupportTicketsPage() {
  const [overviewData, setOverviewData] =
    useState<PlatformSupportTicketsOverviewResponse | null>(null);
  const [ticketsData, setTicketsData] =
    useState<PlatformSupportTicketsListResponse | null>(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const overview = overviewData?.overview || null;
  const tickets = ticketsData?.tickets || [];

  const filteredTickets = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) return tickets;

    return tickets.filter((ticket) => {
      const searchTarget = [
        ticket.title,
        ticket.category,
        ticket.priority,
        ticket.status,
        ticket.tenant?.name,
        ticket.tenant?.email,
        ticket.tenant?.phone,
        ticket.createdBy?.name,
        ticket.createdBy?.email,
        ticket.assignedToPlatformUser?.name,
        ticket.assignedToPlatformUser?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(text);
    });
  }, [tickets, query]);

  const loadTickets = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const session = getStoredPlatformSession();

      if (!session?.token) {
        setIsLoading(false);
        setError("Platform session not found. Please login again.");
        return;
      }

      if (quiet) {
        setIsRefreshing(true);
      }

      try {
        const [overviewResult, ticketsResult] = await Promise.all([
          getPlatformSupportTicketsOverview(session.token),
          listPlatformSupportTickets(session.token, {
            status: status || undefined,
            priority: priority || undefined,
            take: 50,
          }),
        ]);

        setOverviewData(overviewResult);
        setTicketsData(ticketsResult);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load support tickets."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [priority, status]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                Support tickets
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Tenant requests, payment proof, and support conversations.
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 platform-muted">
                This is where platform support handles real tenant requests,
                replies to businesses, assigns work, and tracks blocked stores.
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={() => loadTickets({ quiet: true })}
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total tickets"
            value={formatNumber(overview?.total)}
            description="All support tickets created by tenants."
            icon={Headphones}
          />

          <StatCard
            title="Open"
            value={formatNumber(overview?.status?.open)}
            description="New tickets waiting for platform review."
            icon={Inbox}
            tone="danger"
          />

          <StatCard
            title="Needs attention"
            value={formatNumber(overview?.needsAttention)}
            description="Open, active, waiting, or blocked tickets."
            icon={ShieldAlert}
            tone="warning"
          />

          <StatCard
            title="Unassigned"
            value={formatNumber(overview?.unassigned)}
            description="Tickets not assigned to a platform user."
            icon={UserCheck}
            tone="info"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="In progress"
            value={formatNumber(overview?.status?.inProgress)}
            description="Tickets currently being handled."
            icon={Clock3}
            tone="warning"
          />

          <StatCard
            title="Waiting for tenant"
            value={formatNumber(overview?.status?.waitingForTenant)}
            description="You replied and the tenant must respond."
            icon={MessageSquare}
            tone="info"
          />

          <StatCard
            title="Resolved"
            value={formatNumber(overview?.status?.resolved)}
            description="Tickets marked as solved."
            icon={CheckCircle2}
            tone="success"
          />

          <StatCard
            title="Business blocked"
            value={formatNumber(overview?.priority?.businessBlocked)}
            description="High-risk tickets affecting business access."
            icon={AlertTriangle}
            tone="danger"
          />
        </div>

        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <label
              className="flex items-center gap-2 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
              }}
            >
              <Search className="h-4 w-4 platform-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tickets, businesses, users..."
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[var(--platform-muted)]"
              />
            </label>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm font-black outline-none"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
                color: "var(--platform-text)",
              }}
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm font-black outline-none"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
                color: "var(--platform-text)",
              }}
            >
              {PRIORITY_FILTERS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={() => loadTickets({ quiet: true })}
            >
              Apply
            </AsyncButton>
          </div>
        </section>

        <section className="platform-card overflow-hidden rounded-[1.7rem] shadow-sm">
          <div className="border-b border-[var(--platform-border)] p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  background: "var(--platform-primary-soft)",
                  color: "var(--platform-primary)",
                }}
              >
                <Headphones className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-black">Ticket inbox</h2>
                <p className="text-sm platform-muted">
                  Showing {formatNumber(filteredTickets.length)} tickets.
                </p>
              </div>
            </div>
          </div>

          {filteredTickets.length ? (
            <div className="divide-y divide-[var(--platform-border)]">
              {filteredTickets.map((ticket: PlatformSupportTicket) => (
                <div
                  key={ticket.id}
                  className="grid gap-5 p-5 transition hover:bg-[var(--platform-surface-soft)] xl:grid-cols-[1fr_0.9fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/support/tickets/${ticket.id}`}
                        className="text-base font-black hover:text-[var(--platform-primary)]"
                      >
                        {ticket.title}
                      </Link>

                      <Badge tone={statusTone(ticket.status)}>
                        {pretty(ticket.status)}
                      </Badge>

                      <Badge tone={priorityTone(ticket.priority)}>
                        {pretty(ticket.priority)}
                      </Badge>
                    </div>

                    <p className="mt-2 text-sm font-semibold platform-muted">
                      {pretty(ticket.category)} •{" "}
                      {ticket.tenant?.name || "Unknown business"}
                    </p>

                    <p className="mt-1 text-sm platform-muted">
                      Created by {ticket.createdBy?.name || "Unknown user"} •{" "}
                      {formatDate(ticket.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
                      Assignment
                    </p>

                    <div className="mt-2 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-4">
                      <p className="text-sm font-black">
                        {ticket.assignedToPlatformUser?.name || "Unassigned"}
                      </p>

                      <p className="mt-1 text-sm platform-muted">
                        {ticket.assignedToPlatformUser?.email ||
                          "No platform user is handling this yet."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-2xl bg-[var(--platform-surface-soft)] px-3 py-2">
                        <p className="text-sm font-black">
                          {formatNumber(ticket._count?.messages)}
                        </p>
                        <p className="text-[11px] font-bold platform-muted">
                          Messages
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[var(--platform-surface-soft)] px-3 py-2">
                        <p className="text-sm font-black">
                          {formatNumber(ticket._count?.attachments)}
                        </p>
                        <p className="text-[11px] font-bold platform-muted">
                          Files
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/support/tickets/${ticket.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-white transition hover:opacity-90"
                      style={{
                        background: "var(--platform-primary)",
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Open ticket
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-sm font-bold platform-muted">
              No support tickets found.
            </div>
          )}
        </section>
      </div>
    </ProtectedPlatformLayout>
  );
}
// frontend-platform/src/app/support/page.tsx
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Eye,
  Headphones,
  Inbox,
  RefreshCcw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AsyncButton } from "@/components/platform/async-button";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import { getSupportOverview, listSupportBusinesses } from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type {
  PlatformSupportBusiness,
  PlatformSupportBusinessesResponse,
  PlatformSupportOverviewResponse,
} from "@/lib/platform-types";

const QUEUE_FILTERS = [
  { label: "All attention", value: "" },
  { label: "Missing owner", value: "missing-owner" },
  { label: "No users", value: "no-users" },
  { label: "Expired", value: "expired" },
  { label: "Read-only", value: "read-only" },
  { label: "Overdue", value: "overdue" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
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

function getIssueTone(severity: string) {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "neutral";
}

function getSupportTone(status: string) {
  if (status === "NEEDS_ATTENTION") return "danger";
  if (status === "WATCH") return "warning";
  if (status === "HEALTHY") return "success";
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
  tone?: "primary" | "danger" | "warning";
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

export default function PlatformSupportPage() {
  const [overviewData, setOverviewData] =
    useState<PlatformSupportOverviewResponse | null>(null);
  const [queueData, setQueueData] =
    useState<PlatformSupportBusinessesResponse | null>(null);
  const [query, setQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const overview = overviewData?.overview || null;
  const supportQueue = overview?.supportQueue || null;
  const businesses = queueData?.businesses || [];

  const filteredBusinesses = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return businesses;

    return businesses.filter((business: PlatformSupportBusiness) => {
      const searchTarget = [
        business.name,
        business.email,
        business.phone,
        business.businessProfile?.shopType,
        business.businessProfile?.district,
        business.businessProfile?.sector,
        business.owner?.name,
        business.owner?.email,
        business.support?.status,
        ...(business.support?.issues || []).map((issue) => issue.title),
        ...(business.support?.issues || []).map((issue) => issue.code),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(text);
    });
  }, [businesses, query]);

  const loadSupport = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const session = getStoredPlatformSession();

      if (!session?.token) {
        setIsLoading(false);
        setError("Platform session not found. Please login again.");
        return;
      }

      if (quiet) setIsRefreshing(true);

      try {
        const [overviewResult, queueResult] = await Promise.all([
          getSupportOverview(session.token),
          listSupportBusinesses(session.token, {
            take: 50,
            attention: queueFilter || undefined,
          }),
        ]);

        setOverviewData(overviewResult);
        setQueueData(queueResult);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load support data."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [queueFilter]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSupport();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSupport]);

  if (isLoading) return <LoadingState />;

  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                Support control room
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Fix business issues before they become churn.
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 platform-muted">
                This page shows businesses that need platform attention. Human
                support conversations are handled in the support ticket inbox.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/support/tickets"
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
                style={{ background: "var(--platform-primary)" }}
              >
                <Inbox className="h-4 w-4" />
                Open support tickets
              </Link>

              <AsyncButton
                type="button"
                variant="secondary"
                isLoading={isRefreshing}
                onClick={() => loadSupport({ quiet: true })}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </AsyncButton>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Businesses"
            value={formatNumber(overview?.businesses)}
            description="Total businesses currently registered."
            icon={Building2}
          />

          <StatCard
            title="Need attention"
            value={formatNumber(supportQueue?.totalAttention)}
            description="Support issues that should be reviewed."
            icon={ShieldAlert}
            tone="danger"
          />

          <StatCard
            title="Missing owners"
            value={formatNumber(supportQueue?.missingOwnerBusinesses)}
            description="Businesses without linked owner accounts."
            icon={Users}
            tone="danger"
          />

          <StatCard
            title="Overdue access"
            value={formatNumber(supportQueue?.overdueSubscriptions)}
            description="Subscriptions past end date."
            icon={AlertTriangle}
            tone="warning"
          />
        </div>

        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
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
                placeholder="Search support queue..."
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[var(--platform-muted)]"
              />
            </label>

            <select
              value={queueFilter}
              onChange={(event) => setQueueFilter(event.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm font-black outline-none"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
                color: "var(--platform-text)",
              }}
            >
              {QUEUE_FILTERS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={() => loadSupport({ quiet: true })}
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
                <h2 className="text-lg font-black">Business support queue</h2>
                <p className="text-sm platform-muted">
                  Showing {formatNumber(filteredBusinesses.length)} businesses
                  that need review.
                </p>
              </div>
            </div>
          </div>

          {filteredBusinesses.length ? (
            <div className="divide-y divide-[var(--platform-border)]">
              {filteredBusinesses.map((business) => {
                const supportTone = getSupportTone(business.support.status);
                const mainIssue = business.support.issues[0] || null;

                return (
                  <div
                    key={business.id}
                    className="grid gap-5 p-5 transition hover:bg-[var(--platform-surface-soft)] xl:grid-cols-[1fr_1.1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/tenants/${business.id}`}
                          className="text-base font-black hover:text-[var(--platform-primary)]"
                        >
                          {business.name}
                        </Link>

                        <Badge tone={supportTone}>
                          {pretty(business.support.status)}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm font-semibold platform-muted">
                        {business.email || "No email"} •{" "}
                        {business.phone || "No phone"}
                      </p>

                      <p className="mt-1 text-sm platform-muted">
                        {pretty(business.businessProfile?.shopType)} •{" "}
                        {[
                          business.businessProfile?.district,
                          business.businessProfile?.sector,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No location profile"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {business.owner ? (
                          <Badge tone="success">Owner linked</Badge>
                        ) : (
                          <Badge tone="danger">Missing owner</Badge>
                        )}

                        <Badge
                          tone={
                            business.subscription?.health?.severity === "danger"
                              ? "danger"
                              : business.subscription?.health?.severity ===
                                  "warning"
                                ? "warning"
                                : "success"
                          }
                        >
                          {business.subscription?.health?.label ||
                            business.subscription?.accessMode ||
                            "No subscription"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
                        Main issue
                      </p>

                      {mainIssue ? (
                        <div className="mt-2 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black">
                              {mainIssue.title}
                            </p>
                            <Badge tone={getIssueTone(mainIssue.severity)}>
                              {pretty(mainIssue.severity)}
                            </Badge>
                          </div>

                          <p className="mt-2 text-sm leading-6 platform-muted">
                            {mainIssue.message}
                          </p>

                          {mainIssue.suggestedAction ? (
                            <p className="mt-2 text-xs font-bold text-[var(--platform-primary)]">
                              {mainIssue.suggestedAction}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2 rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-4 text-sm font-bold platform-muted">
                          No active support issue.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 xl:items-end">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-2xl bg-[var(--platform-surface-soft)] px-3 py-2">
                          <p className="text-sm font-black">
                            {formatNumber(business.usage.users)}
                          </p>
                          <p className="text-[11px] font-bold platform-muted">
                            Users
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[var(--platform-surface-soft)] px-3 py-2">
                          <p className="text-sm font-black">
                            {formatNumber(business.usage.sales)}
                          </p>
                          <p className="text-[11px] font-bold platform-muted">
                            Sales
                          </p>
                        </div>

                        <div className="rounded-2xl bg-[var(--platform-surface-soft)] px-3 py-2">
                          <p className="text-sm font-black">
                            {formatNumber(business.support.issueCount)}
                          </p>
                          <p className="text-[11px] font-bold platform-muted">
                            Issues
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/tenants/${business.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-white transition hover:opacity-90"
                        style={{ background: "var(--platform-primary)" }}
                      >
                        <Eye className="h-4 w-4" />
                        Open business
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-sm font-bold platform-muted">
              No support items found.
            </div>
          )}
        </section>

      </div>
    </ProtectedPlatformLayout>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  MapPin,
  RefreshCcw,
  ShieldAlert,
  Users,
} from "lucide-react";

import { AsyncButton } from "@/components/platform/async-button";
import { DashboardSkeleton } from "@/components/platform/dashboard-skeleton";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import { getSupportOverview } from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type { PlatformSupportOverviewResponse } from "@/lib/platform-types";

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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold platform-muted">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
          <p className="mt-2 text-sm leading-5 platform-muted">
            {description}
          </p>
        </div>

        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: "var(--platform-primary-soft)",
            color: "var(--platform-primary)",
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function PlatformDashboardPage() {
  const [data, setData] = useState<PlatformSupportOverviewResponse | null>(
    null
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const overview = data?.overview || null;
  const queue = overview?.supportQueue || null;
  const recentActivity = overview?.recentActivity || [];

  const topQueueItems = useMemo(() => {
    if (!queue) return [];

    return [
      {
        label: "Missing owner accounts",
        value: queue.missingOwnerBusinesses,
        tone: "danger",
      },
      {
        label: "No user accounts",
        value: queue.noUserBusinesses,
        tone: "danger",
      },
      {
        label: "Expired subscriptions",
        value: queue.expiredSubscriptions,
        tone: "warning",
      },
      {
        label: "Read-only subscriptions",
        value: queue.readOnlySubscriptions,
        tone: "warning",
      },
      {
        label: "Overdue subscriptions",
        value: queue.overdueSubscriptions,
        tone: "danger",
      },
    ];
  }, [queue]);

  useEffect(() => {
    let isMounted = true;

    const session = getStoredPlatformSession();

    if (!session?.token) {
      queueMicrotask(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    getSupportOverview(session.token)
      .then((result) => {
        if (!isMounted) return;
        setData(result);
        setError("");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;

        const message =
          err instanceof Error
            ? err.message
            : "Failed to load platform dashboard.";

        setError(message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshOverview() {
    const session = getStoredPlatformSession();

    if (!session?.token || isRefreshing) return;

    setIsRefreshing(true);
    setError("");

    try {
      const result = await getSupportOverview(session.token);
      setData(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to refresh platform dashboard.";

      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <ProtectedPlatformLayout>
      {isLoading ? (
        <DashboardSkeleton insideShell />
      ) : (
        <div className="space-y-6">
          <div className="platform-card flex flex-col justify-between gap-4 rounded-[1.7rem] p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                Platform dashboard
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Business health, support risk, and recent activity.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 platform-muted">
                This dashboard uses the platform support overview first because
                it shows what needs your attention fastest.
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={refreshOverview}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AsyncButton>
          </div>

          {error ? (
            <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Businesses"
              value={formatNumber(overview?.businesses)}
              description="Total businesses currently known by the platform."
              icon={Building2}
            />

            <StatCard
              title="Tenant users"
              value={formatNumber(overview?.tenantUsers)}
              description="Owner, manager, cashier, seller, and staff accounts."
              icon={Users}
            />

            <StatCard
              title="Store locations"
              value={formatNumber(overview?.storeLocations)}
              description="Active and inactive business selling locations."
              icon={MapPin}
            />

            <StatCard
              title="Need attention"
              value={formatNumber(queue?.totalAttention)}
              description="Support issues that may need platform action."
              icon={ShieldAlert}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: "rgba(194, 65, 12, 0.12)",
                    color: "var(--platform-danger)",
                  }}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black">Support queue</h2>
                  <p className="text-sm platform-muted">
                    The clearest issues to fix first.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {topQueueItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: "var(--platform-border)",
                      background: "var(--platform-surface-soft)",
                    }}
                  >
                    <div>
                      <p className="text-sm font-black">{item.label}</p>
                      <p className="mt-1 text-xs font-semibold platform-muted">
                        {item.tone === "danger"
                          ? "Needs direct review"
                          : "Watch closely"}
                      </p>
                    </div>

                    <span
                      className={
                        item.tone === "danger"
                          ? "rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700"
                          : "rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-700"
                      }
                    >
                      {formatNumber(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: "var(--platform-primary-soft)",
                    color: "var(--platform-primary)",
                  }}
                >
                  <Activity className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black">Recent activity</h2>
                  <p className="text-sm platform-muted">
                    Latest business actions from the audit trail.
                  </p>
                </div>
              </div>

              <div
                className="mt-5 overflow-hidden rounded-2xl border"
                style={{
                  borderColor: "var(--platform-border)",
                }}
              >
                {recentActivity.length ? (
                  <div
                    className="divide-y"
                    style={{
                      borderColor: "var(--platform-border)",
                    }}
                  >
                    {recentActivity.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]"
                        style={{
                          background: "var(--platform-surface)",
                          borderColor: "var(--platform-border)",
                        }}
                      >
                        <div>
                          <p className="text-sm font-black">
                            {item.action.replaceAll("_", " ")}
                          </p>
                          <p className="mt-1 text-sm platform-muted">
                            {item.business?.name || "Unknown business"}{" "}
                            {item.actor?.name ? `• ${item.actor.name}` : ""}
                          </p>
                        </div>

                        <p className="text-xs font-bold platform-muted sm:text-right">
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-sm font-semibold platform-muted">
                    No recent activity found.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </ProtectedPlatformLayout>
  );
}
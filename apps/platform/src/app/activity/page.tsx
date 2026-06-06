"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AsyncButton } from "@/components/platform/async-button";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import { getSupportOverview } from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type { PlatformActivityItem } from "@/lib/platform-types";

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

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function relativeTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(diff / 3600000);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(diff / 86400000);

  if (days < 7) return `${days}d ago`;

  return formatDate(value);
}

function getEntityTone(entity: string) {
  const value = String(entity || "").toUpperCase();

  if (
    value.includes("SALE") ||
    value.includes("PAYMENT") ||
    value.includes("INVOICE")
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    value.includes("EXPENSE") ||
    value.includes("CASH") ||
    value.includes("DRAWER")
  ) {
    return "bg-amber-100 text-amber-700";
  }

  if (
    value.includes("USER") ||
    value.includes("AUTH") ||
    value.includes("LOGIN")
  ) {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-[var(--platform-surface-soft)] text-[var(--platform-text)]";
}

function getActionTone(action: string) {
  const value = String(action || "").toUpperCase();

  if (
    value.includes("DELETE") ||
    value.includes("REMOVE") ||
    value.includes("VOID")
  ) {
    return "bg-red-100 text-red-700";
  }

  if (
    value.includes("CREATE") ||
    value.includes("ADD") ||
    value.includes("OPEN")
  ) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    value.includes("UPDATE") ||
    value.includes("EDIT") ||
    value.includes("CHANGE")
  ) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-[var(--platform-surface-soft)] text-[var(--platform-text)]";
}

function LoadingState() {
  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <div className="platform-card h-40 animate-pulse rounded-[1.8rem]" />

        <div className="platform-card h-[42rem] animate-pulse rounded-[1.8rem]" />
      </div>
    </ProtectedPlatformLayout>
  );
}

export default function PlatformActivityPage() {
  const [activities, setActivities] = useState<PlatformActivityItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    const session = getStoredPlatformSession();

    if (!session?.token) {
      setError("Platform session not found.");
      setLoading(false);
      return;
    }

    if (quiet) {
      setRefreshing(true);
    }

    try {
      const response = await getSupportOverview(session.token);

      setActivities(response.overview.recentActivity || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load activity trail."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return activities;

    return activities.filter((item) => {
      const business = item.business?.name || "";
      const actor = item.actor?.name || "";
      const action = item.action || "";
      const entity = item.entity || "";

      return [business, actor, action, entity]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activities, query]);

  const stats = useMemo(() => {
    return {
      total: activities.length,
      businesses: new Set(
        activities.map((item) => item.business?.id).filter(Boolean)
      ).size,
      actors: new Set(
        activities.map((item) => item.actor?.id).filter(Boolean)
      ).size,
    };
  }, [activities]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <section className="platform-card rounded-[1.8rem] p-6 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--platform-primary-soft)] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--platform-primary)]">
                <ShieldCheck className="h-4 w-4" />
                Platform activity trail
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight">
                Business activity
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 platform-muted">
                Monitor what businesses, staff, and operators are doing across
                Storvex in real time.
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={refreshing}
              onClick={() => load(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AsyncButton>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                  <Activity className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Activities
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {stats.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Businesses
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {stats.businesses.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Actors
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {stats.actors.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="platform-card overflow-hidden rounded-[1.8rem] shadow-sm">
          <div className="border-b border-[var(--platform-border)] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black">
                  Recent business activity
                </h2>

                <p className="mt-1 text-sm platform-muted">
                  Search actions, users, and businesses.
                </p>
              </div>

              <div className="relative w-full xl:w-[22rem]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 platform-muted" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search activity..."
                  className="h-12 w-full rounded-2xl border border-[var(--platform-border)] bg-[var(--platform-surface-soft)] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="p-5">
              <div className="rounded-[1.4rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--platform-border)] bg-[var(--platform-surface-soft)]">
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Business
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Actor
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Entity
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Action
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Time
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] platform-muted">
                    Open
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredActivities.length ? (
                  filteredActivities.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--platform-border)]"
                    >
                      <td className="px-5 py-4 align-top">
                        <div>
                          <p className="font-black">
                            {item.business?.name || "Unknown business"}
                          </p>

                          <p className="mt-1 text-xs platform-muted">
                            {item.storeLocation?.name || "Main business"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div>
                          <p className="font-black">
                            {item.actor?.name || "System"}
                          </p>

                          <p className="mt-1 text-xs platform-muted">
                            {pretty(item.actor?.role)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={cx(
                            "inline-flex rounded-full px-3 py-1 text-xs font-black",
                            getEntityTone(item.entity)
                          )}
                        >
                          {pretty(item.entity)}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={cx(
                            "inline-flex rounded-full px-3 py-1 text-xs font-black",
                            getActionTone(item.action)
                          )}
                        >
                          {pretty(item.action)}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div>
                          <p className="font-black">
                            {relativeTime(item.createdAt)}
                          </p>

                          <p className="mt-1 text-xs platform-muted">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top text-right">
                        {item.tenantId ? (
                          <Link
                            href={`/tenants/${item.tenantId}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--platform-primary)] px-4 py-2 text-xs font-black text-white transition hover:opacity-90"
                          >
                            Open
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : (
                          <span className="text-xs font-bold platform-muted">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-14 text-center text-sm font-bold platform-muted"
                    >
                      No activity found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ProtectedPlatformLayout>
  );
}
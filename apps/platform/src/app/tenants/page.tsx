"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  MapPin,
  RefreshCcw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { AsyncButton } from "@/components/platform/async-button";
import { DashboardSkeleton } from "@/components/platform/dashboard-skeleton";
import { PlatformSelect } from "@/components/platform/platform-select";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import { listSupportBusinesses } from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type {
  PlatformSupportBusiness,
  PlatformSupportBusinessStatus,
  PlatformSupportBusinessesResponse,
} from "@/lib/platform-types";

type AttentionFilter =
  | "all"
  | "missing-owner"
  | "no-users"
  | "expired"
  | "read-only"
  | "overdue"
  | "suspended";

const ATTENTION_OPTIONS: Array<{
  value: AttentionFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All businesses",
    description: "Show every business on the platform.",
  },
  {
    value: "missing-owner",
    label: "Missing owner",
    description: "Businesses without a linked owner account.",
  },
  {
    value: "no-users",
    label: "No active users",
    description: "Businesses with no usable team account.",
  },
  {
    value: "expired",
    label: "Expired",
    description: "Businesses with expired subscriptions.",
  },
  {
    value: "read-only",
    label: "Read-only",
    description: "Businesses currently limited to read-only access.",
  },
  {
    value: "overdue",
    label: "Overdue",
    description: "Subscriptions past their end date.",
  },
  {
    value: "suspended",
    label: "Suspended",
    description: "Businesses or subscriptions that are suspended.",
  },
];

function cleanMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
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

function formatMoney(value: unknown, currency?: string | null) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) return "—";

  return `${Math.round(n).toLocaleString()} ${currency || "RWF"}`;
}

function getSupportStatusLabel(status?: PlatformSupportBusinessStatus) {
  if (status === "NEEDS_ATTENTION") return "Needs attention";
  if (status === "WATCH") return "Watch";
  return "Healthy";
}

function getSupportBadgeClass(status?: PlatformSupportBusinessStatus) {
  if (status === "NEEDS_ATTENTION") {
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300";
  }

  if (status === "WATCH") {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function getSubscriptionBadgeClass(severity?: string) {
  if (severity === "danger") {
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300";
  }

  if (severity === "warning") {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function getPrimaryIssue(business: PlatformSupportBusiness) {
  const issues = business.support?.issues || [];

  return (
    issues.find((issue) => issue.severity === "danger") ||
    issues.find((issue) => issue.severity === "warning") ||
    issues[0] ||
    null
  );
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

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BusinessCard({ business }: { business: PlatformSupportBusiness }) {
  const primaryIssue = getPrimaryIssue(business);
  const subscription = business.subscription;
  const subscriptionHealth = subscription?.health;

  return (
    <article className="platform-card overflow-hidden rounded-[1.7rem] shadow-sm">
      <div
        className="border-b p-5"
        style={{ borderColor: "var(--platform-border)" }}
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black">{business.name}</h2>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getSupportBadgeClass(
                  business.support?.status
                )}`}
              >
                {getSupportStatusLabel(business.support?.status)}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold platform-muted">
              {business.email || "No email"}{" "}
              {business.phone ? `• ${business.phone}` : ""}
            </p>

            <p className="mt-1 text-xs font-semibold platform-muted">
              Created {formatDate(business.createdAt)}
            </p>
          </div>

          <Link
            href={`/tenants/${business.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--platform-primary)] px-4 text-sm font-black text-white transition hover:opacity-90"
          >
            Open business
          </Link>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_1fr_1fr]">
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: "var(--platform-border)",
            background: "var(--platform-surface-soft)",
          }}
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
            Owner
          </p>

          {business.owner ? (
            <div className="mt-3">
              <p className="font-black">{business.owner.name}</p>
              <p className="mt-1 text-sm font-semibold platform-muted">
                {business.owner.email || "No email"}
              </p>
              <p className="mt-1 text-sm font-semibold platform-muted">
                {business.owner.phone || "No phone"}
              </p>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 text-red-700 dark:text-red-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm font-black">Missing owner account</p>
            </div>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: "var(--platform-border)",
            background: "var(--platform-surface-soft)",
          }}
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
            Subscription
          </p>

          {subscription ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getSubscriptionBadgeClass(
                    subscriptionHealth?.severity
                  )}`}
                >
                  {subscriptionHealth?.label || subscription.status}
                </span>

                <span className="inline-flex rounded-full border border-[var(--platform-border)] px-3 py-1 text-xs font-black">
                  {subscription.accessMode}
                </span>
              </div>

              <p className="text-sm font-semibold platform-muted">
                {subscription.planKey || "No plan"} •{" "}
                {formatMoney(subscription.priceAmount, subscription.currency)}
              </p>

              <p className="text-sm font-semibold platform-muted">
                Ends {formatDate(subscription.endDate)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm font-black text-red-700 dark:text-red-300">
              No subscription record
            </p>
          )}
        </div>

        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: "var(--platform-border)",
            background: "var(--platform-surface-soft)",
          }}
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
            Usage
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <p className="font-semibold platform-muted">
              Users{" "}
              <span className="font-black text-[var(--platform-text)]">
                {formatNumber(business.usage.users)}
              </span>
            </p>
            <p className="font-semibold platform-muted">
              Locations{" "}
              <span className="font-black text-[var(--platform-text)]">
                {formatNumber(business.usage.storeLocations)}
              </span>
            </p>
            <p className="font-semibold platform-muted">
              Sales{" "}
              <span className="font-black text-[var(--platform-text)]">
                {formatNumber(business.usage.sales)}
              </span>
            </p>
            <p className="font-semibold platform-muted">
              Products{" "}
              <span className="font-black text-[var(--platform-text)]">
                {formatNumber(business.usage.products)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {primaryIssue ? (
        <div className="px-5 pb-5">
          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor: "var(--platform-border)",
              background: "var(--platform-surface-soft)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />

              <div>
                <p className="text-sm font-black">{primaryIssue.title}</p>
                <p className="mt-1 text-sm leading-6 platform-muted">
                  {primaryIssue.message}
                </p>

                {primaryIssue.suggestedAction ? (
                  <p className="mt-2 text-xs font-bold platform-muted">
                    Next action: {primaryIssue.suggestedAction}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function PlatformTenantsPage() {
  const storedSession = getStoredPlatformSession();
  const token = storedSession?.token || "";

  const [data, setData] = useState<PlatformSupportBusinessesResponse | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [attention, setAttention] = useState<AttentionFilter>("all");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(() => Boolean(token));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const businesses = data?.businesses || [];

  const stats = useMemo(() => {
    const needsAttention = businesses.filter(
      (business) => business.support?.status === "NEEDS_ATTENTION"
    ).length;

    const watch = businesses.filter(
      (business) => business.support?.status === "WATCH"
    ).length;

    const locations = businesses.reduce(
      (sum, business) => sum + Number(business.usage?.storeLocations || 0),
      0
    );

    return {
      needsAttention,
      watch,
      locations,
    };
  }, [businesses]);

  useEffect(() => {
    if (!token) return;

    let ignore = false;

    const loadPromise = listSupportBusinesses(token, {
      q: submittedQuery,
      attention: attention === "all" ? undefined : attention,
      take: 50,
    });

    loadPromise
      .then((result) => {
        if (ignore) return;

        setData(result);
        setError("");
      })
      .catch((err: unknown) => {
        if (ignore) return;

        setError(cleanMessage(err, "Failed to load platform businesses."));
      })
      .finally(() => {
        if (ignore) return;

        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [token, submittedQuery, attention]);

  async function refreshBusinesses() {
    if (!token) return;

    setIsRefreshing(true);
    setError("");

    try {
      const result = await listSupportBusinesses(token, {
        q: submittedQuery,
        attention: attention === "all" ? undefined : attention,
        take: 50,
      });

      setData(result);
    } catch (err) {
      setError(cleanMessage(err, "Failed to refresh platform businesses."));
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  return (
    <ProtectedPlatformLayout>
      {isLoading ? (
        <DashboardSkeleton insideShell />
      ) : (
        <div className="space-y-6">
          <div className="platform-card flex flex-col justify-between gap-4 rounded-[1.7rem] p-5 shadow-sm lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                Businesses
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                See every business and what needs your attention.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 platform-muted">
                This page uses the support businesses endpoint because it shows
                owner, subscription, usage, locations, and support issues in one
                place.
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={refreshBusinesses}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AsyncButton>
          </div>

          {error ? (
            <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Businesses"
              value={formatNumber(data?.count)}
              description="Businesses returned by the current view."
              icon={Building2}
            />

            <StatCard
              title="Need attention"
              value={formatNumber(stats.needsAttention)}
              description="Businesses with danger-level support issues."
              icon={ShieldAlert}
            />

            <StatCard
              title="Watch"
              value={formatNumber(stats.watch)}
              description="Businesses with warning-level support issues."
              icon={AlertTriangle}
            />

            <StatCard
              title="Store locations"
              value={formatNumber(stats.locations)}
              description="Selling locations across this filtered list."
              icon={MapPin}
            />
          </div>

          <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
            <form
              onSubmit={handleSearch}
              className="grid gap-3 lg:grid-cols-[1fr_280px_auto]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 platform-muted" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search business name, email, phone, district, or sector"
                  className="h-12 w-full rounded-2xl border bg-transparent pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                  style={{ borderColor: "var(--platform-border)" }}
                />
              </div>

              <PlatformSelect<AttentionFilter>
                value={attention}
                options={ATTENTION_OPTIONS}
                onChange={setAttention}
              />

              <AsyncButton type="submit" variant="secondary">
                Search
              </AsyncButton>
            </form>
          </section>

          {businesses.length ? (
            <div className="space-y-4">
              {businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          ) : (
            <section className="platform-card rounded-[1.7rem] p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <h2 className="mt-4 text-xl font-black">No businesses found</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 platform-muted">
                Try changing the search term or attention filter.
              </p>
            </section>
          )}

          {data?.page?.hasMore ? (
            <div className="platform-card rounded-[1.5rem] p-4 text-center text-sm font-bold platform-muted">
              More businesses exist. Pagination controls can be added next.
            </div>
          ) : null}
        </div>
      )}
    </ProtectedPlatformLayout>
  );
}
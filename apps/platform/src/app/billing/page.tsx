// frontend-platform/src/app/billing/page.tsx
"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AsyncButton } from "@/components/platform/async-button";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import { listSupportBusinesses } from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type {
  PlatformSupportBusiness,
  PlatformSupportBusinessesResponse,
} from "@/lib/platform-types";

const FIRST_PAGE_SIZE = 25;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function formatMoney(value: unknown, currency = "RWF") {
  const n = Number(value || 0);
  return `${currency} ${Number.isFinite(n) ? n.toLocaleString() : "0"}`;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
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
  tone?: "primary" | "danger" | "warning" | "success";
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
              color: "rgb(21 128 61)",
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

function subscriptionTone(business: PlatformSupportBusiness) {
  const severity = business.subscription?.health?.severity;

  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "success") return "success";

  const status = String(business.subscription?.status || "").toUpperCase();
  const accessMode = String(
    business.subscription?.accessMode || ""
  ).toUpperCase();

  if (status === "EXPIRED" || accessMode === "READ_ONLY") return "danger";
  if (status === "OVERDUE") return "warning";

  return "neutral";
}

export default function PlatformBillingPage() {
  const [data, setData] = useState<PlatformSupportBusinessesResponse | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const businesses = data?.businesses || [];
  const page = data?.page;

  const loadBilling = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const session = getStoredPlatformSession();

      if (!session?.token) {
        setError("Platform session not found. Please login again.");
        setIsLoading(false);
        return;
      }

      if (quiet) setIsRefreshing(true);

      try {
        const result = await listSupportBusinesses(session.token, {
          take: FIRST_PAGE_SIZE,
        });

        setData(result);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load billing data."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBilling();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const summary = useMemo(() => {
    const total = data?.count ?? businesses.length;

    const expired = businesses.filter(
      (item) =>
        String(item.subscription?.status || "").toUpperCase() === "EXPIRED"
    ).length;

    const readOnly = businesses.filter(
      (item) =>
        String(item.subscription?.accessMode || "").toUpperCase() ===
        "READ_ONLY"
    ).length;

    const overdue = businesses.filter((item) =>
      item.support?.issues?.some((issue) =>
        issue.code.toLowerCase().includes("overdue")
      )
    ).length;

    const danger = businesses.filter(
      (item) => subscriptionTone(item) === "danger"
    ).length;

    return { total, expired, readOnly, overdue, danger };
  }, [businesses, data?.count]);

  const filteredBusinesses = useMemo(() => {
    const text = query.trim().toLowerCase();

    return businesses.filter((business) => {
      const tone = subscriptionTone(business);

      if (riskFilter !== "ALL" && tone !== riskFilter.toLowerCase()) {
        return false;
      }

      if (!text) return true;

      const searchTarget = [
        business.name,
        business.email,
        business.phone,
        business.subscription?.status,
        business.subscription?.accessMode,
        business.subscription?.planKey,
        business.subscription?.tierKey,
        business.subscription?.cycleKey,
        business.subscription?.health?.label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(text);
    });
  }, [businesses, query, riskFilter]);

  if (isLoading) return <LoadingState />;

  return (
    <ProtectedPlatformLayout>
      <div className="space-y-6">
        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                Billing control room
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Track billing risk before access becomes a support problem.
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 platform-muted">
                Showing the first {FIRST_PAGE_SIZE} businesses for a clean,
                fast billing review. Load-more pagination comes next.
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={() => loadBilling({ quiet: true })}
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
            title="Businesses"
            value={formatNumber(summary.total)}
            description="Total businesses matching billing review data."
            icon={Building2}
          />

          <StatCard
            title="Overdue"
            value={formatNumber(summary.overdue)}
            description="Overdue signals in the first loaded set."
            icon={AlertTriangle}
            tone="warning"
          />

          <StatCard
            title="Read-only"
            value={formatNumber(summary.readOnly)}
            description="Businesses restricted because of billing status."
            icon={ShieldAlert}
            tone="danger"
          />

          <StatCard
            title="Expired"
            value={formatNumber(summary.expired)}
            description="Subscriptions marked as expired."
            icon={CreditCard}
            tone="danger"
          />
        </div>

        <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search business, plan, status..."
              className="rounded-2xl border px-4 py-3 text-sm font-bold outline-none"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
                color: "var(--platform-text)",
              }}
            />

            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="rounded-2xl border px-4 py-3 text-sm font-black outline-none"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
                color: "var(--platform-text)",
              }}
            >
              <option value="ALL">All billing states</option>
              <option value="danger">Danger only</option>
              <option value="warning">Warning only</option>
              <option value="success">Healthy only</option>
            </select>
          </div>
        </section>

        <section className="platform-card overflow-hidden rounded-[1.7rem] shadow-sm">
          <div className="border-b border-[var(--platform-border)] p-5">
            <h2 className="text-lg font-black">Billing risk table</h2>
            <p className="mt-1 text-sm platform-muted">
              Showing {formatNumber(filteredBusinesses.length)} of{" "}
              {formatNumber(data?.count ?? filteredBusinesses.length)} loaded
              billing records.
              {page?.hasMore ? " More records are available." : ""}
            </p>
          </div>

          {filteredBusinesses.length ? (
            <div className="divide-y divide-[var(--platform-border)]">
              {filteredBusinesses.map((business) => {
                const subscription = business.subscription;
                const tone = subscriptionTone(business);

                return (
                  <div
                    key={business.id}
                    className="grid gap-5 p-5 transition hover:bg-[var(--platform-surface-soft)] xl:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/tenants/${business.id}`}
                          className="text-base font-black hover:text-[var(--platform-primary)]"
                        >
                          {business.name}
                        </Link>

                        <Badge tone={tone}>
                          {subscription?.health?.label ||
                            pretty(subscription?.status || "No subscription")}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm font-semibold platform-muted">
                        {business.email || "No email"} •{" "}
                        {business.phone || "No phone"}
                      </p>

                      <p className="mt-1 text-sm platform-muted">
                        {pretty(business.businessProfile?.shopType)} •{" "}
                        {business.businessProfile?.district || "No district"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-2">
                      <div className="rounded-2xl bg-[var(--platform-surface-soft)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                          Plan
                        </p>
                        <p className="mt-2 font-black">
                          {pretty(subscription?.planKey || subscription?.tierKey)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[var(--platform-surface-soft)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                          Cycle
                        </p>
                        <p className="mt-2 font-black">
                          {pretty(subscription?.cycleKey)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[var(--platform-surface-soft)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                          Amount
                        </p>
                        <p className="mt-2 font-black">
                          {formatMoney(
                            subscription?.priceAmount,
                            subscription?.currency || "RWF"
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[var(--platform-surface-soft)] p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] platform-muted">
                          Ends
                        </p>
                        <p className="mt-2 font-black">
                          {formatDate(subscription?.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:items-end">
                      <Badge tone={tone}>{pretty(subscription?.accessMode)}</Badge>

                      <Link
                        href={`/tenants/${business.id}`}
                        className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-black text-white transition hover:opacity-90"
                        style={{ background: "var(--platform-primary)" }}
                      >
                        Open business
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-sm font-bold platform-muted">
              No billing records found.
            </div>
          )}
        </section>
      </div>
    </ProtectedPlatformLayout>
  );
}
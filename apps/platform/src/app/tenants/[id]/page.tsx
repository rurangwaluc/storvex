"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  CalendarDays,
  CreditCard,
  MapPin,
  RefreshCcw,
  ShieldAlert,
  Store,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

import { AsyncButton } from "@/components/platform/async-button";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import { getStoredPlatformSession } from "@/lib/platform-auth";

type TenantStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

type SubscriptionAccessMode =
  | "TRIAL"
  | "ACTIVE"
  | "GRACE"
  | "READ_ONLY"
  | "SUSPENDED";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

type BusinessProfile = {
  shopType?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
};

type PlatformTenant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  platformStatus?: string;
  createdAt: string;
  businessProfile?: BusinessProfile;
};

type PlatformOwner = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type PlatformSubscription = {
  id: string;
  tenantId: string;
  status: string;
  accessMode: string;
  planKey?: string | null;
  tierKey?: string | null;
  cycleKey?: string | null;
  staffLimit?: number | null;
  branchLimit?: number | null;
  extraBranchCount?: number | null;
  priceAmount?: number | null;
  currency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  graceEndDate?: string | null;
  readOnlySince?: string | null;
  lastPaymentAt?: string | null;
  renewedAt?: string | null;
  createdAt?: string | null;
};

type PlatformUsage = {
  storeLocations?: number;
  users?: number;
  customers?: number;
  products?: number;
  sales?: number;
  repairs?: number;
  expenses?: number;
  suppliers?: number;
};

type PlatformStoreLocation = {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: string;
  status: string;
  phone?: string | null;
  email?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;
  isMain: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

type PlatformTeamMember = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type PlatformSale = {
  id: string;
  branchId?: string | null;
  createdAt: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  saleType: string;
  status: string;
  receiptNumber?: string | null;
  invoiceNumber?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  cashier?: {
    id: string;
    name: string;
    role: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    isMain: boolean;
    status: string;
  } | null;
};

type PlatformHealthIssue = {
  code: string;
  severity: string;
  message: string;
};

type PlatformTenantDetailResponse = {
  tenant: PlatformTenant;
  owner: PlatformOwner | null;
  subscription: PlatformSubscription | null;
  usage: PlatformUsage;
  health?: {
    status: string;
    issues: PlatformHealthIssue[];
  };
  storeLocations: PlatformStoreLocation[];
  teamMembers: PlatformTeamMember[];
  salesSummary?: {
    salesCount: number;
    totalSalesValue: number;
    totalPaid: number;
    totalOutstanding: number;
  };
  recentSales: PlatformSale[];
};

const TENANT_STATUSES: TenantStatus[] = ["PENDING", "ACTIVE", "SUSPENDED"];

const ACCESS_MODES: SubscriptionAccessMode[] = [
  "TRIAL",
  "ACTIVE",
  "GRACE",
  "READ_ONLY",
  "SUSPENDED",
];

function getPlatformApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_PLATFORM_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
}

function formatNumber(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function formatMoney(value: unknown, currency = "RWF") {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return `0 ${currency}`;

  return `${Math.round(n).toLocaleString()} ${currency}`;
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

function readableLabel(value: unknown) {
  const text = String(value || "—").trim();
  if (!text) return "—";

  return text.replaceAll("_", " ");
}

function toneClass(tone: Tone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
  }

  if (tone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300";
  }

  return "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";
}

function tenantStatusTone(status: string): Tone {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "danger";
  if (status === "PENDING") return "warning";

  return "neutral";
}

function subscriptionTone(subscription: PlatformSubscription | null): Tone {
  if (!subscription) return "danger";

  if (
    subscription.status === "SUSPENDED" ||
    subscription.accessMode === "SUSPENDED"
  ) {
    return "danger";
  }

  if (
    subscription.status === "EXPIRED" ||
    subscription.accessMode === "READ_ONLY"
  ) {
    return "warning";
  }

  if (subscription.accessMode === "TRIAL" || subscription.accessMode === "GRACE") {
    return "info";
  }

  return "success";
}

function issueTone(severity: string): Tone {
  if (severity === "danger") return "danger";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  if (severity === "success") return "success";

  return "neutral";
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold platform-muted">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-2 text-sm leading-5 platform-muted">{description}</p>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
      style={{ borderColor: "var(--platform-border)" }}
    >
      <p className="text-sm font-bold platform-muted">{label}</p>
      <p className="text-right text-sm font-black">{value || "—"}</p>
    </div>
  );
}

function TenantDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="platform-card h-44 animate-pulse rounded-[1.7rem]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="platform-card h-36 animate-pulse rounded-[1.5rem]" />
        <div className="platform-card h-36 animate-pulse rounded-[1.5rem]" />
        <div className="platform-card h-36 animate-pulse rounded-[1.5rem]" />
        <div className="platform-card h-36 animate-pulse rounded-[1.5rem]" />
      </div>
      <div className="platform-card h-96 animate-pulse rounded-[1.7rem]" />
    </div>
  );
}

export default function PlatformTenantDetailPage() {
  const params = useParams<{ id: string }>();
  const tenantId = params?.id || "";

  const [data, setData] = useState<PlatformTenantDetailResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tenantStatus, setTenantStatus] = useState<TenantStatus>("ACTIVE");
  const [accessMode, setAccessMode] =
    useState<SubscriptionAccessMode>("ACTIVE");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const tenant = data?.tenant || null;
  const owner = data?.owner || null;
  const subscription = data?.subscription || null;
  const usage = data?.usage || {};
  const storeLocations = data?.storeLocations || [];
  const teamMembers = data?.teamMembers || [];
  const recentSales = data?.recentSales || [];
  const salesSummary = data?.salesSummary || null;
  const healthIssues = data?.health?.issues || [];

  const currency =
    subscription?.currency || tenant?.businessProfile?.currencyCode || "RWF";

  const usageCards = useMemo(
    () => [
      {
        title: "Store locations",
        value: formatNumber(usage.storeLocations),
        description: "Selling locations linked to this business.",
        icon: Store,
      },
      {
        title: "Team members",
        value: formatNumber(usage.users),
        description: "Owner and staff accounts.",
        icon: Users,
      },
      {
        title: "Sales",
        value: formatNumber(usage.sales),
        description: "Sales records created by this business.",
        icon: CreditCard,
      },
      {
        title: "Products",
        value: formatNumber(usage.products),
        description: "Products currently known by the platform.",
        icon: Building2,
      },
    ],
    [usage.products, usage.sales, usage.storeLocations, usage.users]
  );

  useEffect(() => {
    const controller = new AbortController();
    const session = getStoredPlatformSession();

    if (!tenantId || !session?.token) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

      return () => controller.abort();
    }

    fetch(`${getPlatformApiBaseUrl()}/api/platform/tenants/${tenantId}`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | PlatformTenantDetailResponse
          | { message?: string }
          | null;

        if (!response.ok) {
          const message =
            payload && "message" in payload && payload.message
              ? payload.message
              : "Failed to load business detail.";

          throw new Error(message);
        }

        return payload as PlatformTenantDetailResponse;
      })
      .then((result) => {
        if (controller.signal.aborted) return;

        setData(result);
        setTenantStatus(String(result.tenant.status || "ACTIVE") as TenantStatus);

        if (result.subscription?.accessMode) {
          setAccessMode(
            String(result.subscription.accessMode) as SubscriptionAccessMode
          );
        }

        setError("");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Failed to load business detail."
        );
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [tenantId]);

  async function refreshTenantDetail() {
    const session = getStoredPlatformSession();

    if (!tenantId || !session?.token || isRefreshing) return;

    setIsRefreshing(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${getPlatformApiBaseUrl()}/api/platform/tenants/${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | PlatformTenantDetailResponse
        | { message?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload && payload.message
            ? payload.message
            : "Failed to refresh business detail.";

        throw new Error(message);
      }

      const result = payload as PlatformTenantDetailResponse;

      setData(result);
      setTenantStatus(String(result.tenant.status || "ACTIVE") as TenantStatus);

      if (result.subscription?.accessMode) {
        setAccessMode(String(result.subscription.accessMode) as SubscriptionAccessMode);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh business detail."
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function updateTenantStatus() {
    const session = getStoredPlatformSession();

    if (!tenantId || !session?.token || isSavingStatus) return;

    setIsSavingStatus(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${getPlatformApiBaseUrl()}/api/platform/tenants/${tenantId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: tenantStatus }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to update business status.");
      }

      setNotice("Business status updated.");
      await refreshTenantDetail();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update business status."
      );
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function updateSubscriptionAccess() {
    const session = getStoredPlatformSession();

    if (!tenantId || !session?.token || isSavingAccess) return;

    setIsSavingAccess(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${getPlatformApiBaseUrl()}/api/platform/tenants/${tenantId}/subscription/access-mode`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accessMode }),
        }
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message || "Failed to update subscription access."
        );
      }

      setNotice("Subscription access updated.");
      await refreshTenantDetail();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update subscription access."
      );
    } finally {
      setIsSavingAccess(false);
    }
  }

  return (
    <ProtectedPlatformLayout>
      {isLoading ? (
        <TenantDetailSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/tenants"
              className="inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition hover:opacity-80"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface)",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to businesses
            </Link>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={refreshTenantDetail}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AsyncButton>
          </div>

          {error ? (
            <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-[1.5rem] border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {notice}
            </div>
          ) : null}

          {tenant ? (
            <>
              <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                      Business detail
                    </p>

                    <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">
                      {tenant.name}
                    </h1>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                          tenantStatusTone(tenant.status)
                        )}`}
                      >
                        {readableLabel(tenant.status)}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                          subscriptionTone(subscription)
                        )}`}
                      >
                        {subscription
                          ? readableLabel(subscription.accessMode)
                          : "NO SUBSCRIPTION"}
                      </span>

                      {owner ? (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                            "success"
                          )}`}
                        >
                          OWNER LINKED
                        </span>
                      ) : (
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                            "danger"
                          )}`}
                        >
                          OWNER MISSING
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm platform-muted sm:grid-cols-2">
                      <p>{tenant.email || "—"}</p>
                      <p>{tenant.phone || "—"}</p>
                      <p>
                        {tenant.businessProfile?.district || "—"}{" "}
                        {tenant.businessProfile?.sector
                          ? `• ${tenant.businessProfile.sector}`
                          : ""}
                      </p>
                      <p>{tenant.businessProfile?.address || "—"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
                    <div
                      className="rounded-[1.25rem] border p-4"
                      style={{
                        borderColor: "var(--platform-border)",
                        background: "var(--platform-surface-soft)",
                      }}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
                        Business status
                      </p>

                      <div className="mt-3 flex gap-2">
                        <select
                          value={tenantStatus}
                          onChange={(event) =>
                            setTenantStatus(event.target.value as TenantStatus)
                          }
                          className="min-h-11 flex-1 rounded-2xl border px-3 text-sm font-bold outline-none"
                          style={{
                            borderColor: "var(--platform-border)",
                            background: "var(--platform-surface)",
                            color: "var(--platform-text)",
                          }}
                        >
                          {TENANT_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {readableLabel(status)}
                            </option>
                          ))}
                        </select>

                        <AsyncButton
                          type="button"
                          isLoading={isSavingStatus}
                          onClick={updateTenantStatus}
                        >
                          Save
                        </AsyncButton>
                      </div>
                    </div>

                    <div
                      className="rounded-[1.25rem] border p-4"
                      style={{
                        borderColor: "var(--platform-border)",
                        background: "var(--platform-surface-soft)",
                      }}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.16em] platform-muted">
                        Access mode
                      </p>

                      <div className="mt-3 flex gap-2">
                        <select
                          value={accessMode}
                          onChange={(event) =>
                            setAccessMode(
                              event.target.value as SubscriptionAccessMode
                            )
                          }
                          disabled={!subscription}
                          className="min-h-11 flex-1 rounded-2xl border px-3 text-sm font-bold outline-none disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            borderColor: "var(--platform-border)",
                            background: "var(--platform-surface)",
                            color: "var(--platform-text)",
                          }}
                        >
                          {ACCESS_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {readableLabel(mode)}
                            </option>
                          ))}
                        </select>

                        <AsyncButton
                          type="button"
                          isLoading={isSavingAccess}
                          disabled={!subscription}
                          onClick={updateSubscriptionAccess}
                        >
                          Save
                        </AsyncButton>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {usageCards.map((item) => (
                  <StatCard
                    key={item.title}
                    title={item.title}
                    value={item.value}
                    description={item.description}
                    icon={item.icon}
                  />
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <section className="space-y-6">
                  <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          background: "var(--platform-primary-soft)",
                          color: "var(--platform-primary)",
                        }}
                      >
                        <Users className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-lg font-black">Owner account</h2>
                        <p className="text-sm platform-muted">
                          Main business owner linked to this tenant.
                        </p>
                      </div>
                    </div>

                    {owner ? (
                      <div className="mt-5">
                        <DetailRow label="Name" value={owner.name} />
                        <DetailRow label="Email" value={owner.email} />
                        <DetailRow label="Phone" value={owner.phone} />
                        <DetailRow label="Role" value={readableLabel(owner.role)} />
                        <DetailRow
                          label="Status"
                          value={owner.isActive ? "Active" : "Inactive"}
                        />
                      </div>
                    ) : (
                      <div
                        className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${toneClass(
                          "danger"
                        )}`}
                      >
                        No owner account is linked to this business.
                      </div>
                    )}
                  </div>

                  <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          background: "var(--platform-primary-soft)",
                          color: "var(--platform-primary)",
                        }}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-lg font-black">Subscription</h2>
                        <p className="text-sm platform-muted">
                          Billing access and current plan details.
                        </p>
                      </div>
                    </div>

                    {subscription ? (
                      <div className="mt-5">
                        <DetailRow
                          label="Plan"
                          value={subscription.planKey || "—"}
                        />
                        <DetailRow
                          label="Tier"
                          value={subscription.tierKey || "—"}
                        />
                        <DetailRow
                          label="Cycle"
                          value={subscription.cycleKey || "—"}
                        />
                        <DetailRow
                          label="Price"
                          value={
                            subscription.priceAmount
                              ? formatMoney(subscription.priceAmount, currency)
                              : "—"
                          }
                        />
                        <DetailRow
                          label="Starts"
                          value={formatDate(subscription.startDate)}
                        />
                        <DetailRow
                          label="Ends"
                          value={formatDate(subscription.endDate)}
                        />
                        <DetailRow
                          label="Last payment"
                          value={formatDate(subscription.lastPaymentAt)}
                        />
                      </div>
                    ) : (
                      <div
                        className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${toneClass(
                          "danger"
                        )}`}
                      >
                        No subscription record is linked to this business.
                      </div>
                    )}
                  </div>

                  <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          background:
                            healthIssues.length > 0
                              ? "rgba(194, 65, 12, 0.12)"
                              : "var(--platform-primary-soft)",
                          color:
                            healthIssues.length > 0
                              ? "var(--platform-danger)"
                              : "var(--platform-primary)",
                        }}
                      >
                        <ShieldAlert className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-lg font-black">Platform health</h2>
                        <p className="text-sm platform-muted">
                          Issues detected by the backend.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {healthIssues.length ? (
                        healthIssues.map((issue) => (
                          <div
                            key={issue.code}
                            className={`rounded-2xl border p-4 text-sm font-bold ${toneClass(
                              issueTone(issue.severity)
                            )}`}
                          >
                            <p className="font-black">
                              {readableLabel(issue.code)}
                            </p>
                            <p className="mt-1">{issue.message}</p>
                          </div>
                        ))
                      ) : (
                        <div
                          className={`rounded-2xl border p-4 text-sm font-bold ${toneClass(
                            "success"
                          )}`}
                        >
                          No major platform health issue found.
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          background: "var(--platform-primary-soft)",
                          color: "var(--platform-primary)",
                        }}
                      >
                        <MapPin className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-lg font-black">Store locations</h2>
                        <p className="text-sm platform-muted">
                          Places where this business sells from.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {storeLocations.length ? (
                        storeLocations.map((location) => (
                          <div
                            key={location.id}
                            className="rounded-2xl border p-4"
                            style={{
                              borderColor: "var(--platform-border)",
                              background: "var(--platform-surface-soft)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-black">{location.name}</p>
                                <p className="mt-1 text-sm platform-muted">
                                  {location.code} • {readableLabel(location.type)}
                                </p>
                              </div>

                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                                  location.status === "ACTIVE"
                                    ? "success"
                                    : "warning"
                                )}`}
                              >
                                {readableLabel(location.status)}
                              </span>
                            </div>

                            <p className="mt-3 text-sm platform-muted">
                              {location.address ||
                                location.district ||
                                location.sector ||
                                "No location details provided."}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div
                          className={`rounded-2xl border p-4 text-sm font-bold ${toneClass(
                            "danger"
                          )}`}
                        >
                          No store location exists for this business.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          background: "var(--platform-primary-soft)",
                          color: "var(--platform-primary)",
                        }}
                      >
                        <Users className="h-5 w-5" />
                      </div>

                      <div>
                        <h2 className="text-lg font-black">Team members</h2>
                        <p className="text-sm platform-muted">
                          Active and inactive business users.
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-5 overflow-hidden rounded-2xl border"
                      style={{ borderColor: "var(--platform-border)" }}
                    >
                      {teamMembers.length ? (
                        teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="grid gap-2 border-b p-4 last:border-b-0 sm:grid-cols-[1fr_auto]"
                            style={{ borderColor: "var(--platform-border)" }}
                          >
                            <div>
                              <p className="text-sm font-black">{member.name}</p>
                              <p className="mt-1 text-sm platform-muted">
                                {member.email || "—"} • {member.phone || "—"}
                              </p>
                            </div>

                            <div className="sm:text-right">
                              <p className="text-sm font-black">
                                {readableLabel(member.role)}
                              </p>
                              <p className="mt-1 text-xs font-bold platform-muted">
                                {member.isActive ? "Active" : "Inactive"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-5 text-sm font-bold platform-muted">
                          No team member found.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <h2 className="text-lg font-black">Recent sales</h2>
                      <p className="text-sm platform-muted">
                        Latest sales activity for this business.
                      </p>
                    </div>
                  </div>

                  {salesSummary ? (
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div
                        className="rounded-2xl border px-4 py-3"
                        style={{ borderColor: "var(--platform-border)" }}
                      >
                        <p className="font-black">
                          {formatNumber(salesSummary.salesCount)}
                        </p>
                        <p className="platform-muted">Sales</p>
                      </div>

                      <div
                        className="rounded-2xl border px-4 py-3"
                        style={{ borderColor: "var(--platform-border)" }}
                      >
                        <p className="font-black">
                          {formatMoney(salesSummary.totalPaid, currency)}
                        </p>
                        <p className="platform-muted">Paid</p>
                      </div>

                      <div
                        className="rounded-2xl border px-4 py-3"
                        style={{ borderColor: "var(--platform-border)" }}
                      >
                        <p className="font-black">
                          {formatMoney(salesSummary.totalOutstanding, currency)}
                        </p>
                        <p className="platform-muted">Outstanding</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div
                  className="mt-5 overflow-hidden rounded-2xl border"
                  style={{ borderColor: "var(--platform-border)" }}
                >
                  {recentSales.length ? (
                    recentSales.slice(0, 10).map((sale) => (
                      <div
                        key={sale.id}
                        className="grid gap-3 border-b p-4 last:border-b-0 lg:grid-cols-[1fr_auto_auto]"
                        style={{ borderColor: "var(--platform-border)" }}
                      >
                        <div>
                          <p className="text-sm font-black">
                            {sale.receiptNumber || sale.invoiceNumber || sale.id}
                          </p>
                          <p className="mt-1 text-sm platform-muted">
                            {sale.customer?.name || "Walk-in customer"}{" "}
                            {sale.branch?.name ? `• ${sale.branch.name}` : ""}
                          </p>
                        </div>

                        <div className="lg:text-right">
                          <p className="text-sm font-black">
                            {formatMoney(sale.total, currency)}
                          </p>
                          <p className="mt-1 text-xs font-bold platform-muted">
                            Paid {formatMoney(sale.amountPaid, currency)}
                          </p>
                        </div>

                        <div className="lg:text-right">
                          <p className="text-sm font-black">
                            {readableLabel(sale.status)}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs font-bold platform-muted lg:justify-end">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(sale.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-5 text-sm font-bold platform-muted">
                      No recent sales found.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <div className="platform-card rounded-[1.7rem] p-6 text-sm font-bold platform-muted">
              Business detail was not found.
            </div>
          )}
        </div>
      )}
    </ProtectedPlatformLayout>
  );
}
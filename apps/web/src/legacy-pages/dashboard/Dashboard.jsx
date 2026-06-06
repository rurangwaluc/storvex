import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getWorkspaceContext } from "../../services/storeApi";
import { getTenantDashboard } from "../../services/dashboardApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";

const CARD = () =>
  "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";

const PANEL = () =>
  "rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

function money(value) {
  const n = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`;
}

function fmtDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function categoryLabel(value) {
  return (
    {
      ELECTRONICS_RETAIL: "Electronics store",
      PHONE_SHOP: "Phone shop",
      LAPTOP_SHOP: "Laptop shop",
      ACCESSORIES_SHOP: "Accessories shop",
      REPAIR_SHOP: "Repair shop",
      MIXED_ELECTRONICS: "Mixed electronics shop",
    }[value] ||
    value ||
    "Not set"
  );
}

function statusTone(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("active") || text.includes("paid") || text.includes("trial")) {
    return "success";
  }

  if (text.includes("expire") || text.includes("pending")) {
    return "warning";
  }

  if (text.includes("blocked") || text.includes("failed")) {
    return "danger";
  }

  return "neutral";
}

function firstWord(value) {
  return String(value || "").trim().split(/\s+/)[0] || "there";
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

function readCachedWorkspace() {
  try {
    const session = sessionStorage.getItem(WORKSPACE_CACHE_KEY);
    if (session) return JSON.parse(session);
  } catch {}

  try {
    const local = localStorage.getItem(WORKSPACE_CACHE_KEY);
    if (local) return JSON.parse(local);
  } catch {}

  return null;
}

function Badge({ children, tone = "neutral" }) {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    info: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em]",
        styles[tone] || styles.neutral,
      )}
    >
      {children}
    </span>
  );
}

function SectionHeader({ eyebrow, title, text, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[var(--color-text)] sm:text-2xl">
          {title}
        </h2>

        {text ? (
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {text}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function DetailTile({ label, value, strong = false }) {
  return (
    <div className={cn(PANEL(), "p-4")}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <p
        className={cn(
          "mt-2 break-words font-black text-[var(--color-text)]",
          strong ? "text-lg tracking-[-0.03em]" : "text-sm",
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function KpiCard({ label, value, note, tone = "info" }) {
  const dotStyles = {
    success: "bg-emerald-500",
    info: "bg-[var(--color-primary)]",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-[var(--color-text-muted)]",
  };

  return (
    <article className={cn(CARD(), "overflow-hidden p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {label}
          </p>

          <div className="mt-4 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl">
            {value}
          </div>
        </div>

        <span
          className={cn(
            "mt-1 h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_6px_var(--color-primary-soft)]",
            dotStyles[tone] || dotStyles.info,
          )}
        />
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {note}
      </p>
    </article>
  );
}

function MiniBarChart({ monthlyRevenue = 0 }) {
  const seed = Math.max(1, Math.round(Number(monthlyRevenue || 0) / 100000));
  const values = [38, 64, 48, 82, 56, 90, 42].map((value, index) => {
    const adjusted = (value + seed * (index + 2)) % 95;
    return Math.max(28, adjusted);
  });

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const day = new Date().getDay();
  const todayIndex = day === 0 ? 6 : day - 1;

  return (
    <div className="mt-6">
      <div className="flex h-[120px] items-end gap-2">
        {values.map((value, index) => (
          <div key={days[index]} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-[92px] w-full items-end">
              <div
                className={cn(
                  "w-full rounded-t-2xl transition-all",
                  index === todayIndex
                    ? "bg-[var(--color-primary)]"
                    : "bg-[var(--color-card)]",
                )}
                style={{ height: `${value}%` }}
              />
            </div>

            <div
              className={cn(
                "text-[10px] font-black",
                index === todayIndex
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              {days[index]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({ subscription }) {
  const daysLeft = Number(subscription?.daysLeft ?? 0);
  const totalDays = Number(subscription?.totalDays ?? 0);

  const percent =
    daysLeft > 0 && totalDays > 0
      ? Math.max(0, Math.min(100, (daysLeft / totalDays) * 100))
      : subscription
        ? 100
        : 0;

  const tone = statusTone(subscription?.label || subscription?.status);

  return (
    <section className={cn(CARD(), "p-5 sm:p-6")}>
      <SectionHeader
        eyebrow="Access"
        title="Subscription"
        text="Commercial access and renewal status."
        action={subscription ? <Badge tone={tone}>{subscription.label || "Active"}</Badge> : null}
      />

      {subscription ? (
        <div className={cn(PANEL(), "p-5")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-black text-[var(--color-text)]">
                {subscription.planKey || "Current plan"}
              </p>

              <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                {subscription.detail || "Your store access is active."}
              </p>
            </div>

            {subscription.endDate ? (
              <div className="shrink-0 rounded-2xl bg-[var(--color-card)] px-4 py-3 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)]">
                {daysLeft > 0 ? `${daysLeft} days left` : "Renewal needed"}
              </div>
            ) : null}
          </div>

          {subscription.endDate ? (
            <>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--color-card)]">
                <div
                  className={cn(
                    "h-full rounded-full",
                    percent > 40
                      ? "bg-emerald-500"
                      : percent > 15
                        ? "bg-amber-500"
                        : "bg-red-500",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-[var(--color-text-muted)]">
                <span>Renews {fmtDate(subscription.endDate)}</span>
                <span>{Math.round(percent)}%</span>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <div className={cn(PANEL(), "p-5 text-sm font-semibold text-[var(--color-text-muted)]")}>
          No subscription information found.
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <AsyncButton loading={false} as={Link} to="/app/billing" className="w-full sm:w-auto">
          Open billing
        </AsyncButton>

        <AsyncButton
          loading={false}
          variant="secondary"
          as={Link}
          to="/renew"
          className="w-full sm:w-auto"
        >
          Renew access
        </AsyncButton>
      </div>
    </section>
  );
}

function QuickAction({ label, to, emoji, primary = false }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-[92px] flex-col justify-between rounded-[26px] border p-4 transition hover:-translate-y-0.5",
        primary
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-card)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:border-[var(--color-primary)]",
      )}
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-sm font-black">{label}</span>
    </Link>
  );
}

function LowStockRow({ item }) {
  const qty = Number(item?.stockQty ?? 0);
  const tone = qty <= 0 ? "danger" : "warning";

  return (
    <div className={cn(PANEL(), "flex items-center justify-between gap-4 px-4 py-3")}>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[var(--color-text)]">
          {item?.name || "Product"}
        </p>

        <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-muted)]">
          {[item?.category, item?.subcategory].filter(Boolean).join(" • ") || "No category"}
        </p>
      </div>

      <Badge tone={tone}>{qty} left</Badge>
    </div>
  );
}

function ActivityRow({ item }) {
  return (
    <div className={cn(PANEL(), "flex gap-3 px-4 py-3")}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-card)] text-base shadow-[var(--shadow-soft)]">
        ✓
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[var(--color-text)]" title={item?.action}>
          {item?.action || "Activity"}
        </p>

        <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-muted)]">
          {[item?.entity || "Record", item?.performedBy, fmtDate(item?.createdAt)]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cn(PANEL(), "px-5 py-8 text-center")}>
      <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">{text}</p>
    </div>
  );
}

export default function Dashboard() {
  const [workspace, setWorkspace] = useState(() => readCachedWorkspace());
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

async function loadDashboard({ quiet = false } = {}) {
  if (!quiet && !dashboard) setLoading(true);

  try {
    const dashboardData = await getTenantDashboard();
    setDashboard(dashboardData || null);

    const cachedWorkspace = readCachedWorkspace();
    if (cachedWorkspace) setWorkspace(cachedWorkspace);
  } catch (error) {
    console.error("Dashboard load failed:", error);
    toast.error("Failed to load dashboard");
  } finally {
    if (!quiet) setLoading(false);
  }
}

  useEffect(() => {
  let active = true;

  async function run() {
    if (!dashboard) setLoading(true);

    try {
      const dashboardData = await getTenantDashboard();

      if (!active) return;

      setDashboard(dashboardData || null);

      const cachedWorkspace = readCachedWorkspace();
      if (cachedWorkspace) setWorkspace(cachedWorkspace);
    } catch (error) {
      console.error("Dashboard load failed:", error);
      if (active) toast.error("Failed to load dashboard");
    } finally {
      if (active) setLoading(false);
    }
  }

  run();

  return () => {
    active = false;
  };
}, []);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadDashboard({ quiet: true });
      toast.success("Dashboard refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  const tenant = dashboard?.tenant || workspace?.tenant || {};
  const subscription = dashboard?.subscriptionSummary || null;
  const setupSummary = workspace?.setupChecklistSummary || null;
  const readiness = setupSummary?.summary || {};

  const missing = Array.isArray(readiness?.missingRequiredKeys)
    ? readiness.missingRequiredKeys
    : [];

  const lowStock = safeList(dashboard?.lowStockProducts).slice(0, 10);
  const activity = safeList(dashboard?.recentAudit).slice(0, 10);

  const tenantName = tenant?.name || workspace?.name || "Your store";
  const firstName = firstWord(tenantName);
  const location = [tenant?.district, tenant?.sector].filter(Boolean).join(" • ");
  const readinessPercent = readiness?.readinessPercent ?? setupSummary?.readinessPercent ?? 0;

  const kpis = useMemo(
    () => [
      {
        label: "Today sales",
        value: money(dashboard?.todaySales),
        note: "Money recorded today.",
        tone: "success",
      },
      {
        label: "Monthly revenue",
        value: money(dashboard?.monthlyRevenue),
        note: `${dashboard?.productCount ?? 0} products tracked.`,
        tone: "info",
      },
      {
        label: "Pending sales",
        value: String(dashboard?.pendingDeals ?? 0),
        note: "Sales still needing attention.",
        tone: Number(dashboard?.pendingDeals || 0) > 0 ? "warning" : "success",
      },
      {
        label: "Active repairs",
        value: String(dashboard?.activeRepairs ?? 0),
        note: "Items currently in service.",
        tone: "neutral",
      },
    ],
    [dashboard],
  );

  if (loading && !workspace && !dashboard) {
  return <PageSkeleton variant="dashboard" />;
}

  return (
    <div className="space-y-6">
      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <span className="truncate">
                {location || "Store workspace"} • {todayLabel()}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              {greeting()}, {firstName}.
            </h1>

            <p className="mt-3 max-w-3xl text-base font-semibold leading-8 text-[var(--color-text-muted)]">
              Here is today’s business picture: sales, money, stock alerts, customer follow-up,
              subscription, and recent activity.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
            <AsyncButton
              loading={refreshing}
              loadingText="Refreshing..."
              variant="secondary"
              onClick={handleRefresh}
              className="w-full sm:w-auto"
            >
              Refresh
            </AsyncButton>

            <AsyncButton loading={false} as={Link} to="/app/pos" className="w-full sm:w-auto">
              New sale
            </AsyncButton>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Store" value={tenantName} strong />
          <DetailTile label="Type" value={categoryLabel(tenant?.shopType)} />
          <DetailTile label="Logo" value={tenant?.logoUrl ? "Configured" : "Missing"} />
          <DetailTile label="Readiness" value={`${readinessPercent}% ready`} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <SectionHeader
          eyebrow="Money"
          title="Revenue view"
          text="A simple weekly picture based on the current monthly revenue."
          action={<Badge tone="info">Today highlighted</Badge>}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={cn(PANEL(), "p-5")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  This month
                </p>

                <p className="mt-2 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl">
                  {money(dashboard?.monthlyRevenue)}
                </p>

                <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  Total recorded revenue this month.
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-2xl shadow-[var(--shadow-soft)]">
                📈
              </div>
            </div>

            <MiniBarChart monthlyRevenue={dashboard?.monthlyRevenue} />
          </div>

          <div className="grid gap-3">
            <DetailTile label="Today" value={money(dashboard?.todaySales)} strong />
            <DetailTile label="Pending sales" value={String(dashboard?.pendingDeals ?? 0)} />
            <DetailTile label="Products" value={String(dashboard?.productCount ?? 0)} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <SubscriptionCard subscription={subscription} />

        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Setup"
            title="Operational readiness"
            text="Items that affect the quality of daily store work."
            action={
              <Badge
                tone={
                  readiness?.isOperationallyReady || setupSummary?.isOperationallyReady
                    ? "success"
                    : "warning"
                }
              >
                {readinessPercent}% ready
              </Badge>
            }
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <DetailTile label="Low stock" value={String(dashboard?.lowStockCount ?? 0)} />
            <DetailTile label="Out of stock" value={String(dashboard?.outOfStockCount ?? 0)} />
            <DetailTile label="Repairs" value={String(dashboard?.activeRepairs ?? 0)} />
          </div>

          {missing.length ? (
            <div className={cn(PANEL(), "mt-4 p-4")}>
              <p className="text-sm font-black text-[var(--color-text)]">Still missing</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {missing.slice(0, 10).map((item) => (
                  <Badge key={item} tone="warning">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className={cn(PANEL(), "mt-4 p-5 text-sm font-semibold text-[var(--color-text-muted)]")}>
              Setup looks ready for normal daily work.
            </div>
          )}
        </section>
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <SectionHeader
          eyebrow="Actions"
          title="Quick actions"
          text="The most common owner and staff actions."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <QuickAction label="New sale" to="/app/pos" emoji="🛍️" primary />
          <QuickAction label="Inventory" to="/app/inventory" emoji="📦" />
          <QuickAction label="Customers" to="/app/customers" emoji="👤" />
          <QuickAction label="Documents" to="/app/documents" emoji="📄" />
          <QuickAction label="Reports" to="/app/reports" emoji="📊" />
          <QuickAction label="WhatsApp" to="/app/whatsapp" emoji="💬" />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Inventory"
            title="Low stock"
            text="Top products that need attention."
            action={
              <AsyncButton
                loading={false}
                variant="secondary"
                as={Link}
                to="/app/inventory"
                className="h-10 px-4 text-sm"
              >
                Open inventory
              </AsyncButton>
            }
          />

          {!lowStock.length ? (
            <EmptyState title="No low stock alerts" text="Stock looks healthy right now." />
          ) : (
            <div className="space-y-2">
              {lowStock.map((item) => (
                <LowStockRow key={item.id || item.name} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Activity"
            title="Recent activity"
            text="Latest actions recorded in the store."
          />

          {!activity.length ? (
            <EmptyState title="No recent activity" text="New activity will appear here." />
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <ActivityRow key={item.id || `${item.action}-${item.createdAt}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
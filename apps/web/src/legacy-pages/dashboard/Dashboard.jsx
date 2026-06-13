import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";

import { getWorkspaceContext } from "../../services/storeApi";
import { getTenantDashboard } from "../../services/dashboardApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

const CARD =
  "rounded-[26px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const PANEL =
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
const SOFT_PANEL =
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-soft)]";

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
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function firstWord(value) {
  return String(value || "").trim().split(/\s+/)[0] || "there";
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

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

function categoryLabel(value) {
  return (
    {
      ELECTRONICS: "Electronics store",
      ELECTRONICS_RETAIL: "Electronics store",
      PHONE_SHOP: "Phone shop",
      LAPTOP_SHOP: "Laptop shop",
      ACCESSORIES_SHOP: "Accessories shop",
      REPAIR_SHOP: "Repair shop",
      MIXED_ELECTRONICS: "Mixed electronics shop",
      HARDWARE: "Hardware store",
      HOME_KITCHEN: "Home & kitchen store",
      LIGHTING: "Lighting store",
      SPARE_PARTS: "Spare parts store",
    }[value] ||
    value ||
    "Retail store"
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
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
        styles[tone] || styles.neutral,
      )}
    >
      {children}
    </span>
  );
}

function IconShell({ children, tone = "info" }) {
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
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
        styles[tone] || styles.info,
      )}
    >
      {children}
    </span>
  );
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-primary)]">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--color-text)]">
          {title}
        </h2>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone = "info" }) {
  return (
    <article className={cn(CARD, "min-h-[138px] p-5")}>
      <div className="flex items-start justify-between gap-3">
        <IconShell tone={tone}>
          <Icon size={20} strokeWidth={2.4} />
        </IconShell>

        <span
          className={cn(
            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
            tone === "success" && "bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]",
            tone === "warning" && "bg-amber-500 shadow-[0_0_0_6px_rgba(245,158,11,0.12)]",
            tone === "danger" && "bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.12)]",
            tone === "neutral" &&
              "bg-[var(--color-text-muted)] shadow-[0_0_0_6px_var(--color-surface-2)]",
            tone === "info" &&
              "bg-[var(--color-primary)] shadow-[0_0_0_6px_var(--color-primary-soft)]",
          )}
        />
      </div>

      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black tracking-[-0.055em] text-[var(--color-text)] xl:text-3xl">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-text-muted)]">
        {note}
      </p>
    </article>
  );
}

function CompactStat({ label, value, tone = "neutral" }) {
  return (
    <div className={cn(PANEL, "p-4")}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-lg font-black tracking-[-0.035em] text-[var(--color-text)]",
          tone === "danger" && "text-red-600",
          tone === "warning" && "text-amber-600",
          tone === "success" && "text-emerald-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RevenueChart({ monthlyRevenue = 0 }) {
  const seed = Math.max(1, Math.round(Number(monthlyRevenue || 0) / 100000));
  const pointList = [34, 48, 42, 63, 54, 72, 61, 84].map((item, index) => {
    const y = 118 - Math.max(22, Math.min(98, item + ((seed + index) % 8)));
    const x = 18 + index * 54;

    return { x, y, point: `${x},${y}` };
  });
  const points = pointList.map((item) => item.point).join(" ");

  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <svg viewBox="0 0 420 150" className="h-[210px] w-full" role="img" aria-label="Sales overview">
        <defs>
          <linearGradient id="storvexRevenueFillDashboard" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[32, 62, 92, 122].map((y) => (
          <line
            key={y}
            x1="12"
            x2="408"
            y1={y}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}

        <polygon points={`18,140 ${points} 396,140`} fill="url(#storvexRevenueFillDashboard)" />

        <polyline
          points={points}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pointList.map((item, index) => (
          <circle
            key={item.point}
            cx={item.x}
            cy={item.y}
            r={index === pointList.length - 1 ? "6" : "4.5"}
            fill="var(--color-primary)"
            stroke="var(--color-surface-2)"
            strokeWidth="3"
          />
        ))}
      </svg>

      <div className="grid grid-cols-4 gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)] sm:grid-cols-8">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Now"].map((day) => (
          <span key={day} className="text-center">
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProductRow({ item, index }) {
  const qty = Number(item?.stockQty ?? item?.quantity ?? 0);
  const tone = qty <= 0 ? "danger" : qty <= 2 ? "warning" : "success";

  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--color-surface-2)] px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-card)] text-xs font-black text-[var(--color-primary)]">
          {String(index + 1).padStart(2, "0")}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">
            {item?.name || "Product"}
          </p>
          <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-text-muted)]">
            {[item?.category, item?.subcategory].filter(Boolean).join(" · ") || "Stock item"}
          </p>
        </div>
      </div>

      <Badge tone={tone}>{qty} left</Badge>
    </div>
  );
}

function FocusItem({ icon: Icon, title, text, tone = "info", to, action }) {
  const buttonStyles = {
    success: "border-emerald-500/30 text-emerald-600 hover:border-emerald-500",
    warning: "border-amber-500/30 text-amber-600 hover:border-amber-500",
    danger: "border-red-500/30 text-red-600 hover:border-red-500",
    info: "border-[var(--color-primary-ring)] text-[var(--color-primary)] hover:border-[var(--color-primary)]",
    neutral: "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
  };

  return (
    <div className="flex gap-3 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
      <IconShell tone={tone}>
        <Icon size={19} strokeWidth={2.4} />
      </IconShell>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-text-muted)]">
              {text}
            </p>
          </div>

          {to ? (
            <Link
              to={to}
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center rounded-xl border bg-[var(--color-card)] px-3 text-[11px] font-black transition",
                buttonStyles[tone] || buttonStyles.info,
              )}
            >
              {action || "Open"}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-[var(--color-surface-2)] px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
        <CheckCircle2 size={17} strokeWidth={2.6} />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[var(--color-text)]" title={item?.action}>
          {item?.action || "Activity"}
        </p>
        <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-text-muted)]">
          {[item?.entity || "Record", fmtDate(item?.createdAt)].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function QuickAction({ label, to, icon: Icon, primary = false }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-[84px] flex-col justify-between rounded-[22px] border p-4 transition hover:-translate-y-0.5",
        primary
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-card)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:border-[var(--color-primary)]",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-2xl",
          primary ? "bg-white/15 text-white" : "bg-[var(--color-card)] text-[var(--color-primary)]",
        )}
      >
        <Icon size={18} strokeWidth={2.4} />
      </span>

      <span className="text-sm font-black">{label}</span>
    </Link>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-8 text-center">
      <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
      <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">{text}</p>
    </div>
  );
}

function SubscriptionPanel({ subscription }) {
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
    <section className={cn(CARD, "p-5")}>
      <SectionTitle
        eyebrow="Access"
        title="Subscription"
        action={subscription ? <Badge tone={tone}>{subscription.label || "Active"}</Badge> : null}
      />

      {subscription ? (
        <div className={cn(PANEL, "p-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-black text-[var(--color-text)]">
                {subscription.planKey || "Current plan"}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-text-muted)]">
                {subscription.endDate
                  ? `Renews ${fmtDate(subscription.endDate)}`
                  : "Store access is active."}
              </p>
            </div>

            {subscription.endDate ? (
              <div className="rounded-2xl bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text)]">
                {daysLeft > 0 ? `${daysLeft} days left` : "Renew now"}
              </div>
            ) : null}
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--color-card)]">
            <div
              className={cn(
                "h-full rounded-full",
                percent > 40 ? "bg-emerald-500" : percent > 15 ? "bg-amber-500" : "bg-red-500",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <AsyncButton
              loading={false}
              as={Link}
              to="/app/billing"
              className="h-10 w-full sm:w-auto"
            >
              Open billing
            </AsyncButton>
            <AsyncButton
              loading={false}
              variant="secondary"
              as={Link}
              to="/renew"
              className="h-10 w-full sm:w-auto"
            >
              Renew
            </AsyncButton>
          </div>
        </div>
      ) : (
        <EmptyState title="No subscription information" text="Billing details will appear here." />
      )}
    </section>
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
      const [dashboardData, workspaceData] = await Promise.allSettled([
        getTenantDashboard(),
        getWorkspaceContext(),
      ]);

      if (dashboardData.status === "fulfilled") {
        setDashboard(dashboardData.value || null);
      }

      if (workspaceData.status === "fulfilled" && workspaceData.value) {
        setWorkspace(workspaceData.value);

        try {
          sessionStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspaceData.value));
          localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspaceData.value));
        } catch {}
      } else {
        const cachedWorkspace = readCachedWorkspace();
        if (cachedWorkspace) setWorkspace(cachedWorkspace);
      }

      if (dashboardData.status === "rejected") {
        throw dashboardData.reason;
      }
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
        const [dashboardData, workspaceData] = await Promise.allSettled([
          getTenantDashboard(),
          getWorkspaceContext(),
        ]);

        if (!active) return;

        if (dashboardData.status === "fulfilled") {
          setDashboard(dashboardData.value || null);
        }

        if (workspaceData.status === "fulfilled" && workspaceData.value) {
          setWorkspace(workspaceData.value);

          try {
            sessionStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspaceData.value));
            localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspaceData.value));
          } catch {}
        } else {
          const cachedWorkspace = readCachedWorkspace();
          if (cachedWorkspace) setWorkspace(cachedWorkspace);
        }

        if (dashboardData.status === "rejected") {
          throw dashboardData.reason;
        }
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

  const tenant = dashboard?.tenant || workspace?.tenant || workspace?.business || {};
  const subscription = dashboard?.subscriptionSummary || null;
  const setupSummary = workspace?.setupChecklistSummary || null;
  const readiness = setupSummary?.summary || {};
  const missing = Array.isArray(readiness?.missingRequiredKeys)
    ? readiness.missingRequiredKeys
    : [];

  const tenantName = tenant?.name || workspace?.name || "Your store";
  const firstName = firstWord(tenantName);
  const businessCategory = tenant?.businessCategory || tenant?.category || tenant?.shopType;
  const location = [tenant?.district, tenant?.sector].filter(Boolean).join(" · ");
  const readinessPercent = readiness?.readinessPercent ?? setupSummary?.readinessPercent ?? 0;

  const lowStock = safeList(dashboard?.lowStockProducts).slice(0, 4);
  const activity = safeList(dashboard?.recentAudit).slice(0, 4);

  const todaySales = Number(dashboard?.todaySales || 0);
  const monthlyRevenue = Number(dashboard?.monthlyRevenue || 0);
  const pendingDeals = Number(dashboard?.pendingDeals || 0);
  const activeRepairs = Number(dashboard?.activeRepairs || 0);
  const lowStockCount = Number(dashboard?.lowStockCount || lowStock.length || 0);
  const outOfStockCount = Number(dashboard?.outOfStockCount || 0);
  const productCount = Number(dashboard?.productCount || 0);

  const marketplace = dashboard?.marketplace || dashboard?.marketplaceSummary || {};
  const marketplacePublished = Number(marketplace?.publishedCount || 0);
  const marketplaceDrafts = Number(marketplace?.draftCount || 0);
  const marketplaceMissingImages = Number(marketplace?.missingImagesCount || 0);

  const focusItems = useMemo(() => {
    const items = [];

    if (lowStockCount > 0 || outOfStockCount > 0) {
      items.push({
        icon: AlertTriangle,
        tone: outOfStockCount > 0 ? "danger" : "warning",
        title: "Stock needs review",
        text:
          outOfStockCount > 0
            ? `${outOfStockCount} product${outOfStockCount === 1 ? "" : "s"} out of stock. Hide unavailable marketplace products.`
            : `${lowStockCount} product${lowStockCount === 1 ? "" : "s"} running low.`,
        action: "Open stock",
        to: "/app/inventory",
      });
    }

    if (marketplaceMissingImages > 0) {
      items.push({
        icon: PackageCheck,
        tone: "warning",
        title: "Products need images",
        text: `${marketplaceMissingImages} marketplace product${marketplaceMissingImages === 1 ? "" : "s"} missing images.`,
        action: "Add images",
        to: "/app/inventory",
      });
    }

    if (pendingDeals > 0) {
      items.push({
        icon: ClipboardList,
        tone: "warning",
        title: "Pending sales",
        text: `${pendingDeals} sale${pendingDeals === 1 ? "" : "s"} still need follow-up.`,
        action: "Review sales",
        to: "/app/sales",
      });
    }

    if (activeRepairs > 0) {
      items.push({
        icon: Wrench,
        tone: "info",
        title: "Open repairs",
        text: `${activeRepairs} repair item${activeRepairs === 1 ? "" : "s"} currently in service.`,
        action: "Open repairs",
        to: "/app/repairs",
      });
    }

    if (subscription && Number(subscription?.daysLeft || 0) > 0 && Number(subscription?.daysLeft || 0) <= 15) {
      items.push({
        icon: CreditCard,
        tone: "warning",
        title: "Renewal is close",
        text: `${subscription.daysLeft} day${subscription.daysLeft === 1 ? "" : "s"} left before renewal.`,
        action: "Billing",
        to: "/app/billing",
      });
    }

    if (!productCount) {
      items.push({
        icon: Boxes,
        tone: "info",
        title: "Add products",
        text: "Create stock first so sales, reports, and marketplace visibility become useful.",
        action: "Inventory",
        to: "/app/inventory",
      });
    }

    if (!items.length) {
      items.push({
        icon: CheckCircle2,
        tone: "success",
        title: "No urgent action",
        text: "Sales, stock, marketplace, and access look calm for now.",
        action: null,
        to: null,
      });
    }

    return items.slice(0, 3);
  }, [
    activeRepairs,
    lowStockCount,
    marketplaceMissingImages,
    outOfStockCount,
    pendingDeals,
    productCount,
    subscription,
  ]);

  const metrics = useMemo(
    () => [
      {
        label: "Today sales",
        value: money(todaySales),
        note: todaySales > 0 ? "Money recorded today" : "No sales yet today",
        icon: BarChart3,
        tone: todaySales > 0 ? "success" : "neutral",
      },
      {
        label: "Monthly revenue",
        value: money(monthlyRevenue),
        note: "Recorded this month",
        icon: CreditCard,
        tone: "info",
      },
      {
        label: "Pending sales",
        value: String(pendingDeals),
        note: pendingDeals > 0 ? "Needs follow-up" : "No pending sales",
        icon: ClipboardList,
        tone: pendingDeals > 0 ? "warning" : "success",
      },
      {
        label: "Stock alerts",
        value: String(lowStockCount + outOfStockCount),
        note: lowStockCount + outOfStockCount > 0 ? "Needs review" : "Stock looks calm",
        icon: Boxes,
        tone: lowStockCount + outOfStockCount > 0 ? "warning" : "success",
      },
      {
        label: "Marketplace",
        value: String(marketplacePublished),
        note: marketplacePublished > 0 ? "Products live" : "Nothing published",
        icon: ShoppingCart,
        tone: marketplacePublished > 0 ? "success" : "neutral",
      },
    ],
    [
      lowStockCount,
      marketplacePublished,
      monthlyRevenue,
      outOfStockCount,
      pendingDeals,
      todaySales,
    ],
  );

  if (loading && !workspace && !dashboard) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] xl:text-4xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-2 text-sm font-bold text-[var(--color-text-muted)]">
            Here is what is happening in your store today.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className={cn(SOFT_PANEL, "flex h-12 items-center gap-3 px-4 text-sm font-black text-[var(--color-text)]")}>
            <CalendarDays size={18} className="text-[var(--color-primary)]" />
            {todayLabel()}
          </div>

          <AsyncButton
            loading={refreshing}
            loadingText="Refreshing..."
            variant="secondary"
            onClick={handleRefresh}
            className="h-12 w-full sm:w-auto"
          >
            <RefreshCw size={16} />
            Refresh
          </AsyncButton>

          <AsyncButton loading={false} as={Link} to="/app/pos" className="h-12 w-full sm:w-auto">
            <ShoppingBag size={16} />
            New sale
          </AsyncButton>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.1fr)_350px_430px]">
        <section className={cn(CARD, "p-5")}>
          <SectionTitle
            eyebrow="Sales"
            title="Sales overview"
            action={<Badge tone="info">This week</Badge>}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <CompactStat label="Today" value={money(todaySales)} />
            <CompactStat label="This month" value={money(monthlyRevenue)} />
            <CompactStat label="Pending" value={String(pendingDeals)} tone={pendingDeals ? "warning" : "success"} />
          </div>

          <RevenueChart monthlyRevenue={monthlyRevenue} />
        </section>

        <section className={cn(CARD, "p-5")}>
          <SectionTitle
            eyebrow="Stock"
            title="Products to watch"
            action={
              <Link
                to="/app/inventory"
                className="text-xs font-black text-[var(--color-primary)]"
              >
                View all
              </Link>
            }
          />

          {!lowStock.length ? (
            <EmptyState title="No low stock alerts" text="Stock looks healthy right now." />
          ) : (
            <div className="space-y-3">
              {lowStock.map((item, index) => (
                <ProductRow key={item.id || item.name} item={item} index={index} />
              ))}
            </div>
          )}
        </section>

        <section className={cn(CARD, "p-5")}>
          <SectionTitle eyebrow="Focus" title="What you should act on" />

          <div className="space-y-3">
            {focusItems.map((item) => (
              <FocusItem key={item.title} {...item} />
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.85fr)_minmax(360px,0.7fr)]">
        <section className={cn(CARD, "p-5")}>
          <SectionTitle
            eyebrow="Marketplace"
            title="Marketplace readiness"
            action={<Badge tone={marketplacePublished > 0 ? "success" : "neutral"}>{marketplacePublished} live</Badge>}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <CompactStat label="Published" value={String(marketplacePublished)} tone={marketplacePublished ? "success" : "neutral"} />
            <CompactStat label="Drafts" value={String(marketplaceDrafts)} />
            <CompactStat label="Missing images" value={String(marketplaceMissingImages)} tone={marketplaceMissingImages ? "warning" : "success"} />
          </div>

          <div className="mt-4 rounded-[22px] bg-[var(--color-surface-2)] p-4">
            <p className="text-sm font-black text-[var(--color-text)]">Owner controls visibility</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-text-muted)]">
              Stock stays private until you add images, review the public details, and choose what appears on the marketplace.
            </p>
          </div>
        </section>

        <SubscriptionPanel subscription={subscription} />

        <section className={cn(CARD, "p-5")}>
          <SectionTitle eyebrow="Activity" title="Recent activity" />

          {!activity.length ? (
            <EmptyState title="No recent activity" text="New activity will appear here." />
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <ActivityRow key={item.id || `${item.action}-${item.createdAt}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className={cn(CARD, "p-5")}>
        <SectionTitle eyebrow="Actions" title="Quick actions" />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <QuickAction label="New sale" to="/app/pos" icon={ShoppingBag} primary />
          <QuickAction label="Inventory" to="/app/inventory" icon={Boxes} />
          <QuickAction label="Customers" to="/app/customers" icon={Users} />
          <QuickAction label="Documents" to="/app/documents" icon={FileText} />
          <QuickAction label="Reports" to="/app/reports" icon={BarChart3} />
          <QuickAction label="WhatsApp" to="/app/whatsapp" icon={MessageCircle} />
        </div>
      </section>

      {missing.length ? (
        <section className={cn(CARD, "p-5")}>
          <SectionTitle
            eyebrow="Setup"
            title="Operational readiness"
            action={<Badge tone="warning">{readinessPercent}% ready</Badge>}
          />

          <div className="flex flex-wrap gap-2">
            {missing.slice(0, 10).map((item) => (
              <Badge key={item} tone="warning">
                {item}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <section className="sr-only" aria-label="Store summary">
        <p>{tenantName}</p>
        <p>{categoryLabel(businessCategory)}</p>
        <p>{location}</p>
      </section>
    </div>
  );
}

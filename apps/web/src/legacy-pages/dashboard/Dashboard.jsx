import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Image,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { getWorkspaceContext } from "../../services/storeApi";
import { getTenantDashboard } from "../../services/dashboardApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";
const CARD =
  "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const INNER =
  "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  const n = numberValue(value);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`;
}

function compactMoney(value) {
  const n = numberValue(value);

  if (Math.abs(n) >= 1000000) return `Rwf ${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `Rwf ${(n / 1000).toFixed(0)}K`;

  return money(n);
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

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function currentWeekLabel() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const monthA = monday.toLocaleDateString("en-US", { month: "short" });
  const monthB = sunday.toLocaleDateString("en-US", { month: "short" });

  if (monthA === monthB) {
    return `${monthA} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
  }

  return `${monthA} ${monday.getDate()} – ${monthB} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function firstWord(value) {
  return String(value || "").trim().split(/\s+/)[0] || "there";
}

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function safeJsonParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readCachedWorkspace() {
  return (
    safeJsonParse(sessionStorage.getItem(WORKSPACE_CACHE_KEY)) ||
    safeJsonParse(localStorage.getItem(WORKSPACE_CACHE_KEY))
  );
}

function normalizeCategory(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (["HARDWARE", "QUINCAILLERIE"].includes(raw)) return "HARDWARE";
  if (["HOME_KITCHEN", "HOME_AND_KITCHEN", "HOME_KITCHEN_MATERIALS"].includes(raw)) {
    return "HOME_KITCHEN";
  }
  if (["LIGHTING", "LIGHTS"].includes(raw)) return "LIGHTING";
  if (["SPARE_PARTS", "SPARES", "PARTS"].includes(raw)) return "SPARE_PARTS";

  return "ELECTRONICS";
}

function categoryConfig(category) {
  const configs = {
    ELECTRONICS: {
      label: "Electronics",
      headline: "Sales, stock, repairs, warranties, and marketplace readiness in one view.",
      stockLabel: "Devices and accessories to watch",
      focusTitle: "Electronics focus",
      focusText: "Keep warranty, repair, serial, and stock records clean before products reach customers.",
      actionLabel: "Open repairs",
      actionTo: "/app/repairs",
      actionIcon: Wrench,
      fields: ["Brand", "Model", "IMEI / serial", "Condition", "Warranty"],
    },
    HARDWARE: {
      label: "Hardware",
      headline: "Daily sales, low stock, supplier restock, and material movement at first glance.",
      stockLabel: "Materials to restock",
      focusTitle: "Hardware focus",
      focusText: "Track unit type, size, weight, pack quantity, and supplier restock before shelves run dry.",
      actionLabel: "Open suppliers",
      actionTo: "/app/suppliers",
      actionIcon: Boxes,
      fields: ["Material", "Unit type", "Size", "Weight", "Pack quantity"],
    },
    HOME_KITCHEN: {
      label: "Home & kitchen",
      headline: "Product sets, stock health, customer demand, and marketplace readiness made simple.",
      stockLabel: "Sets and materials to watch",
      focusTitle: "Home & kitchen focus",
      focusText: "Prepare clean product sets with color, size, material, room, and use-case details.",
      actionLabel: "Review products",
      actionTo: "/app/inventory",
      actionIcon: Store,
      fields: ["Material", "Set type", "Color", "Size", "Room / use case"],
    },
    LIGHTING: {
      label: "Lighting",
      headline: "Stock, wattage, voltage, warranty, and marketplace readiness for lighting products.",
      stockLabel: "Lighting items to watch",
      focusTitle: "Lighting focus",
      focusText: "Keep wattage, voltage, color temperature, bulb type, and indoor/outdoor details clear.",
      actionLabel: "Review stock",
      actionTo: "/app/inventory",
      actionIcon: Zap,
      fields: ["Wattage", "Voltage", "Color temperature", "Bulb type", "Warranty"],
    },
    SPARE_PARTS: {
      label: "Spare parts",
      headline: "Part numbers, compatibility, condition, warranty, stock, and demand in one place.",
      stockLabel: "Parts to restock",
      focusTitle: "Spare parts focus",
      focusText: "Make part number, compatible model, condition, and warranty clear before selling.",
      actionLabel: "Review parts",
      actionTo: "/app/inventory",
      actionIcon: PackageCheck,
      fields: ["Part number", "Compatible model", "Condition", "Warranty", "Demand"],
    },
  };

  return configs[category] || configs.ELECTRONICS;
}

function statusTone(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("active") || text.includes("paid") || text.includes("trial")) return "success";
  if (text.includes("expire") || text.includes("pending")) return "warning";
  if (text.includes("blocked") || text.includes("failed")) return "danger";

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
        "inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[11px] font-black leading-none",
        styles[tone] || styles.neutral,
      )}
    >
      {children}
    </span>
  );
}

function IconBubble({ icon: Icon, tone = "info" }) {
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
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px]",
        styles[tone] || styles.info,
      )}
    >
      <Icon size={21} strokeWidth={2.4} />
    </span>
  );
}

function MetricCard({ label, value, note, icon, tone = "info", trend }) {
  return (
    <article className={cn(CARD, "min-h-[150px] p-5 sm:p-6")}>
      <IconBubble icon={icon} tone={tone} />

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-black text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-1 truncate text-2xl font-black tracking-[-0.055em] text-[var(--color-text)] md:text-3xl">
            {value}
          </p>
        </div>

        {trend ? (
          <span
            className={cn(
              "mb-2 inline-flex items-center gap-1 text-xs font-black",
              tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-emerald-600",
            )}
          >
            {trend}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-[12px] font-bold leading-5 text-[var(--color-text-muted)]">{note}</p>
    </article>
  );
}

function SectionHead({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-[var(--svx-heading-font)] text-lg font-black tracking-[-0.04em] text-[var(--color-text)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm font-bold leading-5 text-[var(--color-text-muted)]">{subtitle}</p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function RevenueChart({ monthlyRevenue = 0 }) {
  const seed = Math.max(1, Math.round(numberValue(monthlyRevenue) / 100000));
  const base = [40, 62, 48, 72, 60, 82, 66, 88, 74, 96, 80, 92];
  const pointList = base.map((item, index) => {
    const x = 24 + index * 36;
    const y = 128 - Math.max(24, Math.min(104, item + ((seed + index) % 7)));

    return { x, y, point: `${x},${y}` };
  });
  const points = pointList.map((item) => item.point).join(" ");
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] bg-[var(--color-surface-2)] px-3 pb-4 pt-5">
      <svg viewBox="0 0 430 150" className="h-[210px] w-full" role="img" aria-label="Sales overview chart">
        <defs>
          <linearGradient id="storvexDashboardSalesFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[28, 58, 88, 118].map((y) => (
          <line key={y} x1="16" x2="414" y1={y} y2={y} stroke="var(--color-border)" strokeWidth="1" />
        ))}

        <polygon points={`24,140 ${points} 420,140`} fill="url(#storvexDashboardSalesFill)" />
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

      <div className="grid grid-cols-7 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function ProductRow({ item, index }) {
  const qty = numberValue(item?.stockQty ?? item?.quantity);
  const tone = qty <= 0 ? "danger" : qty <= 2 ? "warning" : "success";

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[var(--color-surface-2)] text-xs font-black text-[var(--color-primary)]">
          {String(index + 1).padStart(2, "0")}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">{item?.name || "Product"}</p>
          <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-text-muted)]">
            {[item?.category, item?.subcategory || item?.subcategoryOther].filter(Boolean).join(" · ") ||
              "Stock item"}
          </p>
        </div>
      </div>

      <Badge tone={tone}>{qty} left</Badge>
    </div>
  );
}

function ActivityRow({ item }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 size={18} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">{item?.action || "Activity"}</p>
          <p className="mt-0.5 truncate text-xs font-bold text-[var(--color-text-muted)]">
            {item?.entity || "Record"}
          </p>
        </div>
      </div>

      <span className="hidden shrink-0 text-xs font-bold text-[var(--color-text-muted)] sm:block">
        {fmtDate(item?.createdAt)}
      </span>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] px-5 py-8 text-center">
      <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
      <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">{text}</p>
    </div>
  );
}

function ActionCard({ icon: Icon, title, text, to, tone = "info", action = "View now" }) {
  return (
    <article className={cn(INNER, "flex min-h-[156px] flex-col justify-between p-5")}>
      <IconBubble icon={Icon} tone={tone} />
      <div className="mt-5">
        <p className="text-sm font-black text-[var(--color-text)]">{title}</p>
        <p className="mt-1 text-xs font-bold leading-5 text-[var(--color-text-muted)]">{text}</p>
      </div>
      {to ? (
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[var(--color-primary)]"
        >
          {action} <ArrowUpRight size={15} strokeWidth={2.6} />
        </Link>
      ) : null}
    </article>
  );
}

function CategoryPanel({ config }) {
  const Icon = config.actionIcon;

  return (
    <section className={cn(CARD, "p-5 sm:p-6")}>
      <SectionHead title={config.focusTitle} subtitle={config.focusText} />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {config.fields.map((field) => (
          <div key={field} className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-3">
            <p className="text-[11px] font-black text-[var(--color-text)]">{field}</p>
          </div>
        ))}
      </div>

      <Link
        to={config.actionTo}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[0_18px_42px_color-mix(in_srgb,var(--color-primary)_24%,transparent)]"
      >
        <Icon size={17} strokeWidth={2.6} />
        {config.actionLabel}
      </Link>
    </section>
  );
}

function SubscriptionMini({ subscription }) {
  if (!subscription) {
    return <Badge tone="neutral">Access status unavailable</Badge>;
  }

  const tone = statusTone(subscription?.label || subscription?.status);
  const daysLeft = numberValue(subscription?.daysLeft);

  return (
    <Badge tone={tone}>
      {daysLeft > 0 ? `${daysLeft} days left` : subscription?.label || "Active"}
    </Badge>
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

      if (dashboardData.status === "rejected") throw dashboardData.reason;
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

        if (dashboardData.status === "rejected") throw dashboardData.reason;
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
  const tenantName = tenant?.name || workspace?.name || "Your store";
  const ownerName =
    workspace?.user?.name || localStorage.getItem("userName") || tenantName || "Owner";
  const businessCategory = normalizeCategory(
    tenant?.businessCategory || tenant?.category || tenant?.shopType || workspace?.businessCategory,
  );
  const config = categoryConfig(businessCategory);

  const subscription = dashboard?.subscriptionSummary || null;
  const lowStock = safeList(dashboard?.lowStockProducts).slice(0, 5);
  const activity = safeList(dashboard?.recentAudit).slice(0, 5);

  const todaySales = numberValue(dashboard?.todaySales);
  const monthlyRevenue = numberValue(dashboard?.monthlyRevenue);
  const pendingDeals = numberValue(dashboard?.pendingDeals);
  const activeRepairs = numberValue(dashboard?.activeRepairs);
  const lowStockCount = numberValue(dashboard?.lowStockCount, lowStock.length);
  const outOfStockCount = numberValue(dashboard?.outOfStockCount);
  const productCount = numberValue(dashboard?.productCount);

  const marketplace = dashboard?.marketplace || dashboard?.marketplaceSummary || {};
  const marketplacePublished = numberValue(marketplace?.publishedCount);
  const marketplaceDrafts = numberValue(marketplace?.draftCount);
  const marketplaceMissingImages = numberValue(marketplace?.missingImagesCount);
  const stockAlerts = lowStockCount + outOfStockCount;

  const actionItems = useMemo(() => {
    const items = [];

    if (stockAlerts > 0) {
      items.push({
        icon: AlertTriangle,
        title: `${stockAlerts} stock alert${stockAlerts === 1 ? "" : "s"}`,
        text:
          outOfStockCount > 0
            ? `${outOfStockCount} item${outOfStockCount === 1 ? " is" : "s are"} out of stock.`
            : "Some products are running low.",
        to: "/app/inventory",
        tone: outOfStockCount > 0 ? "danger" : "warning",
        action: "View stock",
      });
    }

    if (pendingDeals > 0) {
      items.push({
        icon: ClipboardList,
        title: `${pendingDeals} pending sale${pendingDeals === 1 ? "" : "s"}`,
        text: "These need owner attention before they become a problem.",
        to: "/app/pos/sales",
        tone: "warning",
        action: "Review sales",
      });
    }

    if (businessCategory === "ELECTRONICS" && activeRepairs > 0) {
      items.push({
        icon: Wrench,
        title: `${activeRepairs} open repair${activeRepairs === 1 ? "" : "s"}`,
        text: "Track repairs and warranty work before customers return.",
        to: "/app/repairs",
        tone: "info",
        action: "Open repairs",
      });
    }

    if (marketplaceMissingImages > 0) {
      items.push({
        icon: Image,
        title: `${marketplaceMissingImages} product image${marketplaceMissingImages === 1 ? "" : "s"} needed`,
        text: "Products should not be published without clear images.",
        to: "/app/inventory",
        tone: "warning",
        action: "Add images",
      });
    }

    if (subscription && numberValue(subscription?.daysLeft) > 0 && numberValue(subscription?.daysLeft) <= 15) {
      items.push({
        icon: CreditCard,
        title: "Subscription renewal is close",
        text: `${subscription.daysLeft} day${subscription.daysLeft === 1 ? "" : "s"} left before access renewal.`,
        to: "/app/billing",
        tone: "warning",
        action: "Open billing",
      });
    }

    if (!productCount) {
      items.push({
        icon: Boxes,
        title: "Add your first products",
        text: "Inventory must exist before sales, reports, and marketplace visibility are useful.",
        to: "/app/inventory",
        tone: "info",
        action: "Add products",
      });
    }

    if (!items.length) {
      items.push({
        icon: CheckCircle2,
        title: "No urgent action",
        text: "Sales, stock, access, and marketplace readiness look calm right now.",
        to: null,
        tone: "success",
        action: null,
      });
    }

    return items.slice(0, 4);
  }, [
    activeRepairs,
    businessCategory,
    marketplaceMissingImages,
    outOfStockCount,
    pendingDeals,
    productCount,
    stockAlerts,
    subscription,
  ]);

  const metrics = [
    {
      label: "Today sales",
      value: compactMoney(todaySales),
      note: todaySales > 0 ? "Money recorded today" : "No sales recorded yet",
      icon: TrendingUp,
      tone: todaySales > 0 ? "success" : "neutral",
      trend: todaySales > 0 ? "Active" : null,
    },
    {
      label: "Month revenue",
      value: compactMoney(monthlyRevenue),
      note: "Recorded this month",
      icon: BarChart3,
      tone: "info",
      trend: monthlyRevenue > 0 ? "Live" : null,
    },
    {
      label: "Products",
      value: new Intl.NumberFormat("en-US").format(productCount),
      note: `${config.label} items in stock records`,
      icon: Boxes,
      tone: productCount > 0 ? "success" : "neutral",
    },
    {
      label: "Stock alerts",
      value: String(stockAlerts),
      note: stockAlerts > 0 ? "Owner action needed" : "Stock looks calm",
      icon: AlertTriangle,
      tone: stockAlerts > 0 ? "warning" : "success",
      trend: stockAlerts > 0 ? "Review" : null,
    },
  ];

  if (loading && !workspace && !dashboard) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="svx-owner-dashboard space-y-5 pb-8">
      <header className={cn(CARD, "overflow-hidden p-5 sm:p-6 lg:p-7")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-text-muted)]">
              {greeting()}, {firstWord(ownerName)} 👋
            </p>
            <h1 className="mt-2 font-[var(--svx-heading-font)] text-3xl font-black leading-[1.03] tracking-[-0.06em] text-[var(--color-text)] sm:text-4xl xl:text-[42px]">
              Here’s how your store is doing today.
            </h1>
            <p className="mt-3 max-w-3xl text-base font-bold leading-7 text-[var(--color-text-muted)]">
              {config.headline}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)]">
              <CalendarDays size={17} className="text-[var(--color-primary)]" strokeWidth={2.4} />
              <span>{currentWeekLabel()}</span>
              <ChevronDown size={16} className="text-[var(--color-text-muted)]" strokeWidth={2.6} />
            </div>

            <AsyncButton
              loading={refreshing}
              loadingText="Refreshing..."
              variant="secondary"
              onClick={handleRefresh}
              className="h-12 w-full rounded-2xl sm:w-auto"
            >
              <RefreshCw size={16} />
              Refresh
            </AsyncButton>

            <AsyncButton loading={false} as={Link} to="/app/pos" className="h-12 w-full rounded-2xl sm:w-auto">
              <Plus size={17} />
              Add sale
            </AsyncButton>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge tone="info">{config.label}</Badge>
          <SubscriptionMini subscription={subscription} />
          {tenantName ? <Badge tone="neutral">{tenantName}</Badge> : null}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(330px,0.58fr)_minmax(360px,0.66fr)]">
        <section className={cn(CARD, "p-5 sm:p-6")}>
          <SectionHead
            title="Sales overview"
            subtitle="Owner-level view of money recorded through the store."
            action={<Badge tone="info">This week</Badge>}
          />

          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="font-[var(--svx-heading-font)] text-3xl font-black tracking-[-0.055em] text-[var(--color-text)]">
              {money(monthlyRevenue)}
            </p>
            <span className="pb-1 text-sm font-black text-emerald-600">
              {todaySales > 0 ? `${money(todaySales)} today` : "No sales today"}
            </span>
          </div>

          <RevenueChart monthlyRevenue={monthlyRevenue} />
        </section>

        <section className={cn(CARD, "p-5 sm:p-6")}>
          <SectionHead
            title={config.stockLabel}
            subtitle="Low and out-of-stock products only."
            action={
              <Link to="/app/inventory" className="text-sm font-black text-[var(--color-primary)]">
                View all
              </Link>
            }
          />

          {!lowStock.length ? (
            <EmptyState title="No stock alerts" text="Stock looks healthy right now." />
          ) : (
            <div>
              {lowStock.map((item, index) => (
                <ProductRow key={item.id || `${item.name}-${index}`} item={item} index={index} />
              ))}
            </div>
          )}
        </section>

        <section className={cn(CARD, "p-5 sm:p-6")}>
          <SectionHead title="Recent activity" subtitle="Latest business activity records." />

          {!activity.length ? (
            <EmptyState title="No recent activity" text="New sales, stock, and staff activity will appear here." />
          ) : (
            <div>
              {activity.map((item, index) => (
                <ActivityRow key={item.id || `${item.action}-${index}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className={cn(CARD, "p-5 sm:p-6")}>
        <SectionHead
          title="Action center"
          subtitle="Only the items that need owner attention. No noise."
          action={<Badge tone={actionItems[0]?.tone === "success" ? "success" : "warning"}>{actionItems.length} item{actionItems.length === 1 ? "" : "s"}</Badge>}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {actionItems.map((item) => (
            <ActionCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.55fr)]">
        <section className={cn(CARD, "p-5 sm:p-6")}>
          <SectionHead
            title="Marketplace readiness"
            subtitle="Products stay private until the owner chooses what to publish."
            action={<Badge tone={marketplacePublished > 0 ? "success" : "neutral"}>{marketplacePublished} live</Badge>}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className={cn(INNER, "p-4")}>
              <p className="text-xs font-black text-[var(--color-text-muted)]">Published</p>
              <p className="mt-1 text-2xl font-black text-[var(--color-text)]">{marketplacePublished}</p>
            </div>
            <div className={cn(INNER, "p-4")}>
              <p className="text-xs font-black text-[var(--color-text-muted)]">Drafts</p>
              <p className="mt-1 text-2xl font-black text-[var(--color-text)]">{marketplaceDrafts}</p>
            </div>
            <div className={cn(INNER, "p-4")}>
              <p className="text-xs font-black text-[var(--color-text-muted)]">Missing images</p>
              <p className="mt-1 text-2xl font-black text-[var(--color-text)]">{marketplaceMissingImages}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[24px] bg-[var(--color-surface-2)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--color-text)]">Private by default</p>
              <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">
                Publish only products with owner approval, clear images, and available stock.
              </p>
            </div>
            <Link
              to="/app/inventory"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)]"
            >
              <ShoppingCart size={17} strokeWidth={2.6} />
              Review products
            </Link>
          </div>
        </section>

        <section className={cn(CARD, "p-5 sm:p-6")}>
          <SectionHead title="Owner shortcuts" subtitle="Fast actions used every day." />

          <div className="grid gap-3">
            <Link className={cn(INNER, "flex items-center justify-between gap-3 p-4 font-black text-[var(--color-text)]")} to="/app/pos">
              <span className="flex items-center gap-3"><ShoppingBag size={18} className="text-[var(--color-primary)]" /> New sale</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link className={cn(INNER, "flex items-center justify-between gap-3 p-4 font-black text-[var(--color-text)]")} to="/app/inventory">
              <span className="flex items-center gap-3"><Boxes size={18} className="text-[var(--color-primary)]" /> Inventory</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link className={cn(INNER, "flex items-center justify-between gap-3 p-4 font-black text-[var(--color-text)]")} to="/app/customers">
              <span className="flex items-center gap-3"><Users size={18} className="text-[var(--color-primary)]" /> Customers</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link className={cn(INNER, "flex items-center justify-between gap-3 p-4 font-black text-[var(--color-text)]")} to="/app/reports">
              <span className="flex items-center gap-3"><FileText size={18} className="text-[var(--color-primary)]" /> Reports</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </section>

      <CategoryPanel config={config} />
    </div>
  );
}

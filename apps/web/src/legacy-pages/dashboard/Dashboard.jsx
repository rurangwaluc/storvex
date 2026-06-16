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
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import { getWorkspaceContext } from "../../services/storeApi";
import { getTenantDashboard } from "../../services/dashboardApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
import "./Dashboard.css";

const WORKSPACE_CACHE_KEY = "storvex_me_cache_v2";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

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
  return String(value || "").trim().split(/\s+/)[0] || "";
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

function normalizeCategory(value) {
  const category = String(value || "").trim().toUpperCase();

  if (["HARDWARE", "QUINCAILLERIE"].includes(category)) return "HARDWARE";
  if (["HOME_KITCHEN", "HOME_AND_KITCHEN", "HOME & KITCHEN"].includes(category)) return "HOME_KITCHEN";
  if (category === "LIGHTING") return "LIGHTING";
  if (["SPARE_PARTS", "SPARE PARTS", "AUTO_PARTS"].includes(category)) return "SPARE_PARTS";

  return "ELECTRONICS";
}

function categoryLabel(value) {
  return (
    {
      ELECTRONICS: "Electronics retail",
      ELECTRONICS_RETAIL: "Electronics retail",
      PHONE_SHOP: "Electronics retail",
      LAPTOP_SHOP: "Electronics retail",
      ACCESSORIES_SHOP: "Electronics retail",
      REPAIR_SHOP: "Electronics retail",
      MIXED_ELECTRONICS: "Electronics retail",
      HARDWARE: "Hardware / Quincaillerie",
      HOME_KITCHEN: "Home & kitchen",
      LIGHTING: "Lighting",
      SPARE_PARTS: "Spare parts",
    }[value] ||
    value ||
    "Retail store"
  );
}

function statusTone(value) {
  const text = String(value || "").toLowerCase();

  if (text.includes("active") || text.includes("paid") || text.includes("trial")) return "success";
  if (text.includes("expire") || text.includes("pending")) return "warning";
  if (text.includes("blocked") || text.includes("failed")) return "danger";

  return "neutral";
}

function Badge({ children, tone = "neutral" }) {
  return <span className={cx("svx-dashboard-badge", `is-${tone}`)}>{children}</span>;
}

function IconShell({ children, tone = "info" }) {
  return <span className={cx("svx-dashboard-icon", `is-${tone}`)}>{children}</span>;
}

function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="svx-dashboard-section-head">
      <div className="svx-dashboard-section-title">
        {eyebrow ? <p>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>

      {action ? <div className="svx-dashboard-section-action">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone = "info" }) {
  return (
    <article className="svx-owner-metric svx-dashboard-card svx-reveal-card">
      <div className="svx-owner-metric-top">
        <IconShell tone={tone}>
          <Icon size={20} strokeWidth={2.35} />
        </IconShell>
        <span className={cx("svx-owner-status-dot", `is-${tone}`)} />
      </div>

      <p className="svx-owner-metric-label">{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function CompactStat({ label, value, tone = "neutral" }) {
  return (
    <div className={cx("svx-compact-stat", `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function pickPaymentAmount(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return Number(value || 0);
  }

  return null;
}

function RevenueChart({ monthlyRevenue = 0 }) {
  const seed = Math.max(1, Math.round(Number(monthlyRevenue || 0) / 100000));
  const bars = [62, 52, 68, 46, 38, 74, 58].map((height, index) => {
    const adjusted = Math.max(28, Math.min(88, height + ((seed + index) % 9) - 4));

    return {
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
      height: adjusted,
    };
  });

  return (
    <div className="svx-sales-chart is-safe-bars" role="img" aria-label="Sales overview">
      <div className="svx-chart-bars">
        {bars.map((item) => (
          <div className="svx-chart-bar-group" key={item.day}>
            <span className="svx-chart-bar" style={{ height: `${item.height}%` }} />
            <small>{item.day}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function productImageSrc(item) {
  const direct =
    item?.imageUrl ||
    item?.mainImageUrl ||
    item?.primaryImageUrl ||
    item?.photoUrl ||
    item?.thumbnailUrl ||
    item?.image;

  if (typeof direct === "string" && direct.trim()) return direct;

  const firstImage = Array.isArray(item?.images) ? item.images[0] : null;
  if (typeof firstImage === "string" && firstImage.trim()) return firstImage;
  if (firstImage?.url) return firstImage.url;
  if (firstImage?.imageUrl) return firstImage.imageUrl;

  return "";
}

function productAmount(item) {
  const value =
    item?.revenue ||
    item?.salesAmount ||
    item?.totalSales ||
    item?.amount ||
    item?.price ||
    item?.sellingPrice;

  return Number(value || 0);
}

function productSoldLabel(item, qty) {
  const sold = item?.soldCount ?? item?.unitsSold ?? item?.sold ?? item?.salesCount;

  if (sold !== undefined && sold !== null && Number(sold) > 0) {
    return `${Number(sold)} sold`;
  }

  if (qty <= 0) return "Out of stock";
  if (qty <= 2) return `${qty} left`;

  return `${qty} in stock`;
}

function ProductRow({ item }) {
  const qty = Number(item?.stockQty ?? item?.quantity ?? item?.availableQty ?? 0);
  const amount = productAmount(item);
  const imageSrc = productImageSrc(item);

  return (
    <div className="svx-product-row">
      <div className="svx-product-row-main">
        <div className="svx-product-thumb" aria-hidden="true">
          {imageSrc ? <img src={imageSrc} alt="" loading="lazy" /> : <Boxes size={18} strokeWidth={2.3} />}
        </div>

        <div className="svx-product-copy">
          <p title={item?.name || "Product"}>{item?.name || "Product"}</p>
          <span>{[item?.category, item?.subcategory, item?.brand].filter(Boolean).join(" · ") || "Stock item"}</span>
        </div>
      </div>

      <div className="svx-product-watch-meta">
        <strong>{amount > 0 ? money(amount) : `${qty} left`}</strong>
        <span>{productSoldLabel(item, qty)}</span>
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  const action = String(item?.action || "Activity").replaceAll("_", " ");
  const entity = item?.entity || item?.type || "Record";
  const amount = Number(item?.amount || item?.total || item?.value || 0);
  const status = item?.status || item?.paymentStatus || "Done";

  return (
    <div className="svx-activity-row">
      <div className="svx-activity-main">
        <strong>{action}</strong>
        <span>{[entity, fmtDate(item?.createdAt)].filter(Boolean).join(" · ")}</span>
      </div>

      <div className="svx-activity-meta">
        {amount > 0 ? <strong>{money(amount)}</strong> : null}
        <Badge tone={statusTone(status)}>{status}</Badge>
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="svx-empty-state">
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}

function ActionCenterCard({ icon: Icon, title, text, tone = "info", to, action }) {
  const content = (
    <>
      <IconShell tone={tone}>
        <Icon size={20} strokeWidth={2.35} />
      </IconShell>

      <div className="svx-action-center-copy">
        <p>{title}</p>
        <span>{text}</span>
      </div>

      {action ? <strong>{action}</strong> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="svx-action-center-card">
        {content}
      </Link>
    );
  }

  return <article className="svx-action-center-card">{content}</article>;
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
    <section className="svx-dashboard-card svx-dashboard-panel">
      <SectionTitle
        eyebrow="Access"
        title="Subscription"
        action={subscription ? <Badge tone={tone}>{subscription.label || "Active"}</Badge> : null}
      />

      {subscription ? (
        <div className="svx-subscription-box">
          <div className="svx-subscription-copy">
            <div>
              <p>{subscription.planKey || "Current plan"}</p>
              <span>
                {subscription.endDate
                  ? `Renews ${fmtDate(subscription.endDate)}`
                  : "Store access is active."}
              </span>
            </div>

            {subscription.endDate ? (
              <strong>{daysLeft > 0 ? `${daysLeft} days left` : "Renew now"}</strong>
            ) : null}
          </div>

          <div className="svx-subscription-progress" aria-hidden="true">
            <span
              className={cx(percent > 40 ? "is-success" : percent > 15 ? "is-warning" : "is-danger")}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="svx-subscription-actions">
            <Link to="/app/billing">Open billing</Link>
            <Link to="/renew">Renew</Link>
          </div>
        </div>
      ) : (
        <EmptyState title="No subscription information" text="Billing details will appear here." />
      )}
    </section>
  );
}

function BusinessStatusPanel({ categoryPanel, category, marketplacePublished, marketplaceMissingImages, subscription }) {
  const subscriptionLabel = subscription?.label || subscription?.status || "Not loaded";

  return (
    <section className="svx-dashboard-card svx-mobile-business-status svx-reveal-card">
      <SectionTitle eyebrow="Business status" title="More details" action={<Badge tone="neutral">Compact</Badge>} />

      <div className="svx-mobile-status-list">
        <div className="svx-mobile-status-row">
          <span>{categoryPanel.title}</span>
          <strong>{categoryPanel.stats?.[1]?.[1] || categoryLabel(category)}</strong>
        </div>

        <div className="svx-mobile-status-row">
          <span>Marketplace</span>
          <strong>
            {marketplacePublished} live · {marketplaceMissingImages} missing images
          </strong>
        </div>

        <div className="svx-mobile-status-row">
          <span>Subscription</span>
          <strong>{subscriptionLabel}</strong>
        </div>
      </div>

      <Link to="/app/reports" className="svx-mobile-status-link">
        View business details
      </Link>
    </section>
  );
}

function categoryFocus(category, activeRepairs, marketplaceMissingImages, lowStockCount) {
  const values = {
    ELECTRONICS: {
      title: "Electronics focus",
      text: "Watch repairs, warranty follow-ups, serial/IMEI records, and marketplace image quality.",
      stats: [
        ["Open repairs", String(activeRepairs)],
        ["Warranty watch", activeRepairs > 0 ? "Review" : "Calm"],
        ["Images missing", String(marketplaceMissingImages)],
      ],
    },
    HARDWARE: {
      title: "Hardware focus",
      text: "Watch unit sizes, material stock, supplier restock pressure, and fast-moving construction items.",
      stats: [
        ["Stock alerts", String(lowStockCount)],
        ["Supplier restock", lowStockCount > 0 ? "Needed" : "Calm"],
        ["Unit control", "Size / pack"],
      ],
    },
    HOME_KITCHEN: {
      title: "Home & kitchen focus",
      text: "Watch product sets, color/material variants, room use-cases, and image-ready marketplace products.",
      stats: [
        ["Set readiness", marketplaceMissingImages > 0 ? "Images" : "Ready"],
        ["Variants", "Color / size"],
        ["Stock alerts", String(lowStockCount)],
      ],
    },
    LIGHTING: {
      title: "Lighting focus",
      text: "Watch wattage, voltage, bulb type, indoor/outdoor stock balance, and warranty-sensitive items.",
      stats: [
        ["Warranty watch", "Active"],
        ["Type balance", "Watt / bulb"],
        ["Stock alerts", String(lowStockCount)],
      ],
    },
    SPARE_PARTS: {
      title: "Spare parts focus",
      text: "Watch part numbers, model compatibility, condition, warranty, and fast-demand replacement items.",
      stats: [
        ["Part alerts", String(lowStockCount)],
        ["Compatibility", "Model fit"],
        ["Condition", "Track"],
      ],
    },
  };

  return values[category] || values.ELECTRONICS;
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
  const missing = Array.isArray(readiness?.missingRequiredKeys) ? readiness.missingRequiredKeys : [];

  const tenantName = tenant?.name || workspace?.name || "Your store";
  const ownerName =
    workspace?.user?.name ||
    workspace?.owner?.name ||
    workspace?.membership?.user?.name ||
    workspace?.currentUser?.name ||
    localStorage.getItem("userName") ||
    "";
  const firstName = firstWord(ownerName);
  const businessCategory = tenant?.businessCategory || tenant?.category || tenant?.shopType;
  const normalizedCategory = normalizeCategory(businessCategory);
  const location = [tenant?.district, tenant?.sector].filter(Boolean).join(" · ");
  const readinessPercent = readiness?.readinessPercent ?? setupSummary?.readinessPercent ?? 0;

  const lowStock = safeList(dashboard?.lowStockProducts);
  const productsToWatch = [
    ...safeList(dashboard?.productsToWatch),
    ...safeList(dashboard?.topProducts),
    ...safeList(dashboard?.fastMovingProducts),
    ...lowStock,
    ...safeList(dashboard?.recentProducts),
  ]
    .filter((item, index, list) => {
      const key = item?.id || item?.sku || item?.name || index;
      return list.findIndex((entry, entryIndex) => (entry?.id || entry?.sku || entry?.name || entryIndex) === key) === index;
    })
    .slice(0, 5);
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

  const paymentSummary = dashboard?.paymentSummary || dashboard?.paymentsToday || dashboard?.payments || {};
  const paymentMethods = [
    ["Cash", pickPaymentAmount(paymentSummary, ["cash", "cashAmount", "cashTotal"])],
    ["MoMo", pickPaymentAmount(paymentSummary, ["momo", "mobileMoney", "mobileMoneyAmount", "momoTotal"])],
    ["Bank", pickPaymentAmount(paymentSummary, ["bank", "bankTransfer", "bankAmount", "bankTotal"])],
    ["Card", pickPaymentAmount(paymentSummary, ["card", "cardAmount", "cardTotal"])],
  ];
  const hasPaymentBreakdown = paymentMethods.some(([, value]) => value !== null);

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

    if (marketplacePublished <= 0 && productCount > 0) {
      items.push({
        icon: ShoppingCart,
        tone: "info",
        title: "Marketplace not live yet",
        text: "Products stay private until the owner chooses what should appear publicly.",
        action: "Review",
        to: "/app/inventory",
      });
    }

    if (missing.length > 0) {
      items.push({
        icon: ClipboardList,
        tone: "warning",
        title: "Setup needs finishing",
        text: `${missing.length} setup item${missing.length === 1 ? "" : "s"} still affect operational readiness.`,
        action: "Open setup",
        to: "/app/settings",
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

    return items.slice(0, 4);
  }, [
    activeRepairs,
    lowStockCount,
    marketplaceMissingImages,
    outOfStockCount,
    pendingDeals,
    productCount,
    subscription,
    marketplacePublished,
    missing,
  ]);

  const actionCenterItems = useMemo(() => {
    const fallbackItems = [
      {
        icon: ShoppingBag,
        tone: "info",
        title: "Record today’s sale",
        text: "Open the sales desk when a customer pays.",
        action: "New sale",
        to: "/app/pos",
      },
      {
        icon: Boxes,
        tone: lowStockCount + outOfStockCount > 0 ? "warning" : "info",
        title: "Check stock movement",
        text: "Review low stock, fast-moving products, and unavailable items.",
        action: "Open stock",
        to: "/app/inventory",
      },
      {
        icon: PackageCheck,
        tone: marketplaceMissingImages > 0 ? "warning" : "info",
        title: "Prepare marketplace",
        text: "Add images and choose only products the owner wants public.",
        action: "Review",
        to: "/app/inventory",
      },
      {
        icon: BarChart3,
        tone: "info",
        title: "Review business reports",
        text: "Check sales, expenses, and branch performance when needed.",
        action: "Reports",
        to: "/app/reports",
      },
    ];

    const merged = [...focusItems, ...fallbackItems];
    const seen = new Set();

    return merged
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .slice(0, 4);
  }, [focusItems, lowStockCount, marketplaceMissingImages, outOfStockCount]);

  const categoryPanel = categoryFocus(
    normalizedCategory,
    activeRepairs,
    marketplaceMissingImages,
    lowStockCount + outOfStockCount,
  );

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
        label: "Payments today",
        value: money(todaySales),
        note: "Cash, MoMo, bank, and card",
        icon: CreditCard,
        tone: pendingDeals > 0 ? "warning" : todaySales > 0 ? "success" : "neutral",
      },
      {
        label: "Stock attention",
        value: String(lowStockCount + outOfStockCount),
        note: lowStockCount + outOfStockCount > 0 ? "Needs owner review" : "Stock looks calm",
        icon: Boxes,
        tone: lowStockCount + outOfStockCount > 0 ? "warning" : "success",
      },
      {
        label: "Marketplace",
        value: String(marketplacePublished),
        note: marketplaceMissingImages > 0 ? `${marketplaceMissingImages} missing images` : "Owner-controlled visibility",
        icon: ShoppingCart,
        tone: marketplaceMissingImages > 0 ? "warning" : marketplacePublished > 0 ? "success" : "neutral",
      },
    ],
    [
      lowStockCount,
      marketplaceMissingImages,
      marketplacePublished,
      outOfStockCount,
      pendingDeals,
      todaySales,
    ],
  );

  if (loading && !workspace && !dashboard) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="svx-owner-dashboard">
      <header className="svx-owner-dashboard-hero svx-reveal-card">
        <div className="svx-owner-hero-copy">
          <Badge tone="info">{categoryLabel(businessCategory)}</Badge>
          <h1>{firstName ? `${greeting()}, ${firstName}.` : `${greeting()}.`}</h1>
          <p>Here is what your store needs you to know today.</p>
        </div>

        <div className="svx-owner-hero-actions">
          <div className="svx-dashboard-date-chip" aria-label="Dashboard date">
            <CalendarDays size={18} strokeWidth={2.2} />
            <span>{todayLabel()}</span>
          </div>

          <button type="button" className="svx-dashboard-secondary-button" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} strokeWidth={2.35} />
            <span>{refreshing ? "Refreshing" : "Refresh"}</span>
          </button>

          <Link to="/app/pos" className="svx-dashboard-primary-button">
            <ShoppingBag size={16} strokeWidth={2.35} />
            <span>New sale</span>
          </Link>
        </div>
      </header>

      <section className="svx-owner-metric-grid" aria-label="Owner summary">
        {metrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </section>

      <section className="svx-owner-main-grid">
        <section className="svx-dashboard-card svx-sales-panel svx-reveal-card">
          <SectionTitle title="Sales and payments" action={<button type="button" className="svx-period-button">This Week</button>} />

          <div className="svx-sales-overview-value">
            <strong>{money(todaySales)}</strong>
            <span className={cx("svx-sales-change", todaySales > 0 && "is-positive")}>
              {todaySales > 0 ? "Recorded today" : "No sales yet today"}
            </span>
            <p>{pendingDeals > 0 ? `${pendingDeals} pending sale${pendingDeals === 1 ? "" : "s"}` : "No pending sales pressure"}</p>
          </div>

          <RevenueChart monthlyRevenue={monthlyRevenue} />
        </section>

        <section className="svx-dashboard-card svx-products-panel svx-reveal-card">
          <SectionTitle
            title="Products to watch"
            action={<Link to="/app/inventory" className="svx-text-link">View all</Link>}
          />

          {!productsToWatch.length ? (
            <EmptyState title="No products need attention" text="Products with low stock, strong movement, or marketplace gaps will appear here." />
          ) : (
            <div className="svx-row-stack svx-product-watch-list">
              {productsToWatch.slice(0, 5).map((item, index) => (
                <ProductRow key={item.id || item.sku || item.name || index} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="svx-dashboard-card svx-recent-panel svx-reveal-card">
          <SectionTitle title="Recent business movement" action={<Link to="/app/reports" className="svx-text-link">View all</Link>} />

          {!activity.length ? (
            <EmptyState title="No recent activity" text="Sales, stock, expenses, and marketplace changes will appear here." />
          ) : (
            <div className="svx-row-stack">
              {activity.slice(0, 5).map((item) => (
                <ActivityRow key={item.id || `${item.action}-${item.createdAt}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="svx-dashboard-card svx-action-center svx-reveal-card">
        <SectionTitle
          eyebrow="Action center"
          title="What the owner should handle next"
          action={<Badge tone={focusItems.length > 1 || focusItems[0]?.title !== "No urgent action" ? "warning" : "success"}>{focusItems.length} active</Badge>}
        />

        <div className="svx-action-center-grid">
          {actionCenterItems.map((item) => (
            <ActionCenterCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <BusinessStatusPanel
        categoryPanel={categoryPanel}
        category={businessCategory}
        marketplacePublished={marketplacePublished}
        marketplaceMissingImages={marketplaceMissingImages}
        subscription={subscription}
      />

      <section className="svx-owner-secondary-grid">
        <section className="svx-dashboard-card svx-reveal-card">
          <SectionTitle eyebrow="Category" title={categoryPanel.title} action={<Badge tone="neutral">{categoryLabel(businessCategory)}</Badge>} />

          <p className="svx-category-text">{categoryPanel.text}</p>

          <div className="svx-category-stat-grid">
            {categoryPanel.stats.map(([label, value]) => (
              <CompactStat key={label} label={label} value={value} />
            ))}
          </div>
        </section>

        <section className="svx-dashboard-card svx-reveal-card">
          <SectionTitle
            eyebrow="Marketplace"
            title="Marketplace readiness"
            action={<Badge tone={marketplacePublished > 0 ? "success" : "neutral"}>{marketplacePublished} live</Badge>}
          />

          <div className="svx-compact-stat-grid is-three">
            <CompactStat label="Published" value={String(marketplacePublished)} tone={marketplacePublished ? "success" : "neutral"} />
            <CompactStat label="Drafts" value={String(marketplaceDrafts)} />
            <CompactStat label="Missing images" value={String(marketplaceMissingImages)} tone={marketplaceMissingImages ? "warning" : "success"} />
          </div>

          <div className="svx-marketplace-note">
            <p>Owner controls visibility</p>
            <span>Products stay private until you add images, review the public details, and choose what appears in the marketplace.</span>
          </div>
        </section>

        <SubscriptionPanel subscription={subscription} />
      </section>

      <section className="svx-dashboard-sr-only" aria-label="Store summary">
        <p>{tenantName}</p>
        <p>{categoryLabel(businessCategory)}</p>
        <p>{location}</p>
      </section>
    </div>
  );
}
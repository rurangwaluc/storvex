const prisma = require("../../config/database");

const {
  buildFinancialSummary,
  buildCashFlowSummary,
  buildOwnerChecksReport,
} = require("../reports/reports.service");

function money(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function normalizePaymentMethod(value) {
  const method = String(value || "").trim().toUpperCase();

  if (method === "CASH") return "cash";
  if (method === "MOMO" || method === "MOBILE_MONEY") return "momo";
  if (method === "BANK" || method === "BANK_TRANSFER") return "bank";

  return "other";
}

function emptyPaymentSummary() {
  return {
    total: 0,
    cash: 0,
    momo: 0,
    bank: 0,
    other: 0,
  };
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function localDateISO(d) {
  const x = new Date(d);

  return [
    x.getFullYear(),
    String(x.getMonth() + 1).padStart(2, "0"),
    String(x.getDate()).padStart(2, "0"),
  ].join("-");
}

function safeDateLabel(value, prefix = "Ends") {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${prefix} ${d.toLocaleDateString()}`;
}

function diffDaysFromNow(endDateValue) {
  if (!endDateValue) return null;

  const now = new Date();
  const end = new Date(endDateValue);

  if (Number.isNaN(end.getTime())) return null;

  const ms = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatSubscriptionState(subscription) {
  if (!subscription) {
    return {
      label: "No subscription",
      tone: "warning",
      detail: "No commercial access data",
      canOperate: false,
      planKey: null,
      endDate: null,
      daysLeft: null,
      accessMode: null,
      status: null,
    };
  }

  const status = String(subscription.status || "").trim().toUpperCase();
  const accessMode = String(subscription.accessMode || "").trim().toUpperCase();

  const isExpired = status === "EXPIRED";
  const isReadOnly = status === "READ_ONLY" || accessMode === "READ_ONLY";
  const isTrial = status === "TRIAL" || accessMode === "TRIAL";

  const computedDaysLeft = diffDaysFromNow(
    subscription.trialEndDate || subscription.endDate || null
  );

  if (isExpired) {
    return {
      label: "Expired",
      tone: "danger",
      detail:
        safeDateLabel(subscription.endDate, "Ended") ||
        "Renew to continue operations",
      canOperate: false,
      planKey: subscription.planKey || null,
      endDate: subscription.endDate || null,
      daysLeft: computedDaysLeft,
      accessMode,
      status,
    };
  }

  if (isReadOnly) {
    return {
      label: "Read-only",
      tone: "warning",
      detail:
        safeDateLabel(subscription.graceEndDate, "Grace ends") ||
        safeDateLabel(subscription.readOnlySince, "Read-only since") ||
        safeDateLabel(subscription.endDate, "Ends") ||
        "Limited access",
      canOperate: false,
      planKey: subscription.planKey || null,
      endDate: subscription.endDate || null,
      daysLeft: computedDaysLeft,
      accessMode,
      status,
    };
  }

  if (isTrial) {
    return {
      label: "Trial",
      tone: "info",
      detail: `${computedDaysLeft ?? 0} day${computedDaysLeft === 1 ? "" : "s"} left`,
      canOperate: true,
      planKey: subscription.planKey || null,
      endDate: subscription.trialEndDate || subscription.endDate || null,
      daysLeft: computedDaysLeft,
      accessMode,
      status,
    };
  }

  return {
    label: "Active",
    tone: "success",
    detail:
      safeDateLabel(subscription.endDate, "Ends") ||
      "Commercial access active",
    canOperate: true,
    planKey: subscription.planKey || null,
    endDate: subscription.endDate || null,
    daysLeft: computedDaysLeft,
    accessMode,
    status,
  };
}

/**
 * GET /api/dashboard
 * Returns dashboard numbers the store needs.
 */
async function getTenantDashboard(req, res) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ message: "Unauthorized" });

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const weekStart = startOfDay(now);
    weekStart.setDate(weekStart.getDate() - 6);

    const thresholdRaw = Number(process.env.LOW_STOCK_THRESHOLD || 5);
    const threshold =
      Number.isFinite(thresholdRaw) && thresholdRaw >= 1 && thresholdRaw <= 9999
        ? Math.floor(thresholdRaw)
        : 5;

    const [
      tenant,
      todaySalesAgg,
      monthSalesAgg,
      productCount,
      lowStockCount,
      outOfStockCount,
      lowStockProducts,
      activeRepairs,
      pendingDeals,
      recentAudit,
      paymentRows,
      weeklySalesRows,
      ownerFinancialToday,
      ownerCashFlowToday,
      ownerChecksPayload,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          district: true,
          sector: true,
          shopType: true,
          logoUrl: true,
          subscription: {
            select: {
              id: true,
              tenantId: true,
              planKey: true,
              status: true,
              accessMode: true,
              tierKey: true,
              cycleKey: true,
              staffLimit: true,
              priceAmount: true,
              currency: true,
              startDate: true,
              endDate: true,
              trialStartDate: true,
              trialEndDate: true,
              readOnlySince: true,
              graceEndDate: true,
              lastPaymentAt: true,
              renewedAt: true,
              createdAt: true,
              trialConsumed: true,
              trialSourceIntentId: true,
              nextPlanKey: true,
            },
          },
        },
      }),

      prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { total: true },
      }),

      prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: monthStart, lte: now },
        },
        _sum: { total: true },
      }),

      prisma.product.count({
        where: { tenantId, isActive: true },
      }),

      prisma.product.count({
        where: {
          tenantId,
          isActive: true,
          stockQty: { gt: 0, lte: threshold },
        },
      }),

      prisma.product.count({
        where: {
          tenantId,
          isActive: true,
          stockQty: 0,
        },
      }),

      prisma.product.findMany({
        where: {
          tenantId,
          isActive: true,
          stockQty: { lte: threshold },
        },
        orderBy: [{ stockQty: "asc" }, { name: "asc" }],
        take: 10,
        select: {
          id: true,
          name: true,
          stockQty: true,
          category: true,
          subcategory: true,
          subcategoryOther: true,
        },
      }),

      prisma.repair.count({
        where: {
          tenantId,
          status: { in: ["RECEIVED", "IN_PROGRESS"] },
        },
      }),

      prisma.interStoreDeal.count({
        where: {
          borrowerTenantId: tenantId,
          status: { in: ["BORROWED", "SOLD"] },
        },
      }),

      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          action: true,
          entity: true,
          createdAt: true,
        },
      }),

      prisma.salePayment.groupBy({
        by: ["method"],
        where: {
          tenantId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),

      prisma.sale.findMany({
        where: {
          tenantId,
          createdAt: { gte: weekStart, lte: todayEnd },
        },
        select: {
          createdAt: true,
          total: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      buildFinancialSummary({
        user: req.user,
        query: {
          from: localDateISO(now),
          to: localDateISO(now),
        },
      }),

      buildCashFlowSummary({
        user: req.user,
        query: {
          from: localDateISO(now),
          to: localDateISO(now),
        },
      }),

      buildOwnerChecksReport({
        user: req.user,
        query: {},
      }),
    ]);

    const weeklySalesMap = new Map();

    for (let i = 0; i < 7; i += 1) {
      const day = startOfDay(weekStart);
      day.setDate(weekStart.getDate() + i);

      weeklySalesMap.set(localDateISO(day), {
        date: localDateISO(day),
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        amount: 0,
        salesCount: 0,
      });
    }

    for (const sale of weeklySalesRows || []) {
      const key = localDateISO(sale.createdAt);
      const current = weeklySalesMap.get(key);

      if (current) {
        current.amount += money(sale.total);
        current.salesCount += 1;
      }
    }

    const weeklySales = Array.from(weeklySalesMap.values());

    const paymentSummary = emptyPaymentSummary();

    for (const row of paymentRows || []) {
      const key = normalizePaymentMethod(row.method);
      const amount = money(row?._sum?.amount);

      paymentSummary[key] += amount;
      paymentSummary.total += amount;
    }

    const todayFinancial = ownerFinancialToday?.summary || {};
    const todayCashFlow = ownerCashFlowToday?.cashFlow || {};
    const ownerChecks = ownerChecksPayload?.ownerChecks || {};

    const customersOweMe = ownerChecks.customersOweMe || { total: 0, count: 0 };
    const overdueCustomerMoney = ownerChecks.overdueCustomerMoney || { total: 0, count: 0 };
    const iOweSuppliers = ownerChecks.iOweSuppliers || { total: 0, count: 0 };
    const stockToReview = ownerChecks.stockToReview || { count: 0, products: [] };

    const ownerAttentionCount =
      Number(customersOweMe.count || 0) +
      Number(overdueCustomerMoney.count || 0) +
      Number(iOweSuppliers.count || 0) +
      Number(stockToReview.count || 0);

    let ownerPriority = {
      title: "No urgent owner action",
      text: "Money, stock, and follow-ups look calm right now.",
      tone: "success",
    };

    if (money(overdueCustomerMoney.total) > 0) {
      ownerPriority = {
        title: "Collect overdue customer money",
        text: `Customers are overdue by Rwf ${money(overdueCustomerMoney.total).toLocaleString("en-US")}.`,
        tone: "danger",
      };
    } else if (money(customersOweMe.total) > 0) {
      ownerPriority = {
        title: "Review customer credit",
        text: `Customers still owe Rwf ${money(customersOweMe.total).toLocaleString("en-US")}.`,
        tone: "warning",
      };
    } else if (money(iOweSuppliers.total) > 0) {
      ownerPriority = {
        title: "Check supplier bills",
        text: `You owe suppliers Rwf ${money(iOweSuppliers.total).toLocaleString("en-US")}.`,
        tone: "warning",
      };
    } else if (Number(stockToReview.count || 0) > 0) {
      ownerPriority = {
        title: "Review low stock",
        text: `${stockToReview.count} product${stockToReview.count === 1 ? "" : "s"} need owner review.`,
        tone: "warning",
      };
    }

    return res.json({
      threshold,

      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            district: tenant.district,
            sector: tenant.sector,
            shopType: tenant.shopType,
            logoUrl: tenant.logoUrl,
          }
        : null,

      subscriptionSummary: formatSubscriptionState(tenant?.subscription || null),

      todaySales: money(todaySalesAgg?._sum?.total),
      monthlyRevenue: money(monthSalesAgg?._sum?.total),
      weeklySales,

      ownerToday: {
        sales: money(todayFinancial.revenue ?? todaySalesAgg?._sum?.total),
        moneyReceived: money(todayCashFlow.moneyIn ?? paymentSummary.total),
        expenses: money(todayFinancial.approvedExpenses),
        productCost: money(todayFinancial.costOfGoodsSold),
        profitEstimate: money(todayFinancial.profitEstimate),
        salesCount: Number(todayFinancial.salesCount || 0),
      },

      paymentSummary,

      ownerChecks: {
        customersOweMe,
        overdueCustomerMoney,
        iOweSuppliers,
        stockToReview,
      },

      ownerPriority,
      ownerAttentionCount,

      productCount,
      lowStockCount,
      outOfStockCount,
      lowStockProducts,

      activeRepairs,
      pendingDeals,

      recentAudit,
    });
  } catch (err) {
    console.error("getTenantDashboard error:", err);
    return res.status(500).json({ message: "Failed to load dashboard" });
  }
}

module.exports = { getTenantDashboard };
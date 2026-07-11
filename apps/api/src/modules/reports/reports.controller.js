// src/modules/reports/reports.controller.js

const { RepairStatus } = require("@prisma/client");
const PDFDocument = require("pdfkit");

const {
  parseRange,
  getTenantForPdf,
  buildSalesSummary,
  buildExpenseSummary,
  buildRepairSummary,
  buildDashboardSummary,
  buildTopSellers,
  buildDailyClose,
  buildInsights,
  buildProductsReport,
  buildOwnerChecksReport,
  buildFinancialSummary,
  buildIncomeStatement,
  buildCashFlowSummary,
  buildBranchPerformance,
  computePeriodSummary,
  getReorderSuggestions,
  getOverdueCollections,
} = require("./reports.service");

// ---- local helpers kept for PDF rendering ----
function parseDateOnly(s) {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isNaN(d.getTime()) ? null : d;
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

function money(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function formatRwf(n) {
  const x = Number(n || 0);
  return `RWF ${x.toLocaleString()}`;
}

function cleanString(x) {
  const s = x == null ? "" : String(x).trim();
  return s || null;
}

function formatTenantLine(tenant) {
  if (!tenant) return "Store: —";
  const parts = [];
  const name = cleanString(tenant.name);
  const phone = cleanString(tenant.phone);
  const email = cleanString(tenant.email);

  if (name) parts.push(name);
  if (phone) parts.push(phone);
  if (email) parts.push(email);

  return parts.length ? `Store: ${parts.join(" • ")}` : "Store: —";
}

function pctChange(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (p === 0) return null;
  return ((c - p) / p) * 100;
}

function shiftRangeBackward(start, end) {
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { prevStart: startOfDay(prevStart), prevEnd: endOfDay(prevEnd) };
}

function getLimit(query = {}, fallback = 10, max = 50) {
  const raw = Number(query.limit);
  return Number.isFinite(raw) && raw > 0 && raw <= max ? Math.floor(raw) : fallback;
}

function getThreshold(query = {}, fallback = 5, max = 10000) {
  const raw = Number(query.threshold);
  return Number.isFinite(raw) && raw >= 0 && raw <= max ? Math.floor(raw) : fallback;
}

function sendReportError(res, err, fallbackMessage) {
  return res
    .status(err?.status || 500)
    .json({ message: err?.message || fallbackMessage });
}

// -------------------------
// GET /reports/sales-summary
// -------------------------
async function salesSummary(req, res) {
  try {
    const payload = await buildSalesSummary({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("salesSummary error:", err);
    return sendReportError(res, err, "Failed to load sales summary");
  }
}

// ---------------------------
// GET /reports/expense-summary
// ---------------------------
async function expenseSummary(req, res) {
  try {
    const payload = await buildExpenseSummary({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("expenseSummary error:", err);
    return sendReportError(res, err, "Failed to load expense summary");
  }
}

// --------------------------
// GET /reports/repair-summary
// --------------------------
async function repairSummary(req, res) {
  try {
    const payload = await buildRepairSummary({
      user: req.user,
      query: req.query,
    });

    return res.json({
      ...payload,
      allowedStatuses: Object.values(RepairStatus),
    });
  } catch (err) {
    console.error("repairSummary error:", err);
    return sendReportError(res, err, "Failed to load repair summary");
  }
}

// ----------------------
// GET /reports/dashboard
// ----------------------
async function dashboard(req, res) {
  try {
    const payload = await buildDashboardSummary({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("dashboard error:", err);
    return sendReportError(res, err, "Failed to load dashboard");
  }
}

// ---------------------------------
// GET /reports/daily-close?date=YYYY-MM-DD
// ---------------------------------
async function dailyClose(req, res) {
  try {
    const payload = await buildDailyClose({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("dailyClose error:", err);
    return sendReportError(res, err, "Failed to load daily close");
  }
}

// ---------------------------------
// GET /reports/top-sellers?from&to&limit
// ---------------------------------
async function topSellers(req, res) {
  try {
    const payload = await buildTopSellers({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("topSellers error:", err);
    return sendReportError(res, err, "Failed to load top sellers");
  }
}

// ---------------------------------
// GET /reports/insights?from&to&limit&threshold
// ---------------------------------
async function insights(req, res) {
  try {
    const payload = await buildInsights({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("insights error:", err);
    return sendReportError(res, err, "Failed to load insights");
  }
}

// ---------------------------------
// GET /reports/products?from&to&limit&threshold
// ---------------------------------
async function productsReport(req, res) {
  try {
    const payload = await buildProductsReport({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("productsReport error:", err);
    return sendReportError(res, err, "Failed to load products report");
  }
}

// ---------------------------------
// GET /reports/financial-summary
// ---------------------------------
// ---------------------------------
// GET /reports/owner-checks
// ---------------------------------
async function ownerChecksReport(req, res) {
  try {
    const payload = await buildOwnerChecksReport({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("ownerChecksReport error:", err);
    return sendReportError(res, err, "Failed to load owner checks");
  }
}

async function financialSummary(req, res) {
  try {
    const payload = await buildFinancialSummary({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("financialSummary error:", err);
    return sendReportError(res, err, "Failed to load financial summary");
  }
}

// ---------------------------------
// GET /reports/income-statement
// ---------------------------------
async function incomeStatement(req, res) {
  try {
    const payload = await buildIncomeStatement({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("incomeStatement error:", err);
    return sendReportError(res, err, "Failed to load income statement");
  }
}

// ---------------------------------
// GET /reports/cash-flow
// ---------------------------------
async function cashFlowSummary(req, res) {
  try {
    const payload = await buildCashFlowSummary({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("cashFlowSummary error:", err);
    return sendReportError(res, err, "Failed to load cash flow summary");
  }
}

// ---------------------------------
// GET /reports/branch-performance
// ---------------------------------
async function branchPerformance(req, res) {
  try {
    const payload = await buildBranchPerformance({
      user: req.user,
      query: req.query,
    });

    return res.json(payload);
  } catch (err) {
    console.error("branchPerformance error:", err);
    return sendReportError(res, err, "Failed to load branch performance");
  }
}

// ---------------------------------
// PDF: GET /reports/daily-close.pdf?date=YYYY-MM-DD
// ---------------------------------
async function dailyClosePdf(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const threshold = getThreshold(req.query, 5, 10000);

    const [tenant, payload] = await Promise.all([
      getTenantForPdf(tenantId),
      buildDailyClose({
        user: req.user,
        query: req.query,
      }),
    ]);

    const dateBase = parseDateOnly(req.query.date) || new Date();
    const start = startOfDay(dateBase);
    const end = endOfDay(dateBase);
    const { prevStart, prevEnd } = shiftRangeBackward(start, end);

    const branchScope = payload.branchScope;

    const [current, previous, reorderList, collectionsList] = await Promise.all([
      computePeriodSummary(branchScope, start, end),
      computePeriodSummary(branchScope, prevStart, prevEnd),
      getReorderSuggestions(branchScope, start, end, 5, threshold),
      getOverdueCollections(branchScope, 5),
    ]);

    const actions = {
      comparison: {
        revenuePct: pctChange(current.revenue, previous.revenue),
        profitPct: pctChange(current.profitEstimate, previous.profitEstimate),
      },
      reorder: reorderList,
      collections: collectionsList,
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="storvex-daily-close-${payload.date}.pdf"`
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    renderDailyClosePdf(doc, payload, tenant, actions);

    doc.end();
  } catch (err) {
    console.error("dailyClosePdf error:", err);
    return sendReportError(res, err, "Failed to generate daily close PDF");
  }
}

// ---------------------------------
// PDF: GET /reports/period.pdf?from&to&limit&threshold
// ---------------------------------
async function periodPdf(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { start, end } = parseRange(req.query);

    const fromISO = ownerPdfDate(start);
    const toISO = ownerPdfDate(end);

    const [tenant, financial, cashFlow, products, ownerChecks] = await Promise.all([
      getTenantForPdf(tenantId),
      buildFinancialSummary({
        user: req.user,
        query: req.query,
      }),
      buildCashFlowSummary({
        user: req.user,
        query: req.query,
      }),
      buildProductsReport({
        user: req.user,
        query: { ...req.query, limit: 3, threshold: 5 },
      }),
      buildOwnerChecksReport({
        user: req.user,
        query: req.query,
      }),
    ]);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="storvex-business-report-${fromISO}-to-${toISO}.pdf"`
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      autoFirstPage: true,
      info: {
        Title: "Storvex Business Report",
        Author: "Storvex",
        Subject: "Owner business report",
      },
    });

    doc.pipe(res);

    renderPremiumOwnerPdf(doc, {
      tenant,
      range: { fromISO, toISO },
      financial,
      cashFlow,
      products,
      ownerChecks,
    });

    doc.end();
  } catch (err) {
    console.error("periodPdf error:", err);
    return sendReportError(res, err, "Failed to generate business report PDF");
  }
}



// =========================
// PDF render helpers (styled)
// =========================
function drawHeader(doc, { title, subtitleLine1, subtitleLine2 }) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;

  doc.save();
  doc.rect(0, 0, pageWidth, 92).fill("#0f172a");
  doc.restore();

  doc.fillColor("#ffffff");
  doc.font("Helvetica-Bold").fontSize(20).text("Storvex", margin, 20);

  doc.font("Helvetica").fontSize(10).fillColor("#cbd5e1");
  doc.text(subtitleLine1, margin, 46);
  if (subtitleLine2) doc.text(subtitleLine2, margin, 62);

  doc.font("Helvetica-Bold").fontSize(16).fillColor("#ffffff");
  doc.text(title, margin, 20, { align: "right" });

  doc.fillColor("#e2e8f0");
  doc.rect(margin, 98, pageWidth - margin * 2, 1).fill();

  doc.fillColor("#0f172a").font("Helvetica");
}

function drawCard(doc, { x, y, w, h, title, value, tone = "neutral", sub }) {
  const toneColor =
    tone === "success"
      ? "#16a34a"
      : tone === "warning"
      ? "#d97706"
      : tone === "danger"
      ? "#dc2626"
      : "#64748b";

  doc.save();
  doc.roundedRect(x, y, w, h, 10).fill("#ffffff").stroke("#e2e8f0");
  doc.restore();

  doc.save();
  doc.roundedRect(x, y, 8, h, 10).fill(toneColor);
  doc.restore();

  doc.fillColor("#475569").font("Helvetica").fontSize(10).text(title, x + 16, y + 10, {
    width: w - 24,
  });
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(16).text(value, x + 16, y + 28, {
    width: w - 24,
  });

  if (sub) {
    doc.fillColor("#64748b").font("Helvetica").fontSize(9).text(sub, x + 16, y + 52, {
      width: w - 24,
    });
  }

  doc.fillColor("#0f172a").font("Helvetica");
}

function drawSectionTitle(doc, { x, y, title }) {
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text(title, x, y);
  doc.fillColor("#0f172a").font("Helvetica");
}

function drawKeyValueList(doc, { x, y, items }) {
  let yy = y;
  for (const { k, v } of items) {
    doc.fillColor("#475569").fontSize(10).text(k, x, yy, { continued: true });
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text(` ${v}`);
    doc.font("Helvetica");
    yy += 16;
  }
  doc.fillColor("#0f172a");
  return yy;
}

function drawTable(doc, { x, y, w, columns, rows }) {
  const headerH = 22;
  const rowH = 20;

  doc.save();
  doc.roundedRect(x, y, w, headerH, 8).fill("#f1f5f9").stroke("#e2e8f0");
  doc.restore();

  let cx = x;
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(10);
  for (const col of columns) {
    doc.text(col.label, cx + 8, y + 6, {
      width: col.w - 16,
      align: col.align || "left",
    });
    cx += col.w;
  }
  doc.font("Helvetica").fillColor("#0f172a");

  let yy = y + headerH;
  rows.forEach((r, idx) => {
    doc.save();
    doc.rect(x, yy, w, rowH).fill(idx % 2 === 0 ? "#ffffff" : "#fbfdff");
    doc.restore();

    doc.save();
    doc.rect(x, yy, w, rowH).stroke("#e2e8f0");
    doc.restore();

    let rx = x;
    for (const col of columns) {
      doc.text(String(r[col.key] ?? ""), rx + 8, yy + 5, {
        width: col.w - 16,
        align: col.align || "left",
      });
      rx += col.w;
    }
    yy += rowH;
  });

  return yy;
}

function drawFooter(doc, { leftText }) {
  const margin = doc.page.margins.left;
  const bottom = doc.page.height - doc.page.margins.bottom;

  doc.fillColor("#94a3b8").fontSize(8).text(leftText, margin, bottom - 14, { align: "left" });
  doc.text(`Page ${doc.page.number}`, margin, bottom - 14, { align: "right" });
  doc.fillColor("#0f172a").font("Helvetica");
}

function fmtPct(x) {
  if (x == null) return "—";
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function renderOwnerActions(doc, { x, y, w, actions, title = "Owner Actions" }) {
  drawSectionTitle(doc, { x, y, title });
  y += 16;

  const gap = 12;
  const colW = (w - gap * 2) / 3;
  const boxH = 78;

  doc.save();
  doc.roundedRect(x, y, colW, boxH, 10).fill("#ffffff").stroke("#e2e8f0");
  doc.restore();
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Trend", x + 12, y + 10);
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(
    `Revenue: ${fmtPct(actions?.comparison?.revenuePct)}\nProfit: ${fmtPct(
      actions?.comparison?.profitPct
    )}${
      actions?.comparison?.expensesPct != null
        ? `\nExpenses: ${fmtPct(actions?.comparison?.expensesPct)}`
        : ""
    }`,
    x + 12,
    y + 28
  );

  const rx = x + colW + gap;
  doc.save();
  doc.roundedRect(rx, y, colW, boxH, 10).fill("#ffffff").stroke("#e2e8f0");
  doc.restore();
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Reorder", rx + 12, y + 10);
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(
    `${(actions?.reorder || []).length} item(s)\nLow stock top sellers`,
    rx + 12,
    y + 28
  );

  const cx = x + (colW + gap) * 2;
  doc.save();
  doc.roundedRect(cx, y, colW, boxH, 10).fill("#ffffff").stroke("#e2e8f0");
  doc.restore();
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Collect", cx + 12, y + 10);
  doc.fillColor("#475569").font("Helvetica").fontSize(9).text(
    `${(actions?.collections || []).length} customer(s)\nOverdue credit`,
    cx + 12,
    y + 28
  );

  y += boxH + 14;

  const reorder = actions?.reorder || [];
  const collections = actions?.collections || [];

  drawSectionTitle(doc, { x, y, title: "Reorder list" });
  y += 14;

  if (!reorder.length) {
    doc.fillColor("#64748b").fontSize(10).text("No reorder suggestions.", x, y);
    doc.fillColor("#0f172a");
    y += 18;
  } else {
    const rows = reorder.slice(0, 10).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      stock: p.stockQty,
      sold: p.soldQty,
    }));

    y =
      drawTable(doc, {
        x,
        y,
        w,
        columns: [
          { key: "rank", label: "#", w: 40, align: "left" },
          { key: "name", label: "Product", w: w - 40 - 70 - 70, align: "left" },
          { key: "sold", label: "Sold", w: 70, align: "right" },
          { key: "stock", label: "Stock", w: 70, align: "right" },
        ],
        rows,
      }) + 14;
  }

  drawSectionTitle(doc, { x, y, title: "Collections list" });
  y += 14;

  if (!collections.length) {
    doc.fillColor("#64748b").fontSize(10).text("No overdue customers.", x, y);
    doc.fillColor("#0f172a");
    y += 18;
  } else {
    const rows = collections.slice(0, 10).map((c, idx) => ({
      rank: idx + 1,
      name: c.name,
      phone: c.phone,
      amount: formatRwf(c.overdueAmount),
    }));

    y =
      drawTable(doc, {
        x,
        y,
        w,
        columns: [
          { key: "rank", label: "#", w: 40, align: "left" },
          { key: "name", label: "Customer", w: w - 40 - 120 - 110, align: "left" },
          { key: "phone", label: "Phone", w: 120, align: "left" },
          { key: "amount", label: "Overdue", w: 110, align: "right" },
        ],
        rows,
      }) + 6;
  }

  return y;
}

function renderDailyClosePdf(doc, payload, tenant, actions) {
  drawHeader(doc, {
    title: "Daily Close",
    subtitleLine1: formatTenantLine(tenant),
    subtitleLine2: `Date: ${payload.date} • Generated: ${new Date().toISOString()}`,
  });

  const margin = doc.page.margins.left;
  const pageW = doc.page.width - margin * 2;
  let y = 116;

  const gap = 12;
  const cardW = (pageW - gap * 2) / 3;
  const cardH = 72;

  drawCard(doc, {
    x: margin,
    y,
    w: cardW,
    h: cardH,
    title: "Cash collected",
    value: formatRwf(payload.cashCollectedToday),
    tone: "success",
    sub: "Cash sales + credit payments",
  });
  drawCard(doc, {
    x: margin + cardW + gap,
    y,
    w: cardW,
    h: cardH,
    title: "Revenue",
    value: formatRwf(payload.sales.revenueToday),
    tone: "neutral",
    sub: "Cash + credit sales",
  });
  drawCard(doc, {
    x: margin + (cardW + gap) * 2,
    y,
    w: cardW,
    h: cardH,
    title: "Profit estimate",
    value: formatRwf(payload.profitEstimateToday),
    tone:
      payload.profitEstimateToday > 0
        ? "success"
        : payload.profitEstimateToday < 0
        ? "danger"
        : "neutral",
    sub: "Revenue − approved expenses",
  });

  y += cardH + 18;

  if (actions) {
    y = renderOwnerActions(doc, {
      x: margin,
      y,
      w: pageW,
      actions,
      title: "Owner Actions (Today)",
    }) + 10;
  }

  const colGap = 18;
  const colW = (pageW - colGap) / 2;

  drawSectionTitle(doc, { x: margin, y, title: "Sales breakdown" });
  drawSectionTitle(doc, { x: margin + colW + colGap, y, title: "Credit exposure" });

  const leftEnd = drawKeyValueList(doc, {
    x: margin,
    y: y + 18,
    items: [
      { k: "Cash sales total:", v: formatRwf(payload.sales.cash.total) },
      { k: "Cash sales count:", v: String(payload.sales.cash.count) },
      { k: "Credit sales total:", v: formatRwf(payload.sales.credit.total) },
      { k: "Credit sales count:", v: String(payload.sales.credit.count) },
      { k: "Approved expenses:", v: formatRwf(payload.expenses.approvedTotal) },
    ],
  });

  const rightEnd = drawKeyValueList(doc, {
    x: margin + colW + colGap,
    y: y + 18,
    items: [
      {
        k: "Outstanding:",
        v: `${formatRwf(payload.creditExposure.outstandingTotal)} (${payload.creditExposure.outstandingCount})`,
      },
      {
        k: "Overdue:",
        v: `${formatRwf(payload.creditExposure.overdueTotal)} (${payload.creditExposure.overdueCount})`,
      },
    ],
  });

  y = Math.max(leftEnd, rightEnd) + 18;

  drawSectionTitle(doc, { x: margin, y, title: "Top sellers" });
  y += 16;

  if (!payload.topSellers.length) {
    doc.fillColor("#64748b").fontSize(10).text("No sales for this day.", margin, y);
    doc.fillColor("#0f172a");
    y += 20;
  } else {
    const rows = payload.topSellers.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      qty: p.soldQty,
    }));
    y =
      drawTable(doc, {
        x: margin,
        y,
        w: pageW,
        columns: [
          { key: "rank", label: "#", w: 40, align: "left" },
          { key: "name", label: "Product", w: pageW - 40 - 80, align: "left" },
          { key: "qty", label: "Qty", w: 80, align: "right" },
        ],
        rows,
      }) + 14;
  }

  drawSectionTitle(doc, { x: margin, y, title: "Totals" });
  y += 18;

  const totalsRows = [
    { k: "Total revenue:", v: formatRwf(payload.sales.revenueToday) },
    { k: "Total cash collected:", v: formatRwf(payload.cashCollectedToday) },
    { k: "Total approved expenses:", v: formatRwf(payload.expenses.approvedTotal) },
    { k: "Profit estimate:", v: formatRwf(payload.profitEstimateToday) },
    { k: "Outstanding credit:", v: formatRwf(payload.creditExposure.outstandingTotal) },
    { k: "Overdue credit:", v: formatRwf(payload.creditExposure.overdueTotal) },
  ];

  drawKeyValueList(doc, { x: margin, y, items: totalsRows });
  drawFooter(doc, { leftText: "Storvex • Daily Close Report" });
}

function renderPeriodPdf(doc, dash, topList, meta, tenant, actions) {
  drawHeader(doc, {
    title: "Period Report",
    subtitleLine1: formatTenantLine(tenant),
    subtitleLine2: `From: ${meta.fromISO} • To: ${meta.toISO} • Generated: ${new Date().toISOString()}`,
  });

  const margin = doc.page.margins.left;
  const pageW = doc.page.width - margin * 2;
  let y = 116;

  const gap = 12;
  const cardW = (pageW - gap * 2) / 3;
  const cardH = 72;

  drawCard(doc, {
    x: margin,
    y,
    w: cardW,
    h: cardH,
    title: "Revenue",
    value: formatRwf(dash.sales.total),
    tone: "neutral",
    sub: `${dash.sales.count} sale(s)`,
  });
  drawCard(doc, {
    x: margin + cardW + gap,
    y,
    w: cardW,
    h: cardH,
    title: "Approved expenses",
    value: formatRwf(dash.expenses.approvedTotal),
    tone: "warning",
    sub: `${dash.expenses.approvedCount} item(s)`,
  });
  drawCard(doc, {
    x: margin + (cardW + gap) * 2,
    y,
    w: cardW,
    h: cardH,
    title: "Profit estimate",
    value: formatRwf(dash.profitEstimate),
    tone:
      dash.profitEstimate > 0 ? "success" : dash.profitEstimate < 0 ? "danger" : "neutral",
    sub: "Revenue − expenses",
  });

  y += cardH + 18;

  if (actions) {
    y = renderOwnerActions(doc, {
      x: margin,
      y,
      w: pageW,
      actions,
      title: "Owner Actions (This Period)",
    }) + 10;
  }

  drawSectionTitle(doc, { x: margin, y, title: "Repairs by status" });
  y += 16;

  const byStatus = dash.repairs?.byStatus || {};
  const statuses = Object.keys(byStatus);

  if (!statuses.length) {
    doc.fillColor("#64748b").fontSize(10).text("No repairs in this period.", margin, y);
    doc.fillColor("#0f172a");
    y += 16;
  } else {
    const rows = statuses.map((k) => ({ status: k, count: byStatus[k] }));
    y =
      drawTable(doc, {
        x: margin,
        y,
        w: pageW,
        columns: [
          { key: "status", label: "Status", w: pageW - 80, align: "left" },
          { key: "count", label: "Count", w: 80, align: "right" },
        ],
        rows,
      }) + 18;
  }

  drawSectionTitle(doc, { x: margin, y, title: "Top sellers" });
  y += 16;

  let topRevenueTotal = 0;

  if (!topList.length) {
    doc.fillColor("#64748b").fontSize(10).text("No sales in this period.", margin, y);
    doc.fillColor("#0f172a");
    y += 20;
  } else {
    const rows = topList.map((p, idx) => {
      topRevenueTotal += money(p.revenue);
      return {
        rank: idx + 1,
        name: p.name,
        qty: p.soldQty,
        revenue: formatRwf(p.revenue),
      };
    });

    y =
      drawTable(doc, {
        x: margin,
        y,
        w: pageW,
        columns: [
          { key: "rank", label: "#", w: 40, align: "left" },
          { key: "name", label: "Product", w: pageW - 40 - 80 - 120, align: "left" },
          { key: "qty", label: "Qty", w: 80, align: "right" },
          { key: "revenue", label: "Revenue", w: 120, align: "right" },
        ],
        rows,
      }) + 14;
  }

  drawSectionTitle(doc, { x: margin, y, title: "Totals" });
  y += 18;

  const totalsRows = [
    { k: "Total revenue:", v: formatRwf(dash.sales.total) },
    { k: "Sales count:", v: String(dash.sales.count) },
    { k: "Total approved expenses:", v: formatRwf(dash.expenses.approvedTotal) },
    { k: "Profit estimate:", v: formatRwf(dash.profitEstimate) },
    { k: "Top sellers revenue (top 10):", v: formatRwf(topRevenueTotal) },
  ];

  drawKeyValueList(doc, { x: margin, y, items: totalsRows });
  drawFooter(doc, { leftText: "Storvex • Period Report" });
}


// === PREMIUM OWNER PERIOD PDF START ===
function ownerPdfDate(value) {
  const d = new Date(value);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function ownerPdfNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function ownerPdfMoney(value) {
  return `Rwf ${Math.round(ownerPdfNumber(value)).toLocaleString("en-US")}`;
}

function ownerPdfText(value, fallback = "—") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function ownerPdfCountLabel(count, singular, plural) {
  const n = ownerPdfNumber(count);
  return `${n.toLocaleString("en-US")} ${n === 1 ? singular : plural}`;
}

function ownerPdfAmount(section) {
  return ownerPdfNumber(section?.total ?? section?.amount ?? section?.value);
}

function ownerPdfCount(section) {
  return ownerPdfNumber(section?.count ?? section?.itemsCount ?? section?.totalCount);
}

function ownerPdfProductName(item) {
  return ownerPdfText(item?.name || item?.productName, "Product");
}

function ownerPdfSoldQty(item) {
  return ownerPdfNumber(item?.soldQty ?? item?.qty ?? item?.unitsSold ?? item?.units);
}

function ownerPdfRevenue(item) {
  return ownerPdfNumber(item?.revenue ?? item?.totalRevenue ?? item?.amount);
}

function ownerPdfStockQty(item) {
  return ownerPdfNumber(item?.stockQty ?? item?.qtyOnHand ?? item?.stock);
}

function ownerPdfMinStock(item) {
  return ownerPdfNumber(item?.minStockLevel ?? item?.minStock ?? item?.limit);
}

function ownerPdfGeneratedAt() {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ownerPdfFitText(doc, text, x, y, options = {}) {
  const {
    width,
    size = 14,
    minSize = 8,
    font = "Helvetica-Bold",
    color = "#0f172a",
    align = "left",
  } = options;

  let currentSize = size;
  const value = String(text ?? "—");

  doc.font(font).fontSize(currentSize);

  while (currentSize > minSize && doc.widthOfString(value) > width) {
    currentSize -= 0.5;
    doc.fontSize(currentSize);
  }

  doc.fillColor(color).text(value, x, y, {
    width,
    align,
    lineBreak: false,
  });

  doc.fillColor("#0f172a");
}

function ownerPdfHeader(doc, { title, subtitle, businessName, period }) {
  const margin = doc.page.margins.left;
  const width = doc.page.width - margin * 2;

  doc.rect(0, 0, doc.page.width, 126).fill("#07111f");

  doc
    .fillColor("#60a5fa")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("STORVEX", margin, 28, {
      characterSpacing: 2,
      lineBreak: false,
    });

  ownerPdfFitText(doc, title, margin, 50, {
    width: width * 0.58,
    size: 32,
    minSize: 22,
    color: "#ffffff",
  });

  doc
    .fillColor("#cbd5e1")
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .text(subtitle, margin, 92, {
      width: width * 0.62,
      lineBreak: false,
    });

  const cardW = 210;
  const cardX = margin + width - cardW;

  doc
    .roundedRect(cardX, 28, cardW, 72, 16)
    .fillAndStroke("#0f2437", "#1d4ed8");

  doc
    .fillColor("#93c5fd")
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .text("BUSINESS", cardX + 16, 43, {
      characterSpacing: 1.7,
      lineBreak: false,
    });

  ownerPdfFitText(doc, businessName, cardX + 16, 58, {
    width: cardW - 32,
    size: 12,
    minSize: 8,
    color: "#ffffff",
  });

  doc
    .fillColor("#dbeafe")
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(period, cardX + 16, 80, {
      width: cardW - 32,
      lineBreak: false,
    });

  doc.fillColor("#0f172a");
}

function ownerPdfAnswer(doc, { x, y, width, title, text, tone = "blue" }) {
  const colors = {
    blue: "#2563eb",
    green: "#059669",
    amber: "#d97706",
    red: "#dc2626",
  };

  const color = colors[tone] || colors.blue;

  doc.roundedRect(x, y, width, 76, 18).fillAndStroke("#f8fafc", "#dbeafe");
  doc.roundedRect(x, y, 6, 76, 3).fill(color);

  doc
    .fillColor(color)
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("OWNER ANSWER", x + 20, y + 15, {
      characterSpacing: 1.6,
      lineBreak: false,
    });

  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(title, x + 20, y + 30, {
      width: width - 40,
      lineBreak: false,
    });

  doc
    .fillColor("#334155")
    .font("Helvetica-Bold")
    .fontSize(10.2)
    .text(text, x + 20, y + 53, {
      width: width - 40,
      lineGap: 1,
    });

  doc.fillColor("#0f172a");
}

function ownerPdfMetric(doc, { x, y, width, height, label, value, helper, tone = "blue" }) {
  const colors = {
    blue: "#2563eb",
    green: "#059669",
    amber: "#d97706",
    red: "#dc2626",
  };

  const color = colors[tone] || colors.blue;

  doc.roundedRect(x, y, width, height, 16).fillAndStroke("#ffffff", "#e2e8f0");
  doc.circle(x + 18, y + 18, 4).fill(color);

  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(5.8)
    .text(String(label).toUpperCase(), x + 30, y + 13, {
      width: width - 42,
      characterSpacing: 0.45,
      lineBreak: false,
    });

  ownerPdfFitText(doc, value, x + 16, y + 34, {
    width: width - 32,
    size: 17,
    minSize: 8,
    color: "#0f172a",
  });

  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(7.8)
    .text(helper, x + 16, y + height - 22, {
      width: width - 32,
      lineBreak: false,
    });

  doc.fillColor("#0f172a");
}

function ownerPdfSection(doc, { x, y, eyebrow, title }) {
  doc
    .fillColor("#2563eb")
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .text(String(eyebrow).toUpperCase(), x, y, {
      characterSpacing: 1.6,
      lineBreak: false,
    });

  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(title, x, y + 13, {
      lineBreak: false,
    });

  doc.fillColor("#0f172a");
  return y + 40;
}

function ownerPdfRow(doc, { x, y, width, rank, title, meta, value }) {
  doc.roundedRect(x, y, width, 43, 13).fillAndStroke("#ffffff", "#e2e8f0");

  doc.roundedRect(x + 12, y + 10, 23, 23, 8).fill("#eff6ff");

  doc
    .fillColor("#2563eb")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(String(rank), x + 12, y + 17.5, {
      width: 23,
      align: "center",
      lineBreak: false,
    });

  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(9.8)
    .text(title, x + 45, y + 10, {
      width: width - 45 - 105,
      lineBreak: false,
    });

  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(meta, x + 45, y + 26, {
      width: width - 45 - 105,
      lineBreak: false,
    });

  ownerPdfFitText(doc, value, x + width - 100, y + 16, {
    width: 86,
    size: 10.5,
    minSize: 7,
    align: "right",
  });

  doc.fillColor("#0f172a");

  return y + 51;
}

function ownerPdfMainAnswer({ financial, ownerChecks }) {
  const revenue = ownerPdfNumber(financial?.summary?.revenue);
  const profit = ownerPdfNumber(financial?.summary?.profitEstimate);
  const overdue = ownerPdfAmount(ownerChecks?.ownerChecks?.overdueCustomerMoney);

  if (overdue > 0) {
    return `Sales: ${ownerPdfMoney(revenue)}. Profit estimate: ${ownerPdfMoney(profit)}. Collect overdue: ${ownerPdfMoney(overdue)}.`;
  }

  return `Sales: ${ownerPdfMoney(revenue)}. Profit estimate: ${ownerPdfMoney(profit)}. No overdue customer money found.`;
}

function ownerPdfActions({ products, ownerChecks }) {
  const checks = ownerChecks?.ownerChecks || {};
  const overdue = ownerPdfAmount(checks.overdueCustomerMoney);
  const supplierDebt = ownerPdfAmount(checks.iOweSuppliers);
  const customerDebt = ownerPdfAmount(checks.customersOweMe);
  const stockItems = Array.isArray(checks.stockToReview?.products)
    ? checks.stockToReview.products
    : [];
  const best = Array.isArray(products?.bestSellers) ? products.bestSellers[0] : null;

  const actions = [];

  if (overdue > 0) {
    actions.push({
      title: "Collect overdue customer money",
      meta: `${ownerPdfMoney(overdue)} is already overdue`,
      value: "First",
    });
  }

  if (supplierDebt > 0) {
    actions.push({
      title: "Review supplier bills",
      meta: `${ownerPdfMoney(supplierDebt)} still unpaid`,
      value: "Check",
    });
  }

  if (stockItems[0]) {
    actions.push({
      title: `Review ${ownerPdfProductName(stockItems[0])}`,
      meta: `${ownerPdfStockQty(stockItems[0])} left / limit ${ownerPdfMinStock(stockItems[0])}`,
      value: "Stock",
    });
  }

  if (actions.length < 3 && customerDebt > 0) {
    actions.push({
      title: "Review customer credit",
      meta: `${ownerPdfMoney(customerDebt)} unpaid by customers`,
      value: "Check",
    });
  }

  if (actions.length < 3 && best) {
    actions.push({
      title: `Keep selling ${ownerPdfProductName(best)}`,
      meta: `${ownerPdfMoney(ownerPdfRevenue(best))} from ${ownerPdfSoldQty(best)} sold`,
      value: "Sell",
    });
  }

  return actions.slice(0, 3);
}

function renderPremiumOwnerPdf(doc, { tenant, range, financial, cashFlow, products, ownerChecks }) {
  const businessName = ownerPdfText(tenant?.name || tenant?.displayName, "Business");
  const period = range.fromISO === range.toISO ? range.fromISO : `${range.fromISO} to ${range.toISO}`;
  const generatedAt = ownerPdfGeneratedAt();

  const margin = doc.page.margins.left;
  const pageW = doc.page.width - margin * 2;

  const summary = financial?.summary || {};
  const checks = ownerChecks?.ownerChecks || {};

  const revenue = ownerPdfNumber(summary.revenue);
  const salesCount = ownerPdfNumber(summary.salesCount);
  const productCost = ownerPdfNumber(summary.costOfGoodsSold);
  const expenses = ownerPdfNumber(summary.approvedExpenses);
  const profit = ownerPdfNumber(summary.profitEstimate);
  const moneyReceived = ownerPdfNumber(cashFlow?.cashFlow?.moneyIn);

  const bestSellers = Array.isArray(products?.bestSellers) ? products.bestSellers.slice(0, 3) : [];
  const needRestock = Array.isArray(products?.needRestock) ? products.needRestock.slice(0, 3) : [];

  ownerPdfHeader(doc, {
    title: "Business Report",
    subtitle: `Generated ${generatedAt}`,
    businessName,
    period,
  });

  let y = 150;

  ownerPdfAnswer(doc, {
    x: margin,
    y,
    width: pageW,
    title: "What the owner should know",
    text: ownerPdfMainAnswer({ financial, ownerChecks }),
    tone: ownerPdfAmount(checks.overdueCustomerMoney) > 0 ? "red" : "green",
  });

  y += 100;

  const gap = 14;
  const metricW = (pageW - gap * 3) / 4;

  ownerPdfMetric(doc, {
    x: margin,
    y,
    width: metricW,
    height: 82,
    label: "Sales made",
    value: ownerPdfMoney(revenue),
    helper: ownerPdfCountLabel(salesCount, "completed sale", "completed sales"),
    tone: "blue",
  });

  ownerPdfMetric(doc, {
    x: margin + metricW + gap,
    y,
    width: metricW,
    height: 82,
    label: "Money received",
    value: ownerPdfMoney(moneyReceived),
    helper: "Payments received",
    tone: "green",
  });

  ownerPdfMetric(doc, {
    x: margin + (metricW + gap) * 2,
    y,
    width: metricW,
    height: 82,
    label: "Expenses",
    value: ownerPdfMoney(expenses),
    helper: "Approved expenses",
    tone: expenses > 0 ? "amber" : "green",
  });

  ownerPdfMetric(doc, {
    x: margin + (metricW + gap) * 3,
    y,
    width: metricW,
    height: 82,
    label: "Profit estimate",
    value: ownerPdfMoney(profit),
    helper: "After costs",
    tone: profit >= 0 ? "green" : "red",
  });

  y += 112;

  doc.roundedRect(margin, y, pageW, 54, 16).fillAndStroke("#f8fafc", "#e2e8f0");

  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("PRODUCT COST", margin + 18, y + 12, {
      characterSpacing: 1.2,
      lineBreak: false,
    });

  ownerPdfFitText(doc, ownerPdfMoney(productCost), margin + 18, y + 28, {
    width: 150,
    size: 13,
    minSize: 8,
  });

  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text("Used to estimate profit.", margin + 184, y + 18, {
      width: pageW - 202,
      lineBreak: false,
    });

  doc
    .fillColor("#94a3b8")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("This is not a cash payment by itself.", margin + 184, y + 33, {
      width: pageW - 202,
      lineBreak: false,
    });

  y += 84;

  const colGap = 20;
  const colW = (pageW - colGap) / 2;

  let leftY = ownerPdfSection(doc, {
    x: margin,
    y,
    eyebrow: "Products",
    title: "Best sellers",
  });

  if (bestSellers.length === 0) {
    doc
      .fillColor("#64748b")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("No sold products found.", margin, leftY, { lineBreak: false });
  } else {
    bestSellers.forEach((item, index) => {
      leftY = ownerPdfRow(doc, {
        x: margin,
        y: leftY,
        width: colW,
        rank: index + 1,
        title: ownerPdfProductName(item),
        meta: `${ownerPdfSoldQty(item)} sold`,
        value: ownerPdfMoney(ownerPdfRevenue(item)),
      });
    });
  }

  let rightY = ownerPdfSection(doc, {
    x: margin + colW + colGap,
    y,
    eyebrow: "Stock",
    title: "Need restock",
  });

  if (needRestock.length === 0) {
    doc
      .fillColor("#64748b")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("No urgent restock issue.", margin + colW + colGap, rightY, { lineBreak: false });
  } else {
    needRestock.forEach((item, index) => {
      rightY = ownerPdfRow(doc, {
        x: margin + colW + colGap,
        y: rightY,
        width: colW,
        rank: index + 1,
        title: ownerPdfProductName(item),
        meta: `${ownerPdfStockQty(item)} left in stock`,
        value: `${ownerPdfSoldQty(item)} sold`,
      });
    });
  }

  doc.addPage();

  ownerPdfHeader(doc, {
    title: "Owner Checks",
    subtitle: `Generated ${generatedAt}`,
    businessName,
    period,
  });

  y = 150;

  const customersOwe = ownerPdfAmount(checks.customersOweMe);
  const customersOweCount = ownerPdfCount(checks.customersOweMe);
  const overdue = ownerPdfAmount(checks.overdueCustomerMoney);
  const overdueCount = ownerPdfCount(checks.overdueCustomerMoney);
  const suppliersOwe = ownerPdfAmount(checks.iOweSuppliers);
  const suppliersOweCount = ownerPdfCount(checks.iOweSuppliers);
  const stockCount = ownerPdfCount(checks.stockToReview);

  ownerPdfAnswer(doc, {
    x: margin,
    y,
    width: pageW,
    title: "What needs action first",
    text:
      overdue > 0
        ? `Collect overdue customer money first: ${ownerPdfMoney(overdue)}.`
        : "No overdue customer money found right now.",
    tone: overdue > 0 ? "red" : "green",
  });

  y += 100;

  ownerPdfMetric(doc, {
    x: margin,
    y,
    width: metricW,
    height: 82,
    label: "Customer credit",
    value: ownerPdfMoney(customersOwe),
    helper: ownerPdfCountLabel(customersOweCount, "unpaid sale", "unpaid sales"),
    tone: customersOwe > 0 ? "amber" : "green",
  });

  ownerPdfMetric(doc, {
    x: margin + metricW + gap,
    y,
    width: metricW,
    height: 82,
    label: "Overdue money",
    value: ownerPdfMoney(overdue),
    helper: ownerPdfCountLabel(overdueCount, "overdue sale", "overdue sales"),
    tone: overdue > 0 ? "red" : "green",
  });

  ownerPdfMetric(doc, {
    x: margin + (metricW + gap) * 2,
    y,
    width: metricW,
    height: 82,
    label: "I owe suppliers",
    value: ownerPdfMoney(suppliersOwe),
    helper: ownerPdfCountLabel(suppliersOweCount, "unpaid bill", "unpaid bills"),
    tone: suppliersOwe > 0 ? "amber" : "green",
  });

  ownerPdfMetric(doc, {
    x: margin + (metricW + gap) * 3,
    y,
    width: metricW,
    height: 82,
    label: "Stock review",
    value: String(stockCount),
    helper: ownerPdfCountLabel(stockCount, "product at limit", "products at limit"),
    tone: stockCount > 0 ? "amber" : "green",
  });

  y += 116;

  y = ownerPdfSection(doc, {
    x: margin,
    y,
    eyebrow: "Owner next move",
    title: "Top 3 actions",
  });

  const actions = ownerPdfActions({ products, ownerChecks });

  if (actions.length === 0) {
    doc
      .fillColor("#64748b")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("No urgent owner action found.", margin, y, { lineBreak: false });
    y += 26;
  } else {
    actions.forEach((action, index) => {
      y = ownerPdfRow(doc, {
        x: margin,
        y,
        width: pageW,
        rank: index + 1,
        title: action.title,
        meta: action.meta,
        value: action.value,
      });
    });
  }

  y += 24;

  doc.roundedRect(margin, y, pageW, 68, 18).fillAndStroke("#f8fafc", "#e2e8f0");

  doc
    .fillColor("#2563eb")
    .font("Helvetica-Bold")
    .fontSize(7)
    .text("NOTE", margin + 20, y + 17, {
      characterSpacing: 1.7,
      lineBreak: false,
    });

  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("This report is for owner decisions only.", margin + 20, y + 31, {
      width: pageW - 40,
      lineBreak: false,
    });

  doc
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Full details remain inside Sales, Stock, Suppliers, Customers, Expenses, and Money pages.", margin + 20, y + 52, {
      width: pageW - 40,
      lineBreak: false,
    });

  doc.fillColor("#0f172a");
}
// === PREMIUM OWNER PERIOD PDF END ===


module.exports = {
  salesSummary,
  expenseSummary,
  repairSummary,
  dashboard,
  dailyClose,
  topSellers,
  insights,
  productsReport,
  ownerChecksReport,
  financialSummary,
  incomeStatement,
  cashFlowSummary,
  branchPerformance,
  dailyClosePdf,
  periodPdf,
};
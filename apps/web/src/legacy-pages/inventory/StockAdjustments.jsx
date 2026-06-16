import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Download,
  FileText,
  MinusCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  downloadStockAdjustmentsExcel,
  getStockAdjustments,
} from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./StockAdjustments.css";

const PAGE_SIZE = 10;

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function toISODate(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function startOfDayQuery(value) {
  if (!value) return undefined;
  return `${value}T00:00:00.000`;
}

function endOfDayQuery(value) {
  if (!value) return undefined;
  return `${value}T23:59:59.999`;
}

function formatNumber(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stockTypeLabel(type) {
  const value = cleanString(type).toUpperCase();

  if (value === "RESTOCK") return "Stock added";
  if (value === "LOSS") return "Stock removed";
  if (value === "CORRECTION") return "Count corrected";

  return "Stock changed";
}

function stockTypeShortLabel(type) {
  const value = cleanString(type).toUpperCase();

  if (value === "RESTOCK") return "Added";
  if (value === "LOSS") return "Removed";
  if (value === "CORRECTION") return "Corrected";

  return "Changed";
}

function stockChangeValue(row) {
  const delta = Number(row?.delta ?? 0);

  if (delta > 0) return `+${formatNumber(delta)}`;
  return formatNumber(delta);
}

function stockChangeTone(row) {
  const type = cleanString(row?.type).toUpperCase();
  const delta = Number(row?.delta ?? 0);

  if (type === "RESTOCK" || delta > 0) return "success";
  if (type === "LOSS" || delta < 0) return "danger";
  if (type === "CORRECTION") return "warning";

  return "neutral";
}

function productName(row) {
  return cleanString(row?.product?.name) || "Unknown product";
}

function productCategory(row) {
  return [cleanString(row?.product?.brand), cleanString(row?.product?.category)]
    .filter(Boolean)
    .join(" • ") || "No category";
}

function changedBy(row) {
  return cleanString(row?.createdBy?.name || row?.createdBy?.email) || "System";
}

function rowNote(row) {
  return cleanString(row?.note) || "No note was added.";
}

function branchLabelFromStorage() {
  const name = cleanString(localStorage.getItem("activeBranchName"));
  const code = cleanString(localStorage.getItem("activeBranchCode"));

  if (code && name) return `${code} • ${name}`;
  if (name) return name;
  if (code) return code;

  return "Current branch";
}

function StatusBadge({ tone = "neutral", children }) {
  return <span className={cx("svx-stock-activity-badge", `is-${tone}`)}>{children}</span>;
}

function StatCard({ icon: Icon, label, value, note, tone = "neutral" }) {
  return (
    <article className={cx("svx-stock-activity-stat", `is-${tone}`)}>
      <span aria-hidden="true">
        <Icon size={18} strokeWidth={2.35} />
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : null}
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <section className="svx-stock-activity-empty">
      <span aria-hidden="true">
        <FileText size={28} strokeWidth={2.25} />
      </span>

      <h3>No stock changes found</h3>
      <p>Try a wider date range, remove the search text, or choose another movement type.</p>
    </section>
  );
}

function ChangeCard({ row }) {
  const tone = stockChangeTone(row);
  const before = Number(row?.beforeQty ?? 0);
  const after = Number(row?.afterQty ?? 0);

  return (
    <article className={cx("svx-stock-activity-row", `is-${tone}`)}>
      <button type="button" className="svx-stock-activity-row-main">
        <span className="svx-stock-activity-row-icon" aria-hidden="true">
          {tone === "success" ? (
            <TrendingUp size={20} strokeWidth={2.25} />
          ) : tone === "danger" ? (
            <MinusCircle size={20} strokeWidth={2.25} />
          ) : (
            <SlidersHorizontal size={20} strokeWidth={2.25} />
          )}
        </span>

        <span>
          <strong>{productName(row)}</strong>
          <small>{productCategory(row)}</small>
        </span>
      </button>

      <div className="svx-stock-activity-row-data">
        <div>
          <span>Change</span>
          <strong className={cx("is-change", `is-${tone}`)}>{stockChangeValue(row)}</strong>
        </div>

        <div>
          <span>Before</span>
          <strong>{formatNumber(before)}</strong>
        </div>

        <div>
          <span>After</span>
          <strong>{formatNumber(after)}</strong>
        </div>

        <div>
          <span>Done by</span>
          <strong>{changedBy(row)}</strong>
        </div>

        <div>
          <span>When</span>
          <strong>{formatDateTime(row?.createdAt)}</strong>
        </div>
      </div>

      <div className="svx-stock-activity-row-side">
        <StatusBadge tone={tone}>{stockTypeShortLabel(row?.type)}</StatusBadge>
        <p>{rowNote(row)}</p>
      </div>
    </article>
  );
}

function PageSkeleton() {
  return (
    <main className="svx-stock-activity-page">
      <div className="svx-stock-activity-shell">
        <div className="svx-stock-activity-skeleton is-hero" />
        <div className="svx-stock-activity-skeleton-grid">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="svx-stock-activity-skeleton is-list" />
      </div>
    </main>
  );
}

export default function StockAdjustments() {
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(
    () => new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
    [today],
  );

  const [from, setFrom] = useState(toISODate(sevenDaysAgo));
  const [to, setTo] = useState(toISODate(today));
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [branchLabel, setBranchLabel] = useState(() => branchLabelFromStorage());

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const data = await getStockAdjustments({
        from: startOfDayQuery(from),
        to: endOfDayQuery(to),
        type: type || undefined,
        q: q.trim() || undefined,
        limit: 200,
      });

      setRows(Array.isArray(data?.adjustments) ? data.adjustments : []);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "stock-history-load-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to load stock activity");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadExcel() {
    if (downloadingExcel || rows.length === 0) return;

    setDownloadingExcel(true);

    try {
      await downloadStockAdjustmentsExcel({
        from: startOfDayQuery(from),
        to: endOfDayQuery(to),
        type: type || undefined,
        q: q.trim() || undefined,
      });

      toast.success("Stock activity downloaded");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "stock-history-export-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to download stock activity");
    } finally {
      setDownloadingExcel(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, type, q]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [from, to, type, q, rows.length]);

  useEffect(() => {
    function onBranchChanged() {
      setBranchLabel(branchLabelFromStorage());
      setVisibleCount(PAGE_SIZE);
      load();
    }

    window.addEventListener("storvex:branch-changed", onBranchChanged);
    window.addEventListener("storvex:workspace-refreshed", onBranchChanged);

    return () => {
      window.removeEventListener("storvex:branch-changed", onBranchChanged);
      window.removeEventListener("storvex:workspace-refreshed", onBranchChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addedCount = rows.filter((row) => cleanString(row.type).toUpperCase() === "RESTOCK").length;
  const removedCount = rows.filter((row) => cleanString(row.type).toUpperCase() === "LOSS").length;
  const correctedCount = rows.filter((row) => cleanString(row.type).toUpperCase() === "CORRECTION").length;

  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  const stats = [
    {
      icon: FileText,
      label: "Total changes",
      value: loading ? "—" : formatNumber(rows.length),
      note: "Current filters",
      tone: "blue",
    },
    {
      icon: TrendingUp,
      label: "Stock added",
      value: loading ? "—" : formatNumber(addedCount),
      note: "New stock received",
      tone: "success",
    },
    {
      icon: MinusCircle,
      label: "Stock removed",
      value: loading ? "—" : formatNumber(removedCount),
      note: "Loss or removal",
      tone: "danger",
    },
    {
      icon: SlidersHorizontal,
      label: "Count corrections",
      value: loading ? "—" : formatNumber(correctedCount),
      note: "Physical count fixes",
      tone: "warning",
    },
  ];

  if (loading && rows.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-stock-activity-page">
      <div className="svx-stock-activity-shell">
        <header className="svx-stock-activity-hero">
          <div>
            <button type="button" className="svx-stock-activity-back" onClick={() => navigate("/app/inventory")}>
              <ArrowLeft size={18} strokeWidth={2.4} />
              <span>Inventory</span>
            </button>

            <p className="svx-stock-activity-kicker">Stock activity</p>
            <h1>Stock movement history.</h1>
            <p className="svx-stock-activity-hero-text">
              See what changed, when it changed, and who changed it in <strong>{branchLabel}</strong>.
            </p>
          </div>

          <div className="svx-stock-activity-hero-actions">
            <AsyncButton
              type="button"
              loading={loading}
              loadingText="Refreshing..."
              className="svx-stock-activity-secondary-button"
              onClick={load}
            >
              <RefreshCw size={16} strokeWidth={2.35} />
              <span>Refresh</span>
            </AsyncButton>

            {rows.length > 0 ? (
              <AsyncButton
                type="button"
                loading={downloadingExcel}
                loadingText="Downloading..."
                className="svx-stock-activity-primary-button"
                onClick={handleDownloadExcel}
              >
                <Download size={16} strokeWidth={2.35} />
                <span>Download</span>
              </AsyncButton>
            ) : null}
          </div>
        </header>

        <section className="svx-stock-activity-stats" aria-label="Stock activity summary">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>

        <section className="svx-stock-activity-board">
          <div className="svx-stock-activity-board-head">
            <div>
              <h2>Movement log</h2>
              <p>Only stock changes are shown here: restocks, losses, and count corrections.</p>
            </div>

            <div className="svx-stock-activity-period">
              <span>{formatNumber(visibleRows.length)} shown</span>
              <strong>{formatNumber(rows.length)} total</strong>
            </div>
          </div>

          <div className="svx-stock-activity-filters">
            <label className="svx-stock-activity-search">
              <Search size={16} strokeWidth={2.35} />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search product, barcode, SKU, serial..."
              />
            </label>

            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All movements</option>
              <option value="RESTOCK">Stock added</option>
              <option value="LOSS">Stock removed</option>
              <option value="CORRECTION">Count corrected</option>
            </select>

            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
            />

            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
            />
          </div>

          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="svx-stock-activity-list">
                {visibleRows.map((row) => (
                  <ChangeCard key={row.id} row={row} />
                ))}
              </div>

              <footer className="svx-stock-activity-footer">
                <span>
                  Showing {formatNumber(visibleRows.length)} of {formatNumber(rows.length)}
                </span>

                {hasMore ? (
                  <button type="button" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                    Load 10 more
                  </button>
                ) : (
                  <strong>End of list</strong>
                )}
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

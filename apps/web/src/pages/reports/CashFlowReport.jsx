import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getCashFlowReport } from "../../services/reportsApi";
import AsyncButton from "../../components/ui/AsyncButton";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { cn } from "../../lib/cn";

const CARD = () =>
  "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";

const PANEL = () =>
  "rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

function todayISO() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - Number(days || 0));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    "01",
  ].join("-");
}

function money(value) {
  const n = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`;
}

function numberValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pct(part, total) {
  const p = numberValue(part);
  const t = numberValue(total);

  if (t <= 0) return 0;

  return Math.max(0, Math.min(100, (p / t) * 100));
}

function toneForAmount(value) {
  const n = numberValue(value);

  if (n > 0) return "success";
  if (n < 0) return "danger";

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

function KpiCard({ label, value, note, tone = "info" }) {
  const barStyles = {
    success: "bg-emerald-500",
    info: "bg-[var(--color-primary)]",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-[var(--color-text-muted)]",
  };

  return (
    <article className={cn(CARD(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className={cn("absolute inset-x-0 top-0 h-1.5", barStyles[tone] || barStyles.info)} />

      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {label}
      </p>

      <div className="mt-4 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl">
        {value}
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {note}
      </p>
    </article>
  );
}

function DetailTile({ label, value, tone = "neutral" }) {
  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {label}
          </p>

          <p className="mt-2 break-words text-sm font-black text-[var(--color-text)]">
            {value || "—"}
          </p>
        </div>

        {tone !== "neutral" ? <Badge tone={tone}>Check</Badge> : null}
      </div>
    </div>
  );
}

function ProgressRow({ label, amount, total, count }) {
  const percentage = pct(amount, total);

  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--color-text)]">
            {label}
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {Number(count || 0)} record{Number(count || 0) === 1 ? "" : "s"}
          </p>
        </div>

        <p className="shrink-0 text-sm font-black text-[var(--color-text)]">
          {money(amount)}
        </p>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--color-card)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-2 text-right text-xs font-bold text-[var(--color-text-muted)]">
        {Math.round(percentage)}%
      </p>
    </div>
  );
}

function MethodCard({ item, total }) {
  const amount = numberValue(item?.amount);
  const percentage = pct(amount, total);

  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[var(--color-text)]">
            {item?.label || item?.method || "Other"}
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {Number(item?.count || 0)} payment{Number(item?.count || 0) === 1 ? "" : "s"}
          </p>
        </div>

        <p className="text-sm font-black text-[var(--color-text)]">
          {money(amount)}
        </p>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--color-card)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function DrawerReasonRow({ item }) {
  const moneyIn = numberValue(item?.moneyIn);
  const moneyOut = numberValue(item?.moneyOut);
  const net = moneyIn - moneyOut;

  return (
    <div className={cn(PANEL(), "p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--color-text)]">
            {item?.label || item?.reason || "Drawer movement"}
          </p>

          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            {Number(item?.count || 0)} movement{Number(item?.count || 0) === 1 ? "" : "s"}
          </p>
        </div>

        <Badge tone={toneForAmount(net)}>
          {net >= 0 ? "+" : ""}
          {money(net)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailTile label="Money in" value={money(moneyIn)} />
        <DetailTile label="Money out" value={money(moneyOut)} />
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

function RangeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-2xl px-4 text-sm font-black transition",
        active
          ? "bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]"
          : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      )}
    >
      {children}
    </button>
  );
}

export default function CashFlowReport() {
  const [range, setRange] = useState({
    from: startOfMonthISO(),
    to: todayISO(),
  });

  const [preset, setPreset] = useState("MONTH");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cashFlow = payload?.cashFlow || {};
  const branchScope = payload?.branchScope || {};
  const dataQuality = payload?.dataQuality || {};

  const methodSplit = Array.isArray(cashFlow?.paymentMethodSplit)
    ? cashFlow.paymentMethodSplit
    : [];

  const moneyInBreakdown = Array.isArray(cashFlow?.moneyInBreakdown)
    ? cashFlow.moneyInBreakdown
    : [];

  const moneyOutBreakdown = Array.isArray(cashFlow?.moneyOutBreakdown)
    ? cashFlow.moneyOutBreakdown
    : [];

  const drawerReasons = Array.isArray(cashFlow?.drawerBreakdown?.byReason)
    ? cashFlow.drawerBreakdown.byReason
    : [];

  const moneyIn = numberValue(cashFlow?.moneyIn);
  const moneyOut = numberValue(cashFlow?.moneyOut);
  const netCashFlow = numberValue(cashFlow?.netCashFlow);
  const openingCash = numberValue(cashFlow?.openingCash);
  const expectedClosingCash = numberValue(cashFlow?.expectedClosingCash);
  const countedCash = numberValue(cashFlow?.countedCash);
  const cashDifference =
    cashFlow?.cashDifference === null || cashFlow?.cashDifference === undefined
      ? null
      : numberValue(cashFlow.cashDifference);

  const hasCountedCash = countedCash > 0;
  const cashCheckTone =
    cashDifference === null ? "neutral" : Math.abs(cashDifference) <= 0 ? "success" : "warning";

  const rangeLabel = useMemo(() => {
    return `${formatDate(range.from)} — ${formatDate(range.to)}`;
  }, [range]);

  async function loadReport({ quiet = false } = {}) {
    if (!quiet) setLoading(true);

    try {
      const data = await getCashFlowReport(range);
      setPayload(data || null);
    } catch (error) {
      console.error("Cash flow report failed:", error);
      toast.error(error?.response?.data?.message || "Failed to load cash flow report");
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  async function refresh() {
    setRefreshing(true);

    try {
      await loadReport({ quiet: true });
      toast.success("Cash flow refreshed");
    } finally {
      setRefreshing(false);
    }
  }

  function applyPreset(nextPreset) {
    setPreset(nextPreset);

    if (nextPreset === "TODAY") {
      setRange({ from: todayISO(), to: todayISO() });
      return;
    }

    if (nextPreset === "7D") {
      setRange({ from: daysAgoISO(6), to: todayISO() });
      return;
    }

    if (nextPreset === "30D") {
      setRange({ from: daysAgoISO(29), to: todayISO() });
      return;
    }

    setRange({ from: startOfMonthISO(), to: todayISO() });
  }

  function updateRange(key, value) {
    setPreset("CUSTOM");
    setRange((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return <PageSkeleton variant="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <section className={cn(CARD(), "relative overflow-hidden p-5 sm:p-6 lg:p-7")}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(74,163,255,0.14)] blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <span className="truncate">
                Cash flow • {branchScope?.label || "Current branch"} • {rangeLabel}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Cash flow report.
            </h1>

            <p className="mt-3 max-w-3xl text-base font-medium leading-8 text-[var(--color-text-muted)]">
              Track money coming in, money going out, payment methods, drawer movement,
              and expected cash at closing.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
             <Link
                to="/app/reports"
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:w-auto"
            >
                Back to reports
            </Link>
            <AsyncButton
              loading={refreshing}
              loadingText="Refreshing..."
              variant="secondary"
              onClick={refresh}
              className="w-full sm:w-auto"
            >
              Refresh
            </AsyncButton>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Branch view" value={branchScope?.label || "Current branch"} />
          <DetailTile label="From" value={formatDate(range.from)} />
          <DetailTile label="To" value={formatDate(range.to)} />
          <DetailTile
            label="Cash check"
            value={
              cashDifference === null
                ? "Not counted yet"
                : cashDifference === 0
                  ? "Balanced"
                  : `${money(cashDifference)} difference`
            }
            tone={cashCheckTone}
          />
        </div>
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <SectionHeader
          eyebrow="Period"
          title="Choose report period"
          text="Use a quick period or choose your own dates."
          action={<Badge tone="info">{preset === "CUSTOM" ? "Custom" : preset}</Badge>}
        />

        <div className="flex flex-wrap gap-2">
          <RangeButton active={preset === "TODAY"} onClick={() => applyPreset("TODAY")}>
            Today
          </RangeButton>
          <RangeButton active={preset === "7D"} onClick={() => applyPreset("7D")}>
            Last 7 days
          </RangeButton>
          <RangeButton active={preset === "30D"} onClick={() => applyPreset("30D")}>
            Last 30 days
          </RangeButton>
          <RangeButton active={preset === "MONTH"} onClick={() => applyPreset("MONTH")}>
            This month
          </RangeButton>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
              From
            </label>
            <input
              type="date"
              value={range.from}
              onChange={(event) => updateRange("from", event.target.value)}
              className="h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-black text-[var(--color-text)]">
              To
            </label>
            <input
              type="date"
              value={range.to}
              onChange={(event) => updateRange("to", event.target.value)}
              className="h-12 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm font-bold text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(74,163,255,0.12)]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Money in"
          value={money(moneyIn)}
          note="Payments received during this period."
          tone="success"
        />

        <KpiCard
          label="Money out"
          value={money(moneyOut)}
          note="Approved expenses during this period."
          tone={moneyOut > 0 ? "warning" : "success"}
        />

        <KpiCard
          label="Net cash flow"
          value={money(netCashFlow)}
          note="Money in minus money out."
          tone={toneForAmount(netCashFlow)}
        />

        <KpiCard
          label="Expected closing cash"
          value={money(expectedClosingCash)}
          note="Opening cash plus drawer movement."
          tone="info"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Cash drawer"
            title="Drawer control"
            text="Compare opening cash, expected closing cash, and counted cash."
            action={
              <Badge tone={hasCountedCash ? cashCheckTone : "neutral"}>
                {hasCountedCash ? "Counted" : "Not counted"}
              </Badge>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailTile label="Opening cash" value={money(openingCash)} />
            <DetailTile label="Expected closing cash" value={money(expectedClosingCash)} />
            <DetailTile
              label="Counted cash"
              value={hasCountedCash ? money(countedCash) : "Not counted yet"}
            />
            <DetailTile
              label="Difference"
              value={cashDifference === null ? "Not available" : money(cashDifference)}
              tone={cashCheckTone}
            />
          </div>

          <div className={cn(PANEL(), "mt-4 p-4")}>
            <p className="text-sm font-black text-[var(--color-text)]">
              Owner meaning
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
              If counted cash is different from expected closing cash, the owner should review
              cash sales, expenses, withdrawals, and drawer movements for this period.
            </p>
          </div>
        </section>

        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Payment methods"
            title="Payment method split"
            text="How customers paid during this period."
          />

          {!methodSplit.length ? (
            <EmptyState title="No payment method data" text="Payments will appear here after sales are recorded." />
          ) : (
            <div className="space-y-3">
              {methodSplit.map((item) => (
                <MethodCard key={item.method || item.label} item={item} total={moneyIn} />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Money in"
            title="Where money came from"
            text="Main sources of money received."
          />

          {!moneyInBreakdown.length ? (
            <EmptyState title="No money-in records" text="Money received will appear here." />
          ) : (
            <div className="space-y-3">
              {moneyInBreakdown.map((item) => (
                <ProgressRow
                  key={item.key || item.label}
                  label={item.label}
                  amount={item.amount}
                  total={moneyIn}
                  count={item.count}
                />
              ))}
            </div>
          )}
        </section>

        <section className={cn(CARD(), "p-5 sm:p-6")}>
          <SectionHeader
            eyebrow="Money out"
            title="Where money went"
            text="Main uses of money during this period."
          />

          {!moneyOutBreakdown.length ? (
            <EmptyState title="No money-out records" text="Approved expenses and drawer money out will appear here." />
          ) : (
            <div className="space-y-3">
              {moneyOutBreakdown.map((item) => (
                <ProgressRow
                  key={item.key || item.label}
                  label={item.label}
                  amount={item.amount}
                  total={moneyOut}
                  count={item.count}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6 lg:p-7")}>
        <SectionHeader
          eyebrow="Drawer movement"
          title="Cash drawer movement categories"
          text="Money added to or removed from the cash drawer."
          action={<Badge tone="info">{drawerReasons.length} categories</Badge>}
        />

        {!drawerReasons.length ? (
          <EmptyState
            title="No drawer movement"
            text="Drawer deposits, withdrawals, float money, and cash expenses will appear here."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {drawerReasons.map((item) => (
              <DrawerReasonRow key={item.reason || item.label} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className={cn(CARD(), "p-5 sm:p-6")}>
        <SectionHeader
          eyebrow="Data check"
          title="Report coverage"
          text="This shows what the report was able to read for this period."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile
            label="Payment source"
            value={dataQuality?.paymentMethodSplitSource || "Sale payments"}
          />
          <DetailTile
            label="Drawer source"
            value={dataQuality?.drawerSource || "Cash drawer records"}
          />
          <DetailTile
            label="Cash sessions"
            value={
              dataQuality?.cashSessionsBranchFiltered
                ? "Branch filtered"
                : "Store-wide or not available"
            }
          />
          <DetailTile
            label="Cash movements"
            value={
              dataQuality?.cashMovementsBranchFiltered
                ? "Branch filtered"
                : "Store-wide or not available"
            }
          />
        </div>
      </section>
    </div>
  );
}
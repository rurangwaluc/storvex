import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getCashFlowReport } from "../../services/reportsApi";
import { getMoneySummary } from "../../services/moneyApi";
import PageSkeleton from "../../components/ui/PageSkeleton";
import "../dashboard/Dashboard.css";
import "./Reports.css";

const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];

function cleanNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function isoDate(date) {
  const d = new Date(date);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function todayISO() {
  return isoDate(new Date());
}

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);

  return isoDate(d);
}

function startOfMonthISO() {
  const d = new Date();
  d.setDate(1);

  return isoDate(d);
}

function startOfYearISO() {
  const d = new Date();
  d.setMonth(0, 1);

  return isoDate(d);
}

function rangeForPreset(key) {
  const today = todayISO();

  if (key === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = isoDate(d);

    return { from: yesterday, to: yesterday };
  }

  if (key === "week") return { from: startOfWeekISO(), to: today };
  if (key === "month") return { from: startOfMonthISO(), to: today };
  if (key === "year") return { from: startOfYearISO(), to: today };

  return { from: today, to: today };
}

function money(value) {
  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(cleanNumber(value)))}`;
}

function numberLabel(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(cleanNumber(value));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getValue(source, paths, fallback = 0) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((current, key) => current?.[key], source);

    if (value !== undefined && value !== null) return value;
  }

  return fallback;
}

function accountBalance(moneySummary, accountType) {
  const accounts = Array.isArray(moneySummary?.moneyAccounts)
    ? moneySummary.moneyAccounts
    : [];

  const found = accounts.find(
    (account) =>
      String(account.accountType || "").toUpperCase() ===
      String(accountType || "").toUpperCase(),
  );

  return cleanNumber(found?.balance);
}

function cashBalance(moneySummary) {
  return cleanNumber(
    getValue(moneySummary, [
      "cashDrawer.expectedCash",
      "cashDrawer.cashExpected",
      "cashDrawer.expected",
      "summary.cashIHave",
      "summary.cash",
    ]),
  );
}

function methodLabel(method) {
  const value = String(method || "").toUpperCase();

  if (value === "CASH") return "Cash";
  if (value === "MOMO") return "MoMo";
  if (value === "BANK") return "Bank";
  if (value === "CARD") return "Other / card / cheque";
  if (value === "OTHER") return "Other / card / cheque";

  return "Other";
}

function moneyAnswer(cashFlow) {
  const moneyIn = cleanNumber(cashFlow?.moneyIn);
  const moneyOut = cleanNumber(cashFlow?.moneyOut);

  if (moneyIn === 0 && moneyOut === 0) {
    return "No money came in or went out during this period.";
  }

  if (moneyIn >= moneyOut) {
    return `Money came in: ${money(moneyIn)}. Money went out: ${money(moneyOut)}. Money left after spending: ${money(moneyIn - moneyOut)}.`;
  }

  return `Money came in: ${money(moneyIn)}. Money went out: ${money(moneyOut)}. Spending was higher than money received by ${money(moneyOut - moneyIn)}.`;
}

function KpiCard({ label, value, helper, tone = "blue" }) {
  return (
    <article className={`svx-report-kpi-card svx-money-report-kpi is-${tone}`}>
      <p className="svx-report-kpi-label">{label}</p>
      <strong className="svx-report-money-value">{value}</strong>
      <span>{helper}</span>
    </article>
  );
}

function MoneyTile({ label, value, helper }) {
  return (
    <article className="svx-report-money-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </article>
  );
}

function MovementRow({ label, amount, count, tone = "in" }) {
  return (
    <div className={`svx-report-money-row is-${tone}`}>
      <div>
        <strong>{label}</strong>
        <span>{numberLabel(count)} record{cleanNumber(count) === 1 ? "" : "s"}</span>
      </div>
      <p>{money(amount)}</p>
    </div>
  );
}

function RangeControls({ selectedPreset, setSelectedPreset, range, setRange }) {
  function choosePreset(key) {
    setSelectedPreset(key);
    setRange(rangeForPreset(key));
  }

  return (
    <section className="svx-report-date-card svx-dashboard-card">
      <div>
        <p className="svx-report-eyebrow">Report dates</p>
        <h2>Choose the money period</h2>
      </div>

      <div className="svx-report-range-buttons">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={selectedPreset === preset.key ? "is-active" : ""}
            onClick={() => choosePreset(preset.key)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="svx-report-date-grid">
        <label>
          <span>From</span>
          <input
            type="date"
            value={range.from}
            onChange={(event) => {
              setSelectedPreset("custom");
              setRange((current) => ({ ...current, from: event.target.value }));
            }}
          />
        </label>

        <label>
          <span>To</span>
          <input
            type="date"
            value={range.to}
            onChange={(event) => {
              setSelectedPreset("custom");
              setRange((current) => ({ ...current, to: event.target.value }));
            }}
          />
        </label>
      </div>

      <div className="svx-report-period">
        Report period: <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
      </div>
    </section>
  );
}

export default function CashFlowReport() {
  const [selectedPreset, setSelectedPreset] = useState("month");
  const [range, setRange] = useState(() => rangeForPreset("month"));
  const [payload, setPayload] = useState(null);
  const [moneySummary, setMoneySummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const [cashFlowData, moneyData] = await Promise.all([
          getCashFlowReport(range),
          getMoneySummary().catch(() => null),
        ]);

        if (!alive) return;

        setPayload(cashFlowData);
        setMoneySummary(moneyData);
      } catch (error) {
        if (!alive) return;
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to load money report",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [range.from, range.to, range.branchId, range.allBranches]);

  const cashFlow = payload?.cashFlow || {};

  const currentMoney = useMemo(() => {
    const cash = cashBalance(moneySummary);
    const momo = accountBalance(moneySummary, "MOMO");
    const bank = accountBalance(moneySummary, "BANK");
    const other = accountBalance(moneySummary, "OTHER");

    return {
      cash,
      momo,
      bank,
      other,
      total: cash + momo + bank + other,
    };
  }, [moneySummary]);

  const methodSplit = Array.isArray(cashFlow.paymentMethodSplit)
    ? cashFlow.paymentMethodSplit
    : [];

  const moneyInBreakdown = Array.isArray(cashFlow.moneyInBreakdown)
    ? cashFlow.moneyInBreakdown
    : [];

  const moneyOutBreakdown = Array.isArray(cashFlow.moneyOutBreakdown)
    ? cashFlow.moneyOutBreakdown
    : [];

  const drawerReasons = Array.isArray(cashFlow.drawerBreakdown?.byReason)
    ? cashFlow.drawerBreakdown.byReason
    : [];

  if (loading && !payload) {
    return <PageSkeleton />;
  }

  return (
    <main className="svx-owner-dashboard svx-business-reports svx-money-report-page">
      <section className="svx-report-hero svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Money report</p>
          <h1>See where money came from and where it went</h1>
          <span>
            Simple report for cash, MoMo, bank, other payments, approved expenses, and cash drawer movement.
          </span>
        </div>

        <aside>
          <p>Showing</p>
          <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
          <span>{payload?.branchScope?.label || "Current branch"}</span>
        </aside>
      </section>

      <section className="svx-report-owner-answer svx-dashboard-card">
        <div>
          <p className="svx-report-eyebrow">Owner answer</p>
          <h2>What happened to money in this period</h2>
          <strong>{moneyAnswer(cashFlow)}</strong>
        </div>

        <Link to="/app/reports" className="svx-report-secondary-link">
          Back to reports
        </Link>
      </section>

      <RangeControls
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
      />

      <section className="svx-report-kpi-grid">
        <KpiCard
          label="Money came in"
          value={money(cashFlow.moneyIn)}
          helper="Payments received in this period"
          tone="green"
        />
        <KpiCard
          label="Money went out"
          value={money(cashFlow.moneyOut)}
          helper="Approved expenses and recorded money out"
          tone="amber"
        />
        <KpiCard
          label="Money left after spending"
          value={money(Math.max(0, cleanNumber(cashFlow.netCashFlow)))}
          helper={
            cleanNumber(cashFlow.netCashFlow) >= 0
              ? "Money in minus money out"
              : `Short by ${money(Math.abs(cleanNumber(cashFlow.netCashFlow)))}`
          }
          tone={cleanNumber(cashFlow.netCashFlow) >= 0 ? "green" : "red"}
        />
        <KpiCard
          label="Business money now"
          value={money(currentMoney.total)}
          helper="Cash, MoMo, bank, and other money now"
          tone="blue"
        />
      </section>

      <section className="svx-report-money-position svx-dashboard-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Money now</p>
            <h2>Where the business money is now</h2>
          </div>
          <strong>{money(currentMoney.total)}</strong>
        </div>

        <div className="svx-report-money-grid">
          <MoneyTile label="Cash" value={money(currentMoney.cash)} helper="Physical cash in drawer" />
          <MoneyTile label="MoMo" value={money(currentMoney.momo)} helper="Money on MoMo" />
          <MoneyTile label="Bank" value={money(currentMoney.bank)} helper="Money in the bank" />
          <MoneyTile label="Other / card / cheque" value={money(currentMoney.other)} helper="Card, cheque, or other payments" />
        </div>
      </section>

      <section className="svx-money-report-grid">
        <article className="svx-dashboard-card svx-money-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Money received</p>
              <h2>Payment methods</h2>
            </div>
          </div>

          <div className="svx-report-money-list">
            {methodSplit.length > 0 ? (
              methodSplit.map((item) => (
                <MovementRow
                  key={item.method}
                  label={methodLabel(item.method)}
                  amount={item.amount}
                  count={item.count}
                  tone="in"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">No payment method records in this period.</p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-money-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Money movement</p>
              <h2>Money in and money out</h2>
            </div>
          </div>

          <div className="svx-report-money-list">
            {moneyInBreakdown.map((item) => (
              <MovementRow
                key={item.key}
                label={item.label}
                amount={item.amount}
                count={item.count}
                tone="in"
              />
            ))}

            {moneyOutBreakdown.map((item) => (
              <MovementRow
                key={item.key}
                label={item.label}
                amount={item.amount}
                count={item.count}
                tone="out"
              />
            ))}
          </div>
        </article>
      </section>

      <section className="svx-dashboard-card svx-money-report-panel">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Cash drawer</p>
            <h2>Cash drawer movement</h2>
          </div>
        </div>

        <div className="svx-report-money-grid">
          <MoneyTile label="Opening cash" value={money(cashFlow.openingCash)} helper="Cash when drawer started" />
          <MoneyTile label="Cash expected" value={money(cashFlow.expectedClosingCash)} helper="What the drawer should have" />
          <MoneyTile label="Cash counted" value={money(cashFlow.countedCash)} helper="What was counted when closed" />
          <MoneyTile
            label="Cash difference"
            value={
              cashFlow.cashDifference === null || cashFlow.cashDifference === undefined
                ? "Not counted yet"
                : money(Math.abs(cleanNumber(cashFlow.cashDifference)))
            }
            helper={
              cleanNumber(cashFlow.cashDifference) === 0
                ? "No difference"
                : "Check drawer closing"
            }
          />
        </div>

        {drawerReasons.length > 0 ? (
          <div className="svx-report-money-list svx-report-drawer-list">
            {drawerReasons.map((item) => (
              <MovementRow
                key={item.reason}
                label={item.reason || "Cash movement"}
                amount={Math.max(cleanNumber(item.moneyIn), cleanNumber(item.moneyOut))}
                count={item.count}
                tone={cleanNumber(item.moneyOut) > 0 ? "out" : "in"}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

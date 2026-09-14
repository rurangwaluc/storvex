import { useEffect, useMemo, useState } from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { getCashFlowReport } from "../../services/reportsApi";
import { getMoneySummary } from "../../services/moneyApi";
import {
  reportQueryKeys,
} from "../../lib/reportQueryKeys";
import {
  useActiveBranchId,
} from "../../hooks/useActiveBranchId";
import PageSkeleton from "../../components/ui/PageSkeleton";
import useTenantMoney from "../../hooks/useTenantMoney";
import useTenantDateTime from "../../hooks/useTenantDateTime";
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

function numberLabel(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(cleanNumber(value));
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
  if (value === "MOMO") return "Mobile money";
  if (value === "BANK") return "Bank";
  if (value === "CARD") return "Other / card / cheque";
  if (value === "OTHER") return "Other / card / cheque";

  return "Other";
}

function moneyAnswer(cashFlow, money) {
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

function MovementRow({ label, amount, count, money, tone = "in" }) {
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

function RangeControls({ selectedPreset, setSelectedPreset, range, setRange, formatDate }) {
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
  const { formatMoney } = useTenantMoney();
  const { formatDate } = useTenantDateTime();

  const money = (value) => formatMoney(cleanNumber(value));

  const [selectedPreset, setSelectedPreset] =
    useState("month");
  const [range, setRange] =
    useState(() => rangeForPreset("month"));

  const activeBranchId =
    useActiveBranchId();

  const explicitBranchId =
    activeBranchId === "default"
      ? undefined
      : activeBranchId;

  const requestRange = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      branchId: explicitBranchId,
    }),
    [
      range.from,
      range.to,
      explicitBranchId,
    ],
  );

  const cashFlowQuery = useQuery({
    queryKey:
      reportQueryKeys.cashFlow({
        branchId: activeBranchId,
        from: range.from,
        to: range.to,
      }),
    queryFn: async () => {
      const [
        cashFlowData,
        moneyData,
      ] = await Promise.all([
        getCashFlowReport(
          requestRange,
        ),
        getMoneySummary(
          {
            branchId:
              explicitBranchId,
          },
          {
            branchId:
              explicitBranchId,
          },
        ).catch(() => null),
      ]);

      return {
        payload:
          cashFlowData || null,
        moneySummary:
          moneyData || null,
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const payload =
    cashFlowQuery.data?.payload ||
    null;
  const moneySummary =
    cashFlowQuery.data?.moneySummary ||
    null;
  const loading =
    cashFlowQuery.isPending;

  useEffect(() => {
    if (!cashFlowQuery.error) return;

    toast.error(
      cashFlowQuery.error?.response
        ?.data?.message ||
        cashFlowQuery.error?.message ||
        "Failed to load money",
      {
        id: "cash-flow-report-load-error",
      },
    );
  }, [cashFlowQuery.error]);

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

  const usedPaymentMethods = methodSplit
    .map((item) => ({
      ...item,
      amount: cleanNumber(item.amount),
      count: cleanNumber(item.count),
    }))
    .filter((item) => item.amount > 0 || item.count > 0)
    .sort((a, b) => b.amount - a.amount);

  const topPaymentMethod = usedPaymentMethods[0] || null;

  const topPaymentShare =
    topPaymentMethod && cleanNumber(cashFlow.moneyIn) > 0
      ? (topPaymentMethod.amount / cleanNumber(cashFlow.moneyIn)) * 100
      : 0;

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
      <section className="svx-money-detail-header">
        <div>
          <p className="svx-report-eyebrow">Money</p>
          <h1>Money</h1>
          <p>
            See money received, spending, balances, payment methods, and cash drawer movement.
          </p>
        </div>

        <div className="svx-money-detail-meta">
          <span>Showing</span>
          <strong>{formatDate(range.from)} to {formatDate(range.to)}</strong>
          <p>{payload?.branchScope?.label || "Current branch"}</p>
          <Link to="/app/reports">Back to overview</Link>
        </div>
      </section>

      <section className="svx-money-result-card">
        <div>
          <p className="svx-report-eyebrow">Money result</p>
          <h2>What happened to money?</h2>
          <strong>{moneyAnswer(cashFlow, money)}</strong>
        </div>
      </section>

      <RangeControls
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        range={range}
        setRange={setRange}
        formatDate={formatDate}
      />

      <section className="svx-report-kpi-grid">
        <KpiCard
          label="Money received"
          value={money(cashFlow.moneyIn)}
          helper="Payments received in this period"
          tone="green"
        />
        <KpiCard
          label="Money spent"
          value={money(cashFlow.moneyOut)}
          helper="Approved expenses and recorded money out"
          tone="amber"
        />
        <KpiCard
          label="Money left"
          value={money(Math.max(0, cleanNumber(cashFlow.netCashFlow)))}
          helper={
            cleanNumber(cashFlow.netCashFlow) >= 0
              ? "Money in minus money out"
              : `Short by ${money(Math.abs(cleanNumber(cashFlow.netCashFlow)))}`
          }
          tone={cleanNumber(cashFlow.netCashFlow) >= 0 ? "green" : "red"}
        />
        <KpiCard
          label="Money available"
          value={money(currentMoney.total)}
          helper="Cash, mobile money, bank, and other money now"
          tone="blue"
        />
      </section>

      <section className="svx-report-money-position svx-dashboard-card">
        <div className="svx-report-section-head">
          <div>
            <p className="svx-report-eyebrow">Money now</p>
            <h2>Money available now</h2>
          </div>
          <strong>{money(currentMoney.total)}</strong>
        </div>

        <div className="svx-report-money-grid">
          <MoneyTile label="Cash" value={money(currentMoney.cash)} helper="Physical cash in drawer" />
          <MoneyTile label="Mobile money" value={money(currentMoney.momo)} helper="Money in mobile money" />
          <MoneyTile label="Bank" value={money(currentMoney.bank)} helper="Money in the bank" />
          <MoneyTile label="Other / card / cheque" value={money(currentMoney.other)} helper="Card, cheque, or other payments" />
        </div>
      </section>

      <section className="svx-money-report-grid">
        <article className="svx-dashboard-card svx-money-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Money received</p>
              <h2>How customers paid</h2>
            </div>
          </div>

          {topPaymentMethod ? (
            <div className="svx-money-top-method">
              <span>Most used payment method</span>
              <strong>{methodLabel(topPaymentMethod.method)}</strong>
              <p>
                {money(topPaymentMethod.amount)} / {topPaymentShare.toFixed(0)}% of money received
              </p>
            </div>
          ) : null}

          <div className="svx-report-money-list">
            {usedPaymentMethods.length > 0 ? (
              usedPaymentMethods.map((item) => (
                <MovementRow
                  key={item.method}
                  label={methodLabel(item.method)}
                  amount={item.amount}
                  count={item.count}
                  money={money}
                  tone="in"
                />
              ))
            ) : (
              <p className="svx-report-empty-text">No customer payments in this period.</p>
            )}
          </div>
        </article>

        <article className="svx-dashboard-card svx-money-report-panel">
          <div className="svx-report-section-head">
            <div>
              <p className="svx-report-eyebrow">Money movement</p>
              <h2>Money movement</h2>
            </div>
          </div>

          <div className="svx-report-money-list">
            {moneyInBreakdown.map((item) => (
              <MovementRow
                key={item.key}
                label={item.label}
                amount={item.amount}
                count={item.count}
                money={money}
                tone="in"
              />
            ))}

            {moneyOutBreakdown.map((item) => (
              <MovementRow
                key={item.key}
                label={item.label}
                amount={item.amount}
                count={item.count}
                money={money}
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
              cashFlow.cashDifference === null || cashFlow.cashDifference === undefined
                ? "Count the drawer to check"
                : cleanNumber(cashFlow.cashDifference) === 0
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
                money={money}
                tone={cleanNumber(item.moneyOut) > 0 ? "out" : "in"}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

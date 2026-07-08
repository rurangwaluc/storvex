import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import {
  addOwnerLoanPayment,
  createOwnerLoan,
  getMoneySummary,
  listOwnerLoans,
} from "../../services/moneyApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./Money.css";

const EMPTY_SUMMARY = {
  summary: {
    cashIHave: 0,
    customersOweMe: 0,
    iOweSuppliers: 0,
    loansIGaveOut: 0,
    loansIReceived: 0,
    moneyComingToMe: 0,
    moneyIOwe: 0,
    netPosition: 0,
  },
  drawer: null,
  customersOweMe: { total: 0, count: 0, top: [] },
  iOweSuppliers: { total: 0, count: 0, top: [] },
  loans: {
    givenOut: { total: 0, count: 0 },
    received: { total: 0, count: 0 },
    recent: [],
  },
  paymentSplit: [],
};

const EMPTY_LOAN_FORM = {
  type: "GIVEN_OUT",
  partyName: "",
  partyPhone: "",
  amount: "",
  paymentMethod: "MOMO",
  reference: "",
  dueDate: "",
  note: "",
};

const EMPTY_PAYMENT_FORM = {
  amount: "",
  method: "MOMO",
  reference: "",
  note: "",
};

function cleanString(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatMoney(value) {
  const n = toNumber(value, 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n)}`;
}

function formatDate(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";

  return d.toLocaleDateString("en-RW", {
    dateStyle: "medium",
  });
}

function formatDateTime(value) {
  if (!value) return "No date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";

  return d.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function paymentMethodLabel(method) {
  const value = cleanString(method).toUpperCase();

  if (value === "CASH") return "Cash";
  if (value === "MOMO") return "MoMo";
  if (value === "BANK") return "Bank";
  if (value === "CARD") return "Card";
  if (value === "OTHER") return "Other";

  return value || "Other";
}

function loanTypeLabel(type) {
  if (type === "GIVEN_OUT") return "Money I gave out";
  if (type === "RECEIVED") return "Money I borrowed";
  return "Loan";
}

function loanStatusLabel(status) {
  const value = cleanString(status).toUpperCase();

  if (value === "OPEN") return "Still unpaid";
  if (value === "PARTIAL") return "Partly paid";
  if (value === "PAID") return "Paid fully";
  if (value === "CANCELLED") return "Cancelled";

  return "Still unpaid";
}

function netTone(value) {
  const n = toNumber(value, 0);

  if (n < 0) return "danger";
  if (n > 0) return "good";
  return "calm";
}

function debtTone(value) {
  return toNumber(value, 0) > 0 ? "danger" : "calm";
}

function incomingTone(value) {
  return toNumber(value, 0) > 0 ? "good" : "calm";
}

function Badge({ children, tone = "calm" }) {
  return <span className={`svx-money-badge is-${tone}`}>{children}</span>;
}

function StatCard({ label, value, note, tone = "calm" }) {
  return (
    <article className={`svx-money-stat is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function EmptyBlock({ title, text, action }) {
  return (
    <div className="svx-money-empty">
      <div className="svx-money-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 7h16v10H4z" />
          <path d="M7 10h10M7 14h5" strokeLinecap="round" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

function PersonMoneyRow({ name, phone, amount, meta, tone = "calm" }) {
  return (
    <div className="svx-money-person-row">
      <div>
        <strong>{name}</strong>
        <span>{phone || meta || "No phone recorded"}</span>
        {phone && meta ? <small>{meta}</small> : null}
      </div>
      <b className={`is-${tone}`}>{formatMoney(amount)}</b>
    </div>
  );
}

function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div className="svx-money-modal-layer">
      <button
        type="button"
        className="svx-money-modal-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <section className="svx-money-modal-panel" role="dialog" aria-modal="true">
        <div className="svx-money-modal-header">
          <div>
            <span className="svx-money-section-kicker">Money</span>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="svx-money-close" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function LoanFormModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_LOAN_FORM);
  const [saving, setSaving] = useState(false);

  function update(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await createOwnerLoan(form);
      toast.success("Loan recorded");
      onSaved();
      onClose();
    } catch (error) {
      if (!handleSubscriptionBlockedError(error)) {
        toast.error(error?.message || "Could not record loan");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Record loan"
      subtitle="Use this when you gave money to someone or borrowed money from someone."
      onClose={onClose}
    >
      <form className="svx-money-form" onSubmit={submit}>
        <label>
          <span>What happened?</span>
          <select value={form.type} onChange={(event) => update("type", event.target.value)}>
            <option value="GIVEN_OUT">I gave money out</option>
            <option value="RECEIVED">I borrowed money</option>
          </select>
        </label>

        <div className="svx-money-form-grid">
          <label>
            <span>Person or business name</span>
            <input
              value={form.partyName}
              onChange={(event) => update("partyName", event.target.value)}
              placeholder="Example: Eric, ABC Supplier, John"
              required
            />
          </label>

          <label>
            <span>Phone optional</span>
            <input
              value={form.partyPhone}
              onChange={(event) => update("partyPhone", event.target.value)}
              placeholder="Example: 078..."
            />
          </label>
        </div>

        <div className="svx-money-form-grid">
          <label>
            <span>Amount</span>
            <input
              value={form.amount}
              onChange={(event) => update("amount", event.target.value.replace(/[^\d]/g, ""))}
              placeholder="Example: 50000"
              inputMode="numeric"
              required
            />
          </label>

          <label>
            <span>Payment method</span>
            <select
              value={form.paymentMethod}
              onChange={(event) => update("paymentMethod", event.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="MOMO">MoMo</option>
              <option value="BANK">Bank</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>

        <div className="svx-money-form-grid">
          <label>
            <span>Proof or transaction ID optional</span>
            <input
              value={form.reference}
              onChange={(event) => update("reference", event.target.value)}
              placeholder="MoMo code, bank slip, receipt number"
            />
          </label>

          <label>
            <span>Due date optional</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => update("dueDate", event.target.value)}
            />
          </label>
        </div>

        <label>
          <span>Note optional</span>
          <textarea
            value={form.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder="Add anything the owner should remember."
          />
        </label>

        <div className="svx-money-modal-actions">
          <button type="button" className="svx-money-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <AsyncButton type="submit" className="svx-money-primary-button" loading={saving}>
            Save loan
          </AsyncButton>
        </div>
      </form>
    </ModalShell>
  );
}

function LoanPaymentModal({ loan, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_PAYMENT_FORM);
  const [saving, setSaving] = useState(false);

  function update(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      await addOwnerLoanPayment(loan.id, form);
      toast.success("Payment recorded");
      onSaved();
      onClose();
    } catch (error) {
      if (!handleSubscriptionBlockedError(error)) {
        toast.error(error?.message || "Could not record payment");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title="Record loan payment"
      subtitle={`${loan.partyName} still has ${formatMoney(loan.balanceDue)} remaining.`}
      onClose={onClose}
    >
      <form className="svx-money-form" onSubmit={submit}>
        <div className="svx-money-form-grid">
          <label>
            <span>Amount paid</span>
            <input
              value={form.amount}
              onChange={(event) => update("amount", event.target.value.replace(/[^\d]/g, ""))}
              placeholder="Example: 20000"
              inputMode="numeric"
              required
            />
          </label>

          <label>
            <span>Payment method</span>
            <select value={form.method} onChange={(event) => update("method", event.target.value)}>
              <option value="CASH">Cash</option>
              <option value="MOMO">MoMo</option>
              <option value="BANK">Bank</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
        </div>

        <label>
          <span>Proof or transaction ID optional</span>
          <input
            value={form.reference}
            onChange={(event) => update("reference", event.target.value)}
            placeholder="MoMo code, bank slip, receipt number"
          />
        </label>

        <label>
          <span>Note optional</span>
          <textarea
            value={form.note}
            onChange={(event) => update("note", event.target.value)}
            placeholder="Example: Paid through MoMo."
          />
        </label>

        <div className="svx-money-modal-actions">
          <button type="button" className="svx-money-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <AsyncButton type="submit" className="svx-money-primary-button" loading={saving}>
            Save payment
          </AsyncButton>
        </div>
      </form>
    </ModalShell>
  );
}

export default function Money() {
  const [payload, setPayload] = useState(EMPTY_SUMMARY);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState(null);

  const loadMoney = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [summaryPayload, loansPayload] = await Promise.all([
          getMoneySummary(),
          listOwnerLoans().catch(() => ({ loans: [] })),
        ]);

        setPayload({
          ...EMPTY_SUMMARY,
          ...(summaryPayload || {}),
          summary: {
            ...EMPTY_SUMMARY.summary,
            ...(summaryPayload?.summary || {}),
          },
          customersOweMe: {
            ...EMPTY_SUMMARY.customersOweMe,
            ...(summaryPayload?.customersOweMe || {}),
          },
          iOweSuppliers: {
            ...EMPTY_SUMMARY.iOweSuppliers,
            ...(summaryPayload?.iOweSuppliers || {}),
          },
          loans: {
            ...EMPTY_SUMMARY.loans,
            ...(summaryPayload?.loans || {}),
          },
        });
        setLoans(Array.isArray(loansPayload?.loans) ? loansPayload.loans : []);
      } catch (error) {
        if (!handleSubscriptionBlockedError(error)) {
          toast.error(error?.message || "Could not load Money page");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadMoney();
  }, [loadMoney]);

  const summary = payload.summary || EMPTY_SUMMARY.summary;
  const drawer = payload.drawer || null;
  const customers = payload.customersOweMe || EMPTY_SUMMARY.customersOweMe;
  const suppliers = payload.iOweSuppliers || EMPTY_SUMMARY.iOweSuppliers;
  const loanSummary = payload.loans || EMPTY_SUMMARY.loans;
  const paymentSplit = Array.isArray(payload.paymentSplit) ? payload.paymentSplit : [];
  const recentMoneyMovements = Array.isArray(payload.recentMoneyMovements)
    ? payload.recentMoneyMovements
    : [];
  const moneyAccounts = Array.isArray(payload.moneyAccounts) ? payload.moneyAccounts : [];

  const accountBalance = useCallback(
    (accountType) => {
      const found = moneyAccounts.find(
        (account) => cleanString(account.accountType).toUpperCase() === cleanString(accountType).toUpperCase(),
      );

      return toNumber(found?.balance, 0);
    },
    [moneyAccounts],
  );

  const cashBalance = toNumber(summary.cashIHave, 0);
  const momoBalance = accountBalance("MOMO");
  const bankBalance = accountBalance("BANK");
  const otherBalance = accountBalance("OTHER");

  const moneyInBusinessNow = cashBalance + momoBalance + bankBalance + otherBalance;
  const moneyNotInMyHandsYet =
    toNumber(summary.customersOweMe, 0) + toNumber(summary.loansIGaveOut, 0);
  const moneyIMustPay =
    toNumber(summary.iOweSuppliers, 0) + toNumber(summary.loansIReceived, 0);

  const openLoans = useMemo(() => {
    return loans.filter((loan) => ["OPEN", "PARTIAL"].includes(cleanString(loan.status).toUpperCase()));
  }, [loans]);

  const recentLoans = useMemo(() => {
    return loans.slice(0, 8);
  }, [loans]);

  if (loading) {
    return (
      <div className="svx-money-page">
        <section className="svx-money-hero">
          <div className="svx-money-skeleton-block">
            <span className="svx-money-skeleton pill" />
            <span className="svx-money-skeleton title" />
            <span className="svx-money-skeleton line" />
          </div>
        </section>

        <section className="svx-money-stat-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="svx-money-skeleton-card" key={index} />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="svx-money-page">
      <section className="svx-money-hero">
        <div className="svx-money-hero-copy">
          <span className="svx-money-kicker">Money</span>
          <h1>Owner money control room</h1>
          <p>
            See cash you have, money customers owe you, money you owe suppliers,
            loans you gave out, loans you received, and your net position.
          </p>

          <div className="svx-money-hero-meta">
            <Badge tone={drawer?.open ? "good" : "calm"}>
              {drawer?.open ? "Cash drawer open" : "Cash drawer closed"}
            </Badge>
            <Badge tone={netTone(summary.netPosition)}>
              Business money picture {formatMoney(moneyInBusinessNow)}
            </Badge>
            <Badge>Updated {formatDateTime(payload.generatedAt)}</Badge>
          </div>
        </div>

        <div className="svx-money-hero-actions">
          <AsyncButton
            type="button"
            className="svx-money-secondary-button"
            onClick={() => loadMoney({ silent: true })}
            loading={refreshing}
          >
            Refresh
          </AsyncButton>
          <button
            type="button"
            className="svx-money-primary-button"
            onClick={() => setLoanModalOpen(true)}
          >
            Record loan
          </button>
        </div>
      </section>

      <section className="svx-money-stat-grid" aria-label="Money summary">
        <StatCard
          label="Cash I have"
          value={formatMoney(cashBalance)}
          note="Expected cash from the drawer"
          tone="primary"
        />
        <StatCard
          label="Customers owe me"
          value={formatMoney(summary.customersOweMe)}
          note={`${customers.count || 0} unpaid credit sale${customers.count === 1 ? "" : "s"}`}
          tone={incomingTone(summary.customersOweMe)}
        />
        <StatCard
          label="I owe suppliers"
          value={formatMoney(summary.iOweSuppliers)}
          note={`${suppliers.count || 0} unpaid supplier bill${suppliers.count === 1 ? "" : "s"}`}
          tone={debtTone(summary.iOweSuppliers)}
        />
        <StatCard
          label="Loans I gave out"
          value={formatMoney(summary.loansIGaveOut)}
          note={`${loanSummary.givenOut?.count || 0} open loan${loanSummary.givenOut?.count === 1 ? "" : "s"}`}
          tone={incomingTone(summary.loansIGaveOut)}
        />
        <StatCard
          label="Loans I received"
          value={formatMoney(summary.loansIReceived)}
          note={`${loanSummary.received?.count || 0} open loan${loanSummary.received?.count === 1 ? "" : "s"}`}
          tone={debtTone(summary.loansIReceived)}
        />
        <StatCard
          label="Business money picture"
          value={formatMoney(summary.netPosition)}
          note="Money coming in, minus money you owe"
          tone={netTone(summary.netPosition)}
        />
      </section>

      <section className="svx-money-owner-grid">
        <article className="svx-money-card svx-money-position-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">At a glance</span>
              <h2>Where my money is</h2>
            </div>
          </div>

          <div className="svx-money-position-body">
            <div className="svx-money-available-main">
              <div>
                <span>Money I have now</span>
                <strong>{formatMoney(moneyInBusinessNow)}</strong>
                <p>
                  This is money currently in Cash, MoMo, Bank, and Other money.
                </p>
              </div>

              <div className="svx-money-available-note">
                <b>Check balance before recording a loan</b>
                <span>
                  Storvex checks the selected payment method first. No loan can make
                  Cash, MoMo, Bank, or Other money go below zero.
                </span>
              </div>
            </div>

            <div className="svx-money-account-grid" aria-label="Money account balances">
              <div>
                <span>Cash</span>
                <strong>{formatMoney(cashBalance)}</strong>
                <small>Physical cash in the drawer</small>
              </div>
              <div>
                <span>MoMo</span>
                <strong>{formatMoney(momoBalance)}</strong>
                <small>Money on MoMo</small>
              </div>
              <div>
                <span>Bank</span>
                <strong>{formatMoney(bankBalance)}</strong>
                <small>Money in the bank</small>
              </div>
              <div>
                <span>Other money</span>
                <strong>{formatMoney(otherBalance)}</strong>
                <small>Card, cheque, or other payments</small>
              </div>
            </div>
          </div>
        </article>

        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Today</span>
              <h2>Payments received</h2>
            </div>
          </div>

          {paymentSplit.length ? (
            <div className="svx-money-method-grid">
              {paymentSplit.map((row) => (
                <div key={row.method}>
                  <span>{paymentMethodLabel(row.method)}</span>
                  <strong>{formatMoney(row.amount)}</strong>
                  <small>
                    {row.count || 0} payment{row.count === 1 ? "" : "s"}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="No payments yet today"
              text="Payments received today by cash, MoMo, bank, or other methods will appear here."
            />
          )}
        </article>
      </section>

      <section className="svx-money-debt-grid">
        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Coming in</span>
              <h2>Customers owe me</h2>
            </div>
            <Link to="/app/pos/credit" className="svx-money-small-link">
              View credit
            </Link>
          </div>

          {customers.top?.length ? (
            <div className="svx-money-list">
              {customers.top.map((row) => (
                <PersonMoneyRow
                  key={row.customerId}
                  name={row.name}
                  phone={row.phone}
                  amount={row.amount}
                  meta={`${row.saleCount || 0} unpaid sale${row.saleCount === 1 ? "" : "s"}`}
                  tone="good"
                />
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="No customers owing you"
              text="When you sell on credit and the customer has not paid fully, they will appear here."
            />
          )}
        </article>

        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Going out</span>
              <h2>I owe suppliers</h2>
            </div>
            <Link to="/app/suppliers" className="svx-money-small-link">
              View suppliers
            </Link>
          </div>

          {suppliers.top?.length ? (
            <div className="svx-money-list">
              {suppliers.top.map((row) => (
                <PersonMoneyRow
                  key={row.supplierId}
                  name={row.name}
                  phone={row.phone}
                  amount={row.amount}
                  meta={`${row.billCount || 0} unpaid bill${row.billCount === 1 ? "" : "s"}`}
                  tone="danger"
                />
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="No supplier money owed"
              text="When supplier bills are unpaid or partly paid, they will appear here."
            />
          )}
        </article>
      </section>

      <section className="svx-money-debt-grid">
        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Loans</span>
              <h2>Loans I gave out</h2>
            </div>
            <button
              type="button"
              className="svx-money-small-link as-button"
              onClick={() => setLoanModalOpen(true)}
            >
              Add loan
            </button>
          </div>

          {openLoans.filter((loan) => loan.type === "GIVEN_OUT").length ? (
            <div className="svx-money-list">
              {openLoans
                .filter((loan) => loan.type === "GIVEN_OUT")
                .map((loan) => (
                  <div className="svx-money-loan-row" key={loan.id}>
                    <div>
                      <strong>{loan.partyName}</strong>
                      <span>{loan.partyPhone || paymentMethodLabel(loan.paymentMethod)}</span>
                      <small>{loanStatusLabel(loan.status)}</small>
                    </div>
                    <div>
                      <b>{formatMoney(loan.balanceDue)}</b>
                      <button type="button" onClick={() => setPaymentLoan(loan)}>
                        Add payment
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyBlock
              title="No money you gave out"
              text="When the owner gives money to someone and expects it back, record it here."
              action={
                <button
                  type="button"
                  className="svx-money-secondary-button"
                  onClick={() => setLoanModalOpen(true)}
                >
                  Record loan
                </button>
              }
            />
          )}
        </article>

        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Loans</span>
              <h2>Loans I received</h2>
            </div>
            <button
              type="button"
              className="svx-money-small-link as-button"
              onClick={() => setLoanModalOpen(true)}
            >
              Add loan
            </button>
          </div>

          {openLoans.filter((loan) => loan.type === "RECEIVED").length ? (
            <div className="svx-money-list">
              {openLoans
                .filter((loan) => loan.type === "RECEIVED")
                .map((loan) => (
                  <div className="svx-money-loan-row" key={loan.id}>
                    <div>
                      <strong>{loan.partyName}</strong>
                      <span>{loan.partyPhone || paymentMethodLabel(loan.paymentMethod)}</span>
                      <small>{loanStatusLabel(loan.status)}</small>
                    </div>
                    <div>
                      <b>{formatMoney(loan.balanceDue)}</b>
                      <button type="button" onClick={() => setPaymentLoan(loan)}>
                        Add payment
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyBlock
              title="No money you borrowed"
              text="When the owner receives money that must be paid back, record it here."
              action={
                <button
                  type="button"
                  className="svx-money-secondary-button"
                  onClick={() => setLoanModalOpen(true)}
                >
                  Record loan
                </button>
              }
            />
          )}
        </article>
      </section>

              <section className="svx-money-card svx-money-movements-card">
          <div className="svx-money-card-head">
            <div>
              <span className="svx-money-badge">RECENT</span>
              <h2>Recent money movements</h2>
            </div>
          </div>

          {recentMoneyMovements.length > 0 ? (
            <div className="svx-money-movement-list">
              {recentMoneyMovements.map((movement) => {
                const isOut = cleanString(movement.direction).toUpperCase() === "OUT";
                const movementAmount = toNumber(movement.amount, 0);
                const sourceType = cleanString(movement.sourceType);
                const label =
                  sourceType === "SalePayment"
                    ? "Sale payment"
                    : sourceType === "Expense"
                      ? "Approved expense"
                      : sourceType === "SupplierPayment"
                        ? "Supplier payment"
                        : sourceType === "OwnerLoan"
                          ? "Loan movement"
                          : sourceType === "CashMovement"
                            ? "Cash movement"
                            : "Money movement";

                return (
                  <article
                    key={`${movement.sourceType || "movement"}-${movement.id || movement.sourceId}`}
                    className={`svx-money-movement-row ${isOut ? "is-out" : "is-in"}`}
                  >
                    <div>
                      <strong>{label}</strong>
                      <span>
                        {movement.accountLabel || "Money"} · {movement.note || movement.reason || "Recorded movement"}
                      </span>
                    </div>

                    <b>
                      {isOut ? "-" : "+"}
                      {formatMoney(movementAmount)}
                    </b>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="svx-money-empty">
              <span className="svx-money-empty-icon">▣</span>
              <strong>No money movements yet</strong>
              <p>Sales, expenses, supplier payments, loans, and cash movements will appear here.</p>
            </div>
          )}
        </section>

<section className="svx-money-owner-grid">
        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Cash drawer</span>
              <h2>Cash I have</h2>
            </div>
            <Link to="/app/pos/drawer" className="svx-money-small-link">
              Open drawer
            </Link>
          </div>

          <div className="svx-money-drawer-box">
            <div>
              <span>Cash expected</span>
              <strong>{formatMoney(drawer?.expectedCash || 0)}</strong>
            </div>
            <div>
              <span>Cash added</span>
              <strong>{formatMoney(drawer?.totalIn || 0)}</strong>
            </div>
            <div>
              <span>Cash removed</span>
              <strong>{formatMoney(drawer?.totalOut || 0)}</strong>
            </div>
            <div>
              <span>Cash difference</span>
              <strong className={`is-${netTone(-(drawer?.difference || 0))}`}>
                {formatMoney(drawer?.difference || 0)}
              </strong>
            </div>
          </div>
        </article>

        <article className="svx-money-card">
          <div className="svx-money-card-header">
            <div>
              <span className="svx-money-section-kicker">Recent</span>
              <h2>Recent loans</h2>
            </div>
          </div>

          {recentLoans.length ? (
            <div className="svx-money-list">
              {recentLoans.map((loan) => (
                <div className="svx-money-recent-row" key={loan.id}>
                  <div>
                    <strong>{loan.partyName}</strong>
                    <span>{loanTypeLabel(loan.type)}</span>
                    <small>{formatDate(loan.createdAt)}</small>
                  </div>
                  <div>
                    <b>{formatMoney(loan.balanceDue)}</b>
                    <Badge tone={loan.status === "PAID" ? "good" : "calm"}>
                      {loanStatusLabel(loan.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="No loans recorded yet"
              text="Loans you gave out or received will appear here after you record them."
            />
          )}
        </article>
      </section>

      {loanModalOpen ? (
        <LoanFormModal
          onClose={() => setLoanModalOpen(false)}
          onSaved={() => loadMoney({ silent: true })}
        />
      ) : null}

      {paymentLoan ? (
        <LoanPaymentModal
          loan={paymentLoan}
          onClose={() => setPaymentLoan(null)}
          onSaved={() => loadMoney({ silent: true })}
        />
      ) : null}
    </div>
  );
}

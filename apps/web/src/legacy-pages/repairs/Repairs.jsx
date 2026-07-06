import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

import {
  archiveRepair,
  assignTechnician,
  createRepair,
  deleteRepair,
  getRepairTechnicians,
  getRepairs,
  updateRepair,
  updateRepairStatus,
} from "../../services/repairsApi";
import { listCustomers } from "../../services/customersApi";
import { getCurrentShopType, supportsRepairs } from "../../utils/categoryFeatures";
import "./Repairs.css";

const REPAIR_STATUSES = [
  { value: "RECEIVED", label: "Received" },
  { value: "CHECKING", label: "Checking" },
  { value: "WAITING_APPROVAL", label: "Waiting approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_REPAIR", label: "In repair" },
  { value: "READY_FOR_PICKUP", label: "Ready for pickup" },
  { value: "COLLECTED", label: "Collected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DELIVERED", label: "Delivered" },
];

const APPROVAL_STATUSES = [
  { value: "NOT_REQUESTED", label: "Not requested" },
  { value: "WAITING", label: "Waiting approval" },
  { value: "APPROVED", label: "Customer approved" },
  { value: "DECLINED", label: "Customer declined" },
];

const PAGE_SIZE = 4;

const EMPTY_REPAIR_FORM = {
  customerId: "",
  device: "",
  serial: "",
  issue: "",
  warrantyEnd: "",
  expectedPickupAt: "",
  estimatedCost: "",
  depositPaid: "",
  finalAmount: "",
  approvalStatus: "NOT_REQUESTED",
  approvalNote: "",
};

function normalizeCustomers(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.customers)) return data.customers;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function cleanString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function cleanDisplayText(value) {
  return String(value || "").replace(/\s*•\s*/g, " ").trim();
}

function toInputDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-soft)]";
}

function pageCard() {
  return "svx-repair-card";
}

function softPanel() {
  return "svx-repair-panel";
}

function inputClass() {
  return "app-input";
}

function primaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-white transition hover:opacity-95",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function secondaryBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-black text-[var(--color-text)] transition hover:border-[var(--color-primary)]",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function dangerBtn(disabled = false) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-2xl border border-[rgba(219,80,74,0.35)] bg-[rgba(219,80,74,0.10)] px-5 text-sm font-black text-[var(--color-danger)] transition hover:opacity-90",
    disabled && "cursor-not-allowed opacity-60",
  );
}

function getCurrentRole() {
  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded?.role ? String(decoded.role).toUpperCase() : null;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `Rwf ${safeAmount.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function approvalLabel(value) {
  const status = String(value || "NOT_REQUESTED").toUpperCase();
  return APPROVAL_STATUSES.find((item) => item.value === status)?.label || "Not requested";
}

function repairBalance(repair) {
  const money = repair?.money || {};
  const estimatedCost = Number(money.estimatedCost ?? repair?.estimatedCost ?? 0);
  const depositPaid = Number(money.depositPaid ?? repair?.depositPaid ?? 0);
  const finalAmount = Number(money.finalAmount ?? repair?.finalAmount ?? 0);
  const chargeAmount = Number(money.chargeAmount ?? (finalAmount > 0 ? finalAmount : estimatedCost));
  return Math.max(chargeAmount - depositPaid, 0);
}

function statusLabel(status) {
  const value = String(status || "").toUpperCase();
  return REPAIR_STATUSES.find((item) => item.value === value)?.label || value || "Unknown";
}

function statusTone(status) {
  const value = String(status || "").toUpperCase();

  if (value === "COLLECTED" || value === "DELIVERED") return "success";
  if (value === "READY_FOR_PICKUP" || value === "COMPLETED") return "primary";
  if (
    value === "CHECKING" ||
    value === "WAITING_APPROVAL" ||
    value === "APPROVED" ||
    value === "IN_REPAIR" ||
    value === "IN_PROGRESS"
  ) {
    return "warning";
  }
  if (value === "CANCELLED") return "danger";

  return "neutral";
}

function Badge({ children, tone = "neutral" }) {
  const classes =
    tone === "success"
      ? "is-success"
      : tone === "warning"
        ? "is-warning"
        : tone === "danger"
          ? "is-danger"
          : tone === "primary"
            ? "is-primary"
            : "";

  return (
    <span className={cx("svx-repair-badge", classes)}>
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h1 className={cx("mt-3 text-[2rem] font-black leading-tight tracking-[-0.04em] sm:text-[2.45rem]", strongText())}>
        {title}
      </h1>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const stripe =
    tone === "success"
      ? "bg-[var(--color-success)]"
      : tone === "warning"
        ? "bg-[var(--color-warning)]"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : "bg-[var(--color-border)]";

  return (
    <article className={cx("svx-repair-summary", `is-${tone}`, softPanel(), "p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", stripe)} />

      <div className="pl-3">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.2em]", softText())}>
          {label}
        </div>
        <div className={cx("mt-3 text-2xl font-black tracking-[-0.04em]", strongText())}>
          {value}
        </div>
        {note ? <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>{note}</div> : null}
      </div>
    </article>
  );
}

function RepairsUnavailable() {
  return (
    <main className="svx-repairs-page mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className={cx(pageCard(), "p-6 text-center sm:p-8")}>
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          Not used for this business type
        </div>
        <h1 className={cx("mt-3 text-2xl font-black tracking-[-0.03em]", strongText())}>
          Repairs are not enabled here
        </h1>
        <p className={cx("mx-auto mt-3 max-w-xl text-sm font-semibold leading-6", mutedText())}>
          Repair jobs are meant for businesses that receive customer items for service, such as electronics, selected spare parts, and selected lighting shops.
        </p>
      </section>
    </main>
  );
}

function ListSkeleton() {
  return (
    <main className="svx-repairs-page mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className={cx(pageCard(), "h-64 animate-pulse")} />
      <div className={cx(pageCard(), "h-40 animate-pulse")} />
      <div className={cx(pageCard(), "h-72 animate-pulse")} />
    </main>
  );
}

function EmptyState({ canCreate, onCreate }) {
  return (
    <div className={cx(softPanel(), "px-5 py-16 text-center")}>
      <div className={cx("text-base font-black", strongText())}>No repairs yet</div>
      <div className={cx("mx-auto mt-2 max-w-xl text-sm font-semibold leading-6", mutedText())}>
        Repair jobs will appear here after a customer leaves an item for service.
      </div>

      {canCreate ? (
        <button type="button" onClick={onCreate} className={cx(primaryBtn(), "mt-5")}>
          Log first repair
        </button>
      ) : null}
    </div>
  );
}

function RepairFormModal({
  open,
  mode,
  form,
  customers,
  customerSearch,
  loadingCustomers,
  busy,
  onClose,
  onSubmit,
  onFieldChange,
  onCustomerSearchChange,
  onChooseCustomer,
}) {
  if (!open) return null;

  const isEdit = mode === "edit";
  const selectedCustomer = customers.find((customer) => customer.id === form.customerId) || null;
  const customerQuery = cleanString(customerSearch).toLowerCase();

  const customerResults = customerQuery
    ? customers
        .filter((customer) =>
          [
            customer.name,
            customer.phone,
            customer.email,
            customer.tin,
            customer.idNumber,
          ]
            .map((item) => String(item || "").toLowerCase())
            .join(" ")
            .includes(customerQuery),
        )
        .slice(0, 6)
    : [];

  return createPortal(
    <div className="svx-repair-modal-backdrop">
      <section className="svx-repair-modal-panel" role="dialog" aria-modal="true">
        <div className="svx-repair-modal-header">
          <div>
            <div className="svx-repair-eyebrow">Repair intake</div>
            <h2>{isEdit ? "Edit repair" : "New repair"}</h2>
            <p>
              {isEdit
                ? "Correct the intake details for this repair record."
                : "Search the customer, choose the item from stock when it exists, and record the reported problem."}
            </p>
          </div>

          <button type="button" className="svx-repair-icon-button" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>

        <form className="svx-repair-form" onSubmit={onSubmit}>
          <div className="svx-repair-form-grid">
            <label className="svx-repair-field svx-repair-search-field">
              <span>
                Customer {!isEdit ? <strong>*</strong> : null}
              </span>
              <input
                className="app-input"
                value={customerSearch}
                onChange={(event) => onCustomerSearchChange(event.target.value)}
                placeholder={isEdit ? "Customer locked for this repair" : "Search customer name, phone, or email"}
                disabled={busy || loadingCustomers || isEdit}
              />
              <em>{isEdit ? "Customer stays locked for traceability." : "Search and choose the customer leaving the item."}</em>

              {!isEdit && customerSearch && !selectedCustomer ? (
                <div className="svx-repair-search-results">
                  {loadingCustomers ? (
                    <div className="svx-repair-search-empty">Loading customers...</div>
                  ) : customerResults.length ? (
                    customerResults.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className="svx-repair-search-result"
                        onClick={() => onChooseCustomer(customer)}
                      >
                        <strong>{customer.name || "Unnamed customer"}</strong>
                        <span>{customer.phone || customer.email || "No contact saved"}</span>
                      </button>
                    ))
                  ) : (
                    <div className="svx-repair-search-empty">No customer found. Create the customer first.</div>
                  )}
                </div>
              ) : null}
            </label>

            <label className="svx-repair-field">
              <span>Item / device <strong>*</strong></span>
              <input
                className="app-input"
                value={form.device}
                onChange={(event) => onFieldChange("device", event.target.value)}
                placeholder="Example: Samsung Galaxy A54"
                disabled={busy}
                required
              />
              <em>This is the customer item being left for repair, not your stock item.</em>
            </label>

            <label className="svx-repair-field">
              <span>Serial / IMEI</span>
              <input
                className="app-input"
                value={form.serial}
                onChange={(event) => onFieldChange("serial", event.target.value)}
                placeholder="Enter serial, IMEI, or customer device number when available"
                disabled={busy}
              />
              <em>Useful when the customer leaves a specific device.</em>
            </label>

            <label className="svx-repair-field">
              <span>Warranty end date</span>
              <input
                type="date"
                className="app-input"
                value={form.warrantyEnd}
                onChange={(event) => onFieldChange("warrantyEnd", event.target.value)}
                disabled={busy}
              />
              <em>Leave empty when no warranty applies.</em>
            </label>

            <label className="svx-repair-field">
              <span>Expected pickup</span>
              <input
                type="date"
                className="app-input"
                value={form.expectedPickupAt}
                onChange={(event) => onFieldChange("expectedPickupAt", event.target.value)}
                disabled={busy}
              />
              <em>When the customer should come back.</em>
            </label>

            <label className="svx-repair-field">
              <span>Approval status</span>
              <select
                className="app-input"
                value={form.approvalStatus}
                onChange={(event) => onFieldChange("approvalStatus", event.target.value)}
                disabled={busy}
              >
                {APPROVAL_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <em>Use this when the customer must approve the quotation.</em>
            </label>

            <label className="svx-repair-field">
              <span>Estimated cost</span>
              <input
                type="number"
                min="0"
                step="any"
                className="app-input"
                value={form.estimatedCost}
                onChange={(event) => onFieldChange("estimatedCost", event.target.value)}
                placeholder="0"
                disabled={busy}
              />
              <em>Expected amount before repair is completed.</em>
            </label>

            <label className="svx-repair-field">
              <span>Deposit paid</span>
              <input
                type="number"
                min="0"
                step="any"
                className="app-input"
                value={form.depositPaid}
                onChange={(event) => onFieldChange("depositPaid", event.target.value)}
                placeholder="0"
                disabled={busy}
              />
              <em>Money paid before or during repair.</em>
            </label>

            <label className="svx-repair-field">
              <span>Final amount</span>
              <input
                type="number"
                min="0"
                step="any"
                className="app-input"
                value={form.finalAmount}
                onChange={(event) => onFieldChange("finalAmount", event.target.value)}
                placeholder="0"
                disabled={busy}
              />
              <em>Leave empty until repair is finished.</em>
            </label>

            <label className="svx-repair-field">
              <span>Approval note</span>
              <input
                className="app-input"
                value={form.approvalNote}
                onChange={(event) => onFieldChange("approvalNote", event.target.value)}
                placeholder="Example: Customer approved by phone"
                disabled={busy}
              />
              <em>Optional note about quotation approval.</em>
            </label>

            <label className="svx-repair-field svx-repair-field-wide">
              <span>Reported problem <strong>*</strong></span>
              <textarea
                className="app-input svx-repair-textarea"
                value={form.issue}
                onChange={(event) => onFieldChange("issue", event.target.value)}
                placeholder="Describe what the customer says is wrong..."
                disabled={busy}
                required
              />
              <em>Keep it simple and clear. The technician can add deeper notes later.</em>
            </label>
          </div>

          {selectedCustomer ? (
            <div className="svx-repair-selected-customer">
              <div>
                <span>Selected customer</span>
                <strong>{selectedCustomer.name}</strong>
              </div>
              <p>{selectedCustomer.phone || selectedCustomer.email || "No contact saved"}</p>
            </div>
          ) : null}

          <div className="svx-repair-modal-actions">
            <button type="button" className="svx-repair-button is-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="svx-repair-button is-primary" disabled={busy}>
              {busy ? (isEdit ? "Saving..." : "Logging...") : isEdit ? "Save repair" : "Log repair"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function ConfirmDialog({ open, title, body, busy, confirmLabel, confirmClass, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className={cx(pageCard(), "w-full max-w-md p-5 sm:p-6")}>
        <div className={cx("text-lg font-black", strongText())}>{title}</div>
        <p className={cx("mt-3 text-sm font-semibold leading-6", mutedText())}>{body}</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className={secondaryBtn(busy)}>
            Cancel
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={confirmClass || dangerBtn(busy)}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RepairActionMenu({
  menu,
  canArchive,
  canDelete,
  onClose,
  onEdit,
  onArchive,
  onDelete,
}) {
  if (!menu?.repair) return null;

  const repair = menu.repair;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close repair actions"
        className="svx-repair-action-backdrop"
        onClick={onClose}
      />

      <div
        className={cx("svx-repair-action-popover", menu.openUp && "opens-up")}
        style={{
          top: `${menu.top}px`,
          left: `${menu.left}px`,
        }}
      >
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit(repair);
          }}
        >
          Edit repair
        </button>

        {canArchive ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onArchive(repair);
            }}
          >
            Archive repair
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              onClose();
              onDelete(repair);
            }}
          >
            Delete repair
          </button>
        ) : null}
      </div>
    </>,
    document.body,
  );
}

function RepairTable({
  repairs,
  technicians,
  canChangeStatus,
  canAssign,
  canArchive,
  canDelete,
  onStatusChange,
  onAssign,
  onOpenRepair,
  onOpenArchive,
  onOpenDelete,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
  statusBusy,
  assignBusy,
  onOpenActions,
}) {
  return (
    <div className="svx-repair-table-wrap">
      <table className="svx-repair-table">
        <thead>
          <tr>
            <th>Repair</th>
            <th>Customer</th>
            <th>Money</th>
            <th>Pickup</th>
            <th>Technician</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {repairs.map((repair) => (
            <tr key={repair.id}>
              <td>
                <div className="svx-repair-table-main">
                  <div className="svx-repair-table-badges">
                    <Badge tone={statusTone(repair.status)}>{statusLabel(repair.status)}</Badge>
                    {repair.repairNumber ? <Badge>{repair.repairNumber}</Badge> : null}
                  </div>
                  <strong>{repair.device || "Unnamed item"}</strong>
                  <span>{repair.serial ? `Serial or IMEI: ${repair.serial}` : "No serial or IMEI saved"}</span>
                </div>
              </td>

              <td>
                <div className="svx-repair-table-stack">
                  <strong>{repair.customer?.name || "Customer not shown"}</strong>
                  <span>{repair.customer?.phone || "No phone saved"}</span>
                  <em>{approvalLabel(repair.approvalStatus)}</em>
                </div>
              </td>

              <td>
                <div className="svx-repair-table-stack">
                  <strong>{formatMoney(repair.estimatedCost)}</strong>
                  <span>Paid: {formatMoney(repair.depositPaid)}</span>
                  <em className={repairBalance(repair) > 0 ? "is-warning" : ""}>
                    Balance: {formatMoney(repairBalance(repair))}
                  </em>
                </div>
              </td>

              <td>
                <div className="svx-repair-table-stack">
                  <strong>{formatDate(repair.expectedPickupAt)}</strong>
                  <span>Received {formatDate(repair.createdAt)}</span>
                </div>
              </td>

              <td>
                {canAssign ? (
                  <select
                    className="app-input svx-repair-table-select"
                    value={repair.technicianId || ""}
                    onChange={(event) => onAssign(repair.id, event.target.value)}
                    disabled={assignBusy === repair.id}
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="svx-repair-table-stack">
                    <strong>{repair.technician?.name || "Unassigned"}</strong>
                  </div>
                )}
              </td>

              <td>
                {canChangeStatus ? (
                  <select
                    className="app-input svx-repair-table-select"
                    value={repair.status || ""}
                    onChange={(event) => onStatusChange(repair.id, event.target.value)}
                    disabled={statusBusy === repair.id}
                  >
                    {REPAIR_STATUSES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge tone={statusTone(repair.status)}>{statusLabel(repair.status)}</Badge>
                )}
              </td>

              <td>
                <div className="svx-repair-table-actions">
                  <button
                    type="button"
                    className="svx-repair-kebab"
                    aria-label="Repair actions"
                    onClick={(event) => onOpenActions(event, repair)}
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RepairRow({
  repair,
  technicians,
  canChangeStatus,
  canAssign,
  canArchive,
  canDelete,
  onStatusChange,
  onAssign,
  onOpenRepair,
  onOpenArchive,
  onOpenDelete,
  openMenuId,
  onToggleMenu,
  onCloseMenu,
  statusBusy,
  assignBusy,
  onOpenActions,
}) {
  return (
    <article className={cx(pageCard(), "svx-repair-row p-4 sm:p-5")}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(repair.status)}>{statusLabel(repair.status)}</Badge>
            {repair.repairNumber ? <Badge>{repair.repairNumber}</Badge> : null}
            {repair.storeLocation?.label ? <Badge>{cleanDisplayText(repair.storeLocation.label)}</Badge> : null}
            <Badge tone={repair.approvalStatus === "APPROVED" ? "success" : repair.approvalStatus === "DECLINED" ? "danger" : repair.approvalStatus === "WAITING" ? "warning" : "neutral"}>
              {approvalLabel(repair.approvalStatus)}
            </Badge>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Item received
              </div>
              <div className={cx("mt-2 truncate text-lg font-black tracking-[-0.03em]", strongText())}>
                {repair.device || "Unnamed item"}
              </div>
              <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                {repair.serial ? `Serial or IMEI: ${repair.serial}` : "No serial or IMEI saved"}
              </div>
            </div>

            <div className="min-w-0">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Customer
              </div>
              <div className={cx("mt-2 truncate text-sm font-black", strongText())}>
                {repair.customer?.name || "Customer not shown"}
              </div>
              <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                {repair.customer?.phone || "No phone saved"}
              </div>
            </div>

            <div className="min-w-0">
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Reported problem
              </div>
              <div className={cx("mt-2 line-clamp-2 text-sm font-semibold leading-5", mutedText())}>
                {repair.issue || "No issue description"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={cx(softPanel(), "p-3")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Received
              </div>
              <div className={cx("mt-2 text-sm font-black", strongText())}>{formatDate(repair.createdAt)}</div>
            </div>

            <div className={cx(softPanel(), "p-3")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Expected pickup
              </div>
              <div className={cx("mt-2 text-sm font-black", strongText())}>{formatDate(repair.expectedPickupAt)}</div>
            </div>

            <div className={cx(softPanel(), "p-3")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Estimate / deposit
              </div>
              <div className={cx("mt-2 text-sm font-black", strongText())}>
                {formatMoney(repair.estimatedCost)}
              </div>
              <div className={cx("mt-1 text-xs font-semibold", mutedText())}>
                Paid: {formatMoney(repair.depositPaid)}
              </div>
            </div>

            <div className={cx(softPanel(), "p-3")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Balance
              </div>
              <div className={cx("mt-2 text-sm font-black", repairBalance(repair) > 0 ? "text-[var(--color-warning)]" : strongText())}>
                {formatMoney(repairBalance(repair))}
              </div>
            </div>

            <div className={cx(softPanel(), "p-3 sm:col-span-1 xl:col-span-2")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Technician
              </div>

              {canAssign ? (
                <select
                  className={cx(inputClass(), "mt-2 h-10 text-xs")}
                  value={repair.technicianId || ""}
                  onChange={(event) => onAssign(repair.id, event.target.value)}
                  disabled={assignBusy === repair.id}
                >
                  <option value="">Unassigned</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={cx("mt-2 text-sm font-black", strongText())}>
                  {repair.technician?.name || "Unassigned"}
                </div>
              )}
            </div>

            <div className={cx(softPanel(), "p-3 sm:col-span-1 xl:col-span-2")}>
              <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
                Status
              </div>

              {canChangeStatus ? (
                <select
                  className={cx(inputClass(), "mt-2 h-10 text-xs")}
                  value={repair.status || ""}
                  onChange={(event) => onStatusChange(repair.id, event.target.value)}
                  disabled={statusBusy === repair.id}
                >
                  {REPAIR_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2">
                  <Badge tone={statusTone(repair.status)}>{statusLabel(repair.status)}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className={cx(softPanel(), "svx-repair-row-actions p-4")}>
          <button
            type="button"
            className="svx-repair-mobile-edit"
            onClick={() => onOpenRepair(repair)}
          >
            Edit repair
          </button>

          <button
            type="button"
            className="svx-repair-mobile-actions"
            aria-label="Repair actions"
            onClick={(event) => onOpenActions(event, repair)}
          >
            Actions
            <span>
              <i />
              <i />
              <i />
            </span>
          </button>
        </aside>
      </div>
    </article>
  );
}

export default function Repairs() {
  const shopType = getCurrentShopType();
  if (!supportsRepairs(shopType)) return <RepairsUnavailable />;

  const role = useMemo(() => getCurrentRole(), []);

  const canCreate = role === "OWNER" || role === "CASHIER";
  const canChangeStatus = role === "OWNER" || role === "TECHNICIAN";
  const canAssign = role === "OWNER";
  const canArchive = role === "OWNER";
  const canDelete = role === "OWNER";

  const [repairs, setRepairs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [statusBusy, setStatusBusy] = useState("");
  const [assignBusy, setAssignBusy] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [repairActionMenu, setRepairActionMenu] = useState(null);

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [repairModalMode, setRepairModalMode] = useState("create");
  const [repairForm, setRepairForm] = useState(EMPTY_REPAIR_FORM);
  const [repairFormBusy, setRepairFormBusy] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadRepairs() {
    const data = await getRepairs();
    if (!mountedRef.current) return;
    setRepairs(Array.isArray(data?.repairs) ? data.repairs : []);
  }

  async function loadTechnicians() {
    try {
      const data = await getRepairTechnicians();
      if (!mountedRef.current) return;
      setTechnicians(Array.isArray(data?.technicians) ? data.technicians : []);
    } catch {
      if (!mountedRef.current) return;
      setTechnicians([]);
    }
  }

  async function refreshAll() {
    setLoading(true);

    try {
      await Promise.all([loadRepairs(), loadTechnicians()]);
    } catch (error) {
      toast.error(error?.message || "Failed to load repairs");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    if (!repairActionMenu) return undefined;

    function handleCloseFloatingMenu() {
      closeRepairActionMenu();
    }

    window.addEventListener("scroll", handleCloseFloatingMenu, true);
    window.addEventListener("resize", handleCloseFloatingMenu);

    return () => {
      window.removeEventListener("scroll", handleCloseFloatingMenu, true);
      window.removeEventListener("resize", handleCloseFloatingMenu);
    };
  }, [repairActionMenu]);

  const filtered = useMemo(() => {
    let list = repairs;

    if (filterStatus !== "ALL") {
      list = list.filter((repair) => repair.status === filterStatus);
    }

    const search = q.trim().toLowerCase();

    if (search) {
      list = list.filter((repair) => {
        const haystack = [
          repair.device,
          repair.customer?.name,
          repair.customer?.phone,
          repair.serial,
          repair.issue,
          repair.technician?.name,
          repair.storeLocation?.label,
        ]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");

        return haystack.includes(search);
      });
    }

    return list;
  }, [repairs, q, filterStatus]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, filterStatus]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const summary = useMemo(
    () => ({
      total: repairs.length,
      received: repairs.filter((repair) => repair.status === "RECEIVED").length,
      inProgress: repairs.filter((repair) =>
        ["CHECKING", "WAITING_APPROVAL", "APPROVED", "IN_REPAIR", "IN_PROGRESS"].includes(repair.status),
      ).length,
      completed: repairs.filter((repair) =>
        ["READY_FOR_PICKUP", "COMPLETED"].includes(repair.status),
      ).length,
      delivered: repairs.filter((repair) =>
        ["COLLECTED", "DELIVERED"].includes(repair.status),
      ).length,
    }),
    [repairs],
  );

  async function handleStatusChange(id, status) {
    closeRepairActionMenu();
    setStatusBusy(id);

    try {
      const updated = await updateRepairStatus(id, status);

      setRepairs((prev) =>
        prev.map((repair) =>
          repair.id === id
            ? {
                ...repair,
                ...updated,
                status: updated?.status || status,
              }
            : repair,
        ),
      );
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setStatusBusy("");
    }
  }

  async function handleAssign(repairId, technicianId) {
    closeRepairActionMenu();
    setAssignBusy(repairId);

    const value = technicianId === "" ? null : technicianId;

    try {
      const updated = await assignTechnician(repairId, value);
      const technician = technicians.find((item) => item.id === value) || null;

      setRepairs((prev) =>
        prev.map((repair) =>
          repair.id === repairId
            ? {
                ...repair,
                ...updated,
                technicianId: updated?.technicianId ?? value,
                technician: updated?.technician || (technician ? { name: technician.name } : null),
              }
            : repair,
        ),
      );
    } catch (error) {
      toast.error(error?.message || "Failed to assign technician");
    } finally {
      setAssignBusy("");
    }
  }

  async function loadCustomersForModal() {
    setCustomersLoading(true);

    try {
      const data = await listCustomers();
      const rows = normalizeCustomers(data).filter((customer) => customer.isActive !== false);
      setCustomers(rows);
    } catch (error) {
      toast.error(error?.message || "Failed to load customers");
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }

  function setRepairFormField(key, value) {
    setRepairForm((current) => ({ ...current, [key]: value }));
  }

  function handleCustomerSearchChange(value) {
    setCustomerSearch(value);

    if (repairForm.customerId) {
      const selected = customers.find((customer) => customer.id === repairForm.customerId);
      const selectedName = cleanString(selected?.name);
      const next = cleanString(value);

      if (selectedName && next !== selectedName) {
        setRepairForm((current) => ({ ...current, customerId: "" }));
      }
    }
  }

  function chooseRepairCustomer(customer) {
    setRepairForm((current) => ({ ...current, customerId: customer.id || "" }));
    setCustomerSearch(customer.name || customer.phone || "");
  }

  function openCreateRepairModal() {
    setEditingRepair(null);
    setRepairModalMode("create");
    setRepairForm(EMPTY_REPAIR_FORM);
    setCustomerSearch("");
    setRepairModalOpen(true);
    void loadCustomersForModal();
  }

  function openEditRepairModal(repair) {
    setEditingRepair(repair);
    setRepairModalMode("edit");
    setRepairForm({
      customerId: repair.customerId || "",
      device: repair.device || "",
      serial: repair.serial || "",
      issue: repair.issue || "",
      warrantyEnd: toInputDate(repair.warrantyEnd),
      expectedPickupAt: toInputDate(repair.expectedPickupAt),
      estimatedCost: repair.estimatedCost == null || Number(repair.estimatedCost) === 0 ? "" : String(repair.estimatedCost),
      depositPaid: repair.depositPaid == null || Number(repair.depositPaid) === 0 ? "" : String(repair.depositPaid),
      finalAmount: repair.finalAmount == null || Number(repair.finalAmount) === 0 ? "" : String(repair.finalAmount),
      approvalStatus: repair.approvalStatus || "NOT_REQUESTED",
      approvalNote: repair.approvalNote || "",
    });
    setCustomerSearch(repair.customer?.name || repair.customer?.phone || "");
    setRepairModalOpen(true);
    void loadCustomersForModal();
  }

  function closeRepairModal() {
    if (repairFormBusy) return;
    setRepairModalOpen(false);
    setEditingRepair(null);
    setRepairForm(EMPTY_REPAIR_FORM);
    setCustomerSearch("");
  }

  async function submitRepairForm(event) {
    event.preventDefault();

    const device = String(repairForm.device || "").trim();
    const serial = String(repairForm.serial || "").trim();
    const issue = String(repairForm.issue || "").trim();

    if (repairModalMode === "create" && !repairForm.customerId) {
      toast.error("Choose the customer leaving the item.");
      return;
    }

    if (!device) {
      toast.error("Item or device name is required.");
      return;
    }

    if (!issue) {
      toast.error("Reported problem is required.");
      return;
    }

    setRepairFormBusy(true);

    const repairPayload = {
      device,
      serial: serial || null,
      issue,
      warrantyEnd: repairForm.warrantyEnd || null,
      expectedPickupAt: repairForm.expectedPickupAt || null,
      estimatedCost: repairForm.estimatedCost || 0,
      depositPaid: repairForm.depositPaid || 0,
      finalAmount: repairForm.finalAmount || 0,
      approvalStatus: repairForm.approvalStatus || "NOT_REQUESTED",
      approvalNote: repairForm.approvalNote || null,
    };

    try {
      if (repairModalMode === "edit" && editingRepair?.id) {
        const updated = await updateRepair(editingRepair.id, repairPayload);

        setRepairs((current) =>
          current.map((repair) =>
            repair.id === editingRepair.id ? { ...repair, ...updated } : repair,
          ),
        );

        toast.success("Repair updated");
      } else {
        const created = await createRepair({
          customerId: repairForm.customerId,
          ...repairPayload,
        });

        setRepairs((current) => [created, ...current]);
        toast.success("Repair logged");
      }

      closeRepairModal();
    } catch (error) {
      toast.error(error?.message || "Failed to save repair");
    } finally {
      setRepairFormBusy(false);
    }
  }

  function closeRepairActionMenu() {
    setRepairActionMenu(null);
    setOpenActionMenuId("");
  }

  function openRepairActionMenu(event, repair) {
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 132;
    const gap = 8;
    const safePadding = 10;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight + gap + safePadding && spaceAbove > menuHeight + gap + safePadding;

    const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;
    const left = rect.right - menuWidth;

    setRepairActionMenu({
      repair,
      openUp,
      top: Math.max(safePadding, Math.min(top, window.innerHeight - menuHeight - safePadding)),
      left: Math.max(safePadding, Math.min(left, window.innerWidth - menuWidth - safePadding)),
    });
  }

  async function confirmArchive() {
    if (!archiveTarget) return;

    setArchiveBusy(true);

    try {
      await archiveRepair(archiveTarget.id);
      setRepairs((prev) => prev.filter((repair) => repair.id !== archiveTarget.id));
      setArchiveTarget(null);
      toast.success("Repair archived");
    } catch (error) {
      toast.error(error?.message || "Failed to archive repair");
    } finally {
      setArchiveBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteBusy(true);

    try {
      await deleteRepair(deleteTarget.id);
      setRepairs((prev) => prev.filter((repair) => repair.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success("Repair deleted");
    } catch (error) {
      toast.error(error?.message || "Failed to delete repair");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <main className="svx-repairs-page mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeading
            eyebrow="Repair jobs"
            title="Repair control"
            subtitle="Track customer items received for service, who is handling them, and what stage each repair is in."
          />

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void refreshAll()} className={secondaryBtn()}>
              Refresh
            </button>

            {canCreate ? (
              <button type="button" onClick={openCreateRepairModal} className={primaryBtn()}>
                New repair
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total repairs" value={summary.total} note="All repair records" tone="primary" />
          <SummaryCard label="Received" value={summary.received} note="Waiting to be checked" tone="primary" />
          <SummaryCard label="In service" value={summary.inProgress} note="Being checked or repaired" tone="warning" />
          <SummaryCard label="Collected" value={summary.delivered} note="Returned to customer" tone="success" />
        </div>
      </section>

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="svx-repair-filter-grid">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <label>
              <div className={cx("mb-2 text-sm font-black", strongText())}>Search</div>
              <input
                className={inputClass()}
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search item, customer, phone, serial, or issue"
              />
            </label>

            <label>
              <div className={cx("mb-2 text-sm font-black", strongText())}>Status</div>
              <select
                className={inputClass()}
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="ALL">All repairs</option>
                {REPAIR_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={cx("svx-repair-showing", softPanel(), "p-4")}>
            <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
              Showing
            </div>
            <div className={cx("mt-2 text-2xl font-black", strongText())}>{filtered.length}</div>
            <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
              Repair job{filtered.length === 1 ? "" : "s"} from current filters
            </div>
          </div>
        </div>
      </section>

      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="svx-repair-log-header flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
              Repair log
            </div>
            <h2 className={cx("mt-2 text-2xl font-black tracking-[-0.04em]", strongText())}>
              Jobs in service
            </h2>
            <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
              Update status, assign technicians, and open records when details need correction.
            </p>
          </div>

          <Badge>{visible.length} of {filtered.length}</Badge>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {visible.length ? (
            <>
              <div className="svx-repair-desktop-list">
                <RepairTable
                  repairs={visible}
                  technicians={technicians}
                  canChangeStatus={canChangeStatus}
                  canAssign={canAssign}
                  canArchive={canArchive}
                  canDelete={canDelete}
                  onStatusChange={handleStatusChange}
                  onAssign={handleAssign}
                  onOpenRepair={openEditRepairModal}
                  onOpenArchive={setArchiveTarget}
                  onOpenDelete={setDeleteTarget}
                  openMenuId={openActionMenuId}
                  onToggleMenu={(id) => setOpenActionMenuId((current) => (current === id ? "" : id))}
                  onCloseMenu={() => setOpenActionMenuId("")}
                  statusBusy={statusBusy}
                  assignBusy={assignBusy}
                  onOpenActions={openRepairActionMenu}
                />
              </div>

              <div className="svx-repair-card-list">
                {visible.map((repair) => (
                  <RepairRow
                    key={repair.id}
                    repair={repair}
                    technicians={technicians}
                    canChangeStatus={canChangeStatus}
                    canAssign={canAssign}
                    canArchive={canArchive}
                    canDelete={canDelete}
                    onStatusChange={handleStatusChange}
                    onAssign={handleAssign}
                    onOpenRepair={openEditRepairModal}
                    onOpenArchive={setArchiveTarget}
                    onOpenDelete={setDeleteTarget}
                    openMenuId={openActionMenuId}
                    onToggleMenu={(id) => setOpenActionMenuId((current) => (current === id ? "" : id))}
                    onCloseMenu={() => setOpenActionMenuId("")}
                    statusBusy={statusBusy}
                    assignBusy={assignBusy}
                    onOpenActions={openRepairActionMenu}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState canCreate={canCreate} onCreate={openCreateRepairModal} />
          )}

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                className={secondaryBtn()}
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
              >
                Load more repairs
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <RepairActionMenu
        menu={repairActionMenu}
        canArchive={canArchive}
        canDelete={canDelete}
        onClose={closeRepairActionMenu}
        onEdit={openEditRepairModal}
        onArchive={setArchiveTarget}
        onDelete={setDeleteTarget}
      />

      <RepairFormModal
        open={repairModalOpen}
        mode={repairModalMode}
        form={repairForm}
        customers={customers}
        customerSearch={customerSearch}
        loadingCustomers={customersLoading}
        busy={repairFormBusy}
        onClose={closeRepairModal}
        onSubmit={submitRepairForm}
        onFieldChange={setRepairFormField}
        onCustomerSearchChange={handleCustomerSearchChange}
        onChooseCustomer={chooseRepairCustomer}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive repair?"
        body="This removes the repair from the active list but keeps the record for history."
        busy={archiveBusy}
        confirmLabel="Archive"
        confirmClass={secondaryBtn(archiveBusy)}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={confirmArchive}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete repair?"
        body="This permanently removes the repair record. Use delete only when the record was created by mistake."
        busy={deleteBusy}
        confirmLabel="Delete"
        confirmClass={dangerBtn(deleteBusy)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}

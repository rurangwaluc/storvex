import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { getDeliveryNoteById, openDeliveryNotePrint } from "../../services/deliveryNotesApi";

const strong = () => "text-[var(--color-text)]";
const muted = () => "text-[var(--color-text-muted)]";
const soft = () => "text-[var(--color-text-soft)]";
const shell = () => "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
const panel = () => "rounded-[24px] bg-[var(--color-surface-2)]";

function safeStr(value) {
  return value == null ? "" : String(value);
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function smallBtn() {
  return "inline-flex h-10 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-4 text-sm font-medium text-[var(--color-text)] transition hover:opacity-90";
}

function badgeClass(kind = "neutral") {
  if (kind === "success") {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";
  }

  return "inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]";
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="space-y-6">
      <section className={`${shell()} overflow-hidden p-5 md:p-6`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-surface)]" />
            <div className="mt-4 h-8 w-60 animate-pulse rounded-full bg-[var(--color-surface)]" />
            <div className="mt-3 h-4 w-full max-w-[420px] animate-pulse rounded-full bg-[var(--color-surface)]" />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="h-10 w-28 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
            <div className="h-10 w-32 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
            <div className="h-10 w-36 animate-pulse rounded-2xl bg-[var(--color-surface)]" />
          </div>
        </div>
      </section>

      <section className={`${shell()} overflow-hidden p-5 md:p-6`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded-full bg-[var(--color-surface)]" />
            <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--color-surface)]" />
          </div>

          <div className="space-y-2">
            <div className="ml-auto h-4 w-16 animate-pulse rounded-full bg-[var(--color-surface)]" />
            <div className="ml-auto h-6 w-24 animate-pulse rounded-full bg-[var(--color-surface)]" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={`${panel()} p-4`}>
              <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded-full bg-[var(--color-surface)]" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded-full bg-[var(--color-surface)]" />
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`${panel()} p-4`}>
              <div className="grid grid-cols-[40px_minmax(0,1fr)_140px_80px] gap-3">
                <div className="h-4 w-6 animate-pulse rounded-full bg-[var(--color-surface)]" />
                <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-surface)]" />
                <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-surface)]" />
                <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-surface)]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function DeliveryNoteView() {
  const { id } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState(null);
  const [printing, setPrinting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await getDeliveryNoteById(String(id));
      setNote(data?.deliveryNote || data || null);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to load delivery note");
      setNote(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNote(null);
      return;
    }

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleProfessionalPrint() {
    if (!id || printing) return;

    const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again");
      nav("/login", { replace: true });
      return;
    }

    try {
      setPrinting(true);
      openDeliveryNotePrint(id);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to open print view");
    } finally {
      setTimeout(() => setPrinting(false), 350);
    }
  }

  const items = useMemo(() => {
    if (Array.isArray(note?.items)) return note.items;
    if (Array.isArray(note?.DeliveryNoteItem)) return note.DeliveryNoteItem;
    return [];
  }, [note]);

  if (loading) return <ViewSkeleton />;

  if (!note) {
    return (
      <div className="space-y-6">
        <section className={`${shell()} p-6 text-center`}>
          <div className={`text-base font-semibold ${strong()}`}>Delivery note not found</div>
          <div className={`mt-2 text-sm ${muted()}`}>
            The document may have been removed or is no longer available.
          </div>
          <div className="mt-5">
            <Link to="/app/documents/delivery-notes" className={smallBtn()}>
              Back to Delivery Notes
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <section className={`${shell()} overflow-hidden p-5 md:p-6 no-print`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${soft()}`}>
              Delivery document
            </div>
            <h1 className={`mt-2 text-2xl font-semibold tracking-tight md:text-3xl ${strong()}`}>
              Delivery Note Preview
            </h1>
            <p className={`mt-3 max-w-3xl text-sm leading-6 md:text-[15px] ${muted()}`}>
              Review, print, or go back to update the handover details and delivered items.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/app/documents/delivery-notes" className={smallBtn()}>
              Back to Delivery Notes
            </Link>

            <Link
              to={`/app/documents/delivery-notes/${encodeURIComponent(id)}/edit`}
              className={smallBtn()}
            >
              Edit Delivery Note
            </Link>

            <AsyncButton
              type="button"
              loading={printing}
              loadingText="Opening..."
              variant="secondary"
              onClick={handleProfessionalPrint}
            >
              Professional Print
            </AsyncButton>

            <AsyncButton type="button" variant="primary" onClick={() => window.print()}>
              Print
            </AsyncButton>
          </div>
        </div>
      </section>

      <section className={`${shell()} print-card overflow-hidden p-5 md:p-6`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className={`text-xl font-black tracking-tight ${strong()}`}>STORVEX</div>
            <div className={`mt-1 text-sm ${muted()}`}>Delivery Note</div>
          </div>

          <div className="text-left lg:text-right">
            <div className={`text-xs uppercase tracking-[0.14em] ${soft()}`}>Number</div>
            <div className={`mt-1 text-lg font-semibold ${strong()}`}>
              {note.number || "—"}
            </div>
            <div className={`mt-3 text-xs uppercase tracking-[0.14em] ${soft()}`}>Date</div>
            <div className={`mt-1 text-sm ${strong()}`}>
              {formatDate(note.date || note.createdAt)}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className={`${panel()} p-4`}>
            <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${soft()}`}>
              Deliver To
            </div>
            <div className={`mt-3 text-sm font-semibold ${strong()}`}>
              {note.customerName || "—"}
            </div>
            <div className={`mt-1 text-sm ${muted()}`}>{note.customerPhone || "—"}</div>
            <div className={`mt-1 text-sm leading-6 ${muted()}`}>
              {note.customerAddress || "—"}
            </div>
          </div>

          <div className={`${panel()} p-4`}>
            <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${soft()}`}>
              Delivery Info
            </div>

            <div className="mt-3 space-y-2">
              <SummaryRow label="Delivered by" value={note.deliveredBy || "—"} />
              <SummaryRow label="Received by" value={note.receivedBy || "—"} />
              <SummaryRow label="Receiver phone" value={note.receivedByPhone || "—"} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className={`mb-3 flex items-center gap-2 text-base font-semibold ${strong()}`}>
            <span>Items</span>
            <span className={badgeClass("success")}>{items.length} item(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 overflow-hidden rounded-[20px]">
              <thead>
                <tr className="bg-[var(--color-surface-2)]">
                  <th className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] ${muted()}`}>
                    #
                  </th>
                  <th className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] ${muted()}`}>
                    Product
                  </th>
                  <th className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] ${muted()}`}>
                    Serial / Identifier
                  </th>
                  <th className={`px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] ${muted()}`}>
                    Qty
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.length ? (
                  items.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className="border-b border-[var(--color-border)] bg-[var(--color-card)]"
                    >
                      <td className={`px-4 py-3 text-sm ${muted()}`}>{index + 1}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${strong()}`}>
                        {safeStr(item.productName) || "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm ${muted()}`}>
                        {item.serial || "—"}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${strong()}`}>
                        {item.quantity ?? 1}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-[var(--color-card)]">
                    <td colSpan={4} className={`px-4 py-6 text-sm ${muted()}`}>
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${soft()}`}>
              Notes
            </div>
            <div className={`mt-2 rounded-[20px] bg-[var(--color-surface-2)] px-4 py-4 text-sm leading-6 ${strong()}`}>
              {note.notes || "—"}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <div className={`text-sm ${muted()}`}>Delivered by signature</div>
            <div className="mt-10 border-t border-[var(--color-border)]" />
          </div>

          <div>
            <div className={`text-sm ${muted()}`}>Received by signature</div>
            <div className="mt-10 border-t border-[var(--color-border)]" />
          </div>
        </div>

        <div className={`mt-6 text-xs ${soft()}`}>
          Generated by Storvex • Keep this document for proof of delivery.
        </div>
      </section>
    </div>
  );
}
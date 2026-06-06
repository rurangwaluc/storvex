import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import TableSkeleton from "../../components/ui/TableSkeleton";
import { listDeliveryNotes } from "../../services/deliveryNotesApi";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function DeliveryNotesList() {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const query = useMemo(() => q.trim(), [q]);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function load(currentQuery) {
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const data = await listDeliveryNotes(
        { q: currentQuery || undefined },
        { signal: controller.signal }
      );

      if (!mountedRef.current || controller.signal.aborted) return;

      setRows(Array.isArray(data?.deliveryNotes) ? data.deliveryNotes : []);
    } catch (err) {
      if (controller.signal.aborted) return;

      console.error(err);
      toast.error(err?.message || "Failed to load delivery notes");
      setRows([]);
    } finally {
      if (!mountedRef.current || controller.signal.aborted) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(query);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-soft)]">
              Document Centre
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text)] md:text-3xl">
              Delivery Notes
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
              Proof of delivery from your store to a customer.
            </p>
          </div>

          <AsyncButton
            type="button"
            variant="primary"
            loading={false}
            disabled={loading}
            onClick={() => nav("/app/documents/delivery-notes/create")}
          >
            New delivery note
          </AsyncButton>
        </div>
      </section>

      <section className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer name or phone..."
            className="app-input w-full sm:max-w-md"
          />

          <AsyncButton
            type="button"
            variant="secondary"
            loading={loading}
            loadingText="Loading..."
            onClick={() => load(query)}
          >
            Refresh
          </AsyncButton>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="border-b border-[var(--color-border)]">
                <th className="p-3 text-left text-sm font-semibold text-[var(--color-text-muted)]">
                  Number
                </th>
                <th className="p-3 text-left text-sm font-semibold text-[var(--color-text-muted)]">
                  Date
                </th>
                <th className="p-3 text-left text-sm font-semibold text-[var(--color-text-muted)]">
                  Customer
                </th>
                <th className="p-3 text-left text-sm font-semibold text-[var(--color-text-muted)]">
                  Phone
                </th>
                <th className="p-3 text-right text-sm font-semibold text-[var(--color-text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? <TableSkeleton rows={6} cols={5} /> : null}

              {!loading &&
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-border)]">
                    <td className="p-3 text-sm font-medium text-[var(--color-text)]">
                      {row.number || "—"}
                    </td>
                    <td className="p-3 text-sm text-[var(--color-text-muted)]">
                      {fmtDate(row.date || row.createdAt)}
                    </td>
                    <td className="p-3 text-sm text-[var(--color-text)]">
                      {row.customerName || "—"}
                    </td>
                    <td className="p-3 text-sm text-[var(--color-text-muted)]">
                      {row.customerPhone || "—"}
                    </td>
                    <td className="p-3 text-right text-sm">
                      <Link
                        to={`/app/documents/delivery-notes/${encodeURIComponent(row.id)}/preview`}
                        className="font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        View / Print
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-sm text-[var(--color-text-muted)]"
                  >
                    No delivery notes found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Tip: print the note and let both sides sign.
          </p>
        </div>
      </section>
    </div>
  );
}
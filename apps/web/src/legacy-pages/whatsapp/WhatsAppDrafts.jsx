import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import TableSkeleton from "../../components/ui/TableSkeleton";
import InlineSpinner from "../../components/ui/InlineSpinner";

import { searchProducts } from "../../services/inventoryApi";
import {
  listWhatsAppSaleDrafts,
  getWhatsAppSaleDraft,
  updateWhatsAppSaleDraft,
  deleteWhatsAppSaleDraft,
  finalizeWhatsAppSaleDraft,
} from "../../services/whatsappInboxApi";
import WhatsAppWorkspaceTabs from "./WhatsAppWorkspaceTabs";

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
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
}

function fieldLabel() {
  return "mb-1.5 block text-sm font-medium text-[var(--color-text)]";
}

function inputClass() {
  return "app-input";
}

function textareaClass() {
  return "app-textarea";
}

function successBadge() {
  return "bg-[#7cfcc6] text-[#0b3b2e]";
}

function infoBadge() {
  return "bg-[#57b5ff] text-[#06263d]";
}

function warningBadge() {
  return "bg-[#ff9f43] text-[#402100]";
}

function processBadge() {
  return "bg-[#ffe45e] text-[#4a4300]";
}

function neutralBadge() {
  return "bg-[var(--color-surface)] text-[var(--color-text-muted)]";
}

function ProtectionPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? successBadge()
      : tone === "info"
      ? infoBadge()
      : tone === "warning"
      ? warningBadge()
      : tone === "process"
      ? processBadge()
      : neutralBadge();

  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center rounded-full px-3 py-1.5 text-[11px] font-semibold",
        cls
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2 className={cx("mt-3 text-[1.35rem] font-black tracking-tight sm:text-[1.6rem]", strongText())}>
        {title}
      </h2>

      {subtitle ? <p className={cx("mt-3 text-sm leading-6", mutedText())}>{subtitle}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral", loading = false }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "warning"
      ? "text-amber-600 dark:text-amber-300"
      : tone === "danger"
      ? "text-[var(--color-danger)]"
      : strongText();

  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
      ? "bg-amber-500"
      : tone === "danger"
      ? "bg-[var(--color-danger)]"
      : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative overflow-hidden p-5 sm:p-6")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />
      <div className="pl-2">
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        {loading ? (
          <>
            <div className="mt-3 h-8 w-24 rounded bg-[var(--color-surface)]" />
            <div className="mt-2 h-4 w-40 rounded bg-[var(--color-surface)]" />
          </>
        ) : (
          <>
            <div className={cx("mt-2 text-[1.7rem] font-black tracking-tight", toneClass)}>{value}</div>
            {note ? <div className={cx("mt-2 text-sm leading-6", mutedText())}>{note}</div> : null}
          </>
        )}
      </div>
    </article>
  );
}

function InfoStat({ label, value, sub }) {
  return (
    <div className={cx(softPanel(), "min-w-0 p-4")}>
      <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
        {label}
      </div>
      <div className={cx("mt-2 break-words text-sm font-bold leading-6", strongText())}>{value || "—"}</div>
      {sub ? <div className={cx("mt-1 break-words text-xs leading-5", mutedText())}>{sub}</div> : null}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className={cx(softPanel(), "px-5 py-10 text-center")}>
      <div className={cx("text-base font-semibold", strongText())}>{title}</div>
      <div className={cx("mt-2 text-sm leading-6", mutedText())}>{text}</div>
    </div>
  );
}

function DraftListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={cx(softPanel(), "p-4")}>
          <div className="h-4 w-36 rounded bg-[var(--color-surface)]" />
          <div className="mt-3 h-3 w-24 rounded bg-[var(--color-surface)]" />
          <div className="mt-2 h-3 w-32 rounded bg-[var(--color-surface)]" />
          <div className="mt-3 h-10 rounded-2xl bg-[var(--color-surface)]" />
        </div>
      ))}
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className={cx(pageCard(), "p-5")}>
      <table className="w-full">
        <tbody>
          <TableSkeleton rows={10} cols={2} />
        </tbody>
      </table>
    </div>
  );
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `RWF ${n.toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatTimeAgo(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  const diff = Date.now() - d.getTime();
  if (diff < 60 * 1000) return "Just now";

  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function normalizeDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function normalizeDraftFromApi(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    cashierId: raw.cashierId || "",
    customerId: raw.customerId || "",
    conversationId: raw.conversationId || raw.conversation?.id || "",
    total: Number(raw.total || 0),
    saleType: String(raw.saleType || "CREDIT").toUpperCase(),
    amountPaid: Number(raw.amountPaid || 0),
    balanceDue: Number(raw.balanceDue || 0),
    dueDate: raw.dueDate ? String(raw.dueDate).slice(0, 10) : "",
    status: raw.status || "",
    isDraft: Boolean(raw.isDraft),
    draftSource: raw.draftSource || "",
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || raw.finalizedAt || raw.createdAt || null,
    cashier: raw.cashier || null,
    conversation: raw.conversation || null,
    customer: {
      name: raw.customer?.name || "",
      phone: raw.customer?.phone || raw.conversation?.phone || "",
      email: raw.customer?.email || "",
      address: raw.customer?.address || "",
      tinNumber: raw.customer?.tinNumber || "",
      idNumber: raw.customer?.idNumber || "",
      notes: raw.customer?.notes || "",
    },
    items: Array.isArray(raw.items)
      ? raw.items.map((it) => ({
          id: it.id,
          saleId: it.saleId,
          productId: it.productId,
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.price || 0),
          product: it.product || null,
        }))
      : [],
  };
}

function DraftQueueCard({ item, active, onClick }) {
  const customerName = item.customer?.name || "Unassigned customer";
  const customerPhone = item.customer?.phone || "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full text-left transition",
        softPanel(),
        active
          ? "ring-1 ring-[var(--color-primary-ring)] bg-[var(--color-primary-soft)]"
          : "hover:opacity-95"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cx("truncate text-sm font-bold", strongText())}>{customerName}</div>
            <div className={cx("mt-1 text-xs", mutedText())}>{customerPhone}</div>
            <div className={cx("mt-2 text-xs", softText())}>
              Draft #{String(item.id).slice(-6).toUpperCase()}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <ProtectionPill tone={item.saleType === "CREDIT" ? "warning" : "success"}>
              {item.saleType}
            </ProtectionPill>
            {item.conversationId ? <ProtectionPill tone="info">Linked</ProtectionPill> : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <InfoStat label="Total" value={formatMoney(item.total)} />
          <InfoStat
            label="Updated"
            value={formatTimeAgo(item.updatedAt || item.createdAt)}
            sub={formatDateTime(item.updatedAt || item.createdAt)}
          />
        </div>
      </div>
    </button>
  );
}

// ─── confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDeleteDraftDialog({ open, busy, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
      <div className={cx(
        "w-full max-w-md rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6"
      )}>
        <div className={cx("text-lg font-bold", strongText())}>Delete draft?</div>
        <p className={cx("mt-3 text-sm leading-6", mutedText())}>
          This WhatsApp sale draft will be permanently deleted. The linked conversation stays intact — only the pending sale record is removed.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-5 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[rgba(219,80,74,0.12)] px-5 text-sm font-semibold text-[var(--color-danger)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppDrafts() {
  const nav = useNavigate();

  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draft, setDraft] = useState(null);

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const mountedRef = useRef(true);
  const searchTimer = useRef(null);
  const productReqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    document.title = "WhatsApp sale drafts • Storvex";
  }, []);

  async function loadDrafts({ preserveSelection = true, silent = false } = {}) {
    try {
      if (!silent) setDraftsLoading(true);
      setRefreshing(true);

      const res = await listWhatsAppSaleDrafts();
      if (!mountedRef.current) return;

      const list = Array.isArray(res?.drafts) ? res.drafts.map(normalizeDraftFromApi).filter(Boolean) : [];
      setDrafts(list);

      if (!preserveSelection) {
        setSelectedDraftId(list[0]?.id || "");
        return;
      }

      if (selectedDraftId) {
        const stillExists = list.some((x) => x.id === selectedDraftId);
        if (!stillExists) setSelectedDraftId(list[0]?.id || "");
      } else {
        setSelectedDraftId(list[0]?.id || "");
      }
    } catch (err) {
      console.error(err);
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load WhatsApp drafts");
      setDrafts([]);
      setSelectedDraftId("");
    } finally {
      if (!mountedRef.current) return;
      setDraftsLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDraft(saleId) {
    if (!saleId) {
      setDraft(null);
      return;
    }

    try {
      setDraftLoading(true);

      const res = await getWhatsAppSaleDraft(saleId);
      if (!mountedRef.current) return;

      setDraft(normalizeDraftFromApi(res?.draft));
    } catch (err) {
      console.error(err);
      if (!mountedRef.current) return;
      toast.error(err?.message || "Failed to load draft");
      setDraft(null);
    } finally {
      if (!mountedRef.current) return;
      setDraftLoading(false);
    }
  }

  useEffect(() => {
    void loadDrafts({ preserveSelection: false });
  }, []);

  useEffect(() => {
    if (!selectedDraftId) {
      setDraft(null);
      return;
    }
    void loadDraft(selectedDraftId);
  }, [selectedDraftId]);

  useEffect(() => {
    const q = productQuery.trim();
    let cancelled = false;

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!q) {
      setProductResults([]);
      setSearchingProducts(false);
      return;
    }

    setSearchingProducts(true);
    const myReqId = ++productReqIdRef.current;

    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchProducts(q, 12);
        if (!mountedRef.current || cancelled) return;
        if (myReqId !== productReqIdRef.current) return;
        setProductResults(Array.isArray(res?.products) ? res.products : []);
      } catch (err) {
        console.error(err);
        if (!mountedRef.current || cancelled) return;
        if (myReqId !== productReqIdRef.current) return;
        setProductResults([]);
      } finally {
        if (!mountedRef.current || cancelled) return;
        if (myReqId !== productReqIdRef.current) return;
        setSearchingProducts(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [productQuery]);

  const filteredDrafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drafts;

    return drafts.filter((d) => {
      const customerName = String(d.customer?.name || "").toLowerCase();
      const customerPhone = String(d.customer?.phone || "").toLowerCase();
      const cashierName = String(d.cashier?.name || "").toLowerCase();
      const draftId = String(d.id || "").toLowerCase();

      return (
        customerName.includes(q) ||
        customerPhone.includes(q) ||
        cashierName.includes(q) ||
        draftId.includes(q)
      );
    });
  }, [drafts, query]);

  const linkedConversationCount = useMemo(() => {
    return drafts.filter((d) => d.conversationId).length;
  }, [drafts]);

  const computedTotal = useMemo(() => {
    return Array.isArray(draft?.items)
      ? draft.items.reduce(
          (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
          0
        )
      : 0;
  }, [draft]);

  const draftItemsCount = useMemo(() => {
    return Array.isArray(draft?.items)
      ? draft.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      : 0;
  }, [draft]);

  function setDraftField(key, value) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setCustomerField(key, value) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            customer: {
              ...(prev.customer || {}),
              [key]: value,
            },
          }
        : prev
    );
  }

  function changeItem(productId, patch) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.productId === productId ? { ...item, ...patch } : item
        ),
      };
    });
  }

  function removeItem(productId) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.productId !== productId),
      };
    });
  }

  function addProductToDraft(product) {
    const stock = Number(product?.stockQty || 0);
    if (!product?.id) return;

    setDraft((prev) => {
      if (!prev) return prev;

      const existing = prev.items.find((item) => item.productId === product.id);

      if (existing) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: Number(item.quantity || 0) + 1 }
              : item
          ),
        };
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            id: `tmp-${product.id}-${Date.now()}`,
            saleId: prev.id,
            productId: product.id,
            quantity: 1,
            unitPrice: Number(product.sellPrice || 0),
            product: {
              ...product,
              stockQty: stock,
            },
          },
        ],
      };
    });

    setProductQuery("");
    setProductResults([]);
  }

  function buildSavePayload() {
    if (!draft) return null;

    return {
      saleType: draft.saleType,
      dueDate: draft.saleType === "CREDIT" ? draft.dueDate || null : null,
      customer:
        String(draft.customer?.name || "").trim() || String(draft.customer?.phone || "").trim()
          ? {
              name: String(draft.customer?.name || "").trim(),
              phone: String(draft.customer?.phone || "").trim(),
              email: String(draft.customer?.email || "").trim() || null,
              address: String(draft.customer?.address || "").trim() || null,
              tinNumber: String(draft.customer?.tinNumber || "").trim() || null,
              idNumber: String(draft.customer?.idNumber || "").trim() || null,
              notes: String(draft.customer?.notes || "").trim() || null,
            }
          : null,
      items: draft.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      })),
    };
  }

  function buildFinalizePayload() {
    if (!draft) return null;

    return {
      saleType: draft.saleType,
      dueDate: draft.saleType === "CREDIT" ? draft.dueDate || null : null,
      amountPaid: draft.saleType === "CASH" ? computedTotal : 0,
      paymentMethod: "CASH",
      customer:
        String(draft.customer?.name || "").trim() || String(draft.customer?.phone || "").trim()
          ? {
              name: String(draft.customer?.name || "").trim(),
              phone: String(draft.customer?.phone || "").trim(),
              email: String(draft.customer?.email || "").trim() || null,
              address: String(draft.customer?.address || "").trim() || null,
              tinNumber: String(draft.customer?.tinNumber || "").trim() || null,
              idNumber: String(draft.customer?.idNumber || "").trim() || null,
              notes: String(draft.customer?.notes || "").trim() || null,
            }
          : null,
    };
  }

  function validateDraftForSave() {
    if (!draft) return { ok: false, msg: "No draft selected." };

    if (!Array.isArray(draft.items) || draft.items.length === 0) {
      return { ok: false, msg: "Add at least one product." };
    }

    for (const item of draft.items) {
      if (!item.productId) return { ok: false, msg: "Each item must have a product." };
      if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return { ok: false, msg: "Each quantity must be at least 1." };
      }
      if (!Number.isFinite(Number(item.unitPrice)) || Number(item.unitPrice) <= 0) {
        return { ok: false, msg: "Each unit price must be greater than 0." };
      }
    }

    const hasCustomerBits =
      String(draft.customer?.name || "").trim() || String(draft.customer?.phone || "").trim();

    if (hasCustomerBits) {
      if (
        !String(draft.customer?.name || "").trim() ||
        !String(draft.customer?.phone || "").trim()
      ) {
        return { ok: false, msg: "Customer name and phone are required together." };
      }
    }

    if (draft.saleType === "CREDIT" && !draft.dueDate) {
      return { ok: false, msg: "Credit finalization requires a due date." };
    }

    return { ok: true };
  }

  async function handleSave() {
    const v = validateDraftForSave();
    if (!v.ok) {
      toast.error(v.msg);
      return;
    }

    try {
      setSaving(true);
      const payload = buildSavePayload();
      const res = await updateWhatsAppSaleDraft(draft.id, payload);

      const updated = normalizeDraftFromApi(res?.draft);
      setDraft(updated);

      toast.success("Draft saved");
      void loadDrafts({ preserveSelection: true, silent: true });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    const v = validateDraftForSave();
    if (!v.ok) {
      toast.error(v.msg);
      return;
    }

    try {
      setFinalizing(true);
      const payload = buildFinalizePayload();
      const res = await finalizeWhatsAppSaleDraft(draft.id, payload);
      const saleId = res?.sale?.id || draft.id;

      toast.success("Draft finalized");
      await loadDrafts({ preserveSelection: false, silent: true });
      nav(`/app/pos/sales/${saleId}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to finalize draft");
    } finally {
      setFinalizing(false);
    }
  }

  function handleDelete() {
    if (!draft?.id) return;
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteDraft() {
    if (!draft?.id) return;
    setDeleting(true);
    try {
      await deleteWhatsAppSaleDraft(draft.id);
      toast.success("Draft deleted");
      const deletedId = draft.id;
      setDraft(null);
      setShowDeleteConfirm(false);
      const nextDrafts = drafts.filter((d) => d.id !== deletedId);
      setDrafts(nextDrafts);
      setSelectedDraftId(nextDrafts[0]?.id || "");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to delete draft");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="WhatsApp"
                title="Sale drafts"
                subtitle="Review WhatsApp-created drafts, clean customer and item details, then finalize them into real sales without breaking your workflow."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => nav("/app/whatsapp/inbox")} className={secondaryBtn()}>
                Open inbox
              </button>
              <button type="button" onClick={() => nav("/app/pos")} className={secondaryBtn()}>
                POS
              </button>
              <button type="button" onClick={() => nav("/app/pos/sales")} className={secondaryBtn()}>
                Sales list
              </button>
              <AsyncButton
                loading={refreshing}
                loadingText="Refreshing..."
                onClick={() => loadDrafts({ preserveSelection: true })}
                className={primaryBtn()}
              >
                Refresh drafts
              </AsyncButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Drafts"
            value={drafts.length}
            note="WhatsApp drafts currently available"
            loading={draftsLoading}
          />
          <SummaryCard
            label="Selected draft"
            value={draft ? `#${String(draft.id).slice(-6).toUpperCase()}` : "—"}
            note={draft?.customer?.phone || "No draft selected"}
            tone="warning"
            loading={draftLoading}
          />
          <SummaryCard
            label="Linked conversations"
            value={linkedConversationCount}
            note="Drafts tied to inbox threads"
            tone="neutral"
            loading={draftsLoading}
          />
          <SummaryCard
            label="Draft total"
            value={formatMoney(computedTotal)}
            note={draft?.saleType === "CASH" ? "Cash finalization" : "Credit finalization"}
            tone={draft?.saleType === "CREDIT" ? "warning" : "success"}
            loading={draftLoading}
          />
        </div>
      </section>

      <WhatsAppWorkspaceTabs />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={cx(pageCard(), "p-4 sm:p-5")}>
          <SectionHeading
            eyebrow="Queue"
            title="Draft queue"
            subtitle="Select a WhatsApp draft to review and finalize."
          />

          <div className="mt-5">
            <input
              className={inputClass()}
              placeholder="Search by customer, phone, cashier, or draft code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-5">
            {draftsLoading ? (
              <DraftListSkeleton />
            ) : filteredDrafts.length === 0 ? (
              <EmptyState
                title="No drafts found"
                text="There are no WhatsApp sale drafts matching your current search."
              />
            ) : (
              <div className="space-y-3">
                {filteredDrafts.map((item) => (
                  <DraftQueueCard
                    key={item.id}
                    item={item}
                    active={item.id === selectedDraftId}
                    onClick={() => setSelectedDraftId(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {draftLoading ? (
            <EditorSkeleton />
          ) : !draft ? (
            <section className={cx(pageCard(), "p-8")}>
              <EmptyState
                title="No draft selected"
                text="Choose a WhatsApp draft from the queue to open the workspace."
              />
            </section>
          ) : (
            <>
              <section className={cx(pageCard(), "p-5 sm:p-6")}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <SectionHeading
                      eyebrow="Workspace"
                      title="Draft workspace"
                      subtitle="Edit customer details, adjust items, choose a finalization mode, and convert this WhatsApp draft into a real sale."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {draft?.conversationId ? (
                      <button
                        type="button"
                        onClick={() => nav("/app/whatsapp/inbox")}
                        className={secondaryBtn()}
                      >
                        Open conversation
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <InfoStat
                    label="Draft code"
                    value={`#${String(draft.id).slice(-6).toUpperCase()}`}
                  />
                  <InfoStat
                    label="Customer phone"
                    value={draft.customer?.phone || "—"}
                  />
                  <InfoStat
                    label="Assigned cashier"
                    value={draft.cashier?.name || "—"}
                  />
                  <InfoStat
                    label="Link status"
                    value={draft.conversationId ? "Linked conversation" : "No link"}
                  />
                </div>

                <div className={cx(softPanel(), "mt-5 p-4 sm:p-5")}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className={cx("text-sm font-bold", strongText())}>Finalize mode</div>
                      <div className={cx("mt-1 text-sm leading-6", mutedText())}>
                        Choose how this draft should become a real sale.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDraftField("saleType", "CASH")}
                        className={cx(
                          secondaryBtn(),
                          draft.saleType === "CASH"
                            ? "ring-1 ring-emerald-400 bg-emerald-500 text-white"
                            : ""
                        )}
                      >
                        Finalize as cash
                      </button>

                      <button
                        type="button"
                        onClick={() => setDraftField("saleType", "CREDIT")}
                        className={cx(
                          secondaryBtn(),
                          draft.saleType === "CREDIT"
                            ? "ring-1 ring-amber-400 bg-amber-500 text-white"
                            : ""
                        )}
                      >
                        Finalize as credit
                      </button>
                    </div>
                  </div>

                  <div className={cx("mt-3 text-sm leading-6", mutedText())}>
                    {draft.saleType === "CASH"
                      ? "Cash finalization will mark the sale as fully paid."
                      : "Credit finalization keeps a balance due and requires a due date."}
                  </div>

                  {draft.saleType === "CREDIT" ? (
                    <div className="mt-4 max-w-sm">
                      <label className={fieldLabel()}>Due date</label>
                      <input
                        type="date"
                        className={inputClass()}
                        value={draft.dueDate}
                        onChange={(e) => setDraftField("dueDate", e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={cx(pageCard(), "p-5 sm:p-6")}>
                <SectionHeading
                  eyebrow="Customer"
                  title="Customer details"
                  subtitle="Keep the customer record clean before you finalize the sale."
                />

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={fieldLabel()}>Full name</label>
                    <input
                      className={inputClass()}
                      value={draft.customer.name}
                      onChange={(e) => setCustomerField("name", e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel()}>Phone</label>
                    <input
                      className={inputClass()}
                      value={draft.customer.phone}
                      onChange={(e) => setCustomerField("phone", e.target.value)}
                      placeholder="Phone"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel()}>Email</label>
                    <input
                      className={inputClass()}
                      value={draft.customer.email}
                      onChange={(e) => setCustomerField("email", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel()}>Address</label>
                    <input
                      className={inputClass()}
                      value={draft.customer.address}
                      onChange={(e) => setCustomerField("address", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel()}>TIN number</label>
                    <input
                      className={inputClass()}
                      value={draft.customer.tinNumber}
                      onChange={(e) => setCustomerField("tinNumber", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className={fieldLabel()}>ID number</label>
                    <input
                      className={inputClass()}
                      value={draft.customer.idNumber}
                      onChange={(e) => setCustomerField("idNumber", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={fieldLabel()}>Notes</label>
                    <textarea
                      className={textareaClass()}
                      value={draft.customer.notes}
                      onChange={(e) => setCustomerField("notes", e.target.value)}
                      placeholder="Optional customer notes"
                    />
                  </div>
                </div>
              </section>

              <section className={cx(pageCard(), "p-5 sm:p-6")}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <SectionHeading
                      eyebrow="Items"
                      title="Draft items"
                      subtitle="Search products, add them to the draft, and adjust quantity or price before finalizing."
                    />
                  </div>

                  <div className="w-full max-w-md">
                    <input
                      className={inputClass()}
                      placeholder="Search products to add..."
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                    />

                    {searchingProducts ? (
                      <div className="mt-3">
                        <InlineSpinner label="Searching..." />
                      </div>
                    ) : null}
                  </div>
                </div>

                {productQuery.trim() ? (
                  <div className="mt-5">
                    {productResults.length === 0 && !searchingProducts ? (
                      <EmptyState
                        title="No products found"
                        text="Try another model name, SKU, or product keyword."
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {productResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addProductToDraft(p)}
                            className={cx(softPanel(), "w-full p-4 text-left transition hover:opacity-95")}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className={cx("break-words text-sm font-bold", strongText())}>{p.name}</div>
                                <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                                  {p.sku ? `SKU: ${p.sku} • ` : ""}
                                  Stock: {p.stockQty}
                                </div>
                              </div>

                              <div className={cx("shrink-0 text-sm font-bold", strongText())}>
                                {formatMoney(p.sellPrice)}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="mt-6">
                  {!draft.items.length ? (
                    <EmptyState
                      title="No items in this draft"
                      text="Search products above and add them to start building this draft."
                    />
                  ) : (
                    <div className="space-y-3">
                      {draft.items.map((item) => (
                        <div key={item.productId} className={cx(softPanel(), "overflow-hidden p-4 sm:p-5")}>
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className={cx("break-words text-sm font-bold", strongText())}>
                                {item.product?.name || "Unknown product"}
                              </div>
                              <div className={cx("mt-1 text-xs leading-5", mutedText())}>
                                {item.product?.sku ? `SKU: ${item.product.sku} • ` : ""}
                                Stock: {item.product?.stockQty ?? "—"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="text-left text-xs font-semibold text-rose-500 transition hover:opacity-80"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                              <label className={fieldLabel()}>Quantity</label>
                              <input
                                className={inputClass()}
                                inputMode="numeric"
                                value={String(item.quantity)}
                                onChange={(e) =>
                                  changeItem(item.productId, {
                                    quantity: Number(normalizeDigits(e.target.value) || 0),
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className={fieldLabel()}>Unit price</label>
                              <input
                                className={inputClass()}
                                inputMode="numeric"
                                value={String(item.unitPrice)}
                                onChange={(e) =>
                                  changeItem(item.productId, {
                                    unitPrice: Number(normalizeDigits(e.target.value) || 0),
                                  })
                                }
                              />
                            </div>

                            <div>
                              <label className={fieldLabel()}>Line total</label>
                              <div className={cx(softPanel(), "mt-2 p-4")}>
                                <div className={cx("text-sm font-bold", strongText())}>
                                  {formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className={cx(pageCard(), "p-5 sm:p-6")}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <SectionHeading
                      eyebrow="Finalize"
                      title="Finalize draft"
                      subtitle="Review the draft carefully, then save, finalize, or remove it."
                    />
                  </div>

                  <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoStat label="Items" value={draftItemsCount} />
                    <InfoStat
                      label="Draft total"
                      value={formatMoney(computedTotal)}
                      sub={draft.saleType === "CASH" ? "Cash finalization" : "Credit finalization"}
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2 lg:flex-row">
                  <AsyncButton
                    loading={saving}
                    loadingText="Saving..."
                    onClick={handleSave}
                    className={cx(primaryBtn(), "lg:flex-1")}
                  >
                    Save draft
                  </AsyncButton>

                  <AsyncButton
                    loading={finalizing}
                    loadingText="Finalizing..."
                    onClick={handleFinalize}
                    className={cx(
                      "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white transition disabled:opacity-60 lg:flex-1",
                      draft.saleType === "CREDIT"
                        ? "bg-amber-500 hover:opacity-95"
                        : "bg-emerald-500 hover:opacity-95"
                    )}
                  >
                    {draft.saleType === "CREDIT" ? "Finalize credit sale" : "Finalize cash sale"}
                  </AsyncButton>

                  <AsyncButton
                    loading={deleting}
                    loadingText="Deleting..."
                    onClick={handleDelete}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60 lg:flex-1"
                  >
                    Delete draft
                  </AsyncButton>
                </div>

                <div className={cx("mt-4 text-xs leading-5", mutedText())}>
                  Last updated: {formatDateTime(draft.updatedAt || draft.createdAt)}
                </div>
              </section>
            </>
          )}
        </main>
      </section>

      {/* Delete confirm modal */}
      <ConfirmDeleteDraftDialog
        open={showDeleteConfirm}
        busy={deleting}
        onCancel={() => { if (!deleting) setShowDeleteConfirm(false); }}
        onConfirm={confirmDeleteDraft}
      />
    </div>
  );
}
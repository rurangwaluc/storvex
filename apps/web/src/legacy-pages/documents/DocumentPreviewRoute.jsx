import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { buildDocumentPrintUrl, openDocumentPrint } from "../../services/documentPrint";
import { deleteDeliveryNote } from "../../services/deliveryNotesApi";
import { deleteProforma } from "../../services/proformasApi";
import { deleteWarranty } from "../../services/warrantiesApi";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function shell() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function panel() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softButtonClass() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
}

function dangerButtonClass() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[rgba(219,80,74,0.12)] px-4 text-sm font-semibold text-[var(--color-danger)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
}

function PillLink({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] transition hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function CurrentPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-card)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border)]">
      {children}
    </span>
  );
}

function ConfirmDeleteModal({ open, title, body, deleting, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={deleting ? undefined : onCancel} />

      <div className={cx(shell(), "relative z-10 w-full max-w-md p-5")}>
        <h3 className={cx("text-lg font-black tracking-tight", strongText())}>{title}</h3>
        <p className={cx("mt-2 text-sm leading-6", mutedText())}>{body}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <AsyncButton type="button" onClick={onCancel} disabled={deleting} variant="secondary">
            Cancel
          </AsyncButton>

          <AsyncButton
            type="button"
            onClick={onConfirm}
            loading={deleting}
            loadingText="Deleting..."
            className={dangerButtonClass()}
          >
            Delete
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}

const RESOURCE_META = {
  receipts: {
    title: "Receipt Preview",
    backTo: "/app/documents/receipts",
    backLabel: "Receipts",
    editTo: null,
    createTo: null,
    createLabel: null,
    canDelete: false,
    singularLabel: "receipt",
    eyebrow: "Sales document",
    description: "Preview the branded receipt with customer details, payment record, and store document settings.",
  },
  invoices: {
    title: "Invoice Preview",
    backTo: "/app/documents/invoices",
    backLabel: "Invoices",
    editTo: null,
    createTo: null,
    createLabel: null,
    canDelete: false,
    singularLabel: "invoice",
    eyebrow: "Billing document",
    description: "Preview the formal invoice with customer details, billing record, and store document settings.",
  },
  proformas: {
    title: "Proforma Preview",
    backTo: "/app/documents/proformas",
    backLabel: "Proformas",
    editTo: (id) => `/app/documents/proformas/${encodeURIComponent(id)}/edit`,
    createTo: "/app/documents/proformas/create",
    createLabel: "Create Proforma",
    canDelete: true,
    singularLabel: "proforma",
    eyebrow: "Pre-sale document",
    description: "Preview the branded proforma before it becomes a final sale or invoice.",
  },
  warranties: {
    title: "Warranty Preview",
    backTo: "/app/documents/warranties",
    backLabel: "Warranties",
    editTo: (id) => `/app/documents/warranties/${encodeURIComponent(id)}/edit`,
    createTo: "/app/documents/warranties/create",
    createLabel: "Create Warranty",
    canDelete: true,
    singularLabel: "warranty",
    eyebrow: "After-sales document",
    description: "Preview the warranty proof with covered items, customer details, and warranty terms.",
  },
  "delivery-notes": {
    title: "Delivery Note Preview",
    backTo: "/app/documents/delivery-notes",
    backLabel: "Delivery Notes",
    editTo: (id) => `/app/documents/delivery-notes/${encodeURIComponent(id)}/edit`,
    createTo: "/app/documents/delivery-notes/create",
    createLabel: "Create Delivery Note",
    canDelete: true,
    singularLabel: "delivery note",
    eyebrow: "Goods movement document",
    description: "Preview delivered items, receiver details, handover notes, and signatures. Delivery notes must not show prices or payment information.",
  },
};

async function deleteByType(resource, id) {
  if (resource === "delivery-notes") return deleteDeliveryNote(id);
  if (resource === "proformas") return deleteProforma(id);
  if (resource === "warranties") return deleteWarranty(id);

  throw new Error("This document cannot be deleted from this screen");
}

export default function DocumentPreviewRoute() {
  const navigate = useNavigate();
  const { resource, id } = useParams();

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = RESOURCE_META[resource] || {
    title: "Document Preview",
    backTo: "/app/documents",
    backLabel: "Documents",
    editTo: null,
    createTo: null,
    createLabel: null,
    canDelete: false,
    singularLabel: "document",
    eyebrow: "Document",
    description: "Preview the printable document with your store branding and document settings.",
  };

  const printUrl = useMemo(() => {
    if (!resource || !id) return "";
    return buildDocumentPrintUrl(resource, id);
  }, [resource, id]);

  const editUrl = useMemo(() => {
    if (!meta.editTo || !id) return null;
    return meta.editTo(id);
  }, [meta, id]);

  async function handleDelete() {
    if (!resource || !id) return;

    try {
      setDeleting(true);
      await deleteByType(resource, id);
      toast.success(`${meta.singularLabel} deleted`);
      navigate(meta.backTo, { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(error?.message || `Failed to delete ${meta.singularLabel}`);
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDeleteModal
        open={showDelete}
        title={`Delete ${meta.singularLabel}?`}
        body={`You are about to permanently delete this ${meta.singularLabel}. This action cannot be undone.`}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setShowDelete(false);
        }}
        onConfirm={handleDelete}
      />

      <section className={cx(shell(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <PillLink to="/app/documents">Document Centre</PillLink>
              <PillLink to={meta.backTo}>{meta.backLabel}</PillLink>
              <CurrentPill>Preview</CurrentPill>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 max-w-3xl">
                <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", mutedText())}>
                  {meta.eyebrow}
                </div>

                <h1 className={cx("mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", strongText())}>
                  {meta.title}
                </h1>

                <p className={cx("mt-2 text-sm leading-6", mutedText())}>
                  {meta.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
                <button type="button" onClick={() => navigate(-1)} className={softButtonClass()}>
                  Go back
                </button>

                {editUrl ? (
                  <Link to={editUrl} className={softButtonClass()}>
                    Edit
                  </Link>
                ) : null}

                {meta.createTo && meta.createLabel ? (
                  <Link to={meta.createTo} className={softButtonClass()}>
                    {meta.createLabel}
                  </Link>
                ) : null}

                {meta.canDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className={dangerButtonClass()}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                ) : null}

                <AsyncButton type="button" variant="primary" onClick={() => openDocumentPrint(resource, id)}>
                  Open print page
                </AsyncButton>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <div className={cx(panel(), "overflow-hidden p-2 sm:p-3")}>
            {printUrl ? (
              <iframe
                title={`${meta.title} ${id}`}
                src={printUrl}
                className="h-[76vh] w-full rounded-[18px] bg-white"
              />
            ) : (
              <div className={cx("p-8 text-sm", mutedText())}>Preview is not available.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

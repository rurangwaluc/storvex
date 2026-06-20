import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import AsyncButton from "../../components/ui/AsyncButton";
import { buildDocumentPrintUrl, openDocumentPrint } from "../../services/documentPrint";
import { deleteDeliveryNote } from "../../services/deliveryNotesApi";
import { deleteProforma } from "../../services/proformasApi";
import { deleteWarranty } from "../../services/warrantiesApi";
import "./DocumentPreviewRoute.css";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function ConfirmDeleteModal({ open, title, body, deleting, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="svx-doc-preview-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="svx-doc-preview-modal-backdrop"
        aria-label="Close delete confirmation"
        onClick={deleting ? undefined : onCancel}
      />

      <div className="svx-doc-preview-modal-card">
        <p className="svx-doc-preview-eyebrow">Confirm action</p>
        <h3>{title}</h3>
        <p>{body}</p>

        <div className="svx-doc-preview-modal-actions">
          <AsyncButton type="button" onClick={onCancel} disabled={deleting} variant="secondary">
            Cancel
          </AsyncButton>

          <AsyncButton
            type="button"
            onClick={onConfirm}
            loading={deleting}
            loadingText="Deleting..."
            className="svx-doc-preview-button is-danger"
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
    title: "Receipt preview",
    backTo: "/app/documents/receipts",
    backLabel: "Receipts",
    editTo: null,
    createTo: null,
    createLabel: null,
    canDelete: false,
    singularLabel: "receipt",
    eyebrow: "Sales document",
    badge: "Payment proof",
    tone: "success",
    description: "Preview the branded receipt with customer details, payment record, and store document settings.",
  },
  invoices: {
    title: "Invoice preview",
    backTo: "/app/documents/invoices",
    backLabel: "Invoices",
    editTo: null,
    createTo: null,
    createLabel: null,
    canDelete: false,
    singularLabel: "invoice",
    eyebrow: "Billing document",
    badge: "Formal billing",
    tone: "primary",
    description: "Preview the formal invoice with customer details, billing record, and store document settings.",
  },
  proformas: {
    title: "Proforma preview",
    backTo: "/app/documents/proformas",
    backLabel: "Proformas",
    editTo: (id) => `/app/documents/proformas/${encodeURIComponent(id)}/edit`,
    createTo: "/app/documents/proformas/create",
    createLabel: "Create proforma",
    canDelete: true,
    singularLabel: "proforma",
    eyebrow: "Pre-sale document",
    badge: "Quotation",
    tone: "neutral",
    description: "Preview the branded proforma before it becomes a final sale or invoice.",
  },
  warranties: {
    title: "Warranty preview",
    backTo: "/app/documents/warranties",
    backLabel: "Warranties",
    editTo: (id) => `/app/documents/warranties/${encodeURIComponent(id)}/edit`,
    createTo: "/app/documents/warranties/create",
    createLabel: "Create warranty",
    canDelete: true,
    singularLabel: "warranty",
    eyebrow: "After-sales document",
    badge: "Coverage proof",
    tone: "success",
    description: "Preview the warranty proof with covered items, customer details, and warranty terms.",
  },
  "delivery-notes": {
    title: "Delivery note preview",
    backTo: "/app/documents/delivery-notes",
    backLabel: "Delivery notes",
    editTo: (id) => `/app/documents/delivery-notes/${encodeURIComponent(id)}/edit`,
    createTo: "/app/documents/delivery-notes/create",
    createLabel: "Create delivery note",
    canDelete: true,
    singularLabel: "delivery note",
    eyebrow: "Goods movement document",
    badge: "No money fields",
    tone: "warning",
    description:
      "Preview delivered items, receiver details, handover notes, and signatures. Delivery notes must not show prices, totals, tax, or payment information.",
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
    title: "Document preview",
    backTo: "/app/documents",
    backLabel: "Documents",
    editTo: null,
    createTo: null,
    createLabel: null,
    canDelete: false,
    singularLabel: "document",
    eyebrow: "Document",
    badge: "Preview",
    tone: "neutral",
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
    <div className="svx-doc-preview-page">
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

      <section className="svx-doc-preview-hero">
        <div className="svx-doc-preview-breadcrumbs">
          <Link to="/app/documents">Document center</Link>
          <Link to={meta.backTo}>{meta.backLabel}</Link>
          <span>Preview</span>
        </div>

        <div className="svx-doc-preview-hero-main">
          <div className="svx-doc-preview-title-block">
            <p className="svx-doc-preview-eyebrow">{meta.eyebrow}</p>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>

            <div className="svx-doc-preview-status-row">
              <span className={cx("svx-doc-preview-status", `is-${meta.tone}`)}>
                {meta.badge}
              </span>
              <span className="svx-doc-preview-status is-neutral">Printable layout</span>
            </div>
          </div>

          <div className="svx-doc-preview-actions">
            <Link to={meta.backTo} className="svx-doc-preview-button">
              Back to list
            </Link>

            {editUrl ? (
              <Link to={editUrl} className="svx-doc-preview-button">
                Edit
              </Link>
            ) : null}

            {meta.createTo && meta.createLabel ? (
              <Link to={meta.createTo} className="svx-doc-preview-button">
                {meta.createLabel}
              </Link>
            ) : null}

            {meta.canDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="svx-doc-preview-button is-danger"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}

            <AsyncButton
              type="button"
              variant="primary"
              onClick={() => openDocumentPrint(resource, id)}
              className="svx-doc-preview-primary-action"
            >
              Open print page
            </AsyncButton>
          </div>
        </div>
      </section>

      <section className="svx-doc-preview-stage">
        <div className="svx-doc-preview-stage-head">
          <div>
            <p className="svx-doc-preview-eyebrow">Live preview</p>
            <h2>Customer document</h2>
          </div>

          <div className="svx-doc-preview-stage-actions">
            <button type="button" onClick={() => navigate(-1)} className="svx-doc-preview-button">
              Go back
            </button>

            <button
              type="button"
              onClick={() => openDocumentPrint(resource, id)}
              className="svx-doc-preview-button is-primary"
            >
              Print document
            </button>
          </div>
        </div>

        <div className="svx-doc-preview-frame-shell">
          {printUrl ? (
            <iframe
              title={`${meta.title} ${id}`}
              src={printUrl}
              className="svx-doc-preview-frame"
            />
          ) : (
            <div className="svx-doc-preview-unavailable">Preview is not available.</div>
          )}
        </div>
      </section>
    </div>
  );
}

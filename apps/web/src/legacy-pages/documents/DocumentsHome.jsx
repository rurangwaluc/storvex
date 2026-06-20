import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AsyncButton from "../../components/ui/AsyncButton";
import "./DocumentsHome.css";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Pill({ children, tone = "neutral" }) {
  return <span className={cx("svx-doc-home-pill", `is-${tone}`)}>{children}</span>;
}

function DocumentIcon({ type }) {
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none" };

  const icons = {
    receipt: (
      <svg {...props}>
        <path
          d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5L5 21V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    invoice: (
      <svg {...props}>
        <path
          d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M15 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    delivery: (
      <svg {...props}>
        <path
          d="M3 7h11v10H3V7zm11 3h3l2 2v5h-5v-7z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="18" r="1.5" fill="currentColor" />
        <circle cx="17.5" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
    proforma: (
      <svg {...props}>
        <path d="M7 3h10v18H7z" stroke="currentColor" strokeWidth="2" />
        <path d="M9 8h6M9 12h6M9 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    warranty: (
      <svg {...props}>
        <path
          d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 12.5l1.7 1.7 3.8-4.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    settings: (
      <svg {...props}>
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92l-.03.08a2 2 0 0 1-3.86 0l-.03-.08A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1l-.08-.03a2 2 0 0 1 0-3.86l.08-.03A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92l.03-.08a2 2 0 0 1 3.86 0l.03.08A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .92 1l.08.03a2 2 0 0 1 0 3.86l-.08.03a1.7 1.7 0 0 0-.92 1Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };

  return icons[type] || null;
}

const DOCUMENTS = [
  {
    title: "Receipts",
    path: "/app/documents/receipts",
    createPath: null,
    type: "receipt",
    note: "Payment proof created from completed sales.",
    ownerUse: "Review and print receipt records.",
    badge: "Sales proof",
    badgeTone: "success",
    priority: "Daily",
  },
  {
    title: "Invoices",
    path: "/app/documents/invoices",
    createPath: null,
    type: "invoice",
    note: "Formal billing records from sales and customer balances.",
    ownerUse: "Track billing documents and customer payment proof.",
    badge: "Billing",
    badgeTone: "info",
    priority: "Daily",
  },
  {
    title: "Delivery Notes",
    path: "/app/documents/delivery-notes",
    createPath: "/app/documents/delivery-notes/create",
    type: "delivery",
    note: "Goods handover proof with receiver details and signatures.",
    ownerUse: "Confirm what left the store. No money fields.",
    badge: "No money",
    badgeTone: "warning",
    priority: "Operations",
  },
  {
    title: "Proformas",
    path: "/app/documents/proformas",
    createPath: "/app/documents/proformas/create",
    type: "proforma",
    note: "Pre-sale quotations before final billing.",
    ownerUse: "Prepare quotes before the customer commits.",
    badge: "Pre-sale",
    badgeTone: "neutral",
    priority: "Sales",
  },
  {
    title: "Warranties",
    path: "/app/documents/warranties",
    createPath: "/app/documents/warranties/create",
    type: "warranty",
    note: "After-sales coverage proof and warranty records.",
    ownerUse: "Support customers after purchase.",
    badge: "After-sales",
    badgeTone: "neutral",
    priority: "Support",
  },
];

const HEALTH_ITEMS = [
  {
    label: "Document flow",
    value: "Unified",
    note: "Every document type is in one workspace.",
    tone: "success",
  },
  {
    label: "Print layout",
    value: "Branded",
    note: "Documents use store identity and document settings.",
    tone: "primary",
  },
  {
    label: "Delivery notes",
    value: "Protected",
    note: "Goods movement stays separate from money fields.",
    tone: "warning",
  },
  {
    label: "Owner control",
    value: "Central",
    note: "Prefixes, tax, colors, and terms are controlled in settings.",
    tone: "neutral",
  },
];

function HealthCard({ item }) {
  return (
    <article className={cx("svx-doc-home-health-card", `is-${item.tone}`)}>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <p>{item.note}</p>
    </article>
  );
}

function DocumentCard({ item, featured = false }) {
  return (
    <article className={cx("svx-doc-home-card", featured && "is-featured")}>
      <div className="svx-doc-home-card-top">
        <div className="svx-doc-home-icon">
          <DocumentIcon type={item.type} />
        </div>

        <div className="svx-doc-home-card-badges">
          <Pill tone={item.badgeTone}>{item.badge}</Pill>
          <Pill>{item.priority}</Pill>
        </div>
      </div>

      <div className="svx-doc-home-card-body">
        <h2>{item.title}</h2>
        <p>{item.note}</p>
        <small>{item.ownerUse}</small>
      </div>

      <div className="svx-doc-home-card-actions">
        <Link to={item.path} className="svx-doc-home-button is-primary">
          Open
        </Link>

        {item.createPath ? (
          <Link to={item.createPath} className="svx-doc-home-button">
            Create
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="svx-doc-home-grid">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="svx-doc-home-skeleton-card">
          <div className="svx-doc-home-skeleton-icon" />
          <div className="svx-doc-home-skeleton-line is-title" />
          <div className="svx-doc-home-skeleton-line" />
          <div className="svx-doc-home-skeleton-line is-short" />
        </div>
      ))}
    </div>
  );
}

export default function DocumentsHome() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="svx-doc-home">
      <section className="svx-doc-home-hero">
        <div className="svx-doc-home-hero-main">
          <div>
            <p className="svx-doc-home-eyebrow">Document center</p>
            <h1>Business documents</h1>
            <p>
              Search, preview, print, and control receipts, invoices, delivery notes, proformas,
              and warranties from one clean Storvex workspace.
            </p>
          </div>

          <div className="svx-doc-home-hero-actions">
            <AsyncButton loading={false} variant="secondary" onClick={() => navigate("/app/settings/documents")}>
              Document settings
            </AsyncButton>

            <AsyncButton loading={false} variant="primary" onClick={() => navigate("/app/documents/delivery-notes/create")}>
              Create delivery note
            </AsyncButton>
          </div>
        </div>

        <div className="svx-doc-home-health-grid">
          {HEALTH_ITEMS.map((item) => (
            <HealthCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      <section className="svx-doc-home-section">
        <div className="svx-doc-home-section-head">
          <div>
            <p className="svx-doc-home-eyebrow">Daily documents</p>
            <h2>Open the document you need</h2>
          </div>

          <Link to="/app/settings/documents" className="svx-doc-home-settings-link">
            <DocumentIcon type="settings" />
            Settings
          </Link>
        </div>

        {!mounted ? (
          <SkeletonGrid />
        ) : (
          <div className="svx-doc-home-grid">
            {DOCUMENTS.map((item) => (
              <DocumentCard key={item.path} item={item} featured={item.type === "delivery"} />
            ))}
          </div>
        )}
      </section>

      <section className="svx-doc-home-bottom">
        <div>
          <p className="svx-doc-home-eyebrow">Owner workflow</p>
          <h2>Documents follow the business flow</h2>
          <p>
            Sales create receipts and invoices. Goods movement uses delivery notes. Pre-sale work
            uses proformas. After-sales support uses warranties. Settings control the shared
            document identity.
          </p>
        </div>

        <div className="svx-doc-home-workflow">
          <Link to="/app/pos/sales">Sales desk</Link>
          <span>→</span>
          <Link to="/app/documents/receipts">Receipts</Link>
          <span>→</span>
          <Link to="/app/documents/delivery-notes">Delivery proof</Link>
          <span>→</span>
          <Link to="/app/settings/documents">Document settings</Link>
        </div>
      </section>
    </div>
  );
}

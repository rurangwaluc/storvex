import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AsyncButton from "../../components/ui/AsyncButton";
import { cn } from "../../lib/cn";

function textStrong() {
  return "text-[var(--color-text)]";
}

function textMuted() {
  return "text-[var(--color-text-muted)]";
}

function cardClass() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function panelClass() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function Pill({ children, tone = "neutral" }) {
  const className =
    {
      success: "bg-[#7cfcc6] text-[#0b3b2e]",
      info: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
      warning: "bg-[#ff9f43] text-[#402100]",
      neutral: "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]",
    }[tone] || "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

function KpiStrip() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className={cn(panelClass(), "relative overflow-hidden p-4")}>
        <div className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500" />
        <div className="pl-2">
          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", textMuted())}>
            Document flow
          </div>
          <div className={cn("mt-2 text-xl font-black", textStrong())}>Unified</div>
          <div className={cn("mt-1 text-xs leading-5", textMuted())}>
            One place for operational documents
          </div>
        </div>
      </div>

      <div className={cn(panelClass(), "relative overflow-hidden p-4")}>
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[var(--color-primary)]" />
        <div className="pl-2">
          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", textMuted())}>
            Branding
          </div>
          <div className={cn("mt-2 text-xl font-black", textStrong())}>Live</div>
          <div className={cn("mt-1 text-xs leading-5", textMuted())}>
            Print colors and logo follow store settings
          </div>
        </div>
      </div>

      <div className={cn(panelClass(), "relative overflow-hidden p-4")}>
        <div className="absolute left-0 top-0 h-full w-1.5 bg-amber-500" />
        <div className="pl-2">
          <div className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", textMuted())}>
            Owner control
          </div>
          <div className={cn("mt-2 text-xl font-black", textStrong())}>Clear</div>
          <div className={cn("mt-1 text-xs leading-5", textMuted())}>
            Professional output with consistent document standards
          </div>
        </div>
      </div>
    </div>
  );
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
  };

  return icons[type] || null;
}

const SECTIONS = [
  {
    title: "Receipts",
    path: "/app/documents/receipts",
    createPath: null,
    createLabel: null,
    type: "receipt",
    note: "Sales payment records and branded receipt previews.",
    badge: "High volume",
    badgeTone: "success",
  },
  {
    title: "Invoices",
    path: "/app/documents/invoices",
    createPath: null,
    createLabel: null,
    type: "invoice",
    note: "Formal billing documents with owner branding and payment terms.",
    badge: "Financial",
    badgeTone: "info",
  },
  {
    title: "Delivery Notes",
    path: "/app/documents/delivery-notes",
    createPath: "/app/documents/delivery-notes/create",
    createLabel: "Create",
    type: "delivery",
    note: "Goods handover confirmation with branded print layout.",
    badge: "Logistics",
    badgeTone: "warning",
  },
  {
    title: "Proformas",
    path: "/app/documents/proformas",
    createPath: "/app/documents/proformas/create",
    createLabel: "Create",
    type: "proforma",
    note: "Preliminary quotations before final billing.",
    badge: "Pre-sale",
    badgeTone: "neutral",
  },
  {
    title: "Warranties",
    path: "/app/documents/warranties",
    createPath: "/app/documents/warranties/create",
    createLabel: "Create",
    type: "warranty",
    note: "After-sales warranty certificates and coverage records.",
    badge: "After-sales",
    badgeTone: "neutral",
  },
];

const QUICK_LINKS = [
  { label: "Delivery Notes", to: "/app/documents/delivery-notes" },
  { label: "Proformas", to: "/app/documents/proformas" },
  { label: "Warranties", to: "/app/documents/warranties" },
  { label: "Create Proforma", to: "/app/documents/proformas/create" },
  { label: "Create Warranty", to: "/app/documents/warranties/create" },
  { label: "Create Delivery Note", to: "/app/documents/delivery-notes/create" },
];

function DocumentCard({ item }) {
  return (
    <div className={cn(cardClass(), "flex flex-col p-5 transition hover:-translate-y-0.5")}>
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]"
          )}
        >
          <DocumentIcon type={item.type} />
        </div>

        <Pill tone={item.badgeTone}>{item.badge}</Pill>
      </div>

      <h2 className={cn("mt-5 text-lg font-black tracking-tight", textStrong())}>{item.title}</h2>
      <p className={cn("mt-2 flex-1 text-sm leading-6", textMuted())}>{item.note}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to={item.path}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Open section
        </Link>

        {item.createPath && item.createLabel ? (
          <Link
            to={item.createPath}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] px-4 text-sm font-semibold text-[var(--color-text)] transition hover:opacity-90"
          >
            {item.createLabel}
          </Link>
        ) : null}
      </div>
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
    <div className="space-y-6">
      <div className={cn(cardClass(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", textMuted())}>
                Unified workspace
              </div>

              <h1 className={cn("mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", textStrong())}>
                Document Centre
              </h1>

              <p className={cn("mt-2 max-w-3xl text-sm leading-6", textMuted())}>
                One premium home for receipts, invoices, delivery notes, proformas, and warranties.
                Preview branded documents, verify terms, and keep every business proof easy to find.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <AsyncButton loading={false} variant="primary" onClick={() => navigate("/app/documents/receipts")}>
                Open Receipts
              </AsyncButton>

              <AsyncButton loading={false} variant="secondary" onClick={() => navigate("/app/documents/invoices")}>
                Open Invoices
              </AsyncButton>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <KpiStrip />
        </div>
      </div>

      {!mounted ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="space-y-4 rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
            >
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
              <div className="h-5 w-28 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
              <div className="h-4 w-full animate-pulse rounded-full bg-[var(--color-surface-2)]" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-[var(--color-surface-2)]" />
              <div className="h-11 w-32 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SECTIONS.map((item) => (
            <DocumentCard key={item.path} item={item} />
          ))}
        </div>
      )}

      <div className={cn(cardClass(), "p-5 sm:p-6")}>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className={cn("text-lg font-black tracking-tight", textStrong())}>Why this matters</div>

            <p className={cn("mt-2 text-sm leading-6", textMuted())}>
              Real stores need proof, billing, delivery, and after-sales accountability in one place.
              Document Centre keeps those records branded, print-ready, and easy for owners and staff to follow.
            </p>
          </div>

          <div className={cn(panelClass(), "border border-[var(--color-border)] p-4")}>
            <div className={cn("text-sm font-bold", textStrong())}>Quick access</div>

            <div className="mt-3 grid gap-2">
              {QUICK_LINKS.map((link) => (
                <Link key={link.to} to={link.to} className={cn("text-sm transition hover:opacity-80 hover:underline", textMuted())}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
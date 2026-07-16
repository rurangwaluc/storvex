// frontend-stores/src/pages/settings/SettingsLayout.jsx
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { getUserRole } from "../../utils/role";
import "./Settings.css";

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
  return "svx-settings-layout-card rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "svx-settings-layout-panel rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function sectionBadge(tone = "neutral") {
  if (tone === "primary") {
    return "inline-flex h-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] px-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-primary)]";
  }

  if (tone === "warning") {
    return "inline-flex h-8 items-center justify-center rounded-full bg-amber-500/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-amber-600";
  }

  if (tone === "danger") {
    return "inline-flex h-8 items-center justify-center rounded-full bg-red-500/10 px-3 text-xs font-black uppercase tracking-[0.12em] text-red-600";
  }

  return "inline-flex h-8 items-center justify-center rounded-full bg-[var(--color-surface-2)] px-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text-muted)]";
}

const NAV_ITEMS = [
  {
    key: "general",
    label: "General",
    subtitle: "Store profile, category, location, and setup status",
    to: "/app/settings",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "documents",
    label: "Documents",
    subtitle: "Receipts, invoices, tax display, terms, and print behavior",
    to: "/app/settings/documents",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "branches",
    label: "Branches",
    subtitle: "Branch locations, limits, and main branch truth",
    to: "/app/settings/branches",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "marketplace",
    label: "Marketplace",
    subtitle: "Public store, customer contact, pickup, delivery, and visibility",
    to: "/app/settings/marketplace",
    roles: ["OWNER"],
  },
  {
    key: "members",
    label: "Members",
    subtitle: "Staff accounts and access control",
    to: "/app/settings/members",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "roles",
    label: "User roles",
    subtitle: "Policy matrix and permissions",
    to: "/app/settings/roles",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "billing",
    label: "Billing",
    subtitle: "Plan, renewals, and invoices",
    to: "/app/settings/billing",
    roles: ["OWNER"],
  },
  {
    key: "security",
    label: "Security",
    subtitle: "Authentication and session rules",
    to: "/app/settings/security",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "audit",
    label: "Audit logs",
    subtitle: "Operational history and review",
    to: "/app/settings/audit",
    roles: ["OWNER", "MANAGER"],
  },
];

function Icon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    className: "h-[18px] w-[18px]",
  };

  switch (name) {
    case "general":
      return (
        <svg {...common}>
          <path
            d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M19.4 15a7.9 7.9 0 0 0 0-6l-2.1.7a6.4 6.4 0 0 0-1.2-1.2l.7-2.1a7.9 7.9 0 0 0-6 0l.7 2.1a6.4 6.4 0 0 0-1.2 1.2L6.6 9a7.9 7.9 0 0 0 0 6l2.1-.7a6.4 6.4 0 0 0 1.2 1.2l-.7 2.1a7.9 7.9 0 0 0 6 0l-.7-2.1a6.4 6.4 0 0 0 1.2-1.2l2.1.7Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "documents":
      return (
        <svg {...common}>
          <path
            d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M14 3v5h5M8.5 12h7M8.5 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "branches":
      return (
        <svg {...common}>
          <path
            d="M4 21V7.5L12 3l8 4.5V21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M8 21v-7h8v7M8 10h.01M12 10h.01M16 10h.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "marketplace":
      return (
        <svg {...common}>
          <path
            d="M4 9h16l-1-5H5L4 9Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M5 9v11h14V9M9 20v-6h6v6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M4 9a3 3 0 0 0 5 2 3 3 0 0 0 6 0 3 3 0 0 0 5-2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "members":
      return (
        <svg {...common}>
          <path
            d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 20a8 8 0 0 1 16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "roles":
      return (
        <svg {...common}>
          <path
            d="M12 2l8 4v6c0 5-3.2 9.4-8 10-4.8-.6-8-5-8-10V6l8-4Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "billing":
      return (
        <svg {...common}>
          <path
            d="M4 7h16v10H4V7ZM6 10h12M7 14h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "security":
      return (
        <svg {...common}>
          <path
            d="M12 2l8 4v6c0 5-3.2 9.4-8 10-4.8-.6-8-5-8-10V6l8-4Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 11v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case "audit":
      return (
        <svg {...common}>
          <path
            d="M9 5h10v14H9V5ZM5 7h2M5 11h2M5 15h2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return <span className="inline-block w-[18px]" />;
  }
}

function currentKeyFromPath(pathname) {
  if (pathname === "/app/settings") return "general";
  if (pathname.includes("/app/settings/documents")) return "documents";
  if (pathname.includes("/app/settings/branches")) return "branches";
  if (pathname.includes("/app/settings/marketplace")) return "marketplace";
  if (pathname.includes("/app/settings/members")) return "members";
  if (pathname.includes("/app/settings/roles")) return "roles";
  if (pathname.includes("/app/settings/billing")) return "billing";
  if (pathname.includes("/app/billing")) return "billing";
  if (pathname.includes("/app/settings/security")) return "security";
  if (pathname.includes("/app/settings/audit")) return "audit";

  return "general";
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div className="min-w-0">
      {eyebrow ? (
        <p className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </p>
      ) : null}

      <h1
        className={cx(
          "mt-2 text-[1.35rem] font-black tracking-[-0.04em] sm:mt-3 sm:text-[1.95rem]",
          strongText(),
        )}
      >
        {title}
      </h1>

      {subtitle ? (
        <p
          className={cx(
            "mt-2 max-w-3xl text-sm font-semibold leading-6 sm:mt-3",
            mutedText(),
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function NavCard({ item, end = false }) {
  return (
    <NavLink to={item.to} end={end}>
      {({ isActive }) => (
        <div
          className={cx(
            "svx-settings-nav-card group min-h-[66px] rounded-[18px] border p-2.5 transition duration-200",
            isActive && "is-active",
            isActive
              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-[var(--shadow-soft)]"
              : "border-transparent bg-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-card)]",
          )}
        >
          <div className="flex h-full items-center gap-2.5">
            <div
              className={cx(
                "svx-settings-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border transition",
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]",
              )}
            >
              <Icon name={item.key} />
            </div>

            <div className="min-w-0 flex-1">
              <div className={cx("truncate text-sm font-black tracking-tight", strongText())}>
                {item.label}
              </div>

              <div className={cx("svx-settings-nav-subtitle mt-0.5 line-clamp-1 text-[11px] font-semibold leading-4", mutedText())}>
                {item.subtitle}
              </div>
            </div>

            <span
              className={cx(
                "svx-settings-nav-state",
                isActive && "is-active",
                sectionBadge(isActive ? "primary" : "neutral"),
              )}
            >
              {isActive ? "Open" : "Go"}
            </span>
          </div>
        </div>
      )}
    </NavLink>
  );
}

function MobileSectionSwitcher({ activeItem, visibleNavItems, onChange }) {
  return (
    <div className="svx-settings-mobile-switch sticky top-[78px] z-20 -mx-4 border-y border-[var(--color-border)] bg-[var(--color-bg)]/95 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
      <div className={cx(pageCard(), "svx-settings-mobile-switch-card overflow-hidden p-2.5 shadow-[var(--shadow-soft)]")}>
        <label
          className={cx(
            "mb-2 block text-[10px] font-black uppercase tracking-[0.18em]",
            softText(),
          )}
        >
          Settings section
        </label>

        <div className="svx-settings-mobile-switch-grid grid grid-cols-[38px_minmax(0,1fr)] gap-2.5">
          <div className="svx-settings-mobile-switch-icon flex h-10 w-10 items-center justify-center rounded-[14px] border border-[var(--color-border)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)]">
            <Icon name={activeItem.key} />
          </div>

          <select
            className="svx-settings-section-select app-input h-10 min-w-0"
            value={activeItem.to}
            onChange={(event) => onChange(event.target.value)}
          >
            {visibleNavItems.map((item) => (
              <option key={item.key} value={item.to}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <p className={cx("mt-2 line-clamp-2 text-xs font-semibold leading-5", mutedText())}>
          {activeItem.subtitle}
        </p>
      </div>
    </div>
  );
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getUserRole();

  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const activeKey = currentKeyFromPath(location.pathname);
  const activeItem =
    visibleNavItems.find((item) => item.key === activeKey) ||
    visibleNavItems[0] ||
    NAV_ITEMS[0];

  return (
    <div
      className="svx-settings-shell min-w-0 space-y-4 overflow-x-hidden sm:space-y-5"
      data-settings-section={activeItem.key}
    >
      <section className={cx(pageCard(), "svx-settings-control-card min-w-0 overflow-hidden")}>
        <div className="svx-settings-control-head border-b border-[var(--color-border)] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="svx-settings-control-head-inner flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <SectionHeading
                eyebrow="Control center"
                title="Settings"
                subtitle="Manage store identity, documents, branches, Marketplace visibility, staff access, security, and business controls."
              />
            </div>

            <div className="svx-settings-control-tags hidden flex-wrap items-center gap-2 sm:flex">
              <span className={sectionBadge("primary")}>Store configuration</span>
              <span className={sectionBadge()}>Branch truth</span>
              <span className={sectionBadge()}>Access control</span>
            </div>
          </div>
        </div>

        <div className="svx-settings-desktop-nav hidden px-4 py-4 sm:px-5 lg:block">
          <div className={cx(softPanel(), "svx-settings-nav-panel p-2.5")}>
            <div className="svx-settings-nav-grid grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {visibleNavItems.map((item) => (
                <NavCard key={item.key} item={item} end={item.key === "general"} />
              ))}
            </div>
          </div>

          <div className="svx-settings-current-row mt-3 flex flex-wrap items-center gap-2">
            <span className={sectionBadge("primary")}>Current: {activeItem.label}</span>
            <span className={sectionBadge()}>{visibleNavItems.length} sections</span>
          </div>
        </div>
      </section>

      <MobileSectionSwitcher
        activeItem={activeItem}
        visibleNavItems={visibleNavItems}
        onChange={(to) => navigate(to)}
      />

      <section className="svx-settings-outlet min-w-0 overflow-x-hidden">
        <Outlet />
      </section>
    </div>
  );
}
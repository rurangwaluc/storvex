import { NavLink } from "react-router-dom";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

const WORKSPACE_ROLES = ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"];
const MANAGER_ROLES = ["OWNER", "MANAGER"];

function tabsConfig() {
  return [
    {
      key: "inbox",
      to: "/app/whatsapp/inbox",
      label: "Inbox",
      shortLabel: "Inbox",
      helper: "Customer conversations",
      icon: "chat",
      roles: WORKSPACE_ROLES,
    },
    {
      key: "drafts",
      to: "/app/whatsapp/drafts",
      label: "Sale drafts",
      shortLabel: "Drafts",
      helper: "WhatsApp sales to complete",
      icon: "receipt",
      roles: WORKSPACE_ROLES,
    },
    {
      key: "broadcasts",
      to: "/app/whatsapp/broadcasts",
      label: "Promotions & broadcasts",
      shortLabel: "Broadcasts",
      helper: "Customer offers and audience sending",
      icon: "send",
      roles: MANAGER_ROLES,
    },
    {
      key: "accounts",
      to: "/app/whatsapp/accounts",
      label: "Store number",
      shortLabel: "Number",
      helper: "WhatsApp connection and readiness",
      icon: "phone",
      roles: MANAGER_ROLES,
    },
    {
      key: "activity",
      to: "/app/whatsapp/activity",
      label: "Activity",
      shortLabel: "Activity",
      helper: "Message and team history",
      icon: "pulse",
      roles: MANAGER_ROLES,
    },
  ];
}

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function getRolesFromStorage() {
  if (typeof window === "undefined") return [];

  try {
    const explicitRole = localStorage.getItem("userRole");
    if (explicitRole) return [normalizeRole(explicitRole)].filter(Boolean);
  } catch {}

  try {
    const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");
    if (!token) return [];

    const [, payload] = token.split(".");
    if (!payload) return [];

    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));

    if (json?.role) return [normalizeRole(json.role)].filter(Boolean);
    if (Array.isArray(json?.roles)) return json.roles.map(normalizeRole).filter(Boolean);

    return [];
  } catch {
    return [];
  }
}

function isAllowed(tabRoles, userRoles) {
  if (!Array.isArray(tabRoles) || !Array.isArray(userRoles)) return false;
  return tabRoles.some((role) => userRoles.includes(role));
}

function Icon({ name, className = "" }) {
  if (name === "chat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-5 w-5", className)}>
        <path
          fill="currentColor"
          d="M12 3.5c-5.05 0-9 3.24-9 7.38 0 2.48 1.43 4.67 3.63 6.03l-.7 2.47a.75.75 0 0 0 1.05.88l3.05-1.53c.64.1 1.3.16 1.97.16 5.05 0 9-3.24 9-7.38S17.05 3.5 12 3.5Zm-4.1 8.25a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm4.1 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm4.1 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z"
        />
      </svg>
    );
  }

  if (name === "receipt") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-5 w-5", className)}>
        <path
          fill="currentColor"
          d="M7 3h10a2 2 0 0 1 2 2v15.1a.9.9 0 0 1-1.35.78L15.7 19.8l-1.95 1.08a1.5 1.5 0 0 1-1.46 0L10.3 19.8l-1.95 1.08A.9.9 0 0 1 7 20.1V5a2 2 0 0 1 2-2Zm2 5.25c0 .41.34.75.75.75h4.5a.75.75 0 0 0 0-1.5h-4.5a.75.75 0 0 0-.75.75Zm0 3.5c0 .41.34.75.75.75h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0-.75.75Zm0 3.5c0 .41.34.75.75.75h3.5a.75.75 0 0 0 0-1.5h-3.5a.75.75 0 0 0-.75.75Z"
        />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-5 w-5", className)}>
        <path
          fill="currentColor"
          d="M20.8 4.2a1.15 1.15 0 0 0-1.2-.27L3.95 10.28a1.1 1.1 0 0 0 .06 2.07l5.87 2.08 2.08 5.86a1.1 1.1 0 0 0 2.07.06l6.35-15.65a1.15 1.15 0 0 0-.27-1.2Zm-8.11 12.35-1.25-3.52 4.41-4.41-5.04 3.8-3.36-1.19 10.32-4.19-5.08 9.51Z"
        />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-5 w-5", className)}>
        <path
          fill="currentColor"
          d="M8.2 4.25A2.05 2.05 0 0 1 10.1 5.5l1.05 2.45a2 2 0 0 1-.46 2.2l-.75.75a10.4 10.4 0 0 0 3.16 3.16l.75-.75a2 2 0 0 1 2.2-.46l2.45 1.05a2.05 2.05 0 0 1 1.25 1.9v1.7A2.25 2.25 0 0 1 17.5 19.75C10.2 19.75 4.25 13.8 4.25 6.5A2.25 2.25 0 0 1 6.5 4.25h1.7Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cx("h-5 w-5", className)}>
      <path
        fill="currentColor"
        d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A8.51 8.51 0 0 0 12 3.5Zm.75 4.25v4l3.05 1.83a.75.75 0 1 1-.78 1.28l-3.42-2.05a.75.75 0 0 1-.35-.64V7.75a.75.75 0 0 1 1.5 0Z"
      />
    </svg>
  );
}

function activeClass() {
  return "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[0_14px_34px_rgba(0,0,0,0.16)]";
}

function inactiveClass() {
  return "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-soft)]";
}

function navCardBase() {
  return "group flex min-h-[78px] min-w-[210px] items-center gap-3 rounded-[24px] border px-4 py-3 text-left transition";
}

export default function WhatsAppWorkspaceTabs({ className = "", compact = false }) {
  const userRoles = getRolesFromStorage();
  const tabs = tabsConfig().filter((tab) => isAllowed(tab.roles, userRoles));

  if (!tabs.length) return null;

  return (
    <section
      className={cx(
        "overflow-hidden rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="relative overflow-hidden border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[var(--color-primary-soft)] blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[22px] bg-[var(--color-primary)] text-white shadow-[var(--shadow-soft)]">
              <Icon name="chat" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  WhatsApp workspace
                </p>

                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                  {tabs.length} area{tabs.length === 1 ? "" : "s"}
                </span>
              </div>

              {!compact ? (
                <>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-[var(--color-text)] sm:text-2xl">
                    Customer messages, sales, and campaigns in one place.
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
                    Move between customer chats, WhatsApp sale drafts, store number setup, activity,
                    promotions, and broadcasts without losing context.
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">
                  Customer messages and WhatsApp sales
                </p>
              )}
            </div>
          </div>

          {!compact ? (
            <div className="grid min-w-[220px] grid-cols-2 gap-2 rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2">
              <div className="rounded-[20px] bg-[var(--color-card)] px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Customer side
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-text)]">One store number</p>
              </div>

              <div className="rounded-[20px] bg-[var(--color-card)] px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Team side
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-text)]">Controlled work</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-3 px-4 py-4 sm:px-5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              className={({ isActive }) =>
                cx(navCardBase(), isActive ? activeClass() : inactiveClass())
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border transition",
                      isActive
                        ? "border-white/25 bg-white/15 text-white"
                        : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-primary)]",
                    )}
                  >
                    <Icon name={tab.icon} />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.shortLabel}</span>
                    </span>

                    {!compact ? (
                      <span
                        className={cx(
                          "mt-1 block truncate text-[11px] font-bold leading-4",
                          isActive ? "text-white/75" : "text-[var(--color-text-muted)]",
                        )}
                      >
                        {tab.helper}
                      </span>
                    ) : null}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </section>
  );
}
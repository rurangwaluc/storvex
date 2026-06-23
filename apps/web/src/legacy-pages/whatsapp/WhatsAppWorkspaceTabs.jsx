import { NavLink } from "react-router-dom";

import "./WhatsAppWorkspaceTabs.css";

function cx(...items) {
  return items.filter(Boolean).join(" ");
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
      label: "Promotions",
      shortLabel: "Offers",
      helper: "Offers and audience sending",
      icon: "send",
      roles: MANAGER_ROLES,
    },
    {
      key: "accounts",
      to: "/app/whatsapp/accounts",
      label: "Store number",
      shortLabel: "Number",
      helper: "WhatsApp connection status",
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

function Icon({ name }) {
  if (name === "chat") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 3.5c-5.05 0-9 3.24-9 7.38 0 2.48 1.43 4.67 3.63 6.03l-.7 2.47a.75.75 0 0 0 1.05.88l3.05-1.53c.64.1 1.3.16 1.97.16 5.05 0 9-3.24 9-7.38S17.05 3.5 12 3.5Zm-4.1 8.25a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm4.1 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm4.1 0a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Z"
        />
      </svg>
    );
  }

  if (name === "receipt") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3h10a2 2 0 0 1 2 2v15.1a.9.9 0 0 1-1.35.78L15.7 19.8l-1.95 1.08a1.5 1.5 0 0 1-1.46 0L10.3 19.8l-1.95 1.08A.9.9 0 0 1 7 20.1V5a2 2 0 0 1 2-2Zm2 5.25c0 .41.34.75.75.75h4.5a.75.75 0 0 0 0-1.5h-4.5a.75.75 0 0 0-.75.75Zm0 3.5c0 .41.34.75.75.75h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0-.75.75Zm0 3.5c0 .41.34.75.75.75h3.5a.75.75 0 0 0 0-1.5h-3.5a.75.75 0 0 0-.75.75Z"
        />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.8 4.2a1.15 1.15 0 0 0-1.2-.27L3.95 10.28a1.1 1.1 0 0 0 .06 2.07l5.87 2.08 2.08 5.86a1.1 1.1 0 0 0 2.07.06l6.35-15.65a1.15 1.15 0 0 0-.27-1.2Zm-8.11 12.35-1.25-3.52 4.41-4.41-5.04 3.8-3.36-1.19 10.32-4.19-5.08 9.51Z"
        />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8.2 4.25A2.05 2.05 0 0 1 10.1 5.5l1.05 2.45a2 2 0 0 1-.46 2.2l-.75.75a10.4 10.4 0 0 0 3.16 3.16l.75-.75a2 2 0 0 1 2.2-.46l2.45 1.05a2.05 2.05 0 0 1 1.25 1.9v1.7A2.25 2.25 0 0 1 17.5 19.75C10.2 19.75 4.25 13.8 4.25 6.5A2.25 2.25 0 0 1 6.5 4.25h1.7Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A8.51 8.51 0 0 0 12 3.5Zm.75 4.25v4l3.05 1.83a.75.75 0 1 1-.78 1.28l-3.42-2.05a.75.75 0 0 1-.35-.64V7.75a.75.75 0 0 1 1.5 0Z"
      />
    </svg>
  );
}

export default function WhatsAppWorkspaceTabs({ className = "", compact = false }) {
  const userRoles = getRolesFromStorage();
  const tabs = tabsConfig().filter((tab) => isAllowed(tab.roles, userRoles));

  if (!tabs.length) return null;

  return (
    <nav
      className={cx("svx-wa-tabs", compact && "is-compact", className)}
      aria-label="WhatsApp workspace navigation"
    >
      <div className="svx-wa-tabs-list">
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            end
            className={({ isActive }) => cx("svx-wa-tab-link", isActive && "is-active")}
          >
            {({ isActive }) => (
              <>
                <span className={cx("svx-wa-tab-icon", isActive && "is-active")}>
                  <Icon name={tab.icon} />
                </span>

                <span className="svx-wa-tab-text">
                  <strong>
                    <span className="svx-wa-tab-label-full">{tab.label}</span>
                    <span className="svx-wa-tab-label-short">{tab.shortLabel}</span>
                  </strong>

                  {!compact ? <small>{tab.helper}</small> : null}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

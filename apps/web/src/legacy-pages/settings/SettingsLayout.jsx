import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { getUserRole } from "../../utils/role";
import "./Settings.css";

const NAV_ITEMS = [
  {
    key: "general",
    label: "General",
    to: "/app/settings",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "documents",
    label: "Documents",
    to: "/app/settings/documents",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "branches",
    label: "Branches",
    to: "/app/settings/branches",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "marketplace",
    label: "Marketplace",
    to: "/app/settings/marketplace",
    roles: ["OWNER"],
  },
  {
    key: "members",
    label: "Team",
    to: "/app/settings/members",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "roles",
    label: "Access",
    to: "/app/settings/roles",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "billing",
    label: "Billing",
    to: "/app/settings/billing",
    roles: ["OWNER"],
  },
  {
    key: "security",
    label: "Security",
    to: "/app/settings/security",
    roles: ["OWNER", "MANAGER"],
  },
  {
    key: "audit",
    label: "Activity",
    to: "/app/settings/audit",
    roles: ["OWNER", "MANAGER"],
  },
];

function currentKeyFromPath(pathname) {
  if (pathname === "/app/settings") {
    return "general";
  }

  if (pathname.includes("/app/settings/documents")) {
    return "documents";
  }

  if (pathname.includes("/app/settings/branches")) {
    return "branches";
  }

  if (pathname.includes("/app/settings/marketplace")) {
    return "marketplace";
  }

  if (pathname.includes("/app/settings/members")) {
    return "members";
  }

  if (pathname.includes("/app/settings/roles")) {
    return "roles";
  }

  if (
    pathname.includes("/app/settings/billing") ||
    pathname.includes("/app/billing")
  ) {
    return "billing";
  }

  if (pathname.includes("/app/settings/security")) {
    return "security";
  }

  if (pathname.includes("/app/settings/audit")) {
    return "audit";
  }

  return "general";
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = getUserRole();

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role),
  );

  const activeKey = currentKeyFromPath(
    location.pathname,
  );

  const activeItem =
    visibleNavItems.find(
      (item) => item.key === activeKey,
    ) ||
    visibleNavItems[0] ||
    NAV_ITEMS[0];

  return (
    <div className="svx-settings-shell">
      <header className="svx-settings-simple-header">
        <div className="svx-settings-simple-heading">
          <h1>Business settings</h1>
          <p>
            Manage the information and controls used by
            your business.
          </p>
        </div>

        <nav
          className="svx-settings-simple-nav"
          aria-label="Business settings"
        >
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.key === "general"}
              className={({ isActive }) =>
                [
                  "svx-settings-simple-link",
                  isActive ? "is-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="svx-settings-mobile-section">
          <label htmlFor="storvex-settings-section">
            Settings section
          </label>

          <select
            id="storvex-settings-section"
            value={activeItem.to}
            onChange={(event) =>
              navigate(event.target.value)
            }
          >
            {visibleNavItems.map((item) => (
              <option
                key={item.key}
                value={item.to}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="svx-settings-outlet">
        <Outlet />
      </main>
    </div>
  );
}

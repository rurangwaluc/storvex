/* STEP 342CJ-C / SIMPLE ACCESS PAGE */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import PageSkeleton from "../../components/ui/PageSkeleton";
import { getMyPermissions, getPermissionPolicy } from "../../services/permissionsApi";
import "./Settings.css";
import "./SettingsRoles.css";

const ROLES = [
  ["OWNER", "Owner"],
  ["MANAGER", "Manager"],
  ["CASHIER", "Cashier"],
  ["SELLER", "Seller"],
  ["STOREKEEPER", "Storekeeper"],
  ["TECHNICIAN", "Technician"],
];

const DESCRIPTIONS = {
  OWNER: "Full control of business operations, staff and sensitive settings.",
  MANAGER: "Oversees daily operations without owner-only controls.",
  CASHIER: "Handles checkout, sales and payment workflows.",
  SELLER: "Supports selling and customer-facing work.",
  STOREKEEPER: "Manages stock, supplies and inventory activities.",
  TECHNICIAN: "Handles repairs and technical service work.",
};

const CATEGORIES = [
  "Sales & payments",
  "Stock & operations",
  "Customers & services",
  "Reports & oversight",
  "Team & settings",
];

function permissionCategory(permission) {
  const p = String(permission || "").toUpperCase();
  if (/^(POS_|SALE_|WARRANTY_|CASH_DRAWER_)/.test(p)) return CATEGORIES[0];
  if (/^(INVENTORY_|SUPPLIERS_|DELIVERY_NOTES_|INTERSTORE_|BRANCHES_)/.test(p)) return CATEGORIES[1];
  if (/^(CUSTOMERS_|REPAIRS_|WHATSAPP_)/.test(p)) return CATEGORIES[2];
  if (/^(DASHBOARD_|REPORTS_|AUDIT_)/.test(p)) return CATEGORIES[3];
  return CATEGORIES[4];
}

const PREFIXES = [
  "DELIVERY_NOTES_", "CASH_DRAWER_", "INTERSTORE_",
  "INVENTORY_", "SUPPLIERS_", "CUSTOMERS_", "SETTINGS_",
  "BRANCHES_", "MEMBERS_", "SECURITY_", "BILLING_",
  "DASHBOARD_", "REPORTS_", "REPAIRS_", "WHATSAPP_",
  "WARRANTY_", "SALE_", "AUDIT_", "POS_",
];

function readableAction(permission) {
  let text = String(permission || "").toUpperCase();
  const prefix = PREFIXES.find((item) => text.startsWith(item));
  if (prefix) text = text.slice(prefix.length);
  return text.replaceAll("_", " ").toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readableArea(permission) {
  const p = String(permission || "").toUpperCase();
  if (p.startsWith("POS_") || p.startsWith("SALE_")) return "Sales";
  if (p.startsWith("CASH_DRAWER_")) return "Cash drawer";
  if (p.startsWith("WARRANTY_")) return "Warranty";
  if (p.startsWith("DELIVERY_NOTES_")) return "Delivery notes";
  if (p.startsWith("INTERSTORE_")) return "Inter-store";
  const prefix = PREFIXES.find((item) => p.startsWith(item));
  if (!prefix) return "Other";
  return prefix.slice(0, -1).toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SettingsRoles() {
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [selectedRole, setSelectedRole] = useState("OWNER");
  // STEP 342CJ-D / COLLAPSED ACCESS
  const [expandedCategory, setExpandedCategory] = useState(null);

  function chooseRole(role) {
    setSelectedRole(role);
    setExpandedCategory(null);
  }

  useEffect(() => {
    document.title = "Roles & access • Storvex";
    let alive = true;

    async function load() {
      try {
        const [me, result] = await Promise.all([
          getMyPermissions(),
          getPermissionPolicy(),
        ]);
        if (!alive) return;

        const roles = result?.roles;
        if (!roles || typeof roles !== "object" || Array.isArray(roles)) {
          throw new Error("Access rules unavailable");
        }

        const permittedRoles = Object.fromEntries(
          ROLES.filter(([key]) => Array.isArray(roles[key]))
            .map(([key]) => [key, roles[key]]),
        );

        if (!Object.keys(permittedRoles).length) {
          throw new Error("No business role policies returned");
        }

        setPolicy(permittedRoles);
        setSelectedRole((current) =>
          Array.isArray(permittedRoles[current])
            ? current
            : (Array.isArray(permittedRoles[me?.role])
              ? me.role : Object.keys(permittedRoles)[0]),
        );
      } catch (error) {
        if (!alive) return;
        console.error("Could not load Access policy:", error);
        toast.error("Could not load access rules");
        setPolicy(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => {
    if (!policy) return [];
    const all = new Set();

    Object.values(policy).forEach((items) => {
      items.forEach((permission) => all.add(permission));
    });

    const allowed = new Set(policy[selectedRole] || []);

    return CATEGORIES.map((title) => {
      const entries = [...all]
        .filter((permission) => permissionCategory(permission) === title)
        .sort((a, b) => {
          const area = readableArea(a).localeCompare(readableArea(b));
          return area || readableAction(a).localeCompare(readableAction(b));
        });

      const allowedCount = entries.filter((permission) => allowed.has(permission)).length;

      return {
        title,
        entries: entries.map((permission) => ({
          id: permission,
          label: `${readableArea(permission)} · ${readableAction(permission)}`,
          allowed: allowed.has(permission),
        })),
        allowedCount,
        accessLabel: allowedCount === 0
          ? "No access"
          : allowedCount === entries.length
            ? "Full access"
            : "Limited access",
      };
    }).filter((category) => category.entries.length > 0);
  }, [policy, selectedRole]);

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={2} showTable={false} />;
  }

  if (!policy) {
    return (
      <section className="svx-access-simple svx-access-error">
        <h2>Roles & access</h2>
        <p>Access rules are unavailable right now. Please refresh the page.</p>
      </section>
    );
  }

  return (
    <div className="svx-settings-page svx-access-simple">
      <header className="svx-access-heading">
        <div>
          <h2>Roles & access</h2>
          <p>See what each staff role can do.</p>
        </div>
        <Link className="svx-access-manage" to="/app/settings/members">
          Manage team <span aria-hidden="true">→</span>
        </Link>
      </header>

      <div className="svx-access-role-section">
        <h3>Choose a role</h3>
        <div className="svx-access-role-tabs" role="group" aria-label="Select staff role">
          {ROLES.filter(([key]) => Array.isArray(policy[key])).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={selectedRole === key ? "is-selected" : ""}
              aria-pressed={selectedRole === key}
              onClick={() => chooseRole(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="svx-access-role-description">
        <h3>{ROLES.find(([key]) => key === selectedRole)?.[1] || selectedRole}</h3>
        <p>{DESCRIPTIONS[selectedRole] || "Standard business access."}</p>
      </section>

      <section className="svx-access-permissions" aria-label="Permissions by area">
        <div className="svx-access-list-heading">
          <h3>Permissions</h3>
          <span>Select an area to see details</span>
        </div>

        {categories.map((category) => {
          const expanded = expandedCategory === category.title;
          const panelId = `svx-access-${CATEGORIES.indexOf(category.title)}`;

          return (
            <section className="svx-access-category" key={category.title}>
              <button
                type="button"
                className="svx-access-category-trigger"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setExpandedCategory(
                  expanded ? null : category.title
                )}
              >
                <span className="svx-access-category-name">{category.title}</span>
                <span className="svx-access-category-meta">{category.accessLabel}</span>
                <span className="svx-access-chevron" aria-hidden="true">⌄</span>
              </button>

              {expanded ? (
                <div className="svx-access-category-content" id={panelId}>
                  {category.entries.map((item) => (
                    <div className="svx-access-permission-row" key={item.id}>
                      <span>{item.label}</span>
                      <span className={item.allowed ? "is-allowed" : "is-blocked"}>
                        {item.allowed ? "Allowed" : "Not allowed"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </section>

      <p className="svx-access-footnote">
        These are Storvex role permissions. To change a staff member's role
        or assigned branches, use Manage team.
      </p>
    </div>
  );
}

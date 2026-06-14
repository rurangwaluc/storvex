import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import PageSkeleton from "../../components/ui/PageSkeleton";
import { getMyPermissions, getPermissionPolicy } from "../../services/permissionsApi";
import "./Settings.css";
import "./SettingsRoles.css";

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
  return "rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeRole(role) {
  return cleanString(role).toUpperCase();
}


function isBusinessRole(role) {
  return ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"].includes(normalizeRole(role));
}

function businessPolicyOnly(policy) {
  if (!policy) return null;

  return Object.fromEntries(
    Object.entries(policy).filter(([role]) => isBusinessRole(role)),
  );
}

function roleLabel(role) {
  const r = normalizeRole(role);

  if (r === "OWNER") return "Owner";
  if (r === "MANAGER") return "Manager";
  if (r === "CASHIER") return "Cashier";
  if (r === "SELLER") return "Seller";
  if (r === "STOREKEEPER") return "Storekeeper";
  if (r === "TECHNICIAN") return "Technician";
  return r || "Unknown";
}

function roleTone(role) {
  const r = normalizeRole(role);

  if (r === "OWNER") return "primary";
  if (r === "MANAGER") return "info";
  if (r === "CASHIER") return "success";
  if (r === "SELLER") return "warning";
  if (r === "STOREKEEPER") return "neutral";
  if (r === "TECHNICIAN") return "success";

  return "neutral";
}

function roleDescription(role) {
  const r = normalizeRole(role);

  if (r === "OWNER") {
    return "Full store control across staff, branches, billing, settings, reports, and sensitive actions.";
  }

  if (r === "MANAGER") {
    return "Daily operations access without owner-only billing and staff control.";
  }

  if (r === "CASHIER") {
    return "Sales desk access for payments, receipts, and cashier workflows.";
  }

  if (r === "SELLER") {
    return "Sales and customer support access for daily selling work.";
  }

  if (r === "STOREKEEPER") {
    return "Stock, supply, and inventory movement access.";
  }

  if (r === "TECHNICIAN") {
    return "Repair jobs and technical customer support access.";
  }

  return "Role permissions are controlled by the backend policy.";
}

function groupForPermission(permission) {
  const p = cleanString(permission).toUpperCase();

  if (p.startsWith("DASHBOARD_")) return "Dashboard";
  if (p.startsWith("SETTINGS_")) return "Settings";
  if (p.startsWith("BRANCHES_")) return "Branches";
  if (p.startsWith("MEMBERS_")) return "Members";
  if (p.startsWith("BILLING_")) return "Billing";
  if (p.startsWith("SECURITY_")) return "Security";
  if (p.startsWith("AUDIT_")) return "Audit";
  if (p.startsWith("POS_") || p.startsWith("SALE_") || p.startsWith("WARRANTY_")) return "Point of sale";
  if (p.startsWith("CASH_DRAWER_")) return "Cash drawer";
  if (p.startsWith("INVENTORY_")) return "Inventory";
  if (p.startsWith("SUPPLIERS_")) return "Suppliers";
  if (p.startsWith("CUSTOMERS_")) return "Customers";
  if (p.startsWith("REPAIRS_")) return "Repairs";
  if (p.startsWith("REPORTS_")) return "Reports";
  if (p.startsWith("DELIVERY_NOTES_")) return "Delivery notes";
  if (p.startsWith("INTERSTORE_")) return "Inter-store";
  if (p.startsWith("WHATSAPP_")) return "WhatsApp";

  return "Other";
}

function actionLabel(action) {
  const a = cleanString(action).toUpperCase();

  if (a === "VIEW") return "View";
  if (a === "CREATE") return "Create";
  if (a === "EDIT" || a === "UPDATE") return "Edit";
  if (a === "DELETE" || a === "REMOVE") return "Remove";
  if (a === "DEACTIVATE") return "Deactivate";
  if (a === "RESET_PASSWORD") return "Reset password";
  if (a === "OPEN") return "Open";
  if (a === "CLOSE") return "Close";
  if (a === "PAY") return "Pay";
  if (a === "PAYMENT_ADD") return "Add payment";
  if (a === "RECEIVE") return "Receive";
  if (a === "RETURN") return "Return";
  if (a === "SELL") return "Sell";
  if (a === "ADJUST") return "Adjust";
  if (a === "HISTORY_VIEW") return "View history";
  if (a === "REORDER_VIEW") return "View reorder list";
  if (a === "VIEW_CREDIT") return "View credit";
  if (a === "VIEW_SALES") return "View sales";
  if (a === "CREATE_SALE") return "Create sale";
  if (a === "RECORD_MOVEMENT") return "Record movement";
  if (a === "VIEW_ROLES") return "View roles";

  return a
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function permissionLabel(permission) {
  const p = cleanString(permission).toUpperCase();
  const group = groupForPermission(p);

  const prefixMap = {
    Dashboard: "DASHBOARD_",
    Settings: "SETTINGS_",
    Branches: "BRANCHES_",
    Members: "MEMBERS_",
    Billing: "BILLING_",
    Security: "SECURITY_",
    Audit: "AUDIT_",
    "Point of sale": "",
    "Cash drawer": "CASH_DRAWER_",
    Inventory: "INVENTORY_",
    Suppliers: "SUPPLIERS_",
    Customers: "CUSTOMERS_",
    Repairs: "REPAIRS_",
    Reports: "REPORTS_",
    "Delivery notes": "DELIVERY_NOTES_",
    "Inter-store": "INTERSTORE_",
    WhatsApp: "WHATSAPP_",
  };

  if (p === "POS_CREATE_SALE") return "Create POS sale";
  if (p === "POS_VIEW") return "View POS";
  if (p === "POS_VIEW_SALES") return "View POS sales";
  if (p === "POS_VIEW_CREDIT") return "View customer credit";
  if (p === "SALE_PAYMENT_ADD") return "Add sale payment";
  if (p === "SALE_CANCEL") return "Cancel sale";
  if (p === "SALE_REFUND") return "Refund sale";
  if (p === "WARRANTY_CREATE") return "Create warranty";

  const prefix = prefixMap[group] || "";
  const action = prefix && p.startsWith(prefix) ? p.slice(prefix.length) : p;

  return actionLabel(action);
}

function permissionRisk(permission) {
  const p = cleanString(permission).toUpperCase();

  if (
    p.includes("BILLING") ||
    p.includes("RESET_PASSWORD") ||
    p.includes("DEACTIVATE") ||
    p.includes("DELETE") ||
    p.includes("CANCEL") ||
    p.includes("REFUND") ||
    p.includes("AUDIT") ||
    p.includes("SETTINGS")
  ) {
    return "Sensitive";
  }

  if (
    p.includes("CREATE") ||
    p.includes("EDIT") ||
    p.includes("UPDATE") ||
    p.includes("ADJUST") ||
    p.includes("PAYMENT") ||
    p.includes("OPEN") ||
    p.includes("CLOSE")
  ) {
    return "Can change data";
  }

  return "View only";
}

function riskTone(risk) {
  if (risk === "Sensitive") return "warning";
  if (risk === "Can change data") return "info";
  return "neutral";
}

function permissionTone(permission) {
  return riskTone(permissionRisk(permission));
}

function roleCan(policy, role, permission) {
  return Array.isArray(policy?.[role]) && policy[role].includes(permission);
}

function Badge({ children, tone = "neutral", className = "" }) {
  return <span className={cx("svx-roles-badge", `is-${tone}`, className)}>{children}</span>;
}

function PermissionStatus({ on }) {
  return <span className={cx("svx-roles-status", on ? "is-on" : "is-off")}>{on ? "Allowed" : "Blocked"}</span>;
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>{eyebrow}</div> : null}

      <h2 className={cx("mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]", strongText())}>{title}</h2>

      {subtitle ? <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>{subtitle}</p> : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  return (
    <article className={cx("svx-roles-metric", `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

function RoleSwitcher({ roles, selectedRole, onSelect }) {
  return (
    <section className={cx(pageCard(), "svx-roles-switch")}> 
      <div>
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>Choose role</div>
        <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>Select a role. The table below shows only what that role can do.</p>
      </div>

      <div className="svx-roles-tabs" role="tablist" aria-label="Store role selector">
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onSelect(role)}
            className={cx("svx-roles-tab", selectedRole === role && "is-active")}
          >
            {roleLabel(role)}
          </button>
        ))}
      </div>

      <div className="svx-roles-select-wrap">
        <select className="app-input" value={selectedRole} onChange={(event) => onSelect(event.target.value)}>
          {roles.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function buildAreaRows({ role, policy, groups }) {
  return groups
    .map((section) => {
      const allowed = section.rows.filter((permission) => roleCan(policy, role, permission));
      if (!allowed.length) return null;

      const sensitive = allowed.filter((permission) => permissionRisk(permission) === "Sensitive").length;
      const writes = allowed.filter((permission) => permissionRisk(permission) === "Can change data").length;
      const views = Math.max(0, allowed.length - sensitive - writes);
      const mainRisk = sensitive > 0 ? "Sensitive" : writes > 0 ? "Can change data" : "View only";

      const preview = allowed
        .slice(0, 3)
        .map(permissionLabel)
        .join(", ");

      return {
        area: section.group,
        count: allowed.length,
        sensitive,
        writes,
        views,
        mainRisk,
        preview,
      };
    })
    .filter(Boolean);
}

function RoleOverview({ role, permissions, areaRows }) {
  const total = permissions.length;
  const sensitive = permissions.filter((permission) => permissionRisk(permission) === "Sensitive").length;
  const writes = permissions.filter((permission) => permissionRisk(permission) === "Can change data").length;
  const views = Math.max(0, total - sensitive - writes);

  return (
    <section className={cx(pageCard(), "svx-roles-overview")}> 
      <div className="svx-roles-overview-head">
        <div>
          <div className="svx-roles-overview-badges">
            <Badge tone={roleTone(role)}>{roleLabel(role)}</Badge>
            {normalizeRole(role) === "OWNER" ? <Badge tone="warning">Owner powers</Badge> : null}
            {normalizeRole(role) === "MANAGER" ? <Badge tone="info">Daily operations</Badge> : null}
          </div>

          <h3>{roleLabel(role)} access</h3>
          <p>{roleDescription(role)}</p>
        </div>

        <Link to="/app/settings/members" className="svx-roles-primary-link">
          Open members
        </Link>
      </div>

      <div className="svx-roles-metrics-grid">
        <SummaryCard label="Allowed actions" value={total} note="Backend policy access points" tone="success" />
        <SummaryCard label="Sensitive" value={sensitive} note="Needs owner awareness" tone={sensitive > 0 ? "warning" : "neutral"} />
        <SummaryCard label="Can change data" value={writes} note="Creates or updates records" tone={writes > 0 ? "info" : "neutral"} />
        <SummaryCard label="Store areas" value={areaRows.length} note="Business areas unlocked" tone="primary" />
      </div>
    </section>
  );
}

function AccessTable({ role, areaRows }) {
  return (
    <section className={cx(pageCard(), "svx-roles-table-card")}> 
      <div className="svx-roles-card-head">
        <SectionHeading
          eyebrow="Access table"
          title={`${roleLabel(role)} permissions`}
          subtitle="A compact business table. Owners see the area, the level of access, and whether the role can change important data."
        />
        <Badge tone="primary">{areaRows.length} areas</Badge>
      </div>

      <div className="svx-roles-access-table" role="table" aria-label={`${roleLabel(role)} access table`}>
        <div className="svx-roles-table-row is-head" role="row">
          <div role="columnheader">Area</div>
          <div role="columnheader">Access</div>
          <div role="columnheader">What this role can do</div>
          <div role="columnheader">Risk</div>
          <div role="columnheader">Status</div>
        </div>

        {areaRows.map((row) => (
          <div className="svx-roles-table-row" role="row" key={row.area}>
            <div role="cell" data-label="Area">
              <strong>{row.area}</strong>
              <span>{row.count} allowed action{row.count === 1 ? "" : "s"}</span>
            </div>
            <div role="cell" data-label="Access">
              <span>{row.views} view</span>
              <span>{row.writes} change</span>
              <span>{row.sensitive} sensitive</span>
            </div>
            <div role="cell" data-label="Can do">
              <p>{row.preview || "Allowed by policy"}</p>
            </div>
            <div role="cell" data-label="Risk">
              <Badge tone={riskTone(row.mainRisk)}>{row.mainRisk}</Badge>
            </div>
            <div role="cell" data-label="Status">
              <PermissionStatus on />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareRoles({ roles, policy, selectedPermission, onSelectPermission, permissions }) {
  const visibleRoles = roles.filter(isBusinessRole);

  return (
    <section className={cx(pageCard(), "svx-roles-compare-card")}> 
      <div className="svx-roles-card-head">
        <SectionHeading
          eyebrow="Compare"
          title="Compare one permission"
          subtitle="Use this only when you need to verify one action across roles."
        />

        <div className="svx-roles-compare-select">
          <label>Permission</label>
          <select className="app-input" value={selectedPermission} onChange={(event) => onSelectPermission(event.target.value)}>
            {permissions.map((permission) => (
              <option key={permission} value={permission}>
                {groupForPermission(permission)} — {permissionLabel(permission)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPermission ? (
        <div className="svx-roles-compare-table" role="table" aria-label="Compare permission by role">
          <div className="svx-roles-compare-row is-head" role="row">
            <div role="columnheader">Role</div>
            <div role="columnheader">Meaning</div>
            <div role="columnheader">Status</div>
          </div>

          {visibleRoles.map((role) => (
            <div key={`${role}-${selectedPermission}`} className="svx-roles-compare-row" role="row">
              <div role="cell" data-label="Role">
                <strong>{roleLabel(role)}</strong>
                <span>{normalizeRole(role)}</span>
              </div>
              <div role="cell" data-label="Meaning">
                {roleDescription(role)}
              </div>
              <div role="cell" data-label="Status">
                <PermissionStatus on={roleCan(policy, role, selectedPermission)} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function SettingsRoles() {
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");

  useEffect(() => {
    document.title = "User roles • Storvex";
  }, []);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      try {
        const [me, policyData] = await Promise.all([getMyPermissions(), getPermissionPolicy()]);

        if (!alive) return;

        const roles = businessPolicyOnly(policyData?.roles || null);
        const roleNames = roles ? Object.keys(roles) : [];

        setMyRole(isBusinessRole(me?.role) ? me?.role : null);
        setPolicy(roles);

        const preferredRole = roleNames.find((role) => normalizeRole(role) === "OWNER") || roleNames[0] || "";
        setSelectedRole(preferredRole);

        const allPermissions = new Set();
        Object.values(roles || {}).forEach((items) => {
          if (!Array.isArray(items)) return;
          items.forEach((permission) => allPermissions.add(permission));
        });

        const firstPermission =
          Array.from(allPermissions).find((permission) => permission === "MEMBERS_RESET_PASSWORD") ||
          Array.from(allPermissions)[0] ||
          "";

        setSelectedPermission(firstPermission);
      } catch (error) {
        console.error(error);
        if (!alive) return;

        toast.error(error?.message || "Failed to load roles policy");
        setPolicy(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const roleNames = useMemo(() => {
    if (!policy) return [];

    return Object.keys(policy).filter(isBusinessRole).sort((a, b) => {
      const rank = {
        OWNER: 1,
        MANAGER: 2,
        CASHIER: 3,
        SELLER: 4,
        STOREKEEPER: 5,
        TECHNICIAN: 6,
      };

      return (rank[normalizeRole(a)] || 99) - (rank[normalizeRole(b)] || 99);
    });
  }, [policy]);

  const allPermissions = useMemo(() => {
    if (!policy) return [];

    const permissions = new Set();

    Object.entries(policy).forEach(([role, items]) => {
      if (!isBusinessRole(role) || !Array.isArray(items)) return;
      items.forEach((permission) => permissions.add(permission));
    });

    return Array.from(permissions).sort((a, b) => {
      const groupDiff = groupForPermission(a).localeCompare(groupForPermission(b));
      if (groupDiff !== 0) return groupDiff;

      return permissionLabel(a).localeCompare(permissionLabel(b));
    });
  }, [policy]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map();

    for (const permission of allPermissions) {
      const group = groupForPermission(permission);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(permission);
    }

    const preferredOrder = [
      "Dashboard",
      "Settings",
      "Branches",
      "Members",
      "Billing",
      "Security",
      "Audit",
      "Point of sale",
      "Cash drawer",
      "Inventory",
      "Suppliers",
      "Customers",
      "Repairs",
      "Reports",
      "Delivery notes",
      "Inter-store",
      "WhatsApp",
      "Other",
    ];

    return Array.from(groups.entries())
      .map(([group, rows]) => ({ group, rows }))
      .sort((a, b) => preferredOrder.indexOf(a.group) - preferredOrder.indexOf(b.group));
  }, [allPermissions]);

  const selectedRolePermissions = useMemo(() => {
    if (!policy || !selectedRole) return [];
    return Array.isArray(policy[selectedRole]) ? policy[selectedRole] : [];
  }, [policy, selectedRole]);

  const areaRows = useMemo(() => {
    if (!policy || !selectedRole) return [];
    return buildAreaRows({ role: selectedRole, policy, groups: groupedPermissions });
  }, [groupedPermissions, policy, selectedRole]);

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={2} showTable={false} />;
  }

  if (!policy) {
    return (
      <div className={cx(pageCard(), "p-6")}> 
        <div className={cx("text-lg font-black", strongText())}>Roles & permissions</div>
        <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>Role policy is not available right now.</p>
      </div>
    );
  }

  return (
    <div className="svx-settings-page svx-settings-roles min-w-0 space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "svx-roles-hero")}> 
        <div>
          <SectionHeading
            eyebrow="Roles"
            title="Roles & permissions"
            subtitle="See what each staff role can do. This page summarizes backend access rules in plain business language."
          />
        </div>

        <div className="svx-roles-hero-badges">
          <Badge tone="success">Policy controlled</Badge>
          {myRole ? <Badge tone="primary">My role: {roleLabel(myRole)}</Badge> : null}
          <Badge tone="neutral">{roleNames.length} roles</Badge>
        </div>
      </section>

     

      <RoleSwitcher roles={roleNames} selectedRole={selectedRole} onSelect={setSelectedRole} />

      <RoleOverview role={selectedRole} permissions={selectedRolePermissions} areaRows={areaRows} />

      <AccessTable role={selectedRole} areaRows={areaRows} />

      <CompareRoles
        roles={roleNames}
        policy={policy}
        selectedPermission={selectedPermission}
        onSelectPermission={setSelectedPermission}
        permissions={allPermissions}
      />

      <section className={cx(pageCard(), "svx-roles-members-card")}> 
        <div>
          <strong>Need to change someone’s role?</strong>
          <p>Role changes should be done from Members so every staff account stays tied to the right role and branch access.</p>
        </div>

        <Link to="/app/settings/members" className="svx-roles-primary-link">
          Open members
        </Link>
      </section>
    </div>
  );
}

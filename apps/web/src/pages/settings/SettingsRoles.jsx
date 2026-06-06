import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import PageSkeleton from "../../components/ui/PageSkeleton";
import { getMyPermissions, getPermissionPolicy } from "../../services/permissionsApi";

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

function softPanel() {
  return "rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)]";
}

function primaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 text-sm font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
}

function secondaryBtn() {
  return "inline-flex h-11 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60";
}

function badgeClass(tone = "neutral") {
  if (tone === "primary") {
    return "bg-[var(--color-primary-soft)] text-[var(--color-primary)]";
  }

  if (tone === "success") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "bg-red-500/10 text-red-600 dark:text-red-300";
  }

  if (tone === "info") {
    return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
  }

  return "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]";
}

function Badge({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black",
        badgeClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

function cleanString(value) {
  return String(value || "").trim();
}

function normalizeRole(role) {
  return cleanString(role).toUpperCase();
}

function roleLabel(role) {
  const r = normalizeRole(role);

  if (r === "OWNER") return "Owner";
  if (r === "MANAGER") return "Manager";
  if (r === "CASHIER") return "Cashier";
  if (r === "SELLER") return "Seller";
  if (r === "STOREKEEPER") return "Storekeeper";
  if (r === "TECHNICIAN") return "Technician";
  if (r === "PLATFORM_ADMIN") return "Platform admin";

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
    return "Full store control: billing, staff, branches, settings, reports, and sensitive actions.";
  }

  if (r === "MANAGER") {
    return "Operational supervisor: can view staff and manage daily operations, but cannot control owner-only areas like billing or staff changes.";
  }

  if (r === "CASHIER") {
    return "Front-desk operator: handles sales, customer payments, receipts, and cashier workflows.";
  }

  if (r === "SELLER") {
    return "Sales-focused user: supports selling, customer service, and sales documents.";
  }

  if (r === "STOREKEEPER") {
    return "Stock-focused user: manages inventory visibility, stock movement, and supplier-related workflows.";
  }

  if (r === "TECHNICIAN") {
    return "Repair-focused user: handles service jobs, repair workflows, and technical customer support.";
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

function permissionTone(permission) {
  const risk = permissionRisk(permission);

  if (risk === "Sensitive") return "warning";
  if (risk === "Can change data") return "info";

  return "neutral";
}

function roleCan(policy, role, permission) {
  return Array.isArray(policy?.[role]) && policy[role].includes(permission);
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}

      <h2
        className={cx(
          "mt-3 text-[1.55rem] font-black tracking-[-0.04em] sm:text-[1.9rem]",
          strongText()
        )}
      >
        {title}
      </h2>

      {subtitle ? (
        <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, note, tone = "neutral" }) {
  const accentClass =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-[var(--color-danger)]"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-[var(--color-primary)]";

  return (
    <article className={cx(pageCard(), "relative min-h-[126px] overflow-hidden p-5")}>
      <div className={cx("absolute left-0 top-0 h-full w-1.5", accentClass)} />

      <div className="pl-2">
        <div className={cx("text-[10px] font-black uppercase tracking-[0.18em]", softText())}>
          {label}
        </div>

        <div className={cx("mt-2 text-[1.55rem] font-black tracking-[-0.04em]", strongText())}>
          {value}
        </div>

        {note ? (
          <div className={cx("mt-2 text-xs font-semibold leading-5", mutedText())}>
            {note}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function RoleSwitcher({ roles, selectedRole, onSelect }) {
  return (
    <section className={cx(pageCard(), "p-4 sm:p-5")}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className={cx("text-[11px] font-black uppercase tracking-[0.18em]", softText())}>
            Choose role
          </div>
          <div className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
            Select a role to see what that staff member can access.
          </div>
        </div>

        <div className="lg:hidden">
          <select
            className="app-input"
            value={selectedRole}
            onChange={(event) => onSelect(event.target.value)}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onSelect(role)}
            className={cx(
              "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-black transition",
              selectedRole === role
                ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]"
                : "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] hover:border-[var(--color-primary)]"
            )}
          >
            {roleLabel(role)}
          </button>
        ))}
      </div>
    </section>
  );
}

function PermissionStatus({ on }) {
  return (
    <span
      className={cx(
        "inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-black",
        on
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
      )}
    >
      {on ? "Allowed" : "Blocked"}
    </span>
  );
}

function PermissionCard({ permission, allowed }) {
  return (
    <article className={cx(softPanel(), "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx("text-sm font-black tracking-[-0.02em]", strongText())}>
            {permissionLabel(permission)}
          </div>

          <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
            {groupForPermission(permission)}
          </div>
        </div>

        <PermissionStatus on={allowed} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={permissionTone(permission)}>{permissionRisk(permission)}</Badge>
      </div>
    </article>
  );
}

function RoleOverview({ role, permissions }) {
  const total = permissions.length;

  const sensitive = permissions.filter((permission) => permissionRisk(permission) === "Sensitive").length;

  const writes = permissions.filter(
    (permission) => permissionRisk(permission) === "Can change data"
  ).length;

  const views = Math.max(0, total - sensitive - writes);

  return (
    <section className={cx(pageCard(), "overflow-hidden")}>
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={roleTone(role)}>{roleLabel(role)}</Badge>
              {normalizeRole(role) === "OWNER" ? (
                <Badge tone="warning">Owner-only powers</Badge>
              ) : null}
              {normalizeRole(role) === "MANAGER" ? (
                <Badge tone="info">No billing or staff changes</Badge>
              ) : null}
            </div>

            <h3 className={cx("mt-4 text-2xl font-black tracking-[-0.05em]", strongText())}>
              {roleLabel(role)} access
            </h3>

            <p className={cx("mt-3 max-w-3xl text-sm font-semibold leading-6", mutedText())}>
              {roleDescription(role)}
            </p>
          </div>

          <Link to="/app/settings/members" className={secondaryBtn()}>
            Manage members
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Allowed actions"
          value={total}
          note="Access points enabled for this role"
          tone="success"
        />

        <SummaryCard
          label="Sensitive actions"
          value={sensitive}
          note="Owner-grade or high-control permissions"
          tone={sensitive > 0 ? "warning" : "neutral"}
        />

        <SummaryCard
          label="Data changes"
          value={writes}
          note="Actions that can create or change records"
          tone={writes > 0 ? "info" : "neutral"}
        />

        <SummaryCard
          label="View access"
          value={views}
          note="Read-only visibility permissions"
          tone="neutral"
        />
      </div>
    </section>
  );
}

function GroupedPermissions({ role, policy, groups }) {
  return (
    <section className={cx(pageCard(), "p-5 sm:p-6")}>
      <SectionHeading
        eyebrow="Access details"
        title={`${roleLabel(role)} permissions`}
        subtitle="This is shown in business language so store owners can understand access without reading technical permission codes."
      />

      <div className="mt-6 space-y-4">
        {groups.map((section) => {
          const allowedInGroup = section.rows.filter((permission) => roleCan(policy, role, permission));

          if (!allowedInGroup.length) return null;

          return (
            <div key={section.group} className={cx(softPanel(), "p-4 sm:p-5")}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>
                    {section.group}
                  </div>
                  <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                    {allowedInGroup.length} allowed action{allowedInGroup.length === 1 ? "" : "s"}
                  </div>
                </div>

                <Badge tone="primary">{allowedInGroup.length}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                {allowedInGroup.map((permission) => (
                  <PermissionCard key={`${role}-${permission}`} permission={permission} allowed />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CompareRoles({ roles, policy, selectedPermission, onSelectPermission, permissions }) {
  const visibleRoles = roles.filter((role) =>
    ["OWNER", "MANAGER", "CASHIER", "SELLER", "STOREKEEPER", "TECHNICIAN"].includes(
      normalizeRole(role)
    )
  );

  return (
    <section className={cx(pageCard(), "p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <SectionHeading
          eyebrow="Compare"
          title="Compare one permission"
          subtitle="Use this when you want to quickly verify which roles can perform a specific action."
        />

        <div className="w-full xl:max-w-md">
          <label className={cx("text-sm font-black", strongText())}>Permission</label>
          <select
            className="app-input mt-2"
            value={selectedPermission}
            onChange={(event) => onSelectPermission(event.target.value)}
          >
            {permissions.map((permission) => (
              <option key={permission} value={permission}>
                {groupForPermission(permission)} — {permissionLabel(permission)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPermission ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRoles.map((role) => (
            <article key={`${role}-${selectedPermission}`} className={cx(softPanel(), "p-4")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={cx("text-sm font-black", strongText())}>{roleLabel(role)}</div>
                  <div className={cx("mt-1 text-xs font-semibold leading-5", mutedText())}>
                    {roleDescription(role)}
                  </div>
                </div>

                <PermissionStatus on={roleCan(policy, role, selectedPermission)} />
              </div>
            </article>
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

        const roles = policyData?.roles || null;
        const roleNames = roles ? Object.keys(roles) : [];

        setMyRole(me?.role || null);
        setPolicy(roles);

        const preferredRole =
          roleNames.find((role) => normalizeRole(role) === "OWNER") ||
          roleNames[0] ||
          "";

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

    return Object.keys(policy).sort((a, b) => {
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

    Object.values(policy).forEach((items) => {
      if (!Array.isArray(items)) return;
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
      .map(([group, rows]) => ({
        group,
        rows,
      }))
      .sort((a, b) => preferredOrder.indexOf(a.group) - preferredOrder.indexOf(b.group));
  }, [allPermissions]);

  const selectedRolePermissions = useMemo(() => {
    if (!policy || !selectedRole) return [];
    return Array.isArray(policy[selectedRole]) ? policy[selectedRole] : [];
  }, [policy, selectedRole]);

  if (loading) {
    return <PageSkeleton titleWidth="w-56" lines={2} showTable={false} />;
  }

  if (!policy) {
    return (
      <div className={cx(pageCard(), "p-6")}>
        <div className={cx("text-lg font-black", strongText())}>Roles & permissions</div>
        <p className={cx("mt-2 text-sm font-semibold leading-6", mutedText())}>
          Role policy is not available right now.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <SectionHeading
              eyebrow="Roles"
              title="Roles & permissions"
              subtitle="See what each staff role can do inside the store. The rules shown here come from the backend access policy."
            />

            <div className="flex flex-wrap gap-2">
              <Badge tone="success">Policy controlled</Badge>
              {myRole ? <Badge tone="primary">My role: {roleLabel(myRole)}</Badge> : null}
              <Badge tone="neutral">{roleNames.length} roles</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Roles"
            value={roleNames.length}
            note="Staff categories available in this store"
            tone="primary"
          />

          <SummaryCard
            label="Permissions"
            value={allPermissions.length}
            note="Access rules controlled by backend policy"
            tone="success"
          />

          <SummaryCard
            label="Owner"
            value={(policy.OWNER || []).length}
            note="Full store control"
            tone="warning"
          />

          <SummaryCard
            label="Manager"
            value={(policy.MANAGER || []).length}
            note="Operational access without owner-only billing and staff powers"
            tone="info"
          />
        </div>
      </section>

      <RoleSwitcher roles={roleNames} selectedRole={selectedRole} onSelect={setSelectedRole} />

      <RoleOverview role={selectedRole} permissions={selectedRolePermissions} />

      <GroupedPermissions role={selectedRole} policy={policy} groups={groupedPermissions} />

      <CompareRoles
        roles={roleNames}
        policy={policy}
        selectedPermission={selectedPermission}
        onSelectPermission={setSelectedPermission}
        permissions={allPermissions}
      />

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className={cx("text-lg font-black tracking-[-0.03em]", strongText())}>
              Need to change someone’s role?
            </div>
            <p className={cx("mt-2 max-w-2xl text-sm font-semibold leading-6", mutedText())}>
              Role changes should be done from Members so every staff account stays tied to the
              right role and branch access.
            </p>
          </div>

          <Link to="/app/settings/members" className={primaryBtn()}>
            Open members
          </Link>
        </div>
      </section>
    </div>
  );
}
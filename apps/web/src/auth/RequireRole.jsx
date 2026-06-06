// src/auth/RequireRole.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function normalizeRoles(decoded) {
  const directRole = decoded?.role ? String(decoded.role).toUpperCase() : null;
  const directRoles = Array.isArray(decoded?.roles)
    ? decoded.roles.map((r) => String(r).toUpperCase()).filter(Boolean)
    : [];

  const nestedUserRole = decoded?.user?.role ? String(decoded.user.role).toUpperCase() : null;
  const nestedUserRoles = Array.isArray(decoded?.user?.roles)
    ? decoded.user.roles.map((r) => String(r).toUpperCase()).filter(Boolean)
    : [];

  const localStoredRole =
    typeof window !== "undefined"
      ? String(localStorage.getItem("userRole") || "").toUpperCase().trim()
      : "";

  return Array.from(
    new Set(
      [
        directRole,
        ...directRoles,
        nestedUserRole,
        ...nestedUserRoles,
        localStoredRole || null,
      ].filter(Boolean)
    )
  );
}

function AccessDenied({ userRoles, allowedRoles, pathname }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/40 dark:bg-[rgb(var(--bg-elevated))]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-600 dark:text-red-400">
          Access blocked
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 dark:text-[rgb(var(--text))]">
          You do not have access to this page
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-[rgb(var(--text-muted))]">
          This page is protected by role-based access. Instead of silently sending you back to the
          dashboard, Storvex now shows the actual mismatch so we can fix it properly.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-[rgb(var(--text-soft))]">
              Current route
            </div>
            <div className="mt-2 break-all text-sm font-medium text-stone-900 dark:text-[rgb(var(--text))]">
              {pathname}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-[rgb(var(--text-soft))]">
              Your decoded roles
            </div>
            <div className="mt-2 text-sm font-medium text-stone-900 dark:text-[rgb(var(--text))]">
              {userRoles.length ? userRoles.join(", ") : "No roles found"}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))]">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-[rgb(var(--text-soft))]">
            Allowed roles
          </div>
          <div className="mt-2 text-sm font-medium text-stone-900 dark:text-[rgb(var(--text))]">
            {allowedRoles.length ? allowedRoles.join(", ") : "No restriction"}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="/app"
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-stone-950 px-4 text-sm font-medium text-white transition hover:bg-stone-800 dark:bg-[rgb(var(--text))] dark:text-[rgb(var(--bg-elevated))]"
          >
            Go to Dashboard
          </a>

          <a
            href="/app/documents"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900 transition hover:bg-stone-50 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg))] dark:text-[rgb(var(--text))] dark:hover:bg-[rgb(var(--bg-muted))]"
          >
            Retry Document Center
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RequireRole({ roles = [], children }) {
  const location = useLocation();

  const token = localStorage.getItem("tenantToken") || localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  let decoded;
  try {
    decoded = jwtDecode(token);
  } catch (err) {
    console.error("RequireRole: invalid token", err);
    localStorage.removeItem("tenantToken");
    localStorage.removeItem("token");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (decoded?.exp && Date.now() >= decoded.exp * 1000) {
    localStorage.removeItem("tenantToken");
    localStorage.removeItem("token");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const userRoles = normalizeRoles(decoded);
  const allowedRoles = roles.map((r) => String(r).toUpperCase());

  if (userRoles.includes("OWNER") || userRoles.includes("PLATFORM_ADMIN")) {
    return children ? <>{children}</> : <Outlet />;
  }

  const hasAccess =
    allowedRoles.length === 0 ||
    userRoles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    console.warn("RequireRole denied access", {
      pathname: location.pathname,
      userRoles,
      allowedRoles,
      decoded,
    });

    return (
      <AccessDenied
        userRoles={userRoles}
        allowedRoles={allowedRoles}
        pathname={location.pathname}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
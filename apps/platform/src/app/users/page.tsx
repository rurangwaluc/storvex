"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { AsyncButton } from "@/components/platform/async-button";
import { DashboardSkeleton } from "@/components/platform/dashboard-skeleton";
import { PlatformSelect } from "@/components/platform/platform-select";
import { ProtectedPlatformLayout } from "@/components/platform/protected-platform-layout";
import {
  createPlatformUser,
  listPlatformUsers,
  resetPlatformUserPassword,
  updatePlatformUserRole,
  updatePlatformUserStatus,
} from "@/lib/platform-api";
import { getStoredPlatformSession } from "@/lib/platform-auth";
import type { PlatformRole, PlatformUser } from "@/lib/platform-types";

type EditablePlatformRole = Exclude<PlatformRole, "PLATFORM_OWNER">;

type CreateFormState = {
  name: string;
  email: string;
  password: string;
  role: EditablePlatformRole;
};

const INITIAL_CREATE_FORM: CreateFormState = {
  name: "",
  email: "",
  password: "",
  role: "PLATFORM_SUPPORT",
};

const PLATFORM_ROLE_OPTIONS = [
  {
    value: "PLATFORM_SUPPORT",
    label: "Support",
    description: "Reviews support cases, business health, and platform activity.",
  },
  {
    value: "PLATFORM_ADMIN",
    label: "Admin",
    description: "Manages most platform operations except owner-only actions.",
  },
] satisfies Array<{
  value: EditablePlatformRole;
  label: string;
  description: string;
}>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getRoleLabel(role: PlatformRole) {
  if (role === "PLATFORM_OWNER") return "Owner";
  if (role === "PLATFORM_ADMIN") return "Admin";
  return "Support";
}

function getRoleDescription(role: PlatformRole) {
  if (role === "PLATFORM_OWNER") return "Full platform control.";
  if (role === "PLATFORM_ADMIN") return "Can manage platform operations.";
  return "Can review and support businesses.";
}

function getRoleBadgeClass(role: PlatformRole) {
  if (role === "PLATFORM_OWNER") {
    return "border-[var(--platform-primary)] bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]";
  }

  if (role === "PLATFORM_ADMIN") {
    return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300";
  }

  return "border-slate-300 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";
}

function getStatusBadgeClass(isActive: boolean) {
  return isActive
    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
    : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300";
}

function cleanMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function canEditRole(role: PlatformRole): role is EditablePlatformRole {
  return role === "PLATFORM_ADMIN" || role === "PLATFORM_SUPPORT";
}

export default function PlatformUsersPage() {
    const storedSession = getStoredPlatformSession();
    const token = storedSession?.token || "";
    const currentUser = storedSession?.platformUser || null;
    const isOwner = currentUser?.role === "PLATFORM_OWNER";

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [createForm, setCreateForm] =
    useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>(
    {}
  );

  const activeUsersCount = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users]
  );

  const adminUsersCount = useMemo(
    () => users.filter((user) => user.role === "PLATFORM_ADMIN").length,
    [users]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let ignore = false;

    listPlatformUsers(token, {
      q: submittedQuery,
      take: 50,
    })
      .then((result) => {
        if (ignore) return;

        setUsers(Array.isArray(result.platformUsers) ? result.platformUsers : []);
        setCount(Number(result.count || 0));
        setError("");
      })
      .catch((err: unknown) => {
        if (ignore) return;

        setError(cleanMessage(err, "Failed to load platform users."));
      })
      .finally(() => {
        if (ignore) return;

        setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [token, submittedQuery]);

  async function refreshUsers({ quiet = true }: { quiet?: boolean } = {}) {
    if (!token) return;

    if (quiet) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");
    setSuccess("");

    try {
      const result = await listPlatformUsers(token, {
        q: submittedQuery,
        take: 50,
      });

      setUsers(Array.isArray(result.platformUsers) ? result.platformUsers : []);
      setCount(Number(result.count || 0));
    } catch (err) {
      setError(cleanMessage(err, "Failed to load platform users."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !isOwner) return;

    const payload: CreateFormState = {
      name: createForm.name.trim(),
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password,
      role: createForm.role,
    };

    if (!payload.name || !payload.email || !payload.password) {
      setError("Name, email, and temporary password are required.");
      return;
    }

    if (payload.password.length < 8) {
      setError("Temporary password must be at least 8 characters.");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const result = await createPlatformUser(token, payload);

      setCreateForm(INITIAL_CREATE_FORM);
      setSuccess(result.message || "Platform user created.");
      await refreshUsers({ quiet: true });
    } catch (err) {
      setError(cleanMessage(err, "Failed to create platform user."));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(user: PlatformUser, role: EditablePlatformRole) {
    if (!token || !isOwner) return;
    if (!canEditRole(user.role)) return;

    setBusyUserId(user.id);
    setError("");
    setSuccess("");

    try {
      const result = await updatePlatformUserRole(token, user.id, {
        role,
      });

      setSuccess(result.message || "Platform user role updated.");
      await refreshUsers({ quiet: true });
    } catch (err) {
      setError(cleanMessage(err, "Failed to update platform user role."));
    } finally {
      setBusyUserId("");
    }
  }

  async function handleStatusToggle(user: PlatformUser) {
    if (!token || !isOwner) return;
    if (user.role === "PLATFORM_OWNER") return;
    if (user.id === currentUser?.id) return;

    setBusyUserId(user.id);
    setError("");
    setSuccess("");

    try {
      const result = await updatePlatformUserStatus(token, user.id, {
        isActive: !user.isActive,
      });

      setSuccess(result.message || "Platform user status updated.");
      await refreshUsers({ quiet: true });
    } catch (err) {
      setError(cleanMessage(err, "Failed to update platform user status."));
    } finally {
      setBusyUserId("");
    }
  }

  async function handlePasswordReset(user: PlatformUser) {
    if (!token || !isOwner) return;
    if (user.role === "PLATFORM_OWNER") return;

    const temporaryPassword = String(passwordInputs[user.id] || "");

    if (temporaryPassword.length < 8) {
      setError("Temporary password must be at least 8 characters.");
      return;
    }

    setBusyUserId(user.id);
    setError("");
    setSuccess("");

    try {
      const result = await resetPlatformUserPassword(token, user.id, {
        temporaryPassword,
      });

      setPasswordInputs((current) => ({
        ...current,
        [user.id]: "",
      }));

      setSuccess(result.message || "Platform user password reset.");
    } catch (err) {
      setError(cleanMessage(err, "Failed to reset platform user password."));
    } finally {
      setBusyUserId("");
    }
  }

  return (
    <ProtectedPlatformLayout>
      {isLoading ? (
        <DashboardSkeleton insideShell />
      ) : (
        <div className="space-y-6">
          <div className="platform-card flex flex-col justify-between gap-4 rounded-[1.7rem] p-5 shadow-sm lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
                Platform users
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Control who can access the Storvex platform.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 platform-muted">
                Manage platform admins and support users with clean, protected
                controls.
              </p>
            </div>

            <AsyncButton
              type="button"
              variant="secondary"
              isLoading={isRefreshing}
              onClick={() => refreshUsers({ quiet: true })}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </AsyncButton>
          </div>

          {error ? (
            <div className="rounded-[1.5rem] border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-[1.5rem] border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
              {success}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold platform-muted">
                    Platform users
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {count.toLocaleString()}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
              <p className="text-sm font-bold platform-muted">Active users</p>
              <p className="mt-2 text-3xl font-black tracking-tight">
                {activeUsersCount.toLocaleString()}
              </p>
            </div>

            <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
              <p className="text-sm font-bold platform-muted">Admins</p>
              <p className="mt-2 text-3xl font-black tracking-tight">
                {adminUsersCount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="platform-card rounded-[1.5rem] p-5 shadow-sm">
            <form
              onSubmit={handleSearch}
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 platform-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name or email"
                  className="h-12 w-full rounded-2xl border bg-transparent pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                  style={{ borderColor: "var(--platform-border)" }}
                />
              </div>

              <AsyncButton type="submit" variant="secondary">
                Search
              </AsyncButton>
            </form>
          </div>

          {isOwner ? (
            <section className="platform-card rounded-[1.7rem] p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]">
                  <UserPlus className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black">Add platform user</h2>
                  <p className="text-sm platform-muted">
                    Create admin or support access for trusted team members.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleCreateUser}
                className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_240px_auto]"
              >
                <input
                  required
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Full name"
                  className="h-12 rounded-2xl border bg-transparent px-4 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                  style={{ borderColor: "var(--platform-border)" }}
                />

                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="Email address"
                  className="h-12 rounded-2xl border bg-transparent px-4 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                  style={{ borderColor: "var(--platform-border)" }}
                />

                <input
                  required
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Temporary password"
                  className="h-12 rounded-2xl border bg-transparent px-4 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                  style={{ borderColor: "var(--platform-border)" }}
                />

                <PlatformSelect
                  value={createForm.role}
                  options={PLATFORM_ROLE_OPTIONS}
                  onChange={(role) =>
                    setCreateForm((current) => ({
                      ...current,
                      role,
                    }))
                  }
                />

                <AsyncButton type="submit" isLoading={isCreating}>
                  Create
                </AsyncButton>
              </form>
            </section>
          ) : null}

          <section className="platform-card overflow-hidden rounded-[1.7rem] shadow-sm">
            <div
              className="border-b p-5"
              style={{ borderColor: "var(--platform-border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--platform-primary-soft)] text-[var(--platform-primary)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-black">Users</h2>
                  <p className="text-sm platform-muted">
                    Owner access is visible for clarity, but protected from
                    accidental changes.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr
                    className="border-b text-xs uppercase tracking-[0.14em] platform-muted"
                    style={{ borderColor: "var(--platform-border)" }}
                  >
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Last login</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4">Controls</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => {
                    const isProtectedOwner = user.role === "PLATFORM_OWNER";
                    const isSelf = user.id === currentUser?.id;
                    const isBusy = busyUserId === user.id;
                    const canControl = isOwner && !isProtectedOwner && !isSelf;
                    const editableRole = canEditRole(user.role)
                      ? user.role
                      : "PLATFORM_SUPPORT";

                    return (
                      <tr
                        key={user.id}
                        className="border-b align-top"
                        style={{ borderColor: "var(--platform-border)" }}
                      >
                        <td className="px-5 py-4">
                          <p className="font-black">{user.name}</p>
                          <p className="mt-1 text-sm platform-muted">
                            {user.email}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {canControl ? (
                            <div className="w-[230px]">
                              <PlatformSelect
                                value={editableRole}
                                options={PLATFORM_ROLE_OPTIONS}
                                disabled={isBusy}
                                onChange={(role) => handleRoleChange(user, role)}
                                buttonClassName="h-10"
                              />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span
                                className={cx(
                                  "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                                  getRoleBadgeClass(user.role)
                                )}
                              >
                                {getRoleLabel(user.role)}
                              </span>

                              <p className="max-w-[220px] text-xs font-semibold platform-muted">
                                {getRoleDescription(user.role)}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={cx(
                              "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                              getStatusBadgeClass(user.isActive)
                            )}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 platform-muted">
                          {formatDate(user.lastLoginAt)}
                        </td>

                        <td className="px-5 py-4 platform-muted">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          {canControl ? (
                            <div className="grid max-w-[360px] gap-3">
                              <AsyncButton
                                type="button"
                                variant="secondary"
                                isLoading={isBusy}
                                onClick={() => handleStatusToggle(user)}
                              >
                                {user.isActive ? "Deactivate" : "Activate"}
                              </AsyncButton>

                              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                <input
                                  type="password"
                                  value={passwordInputs[user.id] || ""}
                                  onChange={(event) =>
                                    setPasswordInputs((current) => ({
                                      ...current,
                                      [user.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="New temporary password"
                                  className="h-11 rounded-2xl border bg-transparent px-3 text-sm font-semibold outline-none transition focus:border-[var(--platform-primary)]"
                                  style={{
                                    borderColor: "var(--platform-border)",
                                  }}
                                />

                                <AsyncButton
                                  type="button"
                                  variant="secondary"
                                  isLoading={isBusy}
                                  onClick={() => handlePasswordReset(user)}
                                >
                                  <KeyRound className="h-4 w-4" />
                                  Reset
                                </AsyncButton>
                              </div>
                            </div>
                          ) : (
                            <p className="max-w-[240px] text-xs font-semibold platform-muted">
                              {isSelf
                                ? "This is your account."
                                : isProtectedOwner
                                  ? "Owner access is protected."
                                  : "View only."}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!users.length ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm font-semibold platform-muted"
                      >
                        No platform users found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </ProtectedPlatformLayout>
  );
}
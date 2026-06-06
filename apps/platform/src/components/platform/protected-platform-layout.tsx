"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { AccessDenied } from "@/components/platform/access-denied";
import { DashboardSkeleton } from "@/components/platform/dashboard-skeleton";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  canPlatformUser,
  normalizePlatformRole,
  type PlatformPermission,
  type PlatformRole,
  type PlatformUserLike,
} from "@/lib/platform-access";
import { getStoredPlatformSession } from "@/lib/platform-auth";

type ProtectedPlatformLayoutProps = {
  children: React.ReactNode;
  permission?: PlatformPermission;
  allowedRoles?: PlatformRole[];
};

type StoredPlatformSession = {
  token?: string | null;
  accessToken?: string | null;
  platformUser?: PlatformUserLike | null;
  user?: PlatformUserLike | null;
};

const PLATFORM_AUTH_EVENT = "storvex.platform.auth.changed";

function subscribeToPlatformSession(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("storage", callback);
  window.addEventListener(PLATFORM_AUTH_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(PLATFORM_AUTH_EVENT, callback);
  };
}

function getPlatformSessionSnapshot() {
  if (typeof window === "undefined") return "";

  try {
    return JSON.stringify(getStoredPlatformSession() || null);
  } catch {
    return "null";
  }
}

function getServerPlatformSessionSnapshot() {
  return "";
}

function parsePlatformSessionSnapshot(value: string): StoredPlatformSession | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as StoredPlatformSession | null;
    return parsed;
  } catch {
    return null;
  }
}

function getSessionToken(session: StoredPlatformSession | null) {
  return session?.token || session?.accessToken || null;
}

function getSessionUser(session: StoredPlatformSession | null) {
  const user = session?.platformUser || session?.user || null;

  if (!user) return null;

  const role = normalizePlatformRole(user.role);

  if (!role) return null;

  return {
    ...user,
    role,
  };
}

function userHasAllowedRole(
  user: PlatformUserLike | null,
  allowedRoles: PlatformRole[]
) {
  const role = normalizePlatformRole(user?.role);

  if (!role) return false;

  return allowedRoles.includes(role);
}

export function ProtectedPlatformLayout({
  children,
  permission = "viewDashboard",
  allowedRoles,
}: ProtectedPlatformLayoutProps) {
  const router = useRouter();

  const sessionSnapshot = useSyncExternalStore(
    subscribeToPlatformSession,
    getPlatformSessionSnapshot,
    getServerPlatformSessionSnapshot
  );

  const session = useMemo(
    () => parsePlatformSessionSnapshot(sessionSnapshot),
    [sessionSnapshot]
  );

  const token = getSessionToken(session);
  const user = getSessionUser(session);

  const hasAccess = allowedRoles?.length
    ? userHasAllowedRole(user, allowedRoles)
    : canPlatformUser(user, permission);

  useEffect(() => {
    if (sessionSnapshot === "") return;

    if (!token || !user) {
      router.replace("/login");
    }
  }, [router, sessionSnapshot, token, user]);

  if (sessionSnapshot === "") {
    return <DashboardSkeleton />;
  }

  if (!token || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <PlatformShell user={user}>
      {hasAccess ? (
        children
      ) : (
        <AccessDenied message="This page is not available for your current platform role." />
      )}
    </PlatformShell>
  );
}
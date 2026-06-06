// frontend-platform/src/components/platform/platform-shell.tsx

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ThemeToggle } from "@/components/platform/theme-toggle";
import {
  getPlatformRoleLabel,
  getVisiblePlatformNavItems,
  type PlatformNavKey,
  type PlatformUserLike,
} from "@/lib/platform-access";
import { clearPlatformSession } from "@/lib/platform-auth";

type PlatformShellProps = {
  user: PlatformUserLike;
  children: React.ReactNode;
};

const PLATFORM_AUTH_EVENT = "storvex.platform.auth.changed";

const NAV_ICONS: Record<
  PlatformNavKey,
  React.ComponentType<{ className?: string }>
> = {
  dashboard: LayoutDashboard,
  tenants: Building2,
  support: Headphones,
  activity: Activity,
  billing: CreditCard,
  users: Users,
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

function PlatformBrand({ expanded }: { expanded: boolean }) {
  return (
    <div
      className={cx(
        "flex min-w-0 items-center",
        expanded ? "gap-3" : "justify-center"
      )}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--platform-border)",
          background: "var(--platform-surface-soft)",
        }}
      >
        <Image
          src="/storvex_icon.webp"
          alt="Storvex"
          width={30}
          height={30}
          priority
          className="h-7 w-7 object-contain"
        />
      </div>

      {expanded ? (
        <div className="min-w-0">
          

          <p className="mt-1 truncate text-xs font-bold platform-muted">
            Internal control room
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function PlatformShell({ user, children }: PlatformShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const navItems = useMemo(() => getVisiblePlatformNavItems(user), [user]);
  const roleLabel = getPlatformRoleLabel(user);

  const desktopSidebarWidth = isSidebarExpanded ? "lg:w-72" : "lg:w-20";
  const desktopContentPadding = isSidebarExpanded ? "lg:pl-72" : "lg:pl-20";

  function handleLogout() {
    clearPlatformSession();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PLATFORM_AUTH_EVENT));
    }

    router.replace("/login");
  }

  function renderSidebar({ mobile = false }: { mobile?: boolean }) {
    const expanded = mobile || isSidebarExpanded;

    return (
      <aside
        className="flex h-full w-full flex-col border-r"
        style={{
          borderColor: "var(--platform-border)",
          background: "var(--platform-surface)",
        }}
      >
        <div
          className={cx(
            "flex min-h-20 items-center border-b px-4",
            expanded ? "justify-between gap-3" : "justify-center"
          )}
          style={{
            borderColor: "var(--platform-border)",
          }}
        >
          <PlatformBrand expanded={expanded} />

          {!mobile ? (
            <button
              type="button"
              onClick={() => setIsSidebarExpanded((current) => !current)}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition hover:opacity-80 lg:inline-flex"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
                color: "var(--platform-text)",
              }}
              aria-label={expanded ? "Show icons only" : "Show full sidebar"}
              title={expanded ? "Show icons only" : "Show full sidebar"}
            >
              {expanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item.key];
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={expanded ? undefined : item.label}
                className={cx(
                  "group flex rounded-2xl transition",
                  expanded
                    ? "items-start gap-3 px-3 py-3"
                    : "h-12 items-center justify-center",
                  active ? "text-white" : "hover:opacity-80"
                )}
                style={{
                  background: active ? "var(--platform-primary)" : "transparent",
                  color: active ? "#ffffff" : "var(--platform-text)",
                }}
              >
                <Icon className="h-5 w-5 shrink-0" />

                {expanded ? (
                  <span className="min-w-0">
                    <span className="block text-sm font-black">
                      {item.label}
                    </span>
                    <span
                      className={cx(
                        "mt-0.5 block text-xs font-semibold leading-4",
                        active ? "text-white/80" : "platform-muted"
                      )}
                    >
                      {item.description}
                    </span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div
          className="border-t p-3"
          style={{
            borderColor: "var(--platform-border)",
          }}
        >
          {expanded ? (
            <div
              className="mb-3 rounded-2xl border p-3"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface-soft)",
              }}
            >
              <p className="truncate text-sm font-black">
                {user.name || "Platform user"}
              </p>
              <p className="mt-1 truncate text-xs font-semibold platform-muted">
                {roleLabel}
              </p>
              <p className="mt-1 truncate text-xs font-semibold platform-muted">
                {user.email || "No email"}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className={cx(
              "flex min-h-11 w-full items-center justify-center rounded-2xl border text-sm font-black transition hover:opacity-80",
              expanded ? "gap-2 px-4" : "px-0"
            )}
            style={{
              borderColor: "var(--platform-border)",
              background: "var(--platform-surface)",
              color: "var(--platform-text)",
            }}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            {expanded ? "Sign out" : null}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--platform-bg)",
        color: "var(--platform-text)",
      }}
    >
      <div
        className={cx(
          "hidden transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:block",
          desktopSidebarWidth
        )}
      >
        {renderSidebar({ mobile: false })}
      </div>

      <div
        className={cx(
          "min-h-screen transition-[padding] duration-200",
          desktopContentPadding
        )}
      >
        <header
          className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-6 lg:px-8"
          style={{
            borderColor: "var(--platform-border)",
            background:
              "color-mix(in srgb, var(--platform-bg) 90%, transparent)",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border lg:hidden"
              style={{
                borderColor: "var(--platform-border)",
                background: "var(--platform-surface)",
              }}
              aria-label="Open platform menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
                style={{
                  borderColor: "var(--platform-border)",
                  background: "var(--platform-surface-soft)",
                }}
              >
                <Image
                  src="/storvex_icon.webp"
                  alt="Storvex"
                  width={28}
                  height={28}
                  priority
                  className="h-7 w-7 object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  Storvex Platform
                </p>
                <p className="truncate text-xs font-semibold platform-muted">
                  {roleLabel}
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-black">Storvex Platform</p>
              <p className="mt-0.5 text-xs font-semibold platform-muted">
                Internal control room
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close platform menu backdrop"
          />

          <div className="absolute inset-y-0 left-0 w-[88vw] max-w-sm">
            {renderSidebar({ mobile: true })}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-sm"
            aria-label="Close platform menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
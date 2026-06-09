import { Link, useLocation } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function isOnboardingPath(pathname) {
  return ["/signup", "/verify-otp", "/owner-payment"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function PublicHeader() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const pathname = location.pathname || "/";
  const hash = location.hash || "";

  const links = [
    {
      label: "Features",
      href: "/#features",
      active: pathname === "/" && hash === "#features",
    },
    {
      label: "How it works",
      href: "/#how-it-works",
      active: pathname === "/" && hash === "#how-it-works",
    },
    {
      label: "Pricing",
      href: "/#pricing",
      active: pathname === "/" && hash === "#pricing",
    },
    {
      label: "Resources",
      href: "/#resources",
      hasChevron: true,
      active: pathname === "/" && hash === "#resources",
    },
  ];

  const loginActive = pathname === "/login";
  const getStartedActive = isOnboardingPath(pathname);

  return (
    <header className="fixed left-0 right-0 top-0 z-[90] border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-[22px]">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-6 sm:px-8 lg:px-12">
        <Link to="/" className="flex shrink-0 items-center" aria-label="Storvex home">
          <img
            src={isDark ? "/storvex_white.webp" : "/storvex_dark.webp"}
            alt="Storvex"
            className="h-[44px] w-auto object-contain sm:h-[48px]"
            draggable="false"
          />
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main navigation">
          {links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cx(
                "inline-flex items-center gap-1.5 text-[13px] font-black transition",
                item.active
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text)] hover:text-[var(--color-primary)]",
              )}
            >
              {item.label}
              {item.hasChevron ? (
                <span
                  className={cx(
                    "text-[11px] leading-none",
                    item.active
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)]",
                  )}
                >
                  ⌄
                </span>
              ) : null}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] p-1 text-[12px] font-black text-[var(--color-text)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            aria-label="Toggle theme"
          >
            <span
              className={cx(
                "flex h-7 w-7 items-center justify-center rounded-full transition",
                !isDark
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              ☀
            </span>

            <span
              className={cx(
                "flex h-7 w-7 items-center justify-center rounded-full transition",
                isDark
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              ◐
            </span>
          </button>

          <Link
            to="/login"
            aria-current={loginActive ? "page" : undefined}
            className={cx(
              "hidden h-11 items-center justify-center rounded-[14px] px-3 text-[13px] font-black transition md:inline-flex",
              loginActive
                ? "bg-[var(--color-surface-2)] text-[var(--color-primary)]"
                : "text-[var(--color-text)] hover:bg-[var(--color-surface-2)]",
            )}
          >
            Log in
          </Link>

          <Link
            to="/signup"
            aria-current={getStartedActive ? "page" : undefined}
            className={cx(
              "inline-flex h-11 items-center justify-center rounded-[14px] px-6 text-[13px] font-black shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5",
              getStartedActive
                ? "bg-[var(--color-primary-dark,var(--color-primary))] text-[var(--color-primary-contrast)] ring-2 ring-[var(--color-primary)]/20"
                : "bg-[var(--color-primary)] text-[var(--color-primary-contrast)]",
            )}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
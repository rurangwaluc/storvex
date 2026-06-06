import { Link, useLocation } from "react-router-dom";

import Button from "../ui/Button";
import LogoMark from "../ui/LogoMark";
import ThemeToggle from "../ui/ThemeToggle";

const NAV_ITEMS = [
  { label: "Features", href: "/#features" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Trust", href: "/#trust" },
];

function isAuthPath(pathname) {
  return [
    "/login",
    "/signup",
    "/verify-otp",
    "/owner-payment",
    "/confirm-signup",
  ].some((path) => pathname.startsWith(path));
}

export default function PublicHeader({ isDark, onToggleTheme }) {
  const location = useLocation();
  const compact = isAuthPath(location.pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/82 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group inline-flex min-w-0 rounded-[22px] outline-none transition focus:ring-4 focus:ring-[rgba(74,163,255,0.16)]"
          aria-label="Storvex Stores home"
        >
          <LogoMark compact={false} />
        </Link>

        {!compact ? (
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-2xl px-4 py-2 text-sm font-black text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />

          {!compact ? (
            <>
              <Button
                as={Link}
                to="/login"
                variant="ghost"
                className="hidden xs:inline-flex"
              >
                Sign in
              </Button>

              <Button as={Link} to="/signup" className="hidden sm:inline-flex">
                Get started
              </Button>

              <Button as={Link} to="/signup" size="sm" className="sm:hidden">
                Start
              </Button>
            </>
          ) : (
            <>
              <Button as={Link} to="/login" className="hidden sm:inline-flex">
                Log in
              </Button>

              <Button as={Link} to="/login" size="sm" className="sm:hidden">
                Log in
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
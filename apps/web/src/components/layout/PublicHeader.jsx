import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";
import "../../legacy-pages/public/LandingPage.css";

const logoSrc = "/storvex_dark.webp";
const whiteLogoSrc = "/storvex_white.webp";

const navItems = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/#resources", hasCaret: true },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function PublicNavLink({
  href,
  className,
  children,
  onClick,
}) {
  if (href?.startsWith("/#")) {
    return (
      <a
        href={href}
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      to={href || "/signup"}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export default function PublicHeader() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef(null);

  const pathname = location.pathname || "/";
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!headerRef.current) return;
      if (headerRef.current.contains(event.target)) return;

      setIsMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, {
      passive: true,
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 760) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header
      ref={headerRef}
      className={cx(
        "svx-header",
        isMenuOpen && "is-menu-open",
      )}
    >
      <div className="svx-header-inner">
        <Link
          to="/"
          aria-label="Storvex home"
          className="svx-logo-link"
          onClick={closeMenu}
        >
          <img
            src={isDark ? whiteLogoSrc : logoSrc}
            alt="Storvex"
            className="svx-header-logo"
            draggable="false"
          />
        </Link>

        <nav className="svx-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <PublicNavLink
              key={item.label}
              href={item.href}
            >
              {item.label}

              {item.hasCaret ? (
                <ChevronDown
                  size={13}
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              ) : null}
            </PublicNavLink>
          ))}
        </nav>

        <div className="svx-header-actions">
          <button
            type="button"
            className="svx-theme-toggle"
            onClick={toggleTheme}
            aria-label={
              isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
            aria-pressed={isDark}
          >
            <span
              className={cx(
                "svx-theme-option",
                !isDark && "active",
              )}
              aria-hidden="true"
            >
              <Sun size={15} strokeWidth={2.4} />
            </span>

            <span
              className={cx(
                "svx-theme-option",
                isDark && "active",
              )}
              aria-hidden="true"
            >
              <Moon size={15} strokeWidth={2.4} />
            </span>
          </button>

          {!isLoginPage ? (
            <Link
              to="/login"
              className="svx-login-link"
              onClick={closeMenu}
            >
              Log in
            </Link>
          ) : null}

          <Link
            to="/signup"
            className="svx-header-cta"
            onClick={closeMenu}
          >
            {isLoginPage ? "Create account" : "Get started"}
          </Link>

          <button
            type="button"
            className="svx-mobile-menu-button"
            onClick={() =>
              setIsMenuOpen((current) => !current)
            }
            aria-label={
              isMenuOpen ? "Close menu" : "Open menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="storvex-mobile-menu"
          >
            {isMenuOpen ? (
              <X size={21} strokeWidth={2.4} />
            ) : (
              <Menu size={21} strokeWidth={2.4} />
            )}
          </button>
        </div>
      </div>

      <div
        id="storvex-mobile-menu"
        className="svx-mobile-menu"
        aria-hidden={!isMenuOpen}
      >
        <nav
          className="svx-mobile-menu-panel"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => (
            <PublicNavLink
              key={item.label}
              href={item.href}
              className="svx-mobile-menu-link"
              onClick={closeMenu}
            >
              <span>{item.label}</span>

              {item.hasCaret ? (
                <ChevronDown
                  size={16}
                  strokeWidth={2.4}
                  aria-hidden="true"
                />
              ) : null}
            </PublicNavLink>
          ))}

          <div className="svx-mobile-menu-actions">
            <Link
              to="/login"
              className="svx-mobile-menu-secondary"
              onClick={closeMenu}
            >
              Log in
            </Link>

            <Link
              to="/signup"
              className="svx-mobile-menu-primary"
              onClick={closeMenu}
            >
              Get started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

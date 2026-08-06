"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "../../constants/routes";
import { useTheme } from "../../hooks/useTheme";

import "./PublicHeader.css";

const DARK_LOGO = "/storvex_dark.webp";
const LIGHT_LOGO = "/storvex_white.webp";

const NAVIGATION = [
  {
    label: "Features",
    href: "/#features",
    anchor: true,
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Marketplace",
    href: "/marketplace",
  },
];

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function routeIsActive(pathname, href) {
  if (href === "/pricing") {
    return pathname === "/pricing";
  }

  if (href === "/marketplace") {
    return pathname.startsWith("/marketplace");
  }

  return false;
}

function NavigationLink({
  item,
  pathname,
  className,
  onClick,
}) {
  const active =
    !item.anchor &&
    routeIsActive(pathname, item.href);

  if (item.anchor) {
    return (
      <a
        href={item.href}
        className={className}
        onClick={onClick}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={cx(className, active && "is-active")}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {item.label}
    </Link>
  );
}

export default function PublicHeader() {
  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname() || "/";

  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);


  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [menuOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 860) {
        closeMenu();
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={cx(
        "sp-header",
        menuOpen && "is-open",
      )}
    >
      <div className="sp-header__inner">
        <Link
          href="/"
          className="sp-header__brand"
          aria-label="Storvex home"
          onClick={closeMenu}
        >
          <img
            src={isDark ? LIGHT_LOGO : DARK_LOGO}
            alt="Storvex"
            draggable="false"
          />
        </Link>

        <nav
          className="sp-header__nav"
          aria-label="Main navigation"
        >
          {NAVIGATION.map((item) => (
            <NavigationLink
              key={item.label}
              item={item}
              pathname={pathname}
              className="sp-header__nav-link"
            />
          ))}
        </nav>

        <div className="sp-header__actions">
          <button
            type="button"
            className="sp-header__theme"
            onClick={toggleTheme}
            aria-label={
              isDark
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {isDark ? (
              <Sun
                size={17}
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : (
              <Moon
                size={17}
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
          </button>

          <Link
            href={ROUTES.login}
            className="sp-header__login"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="sp-header__trial"
          >
            Start free trial
          </Link>

          <button
            type="button"
            className="sp-header__menu-button"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            aria-label={
              menuOpen ? "Close menu" : "Open menu"
            }
            aria-expanded={menuOpen}
            aria-controls="storvex-public-navigation"
          >
            {menuOpen ? (
              <X
                size={21}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            ) : (
              <Menu
                size={21}
                strokeWidth={2.2}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>

      <div
        id="storvex-public-navigation"
        className="sp-header__mobile"
        aria-hidden={!menuOpen}
      >
        <nav
          className="sp-header__mobile-panel"
          aria-label="Mobile navigation"
        >
          <div className="sp-header__mobile-links">
            {NAVIGATION.map((item) => (
              <NavigationLink
                key={item.label}
                item={item}
                pathname={pathname}
                className="sp-header__mobile-link"
                onClick={closeMenu}
              />
            ))}
          </div>

          <div className="sp-header__mobile-actions">
            <Link
              href={ROUTES.login}
              className="sp-header__mobile-login"
              onClick={closeMenu}
            >
              Log in
            </Link>

            <Link
              href="/signup"
              className="sp-header__mobile-trial"
              onClick={closeMenu}
            >
              Start free trial
            </Link>
          </div>

          <div className="sp-header__mobile-footer">
            <span>
              Store control for serious retailers.
            </span>

            <button
              type="button"
              onClick={toggleTheme}
            >
              {isDark ? (
                <Sun
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              ) : (
                <Moon
                  size={16}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              )}

              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

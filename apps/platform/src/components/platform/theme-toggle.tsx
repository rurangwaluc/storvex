"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

type PlatformTheme = "light" | "dark";

const THEME_KEY = "storvex.platform.theme";

function getInitialTheme(): PlatformTheme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_KEY);

  return stored === "dark" ? "dark" : "light";
}

function applyTheme(theme: PlatformTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<PlatformTheme>(() => getInitialTheme());

  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme: PlatformTheme = isDark ? "light" : "dark";

    window.localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition hover:opacity-80"
      style={{
        borderColor: "var(--platform-border)",
        background: "var(--platform-surface)",
        color: "var(--platform-text)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
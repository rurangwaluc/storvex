import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "storvex_theme_mode";

function getStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {}
  return "system";
}

function resolveTheme(mode) {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    typeof window === "undefined" ? "light" : resolveTheme(getStoredTheme())
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(nextMode) {
      const nextResolved = resolveTheme(nextMode);
      setResolvedTheme(nextResolved);

      const root = document.documentElement;
      if (nextResolved === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    }

    applyTheme(mode);

    function onSystemChange() {
      if (mode === "system") applyTheme("system");
    }

    media.addEventListener?.("change", onSystemChange);
    return () => media.removeEventListener?.("change", onSystemChange);
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      toggleTheme() {
        setMode((curr) => {
          const currentResolved = curr === "system" ? resolveTheme("system") : curr;
          return currentResolved === "dark" ? "light" : "dark";
        });
      },
    }),
    [mode, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
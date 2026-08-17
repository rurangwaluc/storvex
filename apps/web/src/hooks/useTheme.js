import { useEffect, useMemo, useRef, useState } from "react";
import { storage } from "../lib/storage";

const LIGHT = "light";
const DARK = "dark";

function getInitialTheme() {
  if (typeof window === "undefined") {
    return LIGHT;
  }

  const saved = storage.getTheme();

  if (saved === LIGHT || saved === DARK) {
    return saved;
  }

  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return DARK;
  }

  return LIGHT;
}

export function useTheme() {
  const [theme, setTheme] = useState(LIGHT);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) return;

    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    storage.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    initialized.current = true;
    setTheme(getInitialTheme());
  }, []);

  return useMemo(
    () => ({
      theme,
      isDark: theme === DARK,
      setTheme,
      toggleTheme() {
        setTheme((current) => (current === DARK ? LIGHT : DARK));
      },
    }),
    [theme],
  );
}

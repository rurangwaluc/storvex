import { useEffect, useMemo, useState } from "react";
import { storage } from "../lib/storage";

const LIGHT = "light";
const DARK = "dark";

function getInitialTheme() {
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
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    storage.setTheme(theme);
  }, [theme]);

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
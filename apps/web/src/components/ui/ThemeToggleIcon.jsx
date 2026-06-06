import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";

export default function ThemeToggleIcon() {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="inline-flex h-10 w-[54px] items-center rounded-full bg-[rgb(var(--bg-muted))] px-[3px] transition"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-full bg-[#3C91E6] text-white shadow-sm transition-transform duration-200",
          isDark ? "translate-x-[14px]" : "translate-x-0",
        ].join(" ")}
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
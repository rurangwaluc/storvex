import PublicHeader from "./PublicHeader";
import { useTheme } from "../../hooks/useTheme";

export default function PublicLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <PublicHeader isDark={isDark} onToggleTheme={toggleTheme} />
      <main className="bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </main>
    </div>
  );
}
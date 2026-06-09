import PublicHeader from "./PublicHeader";

export default function PublicLayout({ children, showHeader = true }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {showHeader ? <PublicHeader /> : null}

      <main
        className={`bg-[var(--color-bg)] text-[var(--color-text)] ${
          showHeader ? "pt-[76px]" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
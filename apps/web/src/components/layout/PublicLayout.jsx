import PublicHeader from "./PublicHeader";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="storvex-landing svx-public-header-scope">
        <PublicHeader />
      </div>

      <main className="bg-[var(--color-bg)] pt-[76px] text-[var(--color-text)]">
        {children}
      </main>
    </div>
  );
}

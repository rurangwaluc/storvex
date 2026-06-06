function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export default function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle theme"
      className="inline-flex h-10 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-surface-2)]"
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          !isDark
            ? "bg-[var(--color-primary)] text-white"
            : "text-[var(--color-text-muted)]"
        }`}
      >
        <SunIcon />
      </span>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
          isDark
            ? "bg-[var(--color-primary)] text-white"
            : "text-[var(--color-text-muted)]"
        }`}
      >
        <MoonIcon />
      </span>
    </button>
  );
}
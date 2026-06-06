import { useId, useState } from "react";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7A3 3 0 0 0 13.3 13.4" />
      <path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a16.5 16.5 0 0 1-4 4.8" />
      <path d="M6.1 6.1A16.9 16.9 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-.8" />
    </svg>
  );
}

export default function PasswordField({
  id,
  label = "Password",
  helperText = "",
  error = "",
  value,
  onChange,
  placeholder = "Enter password",
  autoComplete = "current-password",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className="app-input pr-12"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {error ? (
        <div className="mt-1 text-xs text-[var(--color-danger)]">{error}</div>
      ) : helperText ? (
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">{helperText}</div>
      ) : null}
    </div>
  );
}
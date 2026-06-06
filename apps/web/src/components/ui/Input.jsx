import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

export default function Input({
  label,
  hint,
  error,
  className,
  inputClassName,
  type = "text",
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const resolvedType = isPassword
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <label className={cn("grid gap-2", className)}>
      {label ? (
        <span className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </span>
      ) : null}

      <div className="relative">
        <input
          type={resolvedType}
          className={cn(
            "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 pr-12 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary-ring)]",
            inputClassName
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <span className="text-sm text-[var(--color-danger)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
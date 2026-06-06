import { cn } from "../../lib/cn";

const variants = {
  primary:
    "border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)] hover:opacity-95 focus-visible:ring-[var(--color-primary-ring)]",

  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-surface-3)] focus-visible:ring-[var(--color-primary-ring)]",

  ghost:
    "border border-transparent bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-2)] focus-visible:ring-[var(--color-primary-ring)]",

  outline:
    "border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] shadow-[var(--shadow-soft)] hover:bg-[var(--color-surface-2)] focus-visible:ring-[var(--color-primary-ring)]",

  danger:
    "border border-[var(--color-danger)] bg-[var(--color-danger)] text-white shadow-[var(--shadow-soft)] hover:opacity-95 focus-visible:ring-[rgba(219,80,74,0.24)]",
};

const sizes = {
  sm: "h-10 px-4 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
  icon: "h-10 w-10 p-0 text-sm",
};

export default function Button({
  as: Comp = "button",
  type = "button",
  className,
  variant = "primary",
  size = "md",
  disabled,
  children,
  ...props
}) {
  const isNativeButton = Comp === "button";

  return (
    <Comp
      {...props}
      {...(isNativeButton ? { type, disabled } : {})}
      aria-disabled={disabled ? "true" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl font-black transition outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
    >
      {children}
    </Comp>
  );
}
"use client";

import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type AsyncButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function AsyncButton({
  children,
  className,
  disabled,
  isLoading = false,
  variant = "primary",
  ...props
}: AsyncButtonProps) {
  const variantClass =
    variant === "secondary"
      ? "border bg-transparent hover:opacity-80"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-[var(--platform-primary)] text-white hover:bg-[var(--platform-primary-dark)]";

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
        className
      )}
      style={
        variant === "secondary"
          ? {
              borderColor: "var(--platform-border)",
              color: "var(--platform-text)",
            }
          : undefined
      }
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
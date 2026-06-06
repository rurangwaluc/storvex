import Button from "./Button";
import { cn } from "../../lib/cn";

export default function AsyncButton({
  loading = false,
  loadingText = "Please wait...",
  children,
  disabled,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Button
      {...props}
      type={type}
      variant={variant}
      size={size}
      disabled={isDisabled}
      aria-busy={loading ? "true" : "false"}
      aria-disabled={isDisabled ? "true" : undefined}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden transition duration-200",
        isDisabled ? "cursor-not-allowed opacity-70" : "",
        className
      )}
    >
      <span className="inline-flex min-w-0 items-center justify-center gap-2 text-current transition-opacity duration-150">
        {loading ? (
          <>
            <span
              aria-hidden="true"
              className="inline-flex h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
            <span className="truncate">{loadingText}</span>
          </>
        ) : (
          children
        )}
      </span>
    </Button>
  );
}
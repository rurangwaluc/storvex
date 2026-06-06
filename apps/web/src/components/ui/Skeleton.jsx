import { cn } from "../../lib/cn";

export default function Skeleton({ className }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[var(--color-surface-3)]",
        className,
      )}
    />
  );
}
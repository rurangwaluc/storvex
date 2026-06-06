import { cn } from "../../lib/cn";

function Skel({ className }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[var(--color-surface-3)]",
        className,
      )}
    />
  );
}

export default function PageSectionSkeleton({
  showStats = true,
  showSidebarSpacing = true,
}) {
  return (
    <div className={cn("space-y-6", showSidebarSpacing && "w-full")}>
      <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <Skel className="h-5 w-28" />
        <Skel className="mt-3 h-10 w-72 max-w-full" />
        <Skel className="mt-3 h-4 w-[32rem] max-w-full" />
      </div>

      {showStats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Skel className="h-32 w-full" />
          <Skel className="h-32 w-full" />
          <Skel className="h-32 w-full" />
          <Skel className="h-32 w-full" />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Skel className="h-80 w-full" />
        <Skel className="h-80 w-full" />
      </div>
    </div>
  );
}
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{
        background:
          "color-mix(in srgb, var(--platform-muted) 18%, transparent)",
      }}
    />
  );
}

export function DashboardSkeleton({
  insideShell = false,
}: {
  insideShell?: boolean;
}) {
  const content = (
    <div className="space-y-6">
      <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-4 h-9 w-full max-w-xl" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-3xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="platform-card rounded-[1.5rem] p-5 shadow-sm"
          >
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
            <SkeletonBlock className="mt-3 h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <SkeletonBlock className="h-11 w-11" />
          <SkeletonBlock className="mt-5 h-5 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>

        <div className="platform-card rounded-[1.7rem] p-5 shadow-sm">
          <SkeletonBlock className="h-11 w-11" />
          <SkeletonBlock className="mt-5 h-5 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (insideShell) return content;

  return (
    <main
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{
        background: "var(--platform-bg)",
        color: "var(--platform-text)",
      }}
    >
      {content}
    </main>
  );
}
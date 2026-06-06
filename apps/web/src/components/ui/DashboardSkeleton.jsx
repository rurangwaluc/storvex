function Skel({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-[26px] bg-[var(--color-surface-2)] ${className}`}
    />
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skel className="h-14 w-72" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Skel className="h-[132px] w-full" />
        <Skel className="h-[132px] w-full" />
        <Skel className="h-[132px] w-full" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <Skel className="h-[280px] w-full" />
        <Skel className="h-[280px] w-full" />
      </div>

      <Skel className="h-[250px] w-full" />
      <Skel className="h-[150px] w-full" />
    </div>
  );
}
export default function CardSkeleton() {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--bg-elevated))]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-stone-200 dark:bg-[rgb(var(--bg-muted))]" />
          <div className="h-8 w-40 rounded bg-stone-200 dark:bg-[rgb(var(--bg-muted))]" />
          <div className="h-4 w-56 rounded bg-stone-100 dark:bg-[rgb(var(--bg-muted))]" />
        </div>
        <div className="h-10 w-1 rounded bg-stone-200 dark:bg-[rgb(var(--bg-muted))]" />
      </div>
    </div>
  );
}
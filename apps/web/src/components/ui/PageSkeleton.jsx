function skeletonBlock(className = "") {
  return `animate-pulse rounded-[22px] bg-[var(--color-surface-2)] ${className}`;
}

function bar(width = "w-full", height = "h-4") {
  return `${height} ${width} rounded-full bg-[var(--color-surface-2)] animate-pulse`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className={bar("w-60", "h-12")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6"
          >
            <div className="flex items-center gap-4 sm:gap-5">
              <div className={skeletonBlock("h-20 w-20 shrink-0 rounded-[22px] sm:h-24 sm:w-24")} />
              <div className="min-w-0 flex-1 space-y-3">
                <div className={bar("w-28", "h-4")} />
                <div className={bar("w-40", "h-9")} />
                <div className={bar("w-52", "h-4")} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-stretch">
          <div className="xl:w-[1.1fr] space-y-4">
            <div className={bar("w-28", "h-3")} />
            <div className={bar("w-72", "h-10")} />
            <div className={bar("w-full max-w-[420px]", "h-4")} />
            <div className={bar("w-full max-w-[360px]", "h-4")} />
            <div className={skeletonBlock("h-10 w-56 rounded-full")} />
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-[22px] bg-[var(--color-surface-2)] p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className={bar("w-24", "h-3")} />
                    <div className={bar("w-16", "h-8")} />
                  </div>
                  <div className={skeletonBlock("h-12 w-12 rounded-2xl")} />
                </div>
                <div className="mt-4 space-y-2">
                  <div className={bar("w-full", "h-4")} />
                  <div className={bar("w-4/5", "h-4")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className={bar("w-28", "h-3")} />
            <div className={bar("w-72", "h-10")} />
            <div className={bar("w-full max-w-[420px]", "h-4")} />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={skeletonBlock("h-11 w-[150px] rounded-2xl")} />
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="rounded-[20px] bg-[var(--color-surface-2)] p-4 sm:p-5">
            <div className={bar("w-28", "h-3")} />
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className={skeletonBlock("h-12 lg:col-span-5")} />
              <div className={skeletonBlock("h-12 lg:col-span-2")} />
              <div className={skeletonBlock("h-12 lg:col-span-2")} />
              <div className={skeletonBlock("h-12 lg:col-span-3")} />
              <div className={skeletonBlock("h-12 lg:col-span-4")} />
              <div className={skeletonBlock("h-12 lg:col-span-4")} />
              <div className="lg:col-span-4 flex flex-wrap gap-2">
                <div className={skeletonBlock("h-11 w-28 rounded-2xl")} />
                <div className={skeletonBlock("h-11 w-28 rounded-2xl")} />
                <div className={skeletonBlock("h-11 w-28 rounded-2xl")} />
              </div>
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--color-surface-2)] p-4 sm:p-5">
            <div className={bar("w-32", "h-3")} />
            <div className="mt-4 space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-[18px] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className={bar("w-24", "h-3")} />
                  <div className={bar("mt-3 w-full", "h-4")} />
                  <div className={bar("mt-2 w-4/5", "h-4")} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="hidden xl:block">
          <div className="border-b border-[var(--color-border)] px-2 pb-4">
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_160px_190px_72px] gap-8">
              <div className={bar("w-16", "h-3")} />
              <div className={bar("w-16", "h-3")} />
              <div className={bar("ml-auto w-20", "h-3")} />
              <div className={bar("w-20", "h-3")} />
              <div className={bar("ml-auto w-10", "h-3")} />
            </div>
          </div>

          <div className="space-y-3 px-1 py-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-[22px] bg-[var(--color-surface-2)] px-6 py-5"
              >
                <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_160px_190px_72px] items-center gap-8">
                  <div className="flex items-center gap-4">
                    <div className={skeletonBlock("h-14 w-14 rounded-2xl")} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className={bar("w-44", "h-4")} />
                      <div className={bar("w-28", "h-3")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className={bar("w-36", "h-4")} />
                    <div className={bar("w-24", "h-3")} />
                  </div>

                  <div className={bar("ml-auto w-24", "h-5")} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={bar("w-10", "h-6")} />
                      <div className={skeletonBlock("h-6 w-16 rounded-full")} />
                    </div>
                    <div className={bar("w-20", "h-3")} />
                  </div>
                  <div className={skeletonBlock("ml-auto h-11 w-11 rounded-2xl")} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[28px] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={skeletonBlock("h-12 w-12 rounded-2xl")} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className={bar("w-40", "h-4")} />
                    <div className={bar("w-24", "h-3")} />
                  </div>
                </div>

                <div className={skeletonBlock("h-11 w-11 rounded-2xl")} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={skeletonBlock("h-24 w-full rounded-[20px]")} />
                <div className={skeletonBlock("h-24 w-full rounded-[20px]")} />
                <div className={skeletonBlock("h-24 w-full rounded-[20px]")} />
                <div className={skeletonBlock("h-24 w-full rounded-[20px]")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PageSkeleton({ variant = "page" }) {
  if (variant === "dashboard") return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      <div className={bar("w-48", "h-8")} />

      <div className="rounded-[28px] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="space-y-3">
          <div className={bar("w-32", "h-4")} />
          <div className={bar("w-full", "h-4")} />
          <div className={bar("w-5/6", "h-4")} />
        </div>
      </div>
    </div>
  );
}
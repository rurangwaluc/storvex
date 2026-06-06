import PublicLayout from "../layout/PublicLayout";
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

export default function AuthPageSkeleton({
  titleWidth = "w-56",
  lines = 4,
  showSide = true,
}) {
  return (
    <PublicLayout>
      <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {showSide ? (
          <div className="hidden lg:block">
            <div className="max-w-xl space-y-4">
              <Skel className="h-4 w-28 rounded-full" />
              <Skel className={cn("h-12", titleWidth)} />
              <Skel className="h-4 w-full max-w-lg" />
              <Skel className="h-4 w-full max-w-md" />

              <div className="mt-8 grid gap-4">
                <Skel className="h-24 w-full" />
                <Skel className="h-24 w-full" />
                <Skel className="h-24 w-full" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] xl:p-8">
            <div className="space-y-3">
              <Skel className="h-4 w-24 rounded-full" />
              <Skel className={cn("h-10", titleWidth)} />
              <Skel className="h-4 w-full" />
              <Skel className="h-4 w-3/4" />
            </div>

            <div className="mt-8 space-y-4">
              {Array.from({ length: lines }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skel className="h-4 w-24" />
                  <Skel className="h-12 w-full" />
                </div>
              ))}

              <Skel className="mt-2 h-12 w-full" />
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
import PublicLayout from "../layout/PublicLayout";
import { cn } from "../../lib/cn";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  sideTitle,
  sideBody,
  sideItems = [],
  footer,
  children,
  compact = false,
  singleColumn = false,
  contentWidth = "max-w-xl",
}) {
  const hasSide =
    !singleColumn && (Boolean(sideTitle) || Boolean(sideBody) || (sideItems?.length || 0) > 0);

  return (
    <PublicLayout>
      <section
        className={cn(
          "mx-auto min-h-[calc(100vh-73px)] w-full px-4 py-8 sm:px-6 lg:px-8",
          hasSide
            ? compact
              ? "grid max-w-7xl items-center gap-8 lg:grid-cols-[1fr_1fr]"
              : "grid max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]"
            : "flex items-start justify-center",
        )}
      >
        {hasSide ? (
          <div className="hidden lg:block">
            <div className="max-w-xl">
              {eyebrow ? (
                <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                  {eyebrow}
                </div>
              ) : null}

              <h1 className="mt-6 text-5xl font-black tracking-tight text-[var(--color-text)]">
                {sideTitle || title}
              </h1>

              {sideBody ? (
                <p className="mt-5 text-base leading-8 text-[var(--color-text-muted)]">
                  {sideBody}
                </p>
              ) : subtitle ? (
                <p className="mt-5 text-base leading-8 text-[var(--color-text-muted)]">
                  {subtitle}
                </p>
              ) : null}

              {sideItems?.length ? (
                <div className="mt-8 grid gap-4">
                  {sideItems.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                          <CheckIcon />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--color-text)]">
                            {item.title}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                            {item.body}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={cn("mx-auto w-full", contentWidth)}>
          <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-6 xl:p-8">
            {eyebrow ? (
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                {eyebrow}
              </div>
            ) : null}

            <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
              {title}
            </h2>

            {subtitle ? (
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
                {subtitle}
              </p>
            ) : null}

            <div className="mt-5">{children}</div>

            {footer ? <div className="mt-5">{footer}</div> : null}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
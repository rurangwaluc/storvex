export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)] backdrop-blur xl:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)] md:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div>{children}</div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </section>
  );
}
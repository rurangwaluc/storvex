import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type AccessDeniedProps = {
  title?: string;
  message?: string;
};

export function AccessDenied({
  title = "Access denied",
  message = "Your platform role does not allow you to open this area.",
}: AccessDeniedProps) {
  return (
    <div className="platform-card rounded-[1.7rem] p-6 shadow-sm">
      <div className="flex max-w-2xl flex-col gap-5 sm:flex-row sm:items-start">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: "rgba(194, 65, 12, 0.12)",
            color: "var(--platform-danger)",
          }}
        >
          <ShieldAlert className="h-6 w-6" />
        </div>

        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--platform-primary)]">
            Permission required
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight">{title}</h1>

          <p className="mt-2 max-w-xl text-sm leading-6 platform-muted">
            {message}
          </p>

          <Link
            href="/dashboard"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-black text-white transition hover:opacity-90"
            style={{
              background: "var(--platform-primary)",
            }}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
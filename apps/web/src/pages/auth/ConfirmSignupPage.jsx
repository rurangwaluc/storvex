import { Link } from "react-router-dom";
import ThemeToggle from "../../components/ui/ThemeToggleIcon";

export default function ConfirmSignupPage() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl justify-end">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-3xl items-center">
        <div className="w-full rounded-[36px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
            ✓
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
            Confirm signup
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Your account setup is almost done</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            This screen becomes the clean handoff between payment/onboarding and the stores application.
          </p>

          <div className="mt-8 space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-left dark:border-slate-800 dark:bg-slate-950">
            {[
              "Owner intent verified",
              "OTP verification complete",
              "Payment confirmed",
              "Ready to continue into the stores app",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/app"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Continue to stores app
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
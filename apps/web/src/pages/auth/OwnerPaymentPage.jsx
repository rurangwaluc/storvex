import ThemeToggle from "../../components/ui/ThemeToggleIcon";

export default function OwnerPaymentPage() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl justify-end">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-96px)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">
              Choose your plan
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Complete owner payment</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
              This page should feel serious, trustworthy, and clear because payment is where weak products lose confidence.
            </p>

            <div className="mt-8 space-y-4">
              {["30 days", "90 days", "180 days"].map((plan, index) => (
                <button
                  key={plan}
                  className={`w-full rounded-[24px] border p-5 text-left transition ${
                    index === 0
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
                      : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{plan}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Subscription placeholder until real plan data is wired.
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                      RWF —
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
            <h2 className="text-2xl font-semibold">Payment details</h2>
            <div className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Payment method
                </label>
                <select className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option>Choose payment method</option>
                  <option>MTN MoMo</option>
                  <option>Airtel Money</option>
                  <option>Card</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Phone or payer reference
                </label>
                <input className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>

              <button className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-700">
                Continue to payment confirmation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
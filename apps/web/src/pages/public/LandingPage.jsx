import { Link } from "react-router-dom";

import PublicLayout from "../../components/layout/PublicLayout";
import Button from "../../components/ui/Button";

const proofCards = [
  {
    value: "Rwf",
    title: "Built for local selling",
    text: "Cash, MoMo, Bank, Card, customer balances, receipts, and branch work stay clear.",
  },
  {
    value: "Branch",
    title: "Branch truth from day one",
    text: "Every sale, stock movement, payment, and document belongs to the right branch.",
  },
  {
    value: "Owner",
    title: "Control without confusion",
    text: "Owners understand the business clearly while staff only access what they need.",
  },
];

const modules = [
  {
    title: "Sales that leave evidence",
    text: "Every sale records who sold, which branch sold, what was paid, and how the customer paid.",
    stat: "POS",
  },
  {
    title: "Inventory you can trust",
    text: "Stock belongs to a branch. Adjustments are visible. Owners do not lose stock silently.",
    stat: "Stock",
  },
  {
    title: "Cash drawer discipline",
    text: "Open the drawer, count cash, record money in or out, and close with a clear difference.",
    stat: "Cash",
  },
  {
    title: "Pay-later follow-up",
    text: "Track customers who still owe money, overdue balances, and payment history without spreadsheets.",
    stat: "Debt",
  },
  {
    title: "Documents that look serious",
    text: "Receipts, warranties, invoices, and branch identity stay clean and customer-ready.",
    stat: "Docs",
  },
  {
    title: "Owner-grade visibility",
    text: "Owners see branches, staff actions, payments, inventory, and customer risk in one workspace.",
    stat: "Owner",
  },
];

const onboardingSteps = [
  {
    label: "Create owner account",
    text: "Add store name, owner contact, category, and location.",
  },
  {
    label: "Verify email and phone",
    text: "Confirm the person creating the store before access is activated.",
  },
  {
    label: "Choose activation",
    text: "Start with trial or activate a paid plan when the business is ready.",
  },
  {
    label: "Create password",
    text: "Storvex creates the store, owner, subscription, and first branch.",
  },
  {
    label: "Open workspace",
    text: "Continue with active branch, store profile, POS, inventory, and documents ready.",
  },
];

const trustPoints = [
  "Rwf-first wording",
  "MoMo, Cash, Bank, Card",
  "Branch-aware POS",
  "Cash drawer control",
  "Pay-later balances",
  "Warranty records",
  "Owner/staff separation",
  "Dark and light mode",
];

const activityItems = [
  {
    title: "Sale completed",
    text: "A cashier records items sold, payment method, and branch.",
    tag: "Paid",
  },
  {
    title: "Stock updated",
    text: "A product movement changes branch stock with a visible record.",
    tag: "Stock",
  },
  {
    title: "Customer document ready",
    text: "Receipt or warranty can be prepared from the sale record.",
    tag: "Docs",
  },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function SectionEyebrow({ children }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-primary)]">
      {children}
    </p>
  );
}

function SurfaceCard({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[34px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ProofCard({ value, title, text }) {
  return (
    <SurfaceCard className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] px-4 text-sm font-black text-[var(--color-primary)]">
          {value}
        </div>

        <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
      </div>

      <h3 className="mt-5 text-base font-black tracking-[-0.02em] text-[var(--color-text)]">
        {title}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </SurfaceCard>
  );
}

function ModuleCard({ title, text, stat }) {
  return (
    <SurfaceCard className="group overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)]">
          {stat}
        </div>

        <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          Store control
        </span>
      </div>

      <h3 className="mt-5 text-lg font-black tracking-[-0.03em] text-[var(--color-text)]">
        {title}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </SurfaceCard>
  );
}

function JourneyStep({ step, item }) {
  return (
    <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-xs font-black text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]">
          {step}
        </div>

        <div>
          <h3 className="text-sm font-black text-[var(--color-text)]">
            {item.label}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {item.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function StoreControlPreview() {
  return (
    <SurfaceCard className="p-4 sm:p-5 lg:p-6">
      <div className="rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Store command view
            </div>
            <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">
              Your store workspace
            </div>
            <div className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">
              Main branch • Sales • Stock • Cash • Documents
            </div>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--color-text)]">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
            Active branch
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Today sales", "Rwf 1,250,000", "Sales recorded"],
            ["Cash expected", "Rwf 780,000", "Drawer tracked"],
            ["Pay later", "Rwf 320,000", "Follow-up needed"],
          ].map(([label, value, note]) => (
            <div
              key={label}
              className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {label}
              </div>
              <div className="mt-3 text-lg font-black tracking-[-0.03em] text-[var(--color-text)]">
                {value}
              </div>
              <div className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
                {note}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-[var(--color-text)]">
                  Drawer truth
                </div>
                <div className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
                  Physical cash accountability
                </div>
              </div>

              <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--color-text)]">
                Open
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Opening cash", "Rwf 50,000"],
                ["Cash sales", "Rwf 730,000"],
                ["Money out", "Rwf 0"],
                ["Expected close", "Rwf 780,000"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[var(--color-text-muted)]">
                    {label}
                  </span>
                  <span className="font-black text-[var(--color-text)]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-[var(--color-text)]">
                  Owner evidence
                </div>
                <div className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">
                  Recent business activity
                </div>
              </div>

              <span className="text-xs font-black text-[var(--color-primary)]">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {activityItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-[var(--color-text)]">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
                        {item.text}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-[var(--color-card)] px-2.5 py-1 text-[10px] font-black text-[var(--color-primary)]">
                      {item.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[26px] bg-[var(--color-primary)] p-4 text-[var(--color-primary-contrast)] shadow-[var(--shadow-soft)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-black">Owner decision point</div>
              <div className="mt-1 text-xs font-semibold leading-5 opacity-75">
                Can the owner trust today’s sales, cash, and stock movement?
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black">
              Yes — every action has evidence
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default function LandingPage() {
  return (
    <PublicLayout>
      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
              Store control system for modern retail
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-[-0.075em] text-[var(--color-text)] sm:text-5xl lg:text-[68px] lg:leading-[0.92]">
              Stop guessing what happened in your store.
            </h1>

            <p className="mt-6 max-w-3xl text-base font-semibold leading-8 text-[var(--color-text-muted)] sm:text-lg">
              Storvex gives store owners one serious workspace for sales, inventory,
              cash drawer control, customer balances, receipts, warranties, staff access,
              and branch accountability.
            </p>

            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Button as={Link} to="/signup" size="lg">
                Get started
              </Button>

              <Button as={Link} to="/login" variant="secondary" size="lg">
                Sign in
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {["No silent stock changes", "No unclear cash drawer", "No missing branch truth"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-black text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-3 md:grid-cols-3">
            {proofCards.map((item) => (
              <ProofCard key={item.title} {...item} />
            ))}
          </div>

          <div className="mx-auto mt-8 max-w-6xl">
            <StoreControlPreview />
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Store operations</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              Built for the moments where stores lose money.
            </h2>
            <p className="mt-4 text-base font-semibold leading-8 text-[var(--color-text-muted)]">
              Storvex is not a decorative dashboard. It is built around the places
              where real stores leak money: unclear stock, weak cash control,
              unpaid customer balances, and staff actions without evidence.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((feature) => (
              <ModuleCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Owner onboarding</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
              The first owner experience must feel controlled.
            </h2>
            <p className="mt-4 text-base font-semibold leading-8 text-[var(--color-text-muted)]">
              Before the dashboard, the owner must understand the path: create the store,
              verify ownership, choose access, create a password, and enter a workspace
              where the first branch already exists.
            </p>

            <div className="mt-6">
              <Button as={Link} to="/signup" size="lg">
                Start owner setup
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {onboardingSteps.map((item, index) => (
              <JourneyStep
                key={item.label}
                step={String(index + 1).padStart(2, "0")}
                item={item}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <SurfaceCard className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Owner trust</SectionEyebrow>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-[var(--color-text)] sm:text-4xl lg:text-5xl">
                Clear for owners. Strict for staff. Useful every day.
              </h2>
              <p className="mt-4 text-base font-semibold leading-8 text-[var(--color-text-muted)]">
                The owner should not need technical words to understand the business.
                Storvex uses plain language around sales, stock, money, customers,
                branches, and staff access.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-4 text-sm font-black text-[var(--color-text)] shadow-[var(--shadow-soft)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-[40px] border border-[var(--color-border)] bg-[var(--color-primary)] p-6 text-[var(--color-primary-contrast)] shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] opacity-70">
                Ready to begin
              </p>
              <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.055em] sm:text-4xl lg:text-5xl">
                Create the owner account and open a branch-ready workspace.
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 opacity-75 sm:text-base">
                Start with store identity, verify the owner, activate access,
                and continue into a workspace built for real store control.
              </p>

              <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--color-primary-contrast)] px-6 text-sm font-black text-[var(--color-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
                >
                  Get started
                </Link>

                <Link
                  to="/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-black text-[var(--color-primary-contrast)] transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
import { Link } from "react-router-dom";

import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import { ROUTES } from "../constants/routes";

const proofCards = [
  {
    value: "5-step",
    label: "Guided setup",
    text: "Owner account, verification, plan, password, and workspace handoff.",
  },
  {
    value: "Rwf",
    label: "Rwanda-ready",
    text: "Built around local store operations, payments, receipts, and branch control.",
  },
  {
    value: "Branch",
    label: "Multi-branch foundation",
    text: "Your first branch is prepared from the beginning, not added as an afterthought.",
  },
];

const features = [
  {
    title: "Point of sale",
    text: "Sell quickly, choose payment method, print receipts, and keep every sale traceable.",
  },
  {
    title: "Inventory truth",
    text: "See stock clearly by branch, avoid silent changes, and keep product movement accountable.",
  },
  {
    title: "Customer balances",
    text: "Track pay-later sales, overdue balances, and customer payments without confusion.",
  },
  {
    title: "Cash drawer control",
    text: "Open, close, count, and explain drawer cash with clear daily evidence.",
  },
  {
    title: "Warranties and documents",
    text: "Create clean customer-facing warranty records, receipts, invoices, and support documents.",
  },
  {
    title: "Owner visibility",
    text: "Owners see the full business picture while staff only access what their role allows.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Create owner account",
    text: "Start with store name, owner details, category, and location.",
  },
  {
    step: "02",
    title: "Verify email and phone",
    text: "Confirm the owner before trial or payment activation.",
  },
  {
    step: "03",
    title: "Choose trial or paid plan",
    text: "Start with trial access or activate a paid plan directly.",
  },
  {
    step: "04",
    title: "Create password",
    text: "The system creates the business, owner account, subscription, and first branch.",
  },
  {
    step: "05",
    title: "Open workspace",
    text: "Continue into the store app with active branch and owner access ready.",
  },
];

const trustItems = [
  "Owner-first control",
  "Branch-aware POS",
  "Dark and light mode",
  "Mobile-ready screens",
  "Rwf currency",
  "Clean onboarding",
  "Receipt-ready branding",
  "Staff role separation",
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function SectionEyebrow({ children }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
      {children}
    </p>
  );
}

function SurfaceCard({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[30px] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MiniMetric({ value, label, text }) {
  return (
    <SurfaceCard className="p-5">
      <div className="text-2xl font-black tracking-[-0.04em] text-[var(--color-text)]">
        {value}
      </div>
      <div className="mt-2 text-sm font-black text-[var(--color-text)]">
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
        {text}
      </p>
    </SurfaceCard>
  );
}

function FeatureCard({ title, text }) {
  return (
    <SurfaceCard className="group p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-card)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-sm font-black text-[var(--color-primary)]">
        ✓
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

function WorkflowStep({ step, title, text }) {
  return (
    <div className="relative rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-sm font-black text-white shadow-[var(--shadow-soft)]">
          {step}
        </div>

        <div>
          <h3 className="text-base font-black tracking-[-0.02em] text-[var(--color-text)]">
            {title}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--color-text-muted)]">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <SurfaceCard className="relative overflow-hidden p-4 sm:p-5">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[rgba(74,163,255,0.16)] blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[rgba(16,185,129,0.10)] blur-3xl" />

      <div className="relative rounded-[28px] bg-[var(--color-surface-2)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Workspace preview
            </div>
            <div className="mt-2 text-xl font-black tracking-[-0.03em] text-[var(--color-text)]">
              Kigali Tech Store
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
              MAIN • Nyarugenge • Kigali
            </div>
          </div>

          <div className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-emerald-600">
            Active branch
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            ["Today sales", "Rwf 1,589,997"],
            ["Stock alerts", "4 items"],
            ["Pay later", "Rwf 340,000"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {label}
              </div>
              <div className="mt-3 text-lg font-black tracking-[-0.03em] text-[var(--color-text)]">
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-[var(--color-text)]">
                Cash drawer
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">
                Open
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                ["Starting cash", "Rwf 50,000"],
                ["Money in", "Rwf 1,589,997"],
                ["Expected cash", "Rwf 1,639,997"],
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

          <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-[var(--color-text)]">
                Recent activity
              </div>
              <span className="text-xs font-black text-[var(--color-primary)]">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                "Receipt created for Samsung Galaxy A14",
                "Stock adjusted at MAIN branch",
                "Warranty prepared for customer",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-3 text-sm font-semibold text-[var(--color-text-muted)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default function Landing() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-[-12rem] top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-[rgba(74,163,255,0.14)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-14rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[rgba(16,185,129,0.10)] blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20 xl:gap-14">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] shadow-[var(--shadow-soft)]">
              Store operating system for Rwanda
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-[-0.07em] text-[var(--color-text)] sm:text-5xl lg:text-6xl">
              Run sales, stock, cash, and customer trust from one clean store workspace.
            </h1>

            <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-[var(--color-text-muted)] sm:text-lg">
              Storvex Stores gives retail owners a serious operating system for daily control:
              point of sale, inventory truth, pay-later balances, cash drawer discipline,
              receipts, warranties, and branch-aware workflows.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to={ROUTES.register} size="lg">
                Get started
              </Button>

              <Button as={Link} to={ROUTES.login} variant="secondary" size="lg">
                Sign in
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {proofCards.map((item) => (
                <MiniMetric
                  key={item.label}
                  value={item.value}
                  label={item.label}
                  text={item.text}
                />
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section id="features" className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <SectionEyebrow>Features</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl">
              Built for real store control, not just pretty screens.
            </h2>
            <p className="mt-4 text-base font-medium leading-8 text-[var(--color-text-muted)]">
              Every page should help the owner understand what happened, who did it,
              which branch it affected, and what needs attention next.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <SectionEyebrow>Workflow</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl">
              A cleaner owner onboarding path.
            </h2>
            <p className="mt-4 text-base font-medium leading-8 text-[var(--color-text-muted)]">
              The first owner experience matters. Storvex starts with business identity,
              verification, activation, and then opens a branch-ready workspace.
            </p>

            <div className="mt-6">
              <Button as={Link} to={ROUTES.register} size="lg">
                Start setup
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {workflow.map((item) => (
              <WorkflowStep
                key={item.step}
                step={item.step}
                title={item.title}
                text={item.text}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <SurfaceCard className="relative overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(74,163,255,0.12)] blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <SectionEyebrow>Trust</SectionEyebrow>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[var(--color-text)] sm:text-4xl">
                  Designed to feel clear to owners and safe for staff.
                </h2>
                <p className="mt-4 text-base font-medium leading-8 text-[var(--color-text-muted)]">
                  The owner should not need technical words to understand the business.
                  The system should explain sales, stock, money, customers, and branch work
                  in plain language.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {trustItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-4 text-sm font-black text-[var(--color-text)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>
        </div>
      </section>

      <section className="px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[36px] bg-[var(--color-primary)] p-6 text-white shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
                  Ready to begin
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                  Create the owner account and open the first store workspace.
                </h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75 sm:text-base">
                  Start with store identity, verify the owner, activate the account,
                  and continue into a branch-ready workspace.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  to={ROUTES.register}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-[var(--color-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
                >
                  Get started
                </Link>

                <Link
                  to={ROUTES.login}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
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
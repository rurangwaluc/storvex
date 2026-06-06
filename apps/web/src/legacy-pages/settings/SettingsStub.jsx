import { useEffect } from "react";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function strongText() {
  return "text-[var(--color-text)]";
}

function mutedText() {
  return "text-[var(--color-text-muted)]";
}

function softText() {
  return "text-[var(--color-text-muted)]";
}

function pageCard() {
  return "rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]";
}

function softPanel() {
  return "rounded-[22px] bg-[var(--color-surface-2)]";
}

function sectionBadge(color = "blue") {
  const map = {
    blue: "bg-[#57b5ff] text-[#06263d]",
    orange: "bg-[#ff9f43] text-[#402100]",
    yellow: "bg-[#ffe45e] text-[#4a4300]",
    green: "bg-[#7cfcc6] text-[#0b3b2e]",
    neutral: "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
  };

  return cx("inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold", map[color]);
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return (
    <div>
      {eyebrow ? (
        <div className={cx("text-[11px] font-semibold uppercase tracking-[0.18em]", softText())}>
          {eyebrow}
        </div>
      ) : null}
      <h2 className={cx("mt-3 text-[1.6rem] font-black tracking-tight sm:text-[1.9rem]", strongText())}>
        {title}
      </h2>
      {subtitle ? <p className={cx("mt-3 text-sm leading-6", mutedText())}>{subtitle}</p> : null}
    </div>
  );
}

function titleItems(title) {
  if (title === "User roles") {
    return [
      "Role permissions for every staff category",
      "Access rules per page and feature",
      "Sensitive action restrictions and approvals",
    ];
  }

  if (title === "Billing plans") {
    return [
      "Current subscription plan and renewal state",
      "Invoices, receipts, and billing history",
      "Upgrade, downgrade, and usage controls",
    ];
  }

  if (title === "Login & security") {
    return [
      "Password and authentication rules",
      "Signed-in sessions and trusted devices",
      "Security activity and access review",
    ];
  }

  if (title === "Audit logs") {
    return [
      "Track important operational actions",
      "See who changed what and when",
      "Export logs for review and compliance",
    ];
  }

  return ["Configured features", "Access controls", "System history"];
}

export default function SettingsStub({ title = "Coming soon" }) {
  useEffect(() => {
    document.title = `${title} • Storvex`;
  }, [title]);

  const items = titleItems(title);

  return (
    <div className="space-y-6">
      <section className={cx(pageCard(), "overflow-hidden")}>
        <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <SectionHeading
            eyebrow="Settings"
            title={title}
            subtitle="This section is prepared and will be enabled next."
          />
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-5 sm:px-6">
          <span className={sectionBadge("orange")}>Coming soon</span>
          <span className={sectionBadge("neutral")}>Prepared screen</span>
        </div>
      </section>

      <section className={cx(pageCard(), "p-5 sm:p-6")}>
        <div className={cx(softPanel(), "p-4 sm:p-5")}>
          <div className={cx("text-sm font-semibold", strongText())}>What will live here</div>
          <ul className={cx("mt-3 space-y-2 text-sm leading-6", mutedText())}>
            {items.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
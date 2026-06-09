import { useEffect } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";
import "./LandingPage.css";

const problemCards = [
  {
    icon: PackageCheck,
    title: "Missed Opportunities",
    text: "Never lose sales to stockouts or blind spots.",
  },
  {
    icon: BarChart3,
    title: "Performance Blind Spots",
    text: "See what is selling and what’s not, instantly.",
  },
  {
    icon: UsersRound,
    title: "Employee Slip-ups",
    text: "Reduce mistakes and protect your profits.",
  },
  {
    icon: WalletCards,
    title: "Uncontrolled Costs",
    text: "Track every expense and stop profit leaks.",
  },
];

const platformCards = [
  {
    icon: ArrowUpRight,
    title: "Sales & Profit Tracking",
    text: "Track sales, profit, and margins in real time across all channels.",
  },
  {
    icon: CircleDollarSign,
    title: "Cash & Inventory Control",
    text: "Monitor cash activity, reconcile fast, and prevent losses.",
  },
  {
    icon: Boxes,
    title: "Inventory You Can Trust",
    text: "Low stock alerts and smarter ordering.",
  },
  {
    icon: UsersRound,
    title: "Team & Access Control",
    text: "Set roles, permissions, and keep your team accountable.",
  },
  {
    icon: FileText,
    title: "Documents & Records",
    text: "Store receipts, warranty records, invoices, and more in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Store Security",
    text: "Your data is protected and always visible to the owner.",
  },
  {
    icon: CheckCircle2,
    title: "99.9% Uptime",
    text: "Built for reliability you can count on.",
  },
  {
    icon: LockKeyhole,
    title: "SOC 2 Compliant",
    text: "Enterprise-grade security and privacy standards.",
  },
];

const mobilePoints = [
  "Live updates on sales and profit",
  "Approve refunds and overrides",
  "Monitor branches and team",
  "Get alerts that matter",
];

const footerGroups = [
  {
    title: "Product",
    links: ["Features", "How it works", "Pricing", "Updates"],
  },
  {
    title: "Solutions",
    links: ["Single Store", "Multi-Branch", "Inventory Control", "Cash Management"],
  },
  {
    title: "Resources",
    links: ["Help Center", "Guides", "Blog", "System Status"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Contact Us", "Partners"],
  },
];

function useLandingAnimations() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.querySelector(".storvex-landing");
    if (!root) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealItems = Array.from(
      root.querySelectorAll(
        [
          ".svx-section-heading",
          ".svx-feature-card",
          ".svx-mobile-ready-shell",
          ".svx-mobile-checklist > div",
          ".svx-app-badge",
          ".svx-footer-cta",
          ".svx-footer-grid",
        ].join(", ")
      )
    );

    revealItems.forEach((item, index) => {
      item.classList.add("svx-reveal");

      if (item.classList.contains("svx-feature-card")) {
        item.style.setProperty("--svx-reveal-delay", `${(index % 8) * 55}ms`);
      } else {
        item.style.setProperty("--svx-reveal-delay", `${Math.min(index * 35, 220)}ms`);
      }
    });

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function Header() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="svx-header">
      <div className="svx-header-inner">
        <Link to="/" aria-label="Storvex home" className="svx-logo-link">
          <img
            src={isDark ? "/storvex_white.webp" : "/storvex_dark.webp"}
            alt="Storvex"
            className="svx-header-logo"
          />
        </Link>

        <nav className="svx-nav" aria-label="Main navigation">
          {["Features", "How it works", "Pricing", "Resources"].map((item) => (
            <a
              key={item}
              href={
                item === "Features"
                  ? "#features"
                  : item === "How it works"
                    ? "#how-it-works"
                    : item === "Pricing"
                      ? "#pricing"
                      : "#resources"
              }
            >
              {item}
              {item === "Resources" ? <span>⌄</span> : null}
            </a>
          ))}
        </nav>

        <div className="svx-header-actions">
          <button
            type="button"
            onClick={toggleTheme}
            className="svx-theme-toggle"
            aria-label="Toggle theme"
          >
            <span className={!isDark ? "active" : ""}>☀</span>
            <span className={isDark ? "active" : ""}>◐</span>
          </button>

          <Link to="/login" className="svx-login-link">
            Log in
          </Link>

          <Link to="/signup" className="svx-header-cta">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Badge({ children }) {
  return <span className="svx-badge">{children}</span>;
}

function PrimaryLink({ to = "/signup", children, className = "" }) {
  return (
    <Link to={to} className={cx("svx-btn svx-btn-primary", className)}>
      {children}
    </Link>
  );
}

function SecondaryLink({ to = "/login", children, className = "" }) {
  return (
    <Link to={to} className={cx("svx-btn svx-btn-secondary", className)}>
      {children}
    </Link>
  );
}

function WhiteCard({ children, className = "" }) {
  return <div className={cx("svx-card", className)}>{children}</div>;
}

function FeatureIcon({ Icon }) {
  return (
    <div className="svx-feature-icon">
      <Icon size={22} strokeWidth={2.5} />
    </div>
  );
}

function ProblemCard({ icon, title, text }) {
  return (
    <WhiteCard className="svx-feature-card svx-problem-card">
      <div className="svx-card-topline">
        <FeatureIcon Icon={icon} />
        <h3>{title}</h3>
      </div>

      <p>{text}</p>
    </WhiteCard>
  );
}

function PlatformCard({ icon, title, text }) {
  return (
    <WhiteCard className="svx-feature-card svx-platform-card">
      <div className="svx-card-topline">
        <FeatureIcon Icon={icon} />
        <h3>{title}</h3>
      </div>

      <p>{text}</p>
    </WhiteCard>
  );
}

function HeroLineChart() {
  return (
    <svg viewBox="0 0 430 150" className="svx-chart" aria-hidden="true">
      <path
        d="M8 108 C44 58, 76 44, 114 68 C146 88, 158 10, 198 38 C238 70, 232 112, 282 82 C320 58, 356 72, 422 28"
        fill="none"
        stroke="var(--landing-primary)"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M8 108 C44 58, 76 44, 114 68 C146 88, 158 10, 198 38 C238 70, 232 112, 282 82 C320 58, 356 72, 422 28"
        fill="none"
        stroke="var(--landing-primary)"
        strokeLinecap="round"
        strokeOpacity="0.12"
        strokeWidth="14"
      />
      {[8, 76, 114, 198, 282, 356, 422].map((x, index) => (
        <circle
          key={x}
          cx={x}
          cy={[108, 44, 68, 38, 82, 72, 28][index]}
          r="4"
          fill="var(--landing-primary)"
        />
      ))}
    </svg>
  );
}

function DashboardMockup() {
  const navItems = ["Overview", "Sales", "Orders", "Products", "Employees", "Reports", "Settings"];

  return (
    <div className="svx-dashboard">
      <aside className="svx-dashboard-sidebar">
        <div className="svx-dashboard-brand">
          <img src="/storvex_icon.webp" alt="" />
          <span>Storvex</span>
        </div>

        <div className="svx-dashboard-nav">
          {navItems.map((item, index) => (
            <div key={item} className={index === 0 ? "active" : ""}>
              <span className="svx-nav-dot" />
              {item}
            </div>
          ))}
        </div>
      </aside>

      <main className="svx-dashboard-main">
        <div className="svx-dashboard-top">
          <div>
            <h3>Overview</h3>
            <div className="svx-date-pill">
              <span>▣</span>
              May 12 — May 18, 2026
            </div>
          </div>

          <button type="button" className="svx-branch-pill">
            Downtown Branch
            <span>⌄</span>
          </button>
        </div>

        <div className="svx-kpi-grid">
          {[
            ["Total sales", "RWF 14,250", "+12.9%"],
            ["Net profit", "RWF 4,820", "+8.7%"],
            ["Orders", "1,246", "+16.1%"],
          ].map(([label, value, change]) => (
            <div key={label} className="svx-kpi-card">
              <div className="svx-kpi-head">
                <span>{label}</span>
                <span>⌄</span>
              </div>
              <strong>{value}</strong>
              <p>{change} vs last week</p>
            </div>
          ))}
        </div>

        <div className="svx-dashboard-bottom">
          <div className="svx-chart-card">
            <div className="svx-panel-head">
              <h4>Sales over time</h4>
              <span>Day</span>
            </div>
            <HeroLineChart />
          </div>

          <div className="svx-stores-card">
            <h4>Top stores</h4>

            <div className="svx-store-list">
              {[
                ["Downtown Branch", "RWF 8,250"],
                ["Market Street", "RWF 4,750"],
                ["Lakeside Store", "RWF 5,430"],
              ].map(([name, value], index) => (
                <div key={name} className="svx-store-row">
                  <div>
                    <span>{index + 1}</span>
                    <strong>{name}</strong>
                  </div>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="svx-phone">
      <div className="svx-phone-notch" />

      <div className="svx-phone-screen">
        <div className="svx-phone-head">
          <p>Overview</p>
          <span>•••</span>
        </div>

        <p className="svx-phone-date">Daily · Jun 18, 2026</p>

        <div className="svx-phone-card-stack">
          {[
            ["Total sales", "RWF 14.2M"],
            ["Net profit", "RWF 4.82M"],
            ["Orders", "1,246"],
          ].map(([label, value]) => (
            <div key={label} className="svx-phone-card">
              <p>{label}</p>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="svx-phone-bars">
          {[22, 35, 28, 60, 42, 52, 74].map((height, index) => (
            <span
              key={index}
              style={{ height: `${height}%`, opacity: index % 2 ? 0.55 : 0.9 }}
            />
          ))}
        </div>

        <div className="svx-phone-plus">+</div>
      </div>
    </div>
  );
}

function MobileReadySection() {
  return (
    <section id="trust" className="svx-mobile-ready-section">
      <div className="svx-mobile-ready-shell">
        <div className="svx-mobile-ready-copy">
          <Badge>Mobile-ready</Badge>

          <h2>Run your store from anywhere.</h2>

          <p>
            Storvex works on desktop and mobile, so you can stay in control even when you’re on the
            move.
          </p>

          <div className="svx-mobile-checklist">
            {mobilePoints.map((item) => (
              <div key={item}>
                <span>
                  <Check size={14} strokeWidth={3} />
                </span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

          <div className="svx-store-badges">
            <a href="/signup" aria-label="Download on the App Store" className="svx-app-badge">
              <span className="svx-apple-mark"></span>
              <span>
                <small>Download on the</small>
                App Store
              </span>
            </a>

            <a href="/signup" aria-label="Get it on Google Play" className="svx-app-badge">
              <span className="svx-play-mark">▶</span>
              <span>
                <small>Get it on</small>
                Google Play
              </span>
            </a>
          </div>
        </div>

        <div className="svx-mobile-ready-visual">
          <div className="svx-mobile-network">
            <svg viewBox="0 0 620 420" aria-hidden="true">
              <path
                d="M130 210 C205 145, 292 153, 350 214 C405 270, 496 248, 560 176"
                fill="none"
                stroke="currentColor"
                strokeDasharray="8 10"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d="M350 214 C420 330, 505 335, 560 278"
                fill="none"
                stroke="currentColor"
                strokeDasharray="8 10"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d="M350 214 C410 96, 492 74, 546 98"
                fill="none"
                stroke="currentColor"
                strokeDasharray="8 10"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>

            <div className="svx-mobile-app-icon">
              <img src="/storvex_icon.webp" alt="Storvex app icon" />
            </div>

            <img
              src="/avatars/african-owner-3.webp"
              alt="Store owner receiving live updates"
              className="svx-network-avatar svx-network-avatar-one"
            />
            <img
              src="/avatars/african-owner-1.webp"
              alt="Store manager checking branch activity"
              className="svx-network-avatar svx-network-avatar-two"
            />
            <img
              src="/avatars/african-owner-2.webp"
              alt="Store staff member using Storvex"
              className="svx-network-avatar svx-network-avatar-three"
            />
          </div>

          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  function handleNewsletterSubmit(event) {
    event.preventDefault();
  }

  return (
    <section id="resources" className="svx-footer-section">
      <div className="svx-footer-shell">
        <div className="svx-footer-cta">
          <div>
            <span className="svx-footer-kicker">Built for store owners</span>
            <h2>Ready to run your store with clarity?</h2>
            <p>Create your owner account and open your first store workspace in minutes.</p>
          </div>

          <div className="svx-footer-cta-actions">
            <Link to="/signup" className="svx-footer-primary">
              Get started
            </Link>

            <Link to="/login" className="svx-footer-secondary">
              Book a demo
            </Link>
          </div>
        </div>

        <footer className="svx-footer-main">
          <div className="svx-footer-grid">
            <div className="svx-footer-brand">
              <img src="/storvex_white.webp" alt="Storvex" />

              <p>
                Store control system for modern retail. Track sales, protect profit, and run every
                branch with confidence.
              </p>

              <div className="svx-footer-contact">
                <a href="https://wa.me/250785587830" target="_blank" rel="noreferrer">
                  WhatsApp: +250 785 587 830
                </a>
                <a href="https://webimpactlab.com" target="_blank" rel="noreferrer">
                  WebimpactLab
                </a>
              </div>

              <div className="svx-footer-socials">
                {["f", "𝕏", "in", "◎"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>

            <div className="svx-footer-links-wrap">
              {footerGroups.map((group) => (
                <div key={group.title} className="svx-footer-column">
                  <h3>{group.title}</h3>

                  <div>
                    {group.links.map((item) => (
                      <Link key={item} to="/signup">
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="svx-footer-newsletter">
              <h3>Stay in the loop</h3>

              <p>Get practical updates that help you run a better store.</p>

              <form className="svx-footer-email" onSubmit={handleNewsletterSubmit}>
                <input placeholder="Enter your email" type="email" />
                <button type="submit" aria-label="Submit email">
                  →
                </button>
              </form>
            </div>
          </div>

          <div className="svx-footer-bottom">
            <p>© {currentYear} Storvex. All rights reserved.</p>

            <div>
              <Link to="/signup">Privacy Policy</Link>
              <Link to="/signup">Terms of Service</Link>
            </div>

            <div>
              <Link to="/signup">Security</Link>
              <span>🌐 English</span>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}

export default function LandingPage() {
  useLandingAnimations();

  return (
    <div className="storvex-landing min-h-screen">
      <Header />

      <main>
        <section className="svx-hero">
          <div className="svx-hero-shape" />

          <div className="svx-hero-inner">
            <div className="svx-hero-copy">
              <Badge>For store owners</Badge>

              <h1>Stop guessing what happened in your store.</h1>

              <p>
                Everything you need to run a smarter store. Track performance, manage your team, and
                grow profitably with real-time clarity.
              </p>

              <div className="svx-hero-actions">
                <PrimaryLink>Get started</PrimaryLink>
                <SecondaryLink>Book a demo</SecondaryLink>
              </div>

              <div className="svx-trust-row">
                <div className="svx-trust-avatars">
                  {["L", "A", "M", "K"].map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>

                <p>Trusted by 2,000+ store owners</p>
              </div>
            </div>

            <div className="svx-hero-visual">
              <DashboardMockup />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="svx-section svx-platform-section">
          <div className="svx-section-shell">
            <div className="svx-section-heading">
              <span>Store operating system</span>
              <h2>One platform. Complete store control.</h2>
              <p>
                Sales, stock, cash, documents, staff access, and branch visibility stay connected in
                one owner-first workspace.
              </p>
            </div>

            <div className="svx-card-grid svx-platform-grid">
              {platformCards.map((item) => (
                <PlatformCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <MobileReadySection />

        <section id="features" className="svx-section svx-problem-section">
          <div className="svx-section-shell">
            <div className="svx-section-heading">
              <span>Profit protection</span>
              <h2>Built for the moments where stores lose money.</h2>
              <p>
                Storvex focuses on the weak points that quietly damage stores: missed sales, blind
                spots, staff mistakes, and uncontrolled costs.
              </p>
            </div>

            <div className="svx-card-grid svx-problem-grid">
              {problemCards.map((item) => (
                <ProblemCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
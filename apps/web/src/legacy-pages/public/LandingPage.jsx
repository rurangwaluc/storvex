import { useEffect } from "react";
import {
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  FileText,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserCog,
  UsersRound,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";
import "./LandingPage.css";

const logoSrc = "/storvex_webp.webp";
const whiteLogoSrc = "/storvex_white.webp";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "/signup" },
  { label: "Resources", href: "#resources", hasCaret: true },
];

const heroStats = [
  {
    label: "Today’s sales",
    value: "RWF 14,250",
    helper: "Visible as sales happen",
  },
  {
    label: "Net profit",
    value: "RWF 4,820",
    helper: "After recorded costs",
  },
  {
    label: "Orders",
    value: "1,246",
    helper: "Across active branches",
  },
];

const platformCards = [
  {
    icon: ShoppingCart,
    title: "Sales Tracking",
    text: "Record sales clearly and understand daily store performance.",
  },
  {
    icon: ReceiptText,
    title: "Cash Control",
    text: "Track cash activity, payment records, and daily money movement.",
  },
  {
    icon: Warehouse,
    title: "Stock Visibility",
    text: "Keep product quantities, low-stock alerts, and supply records under control.",
  },
  {
    icon: UserCog,
    title: "Staff Access",
    text: "Give each worker the right access without exposing owner-only controls.",
  },
  {
    icon: FileText,
    title: "Business Records",
    text: "Keep receipts, warranties, delivery notes, and documents in one place.",
  },
  {
    icon: ShieldCheck,
    title: "Owner Visibility",
    text: "Stay in control with clear records and activity that stays visible to the owner.",
  },
  {
    icon: ClipboardList,
    title: "Reports",
    text: "Review sales, expenses, stock, and performance without chasing papers.",
  },
  {
    icon: LockKeyhole,
    title: "Secure Workspace",
    text: "Protect business access, records, and store activity with structured controls.",
  },
];

const problemCards = [
  {
    icon: PackageCheck,
    title: "Missed Stock",
    text: "Know what is running low before customers ask for it.",
  },
  {
    icon: BarChart3,
    title: "Unclear Performance",
    text: "See what sells, what slows down, and where money is moving.",
  },
  {
    icon: UsersRound,
    title: "Staff Mistakes",
    text: "Reduce manual errors with clear roles, records, and activity visibility.",
  },
  {
    icon: WalletCards,
    title: "Cost Leaks",
    text: "Track expenses and cash movement before small losses become big losses.",
  },
];

const mobilePoints = [
  "Live updates on sales and profit",
  "Approve refunds and corrections",
  "Monitor branches and staff",
  "See alerts that matter",
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Pricing", href: "/signup" },
      { label: "Updates", href: "/signup" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Single Store", href: "/signup" },
      { label: "Multi-Branch", href: "/signup" },
      { label: "Inventory Control", href: "/signup" },
      { label: "Cash Management", href: "/signup" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/signup" },
      { label: "Guides", href: "/signup" },
      { label: "Blog", href: "/signup" },
      { label: "System Status", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/signup" },
      { label: "Careers", href: "/signup" },
      { label: "Contact Us", href: "/signup" },
      { label: "Partners", href: "/signup" },
    ],
  },
];

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function useLandingAnimations() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll(".svx-reveal"));

    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18 },
    );

    elements.forEach((element, index) => {
      element.style.setProperty("--svx-reveal-delay", `${Math.min(index * 45, 240)}ms`);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);
}

function SmartLink({ href, className, children, ...props }) {
  if (href?.startsWith("http")) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  }

  if (href?.startsWith("#")) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link to={href || "/signup"} className={className} {...props}>
      {children}
    </Link>
  );
}

function Header() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="svx-header">
      <div className="svx-header-inner">
        <Link to="/" aria-label="Storvex home" className="svx-logo-link">
          <img
            src={isDark ? whiteLogoSrc : logoSrc}
            alt="Storvex"
            className="svx-header-logo"
            draggable="false"
          />
        </Link>

        <nav className="svx-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <SmartLink key={item.label} href={item.href}>
              {item.label}
              {item.hasCaret ? <span aria-hidden="true">⌄</span> : null}
            </SmartLink>
          ))}
        </nav>

        <div className="svx-header-actions">
          <button
            type="button"
            className="svx-theme-toggle"
            onClick={toggleTheme}
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

function SecondaryLink({ href = "https://wa.me/250785587830", children, className = "" }) {
  return (
    <a
      href={href}
      className={cx("svx-btn svx-btn-secondary", className)}
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}

function WhiteCard({ children, className = "" }) {
  return <div className={cx("svx-card", className)}>{children}</div>;
}

function FeatureIcon({ icon: Icon }) {
  return (
    <div className="svx-feature-icon" aria-hidden="true">
      <Icon size={21} strokeWidth={2.1} />
    </div>
  );
}

function PlatformCard({ icon, title, text }) {
  return (
    <WhiteCard className="svx-feature-card svx-platform-card svx-reveal">
      <div className="svx-card-topline">
        <FeatureIcon icon={icon} />
        <h3>{title}</h3>
      </div>
      <p>{text}</p>
    </WhiteCard>
  );
}

function ProblemCard({ icon, title, text }) {
  return (
    <WhiteCard className="svx-feature-card svx-problem-card svx-reveal">
      <div className="svx-card-topline">
        <FeatureIcon icon={icon} />
        <h3>{title}</h3>
      </div>
      <p>{text}</p>
    </WhiteCard>
  );
}

function LineChart() {
  return (
    <svg viewBox="0 0 430 150" className="svx-chart" aria-hidden="true">
      <defs>
        <linearGradient id="svxChartLine" x1="0" x2="1">
          <stop offset="0%" stopColor="#159cff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <path
        d="M18 118 C48 76 78 58 113 84 C145 106 162 106 190 68 C218 32 247 30 276 68 C303 104 336 96 382 54"
        fill="none"
        stroke="url(#svxChartLine)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <path
        d="M18 118 C48 76 78 58 113 84 C145 106 162 106 190 68 C218 32 247 30 276 68 C303 104 336 96 382 54"
        fill="none"
        stroke="rgba(21,156,255,0.12)"
        strokeWidth="22"
        strokeLinecap="round"
      />

      {[18, 113, 190, 276, 382].map((x, index) => (
        <circle
          key={x}
          cx={x}
          cy={[118, 84, 68, 68, 54][index]}
          r="5"
          fill="#ffffff"
          stroke="#159cff"
          strokeWidth="4"
        />
      ))}
    </svg>
  );
}

function DashboardMockup() {
  return (
    <div className="svx-dashboard">
      <aside className="svx-dashboard-sidebar">
        <div className="svx-dashboard-brand">
          <img src={whiteLogoSrc} alt="" draggable="false" />
          <span>Storvex</span>
        </div>

        <div className="svx-dashboard-nav">
          {["Overview", "Sales", "Orders", "Products", "Staff", "Reports"].map((item, index) => (
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
            <div className="svx-date-pill">May 12 – May 18, 2026</div>
          </div>

          <button type="button" className="svx-branch-pill">
            Downtown Branch <span aria-hidden="true">⌄</span>
          </button>
        </div>

        <div className="svx-kpi-grid">
          {heroStats.map((item) => (
            <div key={item.label} className="svx-kpi-card">
              <div className="svx-kpi-head">
                <span>{item.label}</span>
                <span>⌄</span>
              </div>
              <strong>{item.value}</strong>
              <p>{item.helper}</p>
            </div>
          ))}
        </div>

        <div className="svx-dashboard-bottom">
          <div className="svx-chart-card">
            <div className="svx-panel-head">
              <h4>Sales over time</h4>
              <span>Day</span>
            </div>
            <LineChart />
          </div>

          <div className="svx-stores-card">
            <h4>Top stores</h4>

            <div className="svx-store-list">
              {[
                ["Downtown Branch", "RWF 8,250"],
                ["Market Street", "RWF 4,750"],
                ["Lakeside Store", "RWF 5,430"],
              ].map(([name, amount], index) => (
                <div key={name} className="svx-store-row">
                  <div>
                    <span>{index + 1}</span>
                    <strong>{name}</strong>
                  </div>
                  <b>{amount}</b>
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

        <div className="svx-phone-bars" aria-hidden="true">
          {[22, 28, 44, 38, 58, 70, 88].map((height) => (
            <span key={height} style={{ height: `${height}%` }} />
          ))}
        </div>

        <div className="svx-phone-plus">+</div>
      </div>
    </div>
  );
}

function StoreAvatar({ className, children }) {
  return (
    <div className={cx("svx-network-avatar", className)} aria-hidden="true">
      {children}
    </div>
  );
}

function MobileReadySection() {
  return (
    <section id="trust" className="svx-mobile-ready-section">
      <div className="svx-mobile-ready-shell svx-reveal">
        <div className="svx-mobile-ready-copy">
          <Badge>Mobile-ready</Badge>

          <h2>Run your store from anywhere.</h2>

          <p>
            Storvex works on desktop and mobile, so you can stay in control even when you are away
            from the store.
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
            <svg viewBox="0 0 580 420" fill="none" aria-hidden="true">
              <path
                d="M110 210 C190 120 260 118 330 206 C390 284 455 290 530 224"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="8 10"
              />
              <path
                d="M132 256 C238 336 312 330 420 230"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="8 10"
              />
              <path
                d="M164 162 C252 68 374 78 500 154"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="8 10"
              />
            </svg>
          </div>

          <PhoneMockup />

          <div className="svx-mobile-app-icon">
            <img src={logoSrc} alt="" draggable="false" />
          </div>

          <StoreAvatar className="svx-network-avatar-one">Owner</StoreAvatar>
          <StoreAvatar className="svx-network-avatar-two">Staff</StoreAvatar>
          <StoreAvatar className="svx-network-avatar-three">Stock</StoreAvatar>
        </div>
      </div>
    </section>
  );
}

function FooterLink({ href, children }) {
  return <SmartLink href={href}>{children}</SmartLink>;
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

            <a
              href="https://wa.me/250785587830"
              className="svx-footer-secondary"
              target="_blank"
              rel="noreferrer"
            >
              Book a demo
            </a>
          </div>
        </div>

        <footer className="svx-footer-main">
          <div className="svx-footer-grid">
            <div className="svx-footer-brand">
              <img src={whiteLogoSrc} alt="Storvex" draggable="false" />

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

              <div className="svx-footer-socials" aria-label="Social links">
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
                      <FooterLink key={item.label} href={item.href}>
                        {item.label}
                      </FooterLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="svx-footer-newsletter">
              <h3>Stay in the loop</h3>

              <p>Get practical updates that help you run a better store.</p>

              <form className="svx-footer-email" onSubmit={handleNewsletterSubmit}>
                <input placeholder="Enter your email" type="email" aria-label="Email address" />
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

function HeroSection() {
  return (
    <section className="svx-hero">
      <div className="svx-hero-shape" />

      <div className="svx-hero-inner">
        <div className="svx-hero-copy">
          <Badge>For store owners</Badge>

          <h1>Know what happened in your store.</h1>

          <p>
            Track sales, stock, cash, staff activity, and branch performance from one clear
            workspace.
          </p>

          <div className="svx-hero-actions">
            <PrimaryLink>Get started</PrimaryLink>
            <SecondaryLink>Book a demo</SecondaryLink>
          </div>

          <div className="svx-trust-row">
            <div className="svx-trust-avatars" aria-hidden="true">
              {[Store, Building2, Warehouse].map((Icon, index) => (
                <span key={index}>
                  <Icon size={14} strokeWidth={2.4} />
                </span>
              ))}
            </div>

            <p>Built for owner-run stores and growing retail teams.</p>
          </div>
        </div>

        <div className="svx-hero-visual">
          <DashboardMockup />
        </div>
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
        <HeroSection />

        <section id="how-it-works" className="svx-section svx-platform-section">
          <div className="svx-section-shell">
            <div className="svx-section-heading svx-reveal">
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
            <div className="svx-section-heading svx-reveal">
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
      </main>

      <Footer />
    </div>
  );
}
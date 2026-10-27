import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  Home,
  LayoutDashboard,
  Package,
  ReceiptText,
  Search,
  ShoppingBag,
  Users,
} from "lucide-react";
import "./StorvexLockedHero.css";

// Decorative product previews only. All figures and transactions are sample data.
const salesBars = [24, 40, 32, 58, 44, 67, 52, 30, 63, 82, 48, 72, 58, 78];
const phoneBars = [26, 32, 45, 41, 64, 82, 91];
const navItems = [
  [LayoutDashboard, "Dashboard"],
  [ReceiptText, "Orders"],
  [Package, "Products"],
  [Users, "Customers"],
  [ShoppingBag, "Sales"],
  [BarChart3, "Reports"],
];
const sales = [
  ["Sale #1048", "3 items", "RWF 103,600", "Paid"],
  ["Sale #1047", "1 item", "RWF 59,900", "Paid"],
  ["Sale #1046", "5 items", "RWF 189,000", "Pending"],
  ["Sale #1045", "2 items", "RWF 85,600", "Paid"],
];

export function HeroDesktopPreview() {
  return (
    <div className="svx-locked-screen" aria-hidden="true">
      <div className="svx-locked-screen-inner">
        <aside className="svx-locked-screen-sidebar">
          <div className="svx-locked-screen-brand">
            <img src="/storvex-header-tricolor.png" alt="" draggable="false" />
          </div>
          <div className="svx-locked-screen-nav">
            {navItems.map(([Icon, label], index) => (
              <div
                className={`svx-locked-nav-item${index === 0 ? " is-selected" : ""}`}
                key={label}
              >
                <Icon size={13} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </aside>
        <div className="svx-locked-screen-content">
          <div className="svx-locked-screen-toolbar">
            <div className="svx-locked-search"><Search size={12} /> Search products, customers...</div>
            <span className="svx-locked-screen-toolbar-icon"><Boxes size={12} /></span>
            <span className="svx-locked-avatar">●</span>
          </div>
          <div className="svx-locked-report-title">
            <strong>Sales Overview</strong>
            <span>Last 7 days <ChevronDown size={10} /></span>
          </div>
          <div className="svx-locked-chart-and-total">
            <div className="svx-locked-chart" aria-hidden="true">
              {salesBars.map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="svx-locked-total">
              <b>RWF 54,830,300</b>
              <span>↗ +12%</span>
            </div>
          </div>
          <div className="svx-locked-summary-row">
            <div><span className="svx-locked-summary-icon is-blue"><ReceiptText size={13}/></span><small>Orders</small><b>2,430</b></div>
            <div><span className="svx-locked-summary-icon is-orange"><Package size={13}/></span><small>Products</small><b>423</b></div>
            <div><span className="svx-locked-summary-icon is-green"><Users size={13}/></span><small>Customers</small><b>1,066</b></div>
            <div><span className="svx-locked-summary-icon is-red"><ShoppingBag size={13}/></span><small>Returns</small><b>24</b></div>
          </div>
          <div className="svx-locked-transactions">
            <div className="svx-locked-transactions-title">
              <strong>Recent Sales</strong>
              <small>Illustrative data</small>
            </div>
            <div className="svx-locked-transactions-labels"><span>Reference</span><span>Items</span><span>Amount</span><span>Status</span></div>
            {sales.map(([reference, items, amount, status]) => (
              <div className="svx-locked-transaction" key={reference}>
                <span>{reference}</span><span>{items}</span><span>{amount}</span>
                <span className={status === "Paid" ? "is-paid" : "is-pending"}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroPhonePreview() {
  return (
    <div className="svx-locked-phone" aria-hidden="true">
      <div className="svx-locked-phone-notch" />
      <div className="svx-locked-phone-screen">
        <div className="svx-locked-phone-head">
          <img src="/storvex-header-tricolor.png" alt="" draggable="false" />
          <span>+</span>
        </div>
        <div className="svx-locked-phone-greeting"><b>Good Morning</b><span>Your Store is Growing</span></div>
        <div className="svx-locked-phone-sales">
          <small>Total Sales · Sample</small>
          <b>RWF 24,680,300</b>
          <span className="svx-locked-phone-growth">↗ 12%</span>
          <div className="svx-locked-mini-bars">
            {phoneBars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
          </div>
        </div>
        <div className="svx-locked-phone-metrics">
          <span><i className="is-green"><ReceiptText size={13}/></i><small>Orders</small><b>2,430</b></span>
          <span><i className="is-orange"><Package size={13}/></i><small>Products</small><b>255</b></span>
          <span><i className="is-green"><Users size={13}/></i><small>Customers</small><b>1,394</b></span>
          <span><i className="is-red"><ShoppingBag size={13}/></i><small>Revenue</small><b>Tracked</b></span>
        </div>
        <div className="svx-locked-phone-bottom">
          <span className="is-active"><Home size={14}/><small>Home</small></span>
          <span><ReceiptText size={14}/><small>Orders</small></span>
          <span><Package size={14}/><small>Stock</small></span>
          <span><LayoutDashboard size={14}/><small>More</small></span>
        </div>
      </div>
    </div>
  );
}

export default function StorvexLockedHero() {
  return (
    <section className="svx-locked-hero" aria-labelledby="svx-locked-title">
      <div className="svx-locked-hero-inner">
        <div className="svx-locked-hero-copy">
          <h1 id="svx-locked-title">
            Run Your<br />Retail Business<br />Smarter <span className="svx-locked-sparkle" aria-hidden="true">✦</span>
          </h1>
          <p className="svx-locked-hero-subtitle">Grow Without Limits</p>
          <p className="svx-locked-hero-description">
            Storvex is an all-in-one retail commerce platform to manage inventory, sales,
            payments, customers, staff, branches and more — in one connected system.
          </p>
          <div className="svx-locked-hero-actions">
            <Link href="/signup" className="svx-locked-hero-button">
              Get Started Free <span aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="svx-locked-hero-secondary">
              See How It Works <span aria-hidden="true">▷</span>
            </a>
          </div>
          <svg className="svx-locked-hero-arrow" viewBox="0 0 168 112" fill="none" aria-hidden="true">
            <path d="M159 4C141 29 161 68 120 94C100 107 93 67 108 68C134 69 98 104 11 101M11 101L26 89M11 101L27 110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="svx-locked-hero-device-area" aria-label="Illustrative Storvex phone and desktop retail dashboards with sample data" role="img">
          <HeroDesktopPreview />
          <HeroPhonePreview />
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  LayoutDashboard,
  MessageCircle,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";
import "./StorvexConnectEverywhere.css";

const channels = [
  { key: "store", Icon: Store, title: "Your Store", subtitle: "Website" },
  { key: "whatsapp", Icon: MessageCircle, title: "WhatsApp", subtitle: "Chat Selling" },
  { key: "marketplace", Icon: ShoppingBag, title: "Marketplace", subtitle: "Online Selling" },
];

const chartBars = [38, 58, 43, 73, 91, 65, 54, 86, 100, 67, 81, 96];

function ConnectedDashboard() {
  return (
    <div className="svx-connect-device" aria-hidden="true">
      <div className="svx-connect-dashboard">
        <aside className="svx-connect-dashboard-side">
          <div className="svx-connect-dashboard-brand"><span>S</span> STORVEX</div>
          <div className="svx-connect-side-entry is-selected"><LayoutDashboard size={12} />Dashboard</div>
          <div className="svx-connect-side-entry"><Package size={12} />Orders</div>
          <div className="svx-connect-side-entry"><ShoppingBag size={12} />Products</div>
          <div className="svx-connect-side-entry"><BarChart3 size={12} />Reports</div>
        </aside>
        <div className="svx-connect-dashboard-main">
          <div className="svx-connect-dashboard-top">
            <span className="svx-connect-search">Search products, customers...</span>
            <span className="svx-connect-profile">●</span>
          </div>
          <div className="svx-connect-dashboard-heading">
            <div><strong>Channel Sales</strong><small>Overview</small></div>
            <div className="svx-connect-sales-total"><strong>RWF 4,830,300</strong><small>↗ 12% this week</small></div>
          </div>
          <div className="svx-connect-chart" aria-label="Illustrative channel sales bar chart">
            {chartBars.map((height, index) => (
              <span key={index} className="svx-connect-chart-bar" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="svx-connect-summary">
            <div><span className="svx-connect-summary-dot is-green" />WhatsApp<strong>1,066</strong></div>
            <div><span className="svx-connect-summary-dot is-blue" />Marketplace<strong>423</strong></div>
            <div><span className="svx-connect-summary-dot is-coral" />In-Store<strong>2,430</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StorvexConnectEverywhere() {
  return (
    <section className="svx-connect-section" aria-labelledby="svx-connect-title">
      <div className="svx-connect-shell">
        <div className="svx-connect-copy">
          <h2 id="svx-connect-title">
            Connect Your<br />Business <span>Everywhere</span>
          </h2>
          <p>Manage your shop, WhatsApp, and online marketplace sales from one powerful system.</p>
          <Link className="svx-connect-cta" href="/signup">
            Get Started Free <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="svx-connect-middle" aria-label="Store, WhatsApp, and marketplace sales channels">
          <svg className="svx-connect-wires" viewBox="0 0 400 310" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path d="M5 55 C95 8 155 24 230 60 S325 93 392 77" />
            <path d="M155 144 C240 144 292 177 390 167" />
            <path d="M110 264 C200 276 298 226 393 231" />
          </svg>
          <div className="svx-connect-channel-list">
            {channels.map(({ key, Icon, title, subtitle }) => (
              <div className="svx-connect-channel" key={key}>
                <span className={`svx-connect-channel-icon is-${key}`}><Icon size={21} strokeWidth={2.4} /></span>
                <span className="svx-connect-channel-text"><strong>{title}</strong><small>{subtitle}</small></span>
              </div>
            ))}
          </div>
        </div>
        <div className="svx-connect-right"><ConnectedDashboard /></div>
      </div>
    </section>
  );
}

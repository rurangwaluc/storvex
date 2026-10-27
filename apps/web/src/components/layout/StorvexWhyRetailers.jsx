"use client";

import { BarChart3, Package, Share2, Zap } from "lucide-react";
import "./StorvexWhyRetailers.css";

const benefits = [
  {
    title: "Stay in Control",
    description: "Real-time inventory, sales and stock movement.",
    icon: Package,
    color: "lime",
  },
  {
    title: "See Your Growth",
    description: "Clear reports and business insights anytime.",
    icon: BarChart3,
    color: "blue",
  },
  {
    title: "Sell Faster",
    description: "Take orders on WhatsApp and reach more customers.",
    icon: Zap,
    color: "lime",
  },
  {
    title: "All Channels, One System",
    description: "Manage in-store, WhatsApp and marketplace sales together.",
    icon: Share2,
    color: "coral",
  },
];

export default function StorvexWhyRetailers() {
  return (
    <section id="features" className="svx-why-section" aria-labelledby="svx-why-title">
      <div className="svx-why-shell">
        <h2 id="svx-why-title">Why Retailers Choose Storvex</h2>

        <div className="svx-why-grid">
          {benefits.map(({ title, description, icon: Icon, color }) => (
            <article key={title} className="svx-why-benefit">
              <span className={`svx-why-icon svx-why-icon--${color}`} aria-hidden="true">
                <Icon size={27} strokeWidth={2.8} />
              </span>
              <div className="svx-why-copy">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

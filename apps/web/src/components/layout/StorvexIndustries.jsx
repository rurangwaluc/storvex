"use client";

import Link from "next/link";
import "./StorvexIndustries.css";

const industries = [
  {
    title: "Electronics",
    href: "/industries/electronics",
    image: "/marketplace/categories/electronics.webp",
    tone: "coral",
  },
  {
    title: "Hardware",
    href: "/industries/hardware",
    image: "/marketplace/categories/hardware.webp",
    tone: "lime",
  },
  {
    title: "Home & Kitchen",
    href: "/industries/home-and-kitchen",
    image: "/marketplace/categories/home-kitchen.webp",
    tone: "blue",
  },
  {
    title: "Lighting",
    href: "/industries/lighting",
    image: "/marketplace/categories/lighting.webp",
    tone: "coral-soft",
  },
  {
    title: "Spare Parts",
    href: "/industries/spare-parts",
    image: "/marketplace/categories/spare-parts.webp",
    tone: "neutral",
  },
];

export default function StorvexIndustries() {
  return (
    <section id="industries" className="svx-industries" aria-labelledby="svx-industries-title">
      <div className="svx-industries-shell">
        <div className="svx-industries-heading">
          <h2 id="svx-industries-title">Built for Every Type of Retail Business</h2>
        </div>
        <div className="svx-industries-grid" id="svx-industries-grid">
          {industries.map(({ title, href, image, tone }) => (
            <Link key={href} href={href} className={`svx-industries-card svx-industries-card--${tone}`}>
              <span className="svx-industries-visual">
                <img src={image} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="svx-industries-card-title">{title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

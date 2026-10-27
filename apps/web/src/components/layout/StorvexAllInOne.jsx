"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import "./StorvexAllInOne.css";

function InventoryIllustration() {
  return (
    <>
      <img className="svx-aio-product-image svx-aio-product-light" src="/storvex/all-in-one/inventory-scanner-light.png" alt="" loading="lazy" draggable="false" />
      <img className="svx-aio-product-image svx-aio-product-dark" src="/storvex/all-in-one/inventory-scanner.png" alt="" loading="lazy" draggable="false" />
    </>
  );
}

function WhatsAppIllustration() {
  return <img className="svx-aio-product-image" src="/storvex/all-in-one/whatsapp-drill.png" alt="" loading="lazy" draggable="false" />;
}

function HeadphonesIllustration() {
  return (
    <>
      <img className="svx-aio-product-image svx-aio-product-light" src="/storvex/all-in-one/whatsapp-headphones-light.png" alt="" loading="lazy" draggable="false" />
      <img className="svx-aio-product-image svx-aio-product-dark" src="/storvex/all-in-one/whatsapp-headphones.png" alt="" loading="lazy" draggable="false" />
    </>
  );
}

function ReportsIllustration() {
  return (
    <>
      <img className="svx-aio-product-image svx-aio-product-light" src="/storvex/all-in-one/business-reports-light.png" alt="" loading="lazy" draggable="false" />
      <img className="svx-aio-product-image svx-aio-product-dark" src="/storvex/all-in-one/business-reports.png" alt="" loading="lazy" draggable="false" />
    </>
  );
}

function WhatsAppMark() {
  return (
    <img
      className="svx-aio-whatsapp-mark"
      src="/storvex/all-in-one/whatsapp-mark.svg"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}

const cards = [
  {
    kind: "inventory",
    title: "Inventory & Sales",
    description: "Manage stock, sales, payments and expenses with ease.",
    href: "/solutions/inventory-management",
    Illustration: InventoryIllustration,
  },
  {
    kind: "whatsapp",
    title: "WhatsApp Selling",
    description: "Show products, take orders and grow your sales on WhatsApp.",
    href: "/solutions/whatsapp-business",
    Illustration: WhatsAppIllustration,
  },
  {
    kind: "reports",
    title: "Business Reports",
    description: "Get clear insights to make smarter decisions.",
    href: "/solutions/sales-tracking",
    Illustration: ReportsIllustration,
  },
];

export default function StorvexAllInOne() {
  return (
    <section id="how-it-works" className="svx-aio" aria-labelledby="svx-aio-heading">
      <div className="svx-aio-shell">
        <div className="svx-aio-heading-row">
          <h2 id="svx-aio-heading">An All-in-One<br />Retail Commerce System</h2>
          <div className="svx-aio-intro">
            <p>Everything you need to run and grow your business, connected in one place.</p>
            <Link href="/solutions/inventory-management" className="svx-aio-learn">Learn More <ArrowUpRight size={20} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="svx-aio-grid">
          {cards.map(({ kind, title, description, href, Illustration }) => (
            <article key={title} className={`svx-aio-card svx-aio-card--${kind}`}>
              <div className="svx-aio-art svx-aio-art--reference" aria-hidden="true">
                <img className="svx-aio-reference-image svx-aio-reference-light" src={`/storvex/all-in-one/reference-${kind}-light.webp`} alt="" loading="lazy" draggable="false" />
                <img className="svx-aio-reference-image svx-aio-reference-dark" src={`/storvex/all-in-one/reference-${kind}-dark.webp`} alt="" loading="lazy" draggable="false" />
              </div>
              <div className="svx-aio-card-copy">
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <Link href={href} className="svx-aio-arrow" aria-label={`Explore ${title}`}><ArrowUpRight size={19} aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

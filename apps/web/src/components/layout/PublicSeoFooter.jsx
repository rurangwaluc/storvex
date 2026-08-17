import Link from "next/link";

import "./PublicSeoFooter.css";

const solutionLinks = [
  ["Inventory management", "/solutions/inventory-management"],
  ["Sales tracking", "/solutions/sales-tracking"],
  ["Cash control", "/solutions/cash-control"],
];

const productLinks = [
  ["Pricing", "/pricing"],
  ["Marketplace", "/marketplace"],
  ["Log in", "/login"],
  ["Start free trial", "/signup"],
];

const legalLinks = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Data deletion", "/data-deletion"],
];

export default function PublicSeoFooter() {
  return (
    <footer className="seo-footer">
      <div className="seo-shell seo-footer__main">
        <div className="seo-footer__brand">
          <Link className="seo-footer__logo" href="/" aria-label="Storvex home">
            <img src="/storvex_white.webp" alt="Storvex" />
          </Link>
          <p>Clear business tools for sales, stock, cash, staff and every shop branch.</p>
          <a className="seo-footer__contact" href="mailto:support@storvex.rw">
            support@storvex.rw
          </a>
        </div>

        <div className="seo-footer__navigation">
          <FooterGroup label="Product" links={productLinks} />
          <FooterGroup label="Solutions" links={solutionLinks} />
        </div>
      </div>

      <div className="seo-shell seo-footer__bottom">
        <p>© {new Date().getFullYear()} Storvex. All rights reserved.</p>
        <nav aria-label="Legal">
          {legalLinks.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}

function FooterGroup({ label, links }) {
  return (
    <nav className="seo-footer__group" aria-label={`Storvex ${label.toLowerCase()}`}>
      <h2>{label}</h2>
      <ul>
        {links.map(([text, href]) => <li key={href}><Link href={href}>{text}</Link></li>)}
      </ul>
    </nav>
  );
}

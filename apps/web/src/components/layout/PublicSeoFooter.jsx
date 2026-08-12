import Link from "next/link";

import "./PublicSeoFooter.css";

const solutionLinks = [
  ["Inventory management", "/solutions/inventory-management"],
  ["Sales tracking", "/solutions/sales-tracking"],
  ["Cash control", "/solutions/cash-control"],
  ["Multi-branch shops", "/solutions/multi-branch-management"],
  ["Stock reordering", "/solutions/stock-reordering"],
  ["Staff management", "/solutions/staff-management"],
];

const industryLinks = [
  ["Electronics shops", "/industries/electronics"],
  ["Hardware shops", "/industries/hardware"],
  ["Home and kitchen shops", "/industries/home-and-kitchen"],
  ["Lighting shops", "/industries/lighting"],
  ["Spare parts shops", "/industries/spare-parts"],
];

export default function PublicSeoFooter() {
  return (
    <footer className="seo-footer">
      <div className="seo-shell seo-footer__grid">
        <div className="seo-footer__brand">
          <Link href="/" aria-label="Storvex home">
            <img src="/storvex_white.webp" alt="Storvex" />
          </Link>
          <p>Simple tools for sales, stock, cash, workers and shop branches.</p>
        </div>

        <nav aria-label="Storvex solutions">
          <h2>Solutions</h2>
          <ul>
            {solutionLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Storvex industries">
          <h2>Industries</h2>
          <ul>
            {industryLinks.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Storvex links">
          <h2>Storvex</h2>
          <ul>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/marketplace">Marketplace</Link></li>
            <li><Link href="/login">Log in</Link></li>
            <li><Link href="/signup">Start free trial</Link></li>
          </ul>
        </nav>
      </div>

      <div className="seo-shell seo-footer__bottom">
        <p>© {new Date().getFullYear()} Storvex. All rights reserved.</p>
      </div>
    </footer>
  );
}

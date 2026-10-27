"use client";

import Link from "next/link";

import "./StorvexLockedFooter.css";


// Brand marks are self-contained SVGs: lucide-react does not ship brand icons.
function FooterSocialIcon({ kind }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {kind === "facebook" && (
        <path d="M14.5 21v-8h3l.5-4h-3.5V7c0-1.1.6-1.5 1.7-1.5H18V2.2A22 22 0 0 0 15.4 2C12.5 2 11 3.7 11 6.7V9H8v4h3v8" />
      )}
      {kind === "instagram" && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "youtube" && (
        <>
          <rect x="2" y="5" width="20" height="14" rx="4" />
          <path d="m10 9 6 3-6 3z" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "linkedin" && (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="2" />
          <circle cx="7" cy="8" r="1" fill="currentColor" stroke="none" />
          <path d="M7 11v6M11 17v-6M11 13.6c.1-1.6 1.1-2.6 2.6-2.6 1.7 0 2.4 1 2.4 2.7V17" />
        </>
      )}
    </svg>
  );
}

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Industries", href: "/#industries" },
];

function FooterColumn({ heading, children }) {
  return (
    <div className="svx-locked-footer__column">
      <h3>{heading}</h3>
      <div className="svx-locked-footer__column-items">{children}</div>
    </div>
  );
}

export default function StorvexLockedFooter() {
  const year = new Date().getFullYear();

  return (
    <section id="resources" className="svx-locked-footer" aria-label="Storvex footer">
      <div className="svx-locked-footer__panel">
        <footer className="svx-locked-footer__inner">
          <div className="svx-locked-footer__top">
            <div className="svx-locked-footer__brand">
              <Link href="/" aria-label="Storvex home" className="svx-locked-footer__logo-link">
                <img src="/storvex-header-tricolor.png" alt="Storvex" width="154" height="45" draggable="false" />
              </Link>
              <p>The all-in-one retail commerce platform for modern businesses.</p>
              <a className="svx-locked-footer__contact" href="https://wa.me/250785587830" target="_blank" rel="noopener noreferrer">
                WhatsApp: +250 785 587 830
              </a>
            </div>

            <nav className="svx-locked-footer__nav" aria-label="Footer navigation">
              <FooterColumn heading="Product">
                {productLinks.map((link) => (
                  <Link href={link.href} key={link.label}>{link.label}</Link>
                ))}
              </FooterColumn>

              <FooterColumn heading="Resources">
                <a href="https://wa.me/250785587830" target="_blank" rel="noopener noreferrer">Help &amp; Support</a>
                <span>Blog</span>
                <span>What's New</span>
              </FooterColumn>

              <FooterColumn heading="Company">
                <span>About</span>
                <span>Careers</span>
                <a href="https://wa.me/250785587830" target="_blank" rel="noopener noreferrer">Contact</a>
              </FooterColumn>

              <FooterColumn heading="Follow Us">
                <div className="svx-locked-footer__social-icons" aria-hidden="true">
                  <span><FooterSocialIcon kind="facebook" /></span>
                  <span className="svx-locked-footer__x">𝕏</span>
                  <span><FooterSocialIcon kind="instagram" /></span>
                  <span><FooterSocialIcon kind="youtube" /></span>
                  <span><FooterSocialIcon kind="linkedin" /></span>
                </div>
              </FooterColumn>
            </nav>
          </div>

          <div className="svx-locked-footer__bottom">
            <p>
              Storvex is a product operated by RURAXIS LTD, a company registered in Rwanda.
              <span> © {year} RURAXIS LTD. All rights reserved.</span>
            </p>
            <nav aria-label="Legal links" className="svx-locked-footer__legal">
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/data-deletion">Data Deletion</Link>
            </nav>
            <span className="svx-locked-footer__language">English</span>
          </div>
        </footer>
      </div>
    </section>
  );
}

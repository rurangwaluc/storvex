import Link from "next/link";

import PublicHeader from "../layout/PublicHeader";
import PublicSeoFooter from "../layout/PublicSeoFooter";

import "../../legacy-pages/public/LandingPage.css";
import "./LegalPage.css";

export default function LegalPage({ eyebrow, title, intro, children }) {
  return (
    <div className="storvex-landing legal-page">
      <PublicHeader />
      <main>
        <header className="legal-hero">
          <div className="legal-shell">
            <Link className="legal-back" href="/">← Back to Storvex</Link>
            <p className="legal-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="legal-intro">{intro}</p>
            <p className="legal-updated">Last updated: 17 August 2026</p>
          </div>
        </header>

        <div className="legal-shell legal-content">{children}</div>
      </main>
      <PublicSeoFooter />
    </div>
  );
}

import { ArrowRight, Check, ChevronRight, Clock3, Store } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicHeader from "../../../components/layout/PublicHeader";
import PublicSeoFooter from "../../../components/layout/PublicSeoFooter";
import {
  getIndustryPage,
  industryCanonical,
  industryPageSlugs,
} from "../../../lib/seo/industryPages";

import "../../../legacy-pages/public/LandingPage.css";
import "./industries.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return industryPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getIndustryPage(slug);

  if (!page) return {};

  const canonical = industryCanonical(page.slug);
  const socialImage = "https://www.storvex.rw/pwa-icon-512.png";

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "Storvex",
      title: page.title,
      description: page.description,
      images: [{ url: socialImage, width: 512, height: 512, alt: "Storvex" }],
    },
    twitter: {
      card: "summary",
      title: page.title,
      description: page.description,
      images: [socialImage],
    },
  };
}

function Breadcrumbs({ page }) {
  return (
    <nav className="industry-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link href="/">Home</Link></li>
        <li aria-hidden="true"><ChevronRight size={14} /></li>
        <li><span>Industries</span></li>
        <li aria-hidden="true"><ChevronRight size={14} /></li>
        <li aria-current="page">{page.eyebrow}</li>
      </ol>
    </nav>
  );
}

function JsonLd({ page }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.storvex.rw/" },
      { "@type": "ListItem", position: 2, name: page.eyebrow, item: industryCanonical(page.slug) },
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function IndustryPage({ params }) {
  const { slug } = await params;
  const page = getIndustryPage(slug);

  if (!page) notFound();

  return (
    <div className={`storvex-landing industry-page industry-page--${page.accent}`}>
      <JsonLd page={page} />
      <PublicHeader />

      <main>
        <section className="industry-hero">
          <div className="seo-shell">
            <Breadcrumbs page={page} />
            <div className="industry-hero__grid">
              <div>
                <span className="industry-kicker">Storvex for {page.eyebrow.toLowerCase()}</span>
                <h1>{page.h1}</h1>
                <p>{page.intro}</p>
                <div className="industry-actions">
                  <Link className="industry-button industry-button--primary" href="/signup">Start free trial <ArrowRight size={18} /></Link>
                  <Link className="industry-button industry-button--secondary" href="/pricing">See pricing</Link>
                </div>
              </div>
              <aside className="industry-record" aria-label={page.recordName}>
                <div className="industry-record__head"><Store size={20} /><div><span>Product record</span><strong>{page.recordName}</strong></div></div>
                <dl>{page.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                <p>{page.recordNote}</p>
              </aside>
            </div>
          </div>
        </section>

        <section className="industry-products" aria-labelledby="products-title">
          <div className="seo-shell industry-products__inner">
            <h2 id="products-title">Products this shop handles</h2>
            <ul>{page.products.map((product) => <li key={product}>{product}</li>)}</ul>
          </div>
        </section>

        <section className="industry-section">
          <div className="seo-shell industry-problem">
            <div><span className="industry-label">The daily problem</span><h2>{page.problemTitle}</h2></div>
            <p>{page.problemText}</p>
          </div>
        </section>

        <section className="industry-section industry-section--soft">
          <div className="seo-shell">
            <div className="industry-heading"><span className="industry-label">A busy shop day</span><h2>{page.dayTitle}</h2></div>
            <div className="industry-day">{page.daySteps.map(([title, text]) => <article key={title}><Check size={18} /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
          </div>
        </section>

        <section className="industry-section">
          <div className="seo-shell industry-faster">
            <div className="industry-heading"><span className="industry-label">What becomes faster</span><h2>{page.fasterTitle}</h2></div>
            <div className="industry-faster__rows">{page.faster.map(([label, text]) => <div key={label}><strong>{label}</strong><p>{text}</p></div>)}</div>
          </div>
        </section>

        <section className="industry-section industry-section--soft">
          <div className="seo-shell">
            <div className="industry-heading"><span className="industry-label">Useful Storvex tools</span><h2>{page.toolsTitle}</h2></div>
            <div className="industry-tools">{page.tools.map(([title, text, href]) => <Link href={href} key={href}><h3>{title}</h3><p>{text}</p><span>See this solution <ArrowRight size={15} /></span></Link>)}</div>
          </div>
        </section>

        <section className="industry-marketplace">
          <div className="seo-shell industry-marketplace__inner">
            <div><span className="industry-label">Storvex Marketplace</span><h2>Help customers find products your shop chooses to publish.</h2><p>{page.marketplaceText}</p></div>
            <Link className="industry-button industry-button--secondary" href="/marketplace">Explore Marketplace <ArrowRight size={17} /></Link>
          </div>
        </section>

        <section className="industry-cta">
          <div className="seo-shell industry-cta__inner">
            <div><Clock3 size={28} /><span>Built to save time</span><h2>{page.ctaTitle}</h2><p>Keep stock, sales and product details in one clear shop system.</p></div>
            <div className="industry-actions"><Link className="industry-button industry-button--light" href="/signup">Start free trial <ArrowRight size={18} /></Link><Link className="industry-button industry-button--outline" href="/pricing">See pricing</Link></div>
          </div>
        </section>
      </main>

      <PublicSeoFooter />
    </div>
  );
}

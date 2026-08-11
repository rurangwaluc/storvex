import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicHeader from "../../../components/layout/PublicHeader";
import PublicSeoFooter from "../../../components/layout/PublicSeoFooter";
import {
  getSolutionPage,
  solutionCanonical,
  solutionPageSlugs,
} from "../../../lib/seo/solutionPages";

import "../../../legacy-pages/public/LandingPage.css";
import "./solutions.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return solutionPageSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getSolutionPage(slug);

  if (!page) return {};

  const canonical = solutionCanonical(page.slug);
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
    <nav className="seo-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><Link href="/">Home</Link></li>
        <li aria-hidden="true"><ChevronRight size={14} /></li>
        <li><span>Solutions</span></li>
        <li aria-hidden="true"><ChevronRight size={14} /></li>
        <li aria-current="page">{page.eyebrow}</li>
      </ol>
    </nav>
  );
}

function ProductProof({ page }) {
  return (
    <div className="seo-proof" aria-label={`${page.eyebrow} example`}>
      <div className="seo-proof__top">
        <div>
          <span className="seo-proof__dot" />
          <span className="seo-proof__dot" />
          <span className="seo-proof__dot" />
        </div>
        <small>Storvex shop view</small>
      </div>
      <div className="seo-proof__head">
        <span>{page.proofLabel}</span>
        <strong>{page.proofTitle}</strong>
      </div>
      <div className="seo-proof__rows">
        {page.proofRows.map(([label, text], index) => (
          <div className="seo-proof__row" key={label}>
            <span className="seo-proof__number">{String(index + 1).padStart(2, "0")}</span>
            <div><strong>{label}</strong><small>{text}</small></div>
            <Check size={17} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function JsonLd({ page }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.storvex.rw/" },
      { "@type": "ListItem", position: 2, name: page.eyebrow, item: solutionCanonical(page.slug) },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function SolutionPage({ params }) {
  const { slug } = await params;
  const page = getSolutionPage(slug);

  if (!page) notFound();

  const relatedPages = page.related.map(getSolutionPage).filter(Boolean);

  return (
    <div className={`storvex-landing seo-page seo-page--${page.accent} seo-page--layout-${page.layout}`}>
      <JsonLd page={page} />
      <PublicHeader />

      <main>
        <section className="seo-hero">
          <div className="seo-shell">
            <Breadcrumbs page={page} />
            <div className="seo-hero__grid">
              <div className="seo-hero__copy">
                <span className="seo-kicker">{page.eyebrow} for shops</span>
                <h1>{page.h1}</h1>
                <p>{page.intro}</p>
                <div className="seo-actions">
                  <Link className="seo-button seo-button--primary" href="/signup">
                    {page.ctaLabel}<ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <Link className="seo-button seo-button--secondary" href="/pricing">
                    See pricing
                  </Link>
                </div>
                <ul className="seo-user-list" aria-label="Who this is for">
                  {page.users.map((user) => <li key={user}><Check size={15} />{user}</li>)}
                </ul>
              </div>
              <ProductProof page={page} />
            </div>
          </div>
        </section>

        <section className="seo-problem">
          <div className="seo-shell seo-problem__grid">
            <div><span className="seo-section-label">The daily problem</span><h2>{page.problemTitle}</h2></div>
            <p>{page.problemText}</p>
          </div>
        </section>

        <section className="seo-section">
          <div className="seo-shell">
            <div className="seo-section__head">
              <span className="seo-section-label">What becomes easier</span>
              <h2>{page.outcomesTitle}</h2>
            </div>
            <div className="seo-outcomes">
              {page.outcomes.map(([title, text], index) => (
                <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-section seo-section--soft">
          <div className="seo-shell seo-workflow">
            <div className="seo-workflow__intro">
              <span className="seo-section-label">How it works</span>
              <h2>{page.stepsTitle}</h2>
              <p>Each step uses the same shop records. Workers do not need to write the same details in many books.</p>
            </div>
            <ol className="seo-steps">
              {page.steps.map(([title, text], index) => (
                <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="seo-section">
          <div className="seo-shell seo-connected">
            <div className="seo-connected__copy">
              <span className="seo-section-label">Everything works together</span>
              <h2>{page.connectedTitle}</h2>
              <p>Storvex links this job to the other shop records you already need.</p>
            </div>
            <div className="seo-connected__cards">
              {page.connected.map(([title, text]) => (
                <article key={title}><Check size={18} /><div><h3>{title}</h3><p>{text}</p></div></article>
              ))}
            </div>
          </div>
        </section>

        <section className="seo-time">
          <div className="seo-shell seo-time__inner">
            <Clock3 size={30} aria-hidden="true" />
            <div><span>Built to save time</span><h2>{page.timeSavedTitle}</h2><p>{page.timeSaved}</p></div>
          </div>
        </section>

        <section className="seo-section">
          <div className="seo-shell">
            <div className="seo-section__head seo-section__head--row">
              <div><span className="seo-section-label">Related solutions</span><h2>See other ways Storvex can help your shop.</h2></div>
              <Link href="/pricing">Compare plans <ArrowRight size={16} /></Link>
            </div>
            <div className="seo-related">
              {relatedPages.map((related) => (
                <Link href={`/solutions/${related.slug}`} key={related.slug}>
                  <span>{related.eyebrow}</span><h3>{related.h1}</h3><small>Read this solution <ArrowRight size={15} /></small>
                </Link>
              ))}
            </div>
            {page.marketplaceRelevant ? (
              <p className="seo-marketplace-link">Want customers to find published products? <Link href="/marketplace">Explore Storvex Marketplace</Link>.</p>
            ) : null}
          </div>
        </section>

        <section className="seo-cta">
          <div className="seo-shell seo-cta__inner">
            <div><span>Start with your shop</span><h2>{page.ctaTitle}</h2><p>{page.ctaText}</p></div>
            <div className="seo-actions"><Link className="seo-button seo-button--light" href="/signup">{page.ctaLabel}<ArrowRight size={18} /></Link><Link className="seo-button seo-button--outline" href="/pricing">See pricing</Link></div>
          </div>
        </section>
      </main>

      <PublicSeoFooter />
    </div>
  );
}

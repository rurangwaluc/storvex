import { notFound } from "next/navigation";

import MarketplaceCategoryClient from "../../../../components/marketplace/MarketplaceCategoryClient";
import {
  getMarketplaceCategoryPage,
} from "../../../../lib/seo/marketplaceCategoryPages";
import {
  isMarketplaceCategoryIndexable,
} from "../../../../lib/seo/marketplaceSeoApprovals";
import {
  hasMarketplaceCategoryQueryVariant,
  marketplaceCategoryProductParams,
  marketplaceCategoryQueryString,
  normalizeMarketplaceCategoryQuery,
} from "../../../../lib/marketplaceCategoryQuery";
import {
  findMarketplaceCataloguePath,
  getServerMarketplaceCatalogue,
  getServerMarketplaceProducts,
  getServerMarketplaceStores,
} from "../../../../lib/marketplaceServerApi";

import "./category.css";

const SOCIAL_IMAGE = "https://www.storvex.rw/pwa-icon-512.png";

async function categoryContext(slug) {
  const catalogueData = await getServerMarketplaceCatalogue();
  const categories = Array.isArray(catalogueData?.categories) ? catalogueData.categories : [];
  const path = findMarketplaceCataloguePath(categories, slug);

  return { catalogueData, path };
}

function selectedNode(path) {
  return path?.leafCategory || path?.subcategory || path?.category || null;
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const curated = getMarketplaceCategoryPage(slug);
  const { path } = await categoryContext(slug);

  if (!path) return {};

  const node = selectedNode(path);
  const canonical = curated?.canonical || `https://www.storvex.rw/marketplace/category/${slug}`;
  const title = curated?.title || `${node.label} | Storvex Marketplace`;
  const description = curated?.description || node.description || path.category.description || `Browse ${node.label.toLowerCase()} published by shops on Storvex Marketplace.`;
  const approved = isMarketplaceCategoryIndexable({
    slug,
    curated,
    hasQueryVariant: hasMarketplaceCategoryQueryVariant(query),
  });

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: approved,
      follow: true,
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "Storvex Marketplace",
      title,
      description,
      images: [{ url: SOCIAL_IMAGE, width: 512, height: 512, alt: "Storvex" }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}

function CuratedIntro({ page }) {
  return (
    <div className="svx-category-page__intro svx-category-seo-intro">
      <div className="svx-category-page__hero-media">
        <img src={page.artwork} alt="" aria-hidden="true" width="1200" height="900" />
      </div>
      <div className="svx-category-page__intro-copy">
        <span>Storvex Marketplace</span>
        <h1>{page.h1}</h1>
        <p>{page.introduction}</p>
        <ul aria-label="Product groups">
          {page.groups.map((group) => <li key={group}>{group}</li>)}
        </ul>
        <p className="svx-category-seo-intro__guidance">{page.guidance}</p>
      </div>
    </div>
  );
}

export default async function MarketplaceCategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const normalizedQuery = normalizeMarketplaceCategoryQuery(query);
  const curated = getMarketplaceCategoryPage(slug);
  const { catalogueData, path } = await categoryContext(slug);

  if (!path) notFound();

  const productParams = marketplaceCategoryProductParams(normalizedQuery, path);

  const [initialProducts, initialStores] = await Promise.all([
    getServerMarketplaceProducts(productParams),
    getServerMarketplaceStores(),
  ]);

  return (
    <MarketplaceCategoryClient
      slug={slug}
      initialCatalogue={catalogueData}
      initialProducts={initialProducts}
      initialStores={initialStores}
      initialRouteSearch={marketplaceCategoryQueryString(normalizedQuery)}
    >
      {curated ? <CuratedIntro page={curated} /> : null}
    </MarketplaceCategoryClient>
  );
}

import { solutionPageSlugs } from "../lib/seo/solutionPages.js";
import { industryPageSlugs } from "../lib/seo/industryPages.js";
import { marketplaceCategoryPages } from "../lib/seo/marketplaceCategoryPages.js";
import { approvedMarketplaceCategorySlugs } from "../lib/seo/marketplaceSeoApprovals.js";
import { getCachedServerMarketplaceProduct } from "../lib/marketplaceServerApi.js";
import { marketplaceProductCanonical } from "../lib/seo/marketplaceProductSeo.js";
import {
  approvedMarketplaceProductKeys,
  marketplaceProductSeoPair,
} from "../lib/seo/marketplaceProductSeoApprovals.js";

const baseUrl = "https://www.storvex.rw";

export async function approvedMarketplaceProductSitemapEntries({
  approvedKeys = approvedMarketplaceProductKeys,
  getProduct = getCachedServerMarketplaceProduct,
  lastModified = new Date(),
} = {}) {
  const entries = [];
  const includedUrls = new Set();

  for (const candidate of approvedKeys) {
    const pair = marketplaceProductSeoPair(candidate);
    if (!pair) continue;

    const url = marketplaceProductCanonical(pair.storeSlug, pair.productSlug);
    if (includedUrls.has(url)) continue;

    const product = await getProduct(pair.storeSlug, pair.productSlug);
    if (product === null) continue;

    includedUrls.add(url);

    entries.push({
      url,
      lastModified,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  return entries;
}

export default async function sitemap() {
  const lastModified = new Date();
  const marketplaceProductEntries = await approvedMarketplaceProductSitemapEntries({ lastModified });

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/marketplace/stores`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...["privacy", "terms", "data-deletion"].map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    })),
    ...solutionPageSlugs.map((slug) => ({
      url: `${baseUrl}/solutions/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    ...industryPageSlugs.map((slug) => ({
      url: `${baseUrl}/industries/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    ...marketplaceCategoryPages
      .filter((page) => approvedMarketplaceCategorySlugs.has(page.slug))
      .map((page) => ({
        url: page.canonical,
        lastModified,
        changeFrequency: "daily",
        priority: 0.7,
      })),
    ...marketplaceProductEntries,
  ];
}

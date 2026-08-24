import {
  evaluateMarketplaceListingQuality,
  MARKETPLACE_LISTING_QUALITY_LEVELS,
} from "../marketplaceListingQuality.js";
import {
  normalizeMarketplaceCategory,
} from "../../legacy-pages/marketplace/marketplaceCategoryDefinitions.js";
import {
  approvedMarketplaceProductKeys,
  marketplaceProductSeoKey,
} from "./marketplaceProductSeoApprovals.js";

const MARKETPLACE_CATEGORIES = new Set([
  "ELECTRONICS",
  "HARDWARE",
  "HOME_KITCHEN",
  "LIGHTING",
  "SPARE_PARTS",
]);

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function publicAttributes(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function publicImages(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const candidates = images.length ? images : product?.image ? [product.image] : [];

  return candidates.filter((image) => (
    image && typeof image === "object" && /^https?:\/\//i.test(cleanText(image.url))
  ));
}

function categoryPath(product) {
  const breadcrumbs = Array.isArray(product?.categoryBreadcrumbs)
    ? product.categoryBreadcrumbs
    : [];

  return {
    category: cleanText(
      breadcrumbs[0]?.slug ||
      product?.businessCategory ||
      product?.category,
    ),
    subcategory: cleanText(breadcrumbs[1]?.slug || product?.subcategory),
    leafCategory: cleanText(breadcrumbs[2]?.slug || product?.leafCategory),
  };
}

export function evaluateMarketplaceProductSeoCandidate(
  publicData = {},
  {
    approvedKeys = approvedMarketplaceProductKeys,
    publiclyAccessible = true,
  } = {},
) {
  const store = publicData?.store;
  const product = publicData?.product;
  const storeSlug = cleanText(store?.slug || product?.seller?.slug);
  const productSlug = cleanText(product?.slug);
  const key = marketplaceProductSeoKey(storeSlug, productSlug);
  const path = categoryPath(product);
  const category = normalizeMarketplaceCategory(path.category);
  const validCategory = MARKETPLACE_CATEGORIES.has(category);
  const sellerSlug = cleanText(product?.seller?.slug);
  const slugsAgree = Boolean(storeSlug && sellerSlug && storeSlug === sellerSlug);
  const images = publicImages(product);
  const quality = evaluateMarketplaceListingQuality({
    title: cleanText(product?.title),
    description: cleanText(product?.description),
    price: product?.price,
    category,
    subcategory: path.subcategory,
    leafCategory: path.leafCategory,
    attributes: publicAttributes(product?.attributes),
    approvedImageCount: images.length,
  });
  const concerns = [...quality.recommendations];
  const availability = cleanText(product?.availability).toLowerCase();

  if (!key) concerns.unshift("Invalid public store or product slug.");
  if (!slugsAgree) concerns.unshift("Public store and product seller slugs do not match.");
  if (!validCategory) concerns.push("Product does not have a valid Marketplace category.");
  if (!publiclyAccessible) concerns.unshift("Exact public product route is not available.");
  if (availability && availability !== "in_stock") {
    concerns.push("Product is not currently available.");
  }

  const candidate = Boolean(
    key &&
    slugsAgree &&
    validCategory &&
    publiclyAccessible &&
    availability === "in_stock" &&
    quality.level === MARKETPLACE_LISTING_QUALITY_LEVELS.STRONG,
  );

  return {
    key,
    storeSlug,
    productSlug,
    category,
    qualityLevel: quality.level,
    candidate,
    alreadyApproved: Boolean(key && approvedKeys?.has(key)),
    reasons: [...quality.strengths],
    concerns: [...new Set(concerns)],
  };
}

import {
  approvedMarketplaceCategorySlugs,
} from "./marketplaceSeoApprovals.js";

export const MARKETPLACE_SEO_AUDIT_CATEGORIES = Object.freeze([
  ["ELECTRONICS", "Electronics", "electronics"],
  ["HARDWARE", "Hardware", "hardware"],
  ["HOME_KITCHEN", "Home & kitchen", "home-and-kitchen"],
  ["LIGHTING", "Lighting", "lighting"],
  ["SPARE_PARTS", "Spare parts", "spare-parts"],
]);

export const marketplaceSeoHoldProductKeys = new Set([
  "prime-core-electronics/surface-laptop-732a67",
  "dunamis-electronics-ltd/sumsung-a16-e760a6",
  "gizmocean-ltd/hp-e-litebo-ok-1030-g2-fda9a0",
]);

const PRIVATE_FIELDS = new Set([
  "tenantid",
  "id",
  "sku",
  "costprice",
  "margin",
  "qtyonhand",
  "qtyreserved",
  "supplier",
  "staff",
  "branchinventory",
  "location",
  "address",
  "internalnotes",
]);

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stablePublicValue(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    return value;
  }
  if (Array.isArray(value)) return value.map(stablePublicValue);
  if (!value || typeof value !== "object") return cleanText(value);

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_FIELDS.has(key.toLowerCase().replace(/[^a-z0-9]/g, "")))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stablePublicValue(child)]),
  );
}

function imageUrls(product) {
  const images = Array.isArray(product?.images) && product.images.length
    ? product.images
    : product?.image
      ? [product.image]
      : [];

  return images
    .map((image) => cleanText(typeof image === "string" ? image : image?.url))
    .filter((url) => /^https?:\/\//i.test(url));
}

export function marketplaceSeoPublicProductFields(publicData = {}) {
  const product = publicData?.product || {};

  return {
    title: cleanText(product.title),
    description: cleanText(product.description),
    price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
    availability: cleanText(product.availability).toLowerCase(),
    attributes: stablePublicValue(product.attributes || {}),
    imageUrls: imageUrls(product),
  };
}

function sortedStrings(values) {
  return [...new Set(Array.isArray(values) ? values : [])].sort();
}

function publicContent(product) {
  return JSON.stringify({
    title: product.title,
    description: product.description,
    category: product.category,
    attributes: product.attributes,
    imageUrls: product.imageUrls,
    price: product.price,
    availability: product.availability,
  });
}

function seoReviewContent(product) {
  return JSON.stringify({
    title: product.title,
    description: product.description,
    category: product.category,
    attributes: product.attributes,
    imageUrls: product.imageUrls,
  });
}

export function createMarketplaceSeoAuditSnapshot(
  audit = {},
  {
    generatedAt = new Date().toISOString(),
    approvedCategorySlugs = approvedMarketplaceCategorySlugs,
  } = {},
) {
  const validResults = (audit.results || [])
    .filter((result) => result?.key)
    .sort((left, right) => left.key.localeCompare(right.key));
  const products = Object.fromEntries(validResults.map((result) => [result.key, {
    category: result.category,
    qualityLevel: result.qualityLevel,
    candidate: Boolean(result.candidate),
    alreadyApproved: Boolean(result.alreadyApproved),
    publiclyAccessible: result.publiclyAccessible !== false,
    canonicalMatches: result.routeHealth?.canonicalMatches ?? null,
    concerns: sortedStrings(result.concerns),
    title: result.publicSeo?.title || "",
    description: result.publicSeo?.description || "",
    price: result.publicSeo?.price ?? null,
    availability: result.publicSeo?.availability || "",
    attributes: stablePublicValue(result.publicSeo?.attributes || {}),
    imageUrls: [...(result.publicSeo?.imageUrls || [])],
  }]));
  const categories = Object.fromEntries(
    MARKETPLACE_SEO_AUDIT_CATEGORIES.map(([key, label, slug]) => {
      const categoryProducts = validResults.filter((result) => result.category === key);
      return [key, {
        label,
        slug,
        publicProducts: categoryProducts.length,
        candidates: categoryProducts.filter((result) => result.candidate).length,
        needsImprovement: categoryProducts.filter((result) => !result.candidate).length,
        indexingApproved: approvedCategorySlugs.has(slug),
      }];
    }),
  );

  return {
    generatedAt,
    totals: {
      publicProducts: validResults.length,
      candidates: validResults.filter((result) => result.candidate).length,
      approvedProducts: validResults.filter((result) => result.alreadyApproved).length,
      unknown: (audit.unknown || []).length,
    },
    categories,
    products,
    approvedProductIssues: [...(audit.approvedProductIssues || [])]
      .map((issue) => ({ key: issue.key, issue: issue.issue }))
      .sort((left, right) => left.key.localeCompare(right.key)),
    unknown: [...(audit.unknown || [])]
      .map((item) => ({ key: item.key, error: item.error }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  };
}

function changedKeys(previous, current, predicate) {
  return Object.keys(current).filter((key) => previous[key] && predicate(previous[key], current[key])).sort();
}

export function compareMarketplaceSeoAuditSnapshots(
  previous = {},
  current = {},
  { holdKeys = marketplaceSeoHoldProductKeys } = {},
) {
  const before = previous.products || {};
  const after = current.products || {};
  const previousKeys = new Set(Object.keys(before));
  const currentKeys = new Set(Object.keys(after));
  const newProducts = [...currentKeys].filter((key) => !previousKeys.has(key)).sort();
  const removedProducts = [...previousKeys].filter((key) => !currentKeys.has(key)).sort();
  const newCandidates = Object.keys(after)
    .filter((key) => after[key].candidate && (!before[key] || !before[key].candidate))
    .sort();
  const lostCandidates = Object.keys(before)
    .filter((key) => before[key].candidate && (!after[key] || !after[key].candidate))
    .sort();
  const changedQuality = changedKeys(before, after, (left, right) => left.qualityLevel !== right.qualityLevel);
  const changedConcerns = changedKeys(before, after, (left, right) => (
    JSON.stringify(sortedStrings(left.concerns)) !== JSON.stringify(sortedStrings(right.concerns))
  ));
  const changedPublicContent = changedKeys(before, after, (left, right) => publicContent(left) !== publicContent(right));
  const changedSeoReviewContent = changedKeys(
    before,
    after,
    (left, right) => seoReviewContent(left) !== seoReviewContent(right),
  );
  const reviewAgain = changedSeoReviewContent.filter((key) => holdKeys.has(key));
  const categorySupplyChanges = [];
  const categoryCandidateChanges = [];
  const categoryIndexingChanges = [];

  for (const [category, label] of MARKETPLACE_SEO_AUDIT_CATEGORIES) {
    const left = previous.categories?.[category] || {};
    const right = current.categories?.[category] || {};
    if (Number(left.publicProducts || 0) !== Number(right.publicProducts || 0)) {
      categorySupplyChanges.push({
        category,
        label,
        previous: Number(left.publicProducts || 0),
        current: Number(right.publicProducts || 0),
      });
    }
    if (Number(left.candidates || 0) !== Number(right.candidates || 0)) {
      categoryCandidateChanges.push({
        category,
        label,
        previous: Number(left.candidates || 0),
        current: Number(right.candidates || 0),
      });
    }
    if (Boolean(left.indexingApproved) !== Boolean(right.indexingApproved)) {
      categoryIndexingChanges.push({
        category,
        label,
        previous: Boolean(left.indexingApproved),
        current: Boolean(right.indexingApproved),
      });
    }
  }

  const approvedProductProblems = [
    ...(current.approvedProductIssues || []),
    ...Object.entries(after)
      .filter(([, product]) => product.alreadyApproved && (
        !product.publiclyAccessible ||
        product.availability !== "in_stock" ||
        product.qualityLevel !== "STRONG" ||
        product.canonicalMatches === false
      ))
      .map(([key, product]) => ({
        key,
        issue: !product.publiclyAccessible
          ? "Exact public product route is unavailable."
          : product.canonicalMatches === false
            ? "Canonical does not match the exact public product URL."
            : product.availability !== "in_stock"
              ? "Product is not currently available."
              : "Public listing quality is no longer STRONG.",
      })),
    ...removedProducts
      .filter((key) => before[key]?.alreadyApproved)
      .map((key) => ({ key, issue: "Approved product is no longer public." })),
  ].sort((left, right) => left.key.localeCompare(right.key));
  const unchangedProducts = [...currentKeys]
    .filter((key) => previousKeys.has(key) && !changedPublicContent.includes(key) &&
      !changedQuality.includes(key) && !changedConcerns.includes(key))
    .sort();

  return {
    totals: {
      previous: Number(previous.totals?.publicProducts || 0),
      current: Number(current.totals?.publicProducts || 0),
      change: Number(current.totals?.publicProducts || 0) - Number(previous.totals?.publicProducts || 0),
    },
    newProducts,
    removedProducts,
    newCandidates,
    lostCandidates,
    changedQuality,
    changedConcerns,
    changedPublicContent,
    reviewAgain,
    categorySupplyChanges,
    categoryCandidateChanges,
    categoryIndexingChanges,
    approvedProductProblems,
    unchangedProducts,
  };
}

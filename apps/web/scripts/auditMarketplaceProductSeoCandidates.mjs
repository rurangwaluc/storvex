#!/usr/bin/env node

import {
  getServerMarketplaceProduct,
  getServerMarketplaceProducts,
  MarketplaceServerApiError,
} from "../src/lib/marketplaceServerApi.js";
import {
  evaluateMarketplaceProductSeoCandidate,
} from "../src/lib/seo/marketplaceProductSeoCandidate.js";

const CATEGORY_GROUPS = [
  ["ELECTRONICS", "Electronics"],
  ["HARDWARE", "Hardware"],
  ["HOME_KITCHEN", "Home & kitchen"],
  ["LIGHTING", "Lighting"],
  ["SPARE_PARTS", "Spare parts"],
];

function cleanText(value) {
  return String(value ?? "").trim();
}

async function listAllPublicProducts() {
  const products = [];
  let page = 1;
  let pages = 1;

  do {
    const data = await getServerMarketplaceProducts({ page, limit: 100 });
    if (!data || !Array.isArray(data.products)) {
      throw new MarketplaceServerApiError("Marketplace product list is malformed", {
        code: "MARKETPLACE_UPSTREAM_INVALID_DATA",
      });
    }

    products.push(...data.products);
    pages = Math.max(1, Number(data.pagination?.pages || 1));
    page += 1;
  } while (page <= pages);

  return products;
}

export async function auditMarketplaceProductSeoCandidates() {
  const listedProducts = await listAllPublicProducts();
  const results = [];
  const unknown = [];

  for (const listedProduct of listedProducts) {
    const storeSlug = cleanText(listedProduct?.seller?.slug);
    const productSlug = cleanText(listedProduct?.slug);

    if (!storeSlug || !productSlug) {
      results.push(evaluateMarketplaceProductSeoCandidate({ product: listedProduct }, {
        publiclyAccessible: false,
      }));
      continue;
    }

    try {
      const publicData = await getServerMarketplaceProduct(storeSlug, productSlug);
      results.push(evaluateMarketplaceProductSeoCandidate(
        publicData || { store: { slug: storeSlug }, product: listedProduct },
        { publiclyAccessible: publicData !== null },
      ));
    } catch (error) {
      unknown.push({
        key: `${storeSlug}/${productSlug}`,
        error: error instanceof MarketplaceServerApiError
          ? `${error.code}${error.status ? ` (HTTP ${error.status})` : ""}`
          : "UNEXPECTED_ERROR",
      });
    }
  }

  return { results, unknown };
}

export function marketplaceProductSeoCandidateAuditJson(audit) {
  const categories = Object.fromEntries(CATEGORY_GROUPS.map(([key, label]) => {
    const products = audit.results.filter((result) => result.category === key);
    return [key, {
      label,
      publicProducts: products.length,
      candidates: products.filter((result) => result.candidate).length,
      needsImprovement: products.filter((result) => !result.candidate).length,
    }];
  }));

  return {
    totalPublicProducts: audit.results.length,
    seoReviewCandidates: audit.results.filter((result) => result.candidate).length,
    alreadyApproved: audit.results.filter((result) => result.alreadyApproved).length,
    categories,
    candidates: audit.results.filter((result) => result.candidate),
    notReady: audit.results.filter((result) => !result.candidate),
    unknown: audit.unknown,
  };
}

export function formatMarketplaceProductSeoCandidateAudit(audit) {
  const lines = ["Marketplace Product SEO Candidate Audit", ""];

  for (const [category, label] of CATEGORY_GROUPS) {
    const products = audit.results.filter((result) => result.category === category);
    const candidates = products.filter((result) => result.candidate);
    lines.push(label);
    lines.push(`Public products: ${products.length}`);
    lines.push(`Candidates: ${candidates.length}`);
    lines.push(`Needs improvement: ${products.length - candidates.length}`);
    lines.push("");

    if (candidates.length) {
      lines.push("CANDIDATES");
      for (const result of candidates) {
        lines.push(result.key);
        lines.push(`Quality: ${result.qualityLevel}`);
        lines.push(`Approval: ${result.alreadyApproved ? "ALREADY APPROVED" : "NOT YET APPROVED"}`);
        lines.push("Why:");
        for (const reason of result.reasons) lines.push(`- ${reason}`);
      }
      lines.push("");
    }

    const notReady = products.filter((result) => !result.candidate);
    if (notReady.length) {
      lines.push("NOT READY");
      for (const result of notReady) {
        lines.push(result.key || "Invalid public product key");
        lines.push("Concerns:");
        for (const concern of result.concerns.slice(0, 4)) lines.push(`- ${concern}`);
      }
      lines.push("");
    }
  }

  if (audit.unknown.length) {
    lines.push("UNKNOWN / AUDIT FAILURES");
    for (const item of audit.unknown) lines.push(`- ${item.key}: ${item.error}`);
    lines.push("");
  }

  lines.push("TOTAL");
  lines.push(`Public products: ${audit.results.length}`);
  lines.push(`SEO review candidates: ${audit.results.filter((result) => result.candidate).length}`);
  lines.push(`Already approved: ${audit.results.filter((result) => result.alreadyApproved).length}`);

  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const audit = await auditMarketplaceProductSeoCandidates();
    const output = process.argv.includes("--json")
      ? JSON.stringify(marketplaceProductSeoCandidateAuditJson(audit), null, 2)
      : formatMarketplaceProductSeoCandidateAudit(audit);
    process.stdout.write(`${output}\n`);
    if (audit.unknown.length) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`Marketplace Product SEO Candidate Audit failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

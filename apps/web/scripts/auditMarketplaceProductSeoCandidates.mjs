#!/usr/bin/env node

import {
  getServerMarketplaceProduct,
  getServerMarketplaceProducts,
  MarketplaceServerApiError,
} from "../src/lib/marketplaceServerApi.js";
import {
  evaluateMarketplaceProductSeoCandidate,
} from "../src/lib/seo/marketplaceProductSeoCandidate.js";
import {
  createMarketplaceSeoAuditSnapshot,
  marketplaceSeoPublicProductFields,
} from "../src/lib/seo/marketplaceSeoAuditComparison.js";
import {
  approvedMarketplaceProductKeys,
  marketplaceProductSeoPair,
} from "../src/lib/seo/marketplaceProductSeoApprovals.js";

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

async function inspectApprovedPublicPage(storeSlug, productSlug) {
  const expectedCanonical = `https://www.storvex.rw/marketplace/${storeSlug}/${productSlug}`;
  const response = await fetch(expectedCanonical, {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(8_000),
  });
  const html = await response.text();
  const canonical = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i,
  )?.[1] || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  )?.[1] || "";

  return {
    status: response.status,
    canonicalMatches: response.ok && canonical === expectedCanonical,
  };
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
  const approvedProductIssues = [];

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
      const evaluatedData = publicData || { store: { slug: storeSlug }, product: listedProduct };
      const evaluation = evaluateMarketplaceProductSeoCandidate(evaluatedData, {
          publiclyAccessible: publicData !== null,
        });
      let routeHealth = null;

      if (evaluation.alreadyApproved) {
        try {
          routeHealth = await inspectApprovedPublicPage(storeSlug, productSlug);
          if (routeHealth.status !== 200) {
            approvedProductIssues.push({ key: evaluation.key, issue: `Public page returned HTTP ${routeHealth.status}.` });
          } else if (!routeHealth.canonicalMatches) {
            approvedProductIssues.push({ key: evaluation.key, issue: "Canonical does not match the exact public product URL." });
          }
        } catch {
          approvedProductIssues.push({ key: evaluation.key, issue: "Public product page could not be validated." });
        }
      }

      results.push({
        ...evaluation,
        publicSeo: marketplaceSeoPublicProductFields(evaluatedData),
        routeHealth,
      });
    } catch (error) {
      unknown.push({
        key: `${storeSlug}/${productSlug}`,
        error: error instanceof MarketplaceServerApiError
          ? `${error.code}${error.status ? ` (HTTP ${error.status})` : ""}`
          : "UNEXPECTED_ERROR",
      });
    }
  }

  const auditedKeys = new Set(results.map((result) => result.key).filter(Boolean));
  for (const approvedKey of approvedMarketplaceProductKeys) {
    const pair = marketplaceProductSeoPair(approvedKey);
    if (!pair || auditedKeys.has(pair.key)) continue;

    try {
      const publicData = await getServerMarketplaceProduct(pair.storeSlug, pair.productSlug);
      approvedProductIssues.push({
        key: pair.key,
        issue: publicData === null
          ? "Exact public product route returns 404 or is unpublished."
          : "Approved product is missing from the public product listing.",
      });
    } catch {
      approvedProductIssues.push({
        key: pair.key,
        issue: "Approved public product payload could not be validated.",
      });
    }
  }

  return { results, unknown, approvedProductIssues };
}

export function marketplaceProductSeoCandidateAuditJson(audit, options = {}) {
  const snapshot = createMarketplaceSeoAuditSnapshot(audit, options);

  return {
    generatedAt: snapshot.generatedAt,
    totals: snapshot.totals,
    products: snapshot.products,
    approvedProductIssues: snapshot.approvedProductIssues,
    totalPublicProducts: audit.results.length,
    seoReviewCandidates: audit.results.filter((result) => result.candidate).length,
    alreadyApproved: audit.results.filter((result) => result.alreadyApproved).length,
    categories: snapshot.categories,
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

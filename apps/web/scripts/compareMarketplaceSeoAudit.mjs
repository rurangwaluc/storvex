#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import {
  compareMarketplaceSeoAuditSnapshots,
} from "../src/lib/seo/marketplaceSeoAuditComparison.js";

function optionValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

async function readSnapshot(path, label) {
  if (!path) throw new Error(`${label} snapshot path is required`);
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${label} snapshot: ${error.message}`);
  }
}

function section(lines, title, values, format = (value) => `- ${value}`) {
  lines.push(title);
  if (!values.length) lines.push("None");
  else for (const value of values) lines.push(format(value));
  lines.push("");
}

export function formatMarketplaceSeoAuditComparison(comparison) {
  const change = comparison.totals.change;
  const lines = [
    "Storvex Marketplace SEO Re-Audit",
    "",
    "Public products",
    `Previous: ${comparison.totals.previous}`,
    `Current: ${comparison.totals.current}`,
    `Change: ${change >= 0 ? "+" : ""}${change}`,
    "",
  ];

  section(lines, "NEW PRODUCTS", comparison.newProducts);
  section(lines, "REMOVED PRODUCTS", comparison.removedProducts);
  section(lines, "NEW CANDIDATES", comparison.newCandidates);
  section(lines, "LOST CANDIDATES", comparison.lostCandidates);
  section(lines, "CHANGED QUALITY", comparison.changedQuality);
  section(lines, "CHANGED CONCERNS", comparison.changedConcerns);
  section(
    lines,
    "REVIEW AGAIN",
    comparison.reviewAgain,
    (key) => `- ${key}\n  Public listing changed since previous review\n  Action: Manual SEO review recommended`,
  );
  section(
    lines,
    "CATEGORY SUPPLY CHANGES",
    comparison.categorySupplyChanges,
    (item) => `${item.label}: ${item.previous} → ${item.current}`,
  );
  section(
    lines,
    "CATEGORY CANDIDATE CHANGES",
    comparison.categoryCandidateChanges,
    (item) => `${item.label}: ${item.previous} → ${item.current}`,
  );
  section(
    lines,
    "CATEGORY INDEXING ELIGIBILITY CHANGES",
    comparison.categoryIndexingChanges,
    (item) => `${item.label}: ${item.previous ? "approved" : "unapproved"} → ${item.current ? "approved" : "unapproved"}`,
  );
  section(
    lines,
    "APPROVED PRODUCT ISSUES",
    comparison.approvedProductProblems,
    (item) => `- ${item.key}\n  ${item.issue}\n  Action: Manual review required; approval was not changed`,
  );

  return lines.join("\n").trimEnd();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const previous = await readSnapshot(optionValue("--previous"), "previous");
    const current = await readSnapshot(optionValue("--current"), "current");
    const comparison = compareMarketplaceSeoAuditSnapshots(previous, current);
    const output = process.argv.includes("--json")
      ? JSON.stringify(comparison, null, 2)
      : formatMarketplaceSeoAuditComparison(comparison);
    process.stdout.write(`${output}\n`);
  } catch (error) {
    process.stderr.write(`Storvex Marketplace SEO Re-Audit failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

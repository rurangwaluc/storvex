# Marketplace SEO operations runbook

This runbook describes the manual operating process for Storvex Marketplace SEO monitoring and approvals. It does not replace human review and must not be used to approve products automatically.

## Current baseline

- Product SEO approvals: none.
- Approved Marketplace categories: Electronics only.
- HOLD products:
  - `prime-core-electronics/surface-laptop-732a67`
  - `dunamis-electronics-ltd/sumsung-a16-e760a6`
  - `gizmocean-ltd/hp-e-litebo-ok-1030-g2-fda9a0`
- Supply at the last audit: Electronics 17; Hardware, Home & kitchen, Lighting, and Spare parts 0.

Treat this baseline as historical context. Use a fresh production audit to establish the current catalogue state.

## Normal weekly workflow

Run the process once per week:

1. Preserve the last current snapshot as the previous snapshot.
2. Generate a new snapshot from the production API.
3. Compare the previous and current snapshots.
4. Investigate only meaningful changes and any audit failures.
5. Manually review new candidates and HOLD products marked `REVIEW AGAIN`.
6. Keep the current snapshot as the baseline for the next audit.

Do not automate this workflow yet.

### 1. Before the audit

- Confirm the repository and current branch are the intended ones and inspect `git status`.
- Confirm the production API base URL shown below.
- Preserve the previous snapshot before overwriting the current file:

```bash
cp /tmp/storvex-seo-current.json /tmp/storvex-seo-previous.json
```

On the first run, generate a current snapshot and retain it as the baseline; there is no comparison until two snapshots exist.

### 2. Generate the production snapshot

From the repository root, run:

```bash
NEXT_PUBLIC_API_BASE_URL='https://storvex-api-test-production-1db5.up.railway.app' \
  pnpm --silent --filter @storvex/web audit:marketplace-seo-candidates:json \
  > /tmp/storvex-seo-current.json
```

This audit command is **read only**. It reads public Marketplace data and does not edit products, sellers, approvals, or live data. The `--silent` option is required so redirected standard output is pure JSON.

Check the JSON and pay particular attention to `unknown`. An audit with unknown failures is incomplete; do not interpret those products as low quality.

For a human-readable audit without redirecting JSON:

```bash
NEXT_PUBLIC_API_BASE_URL='https://storvex-api-test-production-1db5.up.railway.app' \
  pnpm --filter @storvex/web audit:marketplace-seo-candidates
```

### 3. Compare snapshots

For a human-readable comparison:

```bash
pnpm --filter @storvex/web compare:marketplace-seo -- \
  --previous /tmp/storvex-seo-previous.json \
  --current /tmp/storvex-seo-current.json
```

For machine-readable comparison JSON:

```bash
pnpm --silent --filter @storvex/web compare:marketplace-seo -- \
  --previous /tmp/storvex-seo-previous.json \
  --current /tmp/storvex-seo-current.json \
  --json > /tmp/storvex-seo-comparison.json
```

## Reading the comparison report

- `NEW PRODUCTS`: newly public Marketplace products. Their presence does not make them candidates or approvals.
- `REMOVED PRODUCTS`: products that are no longer public. Investigate any approved product in this group.
- `NEW CANDIDATES`: products now strong enough for manual SEO review. Candidate does not mean approved.
- `LOST CANDIDATES`: products that previously qualified but no longer meet the candidate rules.
- `CHANGED QUALITY`: products whose listing-quality level changed.
- `CHANGED CONCERNS`: products whose seller-facing quality concerns changed.
- `REVIEW AGAIN`: HOLD products whose SEO-relevant title, description, category, public attributes, or ordered image URLs changed. Repeat the human public-page review. Price-only and availability-only changes do not create this signal.
- `CATEGORY SUPPLY CHANGES`: changes in the number of public products in a category.
- `CATEGORY CANDIDATE CHANGES`: changes in the number of candidates in a category.
- `CATEGORY INDEXING ELIGIBILITY CHANGES`: changes to the manual category SEO approval state.
- `APPROVED PRODUCT ISSUES`: problems with currently approved products, including accessibility, availability, quality, or canonical health. Investigate manually; the audit never removes approval automatically.

Availability can still create or remove candidacy and can flag an approved-product problem even though an availability-only change does not send a HOLD product to `REVIEW AGAIN`.

## Manual product review and approval

The required path is:

```text
Public product
→ candidate discovery
→ manual public-page review
→ APPROVE / HOLD / REJECT FOR NOW
→ manual allowlist change for APPROVE only
```

Candidate is not the same as approved. There is no shortcut around manual public-page review.

Before adding a product key to `approvedMarketplaceProductKeys`, verify all of the following:

- The exact public URL returns HTTP 200.
- The title is strong and useful.
- The description gives customers useful information.
- Images are useful and the primary image is appropriate.
- The page contains meaningful product details.
- The canonical matches the exact clean public URL.
- The clean page is currently `noindex` before approval.
- A query-string variant remains `noindex` and canonicalizes to the clean URL.
- Product JSON-LD is valid.
- BreadcrumbList JSON-LD is valid.
- No private seller, inventory, staff, location, cost, or other internal data leaks.

Only after every check passes may an `APPROVE` decision be represented by a manual allowlist edit. Run the relevant candidate, product-page, sitemap, metadata, structured-data, and SEO regression tests before committing that edit. Never add HOLD or REJECT FOR NOW products.

Phase 4K does not approve any product.

## Category review

Reconsider category indexing when supply and listing quality have grown enough to satisfy the existing category SEO quality thresholds and a manual review supports approval. One product appearing in a category is not sufficient.

Review only the five existing categories:

- Electronics
- Hardware
- Home & kitchen
- Lighting
- Spare parts

Use the existing category approval rules and tests. Do not infer approval from candidate count, create a new category, or approve a category automatically.

## Seller ownership

Storvex must not silently rewrite seller-owned listing content for SEO. When a listing has a generic title, typo, invisible characters, weak description, or missing details:

- Show the seller the existing search-visibility guidance.
- Keep the product `noindex` while it is not approved.
- Let the seller improve their own listing.
- Re-audit later and repeat manual review when appropriate.

## Emergency conditions

### Unknown result or audit failure

Do not classify the affected product as bad or not ready. Investigate the API, network, response shape, credentials/environment, or server health, then rerun the read-only audit.

### Approved product returns 404

Require manual review. Confirm publication state and route behavior. Do not silently remove the product approval.

### Canonical mismatch

Investigate and fix the technical SEO behavior before making further indexing decisions for the affected page.

### Private data leak

Treat this as urgent. Stop Product SEO approval work and do not approve or deploy new product indexing until the leak is fixed and verified.

### Sitemap regression

Do not approve or deploy new product indexing until the sitemap regression is resolved and regression tests pass.

## Snapshot storage policy

- `/tmp` is appropriate for short-term manual operation on a trusted workstation.
- Do not commit live Marketplace snapshots to source control by default.
- Snapshots can contain public seller and product content; treat them as operational artifacts.
- Move or delete artifacts according to the operator's normal secure-workstation retention practice when they are no longer needed.
- Phase 4K does not add persistent snapshot storage.

## Cadence

Run the audit weekly at the current catalogue scale. Also run it after:

- A noticeable wave of new Marketplace products.
- Seller improvements to HOLD listings.
- Material category supply growth.
- Product SEO approval changes.
- SEO-related deployments affecting Marketplace routes.

Daily manual audits are not recommended at the current scale. Consider automation only after the manual process has been exercised several times and its operational needs are understood.

## Compact checklist

### Before audit

- [ ] Repository state checked.
- [ ] Production API base verified.
- [ ] Previous snapshot preserved.

### During audit

- [ ] Read-only commands used.
- [ ] JSON output parsed successfully.
- [ ] `unknown` and audit failures checked first.

### After comparison

- [ ] `NEW CANDIDATES` reviewed.
- [ ] `REVIEW AGAIN` products reviewed.
- [ ] `APPROVED PRODUCT ISSUES` investigated.
- [ ] Category supply and candidate changes inspected.
- [ ] Current snapshot retained as the next baseline.

### Before approval

- [ ] Manual public-page audit completed.
- [ ] SEO regression tests passed.
- [ ] Seller content was not edited by Storvex.
- [ ] Only an explicit `APPROVE` decision is added to the allowlist.

Do not create cron jobs, scheduled workflows, automatic approvals, or alert integrations as part of this process.

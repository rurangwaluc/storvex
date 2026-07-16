# Storvex Subscription Plans V2

This checklist is authoritative for the subscription upgrade. Do not consider
Subscription Plans V2 complete until every required item is checked and tested.

## Commercial structure

- [x] Keep Starter, Growth, Business and Enterprise plan identities.
- [x] Keep existing plan keys and legacy aliases.
- [x] Keep launch prices at RWF 10,000, RWF 25,000 and RWF 45,000.
- [x] Set Starter capacity to 2 active users and 1 branch.
- [x] Set Growth capacity to 5 active users and 2 branches.
- [x] Set Business capacity to 15 active users and 5 branches.
- [x] Include Marketplace access in all paid plans.
- [x] Use no Marketplace sales commission at launch.
- [x] Use no subscription-based delivery-area limits.
- [x] Keep delivery fulfilment under the business owner's control.
- [x] Keep AI provider usage controls internal to Storvex.

## Authoritative plan catalogue

- [x] Replace vague feature copy with structured professional plan sections.
- [x] Add structured entitlement metadata to the server plan catalogue.
- [x] Return professional plan data through the billing plans API.
- [ ] Return the same authoritative plan data through public signup APIs.
- [ ] Return the same authoritative plan data through mobile signup APIs.
- [ ] Include Enterprise plan presentation where appropriate.

## Subscription snapshots and database

- [ ] Design the permanent entitlement snapshot fields.
- [ ] Add entitlement snapshot storage to Subscription.
- [ ] Add entitlement snapshot storage to Payment where required.
- [ ] Add entitlement snapshot storage to OwnerIntent where required.
- [ ] Create and apply the Prisma migration.
- [ ] Backfill existing subscriptions safely.
- [ ] Preserve historic purchased limits until renewal or explicit migration.
- [ ] Add platform-approved entitlement overrides.
- [ ] Add entitlement override audit history.

## Backend authority and enforcement

- [ ] Build one effective-entitlement resolver.
- [ ] Resolve plan defaults, purchased snapshots and platform overrides.
- [ ] Add effective entitlements to authentication responses.
- [ ] Add effective entitlements to billing overview responses.
- [ ] Keep staff limits server-enforced.
- [ ] Keep branch limits server-enforced.
- [ ] Add server enforcement for advanced plan capabilities.
- [ ] Ensure essential security and safe workflows are available on every plan.
- [ ] Ensure Marketplace order safety never depends on plan level.
- [ ] Ensure no delivery-area limit exists.
- [ ] Ensure no commission calculation exists.

## Owner web application

- [ ] Remove hardcoded plan definitions from Billing.jsx.
- [ ] Remove hardcoded plan definitions from Renew.jsx.
- [ ] Remove hardcoded plan definitions from OwnerPayment.jsx.
- [ ] Render plan capacity and sections from backend data.
- [ ] Build premium responsive pricing cards.
- [ ] Build clear current-plan and usage presentation.
- [ ] Build professional upgrade and downgrade explanations.
- [ ] Build over-capacity handling without deleting business data.
- [ ] Keep expired-account renewal reachable.
- [ ] Test dark mode and small-screen PWA layouts.

## Public Storvex website

- [ ] Use the authoritative plan catalogue on the landing pricing section.
- [ ] Add Marketplace to the public header.
- [ ] Link Marketplace to /marketplace.
- [ ] Explain Marketplace inclusion without commission language.
- [ ] Present plan differences in owner-friendly language.
- [ ] Avoid duplicated pricing and plan data.

## Mobile application

- [ ] Replace old team-and-cycle assumptions with current plans.
- [ ] Load current plans from the authoritative API.
- [ ] Render capacity and plan sections consistently.
- [ ] Preserve mobile-first plan selection.
- [ ] Test signup, trial and payment plan selection.

## Platform administration

- [ ] Show professional plan labels instead of raw keys.
- [ ] Show purchased capacity and effective capacity.
- [ ] Add controlled staff and branch overrides.
- [ ] Add controlled entitlement overrides.
- [ ] Require reasons for overrides.
- [ ] Record complete audit history.
- [ ] Preserve existing confirmed orders during subscription restriction.

## Lifecycle tests

- [ ] Trial signup.
- [ ] Paid signup.
- [ ] Renewal on the same plan.
- [ ] Upgrade.
- [ ] Downgrade.
- [ ] Existing subscription with historic limits.
- [ ] Over-staff downgrade.
- [ ] Over-branch downgrade.
- [ ] Grace period.
- [ ] Read-only mode.
- [ ] Full expiration.
- [ ] Suspension.
- [ ] Enterprise custom plan.
- [ ] Platform override.
- [ ] Web build.
- [ ] Mobile typecheck.
- [ ] Platform build.

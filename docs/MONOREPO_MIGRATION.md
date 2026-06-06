# Storvex monorepo migration

## Safe first step

This monorepo is a no-behavior-change foundation:

- `apps/api` = existing Express + Prisma backend
- `apps/web` = existing Vite React store/tenant frontend
- `apps/platform` = existing Next.js platform/admin frontend
- `apps/mobile` = existing Expo mobile app

The first goal is to run each app from the monorepo before changing frameworks.

## Marketplace placement

Do not create the full marketplace app until the current electronics product is stable.

Recommended future placement:

- `apps/marketplace` for the public customer-facing marketplace
- `packages/catalog` for shared product listing/category/search logic
- `packages/commerce` for shared marketplace order, reservation, quote, and lead schemas

Before `apps/marketplace`, the first public commerce feature should be live stock storefront routes in the future Next.js web app.

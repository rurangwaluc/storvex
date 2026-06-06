# Storvex

Storvex monorepo foundation.

## Apps

- `apps/api` — Express + Prisma backend
- `apps/web` — current Vite React store frontend, to be migrated to Next.js after the monorepo runs cleanly
- `apps/platform` — Next.js platform/admin frontend
- `apps/mobile` — Expo mobile app

## First run

```bash
pnpm install
pnpm dev:api
pnpm dev:web
pnpm dev:platform
pnpm dev:mobile
```

Run one app at a time first. Do not start framework migration until each existing app runs from this workspace.

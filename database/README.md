# Storvex database folder

This folder is reserved for database-level migration, seed, backup, and local PostgreSQL scripts.

Current safe state:
- The API still keeps its existing Prisma schema and Prisma migrations at `apps/api/prisma` so the backend does not break.
- Supabase SQL migration references and `storvex.sql` are copied here for review before moving to local/self-hosted PostgreSQL.
- Do not delete `apps/api/prisma` until the Prisma workflow has been intentionally migrated.

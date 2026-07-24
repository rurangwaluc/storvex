FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @storvex/api exec prisma generate \
  && chmod +x apps/api/scripts/railway-migrate.sh

EXPOSE 5000

CMD ["node", "apps/api/src/server.js"]

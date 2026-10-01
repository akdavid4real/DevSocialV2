# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2 AS bun

FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN --mount=type=cache,id=devsocial-backend-bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma.config.js ./
# Generation does not connect to a database or need real credentials.
RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused ./node_modules/.bin/prisma generate
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN bun run build

FROM base AS production-dependencies
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN --mount=type=cache,id=devsocial-backend-bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --production --omit=peer --ignore-scripts

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/v2').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]

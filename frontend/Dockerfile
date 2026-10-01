# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2 AS bun
FROM node:24-bookworm-slim AS dependencies
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN --mount=type=cache,id=devsocial-frontend-bun,target=/root/.bun/install/cache,sharing=locked \
    bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY index.html tsconfig.json vite.config.ts postcss.config.mjs ./
COPY src ./src
COPY public ./public
# Vite embeds these PUBLIC values at build time. Never pass server secrets here.
ARG VITE_API_URL=/api/v2
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_VAPID_PUBLIC_KEY
RUN bun run build

FROM nginxinc/nginx-unprivileged:1.28-alpine AS runtime
ENV API_UPSTREAM=http://backend:3001 NGINX_ENVSUBST_FILTER="^(API_UPSTREAM|DNS_RESOLVER)$"
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker-entrypoint.d/15-api-env.envsh /docker-entrypoint.d/15-api-env.envsh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS media
COPY scripts/build-static-media.mts ./scripts/build-static-media.mts
COPY src/lib/static-media.ts ./src/lib/static-media.ts
COPY public/media ./public/media
RUN npm run media:build

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG SUPPORT_URL
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV SUPPORT_URL=$SUPPORT_URL
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
COPY --from=media /app/public/media/optimized ./public/media/optimized
# The media stage owns prebuild; ordinary code changes reuse its output.
RUN ./node_modules/.bin/next build && node scripts/image-build-config.mjs write

FROM node:24-bookworm-slim AS runner
ARG BOLETS_REVISION
LABEL org.opencontainers.image.source="https://github.com/Neptrino/Bolets" \
    org.opencontainers.image.revision=$BOLETS_REVISION
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --from=builder /app/scripts/export-static-assets.mjs ./scripts/export-static-assets.mjs
COPY --from=builder /app/scripts/image-build-config.mjs ./scripts/image-build-config.mjs
COPY --from=builder /app/build-config.json ./build-config.json

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

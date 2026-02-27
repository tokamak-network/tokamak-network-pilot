FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Prune the monorepo to only what @tokamak-pilot/web needs ---
FROM base AS pruner
RUN pnpm add -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @tokamak-pilot/web --docker

# --- Install dependencies (cached layer) ---
FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# --- Build (NEXT_PUBLIC_* vars must be present at build time) ---
FROM deps AS builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME
ARG RAILWAY_DEPLOYMENT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@tokamak-pilot/web

# --- Production image (uses Next.js standalone output) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]

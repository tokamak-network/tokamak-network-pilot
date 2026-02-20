FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Prune the monorepo to only what @tokamak-pilot/landing-page needs ---
FROM base AS pruner
RUN pnpm add -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @tokamak-pilot/landing-page --docker

# --- Install dependencies (cached layer) ---
FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS builder
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@tokamak-pilot/landing-page

# --- Production image (uses Next.js standalone output) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/landing-page/public ./public
COPY --from=builder /app/apps/landing-page/.next/standalone ./
COPY --from=builder /app/apps/landing-page/.next/static ./apps/landing-page/.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/landing-page/server.js"]

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# --- Prune the monorepo to only what @tokamak-pilot/api needs ---
FROM base AS pruner
RUN pnpm add -g turbo
WORKDIR /app
COPY . .
RUN turbo prune @tokamak-pilot/api --docker

# --- Install dependencies (cached layer) ---
FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS builder
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@tokamak-pilot/api

# --- Production image ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]

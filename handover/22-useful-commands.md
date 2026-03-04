# Useful Commands

[← Back to Index](./README.md)

---

```bash
# Start everything (API + Web + Landing Page)
pnpm dev

# Start individual apps
pnpm --filter @tokamak-pilot/api dev
pnpm --filter @tokamak-pilot/web dev
pnpm --filter @tokamak-pilot/landing-page dev

# Build everything
pnpm build

# Lint everything
pnpm lint

# Start local infrastructure
docker compose up -d

# Stop local infrastructure
docker compose down

# Deploy to Railway
railway up -s api -d
railway up -s web -d
railway up -s landing-page -d

# Add a dependency to a specific app
pnpm --filter @tokamak-pilot/api add <package>
pnpm --filter @tokamak-pilot/web add <package>

# Build the SDK
pnpm --filter @tokamak-pilot/sdk build

# Format code
pnpm format
```

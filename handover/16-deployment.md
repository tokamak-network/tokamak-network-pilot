# Deployment

[← Back to Index](./README.md)

---

> For the full step-by-step deployment walkthrough, see **[Deploy to Railway](./05b-deploy-to-railway.md)**.

## Platform: Railway

The project is deployed on Railway with three services:

| Service | Dockerfile | Port | Deploy Command |
|---------|-----------|------|----------------|
| `api` | `apps/api/Dockerfile` | 4000 | `railway up -s api -d` |
| `web` | `apps/web/Dockerfile` | 3000 | `railway up -s web -d` |
| `landing-page` | `apps/landing-page/Dockerfile` | 3000 | `railway up -s landing-page -d` |

## Production URLs

- **API:** `https://api.tokamakforest.com`
- **Web App:** configured in Railway
- **Landing Page:** configured in Railway

## Docker Compose (Local Dev)

```bash
docker compose up -d    # Start Postgres, Qdrant, Redis
docker compose down     # Stop everything
```

Services:
- **Postgres** → `localhost:5432` (DB: `tokamak_pilot`, user: `postgres`, pass: `postgres`)
- **Qdrant** → `localhost:6333` (REST), `localhost:6334` (gRPC)
- **Redis** → `localhost:6380` (mapped from container port 6379 to avoid conflicts)

## No CI/CD Yet

There is no automated CI/CD pipeline. Deployments are done manually via Railway CLI. This is noted in the roadmap as a planned item.

# Deploy to Railway (Step by Step)

[← Back to Index](./README.md) | [← Local Setup](./05-how-to-run-locally.md)

---

Railway is the deployment platform this project uses. It runs Docker containers and provides managed PostgreSQL and Redis. Here's how to set everything up from scratch.

---

## What You'll Need

- A [Railway](https://railway.app) account
- The [Railway CLI](https://docs.railway.app/guides/cli) installed
- The repo pushed to GitHub (Railway deploys from your repo)

### Install Railway CLI

```bash
# macOS
brew install railway

# Or with npm
npm i -g @railway/cli
```

Then log in:

```bash
railway login
```

---

## Overview

You'll create **one Railway project** with **six services**:

| Service | Type | What It Does |
|---------|------|-------------|
| `api` | Docker (from repo) | NestJS backend |
| `web` | Docker (from repo) | Next.js frontend |
| `landing-page` | Docker (from repo) | Next.js landing page |
| `postgres` | Railway plugin | PostgreSQL database |
| `redis` | Railway plugin | Redis cache/queue |
| `qdrant` | Docker image | Vector database |

---

## Step 1: Create a Railway Project

```bash
railway init
```

Give it a name like `tokamak-pilot`. This creates a project on Railway and links your local directory to it.

Or create it on the Railway dashboard at https://railway.app/dashboard → **New Project**.

---

## Step 2: Add the Database Services

### PostgreSQL

On the Railway dashboard:
1. Open your project
2. Click **+ New** → **Database** → **PostgreSQL**
3. Railway auto-creates the service and gives you a `DATABASE_URL`

### Redis

1. Click **+ New** → **Database** → **Redis**
2. Railway auto-creates the service and gives you a `REDIS_URL`

### Qdrant (Vector Database)

Qdrant isn't a built-in Railway database, so you add it as a Docker image:

1. Click **+ New** → **Docker Image**
2. Set the image to: `qdrant/qdrant:v1.12.1`
3. Add a volume mount: `/qdrant/storage`
4. The service will get an internal URL like `http://qdrant.railway.internal:6333`

---

## Step 3: Deploy the API

### Create the service

1. On Railway dashboard → **+ New** → **GitHub Repo** → select `tokamak-network-pilot`
2. Name the service `api`
3. Set the **Root Directory** to `/` (it's a monorepo, the Dockerfile handles pruning)
4. Set the **Dockerfile Path** to `apps/api/Dockerfile`

### Set environment variables

In the `api` service settings, add these environment variables:

```env
# Required
OPENAI_API_KEY=sk-your-key-here
JWT_SECRET=a-long-random-string-generate-one
LLM_PROVIDER=openai

# Database — use Railway's variable references
DATABASE_URL=${{postgres.DATABASE_URL}}
REDIS_URL=${{redis.REDIS_URL}}

# Qdrant — use the internal Railway URL
QDRANT_URL=http://qdrant.railway.internal:6333
VECTOR_DB_PROVIDER=qdrant

# API config
API_PORT=4000
API_PREFIX=/api/v1
NODE_ENV=production

# CORS — set to your web app and landing page URLs (update after deploying them)
CORS_ORIGIN=https://your-web-app.up.railway.app,https://your-landing-page.up.railway.app

# Auth
JWT_EXPIRATION=7d
RESEND_API_KEY=re_your-resend-key-here
EMAIL_FROM_DOMAIN=tokamak.network
WEB_APP_URL=https://your-web-app.up.railway.app

# GitHub (for repo ingestion)
GITHUB_TOKEN=ghp_your-token-here
GITHUB_ORGS=tokamak-network
AUTO_SEED_ON_STARTUP=true

# TypeORM — disable auto-sync in production
DB_SYNC=false
```

### Set a custom domain (optional)

1. Go to service **Settings** → **Networking** → **Public Networking**
2. Click **Generate Domain** or add a custom domain like `api.tokamakforest.com`
3. If using a custom domain, add a CNAME record in your DNS pointing to the Railway URL

### Deploy

Railway auto-deploys when you push to the linked branch. Or deploy manually:

```bash
railway up -s api -d
```

### Verify

Once deployed, check the health endpoint:

```bash
curl https://your-api-url.up.railway.app/health
```

You should get `{"status":"ok"}`.

Swagger docs are at `https://your-api-url.up.railway.app/docs`.

---

## Step 4: Deploy the Web App (Frontend)

### Create the service

1. **+ New** → **GitHub Repo** → select `tokamak-network-pilot`
2. Name the service `web`
3. Set **Dockerfile Path** to `apps/web/Dockerfile`

### Set environment variables

```env
# Build args (NEXT_PUBLIC_* must be set at build time)
NEXT_PUBLIC_API_URL=https://your-api-url.up.railway.app/api/v1
NEXT_PUBLIC_APP_NAME=Tokamak Forest

# Runtime
NODE_ENV=production
PORT=3000
```

**Important:** `NEXT_PUBLIC_*` variables are baked in at build time. If you change them, you need to redeploy (not just restart).

### Set a custom domain (optional)

Same process as the API — go to **Settings** → **Networking** → add domain.

### Deploy

```bash
railway up -s web -d
```

---

## Step 5: Deploy the Landing Page

### Create the service

1. **+ New** → **GitHub Repo** → select `tokamak-network-pilot`
2. Name the service `landing-page`
3. Set **Dockerfile Path** to `apps/landing-page/Dockerfile`

### Set environment variables

```env
# The landing page fetches featured projects from the API
NEXT_PUBLIC_API_URL=https://your-api-url.up.railway.app/api/v1

NODE_ENV=production
PORT=3000
```

### Deploy

```bash
railway up -s landing-page -d
```

---

## Step 6: Update CORS and URLs

Now that all three services are deployed and have URLs, go back to the **API** service and update:

```env
CORS_ORIGIN=https://your-web-app.up.railway.app,https://your-landing-page.up.railway.app
WEB_APP_URL=https://your-web-app.up.railway.app
```

If you're using custom domains:

```env
CORS_ORIGIN=https://app.tokamakforest.com,https://tokamakforest.com
WEB_APP_URL=https://app.tokamakforest.com
NEXT_PUBLIC_API_URL=https://api.tokamakforest.com/api/v1
```

Restart the API service after updating these.

---

## Redeploying After Code Changes

Push to your GitHub branch and Railway auto-deploys. Or deploy manually:

```bash
# Deploy API
railway up -s api -d

# Deploy Web App
railway up -s web -d

# Deploy Landing Page
railway up -s landing-page -d

# Deploy all three at once
railway up -s api -d && railway up -s web -d && railway up -s landing-page -d
```

---

## Monitoring

- **Logs:** Railway dashboard → click on a service → **Logs** tab
- **Metrics:** Railway dashboard → service → **Metrics** tab (CPU, memory, network)
- **Health check:** `curl https://your-api-url/health`
- **API docs:** `https://your-api-url/docs`

---

## Custom Domains (DNS Setup)

If you want custom domains like `api.tokamakforest.com`:

1. In Railway, go to the service → **Settings** → **Networking** → **Custom Domain**
2. Enter your domain (e.g. `api.tokamakforest.com`)
3. Railway gives you a CNAME target (something like `abc123.up.railway.app`)
4. In your DNS provider, add a CNAME record:

```
Type: CNAME
Name: api
Value: abc123.up.railway.app
TTL: 300
```

5. Wait for DNS propagation (usually a few minutes)
6. Railway auto-provisions an SSL certificate

Repeat for each service (`app.tokamakforest.com`, `tokamakforest.com`, etc.).

---

## Cost Estimate

Railway pricing is usage-based. Rough estimates for this project:

| Service | Approximate Cost |
|---------|-----------------|
| API (NestJS) | ~$5-10/mo |
| Web (Next.js) | ~$3-5/mo |
| Landing Page | ~$2-3/mo |
| PostgreSQL | ~$5-10/mo |
| Redis | ~$3-5/mo |
| Qdrant | ~$5-10/mo |
| **Total** | **~$23-43/mo** |

Actual costs depend on traffic and data volume. Railway's hobby plan ($5/mo) covers light usage. For production, the Pro plan ($20/mo base) gives more resources.

---

## Quick Reference

| Task | Command |
|------|---------|
| Login to Railway | `railway login` |
| Link to project | `railway link` |
| Deploy API | `railway up -s api -d` |
| Deploy Web | `railway up -s web -d` |
| Deploy Landing Page | `railway up -s landing-page -d` |
| View logs | `railway logs -s api` |
| Open dashboard | `railway open` |
| Check status | `railway status` |

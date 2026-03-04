# How to Run Locally (Step by Step)

[← Back to Index](./README.md) | [Deploy to Railway →](./05b-deploy-to-railway.md)

---

## What You Need Installed

Before anything else, make sure you have these on your machine:

| Tool | Minimum Version | How to Check | How to Install |
|------|----------------|--------------|----------------|
| **Node.js** | 20+ | `node -v` | [nodejs.org](https://nodejs.org) |
| **pnpm** | 9+ | `pnpm -v` | `npm i -g pnpm` |
| **Docker** | Any recent | `docker -v` | [docker.com](https://www.docker.com/get-started) |
| **Git** | Any | `git -v` | [git-scm.com](https://git-scm.com) |

---

## Step 1: Clone the Repo

```bash
git clone https://github.com/tokamak-network/tokamak-network-pilot.git
cd tokamak-network-pilot
```

## Step 2: Install Dependencies

```bash
pnpm install
```

This installs dependencies for all apps and packages in the monorepo at once.

## Step 3: Start the Infrastructure

The project needs three services running: PostgreSQL, Qdrant (vector DB), and Redis. Docker Compose handles all of them:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on `localhost:5432` (database: `tokamak_pilot`, user: `postgres`, password: `postgres`)
- **Qdrant** on `localhost:6333` (REST API) and `localhost:6334` (gRPC)
- **Redis** on `localhost:6380` (mapped from 6379 inside the container to avoid conflicts)

To verify everything is running:

```bash
docker compose ps
```

You should see three containers (`tokamak-postgres`, `tokamak-qdrant`, `tokamak-redis`) all in "running" state.

## Step 4: Set Up Environment Variables

```bash
cp .env.example .env
```

Now open `.env` and fill in the required values. At minimum, you need:

```env
OPENAI_API_KEY=sk-your-openai-key-here
```

Everything else has working defaults for local development. Optional but useful:

```env
# If you want to ingest GitHub repos
GITHUB_TOKEN=ghp_your-github-token-here

# If you want to use Anthropic instead of OpenAI
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# LLM_PROVIDER=anthropic
```

**Note:** You don't need `RESEND_API_KEY` for local dev. Without it, the login system accepts any email and the OTP code is always `123456`.

## Step 5: Start Everything

```bash
pnpm dev
```

This starts all three apps in parallel:

| App | URL | What It Is |
|-----|-----|-----------|
| **API** | http://localhost:4000 | Backend REST API |
| **API Docs** | http://localhost:4000/docs | Swagger UI |
| **Web App** | http://localhost:3000 | Main frontend |
| **Landing Page** | http://localhost:3002 | Marketing site |

## Step 6: Log In for the First Time

1. Go to http://localhost:3000
2. Enter any email (e.g. `test@tokamak.network`)
3. Enter OTP code: `123456`
4. You're in!

On first startup with `AUTO_SEED_ON_STARTUP=true` (the default), the system will automatically start ingesting repos from the `tokamak-network` GitHub org. This takes a few minutes depending on how many repos there are.

---

## Running Individual Apps

If you only need one app running:

```bash
# Only the API
pnpm --filter @tokamak-pilot/api dev

# Only the web app
pnpm --filter @tokamak-pilot/web dev

# Only the landing page
pnpm --filter @tokamak-pilot/landing-page dev
```

## Stopping Everything

```bash
# Stop the Node apps: Ctrl+C in the terminal running pnpm dev

# Stop the infrastructure (Postgres, Qdrant, Redis)
docker compose down

# Stop infrastructure AND delete all data (fresh start)
docker compose down -v
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pnpm install` fails | Make sure you're on Node 20+ and pnpm 9+ |
| Can't connect to database | Run `docker compose ps` to check containers are running |
| Port 4000 already in use | Change `API_PORT` in `.env` or kill the process using that port |
| Port 3000 already in use | Kill whatever's using port 3000, or change the web app's port |
| Redis connection refused | Make sure Redis is on port `6380` (not 6379) — check `REDIS_URL` in `.env` |
| No answers from the AI | Check that `OPENAI_API_KEY` is set correctly in `.env` |
| GitHub ingestion not working | Make sure `GITHUB_TOKEN` is set and has repo read access |

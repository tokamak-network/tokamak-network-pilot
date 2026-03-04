# Environment Variables

[← Back to Index](./README.md)

---

The `.env.example` at the root contains all required variables. Here's what matters:

## Must-Have for Development

| Variable | What It Does | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | LLM + embeddings | (none — required) |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:postgres@localhost:5432/tokamak_pilot` |
| `REDIS_URL` | Redis for BullMQ | `redis://localhost:6380` |
| `QDRANT_URL` | Vector database | `http://localhost:6333` |
| `JWT_SECRET` | Signs JWTs | `change-me-in-production` |

## Nice-to-Have for Development

| Variable | What It Does | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub API access for ingesting repos | (none — needed for GitHub sources) |
| `ANTHROPIC_API_KEY` | Use Anthropic instead of OpenAI | (none) |
| `RESEND_API_KEY` | Send real OTP emails | (none — dev mode uses code `123456`) |
| `AUTO_SEED_ON_STARTUP` | Auto-ingest on first run | `true` |

## Production-Critical

| Variable | Notes |
|----------|-------|
| `JWT_SECRET` | **Must be changed** from the default |
| `CORS_ORIGIN` | Set to your actual domains |
| `DB_SYNC` | Set to `false` in production (TypeORM synchronize) |
| `RESEND_API_KEY` | Required for real email OTPs |
| `EMAIL_FROM_DOMAIN` | Must be verified in Resend |

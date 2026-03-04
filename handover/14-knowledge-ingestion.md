# Knowledge Ingestion

[← Back to Index](./README.md)

---

## Source Types

| Type | How It Works |
|------|-------------|
| **GitHub Repo** | Fetches README, docs, code files via GitHub API |
| **GitHub Org** | Fetches all repos in an organization |
| **Website** | Crawls pages (same-origin, configurable depth/limits) using Cheerio |
| **File Upload** | Accepts PDF, DOCX, Markdown, TXT, CSV — parses and ingests |

## Ingestion Pipeline

1. **Fetch** — raw content retrieved from the source
2. **Chunk** — content split using LangChain's `RecursiveCharacterTextSplitter` (1000 chars, 200 overlap)
3. **Embed** — chunks embedded in batches (up to 100 per batch) via OpenAI
4. **Store** — vectors upserted to Qdrant, metadata stored in PostgreSQL `documents` table

## Auto-Seeding

On startup, if `AUTO_SEED_ON_STARTUP=true`, the bootstrap service automatically creates sources from `GITHUB_ORGS` and `GITHUB_REPOS` environment variables and enqueues them for ingestion via BullMQ.

# Backend (API) Deep Dive

[← Back to Index](./README.md)

---

**Location:** `apps/api/`
**Framework:** NestJS 11
**Entry point:** `src/main.ts`
**Module registry:** `src/app.module.ts`

## Module Overview

The API is organized into ~24 NestJS modules. Here are the important ones:

| Module | What It Does |
|--------|-------------|
| `rag/` | The core — question answering and search (vector search + LLM) |
| `ingestion/` | Processes sources into chunks, embeds them, stores in Qdrant |
| `sources/` | CRUD for knowledge sources (GitHub repos, websites, files) |
| `vector/` | Qdrant client wrapper |
| `embedding/` | OpenAI embedding API wrapper |
| `llm/` | OpenAI/Anthropic chat completion wrapper |
| `github/` | GitHub API integration (fetch repos, orgs) |
| `crawler/` | Website crawler (Cheerio-based, same-origin) |
| `auth/` | OTP-based email authentication + JWT |
| `api-keys/` | API key management for the public API |
| `public-api/` | Public-facing API endpoints (X-API-Key auth) |
| `conversations/` | Chat conversation history |
| `projects/` | Multi-project management, teams, invitations |
| `content/` | Curated content entries |
| `feedback/` | User feedback on answers (thumbs up/down) |
| `roadmap/` | AI-assisted roadmap from feedback |
| `snippets/` | Code snippet library |
| `news/` | Google News aggregation per project |
| `widget/` | Embeddable chat widget (serves `widget.js`) |
| `export/` | JSON/Markdown export |
| `llms-txt/` | `/llms.txt` and `/llms-full.txt` endpoints |
| `file-upload/` | File upload + parsing (PDF, DOCX, MD, CSV, TXT) |

## Key API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | None | Health check |
| `POST` | `/api/v1/ask` | JWT | Ask a question (RAG) |
| `POST` | `/api/v1/ask/stream` | JWT | Ask with streaming (SSE) |
| `GET` | `/api/v1/ask/search` | JWT | Semantic search |
| `POST` | `/api/v1/auth/request-otp` | None | Request OTP email |
| `POST` | `/api/v1/auth/verify-otp` | None | Verify OTP → get JWT |
| `GET/POST` | `/api/v1/sources/*` | JWT | Source management |
| `GET/POST` | `/api/v1/content/*` | JWT | Content management |
| `GET/POST` | `/api/v1/conversations/*` | JWT | Conversations |
| `GET/POST` | `/api/v1/projects/*` | JWT | Project management |
| `POST` | `/api/v1/public/ask` | API Key | Public ask endpoint |
| `GET` | `/api/v1/public/search` | API Key | Public search |
| `GET` | `/docs` | None | Swagger UI |

Full API reference: `docs/API_REFERENCE_PUBLIC.md` and Swagger at `/docs`.

## Database Access

TypeORM with repository pattern. Entities are in `src/entities/`. The database schema auto-syncs in development (`synchronize: true`). **There are no migration files** — schema changes happen through entity modifications.

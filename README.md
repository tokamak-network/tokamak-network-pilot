# Tokamak Pilot

**RAG-powered knowledge hub for the Tokamak Network ecosystem.**

A single place where anyone can ask a question about Tokamak and get a reliable, sourced answer. Project leaders and team members can update content when things get outdated. Exposed via UI, API, and SDK so the entire team can plug into it whenever they need product knowledge or contextual answers.

---

## Architecture

```
tokamak-network-pilot/
├── apps/
│   ├── api/              # NestJS backend (REST API, RAG pipeline, auth)
│   └── web/              # Next.js frontend (chat UI, content management)
├── packages/
│   ├── shared/           # Shared TypeScript types, constants, utilities
│   ├── sdk/              # TypeScript SDK for external consumers
│   └── eslint-config/    # Shared ESLint configuration
├── turbo.json            # Turborepo task orchestration
├── pnpm-workspace.yaml   # pnpm workspace definition
└── .env.example          # Environment variable template
```

## Tech Stack

| Layer         | Technology               |
| ------------- | ------------------------ |
| Frontend      | Next.js 15, React 19, Tailwind CSS 4 |
| Backend       | NestJS 11, Swagger/OpenAPI |
| Knowledge     | RAG pipeline (LLM + vector search)    |
| Vector DB     | Qdrant / Pinecone / pgvector           |
| Database      | PostgreSQL                              |
| Cache/Queue   | Redis                                   |
| Monorepo      | pnpm workspaces + Turborepo             |
| SDK           | `@tokamak-pilot/sdk` (TypeScript)       |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Setup

```bash
# Clone the repo
git clone https://github.com/tokamak-network/tokamak-network-pilot.git
cd tokamak-network-pilot

# Install all dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys and config

# Run everything (API + Frontend) with one command
pnpm dev
```

This starts:
- **API** at `http://localhost:4000` (Swagger docs at `http://localhost:4000/docs`)
- **Web** at `http://localhost:3000`

### Individual Commands

```bash
# Run only the API
pnpm --filter @tokamak-pilot/api dev

# Run only the frontend
pnpm --filter @tokamak-pilot/web dev

# Build everything
pnpm build

# Lint everything
pnpm lint
```

## Knowledge Sources

The system can ingest knowledge from multiple source types:

| Source Type      | Description                              | Status     |
| ---------------- | ---------------------------------------- | ---------- |
| GitHub Repos     | Code, docs, issues, PRs from repos       | Done       |
| GitHub Org       | All repos in a GitHub organization        | Done       |
| Documentation    | External documentation URLs               | Planned    |
| File Uploads     | PDF, Markdown, TXT file uploads           | Planned    |
| Notion           | Notion workspace pages                    | Planned    |
| Custom / Webhook | Custom API-based sources                  | Planned    |

## API Endpoints

| Method | Path                 | Description                        |
| ------ | -------------------- | ---------------------------------- |
| POST   | `/api/v1/ask`        | Ask a question (RAG pipeline)      |
| GET    | `/api/v1/ask/search` | Semantic search                    |
| GET    | `/api/v1/sources`    | List knowledge sources             |
| POST   | `/api/v1/sources`    | Add a knowledge source             |
| POST   | `/api/v1/sources/:id/sync` | Trigger re-indexing           |
| GET    | `/api/v1/content`    | List curated content entries       |
| POST   | `/api/v1/content`    | Create content entry               |
| PUT    | `/api/v1/content/:id`| Update content entry               |
| POST   | `/api/v1/auth/login` | Authenticate                       |
| GET    | `/api/v1/health`     | Health check                       |

Full interactive docs at `http://localhost:4000/docs` (Swagger).

## SDK Usage

```typescript
import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: 'http://localhost:4000/api/v1',
  token: 'optional-jwt-token',
});

// Ask a question
const { answer, sources } = await pilot.ask('How does TON staking work?');

// Semantic search
const results = await pilot.search('Layer 2 rollup architecture');

// List sources
const { sources: knowledgeSources } = await pilot.listSources();
```

## Roadmap

- [x] GitHub RAG ingestion pipeline
- [x] Vector database integration (Qdrant)
- [x] LLM integration (OpenAI / Anthropic)
- [ ] Content management CRUD with auth
- [ ] File upload and document parsing
- [ ] Notion integration
- [ ] Conversation history / follow-ups
- [ ] SDK publishing to npm
- [x] Docker Compose for local infra
- [ ] CI/CD pipeline

## License

MIT

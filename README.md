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

## Documentation & Examples

- **[docs/](docs/)** — Developer documentation:
  - [Developer Guide](docs/DEVELOPER_GUIDE.md) — Auth, Public API vs internal, architecture
  - [Examples](docs/EXAMPLES.md) — SDK and cURL examples (ask, stream, search, sources, content)
  - [Public API Reference](docs/API_REFERENCE_PUBLIC.md) — Endpoints and scopes
  - [Website crawl](docs/WEBSITE_CRAWL.md) — Add website URLs as knowledge sources (crawl + ingest)
  - [MCP Server](docs/MCP.md) — Use from Cursor / Claude Desktop
- **[packages/sdk/README.md](packages/sdk/README.md)** — TypeScript SDK install, config, and methods
- **[examples/](examples/)** — Runnable examples and integration demos:

### Simple Scripts (raw `fetch`, no SDK)

| Script | Description |
|--------|-------------|
| [`node-health.mjs`](examples/node-health.mjs) | Health check |
| [`node-ask.mjs`](examples/node-ask.mjs) | Ask a question (RAG) |
| [`node-stream.mjs`](examples/node-stream.mjs) | Stream an answer via SSE |
| [`node-search.mjs`](examples/node-search.mjs) | Semantic search |
| [`node-sources-content.mjs`](examples/node-sources-content.mjs) | List sources and content |
| [`node-projects.mjs`](examples/node-projects.mjs) | List and get projects |

### Integration Examples

Full project examples showing real-world integrations. Each is a standalone project inside `examples/`.

| # | Example | Stack | Description | Status |
|---|---------|-------|-------------|--------|
| 1 | [`widget-embed/`](examples/widget-embed/) | HTML, CSS | Embed the Tokamak chat widget on any website with a single `<script>` tag. Shows light/dark themes, position options, and project-scoped chat. | Done |
| 2 | [`nextjs-chat/`](examples/nextjs-chat/) | Next.js 15, React 19, SDK | Full Next.js app with a chat component using SDK streaming, server actions, conversation history, and project-scoped Q&A. | Done |
| 3 | [`discord-bot/`](examples/discord-bot/) | discord.js, SDK | Discord bot that answers Tokamak questions in channels. Supports `/ask`, `/search`, and threaded follow-ups. | Planned |
| 4 | [`telegram-bot/`](examples/telegram-bot/) | grammy, SDK | Telegram bot for Q&A. Supports inline queries, streaming replies, and project-scoped answers. | Planned |
| 5 | [`slack-bot/`](examples/slack-bot/) | Slack Bolt, SDK | Slack app that brings Tokamak knowledge into workspaces. Supports slash commands, app mentions, and threaded conversations. | Planned |
| 6 | [`cli-tool/`](examples/cli-tool/) | Node.js, SDK | Interactive terminal Q&A tool. Ask questions, search, browse projects — all from the command line. | Planned |

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
| **Website crawl**| Crawl a URL (single or multi-page, same-origin) | Done   |
| Documentation    | External documentation URLs               | Planned    |
| File Uploads     | PDF, Markdown, TXT, DOCX, CSV file uploads | Done       |
| Custom / Webhook | Custom API-based sources                  | Planned    |

## API Endpoints

| Method | Path                        | Description                          | Auth   |
| ------ | --------------------------- | ------------------------------------ | ------ |
| POST   | `/api/v1/ask`               | Ask a question (RAG pipeline)        | —      |
| GET    | `/api/v1/ask/search`        | Semantic search                      | —      |
| GET    | `/api/v1/sources`           | List knowledge sources               | JWT    |
| POST   | `/api/v1/sources`           | Add a knowledge source               | JWT    |
| POST   | `/api/v1/sources/crawl`     | Crawl a website URL and add as source | JWT  |
| POST   | `/api/v1/sources/:id/sync`  | Trigger re-indexing                  | JWT    |
| GET    | `/api/v1/content`           | List curated content entries         | —      |
| POST   | `/api/v1/content`           | Create content entry                 | JWT    |
| PUT    | `/api/v1/content/:id`       | Update content entry                 | JWT    |
| DELETE | `/api/v1/content/:id`       | Delete content entry                 | JWT    |
| GET    | `/api/v1/projects`              | List all projects                    | —      |
| POST   | `/api/v1/projects`              | Create a project                     | JWT    |
| GET    | `/api/v1/projects/:idOrSlug`    | Get project details                  | —      |
| PUT    | `/api/v1/projects/:id`          | Update a project                     | JWT    |
| DELETE | `/api/v1/projects/:id`          | Delete a project                     | JWT    |
| GET    | `/api/v1/projects/:id/sources`  | List project sources                 | —      |
| POST   | `/api/v1/projects/:id/sources`  | Assign source to project             | JWT    |
| DELETE | `/api/v1/projects/:id/sources/:sourceId` | Remove source from project | JWT    |
| GET    | `/api/v1/projects/:id/members`  | List project team members            | —      |
| POST   | `/api/v1/projects/:id/members`  | Add team member                      | JWT    |
| PUT    | `/api/v1/projects/:id/members/:userId` | Update member role           | JWT    |
| DELETE | `/api/v1/projects/:id/members/:userId` | Remove team member           | JWT    |
| POST   | `/api/v1/projects/:id/summary`  | Generate AI project summary          | JWT    |
| GET    | `/api/v1/projects/:slug/public` | Public project overview              | —      |
| GET    | `/api/v1/projects/:id/dashboard`| Project dashboard with stats         | JWT    |
| GET    | `/api/v1/export/content/:id`| Export content as JSON/Markdown       | —      |
| GET    | `/api/v1/export/project/:idOrSlug` | Export project as JSON/Markdown | —      |
| POST   | `/api/v1/export/answer`     | Export RAG answer as JSON/Markdown    | —      |
| POST   | `/api/v1/export/prompt`     | Format content as AI-ready prompt     | —      |
| GET    | `/api/v1/openapi.json`      | Download OpenAPI spec (JSON)          | —      |
| GET    | `/api/v1/openapi.yaml`      | Download OpenAPI spec (YAML)          | —      |
| GET    | `/api/v1/snippets`          | List code snippets                    | —      |
| GET    | `/api/v1/snippets/:id`      | Get a snippet                         | —      |
| POST   | `/api/v1/snippets`          | Create a snippet                      | JWT    |
| POST   | `/api/v1/snippets/generate` | AI-generate a snippet from prompt     | JWT    |
| POST   | `/api/v1/snippets/:id/copy` | Track snippet copy event              | —      |
| PUT    | `/api/v1/snippets/:id`      | Update a snippet                      | JWT    |
| DELETE | `/api/v1/snippets/:id`      | Delete a snippet                      | JWT    |
| GET    | `/api/v1/snippets/languages`| List available languages              | —      |
| GET    | `/api/v1/snippets/categories`| List available categories            | —      |
| POST   | `/api/v1/feedback`          | Submit feedback (thumbs up/down)      | JWT    |
| GET    | `/api/v1/feedback/message/:id` | Get your feedback for a message    | JWT    |
| GET    | `/api/v1/feedback/stats`    | Get feedback statistics               | JWT    |
| GET    | `/api/v1/feedback/suggested-questions` | Get suggested questions      | —      |
| POST   | `/api/v1/projects/:slug/public-feedback` | Submit public project feedback | — |
| GET    | `/api/v1/projects/:idOrSlug/feedback` | List project feedback inbox | JWT |
| PUT    | `/api/v1/projects/:idOrSlug/feedback/:feedbackId` | Update feedback status/note | JWT |
| POST   | `/api/v1/projects/:idOrSlug/roadmap/ai-draft` | Queue AI feedback→roadmap draft | JWT |
| GET    | `/api/v1/projects/:idOrSlug/roadmap/pipeline` | Pipeline status counts | JWT |
| GET    | `/api/v1/projects/:idOrSlug/roadmap` | List roadmap items | JWT |
| POST   | `/api/v1/projects/:idOrSlug/roadmap` | Create roadmap item | JWT |
| PUT    | `/api/v1/projects/:idOrSlug/roadmap/:itemId` | Update roadmap item | JWT |
| POST   | `/api/v1/projects/:idOrSlug/roadmap/:itemId/task-prompts` | Generate AI task prompt | JWT |
| GET    | `/api/v1/projects/:idOrSlug/roadmap/:itemId/task-prompts` | List generated prompts | JWT |
| GET    | `/api/v1/changelog`         | Get API changelog / release notes     | —      |
| GET    | `/api/v1/changelog/latest`  | Get latest changelog entry            | —      |
| GET    | `/api/v1/changelog/:version`| Get changelog for specific version    | —      |
| GET    | `/llms.txt`                 | Brief LLM knowledge file             | —      |
| GET    | `/llms-full.txt`            | Full LLM knowledge file              | —      |
| GET    | `/widget.js`                | Embeddable chat widget script         | —      |
| POST   | `/api/v1/auth/request-otp`  | Request OTP login code               | —      |
| POST   | `/api/v1/auth/verify-otp`   | Verify OTP → JWT token               | —      |
| GET    | `/api/v1/auth/me`           | Get current user profile             | JWT    |
| GET    | `/api/v1/health`            | Health check                         | —      |

Full interactive docs at `http://localhost:4000/docs` (Swagger) or `https://api.tokamakforest.com/docs` (production).

## SDK Usage

```typescript
import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: 'https://api.tokamakforest.com/api/v1',
  apiKey: 'your-api-key',
});

// Ask a question
const { answer, sources } = await pilot.ask('How does TON staking work?');

// Semantic search
const results = await pilot.search('Layer 2 rollup architecture');

// List sources
const { sources: knowledgeSources } = await pilot.listSources();
```

## Roadmap

### Completed

- [x] GitHub RAG ingestion pipeline (repos + orgs)
- [x] Vector database integration (Qdrant)
- [x] LLM integration (OpenAI / Anthropic)
- [x] Auto-seed from `GITHUB_ORGS` / `GITHUB_REPOS` on startup
- [x] Content management CRUD with auth (OTP email login, `@tokamak.network` only)
- [x] File upload and document parsing (PDF, MD, TXT, DOCX, CSV)
- [x] Conversation history / follow-ups
- [x] Docker Compose for local infra
- [x] Dashboard analytics (KPIs, ingestion status, content breakdown)
- [x] API key management (create, rotate, revoke, scopes, usage logs)
- [x] Public API with rate limiting (`X-API-Key` auth)
- [x] TypeScript SDK (`@tokamak-pilot/sdk`)
- [x] Custom API docs page with copy-to-clipboard on code blocks

---

### Phase 1 — Project Management & Team Collaboration

> Let teams organize knowledge by project, assign repos, and collaborate.

- [x] **Project entity & CRUD** — Create, update, delete projects with name, description, logo, and links
- [x] **Project ↔ Source mapping** — Assign one or more GitHub repos / knowledge sources to a project
- [x] **Project summary & introduction** — Auto-generated AI summary of a project based on its assigned sources; editable by project leads
- [x] **Team members per project** — Invite and assign team members to projects with roles (lead, contributor, viewer)
- [x] **Project dashboard** — Per-project view showing assigned repos, content entries, ingestion status, and team
- [x] **Project-scoped chat** — Ask questions scoped to a specific project's knowledge only
- [x] **Project overview page (public)** — Public-facing project page with summary, links, team, and key docs

---

### Phase 2 — AI-Friendly Output & Integrations

> Make knowledge consumable by other AI tools and agents.

- [x] **`llms.txt` endpoint** — Serve a standardized `llms.txt` file at `/llms.txt` and `/llms-full.txt` following the [llms.txt spec](https://llmstxt.org/), so LLMs and AI agents can discover and consume Tokamak knowledge
- [x] **Structured export (JSON/Markdown)** — Export any answer, content entry, or project summary as structured JSON or Markdown for use in other tools
- [x] **One-click copy as AI prompt** — Copy button on docs/answers that formats content as a ready-to-paste prompt (with context, sources, and instructions)
- [x] **OpenAPI spec download** — One-click download of the full OpenAPI JSON/YAML spec from the docs page
- [x] **Embeddable widget** — JavaScript snippet that others can embed on their sites to add a "Ask about Tokamak" chat widget

---

### Phase 3 — MCP Server (Model Context Protocol)

> Expose Tokamak Pilot as an MCP server so any AI assistant (Cursor, Claude Desktop, etc.) can use it as a tool.

- [x] **MCP server package** — New package `packages/mcp-server` implementing the [Model Context Protocol](https://modelcontextprotocol.io/)
- [x] **MCP Tools:**
  - `tokamak_ask` — Ask a question about Tokamak Network, returns answer with sources
  - `tokamak_search` — Semantic search across all indexed knowledge
  - `tokamak_list_projects` — List all projects with summaries
  - `tokamak_get_project` — Get project details, team, and linked sources
  - `tokamak_list_sources` — List knowledge sources and their status
  - `tokamak_get_content` — Get a specific curated content entry
  - `tokamak_list_content` — Browse curated content by project or category
- [x] **MCP Resources:**
  - `tokamak://projects` — List of all projects
  - `tokamak://projects/{id}` — Project details and summary
  - `tokamak://sources` — List of knowledge sources
  - `tokamak://content/{id}` — Curated content entry
- [x] **MCP Prompts:**
  - `explain-project` — Pre-built prompt to explain a Tokamak project
  - `compare-projects` — Compare two projects side by side
  - `summarize-source` — Summarize a knowledge source
- [ ] **Distribution** — Publish as npm package, add to MCP server registries, document setup for Cursor / Claude Desktop

---

### Phase 4 — Enhanced Docs & Developer Experience

> Make the docs page a best-in-class developer experience.

- [x] **Interactive API playground** — Try API calls directly from the docs page (like Swagger, but integrated into the custom docs UI)
- [x] **Multi-language code examples** — Show examples in cURL, JavaScript, Python, Go, and Rust with language tabs
- [x] **SDK code generator** — Auto-generate SDK usage snippets from the docs page based on selected endpoint + parameters
- [x] **Changelog / release notes** — Track API changes and display them in the docs
- [x] **Webhook documentation** — When webhooks are added, auto-document event payloads and provide testing tools
- [x] **Rate limit dashboard** — Show API key usage, remaining quota, and rate limit status in the docs page

---

### Phase 5 — Additional Knowledge Sources

> Ingest knowledge from more platforms.

- [ ] **External documentation URLs** — Crawl and ingest docs sites (GitBook, Docusaurus, ReadTheDocs, etc.)
- [ ] **Webhook / custom source** — Accept real-time content pushes via webhook
- [ ] **Google Docs / Drive** — Sync documents from Google Workspace

---

### Phase 6 — Quality, Feedback & Analytics

> Improve answer quality and understand usage patterns.

- [x] **Answer feedback** — Thumbs up/down on AI answers with optional comment; store for quality tracking
- [x] **Suggested questions** — Show popular or recommended questions on the home page
- [ ] **Answer quality metrics** — Track confidence scores, feedback ratios, and unanswered questions over time
- [ ] **Search analytics** — Log popular queries, zero-result queries, and trending topics
- [ ] **Content freshness alerts** — Auto-detect when indexed content is outdated (repo updated but not re-synced)
- [ ] **Query caching** — Cache frequent queries for faster responses and lower LLM costs

---

### Phase 7 — Developer Tools

> Give developers the code they need, fast.

- [x] **Code Snippets Library** — Searchable, filterable collection of ready-to-use code examples with syntax highlighting, copy tracking, and language/category filters
- [x] **AI Snippet Generation** — Describe what you need in plain English and the AI generates working code using real Tokamak APIs from the indexed knowledge base
- [ ] **Interactive Code Playground** — Run TypeScript/JavaScript snippets in-browser with Tokamak SDK pre-loaded
- [ ] **CLI Tool** — `npx @tokamak-pilot/cli ask "How do I deploy?"` — query the knowledge base from the terminal

---

### Phase 8 — Infrastructure & DevOps

> Production readiness and operational excellence.

- [ ] **CI/CD pipeline** — GitHub Actions for lint, test, build, and deploy
- [ ] **SDK publishing to npm** — Automated npm publish for `@tokamak-pilot/sdk`
- [x] **Streaming responses** — Stream RAG answers token-by-token via SSE for faster perceived response
- [ ] **Kubernetes / Docker deployment** — Production-ready Helm chart or Docker Compose with health checks, resource limits
- [ ] **Monitoring & alerting** — Prometheus metrics, Grafana dashboards, PagerDuty/Slack alerts
- [ ] **Backup & disaster recovery** — Automated PostgreSQL + Qdrant backups
- [ ] **Multi-environment config** — Staging, production environment management
- [ ] **E2E tests** — Playwright tests for the web app, API integration tests

---

### Phase 9 — Feedback → Roadmap → AI Tasks

> Turn user feedback into a structured product execution pipeline.

- [x] **Public project feedback inbox** — Anyone can submit public feedback on project pages (`/projects/:slug/public-feedback`)
- [x] **Feedback triage workflow** — Maintainers can review and classify project feedback (`new`, `reviewed`, `planned`, `rejected`)
- [x] **AI roadmap draft pipeline** — Background job converts feedback into proposed roadmap items
- [x] **Roadmap item management** — Create/update roadmap items with status, priority, effort, and linked feedback
- [x] **AI task prompt generation** — Convert roadmap items into implementation-ready AI prompts + task checklists
- [x] **Web workspace** — New project roadmap page to manage the full pipeline end-to-end

---

### MCP Server Architecture (Reference)

The MCP server will wrap the existing Public API and expose it via the Model Context Protocol:

```
┌─────────────────────────────────────────────┐
│  AI Assistant (Cursor / Claude Desktop)      │
│  ─ discovers tools via MCP handshake         │
└──────────────┬──────────────────────────────┘
               │  stdio / SSE
┌──────────────▼──────────────────────────────┐
│  packages/mcp-server                         │
│  ├── tools/     (ask, search, list, get)     │
│  ├── resources/ (projects, sources, content) │
│  └── prompts/   (explain, compare, summarize)│
└──────────────┬──────────────────────────────┘
               │  HTTP (X-API-Key)
┌──────────────▼──────────────────────────────┐
│  apps/api  (Public API)                      │
│  /api/v1/public/*                            │
└─────────────────────────────────────────────┘
```

The MCP server will:
1. Use `@modelcontextprotocol/sdk` to implement the MCP protocol
2. Authenticate to the Tokamak Pilot API using an API key
3. Translate MCP tool calls into Public API requests
4. Return structured results that AI assistants can reason over
5. Support both `stdio` transport (for Cursor/Claude Desktop) and `SSE` transport (for web-based clients)

**Configuration (for users):**
```json
{
  "mcpServers": {
    "tokamak-pilot": {
      "command": "npx",
      "args": ["@tokamak-pilot/mcp-server"],
      "env": {
        "TOKAMAK_PILOT_API_URL": "https://api.tokamakforest.com/api/v1",
        "TOKAMAK_PILOT_API_KEY": "your-api-key"
      }
    }
  }
}
```

# Redeploy API
railway up -s api -d

# Redeploy Web
railway up -s web -d

# Redeploy Landing Page
railway up -s landing-page -d

## License

MIT

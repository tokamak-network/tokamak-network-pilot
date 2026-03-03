# Tokamak Pilot — Examples

Runnable examples and integration demos for the Tokamak Pilot API and SDK.

---

## 1. Simple Scripts

Standalone Node.js scripts that call the Public API with `fetch`. No SDK dependency; run from repo root with Node 18+.

### Setup

```bash
export TOKAMAK_PILOT_API_URL=https://api.tokamakforest.com/api/v1
export TOKAMAK_PILOT_API_KEY=your-api-key
```

For local API:

```bash
export TOKAMAK_PILOT_API_URL=http://localhost:4000/api/v1
export TOKAMAK_PILOT_API_KEY=your-key
```

### Scripts

| Script | Description |
|--------|-------------|
| `node-health.mjs` | GET /public/health — print status |
| `node-ask.mjs` | POST /public/ask — ask a question, print answer and sources |
| `node-stream.mjs` | POST /public/ask/stream — stream answer to stdout |
| `node-search.mjs` | GET /public/search — semantic search, print results |
| `node-sources-content.mjs` | GET /public/sources and /public/content — list sources and content |
| `node-projects.mjs` | GET /projects and GET /projects/:slug — list projects, get one (no API key) |

### Run

```bash
node examples/node-health.mjs
node examples/node-ask.mjs
node examples/node-stream.mjs
node examples/node-search.mjs
node examples/node-sources-content.mjs
```

Optional: pass a question or query as the first argument where applicable:

```bash
node examples/node-ask.mjs "How does TON staking work?"
node examples/node-search.mjs "staking rewards"
```

---

## 2. Integration Examples

Full project examples showing how to integrate Tokamak Pilot into real-world applications. Each is a standalone project with its own `package.json` and README.

### Creation Order

| # | Example | Stack | Description | Status |
|---|---------|-------|-------------|--------|
| 1 | [`widget-embed/`](widget-embed/) | HTML, CSS | Embed the Tokamak chat widget on any website with a single `<script>` tag. Demos for light/dark themes, position options, and project-scoped chat. | Done |
| 2 | [`nextjs-chat/`](nextjs-chat/) | Next.js 15, React 19, SDK | Full Next.js app with a chat component using SDK streaming, server actions, conversation history, and project-scoped Q&A. Shows how to integrate Tokamak knowledge into any Next.js project. | Done |
| 3 | [`discord-bot/`](discord-bot/) | discord.js, SDK | Discord bot that answers Tokamak questions in channels. Supports `/ask` and `/search` slash commands, threaded follow-ups, and source citations. | Planned |
| 4 | [`telegram-bot/`](telegram-bot/) | grammy, SDK | Telegram bot for Tokamak Q&A. Supports inline queries, streaming replies, and project-scoped answers. | Planned |
| 5 | [`slack-bot/`](slack-bot/) | Slack Bolt, SDK | Slack app that brings Tokamak knowledge into workspaces. Supports `/ask` slash command, `@mention` replies, and threaded conversations. | Planned |
| 6 | [`cli-tool/`](cli-tool/) | Node.js, SDK | Interactive terminal Q&A tool. Ask questions, search the knowledge base, browse projects — all from the command line with streaming output. | Planned |

### What each example demonstrates

**Widget Embed** — The simplest integration. Drop a `<script>` tag on any HTML page and get a floating chat widget. No build tools, no framework. Great for marketing sites, docs, or landing pages.

**Next.js Chat** — The reference frontend integration. Shows how to build a chat component with:
- Server Actions for API calls (keeps API key server-side)
- SSE streaming for real-time answer display
- Conversation history with follow-up questions
- Project-scoped chat (ask about a specific project)
- Responsive design with Tailwind CSS

**Discord Bot** — Community-facing integration. A Discord bot that lets community members ask Tokamak questions directly in Discord. Shows:
- Slash command registration (`/ask`, `/search`)
- Embed formatting with source citations
- Thread-based follow-up conversations
- Error handling and rate limiting

**Telegram Bot** — Another chat platform integration. Similar to Discord but for Telegram:
- Bot commands (`/ask`, `/search`)
- Inline query support (type `@bot query` anywhere)
- Markdown-formatted responses with sources

**Slack Bot** — Enterprise/team integration. Brings Tokamak knowledge into Slack workspaces:
- `/ask` slash command
- App mention responses (`@Tokamak Pilot how does...`)
- Threaded conversations for follow-ups
- Rich Block Kit formatting

**CLI Tool** — Developer-facing tool. Interactive terminal Q&A:
- REPL mode for continuous Q&A
- Streaming output (tokens appear as they arrive)
- `--project` flag for project-scoped queries
- Search subcommand with formatted results

---

## SDK Examples

For TypeScript/SDK code snippets (not full projects), see [docs/EXAMPLES.md](../docs/EXAMPLES.md).

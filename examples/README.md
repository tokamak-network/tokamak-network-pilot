# Tokamak Pilot — Runnable Examples

Standalone scripts that call the Public API with `fetch`. No SDK dependency; run from repo root with Node 18+.

## Setup

```bash
export TOKAMAK_PILOT_API_URL=https://api.tokamakforest.com/api/v1
export TOKAMAK_PILOT_API_KEY=your-api-key
```

For local API:

```bash
export TOKAMAK_PILOT_API_URL=http://localhost:4000/api/v1
export TOKAMAK_PILOT_API_KEY=your-key
```

## Scripts

| Script | Description |
|--------|-------------|
| `node-health.mjs` | GET /public/health — print status |
| `node-ask.mjs` | POST /public/ask — ask a question, print answer and sources |
| `node-stream.mjs` | POST /public/ask/stream — stream answer to stdout |
| `node-search.mjs` | GET /public/search — semantic search, print results |
| `node-sources-content.mjs` | GET /public/sources and /public/content — list sources and content |
| `node-projects.mjs` | GET /projects and GET /projects/:slug — list projects, get one (no API key) |

## Run

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

## SDK examples

For TypeScript/SDK examples (install `@tokamak-pilot/sdk` first), see [docs/EXAMPLES.md](../docs/EXAMPLES.md).

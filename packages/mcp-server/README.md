# @tokamak-pilot/mcp-server

MCP (Model Context Protocol) server for the **Tokamak Pilot** knowledge base. Use it from Cursor, Claude Desktop, or any MCP client to ask questions, search, list projects/sources/content, and run pre-built prompts.

---

## Installation

```bash
npm install @tokamak-pilot/mcp-server
# or
pnpm add @tokamak-pilot/mcp-server
```

---

## Configuration

Set these environment variables (or pass them in your MCP client config):

| Variable | Required | Description |
|----------|----------|-------------|
| `TOKAMAK_PILOT_API_URL` | Yes | API base URL (e.g. `https://api.tokamakforest.com/api/v1`) |
| `TOKAMAK_PILOT_API_KEY` | Yes | API key with scopes: `ask`, `search`, `sources:read`, `content:read` as needed |

---

## Running the server

The server uses **stdio** by default (for Cursor/Claude Desktop).

```bash
TOKAMAK_PILOT_API_URL=https://api.tokamakforest.com/api/v1 \
TOKAMAK_PILOT_API_KEY=your-api-key \
npx @tokamak-pilot/mcp-server
```

Or with Node after building from source:

```bash
pnpm --filter @tokamak-pilot/mcp-server build
TOKAMAK_PILOT_API_URL=... TOKAMAK_PILOT_API_KEY=... node packages/mcp-server/dist/index.js
```

---

## What it provides

- **Tools:** `tokamak_ask`, `tokamak_search`, `tokamak_list_projects`, `tokamak_get_project`, `tokamak_list_sources`, `tokamak_get_content`, `tokamak_list_content`
- **Resources:** `tokamak://projects`, `tokamak://projects/{id}`, `tokamak://sources`, `tokamak://content/{id}`
- **Prompts:** `explain-project`, `compare-projects`, `summarize-source`

Full details: [docs/MCP.md](../../docs/MCP.md).

---

## Cursor setup

In Cursor MCP settings (or your MCP config file):

```json
{
  "mcpServers": {
    "tokamak-pilot": {
      "command": "npx",
      "args": ["-y", "@tokamak-pilot/mcp-server"],
      "env": {
        "TOKAMAK_PILOT_API_URL": "https://api.tokamakforest.com/api/v1",
        "TOKAMAK_PILOT_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Claude Desktop setup

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tokamak-pilot": {
      "command": "npx",
      "args": ["-y", "@tokamak-pilot/mcp-server"],
      "env": {
        "TOKAMAK_PILOT_API_URL": "https://api.tokamakforest.com/api/v1",
        "TOKAMAK_PILOT_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Build from source

From the monorepo root:

```bash
pnpm install
pnpm --filter @tokamak-pilot/mcp-server build
```

Output: `packages/mcp-server/dist/`.

---

## Links

- **Docs:** [docs/MCP.md](../../docs/MCP.md) — Tools, resources, prompts, setup
- **Public API:** [docs/API_REFERENCE_PUBLIC.md](../../docs/API_REFERENCE_PUBLIC.md)

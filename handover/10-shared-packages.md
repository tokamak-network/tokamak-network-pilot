# Shared Packages

[← Back to Index](./README.md)

---

## `@tokamak-pilot/shared` (`packages/shared/`)

Contains all TypeScript types and constants shared between the API and web app:
- `src/types.ts` — Domain types (Source, Document, User, AskRequest, AskResponse, Project, etc.)
- `src/constants.ts` — API prefix, port numbers, labels

**Rule:** All shared types go here. Never duplicate types between apps.

## `@tokamak-pilot/sdk` (`packages/sdk/`)

Public TypeScript SDK for external consumers:
- Wraps the public API (`/api/v1/public/*`)
- Auth via API key (`X-API-Key` header)
- Methods: `ask()`, `askStream()`, `search()`, `listSources()`, `getSource()`, `listContent()`, `getContent()`, `listProjects()`, `getProject()`, `health()`
- Published as `@tokamak-pilot/sdk` on npm

## `@tokamak-pilot/mcp-server` (`packages/mcp-server/`)

MCP (Model Context Protocol) server that lets AI tools like Cursor and Claude Desktop query the Tokamak knowledge base directly.

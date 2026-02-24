# @tokamak-pilot/sdk

TypeScript SDK for the **Tokamak Pilot (Tokamak Forest) Public API**. Use it to ask questions, stream answers, search the knowledge base, and list sources and content from Node or the browser.

---

## Installation

```bash
npm install @tokamak-pilot/sdk
# or
pnpm add @tokamak-pilot/sdk
# or
yarn add @tokamak-pilot/sdk
```

---

## Quick Start

```typescript
import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: 'https://api.tokamakforest.com/api/v1',
  apiKey: process.env.TOKAMAK_PILOT_API_KEY!,
});

// Ask a question
const { answer, sources, confidence } = await pilot.ask('How does TON staking work?');
console.log(answer, sources);

// Semantic search
const { results } = await pilot.search('Layer 2 rollup', 5);

// List sources
const { sources, total } = await pilot.listSources();
```

---

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | string | Full API base URL including `/api/v1` (e.g. `https://api.tokamakforest.com/api/v1`) |
| `apiKey` | string | Your Public API key (create in web app: Settings → API Keys) |

- Do not add a trailing slash to `baseUrl` (the client normalizes it).
- All requests send the API key in the `X-API-Key` header.

---

## API Key Scopes

Each method requires the API key to have the right scope:

| Method | Required scope |
|--------|-----------------|
| `ask()` | `ask` |
| `askStream()` | `ask` |
| `search()` | `search` |
| `listSources()` | `sources:read` |
| `getSource()` | `sources:read` |
| `listContent()` | `content:read` |
| `getContent()` | `content:read` |
| `health()` | *(none)* |

---

## Methods

### RAG

- **`ask(question, filters?)`** — Ask a question; returns full `AskResponse` (`answer`, `question`, `sources`, `confidence`). Optional `filters` is a string array (e.g. repo names).
- **`askStream(question, callbacks, filters?)`** — Same question/filters, but streams the answer via SSE. Callbacks: `onMetadata`, `onChunk`, `onDone`, `onError`. Returns a promise that resolves when the stream ends.

### Search

- **`search(query, limit?)`** — Semantic search. Default `limit` is 10. Returns `SearchResponse` (`query`, `results`, `total`).

### Sources

- **`listSources()`** — Returns `{ sources: Source[], total: number }`.
- **`getSource(id)`** — Returns a single `Source`.

### Content

- **`listContent(filters?)`** — Optional `filters`: `{ project?: string, category?: string }`. Returns `PaginatedResponse<ContentEntry>` (`data`, `total`, `page`, `limit`, `hasMore`).
- **`getContent(id)`** — Returns a single `ContentEntry`.

### Health

- **`health()`** — Returns `{ status: string, version?: string }`. No scope required.

---

## Types

The SDK re-exports types from `@tokamak-pilot/shared` so you can type your code:

- **Ask:** `AskRequest`, `AskResponse`, `CitedSource`, `AskStreamCallbacks`, `AskStreamMetadata`, `AskStreamChunk`, `AskStreamDone`, `AskStreamError`, `AskStreamEventType`
- **Search:** `SearchResponse`, `SearchResult`
- **Sources:** `Source`, `SourceType`, `SourceStatus`
- **Content:** `ContentEntry`
- **Common:** `PaginatedResponse`, `ApiError`, `ApiKeyScope`

Example:

```typescript
import {
  TokamakPilotClient,
  type AskResponse,
  type SearchResult,
} from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({ baseUrl: '...', apiKey: '...' });

const res: AskResponse = await pilot.ask('What is Tokamak?');
const search: { results: SearchResult[] } = await pilot.search('staking');
```

---

## Examples

### Streaming in Node

```typescript
await pilot.askStream(
  'Explain TON staking briefly.',
  {
    onMetadata: (meta) => console.log('Sources:', meta.sources.length),
    onChunk: (chunk) => process.stdout.write(chunk.text),
    onDone: () => console.log('\nDone'),
    onError: (err) => console.error(err.message),
  },
  ['titan'],
);
```

### List content by project

```typescript
const page = await pilot.listContent({ project: 'titan', category: 'guide' });
console.log(page.data, page.total, page.hasMore);
```

### Error handling

Failed requests throw an `Error` with the API message. Check for rate limits (429) and invalid key (401).

```typescript
try {
  const res = await pilot.ask('...');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
}
```

---

## Links

- **Repository:** [tokamak-network/tokamak-network-pilot](https://github.com/tokamak-network/tokamak-network-pilot)
- **Docs:** [docs/](../../docs/) — Developer guide, examples, Public API reference
- **Swagger:** `http://localhost:4000/docs` (local) or your deployment’s `/docs`

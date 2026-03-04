# Public API & SDK

[← Back to Index](./README.md)

---

## Public API

Base path: `/api/v1/public/*`
Auth: `X-API-Key` header

| Endpoint | Scopes Needed |
|----------|--------------|
| `POST /public/ask` | `ask` |
| `POST /public/ask/stream` | `ask` |
| `GET /public/search` | `search` |
| `GET /public/sources` | `sources:read` |
| `GET /public/content` | `content:read` |
| `GET /public/projects` | `projects:read` |
| `GET /public/health` | (none) |

## SDK

```typescript
import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const client = new TokamakPilotClient({
  baseUrl: 'https://api.tokamakforest.com/api/v1',
  apiKey: 'tk_your_key_here',
});

const { answer, sources } = await client.ask('How does TON staking work?');
```

## Embeddable Widget

A self-contained chat widget that can be embedded on any website:

```html
<script
  src="https://api.tokamakforest.com/widget.js"
  data-api-key="tk_your_key"
  data-theme="dark"
  data-position="bottom-right"
></script>
```

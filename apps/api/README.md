# Tokamak Pilot API — Endpoint Reference

> **Base URL:** `http://localhost:4000/api/v1`
> **Swagger Docs:** `http://localhost:4000/docs`
> **OpenAPI Spec:** `http://localhost:4000/api/v1/openapi.json`

This document lists every API endpoint exposed by the Tokamak Pilot backend. Use it as a testing reference.

---

## Table of Contents

1. [Authentication Info](#authentication-info)
2. [Health Check](#1-health-check)
3. [Auth (Login / OTP)](#2-auth--login--otp)
4. [RAG / Ask](#3-rag--ask)
5. [Knowledge Sources](#4-knowledge-sources)
6. [File Upload](#5-file-upload)
7. [Content Management](#6-content-management)
8. [API Keys](#7-api-keys)
9. [Public API (API-Key Auth)](#8-public-api-api-key-auth)
10. [Conversations](#9-conversations)
11. [Projects](#10-projects)
12. [Export](#11-export)
13. [Changelog](#12-changelog)
14. [LLMs.txt](#13-llmstxt)
15. [Widget](#14-widget)

---

## Authentication Info

The API uses **two** authentication methods:

### JWT Bearer Token (Internal)

Used by most endpoints. Obtain a token via the OTP login flow, then pass it in the header:

```
Authorization: Bearer <your-jwt-token>
```

**How to get a token:**
1. Call `POST /api/v1/auth/request-otp` with your `@tokamak.network` email
2. Call `POST /api/v1/auth/verify-otp` with the email + 6-digit code
3. Use the returned JWT token in the `Authorization` header

### API Key (Public API)

Used by `/api/v1/public/*` endpoints. Pass the key in the header:

```
X-API-Key: <your-api-key>
```

API keys have scopes (`ask`, `search`, `sources:read`, `content:read`) and per-key rate limits.

---

## 1. Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/health` | None | API health check |

**Response:**
```json
{
  "status": "ok",
  "service": "tokamak-pilot-api",
  "version": "0.1.0",
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

---

## 2. Auth / Login / OTP

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/request-otp` | None | Request a login OTP code via email |
| `POST` | `/api/v1/auth/verify-otp` | None | Verify OTP code and receive JWT token |
| `GET` | `/api/v1/auth/me` | JWT | Get current user profile |

### `POST /api/v1/auth/request-otp`

**Request Body:**
```json
{
  "email": "user@tokamak.network"
}
```
> Email must be `@tokamak.network` domain.

### `POST /api/v1/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@tokamak.network",
  "code": "123456"
}
```

**Response:** JWT Bearer token.

### `GET /api/v1/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** Current user profile object.

---

## 3. RAG / Ask

All endpoints require **JWT authentication**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/ask` | JWT | Ask a question (RAG-powered answer with citations) |
| `GET` | `/api/v1/ask/search` | JWT | Semantic search (no LLM answer, just relevant docs) |

### `POST /api/v1/ask`

**Request Body:**
```json
{
  "question": "What is Tokamak Network?",
  "filters": ["titan"],
  "projectId": "uuid-optional",
  "conversationHistory": [
    { "role": "user", "content": "previous question" },
    { "role": "assistant", "content": "previous answer" }
  ]
}
```
> Only `question` is required. All other fields are optional.

### `GET /api/v1/ask/search`

**Query Params:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `q` | string | Yes | — | Search query |
| `limit` | number | No | 10 | Max results |
| `projectId` | string | No | — | Filter by project |

**Example:** `GET /api/v1/ask/search?q=staking&limit=5`

---

## 4. Knowledge Sources

All endpoints require **JWT authentication**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/sources` | JWT | List all registered knowledge sources |
| `GET` | `/api/v1/sources/status` | JWT | Ingestion status dashboard |
| `GET` | `/api/v1/sources/:id` | JWT | Get details of a specific source |
| `GET` | `/api/v1/sources/:id/documents` | JWT | List documents ingested for a source |
| `POST` | `/api/v1/sources/:id/summary` | JWT | Generate AI summary for a source |
| `POST` | `/api/v1/sources` | JWT | Register a new knowledge source |
| `PUT` | `/api/v1/sources/:id` | JWT | Update a knowledge source |
| `DELETE` | `/api/v1/sources/:id` | JWT | Remove a knowledge source and its data |
| `POST` | `/api/v1/sources/:id/sync` | JWT | Trigger light re-indexing (docs only) |
| `POST` | `/api/v1/sources/:id/sync-full` | JWT | Trigger deep re-indexing (everything) |

### `GET /api/v1/sources/:id/documents`

**Query Params:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `contentType` | string | No | — | Filter: `readme`, `issue`, `pull_request`, `code`, `wiki`, `documentation` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 50 | Items per page |

### `POST /api/v1/sources`

**Request Body:** `CreateSourceDto` — register a GitHub repo, docs URL, or file upload as a source.

### `PUT /api/v1/sources/:id`

**Request Body:** `UpdateSourceDto` — update source configuration.

---

## 5. File Upload

All endpoints require **JWT authentication**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/sources/upload` | JWT | Upload files to create a knowledge source |
| `GET` | `/api/v1/sources/upload/supported-formats` | JWT | List supported file formats |

### `POST /api/v1/sources/upload`

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Up to 10 files, max 20 MB each |
| `name` | string | No | Optional source name |

**Supported formats:** PDF, Markdown (.md), TXT, DOCX, CSV

### `GET /api/v1/sources/upload/supported-formats`

**Response:** List of supported formats, max file size, and max file count.

---

## 6. Content Management

All endpoints require **JWT authentication**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/content` | JWT | List content entries |
| `GET` | `/api/v1/content/:id` | JWT | Get a specific content entry |
| `POST` | `/api/v1/content` | JWT | Create a new content entry |
| `PUT` | `/api/v1/content/:id` | JWT | Update a content entry |
| `DELETE` | `/api/v1/content/:id` | JWT | Delete a content entry |

### `GET /api/v1/content`

**Query Params:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `project` | string | No | — | Filter by project |
| `category` | string | No | — | Filter by category |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |

### `POST /api/v1/content`

**Request Body:**
```json
{
  "title": "Getting Started with Titan",
  "body": "Titan is a Layer 2 rollup...",
  "project": "titan",
  "category": "guide",
  "tags": ["titan", "l2", "rollup"]
}
```
> `title` and `body` are required. Others are optional.

### `PUT /api/v1/content/:id`

**Request Body:** Same as create, all fields optional. Additionally supports:
```json
{
  "isOutdated": true
}
```

---

## 7. API Keys

All endpoints require **JWT authentication**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/api-keys` | JWT | Create a new API key (plaintext shown once) |
| `GET` | `/api/v1/api-keys` | JWT | List your API keys (secrets hidden) |
| `GET` | `/api/v1/api-keys/:id` | JWT | Get API key details |
| `PATCH` | `/api/v1/api-keys/:id` | JWT | Update an API key |
| `DELETE` | `/api/v1/api-keys/:id` | JWT | Revoke an API key (permanent) |
| `POST` | `/api/v1/api-keys/:id/rotate` | JWT | Rotate key (new secret, old invalidated) |
| `GET` | `/api/v1/api-keys/:id/usage` | JWT | Get usage history for an API key |

### `POST /api/v1/api-keys`

**Request Body:** `CreateApiKeyDto`

**Response:** Includes plaintext secret — **save it immediately, it is only shown once**.

### `GET /api/v1/api-keys/:id/usage`

**Query Params:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 50 | Items per page |

---

## 8. Public API (API-Key Auth)

All endpoints require **API Key** in the `X-API-Key` header. Rate-limited per key (default: 600 req/min).

| Method | Endpoint | Auth | Scope Required | Description |
|--------|----------|------|----------------|-------------|
| `POST` | `/api/v1/public/ask` | API Key | `ask` | Ask a question (RAG-powered) |
| `GET` | `/api/v1/public/search` | API Key | `search` | Semantic search |
| `GET` | `/api/v1/public/sources` | API Key | `sources:read` | List knowledge sources |
| `GET` | `/api/v1/public/sources/:id` | API Key | `sources:read` | Get source details |
| `GET` | `/api/v1/public/content` | API Key | `content:read` | Browse content entries |
| `GET` | `/api/v1/public/content/:id` | API Key | `content:read` | Get a content entry |
| `GET` | `/api/v1/public/health` | API Key | None | Public API health check |

### `POST /api/v1/public/ask`

**Headers:** `X-API-Key: <key>`

**Request Body:**
```json
{
  "question": "How does Tokamak staking work?"
}
```

### `GET /api/v1/public/search`

**Query Params:** Same as `/api/v1/ask/search` (`q`, `limit`).

### `GET /api/v1/public/health`

**Response:**
```json
{
  "status": "ok",
  "keyPrefix": "tk_...",
  "tier": "premium",
  "rateLimit": 600
}
```

---

## 9. Conversations

All endpoints require **JWT authentication**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/conversations` | JWT | Create a new conversation thread |
| `GET` | `/api/v1/conversations` | JWT | List conversations (most recent first) |
| `POST` | `/api/v1/conversations/quick-ask` | JWT | Quick ask — creates conversation + asks in one step |
| `GET` | `/api/v1/conversations/:id` | JWT | Get conversation with all messages |
| `PUT` | `/api/v1/conversations/:id` | JWT | Update conversation title |
| `DELETE` | `/api/v1/conversations/:id` | JWT | Delete conversation and all messages |
| `POST` | `/api/v1/conversations/:id/ask` | JWT | Ask a follow-up in an existing conversation |

### `GET /api/v1/conversations`

**Query Params:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |

### `POST /api/v1/conversations/quick-ask`

**Request Body:**
```json
{
  "question": "What is TON staking?",
  "filters": ["titan"]
}
```

### `POST /api/v1/conversations/:id/ask`

**Request Body:**
```json
{
  "question": "Can you explain more about the rewards?",
  "filters": ["titan"]
}
```

---

## 10. Projects

Mixed auth — read endpoints are public, write endpoints require **JWT**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/projects` | None | List all projects |
| `GET` | `/api/v1/projects/:idOrSlug` | None | Get project by ID or slug |
| `GET` | `/api/v1/projects/:idOrSlug/dashboard` | JWT | Get project dashboard with stats |
| `GET` | `/api/v1/projects/:slug/public` | None | Get public project overview |
| `POST` | `/api/v1/projects` | JWT | Create a new project |
| `PUT` | `/api/v1/projects/:id` | JWT | Update a project |
| `DELETE` | `/api/v1/projects/:id` | JWT | Delete a project |
| `GET` | `/api/v1/projects/:id/sources` | None | List sources assigned to project |
| `POST` | `/api/v1/projects/:id/sources` | JWT | Assign a source to project |
| `DELETE` | `/api/v1/projects/:id/sources/:sourceId` | JWT | Remove a source from project |
| `GET` | `/api/v1/projects/:id/members` | None | List project team members |
| `POST` | `/api/v1/projects/:id/members` | JWT | Add a team member (invite by email) |
| `PUT` | `/api/v1/projects/:id/members/:userId` | JWT | Update member role |
| `DELETE` | `/api/v1/projects/:id/members/:userId` | JWT | Remove a team member |
| `POST` | `/api/v1/projects/:id/summary` | JWT | Generate AI project summary |

### `POST /api/v1/projects`

**Request Body:** `CreateProjectDto`

### `POST /api/v1/projects/:id/members`

**Request Body:** `AddProjectMemberDto` — invite by email.

---

## 11. Export

No authentication required.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/export/content/:id` | None | Export content entry as JSON or Markdown |
| `GET` | `/api/v1/export/project/:idOrSlug` | None | Export project as JSON or Markdown |
| `POST` | `/api/v1/export/answer` | None | Export a RAG answer as JSON or Markdown |
| `POST` | `/api/v1/export/prompt` | None | Format content as an AI-ready prompt |

### Query Param (for GET and POST export endpoints)

| Param | Type | Required | Default | Options |
|-------|------|----------|---------|---------|
| `format` | string | No | `json` | `json`, `markdown` |

### `POST /api/v1/export/answer`

**Request Body:**
```json
{
  "question": "What is Tokamak?",
  "answer": "Tokamak Network is...",
  "sources": [
    { "title": "Docs", "url": "https://...", "score": 0.95 }
  ],
  "confidence": 0.92
}
```

### `POST /api/v1/export/prompt`

**Request Body:**
```json
{
  "type": "answer",
  "title": "Optional title",
  "body": "The main content...",
  "sources": [
    { "title": "Source", "url": "https://..." }
  ],
  "metadata": {}
}
```
> `type` must be one of: `answer`, `content`, `project`. `body` is required.

---

## 12. Changelog

No authentication required.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/changelog` | None | Get all changelog entries |
| `GET` | `/api/v1/changelog/latest` | None | Get the latest changelog entry |
| `GET` | `/api/v1/changelog/:version` | None | Get changelog for a specific version |

### `GET /api/v1/changelog`

**Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | No | Filter by type: `added`, `changed`, `fixed`, `deprecated`, `removed`, `security` |

---

## 13. LLMs.txt

No authentication required. These are served at the **root** (not under `/api/v1`).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/llms.txt` | None | Brief knowledge overview for LLMs |
| `GET` | `/llms-full.txt` | None | Detailed knowledge base for LLMs |

**Response:** Plain text (`Content-Type: text/plain`), cached for 1 hour.

---

## 14. Widget

No authentication required. Served at the **root** (not under `/api/v1`).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/widget.js` | None | Embeddable chat widget JavaScript |

**Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | No | API key (can also be set via `data-api-key` attribute) |

**Response:** JavaScript (`Content-Type: application/javascript`), cached for 1 hour.

---

## Quick Start for Testers

### 1. Start the API

```bash
pnpm --filter @tokamak-pilot/api dev
```

The API runs on `http://localhost:4000`. Swagger UI is at `http://localhost:4000/docs`.

### 2. Get a JWT Token

```bash
# Step 1: Request OTP
curl -X POST http://localhost:4000/api/v1/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "yourname@tokamak.network"}'

# Step 2: Verify OTP (use the code from your email)
curl -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "yourname@tokamak.network", "code": "123456"}'
```

Save the returned token.

### 3. Call Authenticated Endpoints

```bash
# Example: Ask a question
curl -X POST http://localhost:4000/api/v1/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"question": "What is Tokamak Network?"}'

# Example: List sources
curl http://localhost:4000/api/v1/sources \
  -H "Authorization: Bearer <your-token>"
```

### 4. Test Public API (with API Key)

```bash
# First create an API key via the dashboard or API
# Then use it:
curl -X POST http://localhost:4000/api/v1/public/ask \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-api-key>" \
  -d '{"question": "What is Tokamak Network?"}'
```

### 5. Test Public Endpoints (No Auth)

```bash
# Health check
curl http://localhost:4000/api/v1/health

# List projects
curl http://localhost:4000/api/v1/projects

# Changelog
curl http://localhost:4000/api/v1/changelog

# LLMs.txt
curl http://localhost:4000/llms.txt
```

---

## Endpoint Summary

| Category | Count | Auth Required |
|----------|-------|---------------|
| Health Check | 1 | None |
| Auth / OTP | 3 | None (except `/me`) |
| RAG / Ask | 2 | JWT |
| Knowledge Sources | 10 | JWT |
| File Upload | 2 | JWT |
| Content Management | 5 | JWT |
| API Keys | 7 | JWT |
| Public API | 7 | API Key |
| Conversations | 7 | JWT |
| Projects | 15 | Mixed |
| Export | 4 | None |
| Changelog | 3 | None |
| LLMs.txt | 2 | None |
| Widget | 1 | None |
| **Total** | **~69** | — |

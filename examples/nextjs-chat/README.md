# Next.js Chat — Tokamak Pilot Integration

A full Next.js 15 app that integrates a streaming chat component powered by the Tokamak Pilot API. Shows how to add AI-powered Q&A about the Tokamak Network ecosystem to any Next.js project.

## What This Demonstrates

- **Route Handler** for streaming (`app/api/chat/route.ts`) — proxies the Tokamak API's SSE stream, keeping the API key server-side
- **SSE stream parsing** on the client — real-time token-by-token answer display
- **Conversation history** — follow-up questions with context from previous messages
- **Source citations** — clickable links to the sources that informed the answer
- **Confidence score** — shows how confident the AI is in its answer
- **Suggested questions** — starter prompts for new users

## Quick Start

```bash
cd examples/nextjs-chat

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API key

# Start the dev server
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) to see the chat interface.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TOKAMAK_PILOT_API_URL` | Yes | API base URL (e.g. `https://api.tokamakforest.com/api/v1`) |
| `TOKAMAK_PILOT_API_KEY` | Yes | Your API key with the `ask` scope |

## Project Structure

```
nextjs-chat/
├── app/
│   ├── api/chat/
│   │   └── route.ts          # Streaming Route Handler (server-side)
│   ├── components/
│   │   ├── chat.tsx           # Main chat component (client)
│   │   └── message.tsx        # Message bubble + source citations
│   ├── globals.css            # Tailwind + custom styles
│   ├── layout.tsx             # Root layout with header
│   └── page.tsx               # Home page
├── .env.example               # Environment variable template
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## How It Works

### 1. Route Handler (Server-Side)

The `/api/chat` Route Handler receives the question from the client and proxies the request to the Tokamak Pilot API. This keeps the API key on the server — it never reaches the browser.

```
Browser → POST /api/chat → Route Handler → POST /api/v1/public/ask/stream → Tokamak API
                                   ↓
                            Proxies SSE stream back
                                   ↓
Browser ← SSE events ← Route Handler
```

### 2. SSE Stream Parsing (Client-Side)

The chat component uses `fetch` + `ReadableStream` to process Server-Sent Events:

- **`metadata`** — arrives first with source citations and confidence score
- **`chunk`** — individual text tokens, appended to the message in real-time
- **`done`** — signals the stream is complete
- **`error`** — error messages from the API

### 3. Conversation History

Each request includes the last 10 messages as `conversationHistory`, allowing the AI to understand follow-up questions in context.

## Adapting to Your Project

To add this chat component to an existing Next.js project:

1. **Copy the Route Handler** (`app/api/chat/route.ts`) — adjust the env var names if needed
2. **Copy the components** (`app/components/chat.tsx` and `message.tsx`)
3. **Add environment variables** for `TOKAMAK_PILOT_API_URL` and `TOKAMAK_PILOT_API_KEY`
4. **Import and render** `<Chat />` anywhere in your app

The components use Tailwind CSS classes. If your project uses a different styling approach, adapt the classes accordingly.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript |
| API | Tokamak Pilot Public API (SSE streaming) |

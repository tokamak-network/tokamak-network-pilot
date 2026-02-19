'use client';

import {
  TreePine,
  Search,
  Database,
  FileText,
  Heart,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { Endpoint, CodeBlock, MethodBadge, ScopeBadge, API_BASE_URL } from '@/components/docs/shared';

export default function ApiReferencePage() {
  return (
    <div className="space-y-12">
      {/* Page Header */}
      <section>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mb-2">API Reference</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Complete reference for all Tokamak Forest Public API endpoints. Each endpoint includes
          code examples in 5 languages, SDK snippets, and an interactive playground.
        </p>

        {/* Quick nav */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { id: 'ask', label: 'Ask', icon: TreePine },
            { id: 'streaming', label: 'Streaming (SSE)', icon: Radio },
            { id: 'search', label: 'Search', icon: Search },
            { id: 'sources', label: 'Sources', icon: Database },
            { id: 'content', label: 'Content', icon: FileText },
            { id: 'health', label: 'Health', icon: Heart },
          ].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <s.icon className="size-3.5" />
              {s.label}
            </a>
          ))}
        </div>
      </section>

      {/* Ask */}
      <section id="ask" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <TreePine className="size-5 text-primary" />
          Ask
        </h2>
        <p className="text-sm text-muted-foreground">
          Submit natural-language questions about the Tokamak Network ecosystem and receive AI-powered answers
          with source citations.
        </p>
        <Endpoint
          method="POST"
          path="/public/ask"
          title="Ask a question about Tokamak Network"
          description="Submit a natural-language question and receive a RAG-powered answer with source citations. The response includes the generated answer, relevant sources with confidence scores, and an overall confidence level."
          scope="ask"
          bodyParams={[
            {
              name: 'question',
              type: 'string',
              required: true,
              description: 'The question to ask about Tokamak Network',
              example: 'What is the TON staking mechanism?',
            },
            {
              name: 'filters',
              type: 'string[]',
              required: false,
              description: 'Optional context filters (e.g., specific repo names or doc categories)',
              example: 'tokamak-network/contracts-v2',
            },
            {
              name: 'conversationHistory',
              type: 'array',
              required: false,
              description: 'Previous messages for follow-up questions. Each item has role ("user" | "assistant") and content.',
            },
          ]}
          responseExample={`{
  "answer": "The TON staking mechanism allows token holders to stake their TON tokens...",
  "question": "What is the TON staking mechanism?",
  "sources": [
    {
      "title": "contracts-v2/docs/staking.md",
      "url": "https://github.com/tokamak-network/contracts-v2/blob/main/docs/staking.md",
      "score": 0.92
    }
  ],
  "confidence": 0.89
}`}
        />
      </section>

      {/* SSE Streaming */}
      <section id="streaming" className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Radio className="size-5 text-primary" />
          Streaming (SSE)
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ask questions with real-time streaming responses via Server-Sent Events (SSE). Tokens arrive
          incrementally as the LLM generates the answer, enabling a live typing experience in your UI.
        </p>

        {/* Endpoint overview */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <MethodBadge method="POST" />
            <code className="text-sm font-mono font-medium text-foreground">/public/ask/stream</code>
            <ScopeBadge scope="ask" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Same request body as <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">POST /public/ask</code>,
            but the response is a <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">text/event-stream</code> that
            emits events as the answer is generated.
          </p>
        </div>

        {/* Event types */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Event Types</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Event</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">When</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Payload</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">metadata</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">First event, before any text</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {`{ sources, confidence, provider, model }`}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">chunk</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">Each text token as generated</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {`{ text: "token" }`}
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">done</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">Full answer has been streamed</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {`{}`}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium">error</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">If an error occurs mid-stream</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                    {`{ message: "..." }`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Raw SSE format */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Raw SSE Format</h3>
          <p className="text-sm text-muted-foreground mb-3">
            The stream uses the standard SSE protocol. Each event has a named type and JSON data:
          </p>
          <CodeBlock
            code={`event: metadata
data: {"sources":[{"title":"staking.md","url":"...","score":0.92}],"confidence":0.89,"provider":"openai","model":"gpt-4o"}

event: chunk
data: {"text":"The "}

event: chunk
data: {"text":"TON "}

event: chunk
data: {"text":"staking "}

event: chunk
data: {"text":"mechanism..."}

event: done
data: {}`}
            language="text"
          />
        </div>

        {/* Connection lifecycle */}
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
          <h3 className="text-sm font-semibold">Connection Lifecycle</h3>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-3 py-1 font-medium">POST request</span>
            <ArrowRight className="size-3 shrink-0" />
            <span className="rounded-full border border-info/30 bg-info/10 text-info px-3 py-1 font-medium">metadata event</span>
            <ArrowRight className="size-3 shrink-0" />
            <span className="rounded-full border border-primary/30 bg-primary/10 text-primary px-3 py-1 font-medium">chunk events (N times)</span>
            <ArrowRight className="size-3 shrink-0" />
            <span className="rounded-full border border-success/30 bg-success/10 text-success px-3 py-1 font-medium">done event</span>
            <ArrowRight className="size-3 shrink-0" />
            <span className="rounded-full border border-border bg-card px-3 py-1 font-medium">Connection closes</span>
          </div>
        </div>

        {/* Code examples */}
        <div>
          <h3 className="text-sm font-semibold mb-3">JavaScript / Browser</h3>
          <CodeBlock
            code={`const response = await fetch('${API_BASE_URL}/public/ask/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY',
  },
  body: JSON.stringify({ question: 'What is TON staking?' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\\n');
  buffer = lines.pop() || '';

  let currentEvent = '';
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7);
    } else if (line.startsWith('data: ') && currentEvent) {
      const data = JSON.parse(line.slice(6));
      switch (currentEvent) {
        case 'metadata':
          console.log('Sources:', data.sources);
          break;
        case 'chunk':
          process.stdout.write(data.text);
          break;
        case 'done':
          console.log('\\nStream complete');
          break;
        case 'error':
          console.error('Error:', data.message);
          break;
      }
      currentEvent = '';
    }
  }
}`}
            language="javascript"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">TypeScript SDK</h3>
          <p className="text-sm text-muted-foreground mb-3">
            The SDK provides a convenient <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">askStream()</code> method
            with typed callbacks:
          </p>
          <CodeBlock
            code={`import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: '${API_BASE_URL}',
  apiKey: 'tok_your_key_here',
});

let fullAnswer = '';

await pilot.askStream('What is TON staking?', {
  onMetadata: (meta) => {
    console.log(\`Found \${meta.sources.length} sources\`);
    console.log(\`Confidence: \${meta.confidence}\`);
  },
  onChunk: (chunk) => {
    fullAnswer += chunk.text;
    process.stdout.write(chunk.text);
  },
  onDone: () => {
    console.log('\\n--- Stream complete ---');
    console.log('Full answer:', fullAnswer);
  },
  onError: (err) => {
    console.error('Stream error:', err.message);
  },
});`}
            language="typescript"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Python</h3>
          <CodeBlock
            code={`import requests
import json

response = requests.post(
    "${API_BASE_URL}/public/ask/stream",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "YOUR_API_KEY",
    },
    json={"question": "What is TON staking?"},
    stream=True,
)

current_event = ""
for line in response.iter_lines(decode_unicode=True):
    if not line:
        continue
    if line.startswith("event: "):
        current_event = line[7:]
    elif line.startswith("data: ") and current_event:
        data = json.loads(line[6:])
        if current_event == "metadata":
            print(f"Sources: {len(data['sources'])} found")
        elif current_event == "chunk":
            print(data["text"], end="", flush=True)
        elif current_event == "done":
            print("\\nStream complete")
        elif current_event == "error":
            print(f"Error: {data['message']}")
        current_event = ""`}
            language="python"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">cURL</h3>
          <CodeBlock
            code={`curl -N -X POST "${API_BASE_URL}/public/ask/stream" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"question": "What is TON staking?"}'`}
            language="bash"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            The <code className="rounded bg-muted px-1 py-0.5 font-mono">-N</code> flag disables
            output buffering so events appear in real-time.
          </p>
        </div>
      </section>

      {/* Search */}
      <section id="search" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Search className="size-5 text-primary" />
          Search
        </h2>
        <p className="text-sm text-muted-foreground">
          Perform semantic search across the vector store without generating an LLM answer.
          Ideal for building custom UIs or finding relevant documentation chunks.
        </p>
        <Endpoint
          method="GET"
          path="/public/search"
          title="Semantic search across indexed knowledge"
          description="Search the vector store for relevant chunks. Returns raw matching content with source metadata and relevance scores — no LLM generation involved."
          scope="search"
          queryParams={[
            { name: 'q', required: true, description: 'Search query string', example: 'TON staking' },
            { name: 'limit', required: false, description: 'Maximum number of results to return (default: 10)', example: '5' },
          ]}
          responseExample={`{
  "query": "TON staking",
  "results": [
    {
      "content": "The staking contract allows TON holders to delegate...",
      "source": "contracts-v2/docs/staking.md",
      "score": 0.94
    },
    {
      "content": "Validators must stake a minimum of 1000 TON...",
      "source": "docs.tokamak.network/staking-guide",
      "score": 0.87
    }
  ],
  "total": 2
}`}
        />
      </section>

      {/* Sources */}
      <section id="sources" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Database className="size-5 text-primary" />
          Sources
        </h2>
        <p className="text-sm text-muted-foreground">
          Browse all registered knowledge sources — GitHub repositories, documentation sites, uploaded files, and more.
        </p>
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/public/sources"
            title="List all knowledge sources"
            description="Returns all registered knowledge sources including their sync status, document counts, and configuration details."
            scope="sources:read"
            responseExample={`{
  "sources": [
    {
      "id": "a1b2c3d4-...",
      "name": "tokamak-network/contracts-v2",
      "type": "github_repo",
      "status": "active",
      "documentCount": 142,
      "lastSyncedAt": "2025-12-01T10:30:00Z",
      "createdAt": "2025-11-15T08:00:00Z"
    }
  ],
  "total": 12
}`}
          />
          <Endpoint
            method="GET"
            path="/public/sources/:id"
            title="Get details of a specific source"
            description="Returns detailed information about a single knowledge source, including document statistics, sync history, and configuration."
            scope="sources:read"
            responseExample={`{
  "id": "a1b2c3d4-...",
  "name": "tokamak-network/contracts-v2",
  "type": "github_repo",
  "status": "active",
  "config": {
    "owner": "tokamak-network",
    "repo": "contracts-v2"
  },
  "documentCount": 142,
  "lastSyncedAt": "2025-12-01T10:30:00Z",
  "createdAt": "2025-11-15T08:00:00Z",
  "updatedAt": "2025-12-01T10:30:00Z"
}`}
          />
        </div>
      </section>

      {/* Content */}
      <section id="content" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <FileText className="size-5 text-primary" />
          Content
        </h2>
        <p className="text-sm text-muted-foreground">
          Access curated content entries maintained by the team — project overviews, FAQs, technical guides, and more.
        </p>
        <div className="space-y-3">
          <Endpoint
            method="GET"
            path="/public/content"
            title="Browse curated content entries"
            description="List team-curated content entries. Supports filtering by project and category with pagination."
            scope="content:read"
            queryParams={[
              { name: 'project', required: false, description: 'Filter by project name' },
              { name: 'category', required: false, description: 'Filter by category' },
              { name: 'page', required: false, description: 'Page number (default: 1)', example: '1' },
              { name: 'limit', required: false, description: 'Items per page (default: 20)', example: '20' },
            ]}
            responseExample={`{
  "data": [
    {
      "id": "e5f6g7h8-...",
      "title": "Titan Network Overview",
      "body": "Titan is the Layer 2 rollup solution built on...",
      "project": "titan",
      "category": "overview",
      "tags": ["l2", "rollup", "titan"],
      "isOutdated": false,
      "createdAt": "2025-10-20T12:00:00Z"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 10,
  "hasMore": false
}`}
          />
          <Endpoint
            method="GET"
            path="/public/content/:id"
            title="Get a specific content entry"
            description="Retrieve a single content entry by ID, including its full body, author information, and metadata."
            scope="content:read"
            responseExample={`{
  "id": "e5f6g7h8-...",
  "title": "Titan Network Overview",
  "body": "Titan is the Layer 2 rollup solution built on top of Tokamak Network...",
  "project": "titan",
  "category": "overview",
  "tags": ["l2", "rollup", "titan"],
  "isOutdated": false,
  "author": {
    "id": "u1v2w3x4-...",
    "email": "dev@tokamak.network",
    "name": "Core Team",
    "role": "admin"
  },
  "createdAt": "2025-10-20T12:00:00Z",
  "updatedAt": "2025-11-05T15:30:00Z"
}`}
          />
        </div>
      </section>

      {/* Health */}
      <section id="health" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Heart className="size-5 text-primary" />
          Health Check
        </h2>
        <p className="text-sm text-muted-foreground">
          Verify API key validity and check the service status. No specific scope is required.
        </p>
        <Endpoint
          method="GET"
          path="/public/health"
          title="Public API health check"
          description="Simple health check that verifies your API key is valid and returns key metadata. Useful for monitoring integrations."
          responseExample={`{
  "status": "ok",
  "keyPrefix": "tok_abc1",
  "tier": "free",
  "rateLimit": 10
}`}
        />
      </section>
    </div>
  );
}

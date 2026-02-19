'use client';

import Link from 'next/link';
import {
  Code,
  Bot,
  Download,
  Sparkles,
  FileText,
  BarChart3,
  Package,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { CodeBlock, API_BASE_URL } from '@/components/docs/shared';
import { RateLimitDashboard } from '@/components/docs/rate-limit-dashboard';

export default function GuidesPage() {
  const llmsBaseUrl = API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <section>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mb-2">Guides</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          In-depth guides for integrating with the Tokamak Forest API using the TypeScript SDK,
          embeddable widget, AI-friendly endpoints, and monitoring your usage.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { id: 'sdk', label: 'TypeScript SDK' },
            { id: 'widget', label: 'Embeddable Widget' },
            { id: 'ai-friendly', label: 'AI-Friendly Output' },
            { id: 'rate-dashboard', label: 'Rate Dashboard' },
          ].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      </section>

      {/* TypeScript SDK */}
      <section id="sdk" className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Package className="size-5 text-primary" />
          TypeScript SDK
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The official <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@tokamak-pilot/sdk</code> package
          provides a fully typed, ergonomic client for interacting with the Tokamak Forest Public API.
        </p>

        {/* Installation */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Installation</h3>
          <CodeBlock code="npm install @tokamak-pilot/sdk" language="bash" />
          <p className="text-xs text-muted-foreground">
            Or use your preferred package manager: <code className="rounded bg-muted px-1 py-0.5 font-mono">yarn add</code> or <code className="rounded bg-muted px-1 py-0.5 font-mono">pnpm add</code>.
          </p>
        </div>

        {/* Configuration */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Configuration</h3>
          <CodeBlock
            code={`import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: '${API_BASE_URL}',  // API base URL
  apiKey: 'tok_your_key_here',  // Your API key
});`}
            language="typescript"
          />
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Option</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs">baseUrl</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">string</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Base URL of the Tokamak Forest API</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">apiKey</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">string</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Your API key (starts with tok_)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Methods */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Available Methods</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Method</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Scope</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { method: 'ask(question, filters?)', scope: 'ask', desc: 'Ask a question, get full answer' },
                  { method: 'askStream(question, callbacks, filters?)', scope: 'ask', desc: 'Stream answer token-by-token' },
                  { method: 'search(query, limit?)', scope: 'search', desc: 'Semantic vector search' },
                  { method: 'listSources()', scope: 'sources:read', desc: 'List all knowledge sources' },
                  { method: 'getSource(id)', scope: 'sources:read', desc: 'Get source details' },
                  { method: 'listContent(filters?)', scope: 'content:read', desc: 'Browse content entries' },
                  { method: 'getContent(id)', scope: 'content:read', desc: 'Get content entry' },
                  { method: 'health()', scope: '(none)', desc: 'Check API health' },
                ].map((m) => (
                  <tr key={m.method} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">{m.method}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{m.scope}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{m.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full example */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Complete Example</h3>
          <CodeBlock
            code={`import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: '${API_BASE_URL}',
  apiKey: 'tok_your_key_here',
});

// Ask a question (standard)
const answer = await pilot.ask('What is TON staking?');
console.log(answer.answer);
console.log('Sources:', answer.sources);
console.log('Confidence:', answer.confidence);

// Ask with streaming
let fullText = '';
await pilot.askStream('How does the Titan rollup work?', {
  onMetadata: (meta) => console.log('Provider:', meta.provider),
  onChunk: (chunk) => { fullText += chunk.text; },
  onDone: () => console.log('Answer:', fullText),
  onError: (err) => console.error(err.message),
});

// Semantic search
const results = await pilot.search('layer 2 rollup', 5);
for (const r of results.results) {
  console.log(\`[\${r.score.toFixed(2)}] \${r.source}\`);
}

// List sources
const { sources } = await pilot.listSources();
console.log(\`\${sources.length} knowledge sources indexed\`);

// Browse content
const content = await pilot.listContent({ project: 'titan' });
for (const entry of content.data) {
  console.log(entry.title, entry.category);
}`}
            language="typescript"
          />
        </div>

        {/* Error handling */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            <h3 className="text-sm font-semibold">Error Handling</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SDK methods throw standard JavaScript errors with descriptive messages. Wrap calls
            in try/catch for production use:
          </p>
          <CodeBlock
            code={`try {
  const answer = await pilot.ask('What is TON staking?');
  console.log(answer.answer);
} catch (error) {
  if (error instanceof Error) {
    // Common errors:
    // "API error: 401" — invalid API key
    // "API error: 403" — missing scope
    // "API error: 429" — rate limit exceeded
    console.error('API error:', error.message);
  }
}`}
            language="typescript"
          />
        </div>
      </section>

      {/* Embeddable Widget */}
      <section id="widget" className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Code className="size-5 text-primary" />
          Embeddable Widget
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add a &ldquo;Ask about Tokamak&rdquo; chat widget to any website with a single script tag.
          The widget uses the Public API and requires an API key with the{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">ask</code> scope.
        </p>

        {/* Quick embed */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Quick Embed</h3>
          <CodeBlock
            code={`<!-- Add this to your HTML -->
<script
  src="${llmsBaseUrl}/widget.js"
  data-api-key="tok_your_key_here"
  data-position="bottom-right"
  data-theme="dark"
  defer
></script>`}
            language="html"
          />
        </div>

        {/* Configuration */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Configuration Options</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Attribute</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Required</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs">data-api-key</td>
                  <td className="px-3 py-2"><span className="text-[11px] font-medium text-destructive">Required</span></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Your API key with the <code className="bg-muted px-1 rounded">ask</code> scope</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs">data-position</td>
                  <td className="px-3 py-2"><span className="text-[11px] text-muted-foreground">Optional</span></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">bottom-right</code> (default) or <code className="bg-muted px-1 rounded">bottom-left</code></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-mono text-xs">data-theme</td>
                  <td className="px-3 py-2"><span className="text-[11px] text-muted-foreground">Optional</span></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground"><code className="bg-muted px-1 rounded">dark</code> (default) or <code className="bg-muted px-1 rounded">light</code></td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono text-xs">data-api-url</td>
                  <td className="px-3 py-2"><span className="text-[11px] text-muted-foreground">Optional</span></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">Override the API base URL (defaults to the Tokamak Forest instance)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-warning" />
            <h3 className="text-sm font-semibold">Security Considerations</h3>
          </div>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              The widget API key is exposed in the HTML source. Use a key with <strong className="text-foreground">only the
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono ml-1">ask</code> scope</strong> to minimize risk.
            </li>
            <li>
              Rate limiting protects against abuse — the widget respects the same per-key rate limits.
            </li>
            <li>
              Consider using a separate API key for the widget so you can revoke it independently.
            </li>
          </ul>
        </div>

        {/* Theming examples */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Theme Examples</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-medium">Dark Theme (default)</p>
              <CodeBlock
                code={`data-theme="dark"`}
                language="html"
              />
              <p className="text-xs text-muted-foreground">Best for dark-themed websites</p>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-medium">Light Theme</p>
              <CodeBlock
                code={`data-theme="light"`}
                language="html"
              />
              <p className="text-xs text-muted-foreground">Best for light-themed websites</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Friendly Output */}
      <section id="ai-friendly" className="space-y-5">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Bot className="size-5 text-primary" />
          AI-Friendly Output
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tokamak Forest provides AI-optimized endpoints for LLMs and agents to discover and consume knowledge.
        </p>

        {/* llms.txt */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">llms.txt</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Following the{' '}
            <a
              href="https://llmstxt.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              llms.txt specification
            </a>
            , Tokamak Forest serves standardized files that LLMs and AI agents can discover and consume.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={`${llmsBaseUrl}/llms.txt`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <FileText className="size-3.5" />
              /llms.txt — Brief overview
            </a>
            <a
              href={`${llmsBaseUrl}/llms-full.txt`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <FileText className="size-3.5" />
              /llms-full.txt — Full knowledge base
            </a>
          </div>
        </div>

        {/* Structured Export */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            <h4 className="text-sm font-semibold">Structured Export</h4>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Export any content entry, project, or AI answer as structured JSON or Markdown for use in other tools.
          </p>
          <CodeBlock
            code={`# Export a content entry as Markdown
curl "${API_BASE_URL}/export/content/{id}?format=markdown"

# Export a project as JSON
curl "${API_BASE_URL}/export/project/{slug}?format=json"

# Format as AI-ready prompt
curl -X POST "${API_BASE_URL}/export/prompt" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"answer","title":"TON Staking","body":"...","sources":[]}'`}
            language="bash"
          />
        </div>
      </section>

      {/* Rate Limit Dashboard */}
      <section id="rate-dashboard" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          Rate Limit Dashboard
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Monitor your API key usage, see remaining quota, check rate limit status, and view
          recent API calls in real-time. You need to be{' '}
          <Link href="/login" className="text-primary underline underline-offset-2">
            signed in
          </Link>{' '}
          to use this dashboard.
        </p>
        <RateLimitDashboard />
      </section>
    </div>
  );
}

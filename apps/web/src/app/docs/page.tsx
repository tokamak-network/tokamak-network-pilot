'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Key,
  Search,
  TreePine,
  Server,
  Shield,
  ArrowRight,
  Download,
  Sparkles,
  Zap,
  Terminal,
  Code2,
  Compass,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { CodeBlock, ScopeBadge, API_BASE_URL } from '@/components/docs/shared';

const PAGE_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'base-url', label: 'Base URL' },
  { id: 'rate-limits', label: 'Rate Limits' },
  { id: 'errors', label: 'Error Responses' },
  { id: 'openapi-spec', label: 'OpenAPI Spec' },
  { id: 'next-steps', label: 'Next Steps' },
];

function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState(sectionIds[0] || '');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}

export default function DocsGettingStartedPage() {
  const activeSection = useActiveSection(PAGE_SECTIONS.map((s) => s.id));

  return (
    <div className="flex gap-6 lg:gap-10">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-8 lg:space-y-12">
        {/* Hero */}
        <section id="overview">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <TreePine className="size-5" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-semibold tracking-tight">Tokamak Forest Public API</h1>
                  <p className="text-sm text-muted-foreground">v0.4.0</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                The Tokamak Forest Public API provides programmatic access to the RAG-powered knowledge base
                for the Tokamak Network ecosystem. Ask questions, search indexed knowledge, browse sources,
                and access curated content — all authenticated with API keys.
              </p>
            </div>
          </div>

          {/* Navigate to docs sections */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/docs/api-reference"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Code2 className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">API Reference</p>
                <p className="text-xs text-muted-foreground">All endpoints & streaming</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/docs/guides"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
                <Compass className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Guides</p>
                <p className="text-xs text-muted-foreground">SDK, widget, AI output</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/docs/updates"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <Bell className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Updates</p>
                <p className="text-xs text-muted-foreground">Webhooks & changelog</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Sparkles className="size-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">New in v0.4.0</p>
              <p className="text-xs text-muted-foreground">
                Multi-page docs, SSE streaming documentation, interactive API playground,
                multi-language code examples (5 languages), SDK code generator, and rate limit dashboard.
              </p>
            </div>
            <Link
              href="/docs/updates"
              className="text-xs text-primary font-medium hover:underline underline-offset-2 shrink-0"
            >
              View changelog
            </Link>
          </div>
        </section>

        {/* Quick Start */}
        <section id="quick-start" className="space-y-5">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            Quick Start
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get up and running in under 2 minutes. Follow these three steps to make your first API request.
          </p>

          {/* Step 1 */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </div>
              <h3 className="text-sm font-semibold">Get an API Key</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-10">
              Sign in to Tokamak Forest, go to{' '}
              <Link href="/settings" className="text-primary underline underline-offset-2">
                Settings
              </Link>
              , and create a new API key. Select at least the{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">ask</code> scope.
              Copy the key — it will only be shown once.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Make Your First Request</h3>
                <Terminal className="size-4 text-muted-foreground" />
              </div>
            </div>
            <div className="pl-10">
              <CodeBlock
                code={`curl -X POST "${API_BASE_URL}/public/ask" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: tok_your_key_here" \\
  -d '{"question": "What is Tokamak Network?"}'`}
                language="bash"
              />
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                3
              </div>
              <h3 className="text-sm font-semibold">Or Use the TypeScript SDK</h3>
            </div>
            <div className="pl-10 space-y-3">
              <CodeBlock
                code={`npm install @tokamak-pilot/sdk`}
                language="bash"
              />
              <CodeBlock
                code={`import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: '${API_BASE_URL}',
  apiKey: 'tok_your_key_here',
});

const result = await pilot.ask('What is Tokamak Network?');
console.log(result.answer);
console.log(result.sources);`}
                language="typescript"
              />
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section id="authentication" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Key className="size-5 text-primary" />
            Authentication
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All Public API endpoints (except health check) require an API key passed via the{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">X-API-Key</code>{' '}
            header. Each key has scoped permissions that determine which endpoints it can access.
          </p>

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-medium">Getting an API Key</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
              <li>
                Sign in to Tokamak Forest and navigate to{' '}
                <Link href="/settings" className="text-primary underline underline-offset-2">
                  Settings
                </Link>
              </li>
              <li>Click <strong className="text-foreground">New API Key</strong> and choose your desired scopes</li>
              <li>Copy the generated key — it will only be shown once</li>
              <li>
                Include it in every request as{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                  X-API-Key: tok_your_key_here
                </code>
              </li>
            </ol>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Available Scopes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { scope: 'ask', desc: 'Submit questions to the RAG pipeline and receive AI-generated answers' },
                { scope: 'search', desc: 'Perform semantic search across all indexed knowledge' },
                { scope: 'sources:read', desc: 'List and view knowledge sources (GitHub repos, docs, etc.)' },
                { scope: 'content:read', desc: 'Browse curated content entries (guides, FAQs, overviews)' },
              ].map((s) => (
                <div
                  key={s.scope}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <ScopeBadge scope={s.scope} />
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Base URL */}
        <section id="base-url" className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Server className="size-5 text-primary" />
            Base URL
          </h2>
          <p className="text-sm text-muted-foreground">
            All endpoints are relative to the base URL:
          </p>
          <CodeBlock
            code={`${API_BASE_URL}/public`}
            language="url"
          />
          <p className="text-xs text-muted-foreground">
            For example, the ask endpoint resolves to{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {API_BASE_URL}/public/ask
            </code>
          </p>
        </section>

        {/* Rate Limits */}
        <section id="rate-limits" className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            Rate Limits
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rate limits are enforced per API key based on the key&apos;s tier. When the rate limit is exceeded,
            the API responds with <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">429 Too Many Requests</code>.
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Tier</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Rate Limit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 font-medium">Free</td>
                  <td className="px-4 py-2.5 font-mono text-xs">10 req/min</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">Default tier for new keys</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 font-medium">Standard</td>
                  <td className="px-4 py-2.5 font-mono text-xs">60 req/min</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">For active integrations</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Premium</td>
                  <td className="px-4 py-2.5 font-mono text-xs">200 req/min</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">High-throughput applications</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Error Responses */}
        <section id="errors" className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <AlertCircle className="size-5 text-primary" />
            Error Responses
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The API uses standard HTTP status codes. Error responses always include a{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">message</code> field.
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Meaning</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: '400', meaning: 'Bad Request', desc: 'Missing or invalid request parameters' },
                  { code: '401', meaning: 'Unauthorized', desc: 'Invalid or missing API key in X-API-Key header' },
                  { code: '403', meaning: 'Forbidden', desc: 'API key is missing the required scope for this endpoint' },
                  { code: '404', meaning: 'Not Found', desc: 'The requested resource does not exist' },
                  { code: '429', meaning: 'Too Many Requests', desc: 'Rate limit exceeded — slow down and retry' },
                  { code: '500', meaning: 'Internal Server Error', desc: 'An unexpected error occurred on the server' },
                ].map((e) => (
                  <tr key={e.code} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5 font-mono text-xs font-medium">{e.code}</td>
                    <td className="px-4 py-2.5 font-medium text-xs">{e.meaning}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CodeBlock
            code={`{
  "statusCode": 403,
  "message": "API key missing required scope: ask",
  "error": "Forbidden"
}`}
            language="json"
          />
        </section>

        {/* OpenAPI Spec */}
        <section id="openapi-spec" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Download className="size-5 text-primary" />
            OpenAPI Specification
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Download the complete OpenAPI specification for the Tokamak Forest API. Use it to generate
            client libraries, import into Postman, or integrate with any OpenAPI-compatible tool.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`${API_BASE_URL}/openapi.json`}
              download="tokamak-pilot-openapi.json"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Download className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">OpenAPI JSON</p>
                <p className="text-xs text-muted-foreground">Machine-readable format</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href={`${API_BASE_URL}/openapi.yaml`}
              download="tokamak-pilot-openapi.yaml"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <Download className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">OpenAPI YAML</p>
                <p className="text-xs text-muted-foreground">Human-readable format</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>
        </section>

        {/* Next Steps */}
        <section id="next-steps" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Next Steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/docs/api-reference"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Search className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Explore API Endpoints</p>
                <p className="text-xs text-muted-foreground">Ask, Search, Sources, Content, Streaming</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/docs/guides"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
                <Compass className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Read the Guides</p>
                <p className="text-xs text-muted-foreground">SDK setup, widget embed, AI output</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </section>
      </div>

      {/* Right-side Table of Contents */}
      <aside className="hidden xl:flex w-40 shrink-0 flex-col sticky top-10 h-fit max-h-[calc(100vh-5rem)] overflow-y-auto">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          On this page
        </p>
        <nav className="space-y-0.5 border-l border-border">
          {PAGE_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`block pl-3 py-1 text-xs transition-colors border-l -ml-px ${
                activeSection === s.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}

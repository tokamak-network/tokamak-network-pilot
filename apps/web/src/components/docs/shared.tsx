'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Code,
  Play,
  Wand2,
  Files,
} from 'lucide-react';
import { MultiLangCodeBlock } from '@/components/docs/multi-lang-code';
import { ApiPlayground } from '@/components/docs/api-playground';
import { SdkGenerator } from '@/components/docs/sdk-generator';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-success/15 text-success border-success/25',
    POST: 'bg-info/15 text-info border-info/25',
    PUT: 'bg-warning/15 text-warning border-warning/25',
    PATCH: 'bg-chart-5/15 text-chart-5 border-chart-5/25',
    DELETE: 'bg-destructive/15 text-destructive border-destructive/25',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold font-mono ${colors[method] ?? 'bg-muted text-muted-foreground border-border'}`}
    >
      {method}
    </span>
  );
}

export function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
      {scope}
    </span>
  );
}

export function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-lg border border-border bg-code-block overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className="text-[11px] text-muted-foreground font-mono uppercase">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-code-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export interface EndpointProps {
  method: string;
  path: string;
  title: string;
  description: string;
  scope?: string;
  queryParams?: Array<{ name: string; type?: string; required: boolean; description: string; example?: string }>;
  bodyParams?: Array<{ name: string; type: string; required: boolean; description: string; example?: string }>;
  responseExample: string;
}

export function Endpoint({
  method,
  path,
  title,
  description,
  scope,
  queryParams,
  bodyParams,
  responseExample,
}: EndpointProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'sdk' | 'playground'>('code');

  return (
    <div
      className="rounded-xl border border-border bg-card transition-shadow hover:shadow-sm"
      id={path.replace(/[/:]/g, '-').replace(/^-/, '')}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <MethodBadge method={method} />
        <code className="flex-1 text-sm font-mono font-medium text-foreground">{path}</code>
        {scope && <ScopeBadge scope={scope} />}
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-5">
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          {queryParams && queryParams.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Query Parameters
              </h5>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Required</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryParams.map((p) => (
                      <tr key={p.name} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                        <td className="px-3 py-2">
                          {p.required ? (
                            <span className="text-[11px] font-medium text-destructive">Required</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Optional</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {p.description}
                          {p.example && (
                            <span className="ml-1 text-foreground font-mono">e.g. {p.example}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {bodyParams && bodyParams.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Request Body <span className="font-normal">(JSON)</span>
              </h5>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Field</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Required</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodyParams.map((p) => (
                      <tr key={p.name} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 font-mono text-xs">{p.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.type}</td>
                        <td className="px-3 py-2">
                          {p.required ? (
                            <span className="text-[11px] font-medium text-destructive">Required</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Optional</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 border-b border-border pb-0">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'code'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="size-3.5" />
              Code Examples
            </button>
            <button
              onClick={() => setActiveTab('sdk')}
              className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'sdk'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wand2 className="size-3.5" />
              SDK
            </button>
            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-1.5 rounded-t-md border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'playground'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Play className="size-3.5" />
              Try It
            </button>
          </div>

          <div className="pt-1">
            {activeTab === 'code' && (
              <MultiLangCodeBlock
                method={method}
                path={path}
                baseUrl={API_BASE_URL}
                queryParams={queryParams}
                bodyParams={bodyParams}
              />
            )}
            {activeTab === 'sdk' && (
              <SdkGenerator
                method={method}
                path={path}
                queryParams={queryParams}
                bodyParams={bodyParams}
              />
            )}
            {activeTab === 'playground' && (
              <ApiPlayground
                method={method}
                path={path}
                baseUrl={API_BASE_URL}
                queryParams={queryParams}
                bodyParams={bodyParams}
              />
            )}
          </div>

          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Response Example
            </h5>
            <CodeBlock code={responseExample} language="json" />
          </div>
        </div>
      )}
    </div>
  );
}

export function generatePageMarkdown(): string {
  const lines: string[] = [];

  lines.push('# Tokamak Forest Public API');
  lines.push('');
  lines.push('> Version: v0.4.0');
  lines.push('');
  lines.push('The Tokamak Forest Public API provides programmatic access to the RAG-powered knowledge base for the Tokamak Network ecosystem. Ask questions, search indexed knowledge, browse sources, and access curated content — all authenticated with API keys.');
  lines.push('');

  lines.push('## Authentication');
  lines.push('');
  lines.push('All Public API endpoints (except health check) require an API key passed via the `X-API-Key` header. Each key has scoped permissions that determine which endpoints it can access.');
  lines.push('');
  lines.push('### Getting an API Key');
  lines.push('');
  lines.push('1. Sign in to Tokamak Forest and navigate to Settings');
  lines.push('2. Click **New API Key** and choose your desired scopes');
  lines.push('3. Copy the generated key — it will only be shown once');
  lines.push('4. Include it in every request as `X-API-Key: tok_your_key_here`');
  lines.push('');
  lines.push('### Available Scopes');
  lines.push('');
  lines.push('| Scope | Description |');
  lines.push('|-------|-------------|');
  lines.push('| `ask` | Submit questions to the RAG pipeline and receive AI-generated answers |');
  lines.push('| `search` | Perform semantic search across all indexed knowledge |');
  lines.push('| `sources:read` | List and view knowledge sources (GitHub repos, docs, etc.) |');
  lines.push('| `content:read` | Browse curated content entries (guides, FAQs, overviews) |');
  lines.push('');

  lines.push('## Base URL');
  lines.push('');
  lines.push('All endpoints are relative to the base URL:');
  lines.push('');
  lines.push('```');
  lines.push(`${API_BASE_URL}/public`);
  lines.push('```');
  lines.push('');

  lines.push('## Rate Limits');
  lines.push('');
  lines.push('Rate limits are enforced per API key based on the key\'s tier.');
  lines.push('');
  lines.push('| Tier | Rate Limit | Description |');
  lines.push('|------|-----------|-------------|');
  lines.push('| Free | 10 req/min | Default tier for new keys |');
  lines.push('| Standard | 60 req/min | For active integrations |');
  lines.push('| Premium | 200 req/min | High-throughput applications |');
  lines.push('');

  lines.push('## Endpoints');
  lines.push('');
  lines.push('### POST /public/ask');
  lines.push('');
  lines.push('Ask a question about Tokamak Network.');
  lines.push('');
  lines.push('**Scope:** `ask`');
  lines.push('');

  lines.push('### POST /public/ask/stream');
  lines.push('');
  lines.push('Ask a question with streaming response (SSE). Events: `metadata`, `chunk`, `done`, `error`.');
  lines.push('');
  lines.push('**Scope:** `ask`');
  lines.push('');

  lines.push('### GET /public/search');
  lines.push('');
  lines.push('Semantic search across indexed knowledge.');
  lines.push('');
  lines.push('**Scope:** `search`');
  lines.push('');

  lines.push('### GET /public/sources');
  lines.push('');
  lines.push('List all registered knowledge sources.');
  lines.push('');
  lines.push('**Scope:** `sources:read`');
  lines.push('');

  lines.push('### GET /public/content');
  lines.push('');
  lines.push('Browse curated content entries.');
  lines.push('');
  lines.push('**Scope:** `content:read`');
  lines.push('');

  lines.push('### GET /public/health');
  lines.push('');
  lines.push('Public API health check. No specific scope required.');
  lines.push('');

  lines.push('## Error Responses');
  lines.push('');
  lines.push('| Code | Meaning | Description |');
  lines.push('|------|---------|-------------|');
  lines.push('| 400 | Bad Request | Missing or invalid request parameters |');
  lines.push('| 401 | Unauthorized | Invalid or missing API key |');
  lines.push('| 403 | Forbidden | API key missing required scope |');
  lines.push('| 429 | Too Many Requests | Rate limit exceeded |');
  lines.push('| 500 | Internal Server Error | Unexpected error |');
  lines.push('');

  const llmsBaseUrl = API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
  lines.push('## TypeScript SDK');
  lines.push('');
  lines.push('```typescript');
  lines.push("import { TokamakPilotClient } from '@tokamak-pilot/sdk';");
  lines.push('');
  lines.push('const pilot = new TokamakPilotClient({');
  lines.push(`  baseUrl: '${API_BASE_URL}',`);
  lines.push("  apiKey: 'tok_your_key_here',");
  lines.push('});');
  lines.push('');
  lines.push("const answer = await pilot.ask('What is TON staking?');");
  lines.push('```');
  lines.push('');

  lines.push('## Embeddable Widget');
  lines.push('');
  lines.push('```html');
  lines.push(`<script src="${llmsBaseUrl}/widget.js" data-api-key="tok_your_key_here" defer></script>`);
  lines.push('```');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*Exported from Tokamak Forest API Docs (v0.4.0) on ${new Date().toISOString()}*`);
  lines.push(`*Source: ${typeof window !== 'undefined' ? window.location.href : 'https://tokamak-pilot.app/docs'}*`);

  return lines.join('\n');
}

export function CopyPageDropdown() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleCopyPage = async () => {
    const md = generatePageMarkdown();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1500);
  };

  const handleOpenInChatGPT = async () => {
    const md = generatePageMarkdown();
    await navigator.clipboard.writeText(md);
    window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleOpenInClaude = async () => {
    const md = generatePageMarkdown();
    await navigator.clipboard.writeText(md);
    window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center">
        <button
          onClick={handleCopyPage}
          className="flex items-center gap-2 rounded-l-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {copied ? (
            <Check className="size-3.5 text-success" />
          ) : (
            <Files className="size-3.5" />
          )}
          {copied ? 'Copied!' : 'Copy page'}
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center rounded-r-lg border border-l-0 border-border bg-card px-1.5 py-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="More copy options"
        >
          {open ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={handleCopyPage}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Files className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Copy page</p>
              <p className="text-[11px] text-muted-foreground">Copy page as Markdown for LLMs</p>
            </div>
          </button>
          <div className="border-t border-border" />
          <button
            onClick={handleOpenInChatGPT}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Open in ChatGPT</p>
              <p className="text-[11px] text-muted-foreground">Copies page & opens ChatGPT</p>
            </div>
            <ExternalLink className="size-3 text-muted-foreground shrink-0" />
          </button>
          <div className="border-t border-border" />
          <button
            onClick={handleOpenInClaude}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.709 15.955l4.72-10.961a.49.49 0 0 1 .903.007l4.593 10.985c.064.16-.05.337-.22.337H5.034c-.186 0-.302-.198-.22-.368h-.104zm10.19.368h4.348c.198 0 .315-.222.2-.383L14.28 7.161a.254.254 0 0 0-.451.011l-2.106 4.89 3.176 4.261z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Open in Claude</p>
              <p className="text-[11px] text-muted-foreground">Copies page & opens Claude</p>
            </div>
            <ExternalLink className="size-3 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}

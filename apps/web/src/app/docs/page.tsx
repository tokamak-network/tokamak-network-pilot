'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  Key,
  Search,
  Zap,
  BookOpen,
  Server,
  Shield,
  Database,
  FileText,
  Heart,
  ArrowRight,
  Download,
  Bot,
  Code,
  Sparkles,
  Play,
  History,
  Webhook,
  BarChart3,
  Wand2,
  Files,
} from 'lucide-react';
import { MultiLangCodeBlock } from '@/components/docs/multi-lang-code';
import { ApiPlayground } from '@/components/docs/api-playground';
import { SdkGenerator } from '@/components/docs/sdk-generator';
import { ChangelogSection } from '@/components/docs/changelog-section';
import { WebhookDocs } from '@/components/docs/webhook-docs';
import { RateLimitDashboard } from '@/components/docs/rate-limit-dashboard';

// ─── Helpers ────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
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
      {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    POST: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25',
    PUT: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
    PATCH: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/25',
    DELETE: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold font-mono ${colors[method] ?? 'bg-muted text-muted-foreground border-border'}`}
    >
      {method}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
      {scope}
    </span>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-lg border border-border bg-[#0d1117] dark:bg-[#0d1117] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <span className="text-[11px] text-muted-foreground font-mono uppercase">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Enhanced Endpoint Section ──────────────────────────

interface EndpointProps {
  method: string;
  path: string;
  title: string;
  description: string;
  scope?: string;
  queryParams?: Array<{ name: string; type?: string; required: boolean; description: string; example?: string }>;
  bodyParams?: Array<{ name: string; type: string; required: boolean; description: string; example?: string }>;
  responseExample: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ─── Copy Page as Markdown for LLMs ────────────────────

function generatePageMarkdown(): string {
  const lines: string[] = [];

  lines.push('# Tokamak Pilot Public API');
  lines.push('');
  lines.push('> Version: v0.4.0');
  lines.push('');
  lines.push('The Tokamak Pilot Public API provides programmatic access to the RAG-powered knowledge base for the Tokamak Network ecosystem. Ask questions, search indexed knowledge, browse sources, and access curated content — all authenticated with API keys.');
  lines.push('');

  // Authentication
  lines.push('## Authentication');
  lines.push('');
  lines.push('All Public API endpoints (except health check) require an API key passed via the `X-API-Key` header. Each key has scoped permissions that determine which endpoints it can access.');
  lines.push('');
  lines.push('### Getting an API Key');
  lines.push('');
  lines.push('1. Sign in to Tokamak Pilot and navigate to Settings');
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

  // Base URL
  lines.push('## Base URL');
  lines.push('');
  lines.push('All endpoints are relative to the base URL:');
  lines.push('');
  lines.push('```');
  lines.push(`${API_BASE_URL}/public`);
  lines.push('```');
  lines.push('');

  // Rate Limits
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

  // Ask Endpoint
  lines.push('## Endpoints');
  lines.push('');
  lines.push('### POST /public/ask');
  lines.push('');
  lines.push('Ask a question about Tokamak Network. Submit a natural-language question and receive a RAG-powered answer with source citations.');
  lines.push('');
  lines.push('**Scope:** `ask`');
  lines.push('');
  lines.push('**Request Body (JSON):**');
  lines.push('');
  lines.push('| Field | Type | Required | Description |');
  lines.push('|-------|------|----------|-------------|');
  lines.push('| `question` | string | Yes | The question to ask about Tokamak Network |');
  lines.push('| `filters` | string[] | No | Optional context filters (e.g., specific repo names or doc categories) |');
  lines.push('| `conversationHistory` | array | No | Previous messages for follow-up questions. Each item has role ("user" \\| "assistant") and content. |');
  lines.push('');
  lines.push('**Example Request:**');
  lines.push('');
  lines.push('```bash');
  lines.push(`curl -X POST "${API_BASE_URL}/public/ask" \\`);
  lines.push('  -H "Content-Type: application/json" \\');
  lines.push('  -H "X-API-Key: tok_your_key_here" \\');
  lines.push('  -d \'{"question": "What is the TON staking mechanism?"}\'');
  lines.push('```');
  lines.push('');
  lines.push('**Response:**');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    answer: "The TON staking mechanism allows token holders to stake their TON tokens...",
    question: "What is the TON staking mechanism?",
    sources: [{ title: "contracts-v2/docs/staking.md", url: "https://github.com/tokamak-network/contracts-v2/blob/main/docs/staking.md", score: 0.92 }],
    confidence: 0.89
  }, null, 2));
  lines.push('```');
  lines.push('');

  // Search Endpoint
  lines.push('### GET /public/search');
  lines.push('');
  lines.push('Semantic search across indexed knowledge. Search the vector store for relevant chunks without LLM generation.');
  lines.push('');
  lines.push('**Scope:** `search`');
  lines.push('');
  lines.push('**Query Parameters:**');
  lines.push('');
  lines.push('| Name | Required | Description |');
  lines.push('|------|----------|-------------|');
  lines.push('| `q` | Yes | Search query string |');
  lines.push('| `limit` | No | Maximum number of results (default: 10) |');
  lines.push('');
  lines.push('**Example Request:**');
  lines.push('');
  lines.push('```bash');
  lines.push(`curl "${API_BASE_URL}/public/search?q=TON+staking&limit=5" \\`);
  lines.push('  -H "X-API-Key: tok_your_key_here"');
  lines.push('```');
  lines.push('');
  lines.push('**Response:**');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    query: "TON staking",
    results: [
      { content: "The staking contract allows TON holders to delegate...", source: "contracts-v2/docs/staking.md", score: 0.94 },
      { content: "Validators must stake a minimum of 1000 TON...", source: "docs.tokamak.network/staking-guide", score: 0.87 }
    ],
    total: 2
  }, null, 2));
  lines.push('```');
  lines.push('');

  // Sources Endpoints
  lines.push('### GET /public/sources');
  lines.push('');
  lines.push('List all registered knowledge sources including sync status, document counts, and configuration.');
  lines.push('');
  lines.push('**Scope:** `sources:read`');
  lines.push('');
  lines.push('### GET /public/sources/:id');
  lines.push('');
  lines.push('Get details of a specific knowledge source.');
  lines.push('');
  lines.push('**Scope:** `sources:read`');
  lines.push('');

  // Content Endpoints
  lines.push('### GET /public/content');
  lines.push('');
  lines.push('Browse curated content entries. Supports filtering by project and category with pagination.');
  lines.push('');
  lines.push('**Scope:** `content:read`');
  lines.push('');
  lines.push('**Query Parameters:**');
  lines.push('');
  lines.push('| Name | Required | Description |');
  lines.push('|------|----------|-------------|');
  lines.push('| `project` | No | Filter by project name |');
  lines.push('| `category` | No | Filter by category |');
  lines.push('| `page` | No | Page number (default: 1) |');
  lines.push('| `limit` | No | Items per page (default: 20) |');
  lines.push('');
  lines.push('### GET /public/content/:id');
  lines.push('');
  lines.push('Get a specific content entry by ID, including full body, author information, and metadata.');
  lines.push('');
  lines.push('**Scope:** `content:read`');
  lines.push('');

  // Health
  lines.push('### GET /public/health');
  lines.push('');
  lines.push('Public API health check. Verifies your API key is valid and returns key metadata. No specific scope required.');
  lines.push('');

  // Error Codes
  lines.push('## Error Responses');
  lines.push('');
  lines.push('The API uses standard HTTP status codes. Error responses always include a `message` field.');
  lines.push('');
  lines.push('| Code | Meaning | Description |');
  lines.push('|------|---------|-------------|');
  lines.push('| 400 | Bad Request | Missing or invalid request parameters |');
  lines.push('| 401 | Unauthorized | Invalid or missing API key in X-API-Key header |');
  lines.push('| 403 | Forbidden | API key missing required scope for this endpoint |');
  lines.push('| 404 | Not Found | The requested resource does not exist |');
  lines.push('| 429 | Too Many Requests | Rate limit exceeded — slow down and retry |');
  lines.push('| 500 | Internal Server Error | An unexpected error occurred on the server |');
  lines.push('');

  // OpenAPI
  lines.push('## OpenAPI Specification');
  lines.push('');
  lines.push('Download the complete OpenAPI specification:');
  lines.push('');
  lines.push(`- JSON: ${API_BASE_URL}/openapi.json`);
  lines.push(`- YAML: ${API_BASE_URL}/openapi.yaml`);
  lines.push('');

  // AI-Friendly
  lines.push('## AI-Friendly Output');
  lines.push('');
  lines.push('Tokamak Pilot provides AI-optimized endpoints for LLMs and agents:');
  lines.push('');
  const llmsBaseUrl = API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000';
  lines.push(`- \`${llmsBaseUrl}/llms.txt\` — Brief overview (llms.txt specification)`);
  lines.push(`- \`${llmsBaseUrl}/llms-full.txt\` — Full knowledge base`);
  lines.push('');
  lines.push('### Structured Export');
  lines.push('');
  lines.push('Export content entries, projects, or AI answers as JSON or Markdown:');
  lines.push('');
  lines.push('```bash');
  lines.push(`# Export a content entry as Markdown`);
  lines.push(`curl "${API_BASE_URL}/export/content/{id}?format=markdown"`);
  lines.push('');
  lines.push(`# Export a project as JSON`);
  lines.push(`curl "${API_BASE_URL}/export/project/{slug}?format=json"`);
  lines.push('');
  lines.push(`# Format as AI-ready prompt`);
  lines.push(`curl -X POST "${API_BASE_URL}/export/prompt" \\`);
  lines.push('  -H "Content-Type: application/json" \\');
  lines.push('  -d \'{"type":"answer","title":"TON Staking","body":"...","sources":[]}\'');
  lines.push('```');
  lines.push('');

  // Widget
  lines.push('## Embeddable Widget');
  lines.push('');
  lines.push('Add a "Ask about Tokamak" chat widget to any website:');
  lines.push('');
  lines.push('```html');
  lines.push(`<script`);
  lines.push(`  src="${llmsBaseUrl}/widget.js"`);
  lines.push('  data-api-key="tok_your_key_here"');
  lines.push('  data-position="bottom-right"');
  lines.push('  data-theme="dark"');
  lines.push('  defer');
  lines.push('></script>');
  lines.push('```');
  lines.push('');
  lines.push('| Attribute | Required | Description |');
  lines.push('|-----------|----------|-------------|');
  lines.push('| `data-api-key` | Yes | Your API key with the `ask` scope |');
  lines.push('| `data-position` | No | `bottom-right` (default) or `bottom-left` |');
  lines.push('| `data-theme` | No | `dark` (default) or `light` |');
  lines.push('| `data-api-url` | No | Override the API base URL |');
  lines.push('');

  // SDK
  lines.push('## TypeScript SDK');
  lines.push('');
  lines.push('Install the official SDK: `@tokamak-pilot/sdk`');
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
  lines.push("const results = await pilot.search('layer 2 rollup');");
  lines.push('const { sources } = await pilot.listSources();');
  lines.push("const content = await pilot.listContent({ project: 'titan' });");
  lines.push('```');
  lines.push('');

  // Webhooks summary
  lines.push('## Webhooks');
  lines.push('');
  lines.push('Receive real-time event notifications from Tokamak Pilot. Configure webhook URLs to be notified when sources sync, content changes, or rate limits are hit.');
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Exported from Tokamak Pilot API Docs (v0.4.0) on ${new Date().toISOString()}*`);
  lines.push(`*Source: ${typeof window !== 'undefined' ? window.location.href : 'https://tokamak-pilot.app/docs'}*`);

  return lines.join('\n');
}

function CopyPageDropdown() {
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
            <Check className="size-3.5 text-green-500" />
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

function Endpoint({
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
      {/* Header */}
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

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-5">
          {/* Title & Description */}
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          {/* Query Params */}
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
                            <span className="text-[11px] font-medium text-red-500">Required</span>
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

          {/* Body Params */}
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
                            <span className="text-[11px] font-medium text-red-500">Required</span>
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

          {/* Tab Bar: Code Examples / SDK / Playground */}
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

          {/* Tab Content */}
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

          {/* Response Example */}
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

// ─── Table of Contents ─────────────────────────────────

const sections = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'authentication', label: 'Authentication', icon: Key },
  { id: 'base-url', label: 'Base URL', icon: Server },
  { id: 'rate-limits', label: 'Rate Limits', icon: Shield },
  { id: 'endpoints-ask', label: 'Ask', icon: Zap },
  { id: 'endpoints-search', label: 'Search', icon: Search },
  { id: 'endpoints-sources', label: 'Sources', icon: Database },
  { id: 'endpoints-content', label: 'Content', icon: FileText },
  { id: 'endpoints-health', label: 'Health', icon: Heart },
  { id: 'openapi-spec', label: 'OpenAPI Spec', icon: Download },
  { id: 'ai-friendly', label: 'AI-Friendly', icon: Bot },
  { id: 'embed-widget', label: 'Widget', icon: Code },
  { id: 'rate-dashboard', label: 'Rate Dashboard', icon: BarChart3 },
  { id: 'changelog', label: 'Changelog', icon: History },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
];

// ─── Main Page ─────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar / TOC — Desktop */}
      <aside className="hidden xl:flex w-56 shrink-0 flex-col border-r border-border bg-muted/30 p-4 pt-6 sticky top-0 h-screen overflow-y-auto">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to app
        </Link>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="size-3.5" />
          </div>
          <span className="text-sm font-semibold">API Docs</span>
        </div>
        <nav className="space-y-0.5">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <s.icon className="size-3.5 shrink-0" />
              {s.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Interactive Swagger UI
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* ─── Hero ─────────────────────────── */}
        <section id="overview">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Zap className="size-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Tokamak Pilot Public API</h1>
                  <p className="text-sm text-muted-foreground">v0.4.0</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                The Tokamak Pilot Public API provides programmatic access to the RAG-powered knowledge base
                for the Tokamak Network ecosystem. Ask questions, search indexed knowledge, browse sources,
                and access curated content — all authenticated with API keys.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CopyPageDropdown />
              {/* Mobile nav links */}
              <div className="xl:hidden flex items-center gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Link>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Swagger
                </a>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="#authentication"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Key className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Authentication</p>
                <p className="text-xs text-muted-foreground">API key setup</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="#endpoints-ask"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <Zap className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Ask Endpoint</p>
                <p className="text-xs text-muted-foreground">RAG-powered Q&amp;A</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
            <a
              href="#endpoints-search"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Search className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Search</p>
                <p className="text-xs text-muted-foreground">Semantic vector search</p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>

          {/* New features banner */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <Sparkles className="size-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">New in v0.4.0</p>
              <p className="text-xs text-muted-foreground">
                Interactive API playground, multi-language code examples (5 languages), SDK code generator,
                changelog, webhook docs, and rate limit dashboard.
              </p>
            </div>
            <a
              href="#changelog"
              className="text-xs text-primary font-medium hover:underline underline-offset-2 shrink-0"
            >
              View changelog
            </a>
          </div>
        </section>

        {/* ─── Authentication ───────────────── */}
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
                Sign in to Tokamak Pilot and navigate to{' '}
                <a href="/settings" className="text-primary underline underline-offset-2">
                  Settings
                </a>
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

        {/* ─── Base URL ─────────────────────── */}
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

        {/* ─── Rate Limits ──────────────────── */}
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

        {/* ─── Endpoints ────────────────────── */}

        {/* Ask */}
        <section id="endpoints-ask" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Zap className="size-5 text-primary" />
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

        {/* Search */}
        <section id="endpoints-search" className="space-y-4">
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
        <section id="endpoints-sources" className="space-y-4">
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
        <section id="endpoints-content" className="space-y-4">
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
        <section id="endpoints-health" className="space-y-4">
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

        {/* ─── Error Codes ──────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Error Responses</h2>
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

        {/* ─── OpenAPI Spec Download ─────────── */}
        <section id="openapi-spec" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Download className="size-5 text-primary" />
            OpenAPI Specification
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Download the complete OpenAPI specification for the Tokamak Pilot API. Use it to generate
            client libraries, import into Postman, or integrate with any OpenAPI-compatible tool.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`${API_BASE_URL}/openapi.json`}
              download="tokamak-pilot-openapi.json"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
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
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
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

        {/* ─── AI-Friendly Output ────────────── */}
        <section id="ai-friendly" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            AI-Friendly Output
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tokamak Pilot provides AI-optimized endpoints for LLMs and agents to discover and consume knowledge.
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
              , Tokamak Pilot serves standardized files that LLMs and AI agents can discover and consume.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`${API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/llms.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <FileText className="size-3.5" />
                /llms.txt — Brief overview
              </a>
              <a
                href={`${API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/llms-full.txt`}
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
            <div className="space-y-2">
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
          </div>
        </section>

        {/* ─── Embeddable Widget ─────────────── */}
        <section id="embed-widget" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Code className="size-5 text-primary" />
            Embeddable Widget
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Add a &ldquo;Ask about Tokamak&rdquo; chat widget to any website with a single script tag.
            The widget uses the Public API and requires an API key with the{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">ask</code> scope.
          </p>
          <CodeBlock
            code={`<!-- Add this to your HTML -->
<script
  src="${API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/widget.js"
  data-api-key="tok_your_key_here"
  data-position="bottom-right"
  data-theme="dark"
  defer
></script>`}
            language="html"
          />
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-medium">Configuration Options</h4>
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
                    <td className="px-3 py-2"><span className="text-[11px] font-medium text-red-500">Required</span></td>
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
                    <td className="px-3 py-2 text-xs text-muted-foreground">Override the API base URL (defaults to the Tokamak Pilot instance)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── SDK ──────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">TypeScript SDK</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For TypeScript/JavaScript projects, you can use the official{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">@tokamak-pilot/sdk</code>{' '}
            package for a typed, ergonomic experience.
          </p>
          <CodeBlock
            code={`import { TokamakPilotClient } from '@tokamak-pilot/sdk';

const pilot = new TokamakPilotClient({
  baseUrl: '${API_BASE_URL}',
  apiKey: 'tok_your_key_here',
});

// Ask a question
const answer = await pilot.ask('What is TON staking?');
console.log(answer.answer, answer.sources);

// Semantic search
const results = await pilot.search('layer 2 rollup');
console.log(results.results);

// List sources
const { sources } = await pilot.listSources();
console.log(sources);

// Browse content
const content = await pilot.listContent({ project: 'titan' });
console.log(content.data);`}
            language="typescript"
          />
        </section>

        {/* ─── Rate Limit Dashboard ────────── */}
        <section id="rate-dashboard" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            Rate Limit Dashboard
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Monitor your API key usage, see remaining quota, check rate limit status, and view
            recent API calls in real-time.
          </p>
          <RateLimitDashboard />
        </section>

        {/* ─── Changelog / Release Notes ───── */}
        <section id="changelog" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <History className="size-5 text-primary" />
            Changelog
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Track API changes, new features, fixes, and deprecations across releases. Also available
            programmatically at{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              GET /api/v1/changelog
            </code>
          </p>
          <ChangelogSection />
        </section>

        {/* ─── Webhook Documentation ────────── */}
        <section id="webhooks" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Webhook className="size-5 text-primary" />
            Webhooks
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Receive real-time event notifications from Tokamak Pilot. Configure webhook URLs
            to be notified when sources sync, content changes, or rate limits are hit.
          </p>
          <WebhookDocs />
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Tokamak Pilot API v0.4.0</span>
          <div className="flex items-center gap-4">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3" />
              Interactive Swagger UI
            </a>
            <a
              href="/settings"
              className="hover:text-foreground transition-colors"
            >
              Manage API Keys
            </a>
            <a
              href="#changelog"
              className="hover:text-foreground transition-colors"
            >
              Changelog
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

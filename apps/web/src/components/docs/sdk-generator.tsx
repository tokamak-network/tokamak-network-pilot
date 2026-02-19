'use client';

import { useState } from 'react';
import { Copy, Check, Wand2 } from 'lucide-react';

interface SdkGeneratorProps {
  method: string;
  path: string;
  queryParams?: Array<{ name: string; type?: string; required: boolean; description: string; example?: string }>;
  bodyParams?: Array<{ name: string; type?: string; required: boolean; description: string; example?: string }>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * Maps public API paths to SDK method calls.
 */
function generateSdkCode(
  method: string,
  path: string,
  queryParams?: SdkGeneratorProps['queryParams'],
  bodyParams?: SdkGeneratorProps['bodyParams'],
): string {
  const lines: string[] = [
    `import { TokamakPilotClient } from '@tokamak-pilot/sdk';`,
    '',
    `const pilot = new TokamakPilotClient({`,
    `  baseUrl: 'https://pilot.tokamak.network/api/v1',`,
    `  apiKey: 'YOUR_API_KEY',`,
    `});`,
    '',
  ];

  // Match path patterns to SDK methods
  if (path === '/public/ask/stream' && method === 'POST') {
    const question = bodyParams?.find((p) => p.name === 'question')?.example || 'What is TON staking?';
    lines.push(`// Stream answer token-by-token via SSE`);
    lines.push(`let fullAnswer = '';`);
    lines.push('');
    lines.push(`await pilot.askStream('${question}', {`);
    lines.push(`  onMetadata: (meta) => {`);
    lines.push(`    console.log(\`Sources: \${meta.sources.length} found\`);`);
    lines.push(`    console.log(\`Confidence: \${meta.confidence}\`);`);
    lines.push(`  },`);
    lines.push(`  onChunk: (chunk) => {`);
    lines.push(`    fullAnswer += chunk.text;`);
    lines.push(`    process.stdout.write(chunk.text);`);
    lines.push(`  },`);
    lines.push(`  onDone: () => {`);
    lines.push(`    console.log('\\n--- Stream complete ---');`);
    lines.push(`    console.log('Full answer:', fullAnswer);`);
    lines.push(`  },`);
    lines.push(`  onError: (err) => {`);
    lines.push(`    console.error('Stream error:', err.message);`);
    lines.push(`  },`);
    lines.push(`});`);
  } else if (path === '/public/ask' && method === 'POST') {
    const question = bodyParams?.find((p) => p.name === 'question')?.example || 'What is TON staking?';
    const hasFilters = bodyParams?.some((p) => p.name === 'filters');
    lines.push(`// Ask a question with RAG-powered answer`);
    lines.push(`const result = await pilot.ask('${question}'${hasFilters ? `, ['tokamak-network/contracts-v2']` : ''});`);
    lines.push('');
    lines.push('console.log(result.answer);');
    lines.push('console.log(result.sources);');
    lines.push('console.log(`Confidence: ${result.confidence}`);');
  } else if (path === '/public/search' && method === 'GET') {
    const query = queryParams?.find((p) => p.name === 'q')?.example || 'TON staking';
    const limit = queryParams?.find((p) => p.name === 'limit')?.example;
    lines.push(`// Semantic search across the knowledge base`);
    lines.push(`const results = await pilot.search('${query}'${limit ? `, ${limit}` : ''});`);
    lines.push('');
    lines.push('for (const item of results.results) {');
    lines.push('  console.log(`[${item.score.toFixed(2)}] ${item.source}`);');
    lines.push('  console.log(item.content);');
    lines.push('}');
  } else if (path === '/public/sources' && method === 'GET') {
    lines.push(`// List all knowledge sources`);
    lines.push(`const { sources, total } = await pilot.listSources();`);
    lines.push('');
    lines.push('console.log(`Total sources: ${total}`);');
    lines.push('for (const source of sources) {');
    lines.push('  console.log(`${source.name} (${source.type}) — ${source.status}`);');
    lines.push('}');
  } else if (path.match(/^\/public\/sources\/:/) && method === 'GET') {
    lines.push(`// Get source details`);
    lines.push(`const source = await pilot.getSource('SOURCE_ID');`);
    lines.push('');
    lines.push('console.log(source.name, source.status);');
    lines.push('console.log(`Documents: ${source.documentCount || "N/A"}`);');
  } else if (path === '/public/content' && method === 'GET') {
    lines.push(`// Browse curated content entries`);
    lines.push(`const content = await pilot.listContent({`);
    lines.push(`  project: 'titan',`);
    lines.push(`  category: 'overview',`);
    lines.push(`});`);
    lines.push('');
    lines.push(`console.log(\`Found \${content.total} entries\`);`);
    lines.push('for (const entry of content.data) {');
    lines.push('  console.log(entry.title);');
    lines.push('}');
  } else if (path.match(/^\/public\/content\/:/) && method === 'GET') {
    lines.push(`// Get a specific content entry`);
    lines.push(`const entry = await pilot.getContent('CONTENT_ID');`);
    lines.push('');
    lines.push('console.log(entry.title);');
    lines.push('console.log(entry.body);');
    lines.push('console.log(`Tags: ${entry.tags.join(", ")}`);');
  } else if (path === '/public/health' && method === 'GET') {
    lines.push(`// Check API health`);
    lines.push(`const health = await pilot.health();`);
    lines.push('');
    lines.push('console.log(health.status);');
  } else {
    lines.push(`// This endpoint does not have a dedicated SDK method.`);
    lines.push(`// You can use the raw HTTP client instead.`);
    return lines.join('\n');
  }

  return lines.join('\n');
}

export function SdkGenerator({ method, path, queryParams, bodyParams }: SdkGeneratorProps) {
  const code = generateSdkCode(method, path, queryParams, bodyParams);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="size-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          SDK Snippet
        </span>
      </div>
      <div className="relative group rounded-lg border border-border bg-code-block overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <span className="text-[11px] text-muted-foreground font-mono uppercase">
            typescript — @tokamak-pilot/sdk
          </span>
          <CopyBtn text={code} />
        </div>
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-code-text">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

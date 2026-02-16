'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

type Language = 'curl' | 'javascript' | 'python' | 'go' | 'rust';

const LANGUAGE_LABELS: Record<Language, string> = {
  curl: 'cURL',
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
};

interface CodeGenOptions {
  method: string;
  fullUrl: string;
  queryParams?: Array<{ name: string; example?: string; required: boolean }>;
  bodyParams?: Array<{ name: string; type?: string; example?: string; required: boolean }>;
}

function buildExampleBody(
  bodyParams: Array<{ name: string; type?: string; example?: string; required: boolean }>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const bp of bodyParams) {
    if (!bp.required && !bp.example) continue;
    if (bp.type === 'string[]' || bp.type === 'array') {
      body[bp.name] = bp.example ? [bp.example] : ['example'];
    } else if (bp.type === 'number') {
      body[bp.name] = bp.example ? Number(bp.example) : 10;
    } else if (bp.type === 'boolean') {
      body[bp.name] = true;
    } else {
      body[bp.name] = bp.example || `example_${bp.name}`;
    }
  }
  return body;
}

function buildExampleUrl(
  fullUrl: string,
  queryParams?: Array<{ name: string; example?: string; required: boolean }>,
): string {
  if (!queryParams || queryParams.length === 0) return fullUrl;
  const parts: string[] = [];
  for (const qp of queryParams) {
    if (qp.required || qp.example) {
      parts.push(`${qp.name}=${encodeURIComponent(qp.example || 'example')}`);
    }
  }
  return parts.length > 0 ? `${fullUrl}?${parts.join('&')}` : fullUrl;
}

function generateCurl(opts: CodeGenOptions): string {
  const url = buildExampleUrl(opts.fullUrl, opts.queryParams);
  const lines: string[] = [];

  if (opts.method === 'GET') {
    lines.push(`curl "${url}" \\`);
  } else {
    lines.push(`curl -X ${opts.method} "${url}" \\`);
    lines.push(`  -H "Content-Type: application/json" \\`);
  }

  lines.push(`  -H "X-API-Key: YOUR_API_KEY"`);

  if (opts.method !== 'GET' && opts.bodyParams && opts.bodyParams.length > 0) {
    const body = buildExampleBody(opts.bodyParams);
    // Remove trailing line, add continuation
    lines[lines.length - 1] += ' \\';
    lines.push(`  -d '${JSON.stringify(body)}'`);
  }

  return lines.join('\n');
}

function generateJavaScript(opts: CodeGenOptions): string {
  const url = buildExampleUrl(opts.fullUrl, opts.queryParams);
  const lines: string[] = [];

  if (opts.method === 'GET') {
    lines.push(`const response = await fetch('${url}', {`);
    lines.push(`  headers: {`);
    lines.push(`    'X-API-Key': 'YOUR_API_KEY',`);
    lines.push(`  },`);
    lines.push(`});`);
  } else {
    const body = opts.bodyParams?.length ? buildExampleBody(opts.bodyParams) : {};
    lines.push(`const response = await fetch('${url}', {`);
    lines.push(`  method: '${opts.method}',`);
    lines.push(`  headers: {`);
    lines.push(`    'Content-Type': 'application/json',`);
    lines.push(`    'X-API-Key': 'YOUR_API_KEY',`);
    lines.push(`  },`);
    lines.push(`  body: JSON.stringify(${JSON.stringify(body, null, 4).split('\n').map((l, i) => (i === 0 ? l : '  ' + l)).join('\n')}),`);
    lines.push(`});`);
  }
  lines.push('');
  lines.push('const data = await response.json();');
  lines.push('console.log(data);');

  return lines.join('\n');
}

function generatePython(opts: CodeGenOptions): string {
  const url = buildExampleUrl(opts.fullUrl, opts.queryParams);
  const lines: string[] = ['import requests', ''];

  if (opts.method === 'GET') {
    lines.push(`response = requests.get(`);
    lines.push(`    "${url}",`);
    lines.push(`    headers={"X-API-Key": "YOUR_API_KEY"},`);
    lines.push(`)`);
  } else {
    const body = opts.bodyParams?.length ? buildExampleBody(opts.bodyParams) : {};
    lines.push(`response = requests.${opts.method.toLowerCase()}(`);
    lines.push(`    "${url}",`);
    lines.push(`    headers={"X-API-Key": "YOUR_API_KEY"},`);
    lines.push(`    json=${JSON.stringify(body)},`);
    lines.push(`)`);
  }

  lines.push('');
  lines.push('data = response.json()');
  lines.push('print(data)');

  return lines.join('\n');
}

function generateGo(opts: CodeGenOptions): string {
  const url = buildExampleUrl(opts.fullUrl, opts.queryParams);
  const lines: string[] = [];

  lines.push('package main');
  lines.push('');
  lines.push('import (');

  if (opts.method !== 'GET' && opts.bodyParams?.length) {
    lines.push('\t"bytes"');
    lines.push('\t"encoding/json"');
  }
  lines.push('\t"fmt"');
  lines.push('\t"io"');
  lines.push('\t"net/http"');
  lines.push(')');
  lines.push('');
  lines.push('func main() {');

  if (opts.method !== 'GET' && opts.bodyParams?.length) {
    const body = buildExampleBody(opts.bodyParams);
    lines.push(`\tbody, _ := json.Marshal(map[string]interface{}{`);
    for (const [key, value] of Object.entries(body)) {
      lines.push(`\t\t"${key}": ${JSON.stringify(value)},`);
    }
    lines.push('\t})');
    lines.push('');
    lines.push(`\treq, _ := http.NewRequest("${opts.method}", "${url}", bytes.NewBuffer(body))`);
    lines.push('\treq.Header.Set("Content-Type", "application/json")');
  } else {
    lines.push(`\treq, _ := http.NewRequest("${opts.method}", "${url}", nil)`);
  }

  lines.push('\treq.Header.Set("X-API-Key", "YOUR_API_KEY")');
  lines.push('');
  lines.push('\tclient := &http.Client{}');
  lines.push('\tresp, _ := client.Do(req)');
  lines.push('\tdefer resp.Body.Close()');
  lines.push('');
  lines.push('\tresBody, _ := io.ReadAll(resp.Body)');
  lines.push('\tfmt.Println(string(resBody))');
  lines.push('}');

  return lines.join('\n');
}

function generateRust(opts: CodeGenOptions): string {
  const url = buildExampleUrl(opts.fullUrl, opts.queryParams);
  const lines: string[] = [];

  lines.push('use reqwest;');

  if (opts.method !== 'GET' && opts.bodyParams?.length) {
    lines.push('use serde_json::json;');
  }

  lines.push('');
  lines.push('#[tokio::main]');
  lines.push('async fn main() -> Result<(), Box<dyn std::error::Error>> {');
  lines.push('    let client = reqwest::Client::new();');
  lines.push('');

  if (opts.method === 'GET') {
    lines.push(`    let response = client`);
    lines.push(`        .get("${url}")`);
  } else {
    lines.push(`    let response = client`);
    lines.push(`        .${opts.method.toLowerCase()}("${url}")`);
  }

  lines.push(`        .header("X-API-Key", "YOUR_API_KEY")`);

  if (opts.method !== 'GET' && opts.bodyParams?.length) {
    const body = buildExampleBody(opts.bodyParams);
    lines.push(`        .json(&json!(${JSON.stringify(body)}))`);
  }

  lines.push('        .send()');
  lines.push('        .await?;');
  lines.push('');
  lines.push('    let body = response.text().await?;');
  lines.push('    println!("{}", body);');
  lines.push('');
  lines.push('    Ok(())');
  lines.push('}');

  return lines.join('\n');
}

const generators: Record<Language, (opts: CodeGenOptions) => string> = {
  curl: generateCurl,
  javascript: generateJavaScript,
  python: generatePython,
  go: generateGo,
  rust: generateRust,
};

const syntaxLabels: Record<Language, string> = {
  curl: 'bash',
  javascript: 'javascript',
  python: 'python',
  go: 'go',
  rust: 'rust',
};

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
      {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

interface MultiLangCodeBlockProps {
  method: string;
  path: string;
  baseUrl: string;
  queryParams?: Array<{ name: string; example?: string; required: boolean }>;
  bodyParams?: Array<{ name: string; type?: string; example?: string; required: boolean }>;
}

export function MultiLangCodeBlock({
  method,
  path,
  baseUrl,
  queryParams,
  bodyParams,
}: MultiLangCodeBlockProps) {
  const [lang, setLang] = useState<Language>('curl');
  const languages: Language[] = ['curl', 'javascript', 'python', 'go', 'rust'];

  const fullUrl = `${baseUrl}${path}`;
  const opts: CodeGenOptions = { method, fullUrl, queryParams, bodyParams };
  const code = generators[lang](opts);

  return (
    <div>
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {languages.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              lang === l
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {LANGUAGE_LABELS[l]}
          </button>
        ))}
      </div>
      <div className="relative group rounded-lg border border-border bg-[#0d1117] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <span className="text-[11px] text-muted-foreground font-mono uppercase">
            {syntaxLabels[lang]}
          </span>
          <CopyBtn text={code} />
        </div>
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

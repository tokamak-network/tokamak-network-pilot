'use client';

import { useState, useCallback } from 'react';
import { Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ParamDef {
  name: string;
  type?: string;
  required: boolean;
  description: string;
  example?: string;
}

interface ApiPlaygroundProps {
  method: string;
  path: string;
  queryParams?: ParamDef[];
  bodyParams?: ParamDef[];
  baseUrl: string;
}

export function ApiPlayground({
  method,
  path,
  queryParams,
  bodyParams,
  baseUrl,
}: ApiPlaygroundProps) {
  const [apiKey, setApiKey] = useState('');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateParam = useCallback((name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const buildUrl = useCallback(() => {
    let url = `${baseUrl}${path}`;

    // Replace path params like :id
    const pathParamMatches = path.match(/:(\w+)/g);
    if (pathParamMatches) {
      for (const match of pathParamMatches) {
        const paramName = match.slice(1);
        const value = paramValues[paramName] || '';
        url = url.replace(match, encodeURIComponent(value));
      }
    }

    // Add query params
    if (queryParams && queryParams.length > 0) {
      const params = new URLSearchParams();
      for (const qp of queryParams) {
        const value = paramValues[qp.name];
        if (value) params.set(qp.name, value);
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    return url;
  }, [baseUrl, path, queryParams, paramValues]);

  const buildBody = useCallback(() => {
    if (!bodyParams || bodyParams.length === 0 || method === 'GET') return undefined;
    const body: Record<string, unknown> = {};
    for (const bp of bodyParams) {
      const value = paramValues[bp.name];
      if (value !== undefined && value !== '') {
        if (bp.type === 'string[]' || bp.type === 'array') {
          try {
            body[bp.name] = JSON.parse(value);
          } catch {
            body[bp.name] = value.split(',').map((s) => s.trim());
          }
        } else if (bp.type === 'number') {
          body[bp.name] = Number(value);
        } else if (bp.type === 'boolean') {
          body[bp.name] = value === 'true';
        } else {
          body[bp.name] = value;
        }
      }
    }
    return JSON.stringify(body, null, 2);
  }, [bodyParams, method, paramValues]);

  const sendRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const url = buildUrl();
    const body = buildBody();
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const res = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? body : undefined,
      });

      const duration = Math.round(performance.now() - start);
      const respHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        respHeaders[k] = v;
      });

      let respBody: string;
      try {
        const json = await res.json();
        respBody = JSON.stringify(json, null, 2);
      } catch {
        respBody = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
        body: respBody,
        duration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [apiKey, buildUrl, buildBody, method]);

  // Extract path params
  const pathParams = (path.match(/:(\w+)/g) || []).map((m) => m.slice(1));

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.02] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Play className="size-4 text-primary" />
        <h5 className="text-xs font-semibold text-primary uppercase tracking-wider">
          API Playground
        </h5>
      </div>

      {/* API Key Input */}
      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
          API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="tok_your_key_here"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      {/* Path Params */}
      {pathParams.length > 0 && (
        <div className="space-y-2">
          <label className="block text-[11px] font-medium text-muted-foreground">
            Path Parameters
          </label>
          {pathParams.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                :{name}
              </span>
              <input
                type="text"
                value={paramValues[name] || ''}
                onChange={(e) => updateParam(name, e.target.value)}
                placeholder={`Enter ${name}`}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Query Params */}
      {queryParams && queryParams.length > 0 && (
        <div className="space-y-2">
          <label className="block text-[11px] font-medium text-muted-foreground">
            Query Parameters
          </label>
          {queryParams.map((qp) => (
            <div key={qp.name} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                {qp.name}
                {qp.required && <span className="text-red-500">*</span>}
              </span>
              <input
                type="text"
                value={paramValues[qp.name] || ''}
                onChange={(e) => updateParam(qp.name, e.target.value)}
                placeholder={qp.example || qp.description}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Body Params */}
      {bodyParams && bodyParams.length > 0 && method !== 'GET' && (
        <div className="space-y-2">
          <label className="block text-[11px] font-medium text-muted-foreground">
            Request Body
          </label>
          {bodyParams.map((bp) => (
            <div key={bp.name} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">
                {bp.name}
                {bp.required && <span className="text-red-500">*</span>}
              </span>
              <input
                type="text"
                value={paramValues[bp.name] || ''}
                onChange={(e) => updateParam(bp.name, e.target.value)}
                placeholder={bp.example || `${bp.type || 'string'} — ${bp.description}`}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Send Button */}
      <button
        onClick={sendRequest}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Play className="size-3.5" />
            Send Request
          </>
        )}
      </button>

      {/* Response */}
      {response && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {response.status < 400 ? (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="size-3.5 text-red-500" />
            )}
            <span
              className={`text-xs font-mono font-bold ${
                response.status < 400 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {response.status} {response.statusText}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {response.duration}ms
            </span>
          </div>
          <div className="rounded-lg border border-border bg-[#0d1117] overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <span className="text-[11px] text-muted-foreground font-mono uppercase">
                Response
              </span>
            </div>
            <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-300 max-h-80 overflow-y-auto">
              <code>{response.body}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <AlertCircle className="size-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

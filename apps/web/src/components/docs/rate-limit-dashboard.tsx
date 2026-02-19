'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Key,
  Activity,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ApiKeyStats {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  rateLimit: number;
  isActive: boolean;
  totalRequests: number;
  lastUsedAt?: string;
  scopes: string[];
  createdAt: string;
}

interface UsageEntry {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number;
  createdAt: string;
}

interface UsageResponse {
  data: UsageEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const TIER_COLORS: Record<string, string> = {
  free: 'text-muted-foreground bg-muted border-border',
  standard: 'text-info bg-info/10 border-info/20',
  premium: 'text-chart-4 bg-chart-4/10 border-chart-4/20',
};

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  standard: 60,
  premium: 200,
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tokamak_token');
}

export function RateLimitDashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKeyStats[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const fetchKeys = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    setIsAuthenticated(true);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/api-keys`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        throw new Error(`Failed to fetch API keys: ${res.status}`);
      }
      const data: ApiKeyStats[] = await res.json();
      setApiKeys(data);
      if (data.length > 0 && !selectedKeyId) {
        setSelectedKeyId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [apiBase, selectedKeyId]);

  const fetchUsage = useCallback(
    async (keyId: string) => {
      const token = getToken();
      if (!token) return;
      setUsageLoading(true);

      try {
        const res = await fetch(`${apiBase}/api-keys/${keyId}/usage?limit=20`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error(`Failed to fetch usage: ${res.status}`);
        const data: UsageResponse = await res.json();
        setUsage(data.data);
      } catch {
        setUsage([]);
      } finally {
        setUsageLoading(false);
      }
    },
    [apiBase],
  );

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  useEffect(() => {
    if (selectedKeyId) {
      fetchUsage(selectedKeyId);
    }
  }, [selectedKeyId, fetchUsage]);

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
        <Key className="size-8 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-medium">Sign in to view your rate limit dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">
            The rate limit dashboard shows usage statistics for your API keys. Sign in to access it.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
        <AlertTriangle className="size-5 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">{error}</p>
          <button
            onClick={fetchKeys}
            className="text-xs text-destructive underline underline-offset-2 mt-1"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center space-y-3">
        <Key className="size-8 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-medium">No API keys found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create an API key in{' '}
            <a href="/settings" className="text-primary underline underline-offset-2">
              Settings
            </a>{' '}
            to start tracking usage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground shrink-0">API Key:</label>
        <select
          value={selectedKeyId || ''}
          onChange={(e) => setSelectedKeyId(e.target.value)}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          {apiKeys.map((key) => (
            <option key={key.id} value={key.id}>
              {key.name} ({key.keyPrefix}...)
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            fetchKeys();
            if (selectedKeyId) fetchUsage(selectedKeyId);
          }}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      </div>

      {selectedKey && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="size-3.5" />
                <span className="text-[11px] font-medium">Total Requests</span>
              </div>
              <p className="text-xl font-bold font-mono">
                {selectedKey.totalRequests.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BarChart3 className="size-3.5" />
                <span className="text-[11px] font-medium">Rate Limit</span>
              </div>
              <p className="text-xl font-bold font-mono">
                {selectedKey.rateLimit}
                <span className="text-xs text-muted-foreground font-normal">/min</span>
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Key className="size-3.5" />
                <span className="text-[11px] font-medium">Tier</span>
              </div>
              <span
                className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold capitalize ${
                  TIER_COLORS[selectedKey.tier] || TIER_COLORS.free
                }`}
              >
                {selectedKey.tier}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                <span className="text-[11px] font-medium">Last Used</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                {selectedKey.lastUsedAt
                  ? new Date(selectedKey.lastUsedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Rate Limit Bar */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rate Limit Quota
              </h5>
              <span className="text-xs text-muted-foreground">
                {selectedKey.rateLimit} requests per minute
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              {(() => {
                const maxLimit = TIER_LIMITS.premium;
                const pct = Math.min((selectedKey.rateLimit / maxLimit) * 100, 100);
                return (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                      selectedKey.tier === 'premium'
                        ? 'bg-chart-4'
                        : selectedKey.tier === 'standard'
                        ? 'bg-info'
                        : 'bg-muted-foreground'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                );
              })()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Free: 10/min</span>
              <span>Standard: 60/min</span>
              <span>Premium: 200/min</span>
            </div>
          </div>

          {/* Scopes */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Scopes
            </h5>
            <div className="flex flex-wrap gap-2">
              {selectedKey.scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
            {selectedKey.isActive ? (
              <>
                <CheckCircle2 className="size-4 text-success" />
                <span className="text-sm font-medium text-success">Active</span>
                <span className="text-xs text-muted-foreground">— This key is accepting requests</span>
              </>
            ) : (
              <>
                <XCircle className="size-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Inactive</span>
                <span className="text-xs text-muted-foreground">— This key is disabled and will reject all requests</span>
              </>
            )}
          </div>

          {/* Recent Usage */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent API Calls
            </h5>
            {usageLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : usage.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">No recent API calls recorded</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
                        Method
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
                        Endpoint
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
                        Duration
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((entry) => (
                      <tr key={entry.id} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                              entry.method === 'GET'
                                ? 'bg-success/15 text-success'
                                : 'bg-info/15 text-info'
                            }`}
                          >
                            {entry.method}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                          {entry.endpoint}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs font-mono font-bold ${
                              entry.statusCode < 400
                                ? 'text-success'
                                : entry.statusCode < 500
                                ? 'text-warning'
                                : 'text-destructive'
                            }`}
                          >
                            {entry.statusCode}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                          {entry.responseTimeMs != null ? `${entry.responseTimeMs}ms` : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

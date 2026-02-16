'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  RotateCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  type ApiKeyResponse,
  type CreateApiKeyResponse,
  fetchApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  rotateApiKey,
} from '@/lib/api';

const ALL_SCOPES = ['ask', 'search', 'sources:read', 'content:read'] as const;

// ─── Helpers ──────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(days / 365)}y ago`;
}

// ─── Main Page ────────────────────────────────────────

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New key form
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([...ALL_SCOPES]);
  const [creating, setCreating] = useState(false);

  // Newly created key (show once)
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Rotate confirmation
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [confirmRotateId, setConfirmRotateId] = useState<string | null>(null);

  // Toggling active
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchApiKeys();
      setKeys(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // ─── Create ───
  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const result = await createApiKey({
        name: newKeyName.trim(),
        scopes: newKeyScopes,
      });
      setCreatedKey(result);
      setCopiedKey(false);
      setShowSecret(false);
      setShowCreate(false);
      setNewKeyName('');
      setNewKeyScopes([...ALL_SCOPES]);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  // ─── Copy key ───
  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // ─── Toggle active ───
  const handleToggleActive = async (key: ApiKeyResponse) => {
    setTogglingId(key.id);
    try {
      await updateApiKey(key.id, { isActive: !key.isActive });
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update key');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Delete ───
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteApiKey(id);
      setConfirmDeleteId(null);
      if (createdKey?.id === id) setCreatedKey(null);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete key');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Rotate ───
  const handleRotate = async (id: string) => {
    setRotatingId(id);
    try {
      const result = await rotateApiKey(id);
      setCreatedKey(result);
      setCopiedKey(false);
      setShowSecret(false);
      setConfirmRotateId(null);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rotate key');
    } finally {
      setRotatingId(null);
    }
  };

  // ─── Scope toggle ───
  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your API keys for SDK and external access.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreate(!showCreate);
            setCreatedKey(null);
          }}
          size="sm"
        >
          <Plus className="size-4 mr-1.5" />
          New API Key
        </Button>
      </div>

      <Separator />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Newly Created Key Banner */}
      {createdKey && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              {createdKey.name} — Save Your API Key
            </CardTitle>
            <CardDescription className="text-xs">
              Copy this key now. You won&apos;t be able to see it again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono select-all break-all">
                {showSecret ? createdKey.key : '•'.repeat(40)}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => handleCopy(createdKey.key)}
              >
                {copiedKey ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Key Form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Create New API Key</CardTitle>
            <CardDescription className="text-xs">
              Generate a key for SDK or external integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Key Name
              </label>
              <Input
                placeholder="e.g. Production DApp, Staging Bot"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      newKeyScopes.includes(scope)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()} size="sm">
                {creating && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Create Key
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreate(false);
                  setNewKeyName('');
                  setNewKeyScopes([...ALL_SCOPES]);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keys List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Your API Keys
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No API keys yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Create an API key to start using the Tokamak Forest SDK or integrate
                with external services.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-4 mr-1.5" />
                Create Your First Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((apiKey) => (
              <Card
                key={apiKey.id}
                className={!apiKey.isActive ? 'opacity-60' : undefined}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Key className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          {apiKey.name}
                          <Badge
                            variant={apiKey.isActive ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {apiKey.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs font-mono mt-0.5">
                          {apiKey.keyPrefix}••••••••
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Toggle Active */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={togglingId === apiKey.id}
                        onClick={() => handleToggleActive(apiKey)}
                      >
                        {togglingId === apiKey.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : apiKey.isActive ? (
                          'Disable'
                        ) : (
                          'Enable'
                        )}
                      </Button>

                      {/* Rotate */}
                      {confirmRotateId === apiKey.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            disabled={rotatingId === apiKey.id}
                            onClick={() => handleRotate(apiKey.id)}
                          >
                            {rotatingId === apiKey.id ? (
                              <Loader2 className="size-3.5 animate-spin mr-1" />
                            ) : (
                              <RotateCw className="size-3.5 mr-1" />
                            )}
                            Confirm
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setConfirmRotateId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => setConfirmRotateId(apiKey.id)}
                          title="Rotate key"
                        >
                          <RotateCw className="size-3.5" />
                        </Button>
                      )}

                      {/* Delete */}
                      {confirmDeleteId === apiKey.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            disabled={deletingId === apiKey.id}
                            onClick={() => handleDelete(apiKey.id)}
                          >
                            {deletingId === apiKey.id ? (
                              <Loader2 className="size-3.5 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="size-3.5 mr-1" />
                            )}
                            Revoke
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => setConfirmDeleteId(apiKey.id)}
                          title="Revoke key"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                    <span>
                      Tier:{' '}
                      <span className="font-medium text-foreground capitalize">
                        {apiKey.tier}
                      </span>
                    </span>
                    <span>
                      Rate limit:{' '}
                      <span className="font-medium text-foreground">
                        {apiKey.rateLimit}/min
                      </span>
                    </span>
                    <span>
                      Requests:{' '}
                      <span className="font-medium text-foreground">
                        {Number(apiKey.totalRequests).toLocaleString()}
                      </span>
                    </span>
                    {apiKey.lastUsedAt && (
                      <span>
                        Last used:{' '}
                        <span className="font-medium text-foreground">
                          {timeAgo(apiKey.lastUsedAt)}
                        </span>
                      </span>
                    )}
                    <span>
                      Created:{' '}
                      <span className="font-medium text-foreground">
                        {timeAgo(apiKey.createdAt)}
                      </span>
                    </span>
                    {apiKey.expiresAt && (
                      <span>
                        Expires:{' '}
                        <span className="font-medium text-foreground">
                          {new Date(apiKey.expiresAt).toLocaleDateString()}
                        </span>
                      </span>
                    )}
                  </div>
                  {apiKey.scopes && apiKey.scopes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {apiKey.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Loader2,
  Copy,
  Check,
  Twitter,
  Linkedin,
  Instagram,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  bulkGeneratePosts,
  type SocialPlatform,
  type ProjectNewsArticle,
  type BulkGenerateResult,
} from '@/lib/api';

const PLATFORMS: Array<{
  id: SocialPlatform;
  label: string;
  icon: React.ElementType;
  color: string;
}> = [
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: Twitter,
    color: 'bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500/20',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-600/10 text-blue-700 border-blue-600/20 hover:bg-blue-600/20',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20',
  },
];

interface BulkSocialGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: ProjectNewsArticle[];
  projectIdOrSlug: string;
  onComplete?: () => void;
}

export function BulkSocialGenerator({
  open,
  onOpenChange,
  articles,
  projectIdOrSlug,
  onComplete,
}: BulkSocialGeneratorProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<SocialPlatform>>(
    new Set(['twitter']),
  );
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<BulkGenerateResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const totalPosts = articles.length * selectedPlatforms.size;

  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        if (next.size > 1) next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');
      setResult(null);
      const res = await bulkGeneratePosts(
        projectIdOrSlug,
        articles.map((a) => a.id),
        Array.from(selectedPlatforms),
        customPrompt || undefined,
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate posts');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      if (result && result.total > 0) onComplete?.();
      setResult(null);
      setError('');
      setCopiedId(null);
      setCustomPrompt('');
    }
    onOpenChange(isOpen);
  };

  const platformIcon = (p: SocialPlatform) => {
    const found = PLATFORMS.find((pl) => pl.id === p);
    if (!found) return null;
    return <found.icon className="size-3.5" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Bulk Generate Social Posts
          </DialogTitle>
          <DialogDescription>
            Generate posts for {articles.length} article{articles.length > 1 ? 's' : ''} across
            selected platforms
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {/* Selected articles preview */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Articles ({articles.length})
              </label>
              <div className="rounded-lg border bg-muted/30 p-3 max-h-32 overflow-y-auto space-y-1.5">
                {articles.map((a) => (
                  <div key={a.id} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-foreground/70 shrink-0 mt-0.5">•</span>
                    <span className="line-clamp-1">{a.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform picker — multi-select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Platforms{' '}
                <span className="text-muted-foreground font-normal">(select multiple)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const selected = selectedPlatforms.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all relative',
                        selected
                          ? p.color + ' border-current ring-1 ring-current/20'
                          : 'border-border hover:border-muted-foreground/30',
                      )}
                    >
                      {selected && (
                        <Check className="absolute top-1.5 right-1.5 size-3 text-current" />
                      )}
                      <p.icon className="size-5" />
                      <span className="text-xs font-medium">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom prompt */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Custom instructions{' '}
                <span className="text-muted-foreground font-normal">(optional, applies to all)</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Focus on the technical impact, keep a casual tone..."
                rows={2}
                className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating {totalPosts} post{totalPosts > 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Generate {totalPosts} Post{totalPosts > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Summary bar */}
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3 text-green-600" />
                {result.total} generated
              </Badge>
              {result.errors.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="size-3" />
                  {result.errors.length} failed
                </Badge>
              )}
            </div>

            {/* Generated posts */}
            <div className="space-y-3">
              {result.generated.map((post) => (
                <div key={post.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {platformIcon(post.platform)}
                      <span className="text-xs font-medium capitalize">
                        {post.platform}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {post.articleTitle}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 px-2"
                      onClick={() => handleCopy(post.content, post.id)}
                    >
                      {copiedId === post.id ? (
                        <Check className="size-3 text-green-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground max-h-28 overflow-y-auto">
                    {post.content}
                  </div>
                </div>
              ))}
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">Errors:</p>
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs text-destructive/80">
                    {err.platform}: {err.error}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleClose(false)}
              >
                Done
              </Button>
              <a href="/social-posts">
                <Button variant="default" size="sm" className="gap-1.5">
                  <ExternalLink className="size-3.5" />
                  View All Posts
                </Button>
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

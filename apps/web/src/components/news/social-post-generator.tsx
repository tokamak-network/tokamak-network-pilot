'use client';

import { useState } from 'react';
import {
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Twitter,
  Linkedin,
  Instagram,
  Sparkles,
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
  generateSocialPost,
  type SocialPlatform,
  type ProjectNewsArticle,
  type GeneratedSocialPost,
} from '@/lib/api';

const PLATFORMS: Array<{
  id: SocialPlatform;
  label: string;
  icon: React.ElementType;
  color: string;
  charHint: string;
}> = [
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: Twitter,
    color: 'bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500/20',
    charHint: '280 chars max',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-600/10 text-blue-700 border-blue-600/20 hover:bg-blue-600/20',
    charHint: '150-300 words',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20',
    charHint: '100-200 words + hashtags',
  },
];

interface SocialPostGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: ProjectNewsArticle;
  projectIdOrSlug: string;
}

export function SocialPostGenerator({
  open,
  onOpenChange,
  article,
  projectIdOrSlug,
}: SocialPostGeneratorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('twitter');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedSocialPost | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError('');
      setResult(null);
      const post = await generateSocialPost(
        projectIdOrSlug,
        article.id,
        selectedPlatform,
        customPrompt || undefined,
      );
      setResult(post);
    } catch (err: any) {
      setError(err.message || 'Failed to generate post');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handlePlatformChange = (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    setResult(null);
    setError('');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setResult(null);
      setError('');
      setCopied(false);
      setCustomPrompt('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Generate Social Post
          </DialogTitle>
          <DialogDescription className="text-xs line-clamp-1">
            From: {article.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformChange(p.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all',
                    selectedPlatform === p.id
                      ? p.color + ' border-current ring-1 ring-current/20'
                      : 'border-border hover:border-muted-foreground/30',
                  )}
                >
                  <p.icon className="size-5" />
                  <span className="text-xs font-medium">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.charHint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Custom instructions{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Make it more casual, focus on the technical aspects, include a call to action..."
              rows={2}
              className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          {/* Generate Button */}
          {!result && (
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2" />
                  Generate Post
                </>
              )}
            </Button>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs gap-1">
                  {PLATFORMS.find((p) => p.id === result.platform)?.label}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {result.content.length} chars
                </span>
              </div>

              <div className="relative">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result.content}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 mr-1.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-1.5" />
                      Copy to clipboard
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  size="sm"
                  disabled={generating}
                >
                  <RefreshCw
                    className={cn(
                      'size-3.5 mr-1.5',
                      generating && 'animate-spin',
                    )}
                  />
                  Regenerate
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Generated by {result.model} via {result.provider}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

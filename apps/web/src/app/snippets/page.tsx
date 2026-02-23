'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  Code2,
  Search,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Filter,
  X,
  Wand2,
  Tag,
} from 'lucide-react';
import { userAtom } from '@/store';
import {
  fetchSnippets,
  generateSnippet,
  createSnippet,
  deleteSnippet,
  trackSnippetCopy,
  type SnippetResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  javascript: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  python: 'bg-green-500/10 text-green-600 border-green-500/20',
  solidity: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  rust: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  go: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  bash: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  shell: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

function SnippetCopyButton({ snippet }: { snippet: SnippetResponse }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    trackSnippetCopy(snippet.id).catch(() => {});
    setTimeout(() => setCopied(false), 2000);
  }, [snippet]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1 text-xs"
    >
      {copied ? (
        <>
          <Check className="size-3 text-emerald-500" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Copy
        </>
      )}
    </Button>
  );
}

function SnippetCard({
  snippet,
  onDelete,
  canDelete,
}: {
  snippet: SnippetResponse;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const langColor =
    LANGUAGE_COLORS[snippet.language] ||
    'bg-muted text-muted-foreground border-border/40';

  return (
    <Card className="group overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium leading-snug">
              {snippet.title}
            </CardTitle>
            {snippet.description && (
              <CardDescription className="mt-1 text-xs line-clamp-2">
                {snippet.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <SnippetCopyButton snippet={snippet} />
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(snippet.id)}
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Code block */}
        <div className="rounded-lg bg-code-block border border-border/40 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-code-header border-b border-border/20">
            <span className="text-[10px] font-mono text-code-muted uppercase tracking-wider">
              {snippet.language}
            </span>
            {snippet.copyCount > 0 && (
              <span className="text-[10px] text-code-muted">
                {snippet.copyCount} copies
              </span>
            )}
          </div>
          <pre className="p-3 overflow-x-auto max-h-64">
            <code className="text-xs font-mono text-code-text leading-relaxed whitespace-pre">
              {snippet.code}
            </code>
          </pre>
        </div>

        {/* Tags and metadata */}
        <div className="flex items-center flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 ${langColor}`}
          >
            {snippet.language}
          </Badge>
          {snippet.category && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {snippet.category}
            </Badge>
          )}
          {snippet.isGenerated && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 bg-violet-500/10 text-violet-600 border-violet-500/20"
            >
              <Sparkles className="size-2.5 mr-0.5" />
              AI
            </Badge>
          )}
          {snippet.tags
            .filter((t) => t.trim())
            .slice(0, 3)
            .map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {tag}
              </Badge>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SnippetsPage() {
  const [user] = useAtom(userAtom);
  const [snippets, setSnippets] = useState<SnippetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Search and filter state
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // AI generation state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [genLanguage, setGenLanguage] = useState('typescript');
  const [isGenerating, setIsGenerating] = useState(false);

  // Create snippet state
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createLang, setCreateLang] = useState('typescript');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSnippets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSnippets({
        search: searchDebounced || undefined,
        language: langFilter || undefined,
        limit: 50,
      });
      setSnippets(res.data);
      setTotal(res.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, langFilter]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteSnippet(id);
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        setTotal((t) => t - 1);
      } catch {
        // ignore
      }
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
    if (!genPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generateSnippet({
        prompt: genPrompt,
        language: genLanguage,
      });
      setSnippets((prev) => [result, ...prev]);
      setTotal((t) => t + 1);
      setGenPrompt('');
      setShowGenerate(false);
    } catch {
      // ignore
    } finally {
      setIsGenerating(false);
    }
  }, [genPrompt, genLanguage, isGenerating]);

  const handleCreate = useCallback(async () => {
    if (!createTitle.trim() || !createCode.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const result = await createSnippet({
        title: createTitle,
        code: createCode,
        language: createLang,
        description: createDesc || undefined,
        category: createCategory || undefined,
      });
      setSnippets((prev) => [result, ...prev]);
      setTotal((t) => t + 1);
      setCreateTitle('');
      setCreateCode('');
      setCreateDesc('');
      setCreateCategory('');
      setShowCreate(false);
    } catch {
      // ignore
    } finally {
      setIsCreating(false);
    }
  }, [createTitle, createCode, createLang, createDesc, createCategory, isCreating]);

  const languages = [
    'typescript',
    'javascript',
    'python',
    'solidity',
    'rust',
    'go',
    'bash',
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-semibold flex items-center gap-2">
            <Code2 className="size-6 text-primary" />
            Code Snippets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ready-to-use code examples for the Tokamak ecosystem.
            {total > 0 && ` ${total} snippets available.`}
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowGenerate(!showGenerate);
                setShowCreate(false);
              }}
              className="gap-1.5"
            >
              <Wand2 className="size-3.5" />
              AI Generate
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setShowCreate(!showCreate);
                setShowGenerate(false);
              }}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Snippet
            </Button>
          </div>
        )}
      </div>

      {/* AI Generate Panel */}
      {showGenerate && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wand2 className="size-4 text-violet-500" />
              Generate with AI
            </CardTitle>
            <CardDescription className="text-xs">
              Describe what you need and the AI will generate working code using
              real Tokamak APIs from the indexed knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="e.g. Write a script that stakes 100 TON tokens using the Tokamak SDK..."
              className="w-full h-24 rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center gap-3">
              <select
                value={genLanguage}
                onChange={(e) => setGenLanguage(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleGenerate}
                disabled={!genPrompt.trim() || isGenerating}
                size="sm"
                className="gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGenerate(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Snippet Panel */}
      {showCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="size-4" />
              Add a Snippet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Title (e.g. Deploy a rollup)"
            />
            <Input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Description (optional)"
            />
            <div className="flex items-center gap-3">
              <select
                value={createLang}
                onChange={(e) => setCreateLang(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <Input
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                placeholder="Category (optional)"
                className="max-w-48"
              />
            </div>
            <textarea
              value={createCode}
              onChange={(e) => setCreateCode(e.target.value)}
              placeholder="Paste your code here..."
              className="w-full h-40 rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreate}
                disabled={!createTitle.trim() || !createCode.trim() || isCreating}
                size="sm"
                className="gap-1.5"
              >
                {isCreating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets..."
            className="pl-10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-muted-foreground" />
          <button
            onClick={() => setLangFilter('')}
            className={`px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              !langFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {languages.map((l) => (
            <button
              key={l}
              onClick={() => setLangFilter(langFilter === l ? '' : l)}
              className={`px-2.5 py-1.5 rounded-md text-xs capitalize transition-colors ${
                langFilter === l
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Snippets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : snippets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Code2 className="size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {search || langFilter ? 'No snippets match your filters' : 'No snippets yet'}
          </h3>
          <p className="text-sm text-muted-foreground/60 mt-1 max-w-md">
            {search || langFilter
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating a snippet manually or generating one with AI.'}
          </p>
          {user && !search && !langFilter && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGenerate(true)}
                className="gap-1.5"
              >
                <Wand2 className="size-3.5" />
                Generate with AI
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreate(true)}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Add Snippet
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {snippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              onDelete={handleDelete}
              canDelete={!!user}
            />
          ))}
        </div>
      )}
    </div>
  );
}

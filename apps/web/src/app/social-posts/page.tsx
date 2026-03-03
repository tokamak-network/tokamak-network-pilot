'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import {
  Sparkles,
  Loader2,
  Twitter,
  Linkedin,
  Instagram,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Clock,
  Filter,
  Search,
  CheckCircle2,
  FileEdit,
  Archive,
  BarChart3,
  FolderKanban,
  Newspaper,
} from 'lucide-react';
import Link from 'next/link';
import { activeProjectAtom, projectsAtom } from '@/store';
import {
  fetchProjects,
  fetchGeneratedPosts,
  fetchGeneratedPostStats,
  updateGeneratedPost,
  deleteGeneratedPost,
  type GeneratedPostItem,
  type GeneratedPostStats,
  type SocialPlatform,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; icon: React.ElementType; color: string }
> = {
  twitter: { label: 'Twitter / X', icon: Twitter, color: 'text-sky-600 bg-sky-500/10' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700 bg-blue-600/10' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-600 bg-pink-500/10' },
};

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: FileEdit, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  published: { label: 'Published', icon: CheckCircle2, color: 'text-green-600 bg-green-500/10 border-green-500/20' },
  archived: { label: 'Archived', icon: Archive, color: 'text-muted-foreground bg-muted border-border' },
};

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
  return `${months}mo ago`;
}

export default function SocialPostsPage() {
  const [activeProject] = useAtom(activeProjectAtom);
  const [projects, setProjects] = useAtom(projectsAtom);

  const [posts, setPosts] = useState<GeneratedPostItem[]>([]);
  const [stats, setStats] = useState<GeneratedPostStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  // Filters
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | ''>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects()
        .then((data) => setProjects(data.projects))
        .catch(() => {});
    }
  }, [projects.length, setProjects]);

  const projectId = activeProject?.id;
  const newsEnabledProjects = useMemo(
    () => projects.filter((p) => p.isNewsEnabled),
    [projects],
  );

  const loadPosts = useCallback(async () => {
    const id = projectId || newsEnabledProjects[0]?.id;
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [postsRes, statsRes] = await Promise.all([
        fetchGeneratedPosts(id, {
          page,
          limit,
          platform: platformFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        fetchGeneratedPostStats(id),
      ]);
      setPosts(postsRes.data);
      setTotal(postsRes.total);
      setHasMore(postsRes.hasMore);
      setStats(statsRes);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, newsEnabledProjects, page, platformFilter, statusFilter, search]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    setPage(1);
  }, [platformFilter, statusFilter, search]);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (post: GeneratedPostItem, newStatus: string) => {
    const pid = projectId || newsEnabledProjects[0]?.id;
    if (!pid) return;
    try {
      const updated = await updateGeneratedPost(pid, post.id, { status: newStatus });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      loadPosts();
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (postId: string) => {
    const pid = projectId || newsEnabledProjects[0]?.id;
    if (!pid) return;
    try {
      await deleteGeneratedPost(pid, postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setTotal((prev) => prev - 1);
      loadPosts();
    } catch {
      // silently fail
    }
  };

  const handleEditSave = async (postId: string) => {
    const pid = projectId || newsEnabledProjects[0]?.id;
    if (!pid) return;
    try {
      const updated = await updateGeneratedPost(pid, postId, { content: editContent });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      setEditingId(null);
    } catch {
      // silently fail
    }
  };

  const startEdit = (post: GeneratedPostItem) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const effectiveId = projectId || newsEnabledProjects[0]?.id;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="size-6" />
            Social Posts
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-generated social media content from your news articles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeProject && (
            <Badge variant="secondary" className="gap-1.5">
              <FolderKanban className="size-3" />
              {activeProject.name}
            </Badge>
          )}
          <Link href="/news">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Newspaper className="size-3.5" />
              News
            </Button>
          </Link>
        </div>
      </div>

      {!effectiveId ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Sparkles className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No project selected</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            Select a project from the sidebar or enable news on a project to start
            generating social media content.
          </p>
          <Link href="/projects">
            <Button variant="outline">
              <FolderKanban className="size-4" />
              Go to Projects
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          {stats && stats.total > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <BarChart3 className="size-3" />
                  Total
                </div>
                <p className="text-2xl font-semibold tabular-nums">{stats.total}</p>
              </div>
              {Object.entries(stats.byPlatform).map(([platform, count]) => {
                const meta = PLATFORM_META[platform as SocialPlatform];
                if (!meta) return null;
                return (
                  <div key={platform} className="rounded-lg border bg-card p-3">
                    <div className={cn('flex items-center gap-2 text-xs mb-1', meta.color)}>
                      <meta.icon className="size-3" />
                      {meta.label}
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">{count}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full h-9 pl-9 pr-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="size-3.5 text-muted-foreground" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as SocialPlatform | '')}
                className="h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All platforms</option>
                <option value="twitter">Twitter / X</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Posts list */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted mb-4">
                <Sparkles className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No posts yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                Generate social media posts from your news articles. Select articles
                on the News page and choose platforms to create content.
              </p>
              <Link href="/news">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Newspaper className="size-3.5" />
                  Go to News
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => {
                const platformMeta = PLATFORM_META[post.platform];
                const statusMeta = STATUS_META[post.status];
                const isEditing = editingId === post.id;

                return (
                  <div
                    key={post.id}
                    className="group rounded-lg border bg-card p-4 space-y-3 transition-all hover:shadow-sm"
                  >
                    {/* Post header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', platformMeta.color)}>
                          <platformMeta.icon className="size-3" />
                          {platformMeta.label}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] gap-1', statusMeta.color)}
                        >
                          <statusMeta.icon className="size-2.5" />
                          {statusMeta.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-2.5" />
                          {timeAgo(post.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(post.content, post.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Copy"
                        >
                          {copiedId === post.id ? (
                            <Check className="size-3.5 text-green-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(post)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Edit"
                          >
                            <FileEdit className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Source article */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">From:</span>
                      <span className="truncate">{post.articleTitle}</span>
                      {post.articleUrl && (
                        <a
                          href={post.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>

                    {/* Content */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={6}
                          className="w-full rounded-md border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(post.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 max-h-36 overflow-y-auto">
                        {post.content}
                      </div>
                    )}

                    {/* Status actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 pt-1 border-t">
                        {post.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                              onClick={() => handleStatusChange(post, 'published')}
                            >
                              <CheckCircle2 className="size-3" />
                              Mark Published
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-muted-foreground"
                              onClick={() => handleStatusChange(post, 'archived')}
                            >
                              <Archive className="size-3" />
                              Archive
                            </Button>
                          </>
                        )}
                        {post.status === 'published' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground"
                            onClick={() => handleStatusChange(post, 'archived')}
                          >
                            <Archive className="size-3" />
                            Archive
                          </Button>
                        )}
                        {post.status === 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            onClick={() => handleStatusChange(post, 'draft')}
                          >
                            <FileEdit className="size-3" />
                            Move to Draft
                          </Button>
                        )}
                        {post.model && (
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {post.model}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination */}
              {(page > 1 || hasMore) && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

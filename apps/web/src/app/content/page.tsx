'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import {
  FileText,
  Plus,
  AlertTriangle,
  Clock,
  Pencil,
  Trash2,
  Loader2,
  X,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import { userAtom } from '@/store';
import {
  fetchContent,
  createContent,
  updateContent,
  deleteContent,
  type ContentEntryResponse,
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
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

export default function ContentPage() {
  const [user] = useAtom(userAtom);
  const [entries, setEntries] = useState<ContentEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchContent();
      setEntries(res.data);
    } catch {
      // API might not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setProject('');
    setCategory('');
    setTags('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (entry: ContentEntryResponse) => {
    setTitle(entry.title);
    setBody(entry.body);
    setProject(entry.project || '');
    setCategory(entry.category || '');
    setTags(entry.tags.join(', '));
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = {
        title: title.trim(),
        body: body.trim(),
        project: project.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await updateContent(editingId, data);
      } else {
        await createContent(data);
      }

      resetForm();
      loadEntries();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteContent(id);
      loadEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Content</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Curated knowledge entries managed by project leads and team members.
          </p>
        </div>
        {user ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="size-4" />
            Create Entry
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href="/login">
              <LogIn className="size-4" />
              Sign in to create
            </Link>
          </Button>
        )}
      </div>

      <Separator />

      {/* Create / Edit Form */}
      {showForm && user && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {editingId ? 'Edit Entry' : 'New Content Entry'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <textarea
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[120px] resize-y"
                  placeholder="Content body (Markdown supported)"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  placeholder="Project (optional)"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  disabled={saving}
                />
                <Input
                  placeholder="Category (optional)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={saving}
                />
                <Input
                  placeholder="Tags (comma-separated)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={saving}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : editingId ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mb-2">
              No content entries yet
            </CardTitle>
            <CardDescription className="text-center max-w-sm mb-6">
              Team members can create curated Q&A pairs, project overviews, and
              guides that become part of the knowledge base.
            </CardDescription>
            {user && (
              <Button onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="size-4" />
                Create First Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Content Entries List */
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className={entry.isOutdated ? 'border-destructive/50' : ''}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{entry.title}</CardTitle>
                      {entry.isOutdated && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="size-3 mr-1" />
                          Outdated
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs flex items-center flex-wrap gap-1">
                      {entry.project && (
                        <Badge variant="outline" className="text-xs">
                          {entry.project}
                        </Badge>
                      )}
                      {entry.category && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.category}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                      {entry.author && (
                        <span>by {entry.author.name || entry.author.email}</span>
                      )}
                    </CardDescription>
                  </div>
                  {user && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {entry.body}
                </p>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
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
  );
}

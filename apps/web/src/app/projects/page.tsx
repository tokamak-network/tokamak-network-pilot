'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import {
  FolderKanban,
  Plus,
  Users,
  Database,
  Loader2,
  Globe,
  Lock,
  Trash2,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import {
  fetchProjects,
  createProject,
  deleteProject,
  type ProjectResponse,
} from '@/lib/api';
import { projectsAtom } from '@/store';
import { userAtom } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useAtom(projectsAtom);
  const [user] = useAtom(userAtom);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchProjects();
      setProjects(data.projects);
    } catch {
      // API may not be running
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setProjects((prev) => [project, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      router.push(`/projects/${project.slug}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const filtered = search.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : projects;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize knowledge by project, assign repos, and collaborate with your team.
          </p>
        </div>
        {user && (
          <Button onClick={() => setShowCreate(!showCreate)}>
            <Plus className="size-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Project Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tokamak DAO"
                className="w-full h-9 px-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Description{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of the project..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                  setNewDesc('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {projects.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full h-9 pl-9 pr-9 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Project Grid */}
      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {project.logoUrl ? (
                        <img
                          src={project.logoUrl}
                          alt=""
                          className="size-9 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderKanban className="size-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          /{project.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {project.isPublic ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Globe className="size-2.5 mr-0.5" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          <Lock className="size-2.5 mr-0.5" />
                          Private
                        </Badge>
                      )}
                      {user && (
                        <button
                          onClick={(e) => handleDelete(project.id, project.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                          title="Delete project"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Database className="size-3" />
                      {project.sourceCount} source{project.sourceCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />
                      {project.memberCount} member{project.memberCount !== 1 ? 's' : ''}
                    </span>
                    <span className="ml-auto flex items-center gap-0.5">
                      View
                      <ChevronRight className="size-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search
                ? `No projects match "${search}"`
                : 'No projects yet. Create one to get started.'}
            </p>
            {!search && user && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-4" />
                Create Your First Project
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  Users,
  Database,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Globe,
  Github,
  Upload,
  BookOpen,
} from 'lucide-react';
import {
  fetchProjectPublic,
  type ProjectPublicResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const sourceTypeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  notion: BookOpen,
  custom: Database,
};

const roleColors: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800',
  contributor: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-700',
};

export default function ProjectPublicPage() {
  const params = useParams();
  const slug = params.idOrSlug as string;
  const [project, setProject] = useState<ProjectPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjectPublic(slug)
      .then(setProject)
      .catch(() => setError('Project not found or not public'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
        <FolderKanban className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || 'Project not found'}</p>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          {project.logoUrl ? (
            <img
              src={project.logoUrl}
              alt=""
              className="size-16 rounded-xl object-cover"
            />
          ) : (
            <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderKanban className="size-8 text-primary" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {project.description}
          </p>
        )}
        <div className="flex justify-center gap-2">
          <Badge variant="secondary">
            <Globe className="size-3 mr-1" />
            Public Project
          </Badge>
          <Badge variant="outline">
            <Database className="size-3 mr-1" />
            {project.sources.length} source{project.sources.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline">
            <Users className="size-3 mr-1" />
            {project.members.length} member{project.members.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Links */}
      {project.links.length > 0 && (
        <div className="flex justify-center flex-wrap gap-2">
          {project.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="size-3.5" />
                {link.label}
              </Button>
            </a>
          ))}
        </div>
      )}

      <Separator />

      {/* Summary */}
      {project.summary && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">About</h2>
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
            {project.summary}
          </div>
        </section>
      )}

      {/* Team */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Team</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {project.members.map((member, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {(member.user.name || member.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.user.name || member.user.email.split('@')[0]}
                  </p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColors[member.role] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Knowledge Sources */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Knowledge Sources</h2>
        <div className="space-y-2">
          {project.sources.map((source, i) => {
            const Icon = sourceTypeIcons[source.type] || Database;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border"
              >
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.type.replace('_', ' ')} &middot;{' '}
                    {source.documentCount} documents indexed
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <Separator />
      <div className="text-center pb-8">
        <p className="text-sm text-muted-foreground">
          Powered by{' '}
          <Link href="/" className="text-primary hover:underline">
            Tokamak Forest
          </Link>
        </p>
      </div>
    </div>
  );
}

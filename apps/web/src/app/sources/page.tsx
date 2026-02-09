'use client';

import { useAtom } from 'jotai';
import {
  Database,
  Github,
  Globe,
  Upload,
  Plus,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { sourcesAtom } from '@/store';
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

const sourceTypeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  notion: BookOpen,
  custom: Database,
};

const sourceTypeLabels: Record<string, string> = {
  github_repo: 'GitHub Repository',
  github_org: 'GitHub Organization',
  documentation: 'Documentation',
  file_upload: 'File Upload',
  notion: 'Notion',
  custom: 'Custom',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  syncing: 'secondary',
  error: 'destructive',
  disabled: 'outline',
};

export default function SourcesPage() {
  const [sources] = useAtom(sourcesAtom);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Knowledge Sources
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the repositories, documentation, and files that feed into the
            knowledge base.
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Add Source
        </Button>
      </div>

      <Separator />

      {sources.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <Database className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mb-2">
              No sources configured
            </CardTitle>
            <CardDescription className="text-center max-w-sm mb-6">
              Add GitHub repos, documentation URLs, or upload files to start
              building the knowledge base.
            </CardDescription>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Github className="size-5" />
                <span className="text-xs">GitHub Repo</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Globe className="size-5" />
                <span className="text-xs">Documentation</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Upload className="size-5" />
                <span className="text-xs">File Upload</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Sources List */
        <div className="space-y-3">
          {sources.map((source) => {
            const Icon = sourceTypeIcons[source.type] || Database;
            return (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{source.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {sourceTypeLabels[source.type]}
                          {source.lastSyncedAt &&
                            ` · Last synced ${new Date(source.lastSyncedAt).toLocaleDateString()}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariants[source.status]}>
                        {source.status}
                      </Badge>
                      <Button variant="ghost" size="icon-sm">
                        <RefreshCw className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

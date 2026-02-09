'use client';

import { useAtom } from 'jotai';
import { FileText, Plus, AlertTriangle, Clock } from 'lucide-react';
import { contentEntriesAtom } from '@/store';
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

export default function ContentPage() {
  const [entries] = useAtom(contentEntriesAtom);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Content</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Curated knowledge entries managed by project leads and team members.
            Update outdated content and add new guides.
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Create Entry
        </Button>
      </div>

      <Separator />

      {entries.length === 0 ? (
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
            <Button>
              <Plus className="size-4" />
              Create First Entry
            </Button>
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{entry.title}</CardTitle>
                      {entry.isOutdated && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="size-3 mr-1" />
                          Outdated
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs">
                      {entry.project && (
                        <Badge variant="outline" className="mr-2 text-xs">
                          {entry.project}
                        </Badge>
                      )}
                      {entry.category && (
                        <Badge variant="secondary" className="mr-2 text-xs">
                          {entry.category}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                      <span className="ml-2">by {entry.author}</span>
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </CardHeader>
              {entry.tags.length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

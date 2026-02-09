'use client';

import {
  Brain,
  Database,
  Github,
  Key,
  Server,
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

const settingsGroups = [
  {
    title: 'AI & LLM',
    items: [
      {
        label: 'LLM Provider',
        description: 'Configure the language model for generating answers.',
        icon: Brain,
        status: 'Not configured',
        connected: false,
      },
      {
        label: 'Embedding Model',
        description: 'Model used for converting text into vectors.',
        icon: Server,
        status: 'Not configured',
        connected: false,
      },
    ],
  },
  {
    title: 'Storage',
    items: [
      {
        label: 'Vector Database',
        description: 'Vector store for semantic search (Qdrant, Pinecone, pgvector).',
        icon: Database,
        status: 'Not configured',
        connected: false,
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        label: 'GitHub Connection',
        description: 'Connect to GitHub for indexing repositories and organizations.',
        icon: Github,
        status: 'Not connected',
        connected: false,
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        label: 'API Keys',
        description: 'Manage API keys for SDK and external access.',
        icon: Key,
        status: '0 keys',
        connected: false,
      },
      {
        label: 'Authentication',
        description: 'Configure JWT auth and team roles.',
        icon: Shield,
        status: 'Not configured',
        connected: false,
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure the knowledge hub, LLM providers, and integrations.
        </p>
      </div>

      <Separator />

      {/* Settings Groups */}
      <div className="space-y-8">
        {settingsGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <Card key={item.label}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                          <item.icon className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{item.label}</CardTitle>
                          <CardDescription className="text-xs">
                            {item.description}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={item.connected ? 'default' : 'outline'}
                        >
                          {item.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

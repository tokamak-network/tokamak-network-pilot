'use client';

import {
  History,
  Webhook,
} from 'lucide-react';
import { ChangelogSection } from '@/components/docs/changelog-section';
import { WebhookDocs } from '@/components/docs/webhook-docs';

export default function UpdatesPage() {
  return (
    <div className="space-y-12">
      {/* Page Header */}
      <section>
        <h1 className="font-serif text-2xl font-semibold tracking-tight mb-2">Updates</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Stay up to date with API changes, new features, and real-time event notifications
          via webhooks.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { id: 'webhooks', label: 'Webhooks' },
            { id: 'changelog', label: 'Changelog' },
          ].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </div>
      </section>

      {/* Webhooks */}
      <section id="webhooks" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Webhook className="size-5 text-primary" />
          Webhooks
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Receive real-time event notifications from Tokamak Forest. Configure webhook URLs
          to be notified when sources sync, content changes, or rate limits are hit.
        </p>
        <WebhookDocs />
      </section>

      {/* Changelog */}
      <section id="changelog" className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <History className="size-5 text-primary" />
          Changelog
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Track API changes, new features, fixes, and deprecations across releases. Also available
          programmatically at{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            GET /api/v1/changelog
          </code>
        </p>
        <ChangelogSection />
      </section>
    </div>
  );
}

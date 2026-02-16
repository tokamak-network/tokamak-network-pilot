'use client';

import { useState } from 'react';
import {
  Webhook,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Send,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface WebhookEvent {
  name: string;
  description: string;
  payload: string;
}

const WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    name: 'source.synced',
    description:
      'Fired when a knowledge source finishes syncing. Includes the source ID, status, and document count.',
    payload: JSON.stringify(
      {
        event: 'source.synced',
        timestamp: '2026-02-16T12:00:00Z',
        data: {
          sourceId: 'a1b2c3d4-...',
          name: 'tokamak-network/contracts-v2',
          type: 'github_repo',
          status: 'active',
          documentCount: 142,
          duration: 45200,
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'source.error',
    description:
      'Fired when a knowledge source encounters an error during syncing. Includes error details.',
    payload: JSON.stringify(
      {
        event: 'source.error',
        timestamp: '2026-02-16T12:00:00Z',
        data: {
          sourceId: 'a1b2c3d4-...',
          name: 'tokamak-network/contracts-v2',
          error: 'GitHub API rate limit exceeded',
          retryAfter: 3600,
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'content.created',
    description:
      'Fired when a new content entry is created by a team member.',
    payload: JSON.stringify(
      {
        event: 'content.created',
        timestamp: '2026-02-16T12:00:00Z',
        data: {
          contentId: 'e5f6g7h8-...',
          title: 'New Staking Guide',
          project: 'titan',
          category: 'guide',
          authorEmail: 'dev@tokamak.network',
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'content.updated',
    description:
      'Fired when a content entry is updated. Includes changed fields.',
    payload: JSON.stringify(
      {
        event: 'content.updated',
        timestamp: '2026-02-16T12:00:00Z',
        data: {
          contentId: 'e5f6g7h8-...',
          title: 'Updated Staking Guide',
          changedFields: ['body', 'tags'],
          updatedBy: 'dev@tokamak.network',
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'project.summary_generated',
    description:
      'Fired when an AI summary is generated for a project.',
    payload: JSON.stringify(
      {
        event: 'project.summary_generated',
        timestamp: '2026-02-16T12:00:00Z',
        data: {
          projectId: 'p1q2r3s4-...',
          projectName: 'Titan Network',
          summaryLength: 1250,
          provider: 'openai',
          model: 'gpt-4o',
        },
      },
      null,
      2,
    ),
  },
  {
    name: 'api_key.rate_limited',
    description:
      'Fired when an API key hits its rate limit. Useful for monitoring integrations.',
    payload: JSON.stringify(
      {
        event: 'api_key.rate_limited',
        timestamp: '2026-02-16T12:00:00Z',
        data: {
          apiKeyPrefix: 'tkp_abc1',
          tier: 'free',
          rateLimit: 10,
          requestCount: 11,
          windowResetAt: '2026-02-16T12:01:00Z',
        },
      },
      null,
      2,
    ),
  },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3 text-green-400" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function WebhookEventCard({ event }: { event: WebhookEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <Webhook className="size-4 text-primary shrink-0" />
        <code className="flex-1 text-sm font-mono font-medium text-foreground">
          {event.name}
        </code>
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.description}
          </p>
          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Example Payload
            </h5>
            <div className="relative group rounded-lg border border-border bg-[#0d1117] overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
                <span className="text-[11px] text-muted-foreground font-mono uppercase">
                  json
                </span>
                <CopyBtn text={event.payload} />
              </div>
              <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-gray-300">
                <code>{event.payload}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function WebhookDocs() {
  const [testUrl, setTestUrl] = useState('');
  const [testEvent, setTestEvent] = useState(WEBHOOK_EVENTS[0].name);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestWebhook = async () => {
    if (!testUrl) return;
    setTestLoading(true);
    setTestResult(null);

    const event = WEBHOOK_EVENTS.find((e) => e.name === testEvent);
    if (!event) return;

    try {
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.payload,
      });
      setTestResult({
        success: res.ok,
        message: `${res.status} ${res.statusText}`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-500">Coming Soon</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Webhook support is currently in development. When ready, you&apos;ll be able to register
          webhook URLs to receive real-time notifications about events in your Tokamak Pilot instance.
          Below is a preview of the planned webhook events and their payloads.
        </p>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            How Webhooks Will Work
          </h5>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Register a webhook URL in your project settings</li>
            <li>Select which events you want to receive</li>
            <li>
              Tokamak Pilot sends a <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">POST</code>{' '}
              request to your URL for each event
            </li>
            <li>Your server processes the event payload and responds with 2xx</li>
            <li>Failed deliveries are retried with exponential backoff (up to 3 attempts)</li>
          </ol>
        </div>
      </div>

      {/* Event Types */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Event Types</h4>
        <div className="space-y-3">
          {WEBHOOK_EVENTS.map((event) => (
            <WebhookEventCard key={event.name} event={event} />
          ))}
        </div>
      </div>

      {/* Webhook Tester */}
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.02] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="size-4 text-primary" />
          <h4 className="text-sm font-semibold text-primary">Webhook Tester</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Test your webhook endpoint by sending a sample event payload. Enter your URL and select an event type.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://your-server.com/webhooks/tokamak"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Event Type
            </label>
            <select
              value={testEvent}
              onChange={(e) => setTestEvent(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {WEBHOOK_EVENTS.map((event) => (
                <option key={event.name} value={event.name}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTestWebhook}
            disabled={testLoading || !testUrl}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {testLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                Send Test Event
              </>
            )}
          </button>

          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 ${
                testResult.success
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-red-500/20 bg-red-500/5'
              }`}
            >
              {testResult.success ? (
                <Check className="size-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="size-4 text-red-500 shrink-0" />
              )}
              <p
                className={`text-xs ${
                  testResult.success ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {testResult.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

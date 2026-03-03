'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FolderKanban,
  Users,
  Database,
  Loader2,
  ExternalLink,
  Globe,
  Github,
  Upload,
  BookOpen,
  LogIn,
  Send,
  Search,
  TreePine,
  User,
  MessageCircle,
  Plus,
  Copy,
  Check,
  FileText,
  X,
  ThumbsUp,
} from 'lucide-react';
import {
  fetchProjectPublicFeedback,
  fetchProjectPublic,
  submitProjectPublicFeedback,
  voteProjectPublicFeedback,
  type PublicProjectFeedbackEntry,
  type ProjectFeedbackCategory,
  type ProjectPublicResponse,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const sourceTypeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  website: Globe,
  notion: BookOpen,
  custom: Database,
};

const roleColors: Record<string, string> = {
  lead: 'bg-warning-bg text-warning',
  contributor: 'bg-info-bg text-info',
  viewer: 'bg-muted text-muted-foreground',
};

const roadmapStatusLabel: Record<string, string> = {
  proposed: 'Proposed',
  approved: 'Approved',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
};

const roadmapStatusStyles: Record<string, string> = {
  proposed: 'bg-muted text-muted-foreground',
  approved: 'bg-indigo-500/10 text-indigo-700',
  planned: 'bg-sky-500/10 text-sky-700',
  in_progress: 'bg-amber-500/10 text-amber-700',
  completed: 'bg-emerald-500/10 text-emerald-700',
  rejected: 'bg-rose-500/10 text-rose-700',
};

function feedbackVoteKey(projectSlug: string, feedbackId: string) {
  return `tokamak_feedback_vote:${projectSlug}:${feedbackId}`;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string; score: number }>;
  timestamp: Date;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border/50 opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-muted"
      title="Copy code"
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3 text-muted-foreground" />}
    </button>
  );
}

function PublicChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const sources = message.sources || [];

  if (!isUser && message.content === '') return null;

  let processedContent = message.content;
  if (!isUser) {
    processedContent = processedContent.replace(/\n*(Sources|References)\s*\n[\s\S]*$/i, '');
    processedContent = processedContent.replace(
      /\[Source\s*\d+(?:\s*,\s*Source\s*\d+)+\]/gi,
      (match) => {
        const numbers = match.match(/\d+/g) || [];
        return numbers.map((n) => `[Source ${n}]`).join('');
      },
    );
    processedContent = processedContent.replace(/\[Source\s*(\d+)\]/gi, '[ˢ$1](#source-$1)');
    processedContent = processedContent.trim();
  }

  return (
    <div className={cn('group flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'mt-1 shrink-0 flex size-8 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        {isUser ? <User className="size-4" /> : <TreePine className="size-4" />}
      </div>

      <div className={cn('flex flex-col gap-1 min-w-0', isUser ? 'items-end max-w-[75%]' : 'items-start max-w-[90%]')}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'You' : 'Tokamak Forest'}
          </span>
        </div>

        <div
          className={cn(
            'rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md px-4 py-3'
              : 'bg-card border border-border/60 rounded-tl-md px-5 py-4 shadow-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="chat-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h3 className="text-[15px] font-semibold mt-5 mb-2 first:mt-0 pb-1 border-b border-border/30">{children}</h3>,
                  h2: ({ children }) => <h3 className="text-[15px] font-semibold mt-5 mb-2 first:mt-0 pb-1 border-b border-border/30">{children}</h3>,
                  h3: ({ children }) => <h4 className="text-sm font-semibold mt-4 mb-1.5 first:mt-0">{children}</h4>,
                  p: ({ children }) => <p className="mb-3 last:mb-0 leading-[1.7]">{children}</p>,
                  ul: ({ children }) => <ul className="mb-3 last:mb-0 space-y-1.5 ml-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-3 last:mb-0 space-y-1.5 ml-0.5 list-decimal list-inside">{children}</ol>,
                  li: ({ children, ...props }) => {
                    const parent = (props as any).node?.parentNode?.tagName;
                    if (parent === 'ol') return <li className="leading-[1.7]">{children}</li>;
                    return (
                      <li className="flex gap-2 leading-[1.7]">
                        <span className="text-primary/60 mt-[2px] shrink-0 select-none text-[10px]">▸</span>
                        <span className="flex-1 min-w-0">{children}</span>
                      </li>
                    );
                  },
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  code: ({ inline, className, children, ...props }: any) => {
                    const codeText = String(children ?? '');
                    const isBlock =
                      inline === false ||
                      Boolean(className?.includes('language-')) ||
                      codeText.includes('\n');
                    if (isBlock) {
                      const language = className?.replace('language-', '') || 'text';
                      return (
                        <div className="group/code relative my-3 rounded-lg bg-code-block border border-border/40 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-code-header border-b border-border/20">
                            <span className="text-[10px] font-mono text-code-muted uppercase tracking-wider">
                              {language}
                            </span>
                          </div>
                          <pre className="p-3 overflow-x-auto">
                            <code className={cn('text-xs font-mono text-code-text leading-relaxed', className)} {...props}>{children}</code>
                          </pre>
                          <CopyButton text={codeText.replace(/\n$/, '')} />
                        </div>
                      );
                    }
                    return <code className="rounded-md bg-muted/80 border border-border/40 px-1.5 py-0.5 text-[13px] font-mono text-foreground/90" {...props}>{children}</code>;
                  },
                  pre: ({ children }) => <>{children}</>,
                  a: ({ href, children }) => {
                    const sourceMatch = href?.match(/^#source-(\d+)$/);
                    if (sourceMatch) {
                      const idx = parseInt(sourceMatch[1], 10) - 1;
                      const source = sources[idx];
                      if (source) {
                        return (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold hover:bg-primary/25 hover:scale-110 transition-all cursor-pointer no-underline align-super mx-[1px] px-1"
                            title={source.title}
                          >
                            {sourceMatch[1]}
                          </a>
                        );
                      }
                      return <sup className="text-[10px] text-muted-foreground/60">{sourceMatch[1]}</sup>;
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors inline-flex items-center gap-0.5">
                        {children}
                        <ExternalLink className="size-3 inline shrink-0 opacity-60" />
                      </a>
                    );
                  },
                  blockquote: ({ children }) => <blockquote className="border-l-[3px] border-primary/25 pl-3 my-3 text-muted-foreground/80">{children}</blockquote>,
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && sources.length > 0 && (
          <div className="mt-2 w-full">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <FileText className="size-3 text-muted-foreground/50" />
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((src, j) => (
                <a
                  key={j}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/source inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/80 hover:shadow-sm transition-all duration-150"
                >
                  <span className="flex items-center justify-center size-4 rounded-full bg-primary/10 text-primary text-[9px] font-semibold shrink-0">{j + 1}</span>
                  <span className="truncate max-w-[240px]">{src.title}</span>
                  <ExternalLink className="size-3 shrink-0 opacity-0 group-hover/source:opacity-60 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PublicChat({ project }: { project: ProjectPublicResponse }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleAsk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQuery = question;
    const userMessage: ChatMessage = { role: 'user', content: currentQuery, timestamp: new Date() };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setQuestion('');

    const placeholderAssistant: ChatMessage = { role: 'assistant', content: '', sources: [], timestamp: new Date() };
    setMessages((prev) => [...prev, placeholderAssistant]);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    try {
      const res = await fetch(`${apiBase}/ask/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuery, projectId: project.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'metadata') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], sources: data.sources || [] };
                return updated;
              });
            } else if (currentEvent === 'chunk') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + data.text };
                return updated;
              });
            } else if (currentEvent === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Sorry, something went wrong: ${data.message}` };
                return updated;
              });
            }
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: `Sorry, something went wrong: ${err.message || 'Could not reach the API'}` };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setQuestion('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        <MessageCircle className="size-5" />
        <span className="text-sm font-medium">Ask about this project</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))]">
      <Card className="shadow-2xl border-border/80 overflow-hidden">
        <CardHeader className="border-b bg-card/90 backdrop-blur-sm py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <TreePine className="size-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm">Ask About {project.name}</CardTitle>
                <CardDescription className="text-xs">
                  AI-powered answers from project knowledge
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2" onClick={handleClear}>
                  <Plus className="size-3" />
                  New
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <TreePine className="size-6 text-primary" />
              </div>
              <h3 className="text-sm font-medium mb-1">Ask anything about {project.name}</h3>
              <p className="text-xs text-muted-foreground text-center max-w-xs mb-5">
                Get answers powered by the project&apos;s indexed knowledge sources.
              </p>
              <form onSubmit={handleAsk} className="w-full">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={`e.g. "What does ${project.name} do?"`}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                  <Button type="submit" size="default" disabled={!question.trim()} className="h-10 px-3">
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[350px]">
                <div className="px-4 py-4 space-y-5">
                  {messages.map((msg, i) => (
                    <PublicChatMessage key={i} message={msg} />
                  ))}

                  {isLoading && messages.length > 0 && messages[messages.length - 1].content === '' && (
                    <div className="flex gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <TreePine className="size-4 text-primary-foreground" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-muted/60 border border-border/50 px-4 py-3">
                        <div className="flex gap-1">
                          <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                          <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                          <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
                      </div>
                    </div>
                  )}

                  <div ref={scrollEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-background/80 backdrop-blur-sm p-3">
                <form onSubmit={handleAsk}>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a follow-up question..."
                        className="pl-9 h-10 rounded-xl text-sm"
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="default"
                      disabled={!question.trim() || isLoading}
                      className="rounded-xl h-10 px-3"
                    >
                      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectPublicPage() {
  const params = useParams();
  const slug = params.idOrSlug as string;
  const [project, setProject] = useState<ProjectPublicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackCategory, setFeedbackCategory] =
    useState<ProjectFeedbackCategory>('feature');
  const [feedbackPain, setFeedbackPain] = useState(3);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [publicFeedbackRows, setPublicFeedbackRows] = useState<PublicProjectFeedbackEntry[]>([]);
  const [publicFeedbackLoading, setPublicFeedbackLoading] = useState(true);
  const [votingFeedbackId, setVotingFeedbackId] = useState<string | null>(null);
  const [votedFeedbackIds, setVotedFeedbackIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const publicProject = await fetchProjectPublic(slug);
        setProject(publicProject);
      } catch {
        setError('Project not found or not public');
        setLoading(false);
        setPublicFeedbackLoading(false);
        return;
      }
      setLoading(false);

      try {
        const feedbackList = await fetchProjectPublicFeedback(slug, { sort: 'top', limit: 8 });
        setPublicFeedbackRows(feedbackList.data);

        if (typeof window !== 'undefined') {
          const votedMap: Record<string, boolean> = {};
          for (const row of feedbackList.data) {
            votedMap[row.id] = localStorage.getItem(feedbackVoteKey(slug, row.id)) === '1';
          }
          setVotedFeedbackIds(votedMap);
        }
      } catch {
        // Feedback failed to load but project is still visible
      } finally {
        setPublicFeedbackLoading(false);
      }
    };

    load();
  }, [slug]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim() || feedbackSubmitting) return;

    setFeedbackSubmitting(true);
    setFeedbackSuccess('');
    try {
      await submitProjectPublicFeedback(slug, {
        category: feedbackCategory,
        painLevel: feedbackPain,
        content: feedbackContent.trim(),
        submitterName: feedbackName.trim() || undefined,
        submitterEmail: feedbackEmail.trim() || undefined,
      });
      setFeedbackContent('');
      setFeedbackName('');
      setFeedbackEmail('');
      setFeedbackPain(3);
      setFeedbackSuccess('Thanks! Your feedback was submitted.');
      const refreshed = await fetchProjectPublicFeedback(slug, { sort: 'top', limit: 8 });
      setPublicFeedbackRows(refreshed.data);
    } catch {
      setFeedbackSuccess('Could not submit feedback right now. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleVoteFeedback = async (feedbackId: string) => {
    if (votingFeedbackId || votedFeedbackIds[feedbackId]) return;

    setVotingFeedbackId(feedbackId);
    setFeedbackSuccess('');
    try {
      const res = await voteProjectPublicFeedback(slug, feedbackId);
      setPublicFeedbackRows((prev) =>
        prev.map((row) => (row.id === feedbackId ? res.feedback : row)),
      );
      setVotedFeedbackIds((prev) => ({ ...prev, [feedbackId]: true }));
      if (typeof window !== 'undefined') {
        localStorage.setItem(feedbackVoteKey(slug, feedbackId), '1');
      }
    } catch (err: any) {
      setFeedbackSuccess(err?.message || 'Could not record vote right now.');
    } finally {
      setVotingFeedbackId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <FolderKanban className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || 'Project not found'}</p>
        <Link href="/">
          <Button variant="outline" size="sm">
            Go Home
          </Button>
        </Link>
      </div>
    );
  }

  const themeClass = project.publicTheme && project.publicTheme !== 'forest'
    ? `public-theme-${project.publicTheme}`
    : '';
  const radiusClass = `public-radius-${project.publicBorderRadius || 'rounded'}`;

  return (
    <div className={cn(themeClass, radiusClass, 'min-h-screen bg-background text-foreground')}>
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-4xl mx-auto flex h-14 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TreePine className="size-3.5" />
            </div>
            <span className="text-sm font-serif font-medium text-foreground">Tokamak Forest</span>
          </Link>
          <Link href="/login">
            <Button size="sm" className="gap-2">
              <LogIn className="size-3.5" />
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Page Content */}
      <div className="p-6 max-w-4xl mx-auto space-y-8 pb-24">
        {/* Project Header */}
        <div className="text-center space-y-3 pt-4">
          <div className="flex justify-center">
            {project.logoUrl ? (
              <img src={project.logoUrl} alt="" className="size-16 rounded-xl object-cover" />
            ) : (
              <div className="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderKanban className="size-8 text-primary" />
              </div>
            )}
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{project.description}</p>
          )}
          <div className="flex justify-center gap-2 flex-wrap">
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
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
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

        {/* Public Roadmap */}
        {project.isRoadmapPublic && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Public Roadmap</h2>
            {project.roadmap.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Roadmap visibility is enabled, but no roadmap items are published yet.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {project.roadmap.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={`text-[10px] ${roadmapStatusStyles[item.status] || 'bg-muted text-muted-foreground'}`}>
                              {roadmapStatusLabel[item.status] || item.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Priority: {item.priority}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Effort: {item.effort}
                            </Badge>
                            {item.targetQuarter && (
                              <Badge variant="outline" className="text-[10px]">
                                {item.targetQuarter}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Updated {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {item.problem}
                      </p>
                      {item.outcome && (
                        <p className="text-xs text-muted-foreground">
                          Outcome: {item.outcome}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleColors[member.role] || 'bg-muted text-muted-foreground'}`}
                    >
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Public Feedback */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Share Public Feedback</h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top Feedback Requests</CardTitle>
              <CardDescription>
                Vote for what should be prioritized next.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {publicFeedbackLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading feedback...
                </div>
              ) : publicFeedbackRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No public feedback yet. Be the first to submit one.
                </p>
              ) : (
                publicFeedbackRows.map((row) => {
                  const voted = Boolean(votedFeedbackIds[row.id]);
                  const isVoting = votingFeedbackId === row.id;

                  return (
                    <div
                      key={row.id}
                      className="rounded-md border p-3 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {row.category}
                          </Badge>
                          {typeof row.painLevel === 'number' && (
                            <Badge variant="secondary" className="text-[10px]">
                              pain {row.painLevel}
                            </Badge>
                          )}
                        </div>
                        {row.title && (
                          <p className="text-sm font-medium">{row.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {row.content}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={voted ? 'secondary' : 'outline'}
                        onClick={() => handleVoteFeedback(row.id)}
                        disabled={isVoting || voted}
                        className="shrink-0"
                      >
                        {isVoting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="size-3.5" />
                        )}
                        {row.votes}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Help shape the roadmap</CardTitle>
              <CardDescription>
                Your feedback is triaged into roadmap items and implementation tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-sm space-y-1">
                    <span className="text-muted-foreground">Category</span>
                    <select
                      value={feedbackCategory}
                      onChange={(e) =>
                        setFeedbackCategory(e.target.value as ProjectFeedbackCategory)
                      }
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      <option value="feature">Feature</option>
                      <option value="bug">Bug</option>
                      <option value="ux">UX</option>
                      <option value="performance">Performance</option>
                      <option value="integration">Integration</option>
                      <option value="pricing">Pricing</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="text-sm space-y-1">
                    <span className="text-muted-foreground">Pain level</span>
                    <select
                      value={feedbackPain}
                      onChange={(e) => setFeedbackPain(Number(e.target.value))}
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    >
                      <option value={1}>1 - Low</option>
                      <option value={2}>2</option>
                      <option value={3}>3 - Medium</option>
                      <option value={4}>4</option>
                      <option value={5}>5 - Critical</option>
                    </select>
                  </label>
                </div>

                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="What should be improved in this product/project?"
                  className="w-full min-h-[96px] rounded-md border bg-background px-3 py-2 text-sm"
                  required
                />

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    placeholder="Name (optional)"
                  />
                  <Input
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="Email (optional)"
                    type="email"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{feedbackSuccess}</p>
                  <Button type="submit" disabled={!feedbackContent.trim() || feedbackSubmitting}>
                    {feedbackSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Submit Feedback
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Knowledge Sources */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Knowledge Sources</h2>
          <div className="space-y-2">
            {project.sources.map((source, i) => {
              const Icon = sourceTypeIcons[source.type] || Database;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border">
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{source.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {source.type.replace('_', ' ')} &middot; {source.documentCount} documents indexed
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

      {/* Floating Chat Widget */}
      <PublicChat project={project} />
    </div>
  );
}

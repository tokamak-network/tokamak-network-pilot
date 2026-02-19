'use client';

import { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TreePine, User, ExternalLink, FileText, Copy, Check, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ConversationMessage } from '@/store/ask';

interface ChatMessageProps {
  message: ConversationMessage;
}

/**
 * Cleans AI response content:
 * - Removes trailing "Sources" sections that are already in the sources array
 * - Converts inline [Source N] references into clickable markdown links
 *   that the custom `a` component renders as interactive badges
 */
function cleanContent(content: string): string {
  let cleaned = content.replace(
    /\n*(Sources|References)\s*\n[\s\S]*$/i,
    ''
  );

  // Expand grouped source references:
  //   [Source 1, Source 2, Source 4] → [Source 1][Source 2][Source 4]
  cleaned = cleaned.replace(
    /\[Source\s*\d+(?:\s*,\s*Source\s*\d+)+\]/gi,
    (match) => {
      const numbers = match.match(/\d+/g) || [];
      return numbers.map((n) => `[Source ${n}]`).join('');
    },
  );

  // Convert [Source N] → markdown link [ˢN](#source-N)
  // The custom `a` component detects #source- links and renders as badges
  cleaned = cleaned.replace(
    /\[Source\s*(\d+)\]/gi,
    '[ˢ$1](#source-$1)',
  );

  return cleaned.trim();
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
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}

/**
 * Formats an answer as an AI-ready prompt with context, sources, and instructions.
 */
function formatAsAiPrompt(
  content: string,
  sources?: Array<{ title: string; url: string }>,
): string {
  const lines: string[] = [];
  lines.push('## Context from Tokamak Forest Knowledge Base');
  lines.push('');
  lines.push(content);
  lines.push('');

  if (sources && sources.length > 0) {
    lines.push('### Sources');
    lines.push('');
    for (const src of sources) {
      if (src.url) {
        lines.push(`- [${src.title}](${src.url})`);
      } else {
        lines.push(`- ${src.title}`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(
    '*This information is from the Tokamak Forest Knowledge Base. ' +
      'Use it as context for your response. Cite sources when relevant.*',
  );

  return lines.join('\n');
}

function CopyAsPromptButton({
  content,
  sources,
}: {
  content: string;
  sources?: Array<{ title: string; url: string }>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const prompt = formatAsAiPrompt(content, sources);
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content, sources]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
      title="Copy as AI-ready prompt with context and sources"
    >
      {copied ? (
        <Check className="size-3 text-success" />
      ) : (
        <Sparkles className="size-3" />
      )}
      {copied ? 'Copied' : 'Copy as prompt'}
    </button>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = !isUser && message.content === '';
  const sources = message.sources || [];

  const processedContent = useMemo(
    () => (isUser ? message.content : cleanContent(message.content)),
    [message.content, isUser]
  );

  if (isStreaming) return null;

  return (
    <div className={cn('group flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <Avatar className="mt-1 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {isUser ? <User className="size-4" /> : <TreePine className="size-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message body */}
      <div
        className={cn(
          'flex flex-col gap-1 min-w-0',
          isUser ? 'items-end max-w-[75%]' : 'items-start max-w-[90%]'
        )}
      >
        {/* Role label + time */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'You' : 'Tokamak Forest'}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-md px-4 py-3'
              : 'bg-card border border-border/60 rounded-tl-md px-5 py-4 shadow-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="chat-markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Headings
                  h1: ({ children }) => (
                    <h3 className="text-[15px] font-semibold mt-5 mb-2 first:mt-0 pb-1 border-b border-border/30">
                      {children}
                    </h3>
                  ),
                  h2: ({ children }) => (
                    <h3 className="text-[15px] font-semibold mt-5 mb-2 first:mt-0 pb-1 border-b border-border/30">
                      {children}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="text-sm font-semibold mt-4 mb-1.5 first:mt-0">
                      {children}
                    </h4>
                  ),
                  h4: ({ children }) => (
                    <h5 className="text-sm font-medium mt-3 mb-1 first:mt-0 text-muted-foreground">
                      {children}
                    </h5>
                  ),
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 leading-[1.7]">{children}</p>
                  ),
                  // Lists
                  ul: ({ children }) => (
                    <ul className="mb-3 last:mb-0 space-y-1.5 ml-0.5">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-3 last:mb-0 space-y-1.5 ml-0.5 list-decimal list-inside [&>li]:pl-0">
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => {
                    // For ordered lists, let list-decimal handle it
                    const parent = (props as any).node?.parentNode?.tagName;
                    if (parent === 'ol') {
                      return (
                        <li className="leading-[1.7]">{children}</li>
                      );
                    }
                    return (
                      <li className="flex gap-2 leading-[1.7]">
                        <span className="text-primary/60 mt-[2px] shrink-0 select-none text-[10px]">
                          ▸
                        </span>
                        <span className="flex-1 min-w-0">{children}</span>
                      </li>
                    );
                  },
                  // Inline
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-muted-foreground">{children}</em>
                  ),
                  // Code
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes('language-');
                    if (isBlock) {
                      return (
                        <div className="group/code relative my-3 rounded-lg bg-code-block border border-border/40 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-code-header border-b border-border/20">
                            <span className="text-[10px] font-mono text-code-muted uppercase tracking-wider">
                              {className?.replace('language-', '') || 'code'}
                            </span>
                          </div>
                          <pre className="p-3 overflow-x-auto">
                            <code
                              className={cn(
                                'text-xs font-mono text-code-text leading-relaxed',
                                className
                              )}
                              {...props}
                            >
                              {children}
                            </code>
                          </pre>
                          <CopyButton text={String(children).replace(/\n$/, '')} />
                        </div>
                      );
                    }
                    return (
                      <code
                        className="rounded-md bg-muted/80 border border-border/40 px-1.5 py-0.5 text-[13px] font-mono text-foreground/90"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                  // Links (including clickable source references)
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
                      return (
                        <sup className="text-[10px] text-muted-foreground/60">{sourceMatch[1]}</sup>
                      );
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors inline-flex items-center gap-0.5"
                      >
                        {children}
                        <ExternalLink className="size-3 inline shrink-0 opacity-60" />
                      </a>
                    );
                  },
                  // Blockquote
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-[3px] border-primary/25 pl-3 my-3 text-muted-foreground/80 [&>p]:mb-1">
                      {children}
                    </blockquote>
                  ),
                  // Horizontal rule
                  hr: () => <hr className="my-4 border-border/40" />,
                  // Table
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50 text-muted-foreground">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-medium text-xs">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-t border-border/30">
                      {children}
                    </td>
                  ),
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && sources.length > 0 && (
          <div className="mt-2 w-full">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <FileText className="size-3 text-muted-foreground/50" />
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Sources
              </span>
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
                  <span className="flex items-center justify-center size-4 rounded-full bg-primary/10 text-primary text-[9px] font-semibold shrink-0">
                    {j + 1}
                  </span>
                  <span className="truncate max-w-[240px]">{src.title}</span>
                  <ExternalLink className="size-3 shrink-0 opacity-0 group-hover/source:opacity-60 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Copy as AI prompt */}
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyAsPromptButton
              content={message.content}
              sources={message.sources}
            />
          </div>
        )}
      </div>
    </div>
  );
}

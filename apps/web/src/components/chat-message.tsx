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
 * - Converts inline [Source N] references into subtle superscript-style markers
 */
function cleanContent(content: string): string {
  // Remove trailing "Sources" / "References" block (plain-text list of source URLs/paths)
  let cleaned = content.replace(
    /\n*(Sources|References)\s*\n[\s\S]*$/i,
    ''
  );

  // Convert [Source N] references to superscript-style markers
  cleaned = cleaned.replace(
    /\[Source\s*(\d+)\]/gi,
    '<sup class="source-ref">$1</sup>'
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
        <Check className="size-3 text-green-500" />
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
        <Check className="size-3 text-green-500" />
      ) : (
        <Sparkles className="size-3" />
      )}
      {copied ? 'Copied' : 'Copy as prompt'}
    </button>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const processedContent = useMemo(
    () => (isUser ? message.content : cleanContent(message.content)),
    [message.content, isUser]
  );

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
                        <div className="group/code relative my-3 rounded-lg bg-zinc-950 dark:bg-zinc-900 border border-border/40 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 dark:bg-zinc-800 border-b border-border/20">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                              {className?.replace('language-', '') || 'code'}
                            </span>
                          </div>
                          <pre className="p-3 overflow-x-auto">
                            <code
                              className={cn(
                                'text-xs font-mono text-zinc-100 leading-relaxed',
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
                  // Links
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors inline-flex items-center gap-0.5"
                    >
                      {children}
                      <ExternalLink className="size-3 inline shrink-0 opacity-60" />
                    </a>
                  ),
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
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 w-full">
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <FileText className="size-3 text-muted-foreground/50" />
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                Sources
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((src, j) => (
                <a
                  key={j}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/source inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-2 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-border/80 hover:shadow-sm transition-all duration-150"
                >
                  <FileText className="size-3 shrink-0 text-muted-foreground/50 group-hover/source:text-primary/60 transition-colors" />
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

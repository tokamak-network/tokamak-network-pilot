'use client';

import { useAtom } from 'jotai';
import { useEffect, useRef, useCallback, useState } from 'react';
import { Search, Send, TreePine, Database, FileText, Loader2, LayoutDashboard, Plus, MessageCircleQuestion } from 'lucide-react';
import Link from 'next/link';
import {
  queryAtom,
  isLoadingAtom,
  conversationAtom,
  activeConversationIdAtom,
  conversationsListAtom,
} from '@/store';
import { dbMessageToLocal } from '@/store/ask';
import {
  quickAskStream,
  askInConversationStream,
  fetchConversations,
  fetchSuggestedQuestions,
} from '@/lib/api';
import type { StreamMetadata, SuggestedQuestion } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/components/chat-message';
import type { ConversationMessage } from '@/store/ask';

export default function HomePage() {
  const [query, setQuery] = useAtom(queryAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [conversation, setConversation] = useAtom(conversationAtom);
  const [activeConversationId, setActiveConversationId] = useAtom(activeConversationIdAtom);
  const [, setConversationsList] = useAtom(conversationsListAtom);
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isLoading]);

  // Refresh conversations list and suggested questions on mount
  useEffect(() => {
    fetchConversations()
      .then((res) => setConversationsList(res.data))
      .catch(() => {});
    fetchSuggestedQuestions(6)
      .then((res) => setSuggestions(res.suggestions))
      .catch(() => {});
  }, [setConversationsList]);

  const refreshConversationsList = useCallback(() => {
    fetchConversations()
      .then((res) => setConversationsList(res.data))
      .catch(() => {});
  }, [setConversationsList]);

  const handleSuggestionClick = useCallback(
    (question: string) => {
      setQuery(question);
      setTimeout(() => {
        const form = document.querySelector('form');
        form?.requestSubmit();
      }, 0);
    },
    [setQuery],
  );

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
    setConversation([]);
    setQuery('');
  }, [setActiveConversationId, setConversation, setQuery]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const currentQuery = query;
    const userMessage: ConversationMessage = {
      role: 'user',
      content: currentQuery,
      timestamp: new Date(),
    };

    setConversation((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setQuery('');

    // Add a placeholder assistant message that will be progressively filled
    const placeholderAssistant: ConversationMessage = {
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date(),
    };
    setConversation((prev) => [...prev, placeholderAssistant]);

    const callbacks = {
      onMetadata: (meta: StreamMetadata) => {
        setConversation((prev) => {
          const updated = [...prev];
          // Update user message with DB id
          const userIdx = updated.length - 2;
          if (userIdx >= 0) {
            updated[userIdx] = { ...updated[userIdx], id: meta.userMessageId };
          }
          // Update assistant message with sources
          const assistantIdx = updated.length - 1;
          updated[assistantIdx] = {
            ...updated[assistantIdx],
            sources: meta.sources,
          };
          return updated;
        });
        if (!activeConversationId) {
          setActiveConversationId(meta.conversationId);
          refreshConversationsList();
        }
      },
      onChunk: (text: string) => {
        setConversation((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + text,
          };
          return updated;
        });
      },
      onDone: (data: { assistantMessageId: string }) => {
        setConversation((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            id: data.assistantMessageId,
          };
          return updated;
        });
        setIsLoading(false);
      },
      onError: (error: Error) => {
        setConversation((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `Sorry, something went wrong: ${error.message}`,
          };
          return updated;
        });
        setIsLoading(false);
      },
    };

    try {
      if (activeConversationId) {
        await askInConversationStream(activeConversationId, currentQuery, callbacks);
      } else {
        await quickAskStream(currentQuery, callbacks);
      }
    } catch (error: any) {
      setConversation((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Sorry, something went wrong: ${error.message || 'Could not reach the API'}. Make sure the API server is running and knowledge sources have been indexed.`,
        };
        return updated;
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {conversation.length === 0 ? (
        /* Empty State — Hero + Quick Links */
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <div className="max-w-2xl w-full text-center space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <TreePine className="size-6" />
                </div>
              </div>
              <h1 className="text-4xl font-serif font-semibold tracking-tight">
                Tokamak Forest
              </h1>
              <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
                Your single source of truth for the Tokamak Network ecosystem.
                Ask anything — powered by RAG + LLM.
              </p>
            </div>

            {/* Search Input */}
            <form onSubmit={handleAsk}>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask about Tokamak Network... e.g. 'How does TON staking work?'"
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <Button type="submit" size="lg" disabled={!query.trim()}>
                  <Send className="size-4" />
                  Ask
                </Button>
              </div>
            </form>

            {/* Suggested Questions */}
            {suggestions.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-center gap-1.5">
                  <MessageCircleQuestion className="size-3.5 text-muted-foreground/60" />
                  <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                    Try asking
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s.question)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3.5 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-foreground hover:border-primary/30 transition-all duration-150 shadow-sm hover:shadow"
                    >
                      {s.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Link Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <Link href="/dashboard">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <LayoutDashboard className="size-4 text-muted-foreground" />
                      Dashboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Analytics & status
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/sources">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="size-4 text-muted-foreground" />
                      Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      GitHub repos, docs
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/content">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Curated guides
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>

              <a
                href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000'}/docs`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TreePine className="size-4 text-muted-foreground" />
                      API Docs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Swagger / OpenAPI
                    </CardDescription>
                  </CardContent>
                </Card>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Conversation View */
        <>
          {/* Conversation header bar */}
          <div className="flex items-center justify-between border-b px-4 py-2 bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <TreePine className="size-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate text-muted-foreground">
                {activeConversationId ? 'Conversation' : 'New Conversation'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleNewChat}
            >
              <Plus className="size-3.5" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {conversation.map((msg, i) => (
                <ChatMessage key={msg.id || i} message={msg} />
              ))}

              {isLoading && conversation.length > 0 && conversation[conversation.length - 1].content === '' && (
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

          {/* Bottom Input */}
          <div className="border-t bg-background/80 backdrop-blur-sm p-4">
            <form onSubmit={handleAsk} className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="pl-10 h-11 rounded-xl"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!query.trim() || isLoading}
                  className="rounded-xl h-11 px-4"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

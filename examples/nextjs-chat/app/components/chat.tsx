'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { Message, LoadingMessage } from './message';

interface Source {
  title: string;
  url?: string;
  score?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  confidence?: number;
  isStreaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What is Tokamak Network?',
  'How does TON staking work?',
  'Explain the Layer 2 rollup architecture',
  'What is Titan?',
];

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;

      const userMsg: ChatMessage = { role: 'user', content: question.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: question.trim(),
            conversationHistory: history,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: err.error || 'Something went wrong. Please try again.',
            },
          ]);
          setIsLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'No response stream available.' },
          ]);
          setIsLoading(false);
          return;
        }

        let assistantContent = '';
        let sources: Source[] = [];
        let confidence: number | undefined;

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '', isStreaming: true },
        ]);

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (currentEvent === 'metadata') {
                  sources = data.sources || [];
                  confidence = data.confidence;
                } else if (currentEvent === 'chunk') {
                  assistantContent += data.text || '';
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: assistantContent,
                        isStreaming: true,
                      };
                    }
                    return updated;
                  });
                } else if (currentEvent === 'done') {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: assistantContent,
                        sources,
                        confidence,
                        isStreaming: false,
                      };
                    }
                    return updated;
                  });
                } else if (currentEvent === 'error') {
                  assistantContent +=
                    data.message || 'An error occurred during streaming.';
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: assistantContent,
                        isStreaming: false,
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // skip malformed JSON
              }
              currentEvent = '';
            }
          }
        }

        // Ensure streaming flag is cleared even if 'done' event was missed
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant' && last.isStreaming) {
            updated[updated.length - 1] = {
              ...last,
              content: assistantContent || 'No answer received.',
              sources,
              confidence,
              isStreaming: false,
            };
          }
          return updated;
        });
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => !m.isStreaming),
          {
            role: 'assistant',
            content: 'Network error. Check your connection and try again.',
          },
        ]);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, messages],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
                <svg
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">
                Ask about Tokamak
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Get AI-powered answers from the Tokamak Network knowledge base
              </p>
            </div>

            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-lg border border-gray-700 bg-[#12122a] px-3 py-2.5 text-left text-sm text-gray-300 transition-colors hover:border-indigo-500 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((msg, i) => (
              <Message key={i} {...msg} />
            ))}
            {isLoading &&
              !messages[messages.length - 1]?.isStreaming && (
                <LoadingMessage />
              )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 bg-[#0a0a1a] px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about Tokamak Network..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-700 bg-[#12122a] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-gray-600">
          Powered by Tokamak Pilot — answers are AI-generated and may not be
          100% accurate
        </p>
      </div>
    </div>
  );
}

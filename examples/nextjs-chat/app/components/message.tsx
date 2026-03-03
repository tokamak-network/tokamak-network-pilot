interface Source {
  title: string;
  url?: string;
  score?: number;
}

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  confidence?: number;
  isStreaming?: boolean;
}

export function Message({
  role,
  content,
  sources,
  confidence,
  isStreaming,
}: MessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-3 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        <div className="rounded-2xl rounded-bl-sm bg-[#1e1e3a] px-4 py-3 text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
          )}
        </div>

        {confidence != null && !isStreaming && (
          <div className="px-1 text-[11px] text-gray-500">
            Confidence: {Math.round(confidence * 100)}%
          </div>
        )}

        {sources && sources.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-2 px-1">
            {sources.slice(0, 4).map((s, i) => (
              <a
                key={i}
                href={s.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-[#12122a] px-2 py-1 text-[11px] text-gray-400 transition-colors hover:border-indigo-500 hover:text-indigo-300"
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="max-w-[160px] truncate">{s.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoadingMessage() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm bg-[#1e1e3a] px-4 py-3">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500 [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
}

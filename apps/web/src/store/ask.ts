import { atom } from 'jotai';
import type {
  ConversationSummaryResponse,
  MessageResponse,
} from '@/lib/api';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string; score: number }>;
  timestamp: Date;
  /** DB message ID (set once persisted) */
  id?: string;
}

export interface QueryResult {
  answer: string;
  sources: Array<{ title: string; url: string; score: number }>;
  confidence: number;
}

/** Current search/ask query input */
export const queryAtom = atom('');

/** Result from the last ask request */
export const queryResultAtom = atom<QueryResult | null>(null);

/** Whether a RAG query is in-flight */
export const isLoadingAtom = atom(false);

/** Full conversation history (local representation for current thread) */
export const conversationAtom = atom<ConversationMessage[]>([]);

// ───── Conversation persistence atoms ─────

/** Currently active conversation ID (null = new conversation mode) */
export const activeConversationIdAtom = atom<string | null>(null);

/** List of recent conversations (sidebar) */
export const conversationsListAtom = atom<ConversationSummaryResponse[]>([]);

/** Whether the conversations list is loading */
export const conversationsLoadingAtom = atom(false);

// ───── Helpers ─────

/** Convert a DB MessageResponse to the local ConversationMessage format */
export function dbMessageToLocal(msg: MessageResponse): ConversationMessage {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    sources: msg.sources,
    timestamp: new Date(msg.createdAt),
  };
}

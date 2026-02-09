import { atom } from 'jotai';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string; score: number }>;
  timestamp: Date;
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

/** Full conversation history */
export const conversationAtom = atom<ConversationMessage[]>([]);

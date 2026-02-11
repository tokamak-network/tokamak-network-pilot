/** Supported LLM providers */
export type LlmProvider = 'openai' | 'anthropic';

/** A single message in a chat conversation */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options for a chat completion request */
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/** Result returned by a chat completion */
export interface ChatCompletionResult {
  content: string;
  provider: LlmProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

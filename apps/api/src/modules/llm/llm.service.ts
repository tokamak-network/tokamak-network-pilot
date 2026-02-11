import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import {
  LlmProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
} from './llm.types';

/**
 * Latest recommended models per provider (as of Feb 2026).
 *
 * OpenAI options:
 *   - gpt-5.2        : Latest flagship, best for coding & agentic tasks
 *   - gpt-5-mini     : Cost-efficient GPT-5 for well-defined tasks
 *   - gpt-5-nano     : Fastest, cheapest GPT-5
 *   - gpt-4.1        : Smartest non-reasoning model (previous gen)
 *   - gpt-4.1-mini   : Fast & cheap previous gen
 *
 * Anthropic options:
 *   - claude-opus-4-6              : Most intelligent, for agents & coding
 *   - claude-sonnet-4-5-20250929   : Best balance of speed & intelligence
 *   - claude-haiku-4-5-20251001    : Fastest, near-frontier intelligence
 */
const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4.1-mini',          // Best cost/quality ratio for RAG
  anthropic: 'claude-sonnet-4-5',   // Best speed/intelligence balance (alias)
};

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);

  private provider!: LlmProvider;
  private model!: string;

  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.provider = this.config.get<LlmProvider>('LLM_PROVIDER', 'openai');
    this.model = this.config.get<string>(
      'LLM_MODEL',
      DEFAULT_MODELS[this.provider],
    );

    switch (this.provider) {
      case 'openai': {
        const apiKey = this.config.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
          this.logger.warn('OPENAI_API_KEY not set — LLM calls will fail');
        }
        this.openai = new OpenAI({ apiKey });
        break;
      }

      case 'anthropic': {
        const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
        if (!apiKey) {
          this.logger.warn('ANTHROPIC_API_KEY not set — LLM calls will fail');
        }
        this.anthropic = new Anthropic({ apiKey });
        break;
      }

      default:
        this.logger.warn(
          `Unknown LLM_PROVIDER "${this.provider}", falling back to openai`,
        );
        this.provider = 'openai';
        this.openai = new OpenAI({
          apiKey: this.config.get<string>('OPENAI_API_KEY'),
        });
    }

    this.logger.log(`LLM initialized — provider=${this.provider}, model=${this.model}`);
  }

  /** Get the currently active provider */
  getProvider(): LlmProvider {
    return this.provider;
  }

  /** Get the currently active model */
  getModel(): string {
    return this.model;
  }

  /**
   * Generate a chat completion using the configured provider.
   */
  async chatCompletion(
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    switch (this.provider) {
      case 'openai':
        return this.openaiCompletion(options);
      case 'anthropic':
        return this.anthropicCompletion(options);
      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  // ───────────────────── OpenAI ─────────────────────

  private async openaiCompletion(
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.openai) throw new Error('OpenAI client not initialized');

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1500,
    });

    const content =
      completion.choices[0]?.message?.content || 'Unable to generate an answer.';

    return {
      content,
      provider: 'openai',
      model: this.model,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }

  // ───────────────────── Anthropic ─────────────────────

  private async anthropicCompletion(
    options: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized');

    // Anthropic separates the system prompt from messages
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const conversationMessages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 1500,
      ...(systemMessage ? { system: systemMessage.content } : {}),
      messages: conversationMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const content = textBlock && 'text' in textBlock
      ? textBlock.text
      : 'Unable to generate an answer.';

    return {
      content,
      provider: 'anthropic',
      model: this.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export type MessageRole = 'user' | 'assistant';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  conversationId!: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Column({ type: 'varchar', length: 20 })
  role!: MessageRole;

  @Column({ type: 'text' })
  content!: string;

  /** Cited sources (stored as JSON for assistant messages) */
  @Column({ type: 'jsonb', nullable: true })
  sources?: Array<{ title: string; url: string; score: number; snippet?: string }>;

  /** Confidence score for assistant responses */
  @Column({ type: 'float', nullable: true })
  confidence?: number;

  /** LLM provider used (e.g. openai, anthropic) */
  @Column({ type: 'varchar', length: 50, nullable: true })
  provider?: string;

  /** LLM model used (e.g. gpt-4o, claude-3.5-sonnet) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  model?: string;

  @CreateDateColumn()
  createdAt!: Date;
}

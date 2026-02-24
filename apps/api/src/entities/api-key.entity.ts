import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export type ApiKeyTier = 'free' | 'standard' | 'premium';

export const API_KEY_SCOPES = [
  'ask',
  'search',
  'sources:read',
  'content:read',
  'projects:read',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** Rate limits (requests per minute) by tier */
export const TIER_RATE_LIMITS: Record<ApiKeyTier, number> = {
  free: 30,
  standard: 120,
  premium: 600,
};

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  /** SHA-256 hash of the actual key — never store plaintext */
  @Column({ unique: true })
  @Index()
  keyHash!: string;

  /** First 8 chars of the key for display (e.g. "tkp_a1b2") */
  @Column({ length: 12 })
  keyPrefix!: string;

  /** Permitted scopes */
  @Column({ type: 'simple-array', default: 'ask,search,sources:read,content:read,projects:read' })
  scopes!: ApiKeyScope[];

  /** Tier — defaults to premium for @tokamak.network users */
  @Column({ type: 'varchar', length: 20, default: 'premium' })
  tier!: ApiKeyTier;

  /** Requests per minute */
  @Column({ type: 'int', default: 600 })
  rateLimit!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'bigint', default: 0 })
  totalRequests!: number;

  @Column({ type: 'uuid' })
  @Index()
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

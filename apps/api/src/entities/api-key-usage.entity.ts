import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('api_key_usage_logs')
export class ApiKeyUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  apiKeyId!: string;

  @ManyToOne(() => ApiKey, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'apiKeyId' })
  apiKey?: ApiKey;

  @Column()
  endpoint!: string;

  @Column({ length: 10 })
  method!: string;

  @Column({ type: 'int' })
  statusCode!: number;

  @Column({ type: 'int', nullable: true })
  responseTimeMs?: number;

  @Column({ nullable: true })
  ip?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}

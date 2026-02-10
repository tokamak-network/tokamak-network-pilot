import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Document } from './document.entity';

export type SourceType =
  | 'github_repo'
  | 'github_org'
  | 'documentation'
  | 'file_upload'
  | 'notion'
  | 'custom';

export type SourceStatus = 'active' | 'syncing' | 'error' | 'disabled';

@Entity('sources')
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: SourceType;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: SourceStatus;

  @Column({ type: 'jsonb', default: {} })
  config!: Record<string, unknown>;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt?: Date;

  @Column({ type: 'int', default: 0 })
  documentCount!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Document, (doc) => doc.source)
  documents!: Document[];
}

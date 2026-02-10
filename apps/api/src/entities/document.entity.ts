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
import { Source } from './source.entity';

export type ContentType =
  | 'readme'
  | 'documentation'
  | 'issue'
  | 'pull_request'
  | 'code'
  | 'wiki'
  | 'comment'
  | 'other';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  sourceId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 50 })
  contentType!: ContentType;

  @Column({ type: 'text', nullable: true })
  url?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  /** UUID of the corresponding point in Qdrant */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  qdrantPointId?: string;

  @Column({ type: 'int', default: 0 })
  chunkIndex!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Source, (source) => source.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  source!: Source;
}

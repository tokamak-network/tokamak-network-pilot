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
import { Project } from './project.entity';

export type ProjectFeedbackStatus =
  | 'new'
  | 'reviewed'
  | 'planned'
  | 'rejected';

export type ProjectFeedbackCategory =
  | 'feature'
  | 'bug'
  | 'ux'
  | 'performance'
  | 'integration'
  | 'pricing'
  | 'other';

@Entity('project_feedback')
export class ProjectFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'varchar', length: 50, default: 'other' })
  category!: ProjectFeedbackCategory;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status!: ProjectFeedbackStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title?: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'smallint', nullable: true })
  painLevel?: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  persona?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  submitterName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  submitterEmail?: string;

  @Column({ type: 'varchar', length: 20, default: 'public_form' })
  sourceType!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  sourceUrl?: string;

  @Column({ type: 'int', default: 0 })
  votes!: number;

  @Column({ type: 'text', nullable: true })
  moderatorNote?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

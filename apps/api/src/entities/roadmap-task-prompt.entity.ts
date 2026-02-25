import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';
import { RoadmapItem } from './roadmap-item.entity';
import { User } from './user.entity';

@Entity('roadmap_task_prompts')
export class RoadmapTaskPrompt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'uuid' })
  @Index()
  roadmapItemId!: string;

  @ManyToOne(() => RoadmapItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roadmapItemId' })
  roadmapItem!: RoadmapItem;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'jsonb', default: [] })
  tasks!: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
  }>;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider?: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  model?: string;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @CreateDateColumn()
  createdAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';
import { Source } from './source.entity';

@Entity('project_sources')
@Unique(['projectId', 'sourceId'])
export class ProjectSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId!: string;

  @Column({ type: 'uuid' })
  @Index()
  sourceId!: string;

  @ManyToOne(() => Project, (p) => p.projectSources, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @ManyToOne(() => Source, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceId' })
  source!: Source;

  @CreateDateColumn()
  assignedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ProjectMember } from './project-member.entity';
import { ProjectSource } from './project-source.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  @Index()
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl?: string;

  @Column({ type: 'jsonb', default: [] })
  links!: Array<{ label: string; url: string }>;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({ type: 'timestamp', nullable: true })
  summaryUpdatedAt?: Date;

  @Column({ type: 'boolean', default: true })
  isPublic!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ProjectMember, (pm) => pm.project, { cascade: true })
  members!: ProjectMember[];

  @OneToMany(() => ProjectSource, (ps) => ps.project, { cascade: true })
  projectSources!: ProjectSource[];
}

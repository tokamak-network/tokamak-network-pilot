import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectNews } from './project-news.entity';

export type PostPlatform = 'twitter' | 'linkedin' | 'instagram';
export type PostStatus = 'draft' | 'published' | 'archived';

@Entity('generated_posts')
@Index(['projectId', 'createdAt'])
export class GeneratedPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId!: string;

  @Column({ type: 'uuid' })
  @Index()
  articleId!: string;

  @Column({ type: 'varchar', length: 32 })
  platform!: PostPlatform;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status!: PostStatus;

  @Column({ type: 'varchar', length: 512 })
  articleTitle!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  articleUrl?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  provider?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  model?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @ManyToOne(() => ProjectNews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article!: ProjectNews;
}

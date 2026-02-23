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

@Entity('snippets')
export class Snippet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  language!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  category?: string;

  @Column({ type: 'simple-array', default: '' })
  tags!: string[];

  @Column({ type: 'varchar', nullable: true })
  @Index()
  projectSlug?: string;

  @Column({ type: 'uuid', nullable: true })
  authorId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'authorId' })
  author?: User;

  /** Whether this snippet was AI-generated */
  @Column({ type: 'boolean', default: false })
  isGenerated!: boolean;

  @Column({ type: 'int', default: 0 })
  copyCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

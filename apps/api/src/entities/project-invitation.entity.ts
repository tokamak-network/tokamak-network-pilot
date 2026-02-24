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
import { User } from './user.entity';
import type { ProjectRole } from './project-member.entity';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

@Entity('project_invitations')
export class ProjectInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  projectId!: string;

  @Column()
  @Index()
  email!: string;

  @Column({ type: 'varchar', length: 20, default: 'contributor' })
  role!: ProjectRole;

  @Column({ unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: InvitationStatus;

  @Column({ type: 'uuid' })
  invitedById!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

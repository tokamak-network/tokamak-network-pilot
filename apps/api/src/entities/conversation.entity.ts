import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Auto-generated title from first question, editable by user */
  @Column({ type: 'varchar', length: 255, default: 'New conversation' })
  title!: string;

  /** Optional owner — null for anonymous sessions */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @OneToMany(() => Message, (m) => m.conversation, { cascade: true })
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

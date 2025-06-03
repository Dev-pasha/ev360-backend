import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Group } from './group.entity';
import { User } from './user.entity';
import { MessageRecipient } from './message-recipient.entity';

export enum RecipientType {
  PLAYERS = 'PLAYERS',
  EVALUATORS = 'EVALUATORS'
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  subject!: string;

  @Column('text')
  body!: string;

  @Column({
    type: 'enum',
    enum: RecipientType,
    default: RecipientType.PLAYERS
  })
  recipient_type!: RecipientType;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
  group!: Group;

  @Column({ name: 'group_id' })
  group_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reply_to_id' })
  reply_to!: User;

  @Column({ name: 'reply_to_id' })
  reply_to_id!: number;

  @OneToMany(() => MessageRecipient, recipient => recipient.message, { cascade: true })
  recipients!: MessageRecipient[];

  @Column({ type: 'timestamp', name: 'sent_date' })
  sent_date!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
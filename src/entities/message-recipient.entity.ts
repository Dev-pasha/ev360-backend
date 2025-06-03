import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Message } from './message.entity';
import { Player } from './player.entity';
import { User } from './user.entity';

export enum MessageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

@Entity('message_recipients')
export class MessageRecipient {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Message, message => message.recipients)
  @JoinColumn({ name: 'message_id' })
  message!: Message;

  @Column({ name: 'message_id' })
  message_id!: number;

  @ManyToOne(() => Player, { nullable: true })
  @JoinColumn({ name: 'player_id' })
  player!: Player | null;

  @Column({ name: 'player_id', nullable: true })
  player_id!: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'evaluator_id' })
  evaluator!: User | null;

  @Column({ name: 'evaluator_id', nullable: true })
  evaluator_id!: number | null;

  @Column()
  email!: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING
  })
  status!: MessageStatus;

  @Column({ type: 'timestamp', name: 'last_updated_date', nullable: true })
  last_updated_date!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
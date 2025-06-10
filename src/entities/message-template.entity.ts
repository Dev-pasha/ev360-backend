import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Group } from './group.entity';

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  subject!: string;

  @Column('text')
  body!: string;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
  group!: Group;

  @Column({ name: 'group_id' })
  group_id!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
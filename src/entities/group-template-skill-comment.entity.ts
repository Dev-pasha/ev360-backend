// src/entities/group-template-skill-comment.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { GroupTemplateSkill } from './group-template-skill.entity';

@Entity('group_template_skill_comments')
export class GroupTemplateSkillComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => GroupTemplateSkill, skill => skill.prefilledComments, { onDelete: 'CASCADE' })
  skill!: GroupTemplateSkill;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ nullable: true })
  category!: string;

  @Column({ default: 0 })
  order!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
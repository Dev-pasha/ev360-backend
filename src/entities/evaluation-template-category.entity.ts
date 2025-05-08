// src/entities/TemplateCategory.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EvaluationTemplate } from './evaluation-template.entity';
import { TemplateSkill } from './evaluation-template-skills.entity';

@Entity('template_categories')
export class TemplateCategory {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    name!: string;

  @ManyToOne(() => EvaluationTemplate, template => template.categories)
    template!: EvaluationTemplate;

  @OneToMany(() => TemplateSkill, skill => skill.category, { cascade: true })
    skills!: TemplateSkill[];

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
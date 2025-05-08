import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TemplateCategory } from './evaluation-template-category.entity';
import { TemplateMetric } from './evaluation-template-metric-score.entity';

@Entity('template_skills')
export class TemplateSkill {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    name!: string;

  @ManyToOne(() => TemplateCategory, category => category.skills)
    category!: TemplateCategory;

  @OneToMany(() => TemplateMetric, metric => metric.skill, { cascade: true })
    metrics!: TemplateMetric[];

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TemplateCategory } from './evaluation-template-category.entity';
import { TemplateCustomLabel } from './evaluation-template-custom-label.entity';

@Entity('evaluation_templates')
export class EvaluationTemplate {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    name!: string;

  @Column({ default: false })
    is_custom!: boolean;

  @Column()
    sport!: number;

  @Column()
    level!: number;

  @OneToMany(() => TemplateCategory, category => category.template, { cascade: true })
    categories!: TemplateCategory[];

  @OneToMany(() => TemplateCustomLabel, customLabel => customLabel.template, { cascade: true })
    custom_labels!: TemplateCustomLabel[];

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
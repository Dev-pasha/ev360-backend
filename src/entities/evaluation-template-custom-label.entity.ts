import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EvaluationTemplate } from './evaluation-template.entity';

export enum CustomLabelType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  CHECKBOX = 'CHECKBOX',
  DATE = 'DATE',
  RADIO = 'RADIO'
}

@Entity('template_custom_labels')
export class TemplateCustomLabel {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    label!: string;

  @Column({
        type: 'enum',
        enum: CustomLabelType,
        default: CustomLabelType.TEXT
    })
    type!: CustomLabelType;

  @Column({ type: 'jsonb', nullable: true })
  options: any;

  @ManyToOne(() => EvaluationTemplate, template => template.custom_labels)
    template!: EvaluationTemplate;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
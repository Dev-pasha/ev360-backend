import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TemplateSkill } from './evaluation-template-skills.entity';

export enum MetricType {
  SUBJECTIVE_SCORE = 1,
  SINGLE_SCORE = 2,
  COMMENT_ONLY = 3,
  CHOICE = 4
}

@Entity('template_metrics')
export class TemplateMetric {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    name!: string;

  @Column()
    order!: number;

  @Column({
        type: 'enum',
        enum: MetricType,
        default: MetricType.SUBJECTIVE_SCORE
    })
    metric_type!: MetricType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    min_value!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    max_value!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    step!: string;

  @Column({ nullable: true })
    units!: string;

  @Column({ default: false })
    lower_score_is_better!: boolean;

  @Column({ type: 'text', nullable: true })
    info!: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: any;

  @ManyToOne(() => TemplateSkill, skill => skill.metrics)
    skill!: TemplateSkill;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
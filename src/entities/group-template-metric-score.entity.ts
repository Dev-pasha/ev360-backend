import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { GroupTemplateSkill } from './group-template-skill.entity';
import { TemplateMetric, MetricType } from './evaluation-template-metric-score.entity';

@Entity('group_template_metrics')
export class GroupTemplateMetric {
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

  @ManyToOne(() => GroupTemplateSkill, skill => skill.metrics)
    skill!: GroupTemplateSkill;

  @ManyToOne(() => TemplateMetric, { nullable: true })
    baseMetric!: TemplateMetric;

  @Column({ default: false })
    isCustom!: boolean;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}

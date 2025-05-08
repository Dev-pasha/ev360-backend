import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { GroupTemplate } from './group-template.entity';
import { TemplateCustomLabel, CustomLabelType } from './evaluation-template-custom-label.entity';

@Entity('group_template_custom_labels')
export class GroupTemplateCustomLabel {
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

  @ManyToOne(() => GroupTemplate, groupTemplate => groupTemplate.customLabels)
    groupTemplate!: GroupTemplate;

  @ManyToOne(() => TemplateCustomLabel, { nullable: true })
    baseCustomLabel!: TemplateCustomLabel;

  @Column({ default: false })
    isCustom!: boolean;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Group } from './group.entity';
import { EvaluationTemplate } from './evaluation-template.entity';
import { GroupTemplateCategory } from './group-template-category.entity';
import { GroupTemplateCustomLabel } from './group-template-custom-lable.entity';

@Entity('group_templates')
export class GroupTemplate {
  @PrimaryGeneratedColumn()
    id!: number;

  @ManyToOne(() => Group)
    group!: Group;

  @ManyToOne(() => EvaluationTemplate)
    baseTemplate!: EvaluationTemplate;

  @Column({ default: false })
    isCustomized!: boolean;

  @Column({ nullable: true })
    customName!: string;

  @OneToMany(() => GroupTemplateCategory, category => category.groupTemplate, { cascade: true })
    categories!: GroupTemplateCategory[];

  @OneToMany(() => GroupTemplateCustomLabel, customLabel => customLabel.groupTemplate, { cascade: true })
    customLabels!: GroupTemplateCustomLabel[];

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
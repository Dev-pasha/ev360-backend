import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { GroupTemplate } from './group-template.entity';
import { TemplateCategory } from './evaluation-template-category.entity';
import { GroupTemplateSkill } from './group-template-skill.entity';

@Entity('group_template_categories')
export class GroupTemplateCategory {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column()
    name!: string;

  @ManyToOne(() => GroupTemplate, groupTemplate => groupTemplate.categories)
    groupTemplate!: GroupTemplate;

  @ManyToOne(() => TemplateCategory, { nullable: true })
    baseCategory!: TemplateCategory;

  @Column({ default: false })
    isCustom!: boolean;

  @OneToMany(() => GroupTemplateSkill, skill => skill.category, { cascade: true })
    skills!: GroupTemplateSkill[];

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
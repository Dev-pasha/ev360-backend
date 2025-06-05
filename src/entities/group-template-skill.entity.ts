import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { GroupTemplateCategory } from "./group-template-category.entity";
import { TemplateSkill } from "./evaluation-template-skills.entity";
import { GroupTemplateMetric } from "./group-template-metric-score.entity";
import { GroupTemplateSkillComment } from "./group-template-skill-comment.entity";

@Entity("group_template_skills")
export class GroupTemplateSkill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @ManyToOne(() => GroupTemplateCategory, (category) => category.skills)
  category!: GroupTemplateCategory;

  @ManyToOne(() => TemplateSkill, { nullable: true })
  baseSkill!: TemplateSkill;

  @Column({ default: false })
  isCustom!: boolean;

  @OneToMany(() => GroupTemplateMetric, (metric) => metric.skill, {
    cascade: true,
  })
  metrics!: GroupTemplateMetric[];

  @OneToMany(() => GroupTemplateSkillComment, (comment) => comment.skill, {
    cascade: true,
  })
  prefilledComments!: GroupTemplateSkillComment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

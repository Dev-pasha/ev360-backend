import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Resource } from "./resource.entity";
import { PlayerList } from "./player-list.entity";
import { Team } from "./team.entity";
import { GroupTemplateMetric } from "./group-template-metric-score.entity";
import { GroupTemplateSkill } from "./group-template-skill.entity";
import { IsOptional, ValidateIf } from "class-validator";

export enum ScoreComparison {
  LESS_THAN = "<",
  LESS_THAN_EQUAL = "<=",
  EQUAL = "=",
  GREATER_THAN_EQUAL = ">=",
  GREATER_THAN = ">",
}

@Entity("resource_visibilities")
export class ResourceVisibility {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "resource_id" })
  resourceId!: number;

  @ManyToOne(() => Resource, (resource) => resource.visibilities)
  @JoinColumn({ name: "resource_id" })
  resource!: Resource;

  @ValidateIf((o) => o.all_players && o.player_list_id !== null)
  @IsOptional()
  @Column({
    type: "boolean",
    default: false,
    comment: "Must be false if player_list_id or team_id is set",
  })
  all_players!: boolean;

  @Column({ name: "player_list_id", nullable: true })
  player_list_id!: number | null;

  @ManyToOne(() => PlayerList, { nullable: true })
  @JoinColumn({ name: "player_list_id" })
  player_list!: PlayerList | null;

  @Column({ name: "team_id", nullable: true })
  team_id!: number | null;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: "team_id" })
  team!: Team | null;

  @Column({
    name: "metric_id",
    nullable: true,
    comment:
      "Must be null unless both score_criteria and score_comparison are set",
  })
  metric_id!: number | null;

  @ManyToOne(() => GroupTemplateMetric, { nullable: true })
  @JoinColumn({ name: "metric_id" })
  metric!: GroupTemplateMetric | null;

  @Column({
    name: "skill_id",
    nullable: true,
    comment:
      "Must be null unless both score_criteria and score_comparison are set",
  })
  skill_id!: number | null;

  @ManyToOne(() => GroupTemplateSkill, { nullable: true })
  @JoinColumn({ name: "skill_id" })
  skill!: GroupTemplateSkill | null;

  @ValidateIf((o) => o.metric_id !== null || o.skill_id !== null)
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  score_criteria!: number | null;

  @Column({
    type: "enum",
    enum: ScoreComparison,
    nullable: true,
  })
  score_comparison!: ScoreComparison | null;
}

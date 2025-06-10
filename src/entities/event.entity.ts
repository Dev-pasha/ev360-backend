// src/entities/event.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Group } from "./group.entity";
import { Team } from "./team.entity";
import { Player } from "./player.entity";
import { User } from "./user.entity";
import { GroupTemplateSkill } from "./group-template-skill.entity";
import { GroupTemplateMetric } from "./group-template-metric-score.entity";
import { EventEvaluator } from "./event-evaluator.entity";
import { EvaluationResult } from "./evaluation-result.entity";

export enum EventType {
  STANDARD_EVALUATION = 1,
  SELF_ASSESSMENT = 2,
}

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({
    type: "enum",
    enum: EventType,
    default: EventType.STANDARD_EVALUATION,
  })
  event_type!: EventType;

  @Column({ type: "timestamp" })
  event_datetime!: Date;

  @Column({ type: "timestamp" })
  end_date!: Date;

  @ManyToOne(() => Group, { nullable: false })
  group!: Group;

  @ManyToOne(() => Team, { nullable: true })
  team!: Team | null;

  @Column({ default: false })
  hide_player_names!: boolean;

  @Column({ default: false })
  hide_preferred_positions!: boolean;

  @Column({ default: false })
  locked!: boolean;

  @Column({ default: true })
  send_invites!: boolean;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Players in the event
  @ManyToMany(() => Player)
  @JoinTable({
    name: "event_players",
    joinColumn: { name: "event_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "player_id", referencedColumnName: "id" },
  })
  players!: Player[];

  // Skills selected for evaluation
  @ManyToMany(() => GroupTemplateSkill)
  @JoinTable({
    name: "event_skills",
    joinColumn: { name: "event_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "skill_id", referencedColumnName: "id" },
  })
  skills!: GroupTemplateSkill[];


  @ManyToMany(() => GroupTemplateMetric)
  @JoinTable({
    name: "event_metrics",
    joinColumn: { name: "event_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "metric_id", referencedColumnName: "id" },
  })
  metrics!: GroupTemplateMetric[];
  
  // Evaluators (accepted)
  @OneToMany(() => EventEvaluator, (eventEvaluator) => eventEvaluator.event)
  evaluators!: EventEvaluator[];

  // Evaluation results
  @OneToMany(() => EvaluationResult, (result) => result.event)
  evaluation_results!: EvaluationResult[];

  // Created by
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by_id" })
  created_by!: User;
}

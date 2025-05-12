// src/entities/evaluation-result.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Event } from "./event.entity";
import { Player } from "./player.entity";
import { User } from "./user.entity";
import { GroupTemplateMetric } from "./group-template-metric-score.entity";
import { MetricType } from "./evaluation-template-metric-score.entity";

@Entity("evaluation_results")
@Index(["event", "player", "evaluator", "metric"], { unique: true })
export class EvaluationResult {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Event, (event) => event.evaluation_results)
  event!: Event;

  @ManyToOne(() => Player)
  player!: Player;

  @ManyToOne(() => User)
  evaluator!: User;

  @ManyToOne(() => GroupTemplateMetric)
  metric!: GroupTemplateMetric;

  // Values based on metric type
  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  score!: number;

  @Column({ type: "text", nullable: true })
  comment!: string;

  @Column({ nullable: true })
  choice_value!: number;

  @Column({ nullable: true })
  attempt_number!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

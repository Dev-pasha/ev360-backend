// src/entities/self-assessment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Event } from "./event.entity";
import { Player } from "./player.entity";
import { GroupTemplateMetric } from "./group-template-metric-score.entity";

@Entity("self_assessments")
export class SelfAssessment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "eventId" })
  eventId!: number;

  @Column({ name: "playerId" })
  playerId!: number;

  @Column({ name: "metricId" })
  metricId!: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @ManyToOne(() => Player)
  @JoinColumn({ name: "playerId" })
  player!: Player;

  @ManyToOne(() => GroupTemplateMetric)
  @JoinColumn({ name: "metricId" })
  metric!: GroupTemplateMetric;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  value!: number;

  @Column({ type: "text", nullable: true })
  note!: string | null;

  @Column({ type: "jsonb", nullable: true })
  videos!: Array<{
    uuid: string;
    thumbnail: string;
  }>;

  @Column({ type: "jsonb", nullable: true })
  multi_score!: any;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

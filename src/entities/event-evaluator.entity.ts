// src/entities/event-evaluator.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "./event.entity";
import { User } from "./user.entity";

export enum EvaluatorStatus {
  INVITED = "invited",
  ACCEPTED = "accepted",
  DECLINED = "declined",
  COMPLETED = "completed",
}

@Entity("event_evaluators")
export class EventEvaluator {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Event, (event) => event.evaluators)
  event!: Event | null;

  @ManyToOne(() => User)
  evaluator!: User;

  @Column({
    type: "enum",
    enum: EvaluatorStatus,
    default: EvaluatorStatus.INVITED,
  })
  status!: EvaluatorStatus;

  @Column({ type: "timestamp", nullable: true })
  invitation_sent_at!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  accepted_at!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  completed_at!: Date | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

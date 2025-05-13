// src/entities/report-confirmation.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from "typeorm";
import { Report } from "./report.entity";
import { Player } from "./player.entity";

@Entity("report_confirmations")
export class ReportConfirmation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "reportId" })
  reportId!: number;

  @Column({ name: "playerId" })
  playerId!: number;

  @ManyToOne(() => Report, (report) => report.confirmations)
  @JoinColumn({ name: "reportId" })
  report!: Report;

  @ManyToOne(() => Player)
  @JoinColumn({ name: "playerId" })
  player!: Player;

  @Column({ type: "timestamp", nullable: true })
  sent_at!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  viewed_at!: Date | null;

  @Column({ type: "timestamp", nullable: true })
  confirmed_at!: Date | null;

  @Column({ type: "text", nullable: true })
  token!: string;

  @CreateDateColumn()
  created_at!: Date;
}
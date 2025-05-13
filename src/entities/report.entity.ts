// src/entities/report.entity.ts
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
  JoinColumn
} from "typeorm";
import { Group } from "./group.entity";
import { Event } from "./event.entity";
import { User } from "./user.entity";
import { ReportConfirmation } from "./report-confirmation.entity";

export enum ReportType {
  ALL_SCORE = "all_score",
  INDIVIDUAL = "individual",
  SELF_ASSESSMENT = "self_assessment",
}

export enum PreferredPositionType {
  PRIMARY = "PRIMARY",
  SECONDARY = "SECONDARY",
  ALL = "ALL",
}

@Entity("reports")
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({
    type: "enum",
    enum: ReportType,
  })
  report_type!: ReportType;

  @Column({ type: "text", nullable: true })
  optional_message!: string | null;

  @Column({ type: "timestamp", nullable: true })
  sent!: Date | null;

  @Column({ name: "groupId" })
  groupId!: number;

  @Column({ name: "createdById" })
  createdById!: number;

  @ManyToOne(() => Group, { nullable: false })
  @JoinColumn({ name: "groupId" })
  group!: Group;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "createdById" })
  created_by!: User;

  // Events included in the report
  @ManyToMany(() => Event)
  @JoinTable({
    name: "report_events",
    joinColumn: { name: "reportId" },
    inverseJoinColumn: { name: "eventId" },
  })
  events!: Event[];

  // Evaluators whose scores are included
  @ManyToMany(() => User)
  @JoinTable({
    name: "report_evaluators",
    joinColumn: { name: "reportId" },
    inverseJoinColumn: { name: "evaluatorId" },
  })
  evaluators!: User[];

  // Filters for individual reports
  @Column({
    type: "enum",
    enum: PreferredPositionType,
    default: PreferredPositionType.PRIMARY,
  })
  preferred_positions_type!: PreferredPositionType;

  @Column({ type: "jsonb", nullable: true })
  filters!: {
    player_list_ids?: number[];
    preferred_position_ids?: number[];
    team_ids?: number[];
    category_ids?: number[];
    jersey_colour_ids?: number[];
  };

  @OneToMany(() => ReportConfirmation, (confirmation) => confirmation.report)
  confirmations!: ReportConfirmation[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
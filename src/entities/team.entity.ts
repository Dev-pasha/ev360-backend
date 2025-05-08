// src/entities/Team.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Group } from "./group.entity";
import { Player } from "./player.entity";

@Entity("teams")
export class Team {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Group, { nullable: false })
  group!: Group;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  color!: string;

  @Column({ nullable: true })
  logo_url!: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => Player, (player) => player.team)
  players!: Player[];
}

// src/entities/PlayerList.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Group } from "./group.entity";
import { Player } from "./player.entity";

@Entity("player_lists")
export class PlayerList {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Group, { nullable: false })
  group!: Group;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: "jsonb", nullable: true })
  filter_criteria: any;

  @Column({ default: false })
  is_dynamic!: boolean;

  @ManyToMany(() => Player)
  @JoinTable({
    name: "player_list_players",
    joinColumn: { name: "player_list_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "player_id", referencedColumnName: "id" },
  })
  players!: Player[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

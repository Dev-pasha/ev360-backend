import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Group } from "./group.entity";
import { Player } from "./player.entity";

@Entity("positions")
export class Position {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Group, { nullable: true })
  group!: Group; 

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // @OneToMany(() => Player, (player) => player.primary_position)
  // players!: Player[];
}

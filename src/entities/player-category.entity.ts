import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Group } from "./group.entity";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Group)
  group!: Group;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

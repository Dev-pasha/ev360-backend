import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Group } from "./group.entity";
import { ResourceVisibility } from "./resource-visibility.entity";
import { User } from "./user.entity";

export enum ResourceType {
  VIDEO = 1,
  DOCUMENT = 2,
  WEB_LINK = 3,
}

@Entity("resources")
export class Resource {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  link!: string;

  @Column({
    type: "int",
    default: ResourceType.WEB_LINK,
  })
  type!: ResourceType;

  @ManyToOne(() => Group)
  @JoinColumn({ name: "group_id" })
  group!: Group;

  @OneToMany(() => ResourceVisibility, (visibility) => visibility.resource, {
    cascade: true,
  })
  visibilities!: ResourceVisibility[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_by_id" })
  created_by!: User | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserGroupRole } from "./user-group-role.entity";
import { GroupTemplate } from "./group-template.entity";
import { Position } from "./group-position.entity";
import { Team } from "./team.entity";
import { Subscription } from "./subscription.entity";

@Entity("groups")
export class Group {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => UserGroupRole, (userGroupRole) => userGroupRole.group)
  userGroupRoles!: UserGroupRole[];

  @OneToMany(() => GroupTemplate, (groupTemplate) => groupTemplate.group)
  templates!: GroupTemplate[];

  @OneToMany(() => Position, (position) => position.group)
  positions!: Position[];

  @OneToMany(() => Team, (team) => team.group)
  teams!: Team[];

  @Column({ nullable: true })
  subscription_id!: number | null;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: "subscription_id" })
  subscription!: Subscription | null;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { UserGroupRole } from "./user-group-role.entity";
import { GroupTemplate } from "./group-template.entity";
import { Position } from "./group-position.entity";
import { Team } from "./team.entity";

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
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { UserGroupRole } from "./user-group-role.entity";
import { Subscription } from "./subscription.entity";

@Entity("users")
export class User {
  static find(arg0: { where: { id: number } }) {
    throw new Error("Method not implemented.");
  }
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  passwordHash!: string;

  @Column({ nullable: true })
  firstName!: string;

  @Column({ nullable: true })
  lastName!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ nullable: true })
  refreshToken!: string;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => UserGroupRole, (userGroupRole) => userGroupRole.user)
  userGroupRoles!: UserGroupRole[];

  @OneToMany(() => Subscription, subscription => subscription.user)
  subscriptions!: Subscription[];

  @Column({ type: "boolean", default: false })
  is_account_owner!: boolean;
}

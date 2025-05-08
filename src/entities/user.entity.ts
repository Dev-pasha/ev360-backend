import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserGroupRole } from './user-group-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ unique: true })
    email!: string;

  @Column()
    passwordHash!: string;

  @Column({ nullable: true })
    firstName!: string;

  @Column({ nullable: true })
    lastName!: string;

  @Column({ default: false })
    emailVerified!: boolean;

  @Column({ nullable: true })
    lastLoginAt!: Date;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;

  @OneToMany(() => UserGroupRole, userGroupRole => userGroupRole.user)
    userGroupRoles!: UserGroupRole[];
}
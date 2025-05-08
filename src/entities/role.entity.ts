import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { UserGroupRole } from './user-group-role.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ unique: true })
    name!: string;

  @Column({ nullable: true })
    description!: string;

  @OneToMany(() => UserGroupRole, userGroupRole => userGroupRole.role)
    userGroupRoles!: UserGroupRole[];

  @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
    rolePermissions!: RolePermission[];
}

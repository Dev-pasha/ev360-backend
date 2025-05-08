import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { GroupPermissionOverride } from './group-permission-overide.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
    id!: number;

  @Column({ unique: true })
    name!: string;

  @Column({ nullable: true })
    description!: string;

  @Column()
    category!: string;

  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
    rolePermissions!: RolePermission[];

  @OneToMany(() => GroupPermissionOverride, override => override.permission)
    groupPermissionOverrides!: GroupPermissionOverride[];
}
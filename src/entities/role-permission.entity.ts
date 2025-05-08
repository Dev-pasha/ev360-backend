import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
@Index(['role', 'permission'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn()
    id!: number;

  @ManyToOne(() => Role, role => role.rolePermissions)
    role!: Role;

  @ManyToOne(() => Permission, permission => permission.rolePermissions)
    permission!: Permission;

  @CreateDateColumn()
    createdAt!: Date;
}
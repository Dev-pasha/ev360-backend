import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Group } from './group.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('group_permission_overrides')
@Index(['group', 'role', 'permission'], { unique: true })
export class GroupPermissionOverride {
  @PrimaryGeneratedColumn()
    id!: number;

  @ManyToOne(() => Group)
    group!: Group;

  @ManyToOne(() => Role)
    role!: Role;

  @ManyToOne(() => Permission)
    permission!: Permission;

  @Column()
    isGranted!: boolean;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
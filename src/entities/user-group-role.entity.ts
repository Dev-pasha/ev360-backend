import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, Unique } from 'typeorm';
import { User } from './user.entity';
import { Group } from './group.entity';
import { Role } from './role.entity';

@Entity('user_group_roles')
@Unique(['user', 'group'])
export class UserGroupRole {
  @PrimaryGeneratedColumn()
    id!: number;

  @Index()
    @ManyToOne(() => User, user => user.userGroupRoles)
    user!: User;

  @Index()
    @ManyToOne(() => Group, group => group.userGroupRoles)
    group!: Group;

  @Index()
    @ManyToOne(() => Role, role => role.userGroupRoles)
    role!: Role;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
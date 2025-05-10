import { UserGroupRole } from "../entities/user-group-role.entity";
import { RolePermission } from "../entities/role-permission.entity";
import { AppDataSource } from "../config/database";
import Logger from "../config/logger";
import { DataSource } from "typeorm";

export class PermissionService {
  private userGroupRoleRepository;
  private rolePermissionRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.userGroupRoleRepository = this.dataSource.getRepository(UserGroupRole);
    this.rolePermissionRepository =
      this.dataSource.getRepository(RolePermission);
  }

  async hasPermission(
    userId: number,
    groupId: number,
    permissionName: string
  ): Promise<boolean> {
    try {
      // Get user's role in the group
      const userGroupRole = await this.userGroupRoleRepository.findOne({
        where: {
          user: { id: userId },
          group: { id: groupId },
        },
        relations: ["role"],
      });

      if (!userGroupRole) {
        return false; // User is not in this group
      }

      // Owner always has all permissions
      if (userGroupRole.role.name === "Owner") {
        return true;
      }

      const rolePermission = await this.rolePermissionRepository.findOne({
        where: {
          role: { id: userGroupRole.role.id },
          permission: { name: permissionName },
        },
      });

      return !!rolePermission;
    } catch (error) {
      Logger.error(`Error checking permission: ${(error as Error).message}`);
      return false;
    }
  }

  async getUserRolesAndPermissions(userId: number) {
    // Get user's roles in all groups
    const userGroupRoles = await this.userGroupRoleRepository.find({
      where: { user: { id: userId } },
      relations: ["group", "role"],
    });

    // For each role, get permissions
    const result = [];

    for (const ugr of userGroupRoles) {
      const rolePermissions = await this.rolePermissionRepository.find({
        where: { role: { id: ugr.role.id } },
        relations: ["permission"],
      });

      const permissions = rolePermissions.map((rp) => ({
        name: rp.permission.name,
        description: rp.permission.description,
        category: rp.permission.category,
      }));

      result.push({
        groupId: ugr.group.id,
        groupName: ugr.group.name,
        roleId: ugr.role.id,
        roleName: ugr.role.name,
        permissions,
      });
    }

    return result;
  }
}

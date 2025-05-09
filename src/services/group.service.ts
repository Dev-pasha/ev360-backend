// src/services/GroupService.ts
import { AppDataSource } from "../config/database";
import { Group } from "../entities/group.entity";
import { User } from "../entities/user.entity";
import { Role } from "../entities/role.entity";
import { UserGroupRole } from "../entities/user-group-role.entity";
import Logger from "../config/logger";
import { DataSource } from "typeorm";

export class GroupService {
  private userRepository;
  private roleRepository;
  private groupRepository;
  private userGroupRoleRepository;

  constructor(private dataSource: DataSource = AppDataSource) {
    this.userRepository = this.dataSource.getRepository(User);
    this.groupRepository = this.dataSource.getRepository(Group);
    this.roleRepository = this.dataSource.getRepository(Role);
    this.userGroupRoleRepository = this.dataSource.getRepository(UserGroupRole);
  }

  async createGroup(
    userId: number,
    groupData: { name: string; description?: string; logo?: string }
  ) {
    try {
      // Verify user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        Logger.error(`Create group error: User not found (id: ${userId})`);
        throw new Error("User not found");
      }

      // Find owner role
      const ownerRole = await this.roleRepository.findOne({
        where: { name: "Owner" },
      });
      if (!ownerRole) {
        Logger.error("Create group error: Owner role not found");
        throw new Error("Owner role not found");
      }

      // Create group
      const group = this.groupRepository.create({
        name: groupData.name,
        description: groupData.description,
        // logo: groupData.logo
      });

      const savedGroup = await this.groupRepository.save(group);

      // Assign owner role to user
      const userGroupRole = this.userGroupRoleRepository.create({
        user,
        group: savedGroup,
        role: ownerRole,
      });

      await this.userGroupRoleRepository.save(userGroupRole);

      return savedGroup;
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Create group error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Create group error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getGroupById(groupId: number) {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        Logger.error(`Get group error: Group not found (id: ${groupId})`);
        throw new Error("Group not found");
      }

      return group;
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get group error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get group error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getUserGroups(userId: number) {
    try {
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: { user: { id: userId } },
        relations: ["group", "role"],
      });

      return userGroupRoles.map((ugr) => ({
        id: ugr.group.id,
        name: ugr.group.name,
        description: ugr.group.description,
        // logo: ugr.group.logo,
        role: ugr.role.name,
      }));
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get user groups error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get user groups error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async updateGroup(
    groupId: number,
    groupData: {
      name?: string;
      description?: string;
      logo?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        Logger.error(`Update group error: Group not found (id: ${groupId})`);
        throw new Error("Group not found");
      }

      // Update fields
      if (groupData.name !== undefined) group.name = groupData.name;
      if (groupData.description !== undefined)
        group.description = groupData.description;
      //   if (groupData.logo !== undefined) group.logo = groupData.logo;
      //   if (groupData.isActive !== undefined) group.isActive = groupData.isActive;

      return this.groupRepository.save(group);
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Update group error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Update group error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async addUserToGroup(
    groupId: number,
    userData: { email: string; roleId: number }
  ) {
    try {
      // Find group
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });
      if (!group) {
        Logger.error(
          `Add user to group error: Group not found (id: ${groupId})`
        );
        throw new Error("Group not found");
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { email: userData.email },
      });
      if (!user) {
        Logger.error(
          `Add user to group error: User not found (email: ${userData.email})`
        );
        throw new Error("User not found");
      }

      const { passwordHash, ...userWithoutPassword } = user;

      // Find role
      const role = await this.roleRepository.findOne({
        where: { id: userData.roleId },
      });
      if (!role) {
        Logger.error(
          `Add user to group error: Role not found (id: ${userData.roleId})`
        );
        throw new Error("Role not found");
      }

      // Check if user is already in the group
      const existingUserGroupRole = await this.userGroupRoleRepository.findOne({
        where: {
          user: { id: user.id },
          group: { id: groupId },
        },
      });

      if (existingUserGroupRole) {
        // Update role
        existingUserGroupRole.role = role;
        return this.userGroupRoleRepository.save(existingUserGroupRole);
      } else {
        // Add user to group
        const userGroupRole = this.userGroupRoleRepository.create({
          user: userWithoutPassword,
          group,
          role,
        });

        return this.userGroupRoleRepository.save(userGroupRole);
      }
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Add user to group error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Add user to group error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async removeUserFromGroup(groupId: number, userId: number) {
    try {
      const userGroupRole = await this.userGroupRoleRepository.findOne({
        where: {
          user: { id: userId },
          group: { id: groupId },
        },
        relations: ["role"],
      });

      if (!userGroupRole) {
        Logger.error(
          `Remove user from group error: User is not in this group (userId: ${userId}, groupId: ${groupId})`
        );
        throw new Error("User is not in this group");
      }

      // Cannot remove the last Owner
      if (userGroupRole.role.name === "Owner") {
        // Check if this is the last owner
        const ownersCount = await this.userGroupRoleRepository.count({
          where: {
            group: { id: groupId },
            role: { name: "Owner" },
          },
        });

        if (ownersCount <= 1) {
          Logger.error(
            `Remove user from group error: Cannot remove the last Owner from the group (userId: ${userId}, groupId: ${groupId})`
          );
          throw new Error("Cannot remove the last Owner from the group");
        }
      }

      // Remove user from group
      await this.userGroupRoleRepository.remove(userGroupRole);

      return true;
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Remove user from group error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Remove user from group error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getGroupUsers(groupId: number) {
    try {
      const userGroupRoles = await this.userGroupRoleRepository.find({
        where: { group: { id: groupId } },
        relations: ["user", "role"],
      });

      return userGroupRoles.map((ugr) => ({
        id: ugr.user.id,
        email: ugr.user.email,
        firstName: ugr.user.firstName,
        lastName: ugr.user.lastName,
        role: ugr.role.name,
        roleId: ugr.role.id,
      }));
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get group users error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get group users error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async transferOwnership(
    groupId: number,
    currentOwnerId: number,
    newOwnerId: number
  ) {
    try {
      // Find current owner's role
      const currentOwnerRole = await this.userGroupRoleRepository.findOne({
        where: {
          user: { id: currentOwnerId },
          group: { id: groupId },
        },
        relations: ["role"],
      });

      if (!currentOwnerRole || currentOwnerRole.role.name !== "Owner") {
        Logger.error(
          `Transfer ownership error: Current user is not the Owner of this group (userId: ${currentOwnerId}, groupId: ${groupId})`
        );
        throw new Error("Current user is not the Owner of this group");
      }

      // Find new owner's role
      const newOwnerRole = await this.userGroupRoleRepository.findOne({
        where: {
          user: { id: newOwnerId },
          group: { id: groupId },
        },
      });

      if (!newOwnerRole) {
        Logger.error(
          `Transfer ownership error: New owner is not a member of this group (userId: ${newOwnerId}, groupId: ${groupId})`
        );
        throw new Error("New owner is not a member of this group");
      }

      // Get Owner and Admin roles
      const ownerRole = await this.roleRepository.findOne({
        where: { name: "Owner" },
      });
      const adminRole = await this.roleRepository.findOne({
        where: { name: "Admin" },
      });

      if (!ownerRole || !adminRole) {
        Logger.error("Transfer ownership error: Required roles not found");
        throw new Error("Required roles not found");
      }

      // Transfer ownership (using transaction)
      const entityManager = this.userGroupRoleRepository.manager;
      await entityManager.transaction(async (transactionalEntityManager) => {
        // Demote current owner to admin
        currentOwnerRole.role = adminRole;
        await transactionalEntityManager.save(currentOwnerRole);

        // Promote new user to owner
        newOwnerRole.role = ownerRole;
        await transactionalEntityManager.save(newOwnerRole);
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Transfer ownership error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Transfer ownership error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getRoles() {
    try {
      return this.roleRepository.find({ order: { name: "ASC" } });
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get roles error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get roles error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }

  async getGroupPermissions(groupId: number) {
    try {
      // This would return permissions configured for the group
      // For simplicity, we're just returning basic info for now
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
      });

      if (!group) {
        Logger.error(
          `Get group permissions error: Group not found (id: ${groupId})`
        );
        throw new Error("Group not found");
      }

      // In a real implementation, you might have group-specific permission settings
      return {
        message: "Group permissions retrieved successfully",
        groupId,
      };
    } catch (error) {
      if (error instanceof Error) {
        Logger.error(`Get group permissions error: ${error.message}`);
        throw new Error(error.message);
      } else {
        Logger.error("Get group permissions error: An unknown error occurred");
        throw new Error("An unknown error occurred");
      }
    }
  }
}

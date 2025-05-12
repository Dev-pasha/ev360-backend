import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { GroupService } from "../services/group.service";
import { PermissionService } from "../services/permission.service";
// import { Request } from '../middleware/auth.middleware';
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class GroupController {
  private groupService: GroupService;
  private permissionService: PermissionService;

  constructor() {
    this.groupService = new GroupService();
    this.permissionService = new PermissionService();
  }

  CreateGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Group creation failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { name, description, logo, templateId } = req.body;

      // Create group
      const group = await this.groupService.createGroup(req.user.id, {
        name,
        description,
        logo,
        templateId,
      });

      res.status(201).json(
        successResponse({
          message: "Group created successfully",
          group,
        })
      );
    } catch (error) {
      Logger.error("Error in group creation: ", error);
      res.status(400).json(errorResponse("Group creation failed", 400, error));
    }
  };

  GetUserGroups = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      // Get user's groups
      const groups = await this.groupService.getUserGroups(req.user.id);

      res.json(
        successResponse({
          message: "Groups retrieved successfully",
          groups,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving user groups: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to retrieve groups", 500, error));
    }
  };

  GetGroupById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Get group
      const group = await this.groupService.getGroupById(parseInt(id));

      res.json(
        successResponse({
          message: "Group retrieved successfully",
          group,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving group: ", error);
      res.status(404).json(errorResponse("Group not found", 404, error));
    }
  };

  UpdateGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Group update failed", 400, errors));
        return;
      }

      console.log("Update group request body: ", req);
      const { groupId } = req.params;
      const { name, description, logo, isActive } = req.body;

      // Update group
      const group = await this.groupService.updateGroup(parseInt(groupId), {
        name,
        description,
        // logo,
        isActive,
      });

      res.json(
        successResponse({
          message: "Group updated successfully",
          group,
        })
      );
    } catch (error) {
      Logger.error("Error in updating group: ", error);
      res.status(400).json(errorResponse("Group update failed", 400, error));
    }
  };

  AddUserToGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Failed to add user to group", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { email, roleId } = req.body;

      // Add user to group
      const result = await this.groupService.addUserToGroup(parseInt(groupId), {
        email,
        roleId,
      });

      res.json(
        successResponse({
          message: "User added to group successfully",
          result,
        })
      );
    } catch (error) {
      Logger.error("Error in adding user to group: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to add user to group", 400, error));
    }
  };

  RemoveUserFromGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Remove user from group request: ", req.params);
      const { groupId, userId } = req.params;

      // Remove user from group
      await this.groupService.removeUserFromGroup(
        parseInt(groupId),
        parseInt(userId)
      );

      res.json(successResponse("User removed from group successfully"));
    } catch (error) {
      Logger.error("Error in removing user from group: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to remove user from group", 400, error));
    }
  };

  GetGroupUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;

      // Get group users
      const users = await this.groupService.getGroupUsers(parseInt(groupId));

      res.json(
        successResponse({
          message: "Group users retrieved successfully",
          users,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving group users: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to retrieve group users", 500, error));
    }
  };

  TransferOwnership = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Ownership transfer failed", 400, errors));
        return;
      }

      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { id } = req.params;
      const { newOwnerId } = req.body;

      // Transfer ownership
      await this.groupService.transferOwnership(
        parseInt(id),
        req.user.id,
        parseInt(newOwnerId)
      );

      res.json(successResponse("Ownership transferred successfully"));
    } catch (error) {
      Logger.error("Error in transferring ownership: ", error);
      res
        .status(400)
        .json(errorResponse("Ownership transfer failed", 400, error));
    }
  };

  GetRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get roles
      const roles = await this.groupService.getRoles();

      res.json(
        successResponse({
          message: "Roles retrieved successfully",
          roles,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving roles: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to retrieve roles", 500, error));
    }
  };

  GetUserPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      // Get user's permissions
      const permissions =
        await this.permissionService.getUserRolesAndPermissions(req.user.id);

      res.json(
        successResponse({
          message: "User permissions retrieved successfully",
          permissions,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving user permissions: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to retrieve user permissions", 500, error));
    }
  };

  GetGroupPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;

      // Get group permissions
      const permissions = await this.groupService.getGroupPermissions(
        parseInt(groupId)
      );

      res.json(
        successResponse({
          message: "Group permissions retrieved successfully",
          permissions,
        })
      );
    } catch (error) {
      Logger.error("Error in retrieving group permissions: ", error);
      res
        .status(500)
        .json(
          errorResponse("Failed to retrieve group permissions", 500, error)
        );
    }
  };


  DeleteGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Delete group request: ", req.query);
      const { groupId } = req.query;

      // Delete group
      await this.groupService.deleteGroup(
        groupId ? parseInt(groupId as string) : 0
      );

      res.json(successResponse("Group deleted successfully"));
    } catch (error) {
      Logger.error("Error in deleting group: ", error);
      res.status(400).json(errorResponse("Group deletion failed", 400, error));
    }
  };
}

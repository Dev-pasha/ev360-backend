import { RequestHandler, Router } from "express";
import { body, param } from "express-validator";
import { GroupController } from "../controllers/group.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const authController = new GroupController();

/**
 * @route   POST /api/v1/group
 * @desc    Create a new group
 * @access  Public
 */

router.post(
  "/",
  [body("name").notEmpty().withMessage("Group name is required")],
  authMiddleware,
  authController.CreateGroup
);

/**
 * @route   GET /api/v1/user/groups
 * @desc    Get user's groups
 * @access  Private
 */

router.get("/user", authMiddleware, authController.GetUserGroups);

/**
 * @route   PUT /api/v1/group/:groupId
 * @desc    Update group
 * @access  Private
 */

router.put(
  "/:groupId",
  authMiddleware,
  [
    requirePermission("manage_group_settings") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  authController.UpdateGroup
);

// Add user to group

/**
 * @route   POST /api/v1/group/:id/user
 * @desc    Add user to group
 * @access  Private
 *
 */

router.post(
  "/:groupId/user",
  authMiddleware,
  [
    requirePermission("invite_users") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("roleId").isInt().withMessage("Role ID must be an integer"),
  ],
  authController.AddUserToGroup
);

// Remove user from group

/**
 * @route   DELETE /api/v1/group/:id/user/:userId
 * @desc    Remove user from group
 * @access  Private
 */

router.delete(
  "/:groupId/user/:userId",
  authMiddleware,
  [
    requirePermission("invite_users") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    param("userId").isInt().withMessage("User ID must be an integer"),
  ],
  authController.RemoveUserFromGroup
);

// Get group users

/**
 * @route   GET /api/v1/group/:id/users
 * @desc    Get group users
 * @access  Private
 */

router.get(
  "/:groupId/users",
  authMiddleware,
  [
    requirePermission("invite_users") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
  ],
  authController.GetGroupUsers
);

// Transfer ownership

/**
 * @route   POST /api/v1/group/:id/transfer-ownership
 * @desc    Transfer ownership of group
 * @access  Private
 */

router.post(
  "/:groupId/transfer-ownership",
  authMiddleware,
  [
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    body("newOwnerId").isInt().withMessage("New owner ID must be an integer"),
  ],
  authController.TransferOwnership
);

/**
 * @route   GET /api/v1/roles
 * @desc    Get roles
 * @access  Private
 */

router.get("/roles", authMiddleware, authController.GetRoles);

// Get user permissions

/**
 * @route   GET /api/v1/group/user/permissions
 * @desc    Get user permissions in group
 * @access  Private
 */

router.get(
  "/:groupId/user/permissions",
  authMiddleware,
  authController.GetUserPermissions
);

// Get group permissions

/**
 * @route   GET /api/v1/group/:id/permissions
 * @desc    Get group permissions
 * @access  Private
 */

// router.get(
//   "/:groupId/permissions",
//   authMiddleware,
//   [
//     requirePermission("manage_group_settings") as RequestHandler,
//     param("groupId").isInt().withMessage("Group ID must be an integer"),
//   ],

//   authController.GetGroupPermissions
// );

export default router;

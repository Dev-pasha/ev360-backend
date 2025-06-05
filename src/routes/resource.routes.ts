import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { ResourceController } from "../controllers/resource.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const resourceController = new ResourceController();

/**
 * @route   POST /api/v1/resources/:groupId
 * @desc    Create a new resource
 * @access  Private
 */
router.post(
  "/:groupId",
  authMiddleware,
  // requirePermission("manage_resources") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("name")
      .notEmpty()
      .isString()
      .withMessage("Resource name is required"),
    body("link")
      .notEmpty()
      .isString()
      .withMessage("Resource link is required"),
    body("type")
      .notEmpty()
      .isInt({ min: 1, max: 3 })
      .withMessage("Resource type must be between 1 and 3"),
  ],
  resourceController.createResource
);

/**
 * @route   GET /api/v1/resources/:groupId
 * @desc    Get all resources for a group
 * @access  Private
 */
router.get(
  "/:groupId",
  authMiddleware,
  // requirePermission("view_resources") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  resourceController.getGroupResources
);

/**
 * @route   GET /api/v1/resources/:groupId/:resourceId
 * @desc    Get a resource by ID
 * @access  Private
 */
router.get(
  "/:groupId/:resourceId",
  authMiddleware,
  // requirePermission("view_resources") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("resourceId")
      .notEmpty()
      .isInt()
      .withMessage("Resource ID must be an integer"),
  ],
  resourceController.getResource
);

/**
 * @route   PUT /api/v1/resources/:groupId/:resourceId
 * @desc    Update a resource
 * @access  Private
 */
router.put(
  "/:groupId/:resourceId",
  authMiddleware,
  // requirePermission("manage_resources") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("resourceId")
      .notEmpty()
      .isInt()
      .withMessage("Resource ID must be an integer"),
    body("name")
      .optional()
      .isString()
      .withMessage("Resource name must be a string"),
    body("link")
      .optional()
      .isString()
      .withMessage("Resource link must be a string"),
    body("type")
      .optional()
      .isInt({ min: 1, max: 3 })
      .withMessage("Resource type must be between 1 and 3"),
    body("visibilities")
      .optional()
      .isArray()
      .withMessage("Visibilities must be an array"),
  ],
  resourceController.updateResource
);

/**
 * @route   DELETE /api/v1/resources/:groupId/:resourceId
 * @desc    Delete a resource
 * @access  Private
 */
router.delete(
  "/:groupId/:resourceId",
  authMiddleware,
  // requirePermission("manage_resources") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("resourceId")
      .notEmpty()
      .isInt()
      .withMessage("Resource ID must be an integer"),
  ],
  resourceController.deleteResource
);

/**
 * @route   GET /api/v1/resources/:groupId/player/:playerId
 * @desc    Get resources visible to a player
 * @access  Private
 */
router.get(
  "/:groupId/player/:playerId",
  authMiddleware,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("playerId")
      .notEmpty()
      .isInt()
      .withMessage("Player ID must be an integer"),
  ],
  resourceController.getPlayerResources
);

export default router;
import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { PlayerController } from "../controllers/player.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { canAddPlayerToGroupMiddleware } from "../middleware/subscription.middleware";

const router = Router();
const playerController = new PlayerController();

/**
 * @route   POST /api/v1/player-group/:groupId
 * @desc    Create a new player
 * @access  Public
 */

router.post(
  "/:groupId",
  authMiddleware,
  requirePermission("create_players") as RequestHandler,
  // canAddPlayerToGroupMiddleware,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],

  playerController.CreatePlayer
);

/**
 * @route   GET /api/v1/player-group/:groupId
 * @desc    Get players by group ID
 * @access  Private
 */

router.get(
  "/:groupId",
  authMiddleware,
  requirePermission("view_players") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  playerController.GetPlayers
);

/**
 * @route   PUT /api/v1/player-group/:groupId
 * @desc    Update Player
 * @access  Private
 *
 */

router.put(
  "/:groupId",
  authMiddleware,
  requirePermission("view_players") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
    query("playerId")
      .optional()
      .isInt()
      .withMessage("Player ID must be an integer"),
  ],
  playerController.UpdatePlayer
);

/**
 * @route   DELETE /api/v1/player-group/:groupId
 * @desc    Delete player by ID
 * @access  Private
 *
 */
router.delete(
  "/:groupId",
  authMiddleware,
  requirePermission("delete_players") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
    query("playerId")
      .optional()
      .isInt()
      .withMessage("Player ID must be an integer"),
  ],
  playerController.DeletePlayer
);

/**
 * @route   GET /api/v1/player-group/player/:groupId
 * @desc    Get player by ID
 * @access  Private
 *
 */

router.get(
  "/player/:groupId",
  authMiddleware,
  requirePermission("view_players") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
    query("playerId")
      .optional()
      .isInt()
      .withMessage("Player ID must be an integer"),
  ],
  playerController.GetPlayerById
);

/**
 * @route   POST /api/v1/player-group/create-account
 * @desc    Assign player to a group
 * @access  Private
 *
 */

router.post(
  "/create-account/:token",
  [
    param("token").notEmpty().withMessage("Token is required"),
    body("password").notEmpty(),
  ],
  playerController.CreatePlayerAccount
);

/**
 * @route   GET /api/v1/player-group/:groupId/categories
 * @desc    Get categories by group ID
 * @access  Private
 *
 */
router.get(
  "/:groupId/categories",
  authMiddleware,
  requirePermission("view_players") as RequestHandler,
  [
    param("groupId")
      .optional()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  playerController.GetCategoriesByGroup
);

export default router;

// player-list.routes.ts
import { RequestHandler, Router } from "express";
import { body, param } from "express-validator";
import { PlayerListController } from "../controllers/player-list.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const playerListController = new PlayerListController();

/**
 * @route   POST /api/v1/player-list/:groupId
 * @desc    Create a new player list
 * @access  Private
 */
router.post(
  "/:groupId",
  authMiddleware,
  // requirePermission("manage_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("name")
      .notEmpty()
      .isString()
      .trim()
      .withMessage("List name is required"),
  ],
  playerListController.createPlayerList
);

/**
 * @route   GET /api/v1/player-list/:groupId
 * @desc    Get all player lists for a group
 * @access  Private
 */
router.get(
  "/:groupId",
  authMiddleware,
  // requirePermission("view_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  playerListController.getPlayerLists
);

/**
 * @route   GET /api/v1/player-list/:groupId/:listId
 * @desc    Get a specific player list with players
 * @access  Private
 */
router.get(
  "/:groupId/:listId",
  authMiddleware,
  // requirePermission("view_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("listId")
      .notEmpty()
      .isInt()
      .withMessage("List ID must be an integer"),
  ],
  playerListController.getPlayerListById
);

/**
 * @route   PUT /api/v1/player-list/:groupId/:listId
 * @desc    Update a player list
 * @access  Private
 */
router.put(
  "/:groupId/:listId",
  authMiddleware,
  // requirePermission("manage_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("listId")
      .notEmpty()
      .isInt()
      .withMessage("List ID must be an integer"),
    body("name")
      .notEmpty()
      .isString()
      .trim()
      .withMessage("List name is required"),
  ],
  playerListController.updatePlayerList
);

/**
 * @route   DELETE /api/v1/player-list/:groupId/:listId
 * @desc    Delete a player list
 * @access  Private
 */
router.delete(
  "/:groupId/:listId",
  authMiddleware,
  // requirePermission("manage_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("listId")
      .notEmpty()
      .isInt()
      .withMessage("List ID must be an integer"),
  ],
  playerListController.deletePlayerList
);

/**
 * @route   POST /api/v1/player-list/:groupId/:listId/players
 * @desc    Manage players in a list (add/remove)
 * @access  Private
 */
router.post(
  "/:groupId/:listId/players",
  authMiddleware,
  // requirePermission("manage_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("listId")
      .notEmpty()
      .isInt()
      .withMessage("List ID must be an integer"),
    body("action")
      .notEmpty()
      .isIn(["add", "remove"])
      .withMessage("Action must be 'add' or 'remove'"),
    body("playerIds")
      .notEmpty()
      .custom((value) => {
        if (Array.isArray(value) && value.every((id) => Number.isInteger(id))) {
          return true;
        }
        if (Number.isInteger(value)) {
          return true;
        }
        return false;
      })
      .withMessage("Player IDs must be an integer or array of integers"),
  ],
  playerListController.manageListPlayers
);

/**
 * @route   GET /api/v1/player-list/:groupId/player/:playerId
 * @desc    Get lists containing a specific player
 * @access  Private
 */
router.get(
  "/:groupId/player/:playerId",
  authMiddleware,
  // requirePermission("view_player_lists") as RequestHandler,
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
  playerListController.getPlayerListsByPlayer
);


/**
 * @route   GET /api/v1/player-list/:groupId/attributes
 * @desc    Get player attributes for a group
 * @access  Private
 */

router.get(
  "/:groupId/filter/attributes",
  authMiddleware,
  // requirePermission("view_player_lists") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  playerListController.getAttributesGroupId
);

export default router;

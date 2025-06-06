import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { TeamController } from "../controllers/team.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const teamController = new TeamController();

/**
 * @route   POST /api/v1/team/:groupId
 * @desc    Create a new team
 * @access  Private
 */
router.post(
  "/:groupId",
  authMiddleware,
  // requirePermission("create_teams") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("teamData")
      .notEmpty()
      .isObject()
      .withMessage("Team data is required"),
    body("teamData.name")
      .notEmpty()
      .isString()
      .withMessage("Team name is required"),
  ],
  teamController.createTeam
);

/**
 * @route   GET /api/v1/team/:groupId
 * @desc    Get teams (all teams, single team, with player count, or with players)
 * @access  Private
 */
router.get(
  "/:groupId",
  authMiddleware,
  // requirePermission("view_teams") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    query("teamId")
      .optional()
      .isInt()
      .withMessage("Team ID must be an integer"),
    query("includePlayerCount")
      .optional()
      .isBoolean()
      .withMessage("Include player count must be a boolean"),
    query("includePlayers")
      .optional()
      .isBoolean()
      .withMessage("Include players must be a boolean"),
  ],
  teamController.getTeams
);

/**
 * @route   PUT /api/v1/team/:groupId/:teamId
 * @desc    Update team
 * @access  Private
 */
router.put(
  "/:groupId/:teamId",
  authMiddleware,
  // requirePermission("update_teams") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("teamId")
      .notEmpty()
      .isInt()
      .withMessage("Team ID must be an integer"),
    body("teamData")
      .notEmpty()
      .isObject()
      .withMessage("Team data is required"),
  ],
  teamController.updateTeam
);

/**
 * @route   DELETE /api/v1/team/:groupId/:teamId
 * @desc    Delete team
 * @access  Private
 */
router.delete(
  "/:groupId/:teamId",
  authMiddleware,
  // requirePermission("delete_teams") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("teamId")
      .notEmpty()
      .isInt()
      .withMessage("Team ID must be an integer"),
  ],
  teamController.deleteTeam
);

/**
 * @route   POST /api/v1/team/:groupId/players
 * @desc    Manage team players (add, remove, or move)
 * @access  Private
 */
router.post(
  "/:groupId/players",
  authMiddleware,
  // requirePermission("manage_team_players") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("action")
      .notEmpty()
      .isIn(["add", "remove", "move"])
      .withMessage("Action must be 'add', 'remove', or 'move'"),
    body("playerIds")
      .notEmpty()
      .isArray()
      .withMessage("Player IDs must be an array"),
    body("playerIds.*")
      .isInt()
      .withMessage("Each player ID must be an integer"),
    body("teamId")
      .if(body("action").isIn(["add", "remove"]))
      .notEmpty()
      .isInt()
      .withMessage("Team ID is required for add/remove actions"),
    body("fromTeamId")
      .if(body("action").equals("move"))
      .notEmpty()
      .isInt()
      .withMessage("From Team ID is required for move action"),
    body("toTeamId")
      .if(body("action").equals("move"))
      .notEmpty()
      .isInt()
      .withMessage("To Team ID is required for move action"),
  ],
  teamController.manageTeamPlayers
);

/**
 * @route   GET /api/v1/team/:groupId/:teamId/players
 * @desc    Get players for a specific team
 * @access  Private
 */
router.get(
  "/:groupId/:teamId/players",
  authMiddleware,
  // requirePermission("view_teams") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("teamId")
      .notEmpty()
      .isInt()
      .withMessage("Team ID must be an integer"),
  ],
  teamController.getTeamPlayers
);


/**
 * @route   GET /api/v1/team/:groupId/available-players
 * @desc    Get available players for a group
 * @access  Private
 */
router.get(
  "/:groupId/available-players",
  authMiddleware,
  // requirePermission("view_teams") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
  ],
  teamController.getAvailablePlayers
);

/**
 * @route   GET /api/v1/team/:groupId/:teamId/export
 * @desc    Export team data
 */
router.get(
  "/:groupId/:teamId/export",
  authMiddleware,
  // requirePermission("view_teams") as RequestHandler,
  [
    param("groupId").notEmpty().isInt(),
    param("teamId").notEmpty().isInt(),
    query("format").isIn(["csv", "excel"]).withMessage("Format must be csv or excel"),
  ],
  teamController.exportTeam  // <- Need to implement this method
);


export default router;
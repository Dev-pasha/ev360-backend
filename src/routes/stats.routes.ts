import { RequestHandler, Router } from "express";
import { param, query } from "express-validator";
import { StatsController } from "../controllers/stats.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const statsController = new StatsController();

/**
 * @route   GET /api/v1/stats/group/:groupId/overview
 * @desc    Get group overview stats (total players, teams, events, subscription)
 * @access  Private
 */
router.get(
  "/group/:groupId/overview",
  authMiddleware,
  [
    // requirePermission("view_group_stats") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("dateRange").optional().isIn(['last30days', 'last3months', 'lastyear', 'custom']).withMessage("Invalid date range"),
    query("startDate").optional().isISO8601().withMessage("Start date must be valid ISO date"),
    query("endDate").optional().isISO8601().withMessage("End date must be valid ISO date"),
  ],
  statsController.GetGroupOverviewStats
);

/**
 * @route   GET /api/v1/stats/group/:groupId/demographics
 * @desc    Get group player demographics stats
 * @access  Private
 */
router.get(
  "/group/:groupId/demographics",
  authMiddleware,
  [
    // requirePermission("view_group_stats") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("includeArchived").optional().isBoolean().withMessage("Include archived must be boolean"),
  ],
  statsController.GetGroupDemographics
);

/**
 * @route   GET /api/v1/stats/group/:groupId/activity
 * @desc    Get group activity stats
 * @access  Private
 */
router.get(
  "/group/:groupId/activity",
  authMiddleware,
  [
    // requirePermission("view_group_stats") as RequestHandler,
    param("groupId").isInt().withMessage("Group ID must be an integer"),
    query("dateRange").optional().isIn(['last30days', 'last3months', 'lastyear']).withMessage("Invalid date range"),
  ],
  statsController.GetGroupActivityStats
);

/**
 * @route   GET /api/v1/stats/team/:teamId/overview
 * @desc    Get team overview stats
 * @access  Private
 */
router.get(
  "/team/:teamId/overview",
  authMiddleware,
  [
    // requirePermission("view_team_stats") as RequestHandler,
    param("teamId").isInt().withMessage("Team ID must be an integer"),
  ],
  statsController.GetTeamOverviewStats
);

/**
 * @route   GET /api/v1/stats/system/health
 * @desc    Get system-wide stats (for admin dashboard)
 * @access  Private
 */
router.get(
  "/system/health",
  authMiddleware,
  [
    // requirePermission("view_system_stats") as RequestHandler,
  ],
  statsController.GetSystemHealthStats
);

export default router;
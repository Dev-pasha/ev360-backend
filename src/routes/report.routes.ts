import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { ReportController } from "../controllers/report.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const reportController = new ReportController();

/**
 * @route   POST /api/v1/reports/:groupId/all-score
 * @desc    Generate All Score Report
 * @access  Private
 */
router.post(
  "/:groupId/all-score",
  authMiddleware,
  requirePermission("generate_reports") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    body("event_ids")
      .notEmpty()
      .isArray()
      .withMessage("event_ids is required and must be an array"),
  ],
  reportController.generateAllScoreReport
);

/**
 * @route   POST /api/v1/reports/individual
 * @desc    Generate Individual Report
 * @access  Private
 */

router.post(
  "/individual",
  authMiddleware,
  requirePermission("generate_reports") as RequestHandler,
  [param("groupId")],
  reportController.createIndividualReport
);

/**
 * @route   GET /api/v1/reports/:groupId/self-assessment/:eventId
 * @desc    Get Self Assessment Report for a specific event
 * @access  Private
 */
router.get(
  "/:groupId/self-assessment/:eventId",
  authMiddleware,
  requirePermission("view_reports") as RequestHandler,
  [
    param("groupId")
      .notEmpty()
      .isInt()
      .withMessage("Group ID must be an integer"),
    param("eventId")
      .notEmpty()
      .isInt()
      .withMessage("Event ID must be an integer"),
  ],
  reportController.getSelfAssessmentReport
);

router.get(
  "/:groupId/self-assessment/:eventId/players/:playerId",
  [
    param("groupId")
      .isInt({ min: 1 })
      .withMessage("Group ID must be a positive integer"),
    param("eventId")
      .isInt({ min: 1 })
      .withMessage("Event ID must be a positive integer"),
    param("playerId")
      .isInt({ min: 1 })
      .withMessage("Player ID must be a positive integer"),
  ],
  reportController.getPlayerSelfAssessmentDetail
);

export default router;

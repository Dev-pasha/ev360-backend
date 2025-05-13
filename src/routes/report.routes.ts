import { RequestHandler, Router } from "express";
import { body, param, query } from "express-validator";
import { ReportController } from "../controllers/report.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const reportController = new ReportController();

/**
 * @route   POST /api/v1/reports/all-score
 * @desc    Generate All Score Report
 * @access  Private
 */
router.post(
  "/all-score",
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
    body("evaluator_ids")
      .notEmpty()
      .isArray()
      .withMessage("evaluator_ids is required and must be an array"),
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

export default router;

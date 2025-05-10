import { Router } from "express";
import { EvaluationTemplateController } from "../controllers/evaluation-template.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body, param } from "express-validator";

const router = Router();
const evaluationTemplateController = new EvaluationTemplateController();


/**
 * @route   GET /api/v1/evaluation-template
 * @desc    Get all evaluation templates
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  evaluationTemplateController.GetEvaluationTemplates
);

/**
 * @route   GET /api/v1/evaluation-template/:id
 * @desc    Get evaluation template by ID
 * @access  Private
 */

router.get(
  "/:id",
  authMiddleware,
  param("id").isNumeric().withMessage("ID must be a number"),
  evaluationTemplateController.GetEvaluationTemplateById
);


export default router;

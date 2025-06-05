import { RequestHandler, Router } from "express";
import { body } from "express-validator";
import { TrialExpirationController } from "../controllers/trial-expiration.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { saasOwnerAuthMiddleware, auditSaasOwnerAction, saasOwnerRateLimit } from "../middleware/saas-owner.middlware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();
const trialExpirationController = new TrialExpirationController();

/**
 * @route   GET /api/v1/trial-expiration/status
 * @desc    Get trial expiration job status and statistics
 * @access  SaaS Owner or Admin
 */
router.get(
  "/status",
  saasOwnerAuthMiddleware, // Use SaaS owner auth instead of regular auth
  saasOwnerRateLimit(30, 5), // 30 requests per 5 minutes for status checks
  auditSaasOwnerAction("view_trial_expiration_status"),
  trialExpirationController.GetJobStatus
);

/**
 * @route   POST /api/v1/trial-expiration/trigger
 * @desc    Manually trigger trial expiration processing
 * @access  SaaS Owner Only
 */
router.post(
  "/trigger",
  saasOwnerAuthMiddleware,
  saasOwnerRateLimit(10, 60), // 10 requests per hour for manual triggers
  auditSaasOwnerAction("trigger_trial_expiration"),
  [
    body("dryRun").optional().isBoolean().withMessage("Dry run must be a boolean"),
  ],
  trialExpirationController.TriggerManualProcessing
);

/**
 * @route   GET /api/v1/trial-expiration/stats
 * @desc    Get detailed trial expiration statistics
 * @access  SaaS Owner or Admin
 */
router.get(
  "/stats",
  saasOwnerAuthMiddleware,
  saasOwnerRateLimit(60, 10), // 60 requests per 10 minutes for stats
  auditSaasOwnerAction("view_trial_expiration_stats"),
  trialExpirationController.GetTrialStats
);

/**
 * @route   POST /api/v1/trial-expiration/process
 * @desc    Direct processing of expired trials (alternative to trigger)
 * @access  SaaS Owner Only
 */
router.post(
  "/process",
  saasOwnerAuthMiddleware,
  saasOwnerRateLimit(5, 60), // 5 requests per hour for direct processing
  auditSaasOwnerAction("process_expired_trials"),
  trialExpirationController.ProcessExpiredTrials
);

/**
 * @route   GET /api/v1/trial-expiration/health
 * @desc    Simple health check for trial expiration system
 * @access  SaaS Owner
 */
router.get(
  "/health",
  saasOwnerAuthMiddleware,
  saasOwnerRateLimit(100, 5), // 100 requests per 5 minutes for health checks
  trialExpirationController.HealthCheck
);

export default router;

import { Router, RequestHandler } from "express";
import { body, param } from "express-validator";
import { SubscriptionController } from "../controllers/subscription.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { BillingCycle } from "../entities/subscription-plan.entity";
import { SubscriptionStatus } from "../entities/subscription.entity";

const router = Router();
const subscriptionController = new SubscriptionController();

/**
 * @route   POST /api/v1/subscriptions/plans
 * @desc    Create a new subscription plan
 * @access  Admin
 */
router.post(
  "/plans",
  authMiddleware,
  requirePermission("manage_billing") as RequestHandler,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("price")
      .isNumeric()
      .withMessage("Price must be a number"),
    body("billing_cycle")
      .isIn(Object.values(BillingCycle))
      .withMessage("Invalid billing cycle"),
    body("max_groups")
      .isInt({ min: 1 })
      .withMessage("Max groups must be a positive integer"),
    body("max_users_per_group")
      .isInt({ min: 1 })
      .withMessage("Max users per group must be a positive integer"),
    body("max_players_per_group")
      .isInt({ min: 1 })
      .withMessage("Max players per group must be a positive integer")
  ],
  subscriptionController.createPlan
);

/**
 * @route   POST /api/v1/subscriptions
 * @desc    Subscribe a user to a plan
 * @access  Admin
 */
router.post(
  "/",
  authMiddleware,
  requirePermission("manage_billing") as RequestHandler,
  [
    body("user_id")
      .isInt()
      .withMessage("User ID must be an integer"),
    body("plan_id")
      .isInt()
      .withMessage("Plan ID must be an integer"),
    body("trial_days")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Trial days must be a non-negative integer")
  ],
  subscriptionController.createSubscription
);

/**
 * @route   POST /api/v1/subscriptions/:id/invoice
 * @desc    Generate an invoice for a subscription
 * @access  Admin
 */
router.post(
  "/:id/invoice",
  authMiddleware,
  requirePermission("manage_billing") as RequestHandler,
  [
    param("id")
      .isInt()
      .withMessage("Subscription ID must be an integer"),
    body("due_date_days")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Due date days must be a positive integer"),
    body("tax_percent")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Tax percent must be between 0 and 100")
  ],
  subscriptionController.generateInvoice
);

/**
 * @route   PATCH /api/v1/subscriptions/:id/status
 * @desc    Update subscription status
 * @access  Admin
 */
router.patch(
  "/:id/status",
  authMiddleware,
  requirePermission("manage_billing") as RequestHandler,
  [
    param("id")
      .isInt()
      .withMessage("Subscription ID must be an integer"),
    body("status")
      .isIn(Object.values(SubscriptionStatus))
      .withMessage("Invalid subscription status")
  ],
  subscriptionController.updateStatus
);

export default router;
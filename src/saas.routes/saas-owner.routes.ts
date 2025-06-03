import { Router, RequestHandler } from "express";
import { body, param, query } from "express-validator";
import { SaasOwnerController } from "../controllers/saas.owner.controller";
import {
  saasOwnerAuthMiddleware,
  preventDuplicateSaasOwner,
  auditSaasOwnerAction,
  saasOwnerRateLimit,
} from "../middleware/saas-owner.middlware";
import { AdminController } from "../controllers/admin.dashboard.controller";
import Logger from "../config/logger";

const router = Router();
const saasOwnerController = new SaasOwnerController();
const adminController = new AdminController();

/**
 * BOOTSTRAP ROUTES (No authentication required)
 */

/**
 * @route   GET /api/v1/bootstrap/check
 * @desc    Check if SaaS owner exists (for frontend routing)
 * @access  Public
 */
router.get("/bootstrap/check", saasOwnerController.checkSaasOwnerExists);

/**
 * @route   POST /api/v1/bootstrap/create-saas-owner
 * @desc    Create the first SaaS owner (bootstrap)
 * @access  Public (only if no SaaS owner exists)
 */
router.post(
  "/bootstrap/create-saas-owner",
  preventDuplicateSaasOwner,
  saasOwnerRateLimit(3, 60), // 3 attempts per hour
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("First name must be between 1 and 100 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Last name must be between 1 and 100 characters"),
    body("companyName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Company name must be between 1 and 200 characters"),
  ],
  saasOwnerController.createSaasOwner
);

/**
 * AUTHENTICATION ROUTES (No auth middleware needed)
 */

/**
 * @route   POST /api/v1/saas/auth/login
 * @desc    SaaS owner login
 * @access  Public
 */
router.post(
  "/saas/auth/login",
  saasOwnerRateLimit(5, 15), // 5 login attempts per 15 minutes
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  saasOwnerController.login
);

/**
 * @route   POST /api/v1/saas/forgot-password
 * @desc    Request password reset token
 * @access  Public
 */
router.post(
  "/saas/forgot-password",
  saasOwnerRateLimit(3, 60), // 3 requests per hour
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
  ],
  saasOwnerController.forgotPassword
);

/**
 * @route   POST /api/v1/saas/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  "/saas/reset-password",
  saasOwnerRateLimit(3, 60), // 3 reset attempts per hour
  [
    body("token")
      .notEmpty()
      .isLength({ min: 64, max: 64 })
      .withMessage("Valid reset token is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
  ],
  saasOwnerController.resetPassword
);

/**
 * AUTHENTICATED ROUTES (Require SaaS owner authentication)
 */

// Apply authentication middleware to all routes below
router.use("/saas", saasOwnerAuthMiddleware);

/**
 * @route   GET /api/v1/saas/profile
 * @desc    Get SaaS owner profile
 * @access  SaaS Owner
 */
router.get(
  "/saas/profile",
  auditSaasOwnerAction("view_profile"),
  saasOwnerController.getProfile
);

/**
 * @route   PATCH /api/v1/saas/profile
 * @desc    Update SaaS owner profile
 * @access  SaaS Owner
 */
router.patch(
  "/saas/profile",
  auditSaasOwnerAction("update_profile"),
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("First name must be between 1 and 100 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Last name must be between 1 and 100 characters"),
    body("companyName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Company name must be between 1 and 200 characters"),
  ],
  saasOwnerController.updateProfile
);

/**
 * @route   POST /api/v1/saas/change-password
 * @desc    Change SaaS owner password
 * @access  SaaS Owner
 */
router.post(
  "/saas/change-password",
  auditSaasOwnerAction("change_password"),
  saasOwnerRateLimit(5, 60), // 5 password changes per hour
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      ),
    body("newPassword").custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),
  ],
  saasOwnerController.changePassword
);

/**
 * @route   GET /api/v1/saas/stats
 * @desc    Get SaaS owner account statistics
 * @access  SaaS Owner
 */
router.get(
  "/saas/stats",
  auditSaasOwnerAction("view_account_stats"),
  saasOwnerController.getAccountStats
);

/**
 * @route   POST /api/v1/saas/logout
 * @desc    SaaS owner logout
 * @access  SaaS Owner
 */
router.post(
  "/saas/logout",
  auditSaasOwnerAction("logout"),
  saasOwnerController.logout
);

/**
 * BUSINESS MANAGEMENT ROUTES
 * These will integrate with your existing admin routes
 */

/**
 * @route   GET /api/v1/saas/dashboard
 * @desc    Get business dashboard overview
 * @access  SaaS Owner
 */
router.get(
  "/saas/dashboard",
  auditSaasOwnerAction("view_dashboard"),
  saasOwnerRateLimit(60, 60), // 60 requests per hour for dashboard
  adminController.getDashboard
);

/**
 * @route   GET /api/v1/saas/customers
 * @desc    Get all customers
 * @access  SaaS Owner
 */
router.get(
  "/saas/customers",
  auditSaasOwnerAction("view_customers"),
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("search")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Search term must be between 2 and 100 characters"),
  ],
  adminController.getCustomers
);

/**
 * @route   GET /api/v1/saas/analytics
 * @desc    Get business analytics
 * @access  SaaS Owner
 */
router.get(
  "/saas/analytics",
  auditSaasOwnerAction("view_analytics"),
  [
    query("type")
      .optional()
      .isIn(["revenue", "customers", "usage", "growth"])
      .withMessage("Invalid analytics type"),
    query("period")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Invalid period"),
  ],
  adminController.getRevenueAnalytics
);

/**
 * @route   GET /api/v1/saas/customers/at-risk
 * @desc    Get customers at risk of churn
 * @access  SaaS Owner
 */
router.get(
  "/saas/customers/at-risk",
  auditSaasOwnerAction("view_at_risk_customers"),
  saasOwnerRateLimit(30, 60), // 10 requests per hour for at-risk customers
  adminController.getCustomersAtRisk
);

/**
 * @route   GET /api/v1/saas/plans
 * @desc    Get all subscription plans with analytics
 * @access  SaaS Owner
 */
router.get(
  "/saas/plans",
  auditSaasOwnerAction("view_plans"),
  adminController.getPlans
);

/**
 * @route   GET /api/v1/saas/plans/:id
 * @desc    Get single plan with detailed analytics
 * @access  SaaS Owner
 */
router.get(
  "/saas/plans/:id",
  auditSaasOwnerAction("view_plan_details"),
  [param("id").isInt().withMessage("Plan ID must be an integer")],
  adminController.getPlanDetails
);

/**
 * @route   POST /api/v1/saas/plans
 * @desc    Create new subscription plan
 * @access  SaaS Owner
 */
router.post(
  "/saas/plans",
  auditSaasOwnerAction("create_plan"),
  saasOwnerRateLimit(10, 60), // 10 plan creations per hour
  [
    body("name")
      .notEmpty()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Plan name must be between 3 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("price")
      .isFloat({ min: 0, max: 100000 })
      .withMessage("Price must be between 0 and 100,000"),
    body("billing_cycle")
      .isIn(["monthly", "quarterly", "annual"])
      .withMessage("Invalid billing cycle"),
    body("max_groups")
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max groups must be between 1 and 10,000"),
    body("max_users_per_group")
      .isInt({ min: 1, max: 1000 })
      .withMessage("Max users per group must be between 1 and 1,000"),
    body("max_players_per_group")
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max players per group must be between 1 and 10,000"),
    body("is_custom")
      .optional()
      .isBoolean()
      .withMessage("Is custom must be a boolean"),
  ],
  adminController.createPlan
);

/**
 * @route   PATCH /api/v1/saas/plans/:id
 * @desc    Update existing subscription plan
 * @access  SaaS Owner
 */
router.patch(
  "/saas/plans/:id",
  auditSaasOwnerAction("update_plan"),
  saasOwnerRateLimit(20, 60), // 20 plan updates per hour
  [
    param("id").isInt().withMessage("Plan ID must be an integer"),
    body("name")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Plan name must be between 3 and 50 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("price")
      .optional()
      .isFloat({ min: 0, max: 100000 })
      .withMessage("Price must be between 0 and 100,000"),
    body("max_groups")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max groups must be between 1 and 10,000"),
    body("max_users_per_group")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Max users per group must be between 1 and 1,000"),
    body("max_players_per_group")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max players per group must be between 1 and 10,000"),
    body("is_active")
      .optional()
      .isBoolean()
      .withMessage("Is active must be a boolean"),
  ],
  adminController.updatePlan
);

/**
 * @route   DELETE /api/v1/saas/plans/:id
 * @desc    Deactivate subscription plan
 * @access  SaaS Owner
 */
router.delete(
  "/saas/plans/:id",
  auditSaasOwnerAction("deactivate_plan"),
  saasOwnerRateLimit(5, 60), // 5 plan deactivations per hour
  [param("id").isInt().withMessage("Plan ID must be an integer")],
  adminController.deactivatePlan
);

/**
 * CUSTOMER MANAGEMENT ROUTES
 */

/**
 * @route   GET /api/v1/saas/customers/:id
 * @desc    Get customer details
 * @access  SaaS Owner
 */

router.get(
  "/saas/customers/:id",
  auditSaasOwnerAction("view_customer_details"),
  saasOwnerRateLimit(30, 60), // 30 customer detail requests per hour
  [param("id").isInt().withMessage("Customer ID must be an integer")],
  adminController.getCustomerDetails
);


/**
 * @route   POST /api/v1/saas/customers/create
 * @desc    Create new customer account
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/create",
  auditSaasOwnerAction("create_customer"),
  saasOwnerRateLimit(50, 60), // 50 customer creations per hour
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("First name must be between 1 and 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name must be between 1 and 50 characters"),
    body("password")
      .optional()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must contain uppercase, lowercase, and number"),
    body("planId").optional().isInt().withMessage("Plan ID must be an integer"),
    body("trialDays")
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage("Trial days must be between 0 and 365"),
    body("sendWelcomeEmail")
      .optional()
      .isBoolean()
      .withMessage("Send welcome email must be a boolean"),
    body("customNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Custom notes cannot exceed 1000 characters"),
  ],
  adminController.createCustomer
);

/**
 * @route   POST /api/v1/saas/customers/:id/assign-plan
 * @desc    Assign subscription plan to existing customer
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/:id/assign-plan",
  auditSaasOwnerAction("assign_plan_to_customer"),
  saasOwnerRateLimit(100, 60), // 100 plan assignments per hour
  [
    param("id").isInt().withMessage("Customer ID must be an integer"),
    body("planId").isInt().withMessage("Plan ID must be an integer"),
    body("trialDays")
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage("Trial days must be between 0 and 365"),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be in ISO 8601 format"),
    body("customPricing")
      .optional()
      .isFloat({ min: 0, max: 100000 })
      .withMessage("Custom pricing must be between 0 and 100,000"),
    body("adminNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Admin notes cannot exceed 1000 characters"),
    body("cancelExisting")
      .optional()
      .isBoolean()
      .withMessage("Cancel existing must be a boolean"),
  ],
  adminController.assignPlanToCustomer
);

/**
 * @route   PATCH /api/v1/saas/customers/:id
 * @desc    Update customer details
 * @access  SaaS Owner
 */
router.patch(
  "/saas/customers/:id",
  auditSaasOwnerAction("update_customer"),
  saasOwnerRateLimit(100, 60), // 100 customer updates per hour
  [
    param("id").isInt().withMessage("Customer ID must be an integer"),
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("First name must be between 1 and 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name must be between 1 and 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("emailVerified")
      .optional()
      .isBoolean()
      .withMessage("Email verified must be a boolean"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be a boolean"),
  ],
  adminController.updateCustomer
);

/**
 * @route   POST /api/v1/saas/customers/:id/reset-password
 * @desc    Send password reset email to customer
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/:id/reset-password",
  auditSaasOwnerAction("send_customer_password_reset"),
  saasOwnerRateLimit(20, 60), // 20 password resets per hour
  [param("id").isInt().withMessage("Customer ID must be an integer")],
  adminController.sendCustomerPasswordReset
);

/**
 * @route   POST /api/v1/saas/customers/:id/deactivate
 * @desc    Deactivate customer account
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/:id/deactivate",
  auditSaasOwnerAction("deactivate_customer"),
  saasOwnerRateLimit(10, 60), // 10 deactivations per hour
  [
    param("id").isInt().withMessage("Customer ID must be an integer"),
    body("reason")
      .optional()
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage("Reason must be between 5 and 500 characters"),
  ],
  adminController.deactivateCustomer
);

/**
 * @route   POST /api/v1/saas/customers/:id/reactivate
 * @desc    Reactivate customer account
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/:id/reactivate",
  auditSaasOwnerAction("reactivate_customer"),
  saasOwnerRateLimit(10, 60), // 10 reactivations per hour
  [param("id").isInt().withMessage("Customer ID must be an integer")],
  adminController.reactivateCustomer
);

/**
 * CUSTOM PLAN MANAGEMENT ROUTES
 */

/**
 * @route   POST /api/v1/saas/customers/:id/create-custom-plan
 * @desc    Create custom plan for specific customer
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/:id/create-custom-plan",
  auditSaasOwnerAction("create_custom_plan"),
  saasOwnerRateLimit(20, 60), // 20 custom plans per hour
  [
    param("id").isInt().withMessage("Customer ID must be an integer"),
    body("planName")
      .notEmpty()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Plan name must be between 3 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("customPricing")
      .isFloat({ min: 0, max: 100000 })
      .withMessage("Custom pricing must be between 0 and 100,000"),
    body("billingCycle")
      .isIn(["monthly", "quarterly", "annual"])
      .withMessage("Invalid billing cycle"),
    body("customLimits")
      .isObject()
      .withMessage("Custom limits must be an object"),
    body("customLimits.maxGroups")
      .isInt({ min: 1, max: 50000 })
      .withMessage("Max groups must be between 1 and 50,000"),
    body("customLimits.maxUsersPerGroup")
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max users per group must be between 1 and 10,000"),
    body("customLimits.maxPlayersPerGroup")
      .isInt({ min: 1, max: 100000 })
      .withMessage("Max players per group must be between 1 and 100,000"),
    body("trialDays")
      .optional()
      .isInt({ min: 0, max: 365 })
      .withMessage("Trial days must be between 0 and 365"),
    body("adminNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Admin notes cannot exceed 1000 characters"),
    body("cancelExistingSubscription")
      .optional()
      .isBoolean()
      .withMessage("Cancel existing subscription must be a boolean"),
  ],
  adminController.createCustomPlanForCustomer
);

/**
 * @route   PATCH /api/v1/saas/plans/:id/modify-limits
 * @desc    Modify custom plan limits
 * @access  SaaS Owner
 */
router.patch(
  "/saas/plans/:id/modify-limits",
  auditSaasOwnerAction("modify_custom_plan_limits"),
  saasOwnerRateLimit(30, 60), // 30 modifications per hour
  [
    param("id").isInt().withMessage("Plan ID must be an integer"),
    body("newPricing")
      .optional()
      .isFloat({ min: 0, max: 100000 })
      .withMessage("New pricing must be between 0 and 100,000"),
    body("newLimits")
      .optional()
      .isObject()
      .withMessage("New limits must be an object"),
    body("newLimits.maxGroups")
      .optional()
      .isInt({ min: 1, max: 50000 })
      .withMessage("Max groups must be between 1 and 50,000"),
    body("newLimits.maxUsersPerGroup")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max users per group must be between 1 and 10,000"),
    body("newLimits.maxPlayersPerGroup")
      .optional()
      .isInt({ min: 1, max: 100000 })
      .withMessage("Max players per group must be between 1 and 100,000"),
    body("adminNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Admin notes cannot exceed 1000 characters"),
    body("applyImmediately")
      .optional()
      .isBoolean()
      .withMessage("Apply immediately must be a boolean"),
  ],
  adminController.modifyCustomPlanLimits
);

/**
 * @route   GET /api/v1/saas/plans/:id/custom-details
 * @desc    Get custom plan details with usage analytics
 * @access  SaaS Owner
 */
router.get(
  "/saas/plans/:id/custom-details",
  auditSaasOwnerAction("view_custom_plan_details"),
  [param("id").isInt().withMessage("Plan ID must be an integer")],
  adminController.getCustomPlanDetails
);

/**
 * @route   GET /api/v1/saas/customers/:id/custom-plan
 * @desc    Get customer's current custom plan
 * @access  SaaS Owner
 */
router.get(
  "/saas/customers/:id/custom-plan",
  auditSaasOwnerAction("view_customer_custom_plan"),
  [param("id").isInt().withMessage("Customer ID must be an integer")],
  adminController.getCustomerCustomPlan
);

/**
 * @route   POST /api/v1/saas/customers/:id/convert-to-custom
 * @desc    Convert existing subscription to custom plan
 * @access  SaaS Owner
 */
router.post(
  "/saas/customers/:id/convert-to-custom",
  auditSaasOwnerAction("convert_to_custom_plan"),
  saasOwnerRateLimit(15, 60), // 15 conversions per hour
  [
    param("id").isInt().withMessage("Customer ID must be an integer"),
    body("customPlanName")
      .notEmpty()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Custom plan name must be between 3 and 100 characters"),
    body("customPricing")
      .optional()
      .isFloat({ min: 0, max: 100000 })
      .withMessage("Custom pricing must be between 0 and 100,000"),
    body("customLimits")
      .optional()
      .isObject()
      .withMessage("Custom limits must be an object"),
    body("customLimits.maxGroups")
      .optional()
      .isInt({ min: 1, max: 50000 })
      .withMessage("Max groups must be between 1 and 50,000"),
    body("customLimits.maxUsersPerGroup")
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage("Max users per group must be between 1 and 10,000"),
    body("customLimits.maxPlayersPerGroup")
      .optional()
      .isInt({ min: 1, max: 100000 })
      .withMessage("Max players per group must be between 1 and 100,000"),
    body("adminNotes")
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage("Admin notes cannot exceed 1000 characters"),
    body("keepCurrentBillingCycle")
      .optional()
      .isBoolean()
      .withMessage("Keep current billing cycle must be a boolean"),
  ],
  adminController.convertToCustomPlan
);

/**
 * CUSTOM PLAN UTILITY ROUTES
 */

/**
 * @route   GET /api/v1/saas/plans/custom
 * @desc    Get all custom plans with their customers
 * @access  SaaS Owner
 */
router.get(
  "/saas/plans/custom",
  auditSaasOwnerAction("view_all_custom_plans"),
  async (req: any, res: any) => {
    try {
      // Get all custom plans with their subscriptions
      const customPlans =
        await adminController.adminAnalyticsService.planRepository
          .createQueryBuilder("plan")
          .leftJoinAndSelect("plan.subscriptions", "subscription")
          .leftJoinAndSelect("subscription.user", "user")
          .where("plan.is_custom = :isCustom", { isCustom: true })
          .andWhere("plan.is_active = :isActive", { isActive: true })
          .orderBy("plan.created_at", "DESC")
          .getMany();

      const customPlansList = customPlans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billingCycle: plan.billing_cycle,
        limits: {
          maxGroups: plan.max_groups,
          maxUsersPerGroup: plan.max_users_per_group,
          maxPlayersPerGroup: plan.max_players_per_group,
        },
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        customer: plan.subscriptions?.[0]
          ? {
              id: plan.subscriptions[0].user?.id,
              email: plan.subscriptions[0].user?.email,
              name: `${plan.subscriptions[0].user?.firstName || ""} ${plan.subscriptions[0].user?.lastName || ""}`.trim(),
              subscriptionStatus: plan.subscriptions[0].status,
            }
          : null,
      }));

      res.status(200).json({
        success: true,
        data: customPlansList,
        message: "Custom plans retrieved successfully",
      });
    } catch (error) {
      Logger.error("Error fetching custom plans:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch custom plans",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route   GET /api/v1/saas/customers/:id/plan-conversion-preview
 * @desc    Preview what would happen if customer's plan is converted to custom
 * @access  SaaS Owner
 */
router.get(
  "/saas/customers/:id/plan-conversion-preview",
  auditSaasOwnerAction("preview_plan_conversion"),
  [param("id").isInt().withMessage("Customer ID must be an integer")],
  async (req: any, res: any) => {
    try {
      const customerId = parseInt(req.params.id);

      // Get customer's current subscription
      const subscription = await adminController.subscriptionRepository
        .createQueryBuilder("sub")
        .leftJoinAndSelect("sub.user", "user")
        .leftJoinAndSelect("sub.plan", "plan")
        .where("user.id = :customerId", { customerId })
        .andWhere("sub.status IN (:...statuses)", {
          statuses: ["active", "trial"],
        })
        .getOne();

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "No active subscription found",
        });
        return;
      }

      if (subscription.plan.is_custom) {
        res.status(400).json({
          success: false,
          message: "Customer already has a custom plan",
        });
        return;
      }

      // Calculate remaining subscription time
      const now = new Date();
      const endDate = subscription.end_date;
      let remainingDays: number | null = null;
      if (endDate) {
        remainingDays = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Get current usage
      const currentUsage = {
        groupCount:
          await adminController.adminAnalyticsService.getCustomerGroupCount(
            customerId
          ),
        maxUsersPerGroup:
          await adminController.adminAnalyticsService.getCustomerMaxUsersPerGroup(
            customerId
          ),
      };

      const preview = {
        customer: {
          id: subscription.user.id,
          email: subscription.user.email,
          name: `${subscription.user.firstName || ""} ${subscription.user.lastName || ""}`.trim(),
        },
        currentSubscription: {
          id: subscription.id,
          status: subscription.status,
          planName: subscription.plan.name,
          price: subscription.plan.price,
          billingCycle: subscription.plan.billing_cycle,
          limits: {
            maxGroups: subscription.plan.max_groups,
            maxUsersPerGroup: subscription.plan.max_users_per_group,
            maxPlayersPerGroup: subscription.plan.max_players_per_group,
          },
          endDate: subscription.end_date,
          remainingDays,
        },
        currentUsage,
        conversionImpact: {
          subscriptionTimePreserved: `${remainingDays} days`,
          canReduceLimits: {
            groups: currentUsage.groupCount < subscription.plan.max_groups,
            usersPerGroup:
              currentUsage.maxUsersPerGroup <
              subscription.plan.max_users_per_group,
          },
          suggestedMinimumLimits: {
            maxGroups: Math.max(currentUsage.groupCount, 1),
            maxUsersPerGroup: Math.max(currentUsage.maxUsersPerGroup, 1),
            maxPlayersPerGroup: subscription.plan.max_players_per_group,
          },
        },
      };

      res.status(200).json({
        success: true,
        data: preview,
        message: "Conversion preview generated successfully",
      });
    } catch (error) {
      Logger.error("Error generating conversion preview:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate conversion preview",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route   DELETE /api/v1/saas/plans/:id/custom
 * @desc    Delete custom plan (only if no active subscriptions)
 * @access  SaaS Owner
 */
router.delete(
  "/saas/plans/:id/custom",
  auditSaasOwnerAction("delete_custom_plan"),
  saasOwnerRateLimit(5, 60), // 5 deletions per hour
  [param("id").isInt().withMessage("Plan ID must be an integer")],
  async (req: any, res: any) => {
    try {
      const planId = parseInt(req.params.id);

      const customPlan =
        await adminController.adminAnalyticsService.planRepository.findOne({
          where: { id: planId },
          relations: ["subscriptions"],
        });

      if (!customPlan) {
        res.status(404).json({
          success: false,
          message: "Custom plan not found",
        });
        return;
      }

      if (!customPlan.is_custom) {
        res.status(400).json({
          success: false,
          message: "Can only delete custom plans",
        });
        return;
      }

      // Check for active subscriptions
      const activeSubscriptions = customPlan.subscriptions?.filter(
        (sub) => sub.status === "active" || sub.status === "trial"
      );

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        res.status(409).json({
          success: false,
          message: "Cannot delete custom plan with active subscriptions",
        });
        return;
      }

      // Soft delete by deactivating
      customPlan.is_active = false;
      await adminController.adminAnalyticsService.planRepository.save(
        customPlan
      );

      Logger.info(
        `Custom plan deleted: ${customPlan.name} (ID: ${customPlan.id})`
      );

      res.status(200).json({
        success: true,
        data: {
          id: customPlan.id,
          name: customPlan.name,
          deletedAt: new Date(),
        },
        message: "Custom plan deleted successfully",
      });
    } catch (error) {
      Logger.error("Error deleting custom plan:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete custom plan",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;

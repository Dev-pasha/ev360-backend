import { Request, Response } from "express";
import { AdminAnalyticsService } from "../services/admin.dashboard.service";
import { validationResult } from "express-validator";
import { SubscriptionService } from "../services/subscription.service";
import { errorResponse, successResponse } from "../utils/response";

import Logger from "../config/logger";
import { Repository } from "typeorm";
import { Subscription } from "../entities/subscription.entity";
import AppDataSource from "../config/database";

export class AdminController {
  public adminAnalyticsService: AdminAnalyticsService;
  private subscriptionService: SubscriptionService;
  public subscriptionRepository: Repository<Subscription>;

  constructor() {
    this.adminAnalyticsService = new AdminAnalyticsService();
    this.subscriptionService = new SubscriptionService();
    this.subscriptionRepository = AppDataSource.getRepository(Subscription);
  }

  /**
   * Get dashboard overview metrics
   * GET /api/v1/admin/dashboard
   */
  getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await this.adminAnalyticsService.getDashboardMetrics();
      const revenueData =
        await this.adminAnalyticsService.getRevenueOverTime(30);
      const subscriptionAnalytics =
        await this.adminAnalyticsService.getSubscriptionAnalytics();
      const growthMetrics =
        await this.adminAnalyticsService.getGrowthMetrics(30);

      const dashboard = {
        overview: metrics,
        revenueChart: revenueData,
        planAnalytics: subscriptionAnalytics,
        growth: growthMetrics,
      };

      res
        .status(200)
        .json(
          successResponse(dashboard, "Dashboard data retrieved successfully")
        );
    } catch (error) {
      Logger.error("Error fetching dashboard data:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch dashboard data",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get revenue analytics
   * GET /api/v1/admin/analytics/revenue
   */
  getRevenueAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const revenueData =
        await this.adminAnalyticsService.getRevenueOverTime(days);
      const paymentAnalytics =
        await this.adminAnalyticsService.getPaymentAnalytics();

      const analytics = {
        revenueOverTime: revenueData,
        paymentMetrics: paymentAnalytics,
      };

      res
        .status(200)
        .json(
          successResponse(analytics, "Revenue analytics retrieved successfully")
        );
    } catch (error) {
      Logger.error("Error fetching revenue analytics:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch revenue analytics",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get customers at risk
   * GET /api/v1/admin/customers/at-risk
   */
  getCustomersAtRisk = async (req: Request, res: Response): Promise<void> => {
    try {
      const customersAtRisk =
        await this.adminAnalyticsService.getCustomersAtRisk();

      res
        .status(200)
        .json(
          successResponse(
            customersAtRisk,
            "At-risk customers retrieved successfully"
          )
        );
    } catch (error) {
      Logger.error("Error fetching at-risk customers:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch at-risk customers",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get usage analytics across platform
   * GET /api/v1/admin/analytics/usage
   */
  getUsageAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      const usageData = await this.adminAnalyticsService.getUsageAnalytics();

      res
        .status(200)
        .json(
          successResponse(usageData, "Usage analytics retrieved successfully")
        );
    } catch (error) {
      Logger.error("Error fetching usage analytics:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch usage analytics",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get all customers with pagination
   * GET /api/v1/admin/customers
   */
  getCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;

      // This would need to be implemented in the service
      const customers = await this.adminAnalyticsService.getCustomers({
        page,
        limit,
        search,
      });

      res
        .status(200)
        .json(successResponse(customers, "Customers retrieved successfully"));
    } catch (error) {
      Logger.error("Error fetching customers:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch customers",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get customer details with subscription info
   * GET /api/v1/admin/customers/:id
   */
  getCustomerDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const customerDetails =
        await this.adminAnalyticsService.getCustomerDetails(customerId);

      if (!customerDetails) {
        res.status(404).json(errorResponse("Customer not found", 404));
        return;
      }

      res
        .status(200)
        .json(
          successResponse(
            customerDetails,
            "Customer details retrieved successfully"
          )
        );
    } catch (error) {
      Logger.error("Error fetching customer details:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch customer details",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Update customer subscription
   * PATCH /api/v1/admin/customers/:id/subscription
   */
  updateCustomerSubscription = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const customerId = parseInt(req.params.id);
      const { planId, action } = req.body; // action: 'upgrade', 'downgrade', 'cancel', 'reactivate'

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      let result;
      switch (action) {
        case "upgrade":
        case "downgrade":
          result = await this.subscriptionService.changeSubscriptionPlan(
            customerId,
            planId
          );
          break;
        case "cancel":
          result =
            await this.subscriptionService.cancelSubscription(customerId);
          break;
        case "reactivate":
          result =
            await this.subscriptionService.reactivateSubscription(customerId);
          break;
        default:
          res.status(400).json(errorResponse("Invalid action", 400));
          return;
      }

      res
        .status(200)
        .json(
          successResponse(
            result,
            `Subscription ${action} completed successfully`
          )
        );
    } catch (error) {
      Logger.error("Error updating customer subscription:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to update subscription",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get all subscription plans with analytics
   * GET /api/v1/saas/plans
   */
  getPlans = async (req: Request, res: Response): Promise<void> => {
    try {
      const plans = await this.adminAnalyticsService.getPlans();

      res
        .status(200)
        .json(successResponse(plans, "Plans retrieved successfully"));
    } catch (error) {
      Logger.error("Error fetching plans:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch plans",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Get single plan with detailed analytics
   * GET /api/v1/saas/plans/:id
   */
  getPlanDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json(errorResponse("Invalid plan ID", 400));
        return;
      }

      const planDetails =
        await this.adminAnalyticsService.getPlanDetails(planId);

      res
        .status(200)
        .json(
          successResponse(planDetails, "Plan details retrieved successfully")
        );
    } catch (error) {
      Logger.error("Error fetching plan details:", error);

      if (error instanceof Error && error.message === "Plan not found") {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to fetch plan details",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Create new subscription plan
   * POST /api/v1/saas/plans
   */
  createPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const {
        name,
        description,
        price,
        billing_cycle,
        max_groups,
        max_users_per_group,
        max_players_per_group,
        is_custom,
      } = req.body;

      const plan = await this.adminAnalyticsService.createPlan({
        name,
        description,
        price,
        billing_cycle,
        max_groups,
        max_users_per_group,
        max_players_per_group,
        is_custom,
      });

      // Don't return sensitive internal data
      const planResponse = {
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
        isCustom: plan.is_custom,
        isActive: plan.is_active,
        createdAt: plan.created_at,
      };

      res
        .status(201)
        .json(successResponse(planResponse, "Plan created successfully"));
    } catch (error) {
      Logger.error("Error creating plan:", error);

      if (error instanceof Error && error.message.includes("already exists")) {
        res.status(409).json(errorResponse("Plan name already exists", 409));
      } else if (
        error instanceof Error &&
        error.message.includes("cannot be negative")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid pricing", 400, error.message));
      } else if (
        error instanceof Error &&
        error.message.includes("must be at least")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid limits", 400, error.message));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to create plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Update existing subscription plan
   * PATCH /api/v1/saas/plans/:id
   */
  updatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json(errorResponse("Invalid plan ID", 400));
        return;
      }

      const {
        name,
        description,
        price,
        max_groups,
        max_users_per_group,
        max_players_per_group,
        is_active,
      } = req.body;

      const updatedPlan = await this.adminAnalyticsService.updatePlan(planId, {
        name,
        description,
        price,
        max_groups,
        max_users_per_group,
        max_players_per_group,
        is_active,
      });

      // Format response
      const planResponse = {
        id: updatedPlan.id,
        name: updatedPlan.name,
        description: updatedPlan.description,
        price: updatedPlan.price,
        billingCycle: updatedPlan.billing_cycle,
        limits: {
          maxGroups: updatedPlan.max_groups,
          maxUsersPerGroup: updatedPlan.max_users_per_group,
          maxPlayersPerGroup: updatedPlan.max_players_per_group,
        },
        isCustom: updatedPlan.is_custom,
        isActive: updatedPlan.is_active,
        updatedAt: updatedPlan.updated_at,
      };

      res
        .status(200)
        .json(successResponse(planResponse, "Plan updated successfully"));
    } catch (error) {
      Logger.error("Error updating plan:", error);

      if (error instanceof Error && error.message === "Plan not found") {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        res.status(409).json(errorResponse("Plan name already exists", 409));
      } else if (
        error instanceof Error &&
        error.message.includes("cannot be negative")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid pricing", 400, error.message));
      } else if (
        error instanceof Error &&
        error.message.includes("must be at least")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid limits", 400, error.message));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to update plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Deactivate subscription plan
   * DELETE /api/v1/saas/plans/:id
   */
  deactivatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json(errorResponse("Invalid plan ID", 400));
        return;
      }

      const deactivatedPlan =
        await this.adminAnalyticsService.deactivatePlan(planId);

      const planResponse = {
        id: deactivatedPlan.id,
        name: deactivatedPlan.name,
        isActive: deactivatedPlan.is_active,
        deactivatedAt: deactivatedPlan.updated_at,
      };

      res
        .status(200)
        .json(successResponse(planResponse, "Plan deactivated successfully"));
    } catch (error) {
      Logger.error("Error deactivating plan:", error);

      if (error instanceof Error && error.message === "Plan not found") {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("Cannot deactivate plan")
      ) {
        res
          .status(409)
          .json(
            errorResponse(
              "Cannot deactivate plan with active subscriptions",
              409,
              error.message
            )
          );
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to deactivate plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Get customers using specific plan
   * GET /api/v1/saas/plans/:id/customers
   */
  getPlanCustomers = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = parseInt(req.params.id);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (isNaN(planId)) {
        res.status(400).json(errorResponse("Invalid plan ID", 400));
        return;
      }

      // Check if plan exists
      const plan = await this.adminAnalyticsService.getPlanDetails(planId);

      // Get customers with this plan
      const customers = await this.subscriptionRepository
        .createQueryBuilder("sub")
        .leftJoinAndSelect("sub.user", "user")
        .leftJoinAndSelect("sub.plan", "plan")
        .where("plan.id = :planId", { planId })
        .andWhere("sub.status IN (:...statuses)", {
          statuses: ["active", "trial", "past_due"],
        })
        .orderBy("sub.created_at", "DESC")
        .offset((page - 1) * limit)
        .limit(limit)
        .getMany();

      const total = await this.subscriptionRepository
        .createQueryBuilder("sub")
        .leftJoin("sub.plan", "plan")
        .where("plan.id = :planId", { planId })
        .andWhere("sub.status IN (:...statuses)", {
          statuses: ["active", "trial", "past_due"],
        })
        .getCount();

      const customerList = customers.map(
        (sub: {
          user: { id: any; email: any; firstName: any; lastName: any };
          id: any;
          status: any;
          start_date: any;
          end_date: any;
          trial_end_date: any;
        }) => ({
          customerId: sub.user.id,
          customerEmail: sub.user.email,
          customerName:
            `${sub.user.firstName || ""} ${sub.user.lastName || ""}`.trim(),
          subscriptionId: sub.id,
          subscriptionStatus: sub.status,
          startDate: sub.start_date,
          endDate: sub.end_date,
          trialEndDate: sub.trial_end_date,
        })
      );

      const response = {
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
        },
        customers: customerList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      res
        .status(200)
        .json(
          successResponse(response, "Plan customers retrieved successfully")
        );
    } catch (error) {
      Logger.error("Error fetching plan customers:", error);

      if (error instanceof Error && error.message === "Plan not found") {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to fetch plan customers",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Create new customer account
   * POST /api/v1/saas/customers/create
   */
  createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const {
        email,
        firstName,
        lastName,
        password,
        planId,
        trialDays,
        sendWelcomeEmail,
        customNotes,
      } = req.body;

      const result = await this.adminAnalyticsService.createCustomer({
        email,
        firstName,
        lastName,
        password,
        planId,
        trialDays,
        sendWelcomeEmail,
        customNotes,
      });

      // Format response (don't expose password hash)
      const customerResponse = {
        customer: {
          id: result.customer.id,
          email: result.customer.email,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          fullName:
            `${result.customer.firstName || ""} ${result.customer.lastName || ""}`.trim(),
          emailVerified: result.customer.emailVerified,
          createdAt: result.customer.createdAt,
        },
        subscription: result.subscription
          ? {
              id: result.subscription.id,
              status: result.subscription.status,
              planName: result.subscription.plan?.name,
              startDate: result.subscription.start_date,
              endDate: result.subscription.end_date,
              trialEndDate: result.subscription.trial_end_date,
            }
          : null,
        temporaryPassword: result.temporaryPassword, // Only if generated
        welcomeEmailSent: sendWelcomeEmail || false,
      };

      res
        .status(201)
        .json(
          successResponse(customerResponse, "Customer created successfully")
        );
    } catch (error) {
      Logger.error("Error creating customer:", error);

      if (error instanceof Error && error.message.includes("already exists")) {
        res.status(409).json(errorResponse("Customer already exists", 409));
      } else if (
        error instanceof Error &&
        error.message.includes("Invalid email")
      ) {
        res.status(400).json(errorResponse("Invalid email format", 400));
      } else if (
        error instanceof Error &&
        error.message.includes("Plan not found")
      ) {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to create customer",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Assign plan to existing customer
   * POST /api/v1/saas/customers/:id/assign-plan
   */
  assignPlanToCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const {
        planId,
        trialDays,
        startDate,
        customPricing,
        adminNotes,
        cancelExisting,
      } = req.body;

      const subscription =
        await this.adminAnalyticsService.assignPlanToCustomer(
          customerId,
          planId,
          {
            trialDays,
            startDate: startDate ? new Date(startDate) : undefined,
            customPricing,
            adminNotes,
            cancelExisting,
          }
        );

      const subscriptionResponse = {
        id: subscription.id,
        status: subscription.status,
        plan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          price: subscription.plan.price,
          billingCycle: subscription.plan.billing_cycle,
        },
        customer: {
          id: subscription.user.id,
          email: subscription.user.email,
          name: `${subscription.user.firstName || ""} ${subscription.user.lastName || ""}`.trim(),
        },
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        trialEndDate: subscription.trial_end_date,
        customPricing: subscription.metadata?.customPricing || null,
        adminNotes: subscription.metadata?.adminNotes || null,
      };

      res
        .status(201)
        .json(
          successResponse(subscriptionResponse, "Plan assigned successfully")
        );
    } catch (error) {
      Logger.error("Error assigning plan to customer:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else if (error instanceof Error && error.message === "Plan not found") {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("already has an active subscription")
      ) {
        res
          .status(409)
          .json(
            errorResponse(
              "Customer has active subscription",
              409,
              error.message
            )
          );
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to assign plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Update customer details
   * PATCH /api/v1/saas/customers/:id
   */
  updateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const { firstName, lastName, email, emailVerified, isActive } = req.body;

      const updatedCustomer = await this.adminAnalyticsService.updateCustomer(
        customerId,
        {
          firstName,
          lastName,
          email,
          emailVerified,
          isActive,
        }
      );

      const customerResponse = {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        firstName: updatedCustomer.firstName,
        lastName: updatedCustomer.lastName,
        fullName:
          `${updatedCustomer.firstName || ""} ${updatedCustomer.lastName || ""}`.trim(),
        emailVerified: updatedCustomer.emailVerified,
        updatedAt: updatedCustomer.updatedAt,
      };

      res
        .status(200)
        .json(
          successResponse(customerResponse, "Customer updated successfully")
        );
    } catch (error) {
      Logger.error("Error updating customer:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        res.status(409).json(errorResponse("Email already exists", 409));
      } else if (
        error instanceof Error &&
        error.message.includes("Invalid email")
      ) {
        res.status(400).json(errorResponse("Invalid email format", 400));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to update customer",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Send password reset to customer
   * POST /api/v1/saas/customers/:id/reset-password
   */
  sendCustomerPasswordReset = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const result =
        await this.adminAnalyticsService.sendCustomerPasswordReset(customerId);

      const isDevelopment = process.env.NODE_ENV === "development";
      const responseData = {
        message: result.message,
        resetToken: isDevelopment ? result.resetToken : undefined,
      };

      res
        .status(200)
        .json(successResponse(responseData, "Password reset initiated"));
    } catch (error) {
      Logger.error("Error sending password reset:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to send password reset",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Deactivate customer account
   * POST /api/v1/saas/customers/:id/deactivate
   */
  deactivateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const { reason } = req.body;

      const result = await this.adminAnalyticsService.deactivateCustomer(
        customerId,
        reason
      );

      const deactivationResponse = {
        customer: {
          id: result.customer.id,
          email: result.customer.email,
          fullName:
            `${result.customer.firstName || ""} ${result.customer.lastName || ""}`.trim(),
        },
        canceledSubscriptions: result.canceledSubscriptions.map((sub) => ({
          id: sub.id,
          planName: sub.plan?.name,
          status: sub.status,
          endDate: sub.end_date,
        })),
        reason: reason || "Admin deactivation",
        deactivatedAt: new Date(),
      };

      res
        .status(200)
        .json(
          successResponse(
            deactivationResponse,
            "Customer deactivated successfully"
          )
        );
    } catch (error) {
      Logger.error("Error deactivating customer:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to deactivate customer",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Reactivate customer account
   * POST /api/v1/saas/customers/:id/reactivate
   */
  reactivateCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const reactivatedCustomer =
        await this.adminAnalyticsService.reactivateCustomer(customerId);

      const customerResponse = {
        id: reactivatedCustomer.id,
        email: reactivatedCustomer.email,
        fullName:
          `${reactivatedCustomer.firstName || ""} ${reactivatedCustomer.lastName || ""}`.trim(),
        reactivatedAt: new Date(),
      };

      res
        .status(200)
        .json(
          successResponse(customerResponse, "Customer reactivated successfully")
        );
    } catch (error) {
      Logger.error("Error reactivating customer:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to reactivate customer",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Create custom plan for specific customer
   * POST /api/v1/saas/customers/:id/create-custom-plan
   */
  createCustomPlanForCustomer = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const {
        planName,
        description,
        customPricing,
        billingCycle,
        customLimits,
        trialDays,
        adminNotes,
        cancelExistingSubscription,
      } = req.body;

      const result =
        await this.adminAnalyticsService.createCustomPlanForCustomer(
          customerId,
          {
            planName,
            description,
            customPricing,
            billingCycle,
            customLimits,
            trialDays,
            adminNotes,
            cancelExistingSubscription,
          }
        );

      // Format response
      const customPlanResponse = {
        customPlan: {
          id: result.customPlan.id,
          name: result.customPlan.name,
          description: result.customPlan.description,
          price: result.customPlan.price,
          billingCycle: result.customPlan.billing_cycle,
          limits: {
            maxGroups: result.customPlan.max_groups,
            maxUsersPerGroup: result.customPlan.max_users_per_group,
            maxPlayersPerGroup: result.customPlan.max_players_per_group,
          },
          isCustom: result.customPlan.is_custom,
          createdAt: result.customPlan.created_at,
        },
        subscription: {
          id: result.subscription.id,
          status: result.subscription.status,
          startDate: result.subscription.start_date,
          endDate: result.subscription.end_date,
          trialEndDate: result.subscription.trial_end_date,
          metadata: result.subscription.metadata,
        },
        previousSubscription: result.previousSubscription
          ? {
              id: result.previousSubscription.id,
              status: result.previousSubscription.status,
              canceledAt: result.previousSubscription.end_date,
            }
          : null,
        customer: {
          id: result.subscription.user.id,
          email: result.subscription.user.email,
          name: `${result.subscription.user.firstName || ""} ${result.subscription.user.lastName || ""}`.trim(),
        },
      };

      res
        .status(201)
        .json(
          successResponse(
            customPlanResponse,
            "Custom plan created successfully"
          )
        );
    } catch (error) {
      Logger.error("Error creating custom plan for customer:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        res.status(409).json(errorResponse("Custom plan already exists", 409));
      } else if (
        error instanceof Error &&
        error.message.includes("must be between")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid custom limits", 400, error.message));
      } else if (
        error instanceof Error &&
        error.message.includes("active subscription")
      ) {
        res
          .status(409)
          .json(
            errorResponse(
              "Customer has active subscription",
              409,
              error.message
            )
          );
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to create custom plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Modify custom plan limits
   * PATCH /api/v1/saas/plans/:id/modify-limits
   */
  modifyCustomPlanLimits = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json(errorResponse("Invalid plan ID", 400));
        return;
      }

      const { newPricing, newLimits, adminNotes, applyImmediately } = req.body;

      const result = await this.adminAnalyticsService.modifyCustomPlanLimits(
        planId,
        {
          newPricing,
          newLimits,
          adminNotes,
          applyImmediately,
        }
      );

      // Format response
      const modificationResponse = {
        updatedPlan: {
          id: result.updatedPlan.id,
          name: result.updatedPlan.name,
          description: result.updatedPlan.description,
          price: result.updatedPlan.price,
          billingCycle: result.updatedPlan.billing_cycle,
          limits: {
            maxGroups: result.updatedPlan.max_groups,
            maxUsersPerGroup: result.updatedPlan.max_users_per_group,
            maxPlayersPerGroup: result.updatedPlan.max_players_per_group,
          },
          isCustom: result.updatedPlan.is_custom,
          updatedAt: result.updatedPlan.updated_at,
        },
        affectedCustomers: result.affectedSubscriptions.map((sub) => ({
          customerId: sub.user.id,
          customerEmail: sub.user.email,
          customerName:
            `${sub.user.firstName || ""} ${sub.user.lastName || ""}`.trim(),
          subscriptionId: sub.id,
          subscriptionStatus: sub.status,
        })),
        modifications: {
          pricing: newPricing
            ? { applied: true, newValue: newPricing }
            : { applied: false },
          limits: newLimits
            ? { applied: true, newValues: newLimits }
            : { applied: false },
          adminNotes: adminNotes || null,
        },
        warnings: result.warningsGenerated,
        modificationDate: new Date().toISOString(),
      };

      res
        .status(200)
        .json(
          successResponse(
            modificationResponse,
            "Custom plan limits modified successfully"
          )
        );
    } catch (error) {
      Logger.error("Error modifying custom plan limits:", error);

      if (error instanceof Error && error.message === "Custom plan not found") {
        res.status(404).json(errorResponse("Custom plan not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("Can only modify custom plans")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid plan type", 400, error.message));
      } else if (
        error instanceof Error &&
        error.message.includes("Cannot reduce")
      ) {
        res
          .status(409)
          .json(errorResponse("Cannot reduce limits", 409, error.message));
      } else if (
        error instanceof Error &&
        error.message.includes("must be between")
      ) {
        res
          .status(400)
          .json(errorResponse("Invalid limits", 400, error.message));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to modify custom plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Get custom plan details with usage analytics
   * GET /api/v1/saas/plans/:id/custom-details
   */
  getCustomPlanDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = parseInt(req.params.id);

      if (isNaN(planId)) {
        res.status(400).json(errorResponse("Invalid plan ID", 400));
        return;
      }

      const customPlanDetails =
        await this.adminAnalyticsService.getCustomPlanDetails(planId);

      res
        .status(200)
        .json(
          successResponse(
            customPlanDetails,
            "Custom plan details retrieved successfully"
          )
        );
    } catch (error) {
      Logger.error("Error fetching custom plan details:", error);

      if (error instanceof Error && error.message === "Plan not found") {
        res.status(404).json(errorResponse("Plan not found", 404));
      } else if (
        error instanceof Error &&
        error.message === "This is not a custom plan"
      ) {
        res
          .status(400)
          .json(errorResponse("Not a custom plan", 400, error.message));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to fetch custom plan details",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };

  /**
   * Get customer's current custom plan (if any)
   * GET /api/v1/saas/customers/:id/custom-plan
   */
  getCustomerCustomPlan = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      // Get customer's active subscription
      const subscription = await this.subscriptionRepository
        .createQueryBuilder("sub")
        .leftJoinAndSelect("sub.user", "user")
        .leftJoinAndSelect("sub.plan", "plan")
        .where("user.id = :customerId", { customerId })
        .andWhere("sub.status IN (:...statuses)", {
          statuses: ["active", "trial"],
        })
        .andWhere("plan.is_custom = :isCustom", { isCustom: true })
        .getOne();

      if (!subscription) {
        res
          .status(404)
          .json(errorResponse("Customer has no active custom plan", 404));
        return;
      }

      const customPlanResponse = {
        customer: {
          id: subscription.user.id,
          email: subscription.user.email,
          name: `${subscription.user.firstName || ""} ${subscription.user.lastName || ""}`.trim(),
        },
        customPlan: {
          id: subscription.plan.id,
          name: subscription.plan.name,
          description: subscription.plan.description,
          price: subscription.plan.price,
          billingCycle: subscription.plan.billing_cycle,
          limits: {
            maxGroups: subscription.plan.max_groups,
            maxUsersPerGroup: subscription.plan.max_users_per_group,
            maxPlayersPerGroup: subscription.plan.max_players_per_group,
          },
          createdAt: subscription.plan.created_at,
          updatedAt: subscription.plan.updated_at,
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          trialEndDate: subscription.trial_end_date,
          metadata: subscription.metadata,
        },
      };

      res
        .status(200)
        .json(
          successResponse(
            customPlanResponse,
            "Customer's custom plan retrieved successfully"
          )
        );
    } catch (error) {
      Logger.error("Error fetching customer's custom plan:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch customer's custom plan",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Convert existing subscription to custom plan
   * POST /api/v1/saas/customers/:id/convert-to-custom
   */
  convertToCustomPlan = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const customerId = parseInt(req.params.id);

      if (isNaN(customerId)) {
        res.status(400).json(errorResponse("Invalid customer ID", 400));
        return;
      }

      const { customPlanName, customPricing, customLimits, adminNotes } =
        req.body;

      // This would be a new service method to implement
      const result =
        await this.adminAnalyticsService.convertSubscriptionToCustomPlan(
          customerId,
          {
            customPlanName,
            customPricing,
            customLimits,
            adminNotes,
          }
        );

      res
        .status(200)
        .json(
          successResponse(
            result,
            "Subscription converted to custom plan successfully"
          )
        );
    } catch (error) {
      Logger.error("Error converting to custom plan:", error);

      if (error instanceof Error && error.message === "Customer not found") {
        res.status(404).json(errorResponse("Customer not found", 404));
      } else if (
        error instanceof Error &&
        error.message.includes("No active subscription")
      ) {
        res
          .status(404)
          .json(errorResponse("No active subscription found", 404));
      } else {
        res
          .status(500)
          .json(
            errorResponse(
              "Failed to convert to custom plan",
              500,
              error instanceof Error ? error.message : "Unknown error"
            )
          );
      }
    }
  };



  

  /**
   * Send bulk notifications
   * POST /api/v1/admin/notifications/bulk
   */
  // sendBulkNotifications = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const {
  //       recipientType, // 'all', 'trial', 'past_due', 'specific_plan'
  //       planId,
  //       message,
  //       subject,
  //       type // 'email', 'in_app', 'both'
  //     } = req.body;

  //     // This would need to be implemented
  //     const result = await this.adminAnalyticsService.sendBulkNotifications({
  //       recipientType,
  //       planId,
  //       message,
  //       subject,
  //       type
  //     });

  //     res.status(200).json(successResponse(result, "Bulk notifications sent successfully"));
  //   } catch (error) {
  //     Logger.error("Error sending bulk notifications:", error);
  //     res.status(500).json(
  //       errorResponse("Failed to send notifications", 500,
  //         error instanceof Error ? error.message : "Unknown error")
  //     );
  //   }
  // };

  /**
   * Generate business reports
   * GET /api/v1/admin/reports/:type
   */
  // generateReport = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const reportType = req.params.type; // 'revenue', 'customers', 'usage', 'churn'
  //     const startDate = req.query.startDate as string;
  //     const endDate = req.query.endDate as string;
  //     const format = req.query.format as string || 'json'; // 'json', 'csv', 'pdf'

  //     const report = await this.adminAnalyticsService.generateReport({
  //       type: reportType,
  //       startDate: startDate ? new Date(startDate) : undefined,
  //       endDate: endDate ? new Date(endDate) : undefined,
  //       format
  //     });

  //     if (format === 'csv') {
  //       res.setHeader('Content-Type', 'text/csv');
  //       res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
  //       res.send(report);
  //     } else if (format === 'pdf') {
  //       res.setHeader('Content-Type', 'application/pdf');
  //       res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.pdf"`);
  //       res.send(report);
  //     } else {
  //       res.status(200).json(successResponse(report, "Report generated successfully"));
  //     }
  //   } catch (error) {
  //     Logger.error("Error generating report:", error);
  //     res.status(500).json(
  //       errorResponse("Failed to generate report", 500,
  //         error instanceof Error ? error.message : "Unknown error")
  //     );
  //   }
  // };

  /**
   * Get system health metrics
   * GET /api/v1/admin/system/health
   */
  // getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const health = {
  //       database: await this.checkDatabaseHealth(),
  //       redis: await this.checkRedisHealth(),
  //       externalServices: await this.checkExternalServices(),
  //       errorRates: await this.getErrorRates(),
  //       responseTime: await this.getAverageResponseTime()
  //     };

  //     res.status(200).json(successResponse(health, "System health retrieved successfully"));
  //   } catch (error) {
  //     Logger.error("Error fetching system health:", error);
  //     res.status(500).json(
  //       errorResponse("Failed to fetch system health", 500,
  //         error instanceof Error ? error.message : "Unknown error")
  //     );
  //   }
  // };

  // Helper methods for system health
  private async checkDatabaseHealth(): Promise<{
    status: string;
    responseTime: number;
  }> {
    const start = Date.now();
    try {
      await this.subscriptionService["subscriptionRepository"].query(
        "SELECT 1"
      );
      return { status: "healthy", responseTime: Date.now() - start };
    } catch (error) {
      return { status: "unhealthy", responseTime: Date.now() - start };
    }
  }

  private async checkRedisHealth(): Promise<{ status: string }> {
    // Implement Redis health check
    return { status: "healthy" };
  }

  private async checkExternalServices(): Promise<any> {
    // Check Stripe, email service, etc.
    return { stripe: "healthy", email: "healthy" };
  }

  private async getErrorRates(): Promise<{ rate: number; period: string }> {
    // Get error rates from logs
    return { rate: 0.1, period: "24h" };
  }

  private async getAverageResponseTime(): Promise<{
    time: number;
    unit: string;
  }> {
    // Get average response time
    return { time: 150, unit: "ms" };
  }
}

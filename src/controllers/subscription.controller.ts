import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { SubscriptionService } from "../services/subscription.service";
import { errorResponse, successResponse } from "../utils/response";
import Logger from "../config/logger";
import { BillingCycle } from "../entities/subscription-plan.entity";
import { SubscriptionStatus } from "../entities/subscription.entity";

export class SubscriptionController {
  private subscriptionService: SubscriptionService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Create a new subscription plan
   * POST /api/v1/subscriptions/plans
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

      const plan = await this.subscriptionService.createPlan({
        name,
        description,
        price,
        billing_cycle: billing_cycle as BillingCycle,
        max_groups,
        max_users_per_group,
        max_players_per_group,
        is_custom,
      });

      res
        .status(201)
        .json(successResponse(plan, "Subscription plan created successfully"));
    } catch (error) {
      Logger.error("Error creating subscription plan:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to create subscription plan",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Subscribe a user to a plan
   * POST /api/v1/subscriptions
   */
  createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const {
        user_id,
        plan_id,
        trial_days,
        external_subscription_id,
        metadata,
      } = req.body;

      const subscription = await this.subscriptionService.createSubscription(
        user_id,
        plan_id,
        {
          trial_days,
          external_subscription_id,
          metadata,
        }
      );

      res
        .status(201)
        .json(
          successResponse(subscription, "Subscription created successfully")
        );
    } catch (error) {
      Logger.error("Error creating subscription:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to create subscription",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Generate an invoice for a subscription
   * POST /api/v1/subscriptions/:id/invoice
   */
  generateInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const subscriptionId = parseInt(req.params.id);
      const { external_invoice_id, due_date_days, tax_percent } = req.body;

      const invoice = await this.subscriptionService.generateInvoice(
        subscriptionId,
        {
          external_invoice_id,
          due_date_days,
          tax_percent,
        }
      );

      res
        .status(201)
        .json(successResponse(invoice, "Invoice generated successfully"));
    } catch (error) {
      Logger.error("Error generating invoice:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to generate invoice",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * Update subscription status
   * PATCH /api/v1/subscriptions/:id/status
   */
  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const subscriptionId = parseInt(req.params.id);
      const { status } = req.body;

      const subscription =
        await this.subscriptionService.updateSubscriptionStatus(
          subscriptionId,
          status as SubscriptionStatus
        );

      res
        .status(200)
        .json(
          successResponse(
            subscription,
            "Subscription status updated successfully"
          )
        );
    } catch (error) {
      Logger.error("Error updating subscription status:", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to update subscription status",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };
}

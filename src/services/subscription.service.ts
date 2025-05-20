import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { SubscriptionPlan, BillingCycle } from "../entities/subscription-plan.entity";
import { Subscription, SubscriptionStatus } from "../entities/subscription.entity";
import { BillingInvoice, InvoiceStatus } from "../entities/billing-invoice.entity";
import { User } from "../entities/user.entity";
import { Group } from "../entities/group.entity";
import Logger from "../config/logger";

export class SubscriptionService {
  private subscriptionPlanRepository: Repository<SubscriptionPlan>;
  private subscriptionRepository: Repository<Subscription>;
  private invoiceRepository: Repository<BillingInvoice>;
  private userRepository: Repository<User>;
  private groupRepository: Repository<Group>;

  constructor() {
    this.subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
    this.subscriptionRepository = AppDataSource.getRepository(Subscription);
    this.invoiceRepository = AppDataSource.getRepository(BillingInvoice);
    this.userRepository = AppDataSource.getRepository(User);
    this.groupRepository = AppDataSource.getRepository(Group);
  }

  /**
   * Create a new subscription plan
   */
  async createPlan(planData: {
    name: string;
    description?: string;
    price: number;
    billing_cycle: BillingCycle;
    max_groups: number;
    max_users_per_group: number;
    max_players_per_group: number;
    is_custom?: boolean;
  }): Promise<SubscriptionPlan> {
    try {
      const plan = this.subscriptionPlanRepository.create(planData);
      return await this.subscriptionPlanRepository.save(plan);
    } catch (error) {
      Logger.error("Error creating subscription plan:", error);
      throw error;
    }
  }

  /**
   * Subscribe a user to a plan
   */
  async createSubscription(
    userId: number,
    planId: number,
    options: {
      trial_days?: number;
      external_subscription_id?: string;
      metadata?: any;
    } = {}
  ): Promise<Subscription> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const plan = await this.subscriptionPlanRepository.findOne({ where: { id: planId } });
      if (!plan) {
        throw new Error(`Subscription plan with ID ${planId} not found`);
      }

      // Calculate dates
      const startDate = new Date();
      let endDate: Date | null = null;
      let trialEndDate: Date | null = null;
      let status = SubscriptionStatus.ACTIVE;

      if (options.trial_days && options.trial_days > 0) {
        trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + options.trial_days);
        status = SubscriptionStatus.TRIAL;
      }

      // Calculate end date based on billing cycle
      endDate = new Date();
      switch (plan.billing_cycle) {
        case BillingCycle.MONTHLY:
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case BillingCycle.QUARTERLY:
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case BillingCycle.ANNUAL:
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      const subscription = this.subscriptionRepository.create({
        user,
        plan,
        status,
        start_date: startDate,
        end_date: endDate,
        trial_end_date: trialEndDate,
        external_subscription_id: options.external_subscription_id || null,
        metadata: options.metadata || null
      });

      return await this.subscriptionRepository.save(subscription);
    } catch (error) {
      Logger.error("Error creating subscription:", error);
      throw error;
    }
  }

  /**
   * Generate an invoice for a subscription
   */
  async generateInvoice(
    subscriptionId: number,
    options: {
      external_invoice_id?: string;
      due_date_days?: number;
      tax_percent?: number;
    } = {}
  ): Promise<BillingInvoice> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ["user", "plan"]
      });

      if (!subscription) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`);
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (options.due_date_days || 7));

      const amount = subscription.plan.price;
      const taxAmount = amount * ((options.tax_percent || 0) / 100);
      const totalAmount = amount + taxAmount;

      const invoice = this.invoiceRepository.create({
        user: subscription.user,
        subscription,
        external_invoice_id: options.external_invoice_id || null,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: InvoiceStatus.OPEN,
        due_date: dueDate,
        line_items: [
          {
            description: `Subscription to ${subscription.plan.name} (${subscription.plan.billing_cycle})`,
            amount: subscription.plan.price,
            quantity: 1
          }
        ]
      });

      return await this.invoiceRepository.save(invoice);
    } catch (error) {
      Logger.error("Error generating invoice:", error);
      throw error;
    }
  }

  /**
   * Check if a user can create more groups
   */
  async canCreateGroup(userId: number): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ["subscriptions", "subscriptions.plan"]
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Find active subscription
      const activeSubscription = user.subscriptions.find(
        sub => sub.status === SubscriptionStatus.ACTIVE || sub.status === SubscriptionStatus.TRIAL
      );

      if (!activeSubscription) {
        return false;
      }

      // Count existing groups
      const groupCount = await this.groupRepository.count({
        where: { subscription: { id: activeSubscription.id } }
      });

      return groupCount < activeSubscription.plan.max_groups;
    } catch (error) {
      Logger.error("Error checking if user can create group:", error);
      throw error;
    }
  }

  /**
   * Check if a group can add more users
   */
  async canAddUserToGroup(groupId: number): Promise<boolean> {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ["subscription", "subscription.plan", "userGroupRoles"]
      });

      if (!group || !group.subscription) {
        return false;
      }

      return group.userGroupRoles.length < group.subscription.plan.max_users_per_group;
    } catch (error) {
      Logger.error("Error checking if group can add user:", error);
      throw error;
    }
  }

  /**
   * Check if a group can add more players
   */
  async canAddPlayerToGroup(groupId: number): Promise<boolean> {
    try {
      const group = await this.groupRepository.findOne({
        where: { id: groupId },
        relations: ["subscription", "subscription.plan"]
      });

      if (!group || !group.subscription) {
        return false;
      }

      // Count existing players
      const playerCount = await AppDataSource.getRepository("Player").count({
        where: { group: { id: groupId } }
      });

      return playerCount < group.subscription.plan.max_players_per_group;
    } catch (error) {
      Logger.error("Error checking if group can add player:", error);
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    subscriptionId: number,
    status: SubscriptionStatus
  ): Promise<Subscription> {
    try {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error(`Subscription with ID ${subscriptionId} not found`);
      }

      subscription.status = status;
      return await this.subscriptionRepository.save(subscription);
    } catch (error) {
      Logger.error("Error updating subscription status:", error);
      throw error;
    }
  }
}

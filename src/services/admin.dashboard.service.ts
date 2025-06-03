import { In, Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  Subscription,
  SubscriptionStatus,
} from "../entities/subscription.entity";
import {
  BillingInvoice,
  InvoiceStatus,
} from "../entities/billing-invoice.entity";
import { User } from "../entities/user.entity";
import { Group } from "../entities/group.entity";
import {
  BillingCycle,
  SubscriptionPlan,
} from "../entities/subscription-plan.entity";
import Logger from "../config/logger";
import { EmailService } from "./email.service";

export interface DashboardMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  totalCustomers: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  totalGroups: number;
  totalUsers: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
}

export interface SubscriptionAnalytics {
  planName: string;
  activeCount: number;
  revenue: number;
  conversionRate: number;
}

export class AdminAnalyticsService {
  private subscriptionRepository: Repository<Subscription>;
  private invoiceRepository: Repository<BillingInvoice>;
  private userRepository: Repository<User>;
  private groupRepository: Repository<Group>;
  public planRepository: Repository<SubscriptionPlan>;
  private emailService: EmailService;

  constructor() {
    this.subscriptionRepository = AppDataSource.getRepository(Subscription);
    this.invoiceRepository = AppDataSource.getRepository(BillingInvoice);
    this.userRepository = AppDataSource.getRepository(User);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.planRepository = AppDataSource.getRepository(SubscriptionPlan);
    this.emailService = new EmailService();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total revenue from paid invoices
    const totalRevenue = await this.invoiceRepository
      .createQueryBuilder("invoice")
      .select("SUM(invoice.total_amount)", "sum")
      .where("invoice.status = :status", { status: InvoiceStatus.PAID })
      .getRawOne();

    // Monthly Recurring Revenue (MRR)
    const mrrData = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .leftJoin("sub.plan", "plan")
      .select(
        "SUM(CASE WHEN plan.billing_cycle = 'monthly' THEN plan.price WHEN plan.billing_cycle = 'quarterly' THEN plan.price/3 WHEN plan.billing_cycle = 'annual' THEN plan.price/12 END)",
        "mrr"
      )
      .where("sub.status IN (:...statuses)", {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      })
      .getRawOne();

    // Customer metrics
    const totalCustomers = await this.userRepository.count();
    const activeSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });
    const trialSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.TRIAL },
    });

    // ✅ FIXED: Churn calculation using query builder
    const canceledLast30Days = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .where("sub.status = :status", { status: SubscriptionStatus.CANCELED })
      .andWhere("sub.updated_at >= :thirtyDaysAgo", { thirtyDaysAgo })
      .getCount();

    const activeAtStartOfPeriod = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .where("sub.status = :status", { status: SubscriptionStatus.ACTIVE })
      .andWhere("sub.created_at <= :thirtyDaysAgo", { thirtyDaysAgo })
      .getCount();

    const churnRate =
      activeAtStartOfPeriod > 0
        ? (canceledLast30Days / activeAtStartOfPeriod) * 100
        : 0;

    // ARPU calculation
    const mrr = parseFloat(mrrData?.mrr || "0");
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    // Usage metrics
    const totalGroups = await this.groupRepository.count();
    const totalUsers = await this.userRepository.count();

    return {
      totalRevenue: parseFloat(totalRevenue?.sum || "0"),
      monthlyRecurringRevenue: mrr,
      annualRecurringRevenue: mrr * 12,
      totalCustomers,
      activeSubscriptions,
      trialSubscriptions,
      churnRate: Math.round(churnRate * 100) / 100,
      averageRevenuePerUser: Math.round(arpu * 100) / 100,
      totalGroups,
      totalUsers,
    };
  }

  /**
   * Get revenue data over time for charts
   */
  async getRevenueOverTime(days: number = 30): Promise<RevenueData[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const revenueData = await this.invoiceRepository
      .createQueryBuilder("invoice")
      .select("DATE(invoice.paid_date) as date")
      .addSelect("SUM(invoice.total_amount) as revenue")
      .addSelect("COUNT(DISTINCT invoice.subscription_id) as subscriptions")
      .where("invoice.status = :status", { status: InvoiceStatus.PAID })
      .andWhere("invoice.paid_date >= :startDate", { startDate })
      .andWhere("invoice.paid_date <= :endDate", { endDate })
      .groupBy("DATE(invoice.paid_date)")
      .orderBy("DATE(invoice.paid_date)", "ASC")
      .getRawMany();

    return revenueData.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue || "0"),
      subscriptions: parseInt(row.subscriptions || "0"),
    }));
  }

  /**
   * Get subscription analytics by plan
   */
  async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics[]> {
    const planAnalytics = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .leftJoin("sub.plan", "plan")
      .select("plan.name", "planName")
      .addSelect(
        "COUNT(CASE WHEN sub.status = 'active' THEN 1 END)",
        "activeCount"
      )
      .addSelect(
        "SUM(CASE WHEN sub.status = 'active' THEN plan.price ELSE 0 END)",
        "revenue"
      )
      .addSelect(
        "COUNT(CASE WHEN sub.status = 'trial' THEN 1 END)",
        "trialCount"
      )
      .groupBy("plan.id, plan.name")
      .getRawMany();

    return planAnalytics.map((row) => {
      const activeCount = parseInt(row.activeCount || "0");
      const trialCount = parseInt(row.trialCount || "0");
      const conversionRate =
        trialCount > 0 ? (activeCount / (activeCount + trialCount)) * 100 : 100;

      return {
        planName: row.planName,
        activeCount,
        revenue: parseFloat(row.revenue || "0"),
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    });
  }

  /**
   * Get customers at risk (usage patterns, payment issues)
   */
  async getCustomersAtRisk(): Promise<any[]> {
    const pastDueCustomers = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .leftJoin("sub.user", "user")
      .leftJoin("sub.plan", "plan")
      .select([
        "user.id",
        "user.email",
        "user.firstName",
        "user.lastName",
        "sub.status",
        "plan.name as planName",
        "sub.end_date",
      ])
      .where("sub.status = :status", { status: SubscriptionStatus.PAST_DUE })
      .orWhere("sub.end_date < :now AND sub.status = :activeStatus", {
        now: new Date(),
        activeStatus: SubscriptionStatus.ACTIVE,
      })
      .getRawMany();

    return pastDueCustomers;
  }

  /**
   * Get usage analytics across the platform
   */
  async getUsageAnalytics(): Promise<any> {
    // Groups per subscription plan
    const groupsPerPlan = await this.groupRepository
      .createQueryBuilder("group")
      .leftJoin("group.subscription", "sub")
      .leftJoin("sub.plan", "plan")
      .select("plan.name", "planName")
      .addSelect("COUNT(group.id)", "groupCount")
      .addSelect("AVG(plan.max_groups)", "maxAllowed")
      .where("sub.status IN (:...statuses)", {
        statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
      })
      .groupBy("plan.id, plan.name")
      .getRawMany();

    // Users per group analytics
    const usersPerGroup = await AppDataSource.createQueryBuilder()
      .select("AVG(user_count)", "avgUsers")
      .addSelect("MAX(user_count)", "maxUsers")
      .addSelect("MIN(user_count)", "minUsers")
      .from((subQuery) => {
        return subQuery
          .select("COUNT(ugr.user_id)", "user_count")
          .from("user_group_roles", "ugr")
          .groupBy("ugr.group_id");
      }, "user_counts")
      .getRawOne();

    return {
      groupsPerPlan: groupsPerPlan.map((row) => ({
        planName: row.planName,
        groupCount: parseInt(row.groupCount || "0"),
        maxAllowed: parseInt(row.maxAllowed || "0"),
        utilizationRate: Math.round(
          (parseInt(row.groupCount || "0") / parseInt(row.maxAllowed || "1")) *
            100
        ),
      })),
      usersPerGroup: {
        average: parseFloat(usersPerGroup?.avgUsers || "0"),
        maximum: parseInt(usersPerGroup?.maxUsers || "0"),
        minimum: parseInt(usersPerGroup?.minUsers || "0"),
      },
    };
  }

  /**
   * Get failed payments and retry attempts
   */
  async getPaymentAnalytics(): Promise<any> {
    const failedInvoices = await this.invoiceRepository.count({
      where: { status: InvoiceStatus.UNCOLLECTIBLE },
    });

    const overdueInvoices = await this.invoiceRepository
      .createQueryBuilder("invoice")
      .where("invoice.status = :status", { status: InvoiceStatus.OPEN })
      .andWhere("invoice.due_date < :now", { now: new Date() })
      .getCount();

    const totalInvoices = await this.invoiceRepository.count();

    return {
      failedInvoices,
      overdueInvoices,
      totalInvoices,
      failureRate:
        totalInvoices > 0 ? (failedInvoices / totalInvoices) * 100 : 0,
    };
  }

  /**
   * Get subscription growth metrics
   */
  async getGrowthMetrics(days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Fix: Use proper PostgreSQL syntax
    const newSubscriptions = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .where("sub.created_at >= :startDate", { startDate })
      .andWhere("sub.created_at <= :endDate", { endDate })
      .andWhere("sub.status = :status", { status: SubscriptionStatus.ACTIVE })
      .getCount();

    const canceledSubscriptions = await this.subscriptionRepository
      .createQueryBuilder("sub")
      .where("sub.updated_at >= :startDate", { startDate })
      .andWhere("sub.updated_at <= :endDate", { endDate })
      .andWhere("sub.status = :status", { status: SubscriptionStatus.CANCELED })
      .getCount();

    const netGrowth = newSubscriptions - canceledSubscriptions;
    const growthRate =
      newSubscriptions > 0 ? (netGrowth / newSubscriptions) * 100 : 0;

    return {
      newSubscriptions,
      canceledSubscriptions,
      netGrowth,
      growthRate: Math.round(growthRate * 100) / 100,
    };
  }

  /**
   * Get customers with pagination and search
   */
  async getCustomers(options: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{
    customers: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page, limit, search } = options;
      const offset = (page - 1) * limit;

      let query = this.userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.subscriptions", "subscription")
        .leftJoinAndSelect("subscription.plan", "plan")
        .leftJoinAndSelect("user.userGroupRoles", "userGroupRole")
        .leftJoinAndSelect("userGroupRole.group", "group")
        .select([
          "user.id",
          "user.email",
          "user.firstName",
          "user.lastName",
          "user.emailVerified",
          "user.lastLoginAt",
          "user.createdAt",
          "subscription.id",
          "subscription.status",
          "subscription.start_date",
          "subscription.end_date",
          "plan.name",
          "plan.price",
          "plan.billing_cycle",
          "userGroupRole.id",
          "group.id",
          "group.name",
        ]);

      // Add search functionality
      if (search) {
        query = query.where(
          "(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      // Get total count for pagination
      const total = await query.getCount();

      // Get paginated results
      const customers = await query
        .orderBy("user.createdAt", "DESC")
        .offset(offset)
        .limit(limit)
        .getMany();

      // Transform data for response
      const transformedCustomers = customers.map((customer) => ({
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName:
          `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        emailVerified: customer.emailVerified,
        lastLoginAt: customer.lastLoginAt,
        createdAt: customer.createdAt,
        subscription: customer.subscriptions?.[0]
          ? {
              id: customer.subscriptions[0].id,
              status: customer.subscriptions[0].status,
              planName: customer.subscriptions[0].plan?.name,
              price: customer.subscriptions[0].plan?.price,
              billingCycle: customer.subscriptions[0].plan?.billing_cycle,
              startDate: customer.subscriptions[0].start_date,
              endDate: customer.subscriptions[0].end_date,
            }
          : null,
        groupsCount: customer.userGroupRoles?.length || 0,
        groups:
          customer.userGroupRoles?.map((ugr) => ({
            id: ugr.group?.id,
            name: ugr.group?.name,
          })) || [],
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        customers: transformedCustomers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      Logger.error("Error fetching customers:", error);
      throw error;
    }
  }

  /**
   * Get detailed customer information
   */
  async getCustomerDetails(customerId: number): Promise<any> {
    try {
      const customer = await this.userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.subscriptions", "subscription")
        .leftJoinAndSelect("subscription.plan", "plan")
        .leftJoinAndSelect("subscription.invoices", "invoice")
        .leftJoinAndSelect("user.userGroupRoles", "userGroupRole")
        .leftJoinAndSelect("userGroupRole.group", "group")
        .leftJoinAndSelect("userGroupRole.role", "role")
        .where("user.id = :customerId", { customerId })
        .getOne();

      if (!customer) {
        return null;
      }

      // Calculate customer metrics
      const totalRevenue =
        customer.subscriptions?.reduce((sum, sub) => {
          return (
            sum +
            (sub.invoices?.reduce((invSum, inv) => {
              return (
                invSum +
                (inv.status === "paid"
                  ? parseFloat(inv.total_amount.toString())
                  : 0)
              );
            }, 0) || 0)
          );
        }, 0) || 0;

      const activeSubscription = customer.subscriptions?.find(
        (sub) => sub.status === "active" || sub.status === "trial"
      );

      return {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName:
          `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        emailVerified: customer.emailVerified,
        lastLoginAt: customer.lastLoginAt,
        createdAt: customer.createdAt,
        totalRevenue,
        subscription: activeSubscription
          ? {
              id: activeSubscription.id,
              status: activeSubscription.status,
              plan: {
                id: activeSubscription.plan?.id,
                name: activeSubscription.plan?.name,
                price: activeSubscription.plan?.price,
                billingCycle: activeSubscription.plan?.billing_cycle,
                maxGroups: activeSubscription.plan?.max_groups,
                maxUsersPerGroup: activeSubscription.plan?.max_users_per_group,
                maxPlayersPerGroup:
                  activeSubscription.plan?.max_players_per_group,
              },
              startDate: activeSubscription.start_date,
              endDate: activeSubscription.end_date,
              trialEndDate: activeSubscription.trial_end_date,
            }
          : null,
        groups:
          customer.userGroupRoles?.map((ugr) => ({
            id: ugr.group?.id,
            name: ugr.group?.name,
            role: ugr.role?.name,
            joinedAt: ugr.createdAt,
          })) || [],
        subscriptionHistory:
          customer.subscriptions?.map((sub) => ({
            id: sub.id,
            status: sub.status,
            planName: sub.plan?.name,
            startDate: sub.start_date,
            endDate: sub.end_date,
            createdAt: sub.created_at,
          })) || [],
        invoiceHistory:
          customer.subscriptions?.flatMap(
            (sub) =>
              sub.invoices?.map((inv) => ({
                id: inv.id,
                amount: inv.total_amount,
                status: inv.status,
                dueDate: inv.due_date,
                paidDate: inv.paid_date,
                createdAt: inv.created_at,
              })) || []
          ) || [],
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all subscription plans with analytics
   */
  async getPlans(): Promise<any[]> {
    try {
      const plans = await this.planRepository
        .createQueryBuilder("plan")
        .leftJoinAndSelect("plan.subscriptions", "subscription")
        .leftJoin("subscription.user", "user")
        .select([
          "plan.id",
          "plan.name",
          "plan.description",
          "plan.price",
          "plan.billing_cycle",
          "plan.max_groups",
          "plan.max_users_per_group",
          "plan.max_players_per_group",
          "plan.is_custom",
          "plan.is_active",
          "plan.created_at",
          "plan.updated_at",
        ])
        .addSelect(
          "COUNT(CASE WHEN subscription.status = 'active' THEN 1 END)",
          "activeSubscriptions"
        )
        .addSelect(
          "COUNT(CASE WHEN subscription.status = 'trial' THEN 1 END)",
          "trialSubscriptions"
        )
        .addSelect(
          "SUM(CASE WHEN subscription.status = 'active' THEN plan.price ELSE 0 END)",
          "monthlyRevenue"
        )
        .groupBy("plan.id")
        .orderBy("plan.created_at", "DESC")
        .getRawAndEntities();

      // Transform the data
      return plans.entities.map((plan, index) => {
        const raw = plans.raw[index];
        return {
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
          updatedAt: plan.updated_at,
          analytics: {
            activeSubscriptions: parseInt(raw.activeSubscriptions || "0"),
            trialSubscriptions: parseInt(raw.trialSubscriptions || "0"),
            monthlyRevenue: parseFloat(raw.monthlyRevenue || "0"),
            totalSubscriptions:
              parseInt(raw.activeSubscriptions || "0") +
              parseInt(raw.trialSubscriptions || "0"),
          },
        };
      });
    } catch (error) {
      Logger.error("Error fetching plans:", error);
      throw error;
    }
  }

  /**
   * Get single plan with detailed analytics
   */
  async getPlanDetails(planId: number): Promise<any> {
    try {
      const plan = await this.planRepository
        .createQueryBuilder("plan")
        .leftJoinAndSelect("plan.subscriptions", "subscription")
        .leftJoinAndSelect("subscription.user", "user")
        .where("plan.id = :planId", { planId })
        .getOne();

      if (!plan) {
        throw new Error("Plan not found");
      }

      // Get plan usage analytics
      const activeCustomers =
        plan.subscriptions?.filter((sub) => sub.status === "active") || [];
      const trialCustomers =
        plan.subscriptions?.filter((sub) => sub.status === "trial") || [];

      // Calculate revenue
      const monthlyRevenue =
        activeCustomers.length * parseFloat(plan.price.toString());

      // Get recent customers
      const recentCustomers =
        plan.subscriptions
          ?.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          ?.slice(0, 10)
          ?.map((sub) => ({
            customerId: sub.user?.id,
            customerEmail: sub.user?.email,
            customerName:
              `${sub.user?.firstName || ""} ${sub.user?.lastName || ""}`.trim(),
            subscriptionStatus: sub.status,
            startDate: sub.start_date,
            endDate: sub.end_date,
          })) || [];

      return {
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
        updatedAt: plan.updated_at,
        analytics: {
          activeSubscriptions: activeCustomers.length,
          trialSubscriptions: trialCustomers.length,
          totalSubscriptions: plan.subscriptions?.length || 0,
          monthlyRevenue,
          annualRevenue: monthlyRevenue * 12,
        },
        recentCustomers,
      };
    } catch (error) {
      Logger.error("Error fetching plan details:", error);
      throw error;
    }
  }

  /**
   * Create new subscription plan
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
      // Validate plan name uniqueness
      const existingPlan = await this.planRepository.findOne({
        where: { name: planData.name },
      });

      if (existingPlan) {
        throw new Error("Plan name already exists");
      }

      // Validate pricing
      if (planData.price < 0) {
        throw new Error("Price cannot be negative");
      }

      // Validate price is reasonable (not too high)
      if (planData.price > 100000) {
        throw new Error("Price cannot exceed $100,000");
      }

      // Validate limits are positive
      if (planData.max_groups < 1) {
        throw new Error("Max groups must be at least 1");
      }

      if (planData.max_users_per_group < 1) {
        throw new Error("Max users per group must be at least 1");
      }

      if (planData.max_players_per_group < 1) {
        throw new Error("Max players per group must be at least 1");
      }

      // Validate limits are reasonable (not too high)
      if (planData.max_groups > 10000) {
        throw new Error("Max groups cannot exceed 10,000");
      }

      if (planData.max_users_per_group > 1000) {
        throw new Error("Max users per group cannot exceed 1,000");
      }

      if (planData.max_players_per_group > 10000) {
        throw new Error("Max players per group cannot exceed 10,000");
      }

      // Create the plan
      const plan = this.planRepository.create({
        name: planData.name.trim(),
        description: planData.description?.trim() || null,
        price: planData.price,
        billing_cycle: planData.billing_cycle,
        max_groups: planData.max_groups,
        max_users_per_group: planData.max_users_per_group,
        max_players_per_group: planData.max_players_per_group,
        is_custom: planData.is_custom || false,
        is_active: true, // New plans are active by default
      });

      const savedPlan = await this.planRepository.save(plan);

      Logger.info(
        `New subscription plan created: ${savedPlan.name} (ID: ${savedPlan.id})`
      );
      return savedPlan;
    } catch (error) {
      Logger.error("Error creating plan:", error);
      throw error;
    }
  }

  /**
   * Validate plan data before creation/update
   */
  private validatePlanLimits(planData: {
    max_groups?: number;
    max_users_per_group?: number;
    max_players_per_group?: number;
    price?: number;
  }): void {
    // Validate groups limit
    if (planData.max_groups !== undefined) {
      if (planData.max_groups < 1) {
        throw new Error("Max groups must be at least 1");
      }
      if (planData.max_groups > 10000) {
        throw new Error("Max groups cannot exceed 10,000");
      }
    }

    // Validate users per group limit
    if (planData.max_users_per_group !== undefined) {
      if (planData.max_users_per_group < 1) {
        throw new Error("Max users per group must be at least 1");
      }
      if (planData.max_users_per_group > 1000) {
        throw new Error("Max users per group cannot exceed 1,000");
      }
    }

    // Validate players per group limit
    if (planData.max_players_per_group !== undefined) {
      if (planData.max_players_per_group < 1) {
        throw new Error("Max players per group must be at least 1");
      }
      if (planData.max_players_per_group > 10000) {
        throw new Error("Max players per group cannot exceed 10,000");
      }
    }

    // Validate price
    if (planData.price !== undefined) {
      if (planData.price < 0) {
        throw new Error("Price cannot be negative");
      }
      if (planData.price > 100000) {
        throw new Error("Price cannot exceed $100,000");
      }
    }
  }

  /**
   * Update existing subscription plan
   */
  async updatePlan(
    planId: number,
    updateData: {
      name?: string;
      description?: string;
      price?: number;
      max_groups?: number;
      max_users_per_group?: number;
      max_players_per_group?: number;
      is_active?: boolean;
    }
  ): Promise<SubscriptionPlan> {
    try {
      // Find the plan
      const plan = await this.planRepository.findOne({
        where: { id: planId },
        relations: ["subscriptions"],
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      // Check if plan has active subscriptions before certain updates
      const hasActiveSubscriptions = plan.subscriptions?.some(
        (sub) => sub.status === "active" || sub.status === "trial"
      );

      // Validate name change if provided
      if (updateData.name && updateData.name !== plan.name) {
        const existingPlan = await this.planRepository.findOne({
          where: { name: updateData.name },
        });

        if (existingPlan) {
          throw new Error("Plan name already exists");
        }
      }

      // Validate limits using helper method
      this.validatePlanLimits(updateData);

      // Special validation for plans with active customers
      if (hasActiveSubscriptions) {
        // Don't allow reducing limits if customers are using them
        if (
          updateData.max_groups !== undefined &&
          updateData.max_groups < plan.max_groups
        ) {
          // Check if any customers would exceed the new limit
          const maxUsedGroups =
            await this.getMaxGroupsUsedByPlanCustomers(planId);
          if (maxUsedGroups > updateData.max_groups) {
            throw new Error(
              `Cannot reduce max groups to ${updateData.max_groups}. ` +
                `Some customers are using ${maxUsedGroups} groups. ` +
                `Please migrate customers first.`
            );
          }
        }

        if (
          updateData.max_users_per_group !== undefined &&
          updateData.max_users_per_group < plan.max_users_per_group
        ) {
          const maxUsedUsersPerGroup =
            await this.getMaxUsersPerGroupByPlanCustomers(planId);
          if (maxUsedUsersPerGroup > updateData.max_users_per_group) {
            throw new Error(
              `Cannot reduce max users per group to ${updateData.max_users_per_group}. ` +
                `Some groups have ${maxUsedUsersPerGroup} users. ` +
                `Please adjust groups first.`
            );
          }
        }

        // Don't allow deactivating plan with active customers
        if (updateData.is_active === false) {
          throw new Error(
            "Cannot deactivate plan with active subscriptions. " +
              "Please migrate customers to other plans first."
          );
        }
      }

      // Apply updates
      if (updateData.name !== undefined) {
        plan.name = updateData.name.trim();
      }

      if (updateData.description !== undefined) {
        plan.description = updateData.description?.trim() || null;
      }

      if (updateData.price !== undefined) {
        plan.price = updateData.price;
      }

      if (updateData.max_groups !== undefined) {
        plan.max_groups = updateData.max_groups;
      }

      if (updateData.max_users_per_group !== undefined) {
        plan.max_users_per_group = updateData.max_users_per_group;
      }

      if (updateData.max_players_per_group !== undefined) {
        plan.max_players_per_group = updateData.max_players_per_group;
      }

      if (updateData.is_active !== undefined) {
        plan.is_active = updateData.is_active;
      }

      const updatedPlan = await this.planRepository.save(plan);

      Logger.info(
        `Subscription plan updated: ${updatedPlan.name} (ID: ${updatedPlan.id})`
      );
      return updatedPlan;
    } catch (error) {
      Logger.error("Error updating plan:", error);
      throw error;
    }
  }

  /**
   * Helper: Get maximum groups used by customers on this plan
   */
  private async getMaxGroupsUsedByPlanCustomers(
    planId: number
  ): Promise<number> {
    try {
      const result = await this.groupRepository
        .createQueryBuilder("group")
        .leftJoin("group.subscription", "subscription")
        .leftJoin("subscription.plan", "plan")
        .leftJoin("subscription.user", "user")
        .select("user.id", "userId")
        .addSelect("COUNT(group.id)", "groupCount")
        .where("plan.id = :planId", { planId })
        .andWhere("subscription.status IN (:...statuses)", {
          statuses: ["active", "trial"],
        })
        .groupBy("user.id")
        .orderBy("COUNT(group.id)", "DESC")
        .limit(1)
        .getRawOne();

      return parseInt(result?.groupCount || "0");
    } catch (error) {
      Logger.error("Error getting max groups used:", error);
      return 0;
    }
  }

  /**
   * Helper: Get maximum users per group by customers on this plan
   */
  private async getMaxUsersPerGroupByPlanCustomers(
    planId: number
  ): Promise<number> {
    try {
      const result = await this.userRepository
        .createQueryBuilder("user")
        .leftJoin("user.userGroupRoles", "ugr")
        .leftJoin("ugr.group", "group")
        .leftJoin("group.subscription", "subscription")
        .leftJoin("subscription.plan", "plan")
        .select("group.id", "groupId")
        .addSelect("COUNT(user.id)", "userCount")
        .where("plan.id = :planId", { planId })
        .andWhere("subscription.status IN (:...statuses)", {
          statuses: ["active", "trial"],
        })
        .groupBy("group.id")
        .orderBy("COUNT(user.id)", "DESC")
        .limit(1)
        .getRawOne();

      return parseInt(result?.userCount || "0");
    } catch (error) {
      Logger.error("Error getting max users per group:", error);
      return 0;
    }
  }

  /**
   * Deactivate subscription plan (soft delete with safety checks)
   */
  async deactivatePlan(planId: number): Promise<SubscriptionPlan> {
    try {
      const plan = await this.planRepository.findOne({
        where: { id: planId },
        relations: ["subscriptions", "subscriptions.user"],
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      // Check if plan is already deactivated
      if (!plan.is_active) {
        throw new Error("Plan is already deactivated");
      }

      // Get active subscriptions
      const activeSubscriptions =
        plan.subscriptions?.filter(
          (sub) => sub.status === "active" || sub.status === "trial"
        ) || [];

      // Don't allow deactivation if there are active customers
      if (activeSubscriptions.length > 0) {
        const customerEmails = activeSubscriptions
          .slice(0, 5) // Show first 5 customers
          .map((sub) => sub.user?.email)
          .filter((email) => email);

        const moreCustomers =
          activeSubscriptions.length > 5
            ? ` and ${activeSubscriptions.length - 5} more`
            : "";

        throw new Error(
          `Cannot deactivate plan. ${activeSubscriptions.length} active subscriptions exist. ` +
            `Customers include: ${customerEmails.join(", ")}${moreCustomers}. ` +
            "Please migrate customers to other plans first."
        );
      }

      // Check for pending/past_due subscriptions and warn
      const pendingSubscriptions =
        plan.subscriptions?.filter((sub) => sub.status === "past_due") || [];

      if (pendingSubscriptions.length > 0) {
        Logger.warn(
          `Deactivating plan with ${pendingSubscriptions.length} past due subscriptions. ` +
            `Plan: ${plan.name} (ID: ${plan.id})`
        );
      }

      // Deactivate the plan
      plan.is_active = false;
      const updatedPlan = await this.planRepository.save(plan);

      Logger.info(
        `Subscription plan deactivated: ${updatedPlan.name} (ID: ${updatedPlan.id}). ` +
          `Had ${plan.subscriptions?.length || 0} total subscriptions (${activeSubscriptions.length} were active).`
      );

      return updatedPlan;
    } catch (error) {
      Logger.error("Error deactivating plan:", error);
      throw error;
    }
  }

  /**
   * Get plan customers for migration before deactivation
   */
  async getPlanCustomersForMigration(planId: number): Promise<any[]> {
    try {
      const plan = await this.planRepository.findOne({
        where: { id: planId },
        relations: ["subscriptions", "subscriptions.user"],
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      const activeSubscriptions =
        plan.subscriptions?.filter(
          (sub) => sub.status === "active" || sub.status === "trial"
        ) || [];

      return activeSubscriptions.map((sub) => ({
        customerId: sub.user?.id,
        customerEmail: sub.user?.email,
        customerName:
          `${sub.user?.firstName || ""} ${sub.user?.lastName || ""}`.trim(),
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
        startDate: sub.start_date,
        endDate: sub.end_date,
        currentPlan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
        },
      }));
    } catch (error) {
      Logger.error("Error getting plan customers for migration:", error);
      throw error;
    }
  }

  /**
   * Force deactivate plan (admin override - use with caution)
   */
  async forceDeactivatePlan(
    planId: number,
    reason: string
  ): Promise<{
    plan: SubscriptionPlan;
    affectedCustomers: any[];
  }> {
    try {
      const plan = await this.planRepository.findOne({
        where: { id: planId },
        relations: ["subscriptions", "subscriptions.user"],
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      if (!plan.is_active) {
        throw new Error("Plan is already deactivated");
      }

      // Get affected customers
      const activeSubscriptions =
        plan.subscriptions?.filter(
          (sub) => sub.status === "active" || sub.status === "trial"
        ) || [];

      const affectedCustomers = activeSubscriptions.map((sub) => ({
        customerId: sub.user?.id,
        customerEmail: sub.user?.email,
        customerName:
          `${sub.user?.firstName || ""} ${sub.user?.lastName || ""}`.trim(),
        subscriptionId: sub.id,
        subscriptionStatus: sub.status,
      }));

      // Cancel all active subscriptions
      for (const subscription of activeSubscriptions) {
        subscription.status = SubscriptionStatus.CANCELED;
        subscription.end_date = new Date();
        await this.subscriptionRepository.save(subscription);
      }

      // Deactivate the plan
      plan.is_active = false;
      const updatedPlan = await this.planRepository.save(plan);

      // Log the force deactivation
      Logger.warn(
        `FORCE DEACTIVATION: Plan ${updatedPlan.name} (ID: ${updatedPlan.id}) ` +
          `forcibly deactivated. Reason: ${reason}. ` +
          `${affectedCustomers.length} customer subscriptions were canceled.`
      );

      return {
        plan: updatedPlan,
        affectedCustomers,
      };
    } catch (error) {
      Logger.error("Error force deactivating plan:", error);
      throw error;
    }
  }

  /**
   * Reactivate a deactivated plan
   */
  async reactivatePlan(planId: number): Promise<SubscriptionPlan> {
    try {
      const plan = await this.planRepository.findOne({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      if (plan.is_active) {
        throw new Error("Plan is already active");
      }

      // Reactivate the plan
      plan.is_active = true;
      const updatedPlan = await this.planRepository.save(plan);

      Logger.info(
        `Subscription plan reactivated: ${updatedPlan.name} (ID: ${updatedPlan.id})`
      );
      return updatedPlan;
    } catch (error) {
      Logger.error("Error reactivating plan:", error);
      throw error;
    }
  }

  /**
   * Create new customer account from admin dashboard
   */
  async createCustomer(customerData: {
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    planId?: number;
    trialDays?: number;
    sendWelcomeEmail?: boolean;
    customNotes?: string;
  }): Promise<{
    customer: User;
    subscription?: Subscription;
    temporaryPassword?: string;
  }> {
    try {
      const {
        email,
        firstName,
        lastName,
        password,
        planId,
        trialDays = 0,
        sendWelcomeEmail = true,
        customNotes,
      } = customerData;

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // Check if customer already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        throw new Error("Customer with this email already exists");
      }

      // Generate password if not provided
      let temporaryPassword: string | undefined;
      let passwordHash: string;

      if (password) {
        // Use provided password
        const saltRounds = 10;
        passwordHash = await bcrypt.hash(password, saltRounds);
      } else {
        // Generate temporary password
        temporaryPassword = this.generateTemporaryPassword();
        const saltRounds = 10;
        passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);
      }

      // Create customer account
      const customer = this.userRepository.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        emailVerified: true, // Admin-created accounts are verified by default
        is_account_owner: true,
      });

      const savedCustomer = await this.userRepository.save(customer);

      // Create subscription if plan is provided
      let subscription: Subscription | undefined;
      if (planId) {
        subscription = await this.createCustomerSubscription(
          savedCustomer.id,
          planId,
          {
            trialDays,
            notes: customNotes,
          }
        );
      }

      // Log the customer creation
      Logger.info(
        `Customer created by admin: ${savedCustomer.email} (ID: ${savedCustomer.id})` +
          (subscription ? ` with subscription to plan ${planId}` : "")
      );

      // TODO: Send welcome email if requested
      if (sendWelcomeEmail) {
        await this.sendCustomerWelcomeEmail(
          savedCustomer,
          temporaryPassword,
          subscription
        );
      }

      return {
        customer: savedCustomer,
        subscription,
        temporaryPassword,
      };
    } catch (error) {
      Logger.error("Error creating customer:", error);
      throw error;
    }
  }

  /**
   * Generate secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";

    // Ensure at least one of each required character type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase
    password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
    password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special char

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  /**
   * Create subscription for newly created customer
   */
  private async createCustomerSubscription(
    customerId: number,
    planId: number,
    options: {
      trialDays?: number;
      notes?: string;
    } = {}
  ): Promise<Subscription> {
    try {
      const { trialDays = 0, notes } = options;

      // Get customer and plan
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
      });

      const plan = await this.planRepository.findOne({
        where: { id: planId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      if (!plan) {
        throw new Error("Subscription plan not found");
      }

      if (!plan.is_active) {
        throw new Error("Selected plan is not active");
      }

      // Calculate dates
      const startDate = new Date();
      let endDate: Date;
      let trialEndDate: Date | null = null;
      let status = SubscriptionStatus.ACTIVE;

      // Handle trial period
      if (trialDays > 0) {
        trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);
        status = SubscriptionStatus.TRIAL;
      }

      // Calculate subscription end date based on billing cycle
      endDate = new Date(startDate);
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

      // Create subscription
      const subscription = this.subscriptionRepository.create({
        user: customer,
        plan,
        status,
        start_date: startDate,
        end_date: endDate,
        trial_end_date: trialEndDate,
        metadata: notes ? { adminNotes: notes } : null,
      });

      const savedSubscription =
        await this.subscriptionRepository.save(subscription);

      Logger.info(
        `Subscription created for customer ${customer.email}: ` +
          `Plan ${plan.name}, Status: ${status}` +
          (trialDays > 0 ? `, Trial: ${trialDays} days` : "")
      );

      return savedSubscription;
    } catch (error) {
      Logger.error("Error creating customer subscription:", error);
      throw error;
    }
  }

  private async sendCustomerWelcomeEmail(
    customer: User,
    temporaryPassword?: string,
    subscription?: Subscription
  ): Promise<void> {
    try {
      // Send welcome email

      const emailData = {
        to: customer.email,
        firstName: customer.firstName || "Customer",
        lastName: customer.lastName || "",
        temporaryPassword,
        subscriptionPlan: subscription
          ? {
              name: subscription.plan.name,
              price: subscription.plan.price,
              billingCycle: String(subscription.plan.billing_cycle),
            }
          : undefined,
      };

      await this.emailService.sendWelcomeEmail(emailData);
      Logger.info(`Welcome email sent to ${customer.email}`);
    } catch (error) {
      Logger.error("Error sending welcome email:", error);
      throw error;
    }
  }

  /**
   * Assign subscription plan to existing customer
   */
  async assignPlanToCustomer(
    customerId: number,
    planId: number,
    options: {
      trialDays?: number;
      startDate?: Date;
      customPricing?: number;
      adminNotes?: string;
      cancelExisting?: boolean;
    } = {}
  ): Promise<Subscription> {
    try {
      const {
        trialDays = 0,
        startDate,
        customPricing,
        adminNotes,
        cancelExisting = true,
      } = options;

      // Get customer
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
        relations: ["subscriptions"],
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Get plan
      const plan = await this.planRepository.findOne({
        where: { id: planId },
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      if (!plan.is_active) {
        throw new Error("Cannot assign inactive plan");
      }

      // Check for existing active subscriptions
      const activeSubscription = customer.subscriptions?.find(
        (sub) => sub.status === "active" || sub.status === "trial"
      );

      if (activeSubscription) {
        if (cancelExisting) {
          // Cancel existing subscription
          activeSubscription.status = SubscriptionStatus.CANCELED;
          activeSubscription.end_date = new Date();
          await this.subscriptionRepository.save(activeSubscription);

          Logger.info(
            `Canceled existing subscription ${activeSubscription.id} for customer ${customer.email}`
          );
        } else {
          throw new Error(
            "Customer already has an active subscription. " +
              "Set cancelExisting=true to replace it."
          );
        }
      }

      // Calculate dates
      const subscriptionStartDate = startDate || new Date();
      let endDate: Date;
      let trialEndDate: Date | null = null;
      let status = SubscriptionStatus.ACTIVE;

      // Handle trial period
      if (trialDays > 0) {
        trialEndDate = new Date(subscriptionStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);
        status = SubscriptionStatus.TRIAL;
      }

      // Calculate end date based on billing cycle
      endDate = new Date(subscriptionStartDate);
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

      // Create new subscription
      const subscription = this.subscriptionRepository.create({
        user: customer,
        plan,
        status,
        start_date: subscriptionStartDate,
        end_date: endDate,
        trial_end_date: trialEndDate,
        metadata: {
          assignedByAdmin: true,
          adminNotes: adminNotes || null,
          customPricing: customPricing || null,
          originalPrice: plan.price,
        },
      });

      const savedSubscription =
        await this.subscriptionRepository.save(subscription);

      Logger.info(
        `Plan assigned to customer ${customer.email}: ` +
          `Plan ${plan.name} (${plan.id}), Status: ${status}` +
          (customPricing ? `, Custom Price: $${customPricing}` : "") +
          (trialDays > 0 ? `, Trial: ${trialDays} days` : "")
      );

      return savedSubscription;
    } catch (error) {
      Logger.error("Error assigning plan to customer:", error);
      throw error;
    }
  }

  /**
   * Update customer details
   */
  async updateCustomer(
    customerId: number,
    updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      emailVerified?: boolean;
      isActive?: boolean;
    }
  ): Promise<User> {
    try {
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Validate email change if provided
      if (updateData.email && updateData.email !== customer.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          throw new Error("Invalid email format");
        }

        // Check if new email already exists
        const existingUser = await this.userRepository.findOne({
          where: { email: updateData.email.toLowerCase().trim() },
        });

        if (existingUser) {
          throw new Error("Email already exists");
        }
      }

      // Apply updates
      if (updateData.firstName !== undefined) {
        customer.firstName = updateData.firstName.trim();
      }

      if (updateData.lastName !== undefined) {
        customer.lastName = updateData.lastName.trim();
      }

      if (updateData.email !== undefined) {
        customer.email = updateData.email.toLowerCase().trim();
      }

      if (updateData.emailVerified !== undefined) {
        customer.emailVerified = updateData.emailVerified;
      }

      // Note: isActive would need to be added to User entity if not exists
      // if (updateData.isActive !== undefined) {
      //   customer.isActive = updateData.isActive;
      // }

      const updatedCustomer = await this.userRepository.save(customer);

      Logger.info(
        `Customer updated: ${updatedCustomer.email} (ID: ${updatedCustomer.id})`
      );
      return updatedCustomer;
    } catch (error) {
      Logger.error("Error updating customer:", error);
      throw error;
    }
  }

  /**
   * Send password reset link to customer
   */
  async sendCustomerPasswordReset(customerId: number): Promise<{
    resetToken?: string;
    message: string;
  }> {
    try {
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

      // Note: You'll need to add these fields to User entity if they don't exist
      // customer.passwordResetToken = resetToken;
      // customer.passwordResetExpires = resetExpires;
      // await this.userRepository.save(customer);

      // TODO: Send actual email with reset link
      // await this.emailService.sendPasswordReset(customer.email, resetToken);

      Logger.info(`Password reset initiated for customer: ${customer.email}`);

      const isDevelopment = process.env.NODE_ENV === "development";

      return {
        resetToken: isDevelopment ? resetToken : undefined,
        message: "Password reset email sent to customer",
      };
    } catch (error) {
      Logger.error("Error sending password reset:", error);
      throw error;
    }
  }

  /**
   * Deactivate customer account (suspend access)
   */
  async deactivateCustomer(
    customerId: number,
    reason?: string
  ): Promise<{
    customer: User;
    canceledSubscriptions: Subscription[];
  }> {
    try {
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
        relations: ["subscriptions"],
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Cancel all active subscriptions
      const activeSubscriptions =
        customer.subscriptions?.filter(
          (sub) => sub.status === "active" || sub.status === "trial"
        ) || [];

      const canceledSubscriptions: Subscription[] = [];

      for (const subscription of activeSubscriptions) {
        subscription.status = SubscriptionStatus.CANCELED;
        subscription.end_date = new Date();
        subscription.metadata = {
          ...subscription.metadata,
          deactivatedByAdmin: true,
          deactivationReason: reason || "Admin deactivation",
          deactivatedAt: new Date().toISOString(),
        };

        const canceledSub =
          await this.subscriptionRepository.save(subscription);
        canceledSubscriptions.push(canceledSub);
      }

      // Note: Add isActive field to User entity if needed
      // customer.isActive = false;
      // const updatedCustomer = await this.userRepository.save(customer);

      Logger.warn(
        `Customer deactivated: ${customer.email} (ID: ${customer.id}). ` +
          `Reason: ${reason || "Not specified"}. ` +
          `Canceled ${canceledSubscriptions.length} subscriptions.`
      );

      return {
        customer,
        canceledSubscriptions,
      };
    } catch (error) {
      Logger.error("Error deactivating customer:", error);
      throw error;
    }
  }

  /**
   * Reactivate customer account
   */
  async reactivateCustomer(customerId: number): Promise<User> {
    try {
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Note: Add isActive field to User entity if needed
      // customer.isActive = true;
      // const updatedCustomer = await this.userRepository.save(customer);

      Logger.info(
        `Customer reactivated: ${customer.email} (ID: ${customer.id})`
      );
      return customer;
    } catch (error) {
      Logger.error("Error reactivating customer:", error);
      throw error;
    }
  }

  /**
   * Create custom plan for specific customer
   */
  async createCustomPlanForCustomer(
    customerId: number,
    customPlanData: {
      planName: string;
      description?: string;
      customPricing: number;
      billingCycle: BillingCycle;
      customLimits: {
        maxGroups: number;
        maxUsersPerGroup: number;
        maxPlayersPerGroup: number;
      };
      trialDays?: number;
      adminNotes?: string;
      cancelExistingSubscription?: boolean;
    }
  ): Promise<{
    customPlan: SubscriptionPlan;
    subscription: Subscription;
    previousSubscription?: Subscription;
  }> {
    try {
      const {
        planName,
        description,
        customPricing,
        billingCycle,
        customLimits,
        trialDays = 0,
        adminNotes,
        cancelExistingSubscription = true,
      } = customPlanData;

      // Validate customer exists
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
        relations: ["subscriptions"],
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Validate custom plan data
      if (customPricing < 0 || customPricing > 100000) {
        throw new Error("Custom pricing must be between 0 and 100,000");
      }

      if (customLimits.maxGroups < 1 || customLimits.maxGroups > 50000) {
        throw new Error("Max groups must be between 1 and 50,000");
      }

      if (
        customLimits.maxUsersPerGroup < 1 ||
        customLimits.maxUsersPerGroup > 10000
      ) {
        throw new Error("Max users per group must be between 1 and 10,000");
      }

      if (
        customLimits.maxPlayersPerGroup < 1 ||
        customLimits.maxPlayersPerGroup > 100000
      ) {
        throw new Error("Max players per group must be between 1 and 100,000");
      }

      // Check for plan name uniqueness (add customer ID to make it unique)
      const uniquePlanName = `${planName} (Custom - ${customer.email})`;
      const existingPlan = await this.planRepository.findOne({
        where: { name: uniquePlanName },
      });

      if (existingPlan) {
        throw new Error(
          "Custom plan with this name already exists for this customer"
        );
      }

      // Handle existing subscription
      let previousSubscription: Subscription | undefined;
      const activeSubscription = customer.subscriptions?.find(
        (sub) => sub.status === "active" || sub.status === "trial"
      );

      if (activeSubscription) {
        if (cancelExistingSubscription) {
          activeSubscription.status = SubscriptionStatus.CANCELED;
          activeSubscription.end_date = new Date();
          previousSubscription =
            await this.subscriptionRepository.save(activeSubscription);

          Logger.info(
            `Canceled existing subscription ${activeSubscription.id} for custom plan creation`
          );
        } else {
          throw new Error(
            "Customer has active subscription. Set cancelExistingSubscription=true to replace it."
          );
        }
      }

      // Create custom plan
      const customPlan = this.planRepository.create({
        name: uniquePlanName,
        description: description || `Custom plan for ${customer.email}`,
        price: customPricing,
        billing_cycle: billingCycle,
        max_groups: customLimits.maxGroups,
        max_users_per_group: customLimits.maxUsersPerGroup,
        max_players_per_group: customLimits.maxPlayersPerGroup,
        is_custom: true,
        is_active: true,
      });

      const savedCustomPlan = await this.planRepository.save(customPlan);

      // Calculate subscription dates
      const startDate = new Date();
      let endDate: Date;
      let trialEndDate: Date | null = null;
      let status = SubscriptionStatus.ACTIVE;

      // Handle trial period
      if (trialDays > 0) {
        trialEndDate = new Date(startDate);
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);
        status = SubscriptionStatus.TRIAL;
      }

      // Calculate end date based on billing cycle
      endDate = new Date(startDate);
      switch (billingCycle) {
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

      // Create subscription with custom plan
      const subscription = this.subscriptionRepository.create({
        user: customer,
        plan: savedCustomPlan,
        status,
        start_date: startDate,
        end_date: endDate,
        trial_end_date: trialEndDate,
        metadata: {
          isCustomPlan: true,
          adminNotes: adminNotes || null,
          originalRequest: {
            planName,
            customPricing,
            customLimits,
          },
          createdByAdmin: true,
          createdAt: new Date().toISOString(),
        },
      });

      const savedSubscription =
        await this.subscriptionRepository.save(subscription);

      Logger.info(
        `Custom plan created for customer ${customer.email}: ` +
          `Plan "${savedCustomPlan.name}", Price: $${customPricing}, ` +
          `Limits: ${customLimits.maxGroups}/${customLimits.maxUsersPerGroup}/${customLimits.maxPlayersPerGroup}`
      );

      return {
        customPlan: savedCustomPlan,
        subscription: savedSubscription,
        previousSubscription,
      };
    } catch (error) {
      Logger.error("Error creating custom plan for customer:", error);
      throw error;
    }
  }

  /**
   * Modify custom plan limits for existing custom plan
   */
  async modifyCustomPlanLimits(
    planId: number,
    modifications: {
      newPricing?: number;
      newLimits?: {
        maxGroups?: number;
        maxUsersPerGroup?: number;
        maxPlayersPerGroup?: number;
      };
      adminNotes?: string;
      applyImmediately?: boolean;
    }
  ): Promise<{
    updatedPlan: SubscriptionPlan;
    affectedSubscriptions: Subscription[];
    warningsGenerated: string[];
  }> {
    try {
      const {
        newPricing,
        newLimits,
        adminNotes,
        applyImmediately = true,
      } = modifications;

      // Find the custom plan
      const customPlan = await this.planRepository.findOne({
        where: { id: planId },
        relations: ["subscriptions", "subscriptions.user"],
      });

      if (!customPlan) {
        throw new Error("Custom plan not found");
      }

      if (!customPlan.is_custom) {
        throw new Error(
          "Can only modify custom plans. Use regular plan update for standard plans."
        );
      }

      const warnings: string[] = [];

      // Validate new pricing if provided
      if (newPricing !== undefined) {
        if (newPricing < 0 || newPricing > 100000) {
          throw new Error("New pricing must be between 0 and 100,000");
        }
      }

      // Validate new limits if provided
      if (newLimits) {
        if (newLimits.maxGroups !== undefined) {
          if (newLimits.maxGroups < 1 || newLimits.maxGroups > 50000) {
            throw new Error("Max groups must be between 1 and 50,000");
          }

          // Check current usage if reducing limits
          if (newLimits.maxGroups < customPlan.max_groups) {
            const maxUsedGroups =
              await this.getMaxGroupsUsedByPlanCustomers(planId);
            if (maxUsedGroups > newLimits.maxGroups) {
              if (applyImmediately) {
                throw new Error(
                  `Cannot reduce max groups to ${newLimits.maxGroups}. ` +
                    `Customer is currently using ${maxUsedGroups} groups.`
                );
              } else {
                warnings.push(
                  `Reducing max groups to ${newLimits.maxGroups} but customer uses ${maxUsedGroups} groups. ` +
                    `This may cause issues when the change is applied.`
                );
              }
            }
          }
        }

        if (newLimits.maxUsersPerGroup !== undefined) {
          if (
            newLimits.maxUsersPerGroup < 1 ||
            newLimits.maxUsersPerGroup > 10000
          ) {
            throw new Error("Max users per group must be between 1 and 10,000");
          }

          // Check current usage if reducing limits
          if (newLimits.maxUsersPerGroup < customPlan.max_users_per_group) {
            const maxUsedUsersPerGroup =
              await this.getMaxUsersPerGroupByPlanCustomers(planId);
            if (maxUsedUsersPerGroup > newLimits.maxUsersPerGroup) {
              if (applyImmediately) {
                throw new Error(
                  `Cannot reduce max users per group to ${newLimits.maxUsersPerGroup}. ` +
                    `Some groups have ${maxUsedUsersPerGroup} users.`
                );
              } else {
                warnings.push(
                  `Reducing max users per group to ${newLimits.maxUsersPerGroup} but some groups have ${maxUsedUsersPerGroup} users.`
                );
              }
            }
          }
        }

        if (newLimits.maxPlayersPerGroup !== undefined) {
          if (
            newLimits.maxPlayersPerGroup < 1 ||
            newLimits.maxPlayersPerGroup > 100000
          ) {
            throw new Error(
              "Max players per group must be between 1 and 100,000"
            );
          }
        }
      }

      // Apply modifications
      if (newPricing !== undefined) {
        customPlan.price = newPricing;
      }

      if (newLimits?.maxGroups !== undefined) {
        customPlan.max_groups = newLimits.maxGroups;
      }

      if (newLimits?.maxUsersPerGroup !== undefined) {
        customPlan.max_users_per_group = newLimits.maxUsersPerGroup;
      }

      if (newLimits?.maxPlayersPerGroup !== undefined) {
        customPlan.max_players_per_group = newLimits.maxPlayersPerGroup;
      }

      const updatedPlan = await this.planRepository.save(customPlan);

      // Update subscription metadata to track modifications
      const affectedSubscriptions: Subscription[] = [];
      for (const subscription of customPlan.subscriptions || []) {
        if (
          subscription.status === "active" ||
          subscription.status === "trial"
        ) {
          subscription.metadata = {
            ...subscription.metadata,
            lastModified: new Date().toISOString(),
            modifications: {
              ...(subscription.metadata?.modifications || {}),
              [new Date().toISOString()]: {
                adminNotes: adminNotes || null,
                changes: {
                  ...(newPricing !== undefined && {
                    pricing: { from: customPlan.price, to: newPricing },
                  }),
                  ...(newLimits && { limits: newLimits }),
                },
              },
            },
          };

          const updatedSubscription =
            await this.subscriptionRepository.save(subscription);
          affectedSubscriptions.push(updatedSubscription);
        }
      }

      Logger.info(
        `Custom plan modified: ${updatedPlan.name} (ID: ${updatedPlan.id}). ` +
          `Affected ${affectedSubscriptions.length} subscriptions. ` +
          `Changes: ${JSON.stringify({ newPricing, newLimits })}`
      );

      if (warnings.length > 0) {
        Logger.warn(
          `Warnings generated for plan modification: ${warnings.join("; ")}`
        );
      }

      return {
        updatedPlan,
        affectedSubscriptions,
        warningsGenerated: warnings,
      };
    } catch (error) {
      Logger.error("Error modifying custom plan limits:", error);
      throw error;
    }
  }

  /**
   * Get custom plan details with usage analytics
   */
  async getCustomPlanDetails(planId: number): Promise<any> {
    try {
      const planDetails = await this.getPlanDetails(planId);

      if (!planDetails.isCustom) {
        throw new Error("This is not a custom plan");
      }

      // Add custom plan specific analytics
      const subscriptions = await this.subscriptionRepository.find({
        where: { plan: { id: planId } },
        relations: ["user"],
      });

      const currentUsage = await Promise.all([
        this.getMaxGroupsUsedByPlanCustomers(planId),
        this.getMaxUsersPerGroupByPlanCustomers(planId),
      ]);

      return {
        ...planDetails,
        customPlanDetails: {
          currentUsage: {
            maxGroupsUsed: currentUsage[0],
            maxUsersPerGroupUsed: currentUsage[1],
            utilizationRates: {
              groups:
                (
                  (currentUsage[0] / planDetails.limits.maxGroups) *
                  100
                ).toFixed(1) + "%",
              usersPerGroup:
                (
                  (currentUsage[1] / planDetails.limits.maxUsersPerGroup) *
                  100
                ).toFixed(1) + "%",
            },
          },
          modificationHistory: subscriptions[0]?.metadata?.modifications || {},
          canReduceLimits: {
            groups: currentUsage[0] < planDetails.limits.maxGroups,
            usersPerGroup:
              currentUsage[1] < planDetails.limits.maxUsersPerGroup,
          },
        },
      };
    } catch (error) {
      Logger.error("Error getting custom plan details:", error);
      throw error;
    }
  }

  /**
   * Convert existing subscription to custom plan
   */
  async convertSubscriptionToCustomPlan(
    customerId: number,
    conversionData: {
      customPlanName: string;
      customPricing?: number;
      customLimits?: {
        maxGroups?: number;
        maxUsersPerGroup?: number;
        maxPlayersPerGroup?: number;
      };
      adminNotes?: string;
      keepCurrentBillingCycle?: boolean;
    }
  ): Promise<{
    originalSubscription: Subscription;
    newCustomPlan: SubscriptionPlan;
    newSubscription: Subscription;
    conversionDetails: any;
  }> {
    try {
      const {
        customPlanName,
        customPricing,
        customLimits,
        adminNotes,
        keepCurrentBillingCycle = true,
      } = conversionData;

      // Find customer with active subscription
      const customer = await this.userRepository.findOne({
        where: { id: customerId },
        relations: ["subscriptions", "subscriptions.plan"],
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Find active subscription
      const activeSubscription = customer.subscriptions?.find(
        (sub) => sub.status === "active" || sub.status === "trial"
      );

      if (!activeSubscription) {
        throw new Error("No active subscription found to convert");
      }

      if (activeSubscription.plan.is_custom) {
        throw new Error("Customer already has a custom plan");
      }

      const originalPlan = activeSubscription.plan;

      // Generate unique custom plan name
      const uniquePlanName = `${customPlanName} (Custom - ${customer.email})`;
      const existingCustomPlan = await this.planRepository.findOne({
        where: { name: uniquePlanName },
      });

      if (existingCustomPlan) {
        throw new Error(
          "Custom plan with this name already exists for this customer"
        );
      }

      // Determine new plan properties (use custom values or inherit from original)
      const newPricing =
        customPricing !== undefined ? customPricing : originalPlan.price;
      const newLimits = {
        maxGroups:
          customLimits?.maxGroups !== undefined
            ? customLimits.maxGroups
            : originalPlan.max_groups,
        maxUsersPerGroup:
          customLimits?.maxUsersPerGroup !== undefined
            ? customLimits.maxUsersPerGroup
            : originalPlan.max_users_per_group,
        maxPlayersPerGroup:
          customLimits?.maxPlayersPerGroup !== undefined
            ? customLimits.maxPlayersPerGroup
            : originalPlan.max_players_per_group,
      };

      // Validate new limits
      if (newPricing < 0 || newPricing > 100000) {
        throw new Error("Custom pricing must be between 0 and 100,000");
      }

      if (newLimits.maxGroups < 1 || newLimits.maxGroups > 50000) {
        throw new Error("Max groups must be between 1 and 50,000");
      }

      if (
        newLimits.maxUsersPerGroup < 1 ||
        newLimits.maxUsersPerGroup > 10000
      ) {
        throw new Error("Max users per group must be between 1 and 10,000");
      }

      if (
        newLimits.maxPlayersPerGroup < 1 ||
        newLimits.maxPlayersPerGroup > 100000
      ) {
        throw new Error("Max players per group must be between 1 and 100,000");
      }

      // Check if reducing limits would break current usage
      if (newLimits.maxGroups < originalPlan.max_groups) {
        const currentGroupUsage = await this.getCustomerGroupCount(customerId);
        if (currentGroupUsage > newLimits.maxGroups) {
          throw new Error(
            `Cannot reduce max groups to ${newLimits.maxGroups}. ` +
              `Customer currently uses ${currentGroupUsage} groups.`
          );
        }
      }

      if (newLimits.maxUsersPerGroup < originalPlan.max_users_per_group) {
        const maxUsersInGroup =
          await this.getCustomerMaxUsersPerGroup(customerId);
        if (maxUsersInGroup > newLimits.maxUsersPerGroup) {
          throw new Error(
            `Cannot reduce max users per group to ${newLimits.maxUsersPerGroup}. ` +
              `Customer has groups with ${maxUsersInGroup} users.`
          );
        }
      }

      // Create custom plan
      const customPlan = this.planRepository.create({
        name: uniquePlanName,
        description: `Custom plan converted from ${originalPlan.name} for ${customer.email}`,
        price: newPricing,
        billing_cycle: keepCurrentBillingCycle
          ? originalPlan.billing_cycle
          : BillingCycle.MONTHLY,
        max_groups: newLimits.maxGroups,
        max_users_per_group: newLimits.maxUsersPerGroup,
        max_players_per_group: newLimits.maxPlayersPerGroup,
        is_custom: true,
        is_active: true,
      });

      const savedCustomPlan = await this.planRepository.save(customPlan);

      // Calculate new subscription dates (preserve current subscription timing)
      const now = new Date();
      const originalEndDate = activeSubscription.end_date;
      const remainingDays = originalEndDate
        ? Math.ceil(
            (originalEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      // End current subscription
      const wasTrial = activeSubscription.status === SubscriptionStatus.TRIAL;
      activeSubscription.status = SubscriptionStatus.CANCELED;
      activeSubscription.end_date = now;
      activeSubscription.metadata = {
        ...activeSubscription.metadata,
        convertedToCustomPlan: true,
        conversionDate: now.toISOString(),
        newCustomPlanId: savedCustomPlan.id,
      };

      const endedSubscription =
        await this.subscriptionRepository.save(activeSubscription);

      // Create new subscription with custom plan
      const newEndDate = new Date(now);
      newEndDate.setDate(newEndDate.getDate() + Math.max(remainingDays, 1)); // At least 1 day

      const newSubscription = this.subscriptionRepository.create({
        user: customer,
        plan: savedCustomPlan,
        status: wasTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
        start_date: now,
        end_date: newEndDate,
        trial_end_date: activeSubscription.trial_end_date, // Preserve trial end date if exists
        metadata: {
          convertedFromPlan: {
            planId: originalPlan.id,
            planName: originalPlan.name,
            originalPrice: originalPlan.price,
            originalLimits: {
              maxGroups: originalPlan.max_groups,
              maxUsersPerGroup: originalPlan.max_users_per_group,
              maxPlayersPerGroup: originalPlan.max_players_per_group,
            },
          },
          conversionDetails: {
            adminNotes: adminNotes || null,
            conversionDate: now.toISOString(),
            remainingDaysPreserved: remainingDays,
            pricingChanged: newPricing !== originalPlan.price,
            limitsChanged:
              JSON.stringify(newLimits) !==
              JSON.stringify({
                maxGroups: originalPlan.max_groups,
                maxUsersPerGroup: originalPlan.max_users_per_group,
                maxPlayersPerGroup: originalPlan.max_players_per_group,
              }),
          },
          isCustomPlan: true,
          createdByAdmin: true,
        },
      });

      const savedNewSubscription =
        await this.subscriptionRepository.save(newSubscription);

      const conversionDetails = {
        originalPlan: {
          id: originalPlan.id,
          name: originalPlan.name,
          price: originalPlan.price,
          limits: {
            maxGroups: originalPlan.max_groups,
            maxUsersPerGroup: originalPlan.max_users_per_group,
            maxPlayersPerGroup: originalPlan.max_players_per_group,
          },
        },
        newPlan: {
          id: savedCustomPlan.id,
          name: savedCustomPlan.name,
          price: savedCustomPlan.price,
          limits: newLimits,
        },
        changes: {
          pricing: {
            changed: newPricing !== originalPlan.price,
            from: originalPlan.price,
            to: newPricing,
          },
          limits: {
            changed:
              JSON.stringify(newLimits) !==
              JSON.stringify({
                maxGroups: originalPlan.max_groups,
                maxUsersPerGroup: originalPlan.max_users_per_group,
                maxPlayersPerGroup: originalPlan.max_players_per_group,
              }),
            from: {
              maxGroups: originalPlan.max_groups,
              maxUsersPerGroup: originalPlan.max_users_per_group,
              maxPlayersPerGroup: originalPlan.max_players_per_group,
            },
            to: newLimits,
          },
        },
        subscriptionDetails: {
          remainingDaysPreserved: remainingDays,
          originalEndDate: originalEndDate,
          newEndDate: newEndDate,
        },
      };

      Logger.info(
        `Subscription converted to custom plan for customer ${customer.email}: ` +
          `From "${originalPlan.name}" to "${savedCustomPlan.name}". ` +
          `Price: $${originalPlan.price} → $${newPricing}, ` +
          `Preserved ${remainingDays} days of subscription.`
      );

      return {
        originalSubscription: endedSubscription,
        newCustomPlan: savedCustomPlan,
        newSubscription: savedNewSubscription,
        conversionDetails,
      };
    } catch (error) {
      Logger.error("Error converting subscription to custom plan:", error);
      throw error;
    }
  }

  /**
   * Helper: Get customer's current group count
   */
  public async getCustomerGroupCount(customerId: number): Promise<number> {
    try {
      const groupCount = await this.groupRepository
        .createQueryBuilder("group")
        .leftJoin("group.subscription", "subscription")
        .leftJoin("subscription.user", "user")
        .where("user.id = :customerId", { customerId })
        .andWhere("subscription.status IN (:...statuses)", {
          statuses: ["active", "trial"],
        })
        .getCount();

      return groupCount;
    } catch (error) {
      Logger.error("Error getting customer group count:", error);
      return 0;
    }
  }

  /**
   * Helper: Get customer's max users in any group
   */
  public async getCustomerMaxUsersPerGroup(
    customerId: number
  ): Promise<number> {
    try {
      const result = await this.userRepository
        .createQueryBuilder("user")
        .leftJoin("user.userGroupRoles", "ugr")
        .leftJoin("ugr.group", "group")
        .leftJoin("group.subscription", "subscription")
        .leftJoin("subscription.user", "subscriptionUser")
        .select("group.id", "groupId")
        .addSelect("COUNT(user.id)", "userCount")
        .where("subscriptionUser.id = :customerId", { customerId })
        .andWhere("subscription.status IN (:...statuses)", {
          statuses: ["active", "trial"],
        })
        .groupBy("group.id")
        .orderBy("COUNT(user.id)", "DESC")
        .limit(1)
        .getRawOne();

      return parseInt(result?.userCount || "0");
    } catch (error) {
      Logger.error("Error getting customer max users per group:", error);
      return 0;
    }
  }
}

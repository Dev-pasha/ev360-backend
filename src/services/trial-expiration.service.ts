import { Repository, LessThanOrEqual, In } from "typeorm";
import { AppDataSource } from "../config/database";
import { Subscription, SubscriptionStatus } from "../entities/subscription.entity";
import { User } from "../entities/user.entity";
import Logger from "../config/logger";
import { EmailService } from "./email.service";

interface TrialExpirationResult {
  processedCount: number;
  expiredToActive: number;
  expiredToExpired: number;
  errors: string[];
  processedSubscriptions: Array<{
    subscriptionId: number;
    customerEmail: string;
    previousStatus: string;
    newStatus: string;
    planName: string;
  }>;
}

export class TrialExpirationService {
  private subscriptionRepository: Repository<Subscription>;
  private userRepository: Repository<User>;
  private emailService: EmailService;

  constructor() {
    this.subscriptionRepository = AppDataSource.getRepository(Subscription);
    this.userRepository = AppDataSource.getRepository(User);
    this.emailService = new EmailService();
  }

  async processExpiredTrials(): Promise<TrialExpirationResult> {
    const startTime = new Date();
    Logger.info("🕛 Starting trial expiration processing...");

    const result: TrialExpirationResult = {
      processedCount: 0,
      expiredToActive: 0,
      expiredToExpired: 0,
      errors: [],
      processedSubscriptions: []
    };

    try {
      const expiredTrials = await this.findExpiredTrials();
      
      if (expiredTrials.length === 0) {
        Logger.info("✅ No expired trials found to process");
        return result;
      }

      Logger.info(`📋 Found ${expiredTrials.length} expired trials to process`);

      for (const subscription of expiredTrials) {
        try {
          const processingResult = await this.processIndividualTrial(subscription);
          
          result.processedCount++;
          result.processedSubscriptions.push({
            subscriptionId: subscription.id,
            customerEmail: subscription.user.email,
            previousStatus: 'TRIAL',
            newStatus: processingResult.newStatus,
            planName: subscription.plan.name
          });

          if (processingResult.newStatus === 'ACTIVE') {
            result.expiredToActive++;
          } else if (processingResult.newStatus === 'EXPIRED') {
            result.expiredToExpired++;
          }

        } catch (error) {
          const errorMessage = `Failed to process subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          Logger.error(errorMessage);
          result.errors.push(errorMessage);
        }
      }

      const endTime = new Date();
      const processingTime = endTime.getTime() - startTime.getTime();

      Logger.info(
        `✅ Trial expiration processing completed in ${processingTime}ms. ` +
        `Processed: ${result.processedCount}, ` +
        `Converted to Active: ${result.expiredToActive}, ` +
        `Expired: ${result.expiredToExpired}, ` +
        `Errors: ${result.errors.length}`
      );

      if (result.processedCount > 0 || result.errors.length > 0) {
        await this.sendAdminSummaryEmail(result, processingTime);
      }

      return result;

    } catch (error) {
      const errorMessage = `Critical error in trial expiration processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
      Logger.error(errorMessage);
      result.errors.push(errorMessage);
      return result;
    }
  }

  private async findExpiredTrials(): Promise<Subscription[]> {
    const now = new Date();
    
    return await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.TRIAL,
        trial_end_date: LessThanOrEqual(now)
      },
      relations: ['user', 'plan'],
      order: {
        trial_end_date: 'ASC'
      }
    });
  }

  private async processIndividualTrial(subscription: Subscription): Promise<{
    newStatus: string;
    actionTaken: string;
  }> {
    const customer = subscription.user;
    Logger.info(`Processing expired trial for customer: ${customer.email} (Subscription ID: ${subscription.id})`);

    const hasValidPaymentMethod = await this.checkCustomerPaymentMethod(customer.id);
    
    if (hasValidPaymentMethod) {
      return await this.convertTrialToActive(subscription);
    } else {
      return await this.expireTrialSubscription(subscription);
    }
  }

  private async checkCustomerPaymentMethod(customerId: number): Promise<boolean> {
    try {
      // Check if user has any previous active subscriptions (indicates they had payment setup)
      const previousActiveSubscriptions = await this.subscriptionRepository.count({
        where: {
          user: { id: customerId },
          status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED])
        }
      });

      // If they've had active subscriptions before, assume they have payment method
      // In production, you'd integrate with your payment provider (Stripe, etc.)
      return previousActiveSubscriptions > 0;

    } catch (error) {
      Logger.error(`Error checking payment method for customer ${customerId}:`, error);
      return false;
    }
  }

  private async convertTrialToActive(subscription: Subscription): Promise<{
    newStatus: string;
    actionTaken: string;
  }> {
    const originalStatus = subscription.status;
    
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.trial_end_date = null;
    
    subscription.metadata = {
      ...subscription.metadata,
      trialConversion: {
        convertedAt: new Date().toISOString(),
        convertedFrom: originalStatus,
        automaticConversion: true,
        cronJobProcessed: true
      }
    };

    await this.subscriptionRepository.save(subscription);
    // Note: Invoice creation removed - implement based on your billing system
    await this.sendTrialConversionEmail(subscription.user, subscription);

    Logger.info(`✅ Converted trial to active for ${subscription.user.email} (Subscription: ${subscription.id})`);

    return {
      newStatus: 'ACTIVE',
      actionTaken: 'converted_to_active'
    };
  }

  private async expireTrialSubscription(subscription: Subscription): Promise<{
    newStatus: string;
    actionTaken: string;
  }> {
    const originalStatus = subscription.status;
    
    subscription.status = SubscriptionStatus.EXPIRED;
    subscription.end_date = new Date();
    
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
    
    subscription.metadata = {
      ...subscription.metadata,
      trialExpiration: {
        expiredAt: new Date().toISOString(),
        expiredFrom: originalStatus,
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        cronJobProcessed: true,
        canReactivate: true
      }
    };

    await this.subscriptionRepository.save(subscription);
    await this.sendTrialExpirationEmail(subscription.user, subscription, gracePeriodEnd);

    Logger.info(`⏰ Expired trial for ${subscription.user.email} (Subscription: ${subscription.id}) with grace period until ${gracePeriodEnd.toISOString()}`);

    return {
      newStatus: 'EXPIRED',
      actionTaken: 'expired_with_grace_period'
    };
  }

  private async sendTrialConversionEmail(user: User, subscription: Subscription): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        from: process.env.DEFAULT_FROM_EMAIL || "noreply@example.com",
        subject: `Welcome! Your trial has been converted to ${subscription.plan.name}`,
        template: 'trial-conversion-success',
        data: {
          firstName: user.firstName || 'Valued Customer',
          planName: subscription.plan.name,
          planPrice: subscription.plan.price,
          billingCycle: subscription.plan.billing_cycle,
          activatedAt: new Date().toLocaleDateString()
        }
      };

      await this.emailService.sendEmail(emailData);
      Logger.info(`📧 Sent trial conversion email to ${user.email}`);

    } catch (error) {
      Logger.error(`Failed to send trial conversion email to ${user.email}:`, error);
    }
  }

  private async sendTrialExpirationEmail(user: User, subscription: Subscription, gracePeriodEnd: Date): Promise<void> {
    try {
      const emailData = {
        to: user.email,
        from: process.env.DEFAULT_FROM_EMAIL || "noreply@example.com",
        subject: `Your trial has expired - Reactivate your ${subscription.plan.name} subscription`,
        template: 'trial-expiration-notice',
        data: {
          firstName: user.firstName || 'Valued Customer',
          planName: subscription.plan.name,
          planPrice: subscription.plan.price,
          gracePeriodEnd: gracePeriodEnd.toLocaleDateString(),
          reactivationLink: `${process.env.FRONTEND_URL}/billing/reactivate?token=${subscription.id}`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@yourapp.com'
        }
      };

      await this.emailService.sendEmail(emailData);
      Logger.info(`📧 Sent trial expiration email to ${user.email}`);

    } catch (error) {
      Logger.error(`Failed to send trial expiration email to ${user.email}:`, error);
    }
  }

  private async sendAdminSummaryEmail(result: TrialExpirationResult, processingTime: number): Promise<void> {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@yourapp.com';
      
      const emailData = {
        to: adminEmail,
        from: process.env.DEFAULT_FROM_EMAIL || "noreply@example.com",
        subject: `Trial Expiration Processing Summary - ${new Date().toLocaleDateString()}`,
        template: 'admin-trial-summary',
        data: {
          date: new Date().toLocaleDateString(),
          processingTime: `${processingTime}ms`,
          totalProcessed: result.processedCount,
          convertedToActive: result.expiredToActive,
          expired: result.expiredToExpired,
          errors: result.errors,
          processedSubscriptions: result.processedSubscriptions
        }
      };

      await this.emailService.sendEmail(emailData);
      Logger.info(`📧 Sent admin summary email for trial processing`);

    } catch (error) {
      Logger.error('Failed to send admin summary email:', error);
    }
  }

  async getTrialExpirationStats(): Promise<{
    expiringSoon: number;
    expiredToday: number;
    expiredThisWeek: number;
    expiredThisMonth: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [expiringSoon, expiredToday, expiredThisWeek, expiredThisMonth] = await Promise.all([
      this.subscriptionRepository.count({
        where: {
          status: SubscriptionStatus.TRIAL,
          trial_end_date: LessThanOrEqual(threeDaysFromNow)
        }
      }),
      
      this.subscriptionRepository.count({
        where: {
          status: In([SubscriptionStatus.EXPIRED, SubscriptionStatus.ACTIVE]),
          trial_end_date: LessThanOrEqual(today),
          updated_at: LessThanOrEqual(today)
        }
      }),
      
      this.subscriptionRepository.count({
        where: {
          status: In([SubscriptionStatus.EXPIRED, SubscriptionStatus.ACTIVE]),
          trial_end_date: LessThanOrEqual(weekAgo),
          updated_at: LessThanOrEqual(weekAgo)
        }
      }),
      
      this.subscriptionRepository.count({
        where: {
          status: In([SubscriptionStatus.EXPIRED, SubscriptionStatus.ACTIVE]),
          trial_end_date: LessThanOrEqual(monthAgo),
          updated_at: LessThanOrEqual(monthAgo)
        }
      })
    ]);

    return {
      expiringSoon,
      expiredToday,
      expiredThisWeek,
      expiredThisMonth
    };
  }

  async manualTrigger(dryRun: boolean = false): Promise<TrialExpirationResult> {
    Logger.info(`🔧 Manual trial expiration trigger (DryRun: ${dryRun})`);
    
    if (dryRun) {
      const expiredTrials = await this.findExpiredTrials();
      return {
        processedCount: expiredTrials.length,
        expiredToActive: 0,
        expiredToExpired: 0,
        errors: [],
        processedSubscriptions: expiredTrials.map(sub => ({
          subscriptionId: sub.id,
          customerEmail: sub.user.email,
          previousStatus: 'TRIAL',
          newStatus: 'DRY_RUN',
          planName: sub.plan.name
        }))
      };
    }

    return await this.processExpiredTrials();
  }
}
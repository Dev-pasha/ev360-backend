import * as cron from 'node-cron';
import { TrialExpirationService } from '../services/trial-expiration.service';
import Logger from '../config/logger';

export class TrialExpirationJob {
  private trialService: TrialExpirationService;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private cronTask: cron.ScheduledTask | null = null;

  constructor() {
    this.trialService = new TrialExpirationService();
  }

  start(): void {
    // Run at 12:00 AM every day (0 0 * * *)
    this.cronTask = cron.schedule('0 0 * * *', async () => {
      if (this.isRunning) {
        Logger.warn('⚠️ Trial expiration job is already running, skipping this execution');
        return;
      }

      this.isRunning = true;
      this.lastRun = new Date();
      
      try {
        Logger.info('🚀 Starting scheduled trial expiration job');
        const result = await this.trialService.processExpiredTrials();
        
        Logger.info(
          `✅ Scheduled trial expiration job completed. ` +
          `Processed: ${result.processedCount}, Errors: ${result.errors.length}`
        );
        
      } catch (error) {
        Logger.error('❌ Critical error in scheduled trial expiration job:', error);
      } finally {
        this.isRunning = false;
        this.calculateNextRun();
      }
    }, {
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.calculateNextRun();
    Logger.info('📅 Trial expiration cron job scheduled - runs daily at 12:00 AM');
  }

  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    Logger.info('🛑 Trial expiration cron job stopped');
  }

  getStatus(): { 
    isRunning: boolean; 
    nextRun: string | null;
    lastRun: string | null;
    isScheduled: boolean;
  } {
    return {
      isRunning: this.isRunning,
      nextRun: this.nextRun ? this.nextRun.toISOString() : null,
      lastRun: this.lastRun ? this.lastRun.toISOString() : null,
      isScheduled: this.cronTask !== null
    };
  }

  async triggerManually(dryRun: boolean = false): Promise<any> {
    if (this.isRunning) {
      throw new Error('Job is currently running');
    }

    this.isRunning = true;
    try {
      const result = await this.trialService.manualTrigger(dryRun);
      if (!dryRun) {
        this.lastRun = new Date();
      }
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private calculateNextRun(): void {
    // Calculate next 12:00 AM
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(0, 0, 0, 0);
    this.nextRun = nextRun;
  }
}
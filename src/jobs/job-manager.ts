import { TrialExpirationJob } from './trial-expiration.job';
import Logger from '../config/logger';

class JobManager {
  private trialExpirationJob: TrialExpirationJob;

  constructor() {
    this.trialExpirationJob = new TrialExpirationJob();
  }

  startAllJobs(): void {
    try {
      this.trialExpirationJob.start();
      Logger.info('🤖 All cron jobs started successfully');
    } catch (error) {
      Logger.error('❌ Failed to start cron jobs:', error);
      throw error;
    }
  }

  stopAllJobs(): void {
    try {
      this.trialExpirationJob.stop();
      Logger.info('🛑 All cron jobs stopped successfully');
    } catch (error) {
      Logger.error('❌ Failed to stop cron jobs:', error);
    }
  }

  getTrialExpirationJob(): TrialExpirationJob {
    return this.trialExpirationJob;
  }

  getJobStatuses(): any {
    return {
      trialExpiration: this.trialExpirationJob.getStatus()
    };
  }
}

export const jobManager = new JobManager();

// Export functions for app.ts integration
export function startCronJobs(): void {
  jobManager.startAllJobs();
}

export function stopCronJobs(): void {
  jobManager.stopAllJobs();
}

export { TrialExpirationJob };
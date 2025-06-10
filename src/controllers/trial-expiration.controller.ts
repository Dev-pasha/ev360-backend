import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { TrialExpirationService } from "../services/trial-expiration.service";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

// Extend Request interface to include saasOwner
interface AuthenticatedRequest extends Request {
  saasOwner?: {
    id: number;
    email: string;
    isActive: boolean;
  };
  user?: {
    id: number;
    email: string;
    groupRoles: any[]; // adjust type as needed
  };
}

export class TrialExpirationController {
  private trialExpirationService: TrialExpirationService;

  constructor() {
    this.trialExpirationService = new TrialExpirationService();
  }

  GetJobStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.saasOwner) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const stats = await this.trialExpirationService.getTrialExpirationStats();
      
      res.json(
        successResponse({
          message: "Trial expiration job status retrieved successfully",
          status: {
            isRunning: false, // You can track this in a global state if needed
            nextRun: "Daily at 12:00 AM UTC",
            lastRun: null // Add this to your service if needed
          },
          stats
        })
      );
    } catch (error) {
      Logger.error("Error getting trial expiration job status: ", error);
      res.status(500).json(errorResponse("Failed to get job status", 500, error));
    }
  };

  TriggerManualProcessing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Failed to trigger trial processing", 400, errors));
        return;
      }

      if (!req.saasOwner) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const { dryRun = false } = req.body;

      Logger.info(`Manual trial expiration triggered by SaaS owner ${req.saasOwner.id} (DryRun: ${dryRun})`);

      const result = await this.trialExpirationService.manualTrigger(dryRun);
      
      res.json(
        successResponse({
          message: dryRun ? "Trial expiration dry run completed" : "Trial expiration processing triggered successfully",
          result,
          summary: {
            totalProcessed: result.processedCount,
            convertedToActive: result.expiredToActive,
            expired: result.expiredToExpired,
            errors: result.errors.length,
            isDryRun: dryRun
          }
        })
      );
    } catch (error) {
      Logger.error("Error triggering manual trial processing: ", error);
      res.status(500).json(errorResponse("Failed to trigger trial processing", 500, error));
    }
  };

  GetTrialStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.saasOwner) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      const stats = await this.trialExpirationService.getTrialExpirationStats();
      
      res.json(
        successResponse({
          message: "Trial expiration statistics retrieved successfully",
          stats,
          metadata: {
            generatedAt: new Date(),
            description: {
              expiringSoon: "Trials expiring in next 3 days",
              expiredToday: "Trials processed today",
              expiredThisWeek: "Trials processed this week",
              expiredThisMonth: "Trials processed this month"
            }
          }
        })
      );
    } catch (error) {
      Logger.error("Error getting trial expiration stats: ", error);
      res.status(500).json(errorResponse("Failed to get trial stats", 500, error));
    }
  };

  ProcessExpiredTrials = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.saasOwner) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      Logger.info(`Direct trial expiration processing initiated by SaaS owner ${req.saasOwner.id}`);

      const result = await this.trialExpirationService.processExpiredTrials();
      
      res.json(
        successResponse({
          message: "Trial expiration processing completed",
          result,
          summary: {
            totalProcessed: result.processedCount,
            successful: result.processedCount - result.errors.length,
            convertedToActive: result.expiredToActive,
            expired: result.expiredToExpired,
            errors: result.errors.length
          }
        })
      );
    } catch (error) {
      Logger.error("Error processing expired trials: ", error);
      res.status(500).json(errorResponse("Failed to process expired trials", 500, error));
    }
  };

  HealthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.json(
        successResponse({
          message: "Trial expiration system is healthy",
          timestamp: new Date().toISOString(),
          system: "trial-expiration",
          version: "1.0.0"
        })
      );
    } catch (error) {
      Logger.error("Error in trial expiration health check: ", error);
      res.status(500).json(errorResponse("Health check failed", 500, error));
    }
  };
}
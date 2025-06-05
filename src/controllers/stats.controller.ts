// src/controllers/stats.controller.ts
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { StatsService } from "../services/stats.service";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class StatsController {
  private statsService: StatsService;

  constructor() {
    this.statsService = new StatsService();
  }

  GetGroupOverviewStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Failed to get group overview stats", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { dateRange, startDate, endDate } = req.query;

      // Get group overview stats
      const stats = await this.statsService.getGroupOverviewStats(
        parseInt(groupId), 
        {
          dateRange: dateRange as string,
          startDate: startDate as string,
          endDate: endDate as string,
        }
      );

      res.json(
        successResponse({
          message: "Group overview stats retrieved successfully",
          stats,
        })
      );
    } catch (error) {
      Logger.error("Error in getting group overview stats: ", error);
      res.status(500).json(errorResponse("Failed to get group overview stats", 500, error));
    }
  };

  GetGroupDemographics = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Failed to get group demographics", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { includeArchived } = req.query;

      // Get group demographics
      const demographics = await this.statsService.getGroupDemographics(
        parseInt(groupId),
        {
          includeArchived: includeArchived === 'true'
        }
      );

      res.json(
        successResponse({
          message: "Group demographics retrieved successfully",
          demographics,
        })
      );
    } catch (error) {
      Logger.error("Error in getting group demographics: ", error);
      res.status(500).json(errorResponse("Failed to get group demographics", 500, error));
    }
  };

  GetGroupActivityStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Failed to get group activity stats", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { dateRange } = req.query;

      // Get group activity stats
      const activityStats = await this.statsService.getGroupActivityStats(
        parseInt(groupId),
        { dateRange: dateRange as string }
      );

      res.json(
        successResponse({
          message: "Group activity stats retrieved successfully",
          activityStats,
        })
      );
    } catch (error) {
      Logger.error("Error in getting group activity stats: ", error);
      res.status(500).json(errorResponse("Failed to get group activity stats", 500, error));
    }
  };

  GetTeamOverviewStats = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Failed to get team overview stats", 400, errors));
        return;
      }

      const { teamId } = req.params;

      // Get team overview stats
      const stats = await this.statsService.getTeamOverviewStats(parseInt(teamId));

      res.json(
        successResponse({
          message: "Team overview stats retrieved successfully",
          stats,
        })
      );
    } catch (error) {
      Logger.error("Error in getting team overview stats: ", error);
      res.status(500).json(errorResponse("Failed to get team overview stats", 500, error));
    }
  };

  GetSystemHealthStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(errorResponse("Unauthorized", 401));
        return;
      }

      // Get system health stats
      const healthStats = await this.statsService.getSystemHealthStats();

      res.json(
        successResponse({
          message: "System health stats retrieved successfully",
          healthStats,
        })
      );
    } catch (error) {
      Logger.error("Error in getting system health stats: ", error);
      res.status(500).json(errorResponse("Failed to get system health stats", 500, error));
    }
  };
}
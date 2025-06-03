// src/controllers/report.controller.ts
import { Request, Response } from "express";
import { ReportService } from "../services/report.service";
import { ReportType } from "../entities/report.entity";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  /**
   * Generate All Score Report
   * POST /api/reports/all-score
   *
   * Request body:
   * {
   *   "event_ids": [28758],
   *   "evaluator_ids": [40776, 76167, 79943, 78841, 81080]
   * }
   *
   * Response: Array of player scores with metrics, skills, categories, and overall scores
   */
  generateAllScoreReport = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { event_ids, evaluator_ids } = req.body;

      // Generate the report
      const report = await this.reportService.generateAllScoreReport(
        event_ids,
        // evaluator_ids
      );

      // Return successful response
      res.status(200).json(
        successResponse(
          {
            report,
            summary: {
              event_count: event_ids.length || 0,
              // evaluator_count: evaluator_ids.length || 0,
            },
          },
          "All score report generated successfully"
        )
      );
    } catch (error) {
      Logger.error("Error in generating all score report: ", error);
      res
        .status(500)
        .json(errorResponse("Failed to generate all score report", 500, error));
    }
  };

  /**
   * Create Individual Report
   * POST /api/reports/individual
   *
   * Request body:
   * {
   *   "name": "Test Event",
   *   "group_id": 5377,
   *   "event_ids": [28758],
   *   "evaluator_ids": [79943, 40776, 76167, 81080, 78841],
   *   "optional_message": null,
   *   "player_list_ids": [],
   *   "preferred_position_ids": [],
   *   "preferred_positions_type": "PRIMARY",
   *   "team_ids": [],
   *   "category_ids": [],
   *   "jersey_colour_ids": []
   * }
   */

  createIndividualReport = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const user = (req as any).user;
      const {
        name,
        group_id,
        event_ids,
        evaluator_ids,
        optional_message,
        player_list_ids,
        preferred_position_ids,
        preferred_positions_type,
        team_ids,
        category_ids,
        jersey_colour_ids,
      } = req.body;

      const filters = {
        player_list_ids: player_list_ids || [],
        preferred_position_ids: preferred_position_ids || [],
        team_ids: team_ids || [],
        category_ids: category_ids || [],
        jersey_colour_ids: jersey_colour_ids || [],
      };

      const report = await this.reportService.createIndividualReport(
        {
          name,
          group_id,
          event_ids,
          evaluator_ids,
          optional_message: optional_message || null,
          filters,
          preferred_positions_type: preferred_positions_type || "PRIMARY",
        },
        user
      );

      const response = {
        id: report.id,
        name: report.name,
        optional_message: report.optional_message,
        sent: report.sent,
        group_id: report.group.id,
        event_ids: report.events.map((e) => e.id),
        evaluator_ids: report.evaluators.map((e) => e.id),
        player_list_ids: report.filters.player_list_ids || [],
        preferred_position_ids: report.filters.preferred_position_ids || [],
        preferred_positions_type: report.preferred_positions_type,
        team_ids: report.filters.team_ids || [],
        category_ids: report.filters.category_ids || [],
        jersey_colour_ids: report.filters.jersey_colour_ids || [],
        individual_report_confirmation_ids:
          report.confirmations?.map((c) => c.id) || [],
        created_by_id: user.id,
      };

      res
        .status(201)
        .json(
          successResponse(response, "Individual report created successfully")
        );
    } catch (error) {
      Logger.error("Error creating individual report:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json(errorResponse(error.message, 404));
          return;
        }

        if (error.message.includes("don't belong to")) {
          res.status(400).json(errorResponse(error.message, 400));
          return;
        }

        if (
          error.message.includes("permission") ||
          error.message.includes("unauthorized")
        ) {
          res.status(403).json(errorResponse(error.message, 403));
          return;
        }
      }

      res
        .status(500)
        .json(
          errorResponse(
            "Failed to create individual report",
            500,
            error instanceof Error ? error.message : "Unknown error"
          )
        );
    }
  };

  /**
   * GET /api/reports/self-assessment/:eventId
   * Get self-assessment player scores for a specific event
   */
  getSelfAssessmentReport = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { eventId, groupId } = req.params;

      const playerScores =
        await this.reportService.getSelfAssessmentPlayerScores(Number(eventId));

      res.status(200).json(
        successResponse(
          {
            report: playerScores,
            summary: {
              total_players: playerScores.length,
              total_scores: playerScores.reduce(
                (sum, player) => sum + player.scores.length,
                0
              ),
            },
          },
          "Self-assessment report generated successfully"
        )
      );
    } catch (error) {
      Logger.error("Error in generating self-assessment report: ", error);
      res
        .status(500)
        .json(
          errorResponse("Failed to generate self-assessment report", 500, error)
        );
    }
  };

  // * GET /api/reports/self-assessment/:eventId/players/:playerId
  //  * Get detailed self-assessment data for a specific player in an event
  //  */
  getPlayerSelfAssessmentDetail = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { eventId, playerId } = req.params;

      const playerDetail =
        await this.reportService.getPlayerSelfAssessmentDetail(
          Number(eventId),
          Number(playerId)
        );

      res
        .status(200)
        .json(
          successResponse(
            playerDetail,
            "Player self-assessment detail retrieved successfully"
          )
        );
    } catch (error) {
      Logger.error("Error in fetching player self-assessment detail: ", error);
      res
        .status(500)
        .json(
          errorResponse(
            "Failed to fetch player self-assessment detail",
            500,
            error
          )
        );
    }
  };
}

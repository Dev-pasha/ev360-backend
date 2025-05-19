// src/controllers/event.controller.ts
import { EventService } from "../services/event.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";
import { EventType } from "../entities/event.entity";
import { EvaluatorStatus } from "../entities/event-evaluator.entity";

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  /**
   * Create a new event
   */
  createEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Event creation failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const eventData = req.body;
      const createdBy = req.user; // Assuming user is attached to request

      const event = await this.eventService.createEvent(
        +groupId,
        eventData,
        createdBy
      );

      res.status(201).json(
        successResponse({
          message: "Event created successfully",
          event,
        })
      );
    } catch (error: any) {
      Logger.error("Error in event creation: ", error);
      res.status(400).json(errorResponse("Event creation failed", 400, error));
    }
  };

  /**
   * Update an event
   */
  updateEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Event update failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const eventData = req.body;

      const event = await this.eventService.updateEvent(+eventId, eventData);

      res.status(200).json(
        successResponse({
          message: "Event updated successfully",
          event,
        })
      );
    } catch (error: any) {
      Logger.error("Error in event update: ", error);

      if (error.message.includes("locked")) {
        res.status(403).json(errorResponse(error.message, 403));
      } else {
        res.status(400).json(errorResponse("Event update failed", 400, error));
      }
    }
  };

  /**
   * Get event by ID
   */
  getEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      const event = await this.eventService.getEventById(+eventId);

      res.status(200).json(
        successResponse({
          message: "Event fetched successfully",
          event,
        })
      );
    } catch (error) {
      Logger.error("Error in event fetching: ", error);
      res.status(400).json(errorResponse("Event fetching failed", 400, error));
    }
  };

  /**
   * Get events for a group
   */
  getGroupEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;
      const filters = req.query;

      const events = await this.eventService.getGroupEvents(+groupId, {
        active: filters.active === "true",
        event_type: filters.event_type ? +filters.event_type : undefined,
        team_id: filters.team_id ? +filters.team_id : undefined,
        start_date: filters.start_date
          ? new Date(filters.start_date as string)
          : undefined,
        end_date: filters.end_date
          ? new Date(filters.end_date as string)
          : undefined,
      });

      res.status(200).json(
        successResponse({
          message: "Events fetched successfully",
          events,
          count: events.length,
        })
      );
    } catch (error) {
      Logger.error("Error in events fetching: ", error);
      res.status(400).json(errorResponse("Events fetching failed", 400, error));
    }
  };

  /**
   * Add players to event
   */
  addPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Add players failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { playerIds } = req.body;

      const event = await this.eventService.addPlayersToEvent(
        +eventId,
        playerIds
      );

      res.status(200).json(
        successResponse({
          message: "Players added successfully",
          event,
        })
      );
    } catch (error: any) {
      Logger.error("Error adding players: ", error);

      if (error.message.includes("locked")) {
        res.status(403).json(errorResponse(error.message, 403));
      } else {
        res
          .status(400)
          .json(errorResponse("Failed to add players", 400, error));
      }
    }
  };

  /**
   * Remove players from event
   */
  removePlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Remove players failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { playerIds } = req.body;

      const event = await this.eventService.removePlayersFromEvent(
        +eventId,
        playerIds
      );

      res.status(200).json(
        successResponse({
          message: "Players removed successfully",
          event,
        })
      );
    } catch (error: any) {
      Logger.error("Error removing players: ", error);

      if (error.message.includes("locked")) {
        res.status(403).json(errorResponse(error.message, 403));
      } else {
        res
          .status(400)
          .json(errorResponse("Failed to remove players", 400, error));
      }
    }
  };

  /**
   * Invite evaluator
   */
  inviteEvaluator = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Invite evaluator failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { evaluatorId } = req.body;

      const eventEvaluator = await this.eventService.inviteEvaluator(
        +eventId,
        evaluatorId
      );

      res.status(200).json(
        successResponse({
          message: "Evaluator invited successfully",
          eventEvaluator,
        })
      );
    } catch (error) {
      Logger.error("Error inviting evaluator: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to invite evaluator", 400, error));
    }
  };

  /**
   * Update evaluator status
   */
  updateEvaluatorStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Update evaluator status failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { evaluatorId, status } = req.body;

      const eventEvaluator = await this.eventService.updateEvaluatorStatus(
        +eventId,
        evaluatorId,
        status
      );

      res.status(200).json(
        successResponse({
          message: "Evaluator status updated successfully",
          eventEvaluator,
        })
      );
    } catch (error) {
      Logger.error("Error updating evaluator status: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to update evaluator status", 400, error));
    }
  };

  /**
   * Submit evaluation
   */
  submitEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Submit evaluation failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { evaluatorId, evaluations } = req.body;

      const results = await this.eventService.submitEvaluation(
        +eventId,
        evaluatorId,
        evaluations
      );

      res.status(200).json(
        successResponse({
          message: "Evaluation submitted successfully",
          results,
        })
      );
    } catch (error) {
      Logger.error("Error submitting evaluation: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to submit evaluation", 400, error));
    }
  };

  /**
   * Get event results
   */
  getEventResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;
      const filters = req.query;

      const results = await this.eventService.getEventResults(+eventId, {
        playerId: filters.playerId ? +filters.playerId : undefined,
        evaluatorId: filters.evaluatorId ? +filters.evaluatorId : undefined,
        skillId: filters.skillId ? +filters.skillId : undefined,
      });

      res.status(200).json(
        successResponse({
          message: "Event results fetched successfully",
          results,
          count: results.length,
        })
      );
    } catch (error) {
      Logger.error("Error fetching event results: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to fetch event results", 400, error));
    }
  };

  /**
   * Delete event
   */
  deleteEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      await this.eventService.deleteEvent(+eventId);

      res.status(200).json(
        successResponse({
          message: "Event deleted successfully",
        })
      );
    } catch (error: any) {
      Logger.error("Error deleting event: ", error);

      if (error.message.includes("locked")) {
        res.status(403).json(errorResponse(error.message, 403));
      } else {
        res
          .status(400)
          .json(errorResponse("Failed to delete event", 400, error));
      }
    }
  };

  /**
   * Lock/unlock event
   */
  setEventLocked = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Lock/unlock event failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { locked } = req.body;

      const event = await this.eventService.setEventLocked(+eventId, locked);

      res.status(200).json(
        successResponse({
          message: `Event ${locked ? "locked" : "unlocked"} successfully`,
          event,
        })
      );
    } catch (error) {
      Logger.error("Error locking/unlocking event: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to lock/unlock event", 400, error));
    }
  };

  /**
   * Get evaluator progress
   */
  getEvaluatorProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { eventId } = req.params;

      const progress = await this.eventService.getEvaluatorProgress(+eventId);

      res.status(200).json(
        successResponse({
          message: "Evaluator progress fetched successfully",
          progress,
        })
      );
    } catch (error) {
      Logger.error("Error fetching evaluator progress: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to fetch evaluator progress", 400, error));
    }
  };

  /**
   * Sync event evaluators
   */
  syncEventEvaluators = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Sync event evaluators failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { evaluatorIds } = req.body;

      const result = await this.eventService.syncEventEvaluators(
        +eventId,
        evaluatorIds
      );

      res.status(200).json(
        successResponse({
          message: "Event evaluators synced successfully",
          event: result.event,
          changes: {
            added: result.added,
            removed: result.removed,
            kept: result.kept,
          },
        })
      );
    } catch (error: any) {
      Logger.error("Error syncing event evaluators: ", error);

      if (error.message.includes("locked")) {
        res.status(403).json(errorResponse(error.message, 403));
      } else {
        res
          .status(400)
          .json(errorResponse("Failed to sync event evaluators", 400, error));
      }
    }
  };

  /**
   * Sync event skills
   */

  syncEventSkills = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Sync event skills failed", 400, errors));
        return;
      }

      const { eventId } = req.params;
      const { skillIds } = req.body;

      const result = await this.eventService.syncEventSkills(
        +eventId,
        skillIds
      );

      res.status(200).json(
        successResponse({
          message: "Event skills synced successfully",
          event: result.event,
          changes: {
            added: result.added,
            removed: result.removed,
            kept: result.kept,
          },
        })
      );
    } catch (error: any) {
      Logger.error("Error syncing event skills: ", error);

      if (error.message.includes("locked")) {
        res.status(403).json(errorResponse(error.message, 403));
      } else {
        res
          .status(400)
          .json(errorResponse("Failed to sync event skills", 400, error));
      }
    }
  };
}

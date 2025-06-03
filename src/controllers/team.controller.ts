import { TeamService } from "../services/team.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class TeamController {
  private teamService: TeamService;
  constructor() {
    this.teamService = new TeamService();
  }

  /**
   * Create a new team
   */
  createTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Team creation failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { teamData } = req.body;

      const newTeam = await this.teamService.createTeam(+groupId, teamData);

      res.status(201).json(
        successResponse({
          message: "Team created successfully",
          team: newTeam,
        })
      );
    } catch (error) {
      Logger.error("Error in team creation: ", error);
      res.status(400).json(errorResponse("Team creation failed", 400, error));
    }
  };

  getTeams = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Teams fetch failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { teamId, includePlayerCount, includePlayers } = req.query;

      let result;
      let message;

      if (teamId) {
        // Get single team with optional player details
        if (includePlayers === "true") {
          result = await this.teamService.getTeamWithPlayers(
            +groupId,
            Number(teamId)
          );
          message = "Team with players fetched successfully";
        } else {
          result = await this.teamService.getTeamById(+groupId, Number(teamId));
          message = "Team fetched successfully";
        }
      } else {
        // Get all teams with optional player count
        if (includePlayerCount === "true") {
          result =
            await this.teamService.getGroupTeamsWithPlayerCount(+groupId);
          message = "Teams with player count fetched successfully";
        } else {
          result = await this.teamService.getGroupTeams(+groupId);
          message = "Teams fetched successfully";
        }
      }

      res.status(200).json(
        successResponse({
          message,
          data: result,
        })
      );
    } catch (error) {
      Logger.error("Error in teams fetching: ", error);
      res.status(400).json(errorResponse("Teams fetching failed", 400, error));
    }
  };

  /**
   * Update a team
   */
  updateTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Team update failed", 400, errors));
        return;
      }

      const { groupId, teamId } = req.params;
      const { teamData } = req.body;

      const updatedTeam = await this.teamService.updateTeam(
        +groupId,
        +teamId,
        teamData
      );

      res.status(200).json(
        successResponse({
          message: "Team updated successfully",
          team: updatedTeam,
        })
      );
    } catch (error) {
      Logger.error("Error in team update: ", error);
      res.status(400).json(errorResponse("Team update failed", 400, error));
    }
  };

  /**
   * Delete a team
   */
  deleteTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Team deletion failed", 400, errors));
        return;
      }

      const { groupId, teamId } = req.params;

      await this.teamService.deleteTeam(+groupId, +teamId);

      res.status(200).json(
        successResponse({
          message: "Team deleted successfully",
        })
      );
    } catch (error) {
      Logger.error("Error in team deletion: ", error);
      res.status(400).json(errorResponse("Team deletion failed", 400, error));
    }
  };

  /**
   * Manage team players - handles add, remove, and move operations
   */
  manageTeamPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Team player operation failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { action, playerIds, teamId, fromTeamId, toTeamId } = req.body;

      let result;
      let message;

      switch (action) {
        case "add":
          result = await this.teamService.addPlayersToTeamBatch(
            +groupId,
            teamId,
            playerIds
          );
          message = "Players added to team successfully";
          break;

        case "remove":
          result = await this.teamService.removePlayersFromTeamBatch(
            +groupId,
            teamId,
            playerIds
          );
          message = "Players removed from team successfully";
          break;

        case "move":
          result = await this.teamService.movePlayersBetweenTeams(
            +groupId,
            fromTeamId,
            toTeamId,
            playerIds
          );
          message = "Players moved between teams successfully";
          break;

        default:
          res.status(400).json(errorResponse("Invalid action", 400));
          return;
      }

      res.status(200).json(
        successResponse({
          message,
          data: result,
        })
      );
    } catch (error) {
      Logger.error("Error in team player operation: ", error);
      res
        .status(400)
        .json(errorResponse("Team player operation failed", 400, error));
    }
  };

  /**
   * Get players for a specific team
   */
  getTeamPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Team players fetch failed", 400, errors));
        return;
      }

      const { groupId, teamId } = req.params;

      const players = await this.teamService.getTeamPlayers(+groupId, +teamId);

      res.status(200).json(
        successResponse({
          message: "Team players fetched successfully",
          players,
        })
      );
    } catch (error) {
      Logger.error("Error in team players fetching: ", error);
      res
        .status(400)
        .json(errorResponse("Team players fetching failed", 400, error));
    }
  };

  getAvailablePlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Available players fetch failed", 400, errors));
        return;
      }

      const { groupId } = req.params;

      const availablePlayers =
        await this.teamService.getUnassignedPlayers(+groupId);

      res.status(200).json(
        successResponse({
          message: "Available players fetched successfully",
          players: availablePlayers,
        })
      );
    } catch (error) {
      Logger.error("Error in available players fetching: ", error);
      res
        .status(400)
        .json(errorResponse("Available players fetching failed", 400, error));
    }
  };


  exportTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Team export failed", 400, errors));
        return;
      }

      const { groupId, teamId } = req.params;
      const { format } = req.query;

      const exportData = await this.teamService.exportTeamData(
        +groupId,
        +teamId,
        format
      );

      res.status(200).json(
        successResponse({
          message: "Team exported successfully",
          data: exportData,
        })
      );
    } catch (error) {
      Logger.error("Error in team export: ", error);
      res.status(400).json(errorResponse("Team export failed", 400, error));
    }
  };

}

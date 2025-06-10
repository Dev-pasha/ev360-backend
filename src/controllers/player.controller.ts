import { PlayerService } from "../services/player.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class PlayerController {
  private playerService: PlayerService;

  constructor() {
    this.playerService = new PlayerService();
  }

  CreatePlayer = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Player creation failed", 400, errors));
        return;
      }

      const { groupId } = req.params;

      const _newPlayer = await this.playerService.createPlayer(
        +groupId,
        req.body
      );

      res.status(201).json(
        successResponse({
          message: "Player created successfully",
          _newPlayer,
        })
      );
    } catch (error) {
      Logger.error("Error in position creation: ", error);
      res
        .status(400)
        .json(errorResponse("Position creation failed", 400, error));
    }
  };

  GetPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Players Get failed", 400, errors));
        return;
      }
      console.log("GetPlayers");

      const { groupId } = req.params;

      const { search, position } = req.query;

      const players = await this.playerService.getGroupPlayers(+groupId, {
        search: search ? (search as string) : undefined,
        position: position ? (position as string) : undefined,
      });

      // console.log("Players retrieved: ", players);

      res.status(200).json(
        successResponse({
          message: "Players retrieved successfully",
          players,
        })
      );
    } catch (error) {
      Logger.error("Error in getting players: ", error);
      res.status(400).json(errorResponse("Failed to get players", 400, error));
    }
  };

  GetPlayerById = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Player Get failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { playerId } = req.query;

      console.log("GetPlayerById");

      const player = await this.playerService.getPlayerById(
        Number(playerId),
        +groupId
      );

      res.status(200).json(
        successResponse({
          message: "Player retrieved successfully",
          player,
        })
      );
    } catch (error) {
      Logger.error("Error in getting player: ", error);
      res.status(400).json(errorResponse("Failed to get player", 400, error));
    }
  };

  DeletePlayer = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json(errorResponse("Player Deletion failed", 400, errors));
      return;
    }

    try {
      const { groupId } = req.params;
      const { playerId } = req.query;

      const deletedPlayer = await this.playerService.deletePlayer(
        Number(playerId),
        +groupId
      );

      res.status(200).json(
        successResponse({
          message: "Player deleted successfully",
          deletedPlayer,
        })
      );
    } catch (error) {
      Logger.error("Error in deleting player: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to delete player", 400, error));
    }
  };

  UpdatePlayer = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(errorResponse("Player Update failed", 400, errors));
      return;
    }

    try {
      const { groupId } = req.params;
      const { playerId } = req.query;
      const { playerData } = req.body;

      const updatedPlayer = await this.playerService.updatePlayer(
        Number(playerId),
        +groupId,
        playerData
      );

      res.status(200).json(
        successResponse({
          message: "Player updated successfully",
          updatedPlayer,
        })
      );
    } catch (error) {
      Logger.error("Error in updating player: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to update player", 400, error));
    }
  };

  CreatePlayerAccount = async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res
        .status(400)
        .json(errorResponse("Player Account Creation failed", 400, errors));
      return;
    }

    try {
      const { password } = req.body;
      const { token } = req.params;

      console.log("CreatePlayerAccount - Params: ", req.params);
      console.log("CreatePlayerAccount - Body: ", req.body);

      if (typeof token !== "string") {
        res.status(400).json(errorResponse("Invalid token provided", 400));
        return;
      }

      const newUser = await this.playerService.createPlayerAccount(
        password,
        token
      );

      res.status(201).json(
        successResponse({
          message: "Player account created successfully",
          newUser,
        })
      );
    } catch (error) {
      Logger.error("Error in creating player account: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to create player account", 400, error));
    }
  };

  GetCategoriesByGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Categories Get failed", 400, errors));
        return;
      }

      const { groupId } = req.params;

      const { categories, positions } = await this.playerService.getCategoriesandPositionsByGroup(+groupId);

      res.status(200).json(
        successResponse({
          message: "Categories retrieved successfully",
          categories,
          positions,
        })
      );
    } catch (error) {
      Logger.error("Error in getting categories: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to get categories", 400, error));
    }
  };

  // AssignPlayer = async (req: Request, res: Response): Promise<void> => {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     res
  //       .status(400)
  //       .json(errorResponse("Player Team Assignment failed", 400, errors));
  //     return;
  //   }

  //   try {
  //     const { groupId } = req.params;
  //     const { playerIds, teamId } = req.body;

  //     const updatedPlayers = await this.playerService.addPlayersToTeam(
  //       playerIds,
  //       +groupId,
  //       teamId
  //     );

  //     res.status(200).json(
  //       successResponse({
  //         message: "Players assigned to team successfully",
  //         updatedPlayers,
  //       })
  //     );
  //   } catch (error) {
  //     Logger.error("Error in assigning players to team: ", error);
  //     res
  //       .status(400)
  //       .json(errorResponse("Failed to assign players to team", 400, error));
  //   }
  // };

  // DeAssignPlayer = async (req: Request, res: Response): Promise<void> => {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     res
  //       .status(400)
  //       .json(errorResponse("Player Team Removal failed", 400, errors));
  //     return;
  //   }

  //   try {
  //     const { groupId } = req.params;
  //     const { playerIds, teamId } = req.body;

  //     const updatedPlayers = await this.playerService.removePlayersFromTeam(
  //       playerIds,
  //       +groupId,
  //       teamId
  //     );

  //     res.status(200).json(
  //       successResponse({
  //         message: "Players removed from team successfully",
  //         updatedPlayers,
  //       })
  //     );
  //   } catch (error) {
  //     Logger.error("Error in removing players from team: ", error);
  //     res
  //       .status(400)
  //       .json(errorResponse("Failed to remove players from team", 400, error));
  //   }
  // };
}

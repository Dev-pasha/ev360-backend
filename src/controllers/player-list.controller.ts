import { PlayerListService } from "../services/player-list.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class PlayerListController {
  private playerListService: PlayerListService;

  constructor() {
    this.playerListService = new PlayerListService();
  }

  /**
   * Create a new player list
   */
  createPlayerList = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Player list creation failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { name } = req.body;

      console.log("sadsd", groupId, name);

      const newList = await this.playerListService.createPlayerList(+groupId, {
        name,
      });

      res.status(201).json(
        successResponse({
          message: "Player list created successfully",
          list: newList,
        })
      );
    } catch (error: any) {
      Logger.error("Error in player list creation: ", error);

      // Handle specific errors
      if (error.message?.includes("already exists")) {
        res.status(409).json(errorResponse(error.message, 409));
      } else {
        res
          .status(400)
          .json(errorResponse("Player list creation failed", 400, error));
      }
    }
  };

  /**
   * Get all player lists for a group
   */
  getPlayerLists = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get player lists failed", 400, errors));
        return;
      }

      const { groupId } = req.params;

      const lists = await this.playerListService.getPlayerLists(+groupId);

      res.status(200).json(
        successResponse({
          message: "Player lists fetched successfully",
          lists,
          count: lists.length,
        })
      );
    } catch (error) {
      Logger.error("Error in fetching player lists: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to fetch player lists", 400, error));
    }
  };

  /**
   * Get a single player list with players
   */
  getPlayerListById = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get player list failed", 400, errors));
        return;
      }

      const { groupId, listId } = req.params;

      const list = await this.playerListService.getPlayerListById(
        +groupId,
        +listId
      );

      res.status(200).json(
        successResponse({
          message: "Player list fetched successfully",
          list,
          playerCount: list.players?.length || 0,
        })
      );
    } catch (error) {
      Logger.error("Error in fetching player list: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to fetch player list", 400, error));
    }
  };

  /**
   * Update a player list
   */
  updatePlayerList = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Update player list failed", 400, errors));
        return;
      }

      const { groupId, listId } = req.params;
      const { name } = req.body;

      const updatedList = await this.playerListService.updatePlayerList(
        +groupId,
        +listId,
        { name }
      );

      res.status(200).json(
        successResponse({
          message: "Player list updated successfully",
          list: updatedList,
        })
      );
    } catch (error: any) {
      Logger.error("Error in updating player list: ", error);

      if (error.message?.includes("already exists")) {
        res.status(409).json(errorResponse(error.message, 409));
      } else {
        res
          .status(400)
          .json(errorResponse("Failed to update player list", 400, error));
      }
    }
  };

  /**
   * Delete a player list
   */
  deletePlayerList = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Delete player list failed", 400, errors));
        return;
      }

      const { groupId, listId } = req.params;

      await this.playerListService.deletePlayerList(+groupId, +listId);

      res.status(200).json(
        successResponse({
          message: "Player list deleted successfully",
        })
      );
    } catch (error) {
      Logger.error("Error in deleting player list: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to delete player list", 400, error));
    }
  };

  /**
   * Add players to a list
   */
  addPlayersToList = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Add players to list failed", 400, errors));
        return;
      }

      const { groupId, listId } = req.params;
      const { playerIds } = req.body;

      const result = await this.playerListService.addPlayersToList(
        +groupId,
        +listId,
        playerIds
      );

      res.status(200).json(
        successResponse({
          message: "Players added to list successfully",
          added: result.added,
          skipped: result.skipped,
          errors: result.errors,
        })
      );
    } catch (error) {
      Logger.error("Error in adding players to list: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to add players to list", 400, error));
    }
  };

  /**
   * Remove players from a list
   */
  removePlayersFromList = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Remove players from list failed", 400, errors));
        return;
      }

      const { groupId, listId } = req.params;
      const { playerIds } = req.body;

      const result = await this.playerListService.removePlayersFromList(
        +groupId,
        +listId,
        playerIds
      );

      res.status(200).json(
        successResponse({
          message: "Players removed from list successfully",
          removed: result.removed,
          notInList: result.notInList,
        })
      );
    } catch (error) {
      Logger.error("Error in removing players from list: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to remove players from list", 400, error));
    }
  };

  /**
   * Get lists containing a specific player
   */
  getPlayerListsByPlayer = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get player lists failed", 400, errors));
        return;
      }

      const { groupId, playerId } = req.params;

      const lists = await this.playerListService.getPlayerListsByPlayer(
        +groupId,
        +playerId
      );

      res.status(200).json(
        successResponse({
          message: "Player lists fetched successfully",
          lists,
          count: lists.length,
        })
      );
    } catch (error) {
      Logger.error("Error in fetching player lists: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to fetch player lists", 400, error));
    }
  };

  /**
   * Manage players in a list (add/remove)
   */
  manageListPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Manage list players failed", 400, errors));
        return;
      }

      console.log("ManageListPlayers");
      const { groupId, listId } = req.params;
      const { action, playerIds } = req.body;

      console.log(
        "Group ID:",
        groupId,
        "List ID:",
        listId,
        "Action:",
        action,
        "Player IDs:",
        playerIds
      );

      let result;
      let message;

      switch (action) {
        case "add":
          result = await this.playerListService.addPlayersToList(
            +groupId,
            +listId,
            playerIds
          );
          message = "Players added to list successfully";
          break;

        case "remove":
          result = await this.playerListService.removePlayersFromList(
            +groupId,
            +listId,
            playerIds
          );
          message = "Players removed from list successfully";
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
      Logger.error("Error in managing list players: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to manage list players", 400, error));
    }
  };

  /**
   * Get Attributes group ID
   */
  getAttributesGroupId = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Get attributes group ID failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      

      console.log("Fetching attributes group ID for group:", groupId);

      const attributesGroupId =
        await this.playerListService.getGroupAttributes(+groupId);

        console.log("Attributes Group ID:", attributesGroupId);

      res.status(200).json(
        successResponse({
          message: "Attributes group ID fetched successfully",
          attributesGroupId,
        })
      );
    } catch (error) {
      Logger.error("Error in fetching attributes group ID: ", error);
      res
        .status(400)
        .json(errorResponse("Failed to fetch attributes group ID", 400, error));
    }
  };
}

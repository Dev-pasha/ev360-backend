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
      const { playerData } = req.body;

      // console.log("Group ID: ", groupId);
      // console.log("Player Data: ", playerData);

      const newPlayer = await this.playerService.createPlayer(
        +groupId,
        playerData
      );

      res.status(201).json(
        successResponse({
          message: "Player created successfully",
        //   newPlayer,
        
        })
      );
    } catch (error) {
      Logger.error("Error in position creation: ", error);
      res
        .status(400)
        .json(errorResponse("Position creation failed", 400, error));
    }
  };
}

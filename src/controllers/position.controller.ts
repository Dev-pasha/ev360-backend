import { PositionService } from "../services/position.service";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { successResponse, errorResponse } from "../utils/response";
import Logger from "../config/logger";

export class PositionController {
  private positionService: PositionService;

  constructor() {
    this.positionService = new PositionService();
  }

  CreatePosition = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Position creation failed", 400, errors));
        return;
      }

      const { groupId } = req.params;
      const { name, description, is_active } = req.body;
      console.log(
        "CreatePosition",
        groupId,
        name,
        description,
        is_active
      );

      // Create position
      const position = await this.positionService.createPosition(+groupId, {
        name,
        description,
        is_active,
      });

      res.status(201).json(
        successResponse({
          message: "Position created successfully",
          position,
        })
      );
    } catch (error) {
      Logger.error("Error in position creation: ", error);
      res
        .status(400)
        .json(errorResponse("Position creation failed", 400, error));
    }
  };

  GetPositions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;

      // Get positions
      const positions = await this.positionService.getPositions(
        Number(groupId)
      );

      res.status(200).json(
        successResponse({
          message: "Positions retrieved successfully",
          positions,
        })
      );
    } catch (error) {
      Logger.error("Error in getting positions: ", error);
      res
        .status(400)
        .json(errorResponse("Getting positions failed", 400, error));
    }
  };

  UpdatePosition = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res
          .status(400)
          .json(errorResponse("Position update failed", 400, errors));
        return;
      }

      const { positionId } = req.query;
      const { name, description, is_active } = req.body;

      // Update position
      const position = await this.positionService.updatePosition(
        Number(positionId),
        {
          name,
          description,
          is_active,
        }
      );

      res.status(200).json(
        successResponse({
          message: "Position updated successfully",
          position,
        })
      );
    } catch (error) {
      Logger.error("Error in position update: ", error);
      res.status(400).json(errorResponse("Position update failed", 400, error));
    }
  };

  DeletePosition = async (req: Request, res: Response): Promise<void> => {
    try {
      const { positionId } = req.query;

      // Delete position
      await this.positionService.deletePosition(Number(positionId));

      res.status(200).json(
        successResponse({
          message: "Position deleted successfully",
        })
      );
    } catch (error) {
      Logger.error("Error in position deletion: ", error);
      res
        .status(400)
        .json(errorResponse("Position deletion failed", 400, error));
    }
  };
}

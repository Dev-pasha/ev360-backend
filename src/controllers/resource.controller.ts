import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { ResourceService } from "../services/resource.service";
import { errorResponse, successResponse } from "../utils/response";
import Logger from "../config/logger";

export class ResourceController {
  private resourceService: ResourceService;

  constructor() {
    this.resourceService = new ResourceService();
  }

  /**
   * Create a new resource
   * POST /api/v1/resources/:groupId
   */
  createResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { groupId } = req.params;
      const resourceData = req.body;

      const resource = await this.resourceService.createResource(
        parseInt(groupId),
        resourceData
      );

      res.status(201).json(
        successResponse(resource, "Resource created successfully")
      );
    } catch (error) {
      Logger.error("Error creating resource:", error);
      res.status(500).json(
        errorResponse(
          "Failed to create resource",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  };

  /**
   * Get all resources for a group
   * GET /api/v1/resources/:groupId
   */
  getGroupResources = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId } = req.params;

      const resources = await this.resourceService.getGroupResources(parseInt(groupId));

      res.status(200).json(
        successResponse(resources, "Resources retrieved successfully")
      );
    } catch (error) {
      Logger.error("Error getting resources:", error);
      res.status(500).json(
        errorResponse(
          "Failed to get resources",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  };

  /**
   * Get a resource by ID
   * GET /api/v1/resources/:groupId/:resourceId
   */
  getResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceId } = req.params;

      const resource = await this.resourceService.getResourceById(parseInt(resourceId));

      res.status(200).json(
        successResponse(resource, "Resource retrieved successfully")
      );
    } catch (error) {
      Logger.error("Error getting resource:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }
      
      res.status(500).json(
        errorResponse(
          "Failed to get resource",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  };

  /**
   * Update a resource
   * PUT /api/v1/resources/:groupId/:resourceId
   */
  updateResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json(errorResponse("Validation failed", 400, errors.array()));
        return;
      }

      const { resourceId } = req.params;
      const resourceData = req.body;

      const resource = await this.resourceService.updateResource(
        parseInt(resourceId),
        resourceData
      );

      res.status(200).json(
        successResponse(resource, "Resource updated successfully")
      );
    } catch (error) {
      Logger.error("Error updating resource:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }
      
      res.status(500).json(
        errorResponse(
          "Failed to update resource",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  };

  /**
   * Delete a resource
   * DELETE /api/v1/resources/:groupId/:resourceId
   */
  deleteResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceId } = req.params;

      const deleted = await this.resourceService.deleteResource(parseInt(resourceId));

      if (deleted) {
        res.status(200).json(
          successResponse(null, "Resource deleted successfully")
        );
      } else {
        res.status(404).json(
          errorResponse("Resource not found", 404)
        );
      }
    } catch (error) {
      Logger.error("Error deleting resource:", error);
      res.status(500).json(
        errorResponse(
          "Failed to delete resource",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  };

  /**
   * Get resources visible to a player
   * GET /api/v1/resources/:groupId/player/:playerId
   */
  getPlayerResources = async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId, playerId } = req.params;

      const resources = await this.resourceService.getPlayerVisibleResources(
        parseInt(playerId),
        parseInt(groupId)
      );

      res.status(200).json(
        successResponse(resources, "Player resources retrieved successfully")
      );
    } catch (error) {
      Logger.error("Error getting player resources:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json(errorResponse(error.message, 404));
        return;
      }
      
      res.status(500).json(
        errorResponse(
          "Failed to get player resources",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  };
}
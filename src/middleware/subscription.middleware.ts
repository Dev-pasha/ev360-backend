import { Request, Response, NextFunction } from "express";
import { SubscriptionService } from "../services/subscription.service";
import { errorResponse } from "../utils/response";

const subscriptionService = new SubscriptionService();

/**
 * Middleware to check if a user can create more groups
 */
export const canCreateGroupMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json(errorResponse("Unauthorized", 401));
      return;
    }
    

    const canCreate = await subscriptionService.canCreateGroup(user.id);
    
    if (!canCreate) {
      res.status(403).json(
        errorResponse(
          "You have reached the maximum number of groups allowed by your subscription plan",
          403
        )
      );
      return;
    }

    next();
  } catch (error) {
    res.status(500).json(
      errorResponse(
        "Error checking subscription limits",
        500,
        error instanceof Error ? error.message : "Unknown error"
      )
    );
  }
};

/**
 * Middleware to check if a group can add more users
 */
export const canAddUserToGroupMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.groupId);
    
    if (isNaN(groupId)) {
      res.status(400).json(errorResponse("Invalid group ID", 400));
      return;
    }

    const canAdd = await subscriptionService.canAddUserToGroup(groupId);
    
    if (!canAdd) {
      res.status(403).json(
        errorResponse(
          "This group has reached the maximum number of users allowed by the subscription plan",
          403
        )
      );
      return;
    }

    next();
  } catch (error) {
    res.status(500).json(
      errorResponse(
        "Error checking subscription limits",
        500,
        error instanceof Error ? error.message : "Unknown error"
      )
    );
  }
};

/**
 * Middleware to check if a group can add more players
 */
export const canAddPlayerToGroupMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const groupId = parseInt(req.params.groupId);
    
    if (isNaN(groupId)) {
      res.status(400).json(errorResponse("Invalid group ID", 400));
      return;
    }

    const canAdd = await subscriptionService.canAddPlayerToGroup(groupId);
    
    if (!canAdd) {
      res.status(403).json(
        errorResponse(
          "This group has reached the maximum number of players allowed by the subscription plan",
          403
        )
      );
      return;
    }

    next();
  } catch (error) {
    res.status(500).json(
      errorResponse(
        "Error checking subscription limits",
        500,
        error instanceof Error ? error.message : "Unknown error"
      )
    );
  }
};
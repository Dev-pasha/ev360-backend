import { Request, Response, NextFunction } from "express";
import { SaasOwnerService } from "../services/saas-owner.service";
import { errorResponse } from "../utils/response";
import Logger from "../config/logger";

const saasOwnerService = new SaasOwnerService();

/**
 * Middleware to authenticate SaaS owner requests
 */
export const saasOwnerAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(errorResponse("Authorization token required", 401));
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token
    const decoded = saasOwnerService.verifyToken(token);
    
    // Check if it's a SaaS owner token
    if (decoded.type !== 'saas_owner') {
      res.status(403).json(errorResponse("Invalid token type", 403));
      return;
    }

    // Get the SaaS owner from database
    const saasOwner = await saasOwnerService.getProfile(decoded.id);
    
    if (!saasOwner) {
      res.status(401).json(errorResponse("SaaS owner not found", 401));
      return;
    }

    if (!saasOwner.isActive) {
      res.status(403).json(errorResponse("Account is deactivated", 403));
      return;
    }

    // Add SaaS owner to request object
    (req as any).saasOwner = saasOwner;
    (req as any).tokenData = decoded;
    
    next();
  } catch (error) {
    Logger.error("SaaS owner authentication error:", error);
    
    if (error instanceof Error && error.message.includes('jwt')) {
      res.status(401).json(errorResponse("Invalid or expired token", 401));
    } else {
      res.status(500).json(
        errorResponse(
          "Authentication failed",
          500,
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    }
  }
};

/**
 * Middleware to check if SaaS owner already exists (for bootstrap protection)
 */
export const preventDuplicateSaasOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exists = await saasOwnerService.saasOwnerExists();
    
    if (exists) {
      res.status(409).json(
        errorResponse(
          "SaaS owner already exists. Bootstrap is not allowed.",
          409
        )
      );
      return;
    }
    
    next();
  } catch (error) {
    Logger.error("Error checking SaaS owner existence:", error);
    res.status(500).json(
      errorResponse(
        "Failed to verify bootstrap eligibility",
        500,
        error instanceof Error ? error.message : "Unknown error"
      )
    );
  }
};

/**
 * Optional middleware to log SaaS owner actions for audit
 */
export const auditSaasOwnerAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const saasOwner = (req as any).saasOwner;
    
    if (saasOwner) {
      Logger.info(`SaaS Owner Action: ${action}`, {
        ownerId: saasOwner.id,
        ownerEmail: saasOwner.email,
        action,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestBody: req.method === 'GET' ? {} : req.body
      });
    }
    
    next();
  };
};

/**
 * Rate limiting middleware specifically for SaaS owner endpoints
 */
export const saasOwnerRateLimit = (maxRequests: number, windowMinutes: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const saasOwner = (req as any).saasOwner;
    const key = saasOwner ? `saas_owner_${saasOwner.id}` : req.ip || "unknown";
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const requestInfo = requests.get(key);
    
    if (!requestInfo || now > requestInfo.resetTime) {
      // Reset or initialize
      requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (requestInfo.count >= maxRequests) {
      res.status(429).json(
        errorResponse(
          `Too many requests. Limit: ${maxRequests} per ${windowMinutes} minutes`,
          429
        )
      );
      return;
    }
    
    requestInfo.count++;
    requests.set(key, requestInfo);
    next();
  };
};
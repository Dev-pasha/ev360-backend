// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: number;
        email: string;
        groupRoles: any[]; // adjust to match your token payload
      };
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  return new Promise((resolve) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ message: "No token provided" });
      return resolve();
    }

    // Get token from header
    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Invalid token format" });
      return resolve();
    }

    // Verify token
    const authService = new AuthService();
    const payload = authService.verifyToken(token);

    if (!payload) {
      res.status(401).json({ message: "Invalid or expired token" });
      return resolve();
    }

    console.log("Payload: ", payload);
    // Attach user to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      groupRoles: payload.groupRoles,
    };

    next();
    resolve();
  });
}

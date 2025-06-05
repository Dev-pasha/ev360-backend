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
    // First check Authorization header
    const authHeader = req.headers.authorization;
    let token: string | undefined;


    console.log("Auth Middleware called");
    // Check for Authorization header
    console.log("Authorization Header: ", authHeader);

    if (authHeader) {
      // Get token from header
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.accessToken) {

      console.log("No Authorization header found, checking cookies");

      // If no Authorization header, check for cookie
      token = req.cookies.accessToken;
    }

    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return resolve();
    }

    // Verify token
    const authService = new AuthService();
    const payload = authService.verifyToken(token);

    if (!payload) {
      res.status(401).json({ message: "Invalid or expired token" });
      return resolve();
    }


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

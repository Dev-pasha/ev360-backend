/**
 * Logger Middleware
 *
 * This middleware logs incoming HTTP requests.
 */
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

/**
 * Logs HTTP requests details
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = new Date();

  // Log when request completes
  res.on("finish", () => {
    const duration = new Date().getTime() - startTime.getTime();
    logger.info(
      `${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`
    );
  });

  next();
};

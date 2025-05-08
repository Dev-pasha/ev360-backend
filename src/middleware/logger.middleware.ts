import { Request, Response, NextFunction } from 'express';
import Logger from '../config/logger';

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  Logger.http(`${req.method} ${req.path}`);
  next();
};

export default loggerMiddleware;
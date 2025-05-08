import { Request, Response, NextFunction } from 'express';
import Logger from '../config/logger';

class HttpException extends Error {
  status: number;
  message: string;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

const errorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';
    
    Logger.error(`[${req.method}] ${req.path} >> StatusCode: ${status}, Message: ${message}`);
    
    res.status(status).json({ message });
  } catch (err) {
    next(err);
  }
};

export default errorMiddleware;
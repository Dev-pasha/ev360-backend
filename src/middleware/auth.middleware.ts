import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth';
import Logger from '../config/logger';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    const decodedToken = jwt.verify(token, authConfig.jwtSecret);
    req.user = decodedToken;
    
    next();
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`Authentication error: ${error.message}`);
    } else {
      Logger.error('Authentication error: An unknown error occurred');
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};
// src/middleware/permission.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';
import { AuthenticatedRequest } from './auth.middleware';

export function requirePermission(permissionName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    // Get group ID from request
    const groupId = parseInt(req.params.groupId || req.body.groupId);
    
    if (!groupId || isNaN(groupId)) {
      return res.status(400).json({ message: 'Group ID required' });
    }
    
    // Check permission
    const permissionService = new PermissionService();
    const hasPermission = await permissionService.hasPermission(
      req.user.id,
      groupId,
      permissionName
    );
    
    if (!hasPermission) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    next();
  };
}
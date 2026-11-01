import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthPayload, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid. Please log in.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      role: decoded.app_metadata?.role || decoded.role || 'requester',
      fullName: decoded.fullName || decoded.user_metadata?.full_name || decoded.user_metadata?.name || '',
    };
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Session expired or token invalid. Please log in again.'
    });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. This endpoint requires one of the following roles: ${allowedRoles.join(', ')}.`
      });
      return;
    }

    next();
  };
}

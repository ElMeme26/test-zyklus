import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService.js';
import type { JwtPayload, UserRole } from '../types/index.js';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/** Valida el JWT y adjunta req.user. Devuelve 401 si no hay token o es inválido. */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.user = payload;
  next();
}

/** Middleware que restringe el acceso por rol (403 si no está permitido). */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'No tiene permiso para esta acción.' });
      return;
    }
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { ACCESS_COOKIE_NAME, verifyAccessToken } from '../utils/security';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Sesión requerida.' });
  }

  try {
    req.userId = verifyAccessToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesión no válida o caducada.' });
  }
}

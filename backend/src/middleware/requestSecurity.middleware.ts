import { NextFunction, Request, Response } from 'express';
import { allowedOrigins } from '../utils/security';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// SameSite cookies already mitigate CSRF. This check adds a second guard for browser requests.
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (!UNSAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) return next(); // Native clients and server-to-server clients do not send Origin.

  if (!allowedOrigins().includes(origin)) {
    return res.status(403).json({ error: 'Origen de la solicitud no permitido.' });
  }
  next();
}

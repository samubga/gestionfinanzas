import { Request, Response, NextFunction } from 'express';
import { ACCESS_COOKIE_NAME, verifyAccessToken } from '../utils/security';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Sesión requerida.' });
  }

  try {
    const { userId, sessionVersion } = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sessionVersion: true },
    });
    if (!user || user.sessionVersion !== sessionVersion) {
      return res.status(401).json({ error: 'Sesión no válida o caducada.' });
    }
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesión no válida o caducada.' });
  }
}

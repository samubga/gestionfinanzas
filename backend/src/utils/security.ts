import { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';

// Firebase Hosting only forwards this specifically named cookie to Cloud Run.
// Keeping the session host-only, HttpOnly and Secure still prevents client-side
// code from reading it and keeps it scoped to the API path.
export const ACCESS_COOKIE_NAME = '__session';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET debe estar configurado y tener al menos 32 caracteres.');
  }
  return secret;
}

export function createAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, jwtSecret(), {
    expiresIn: '12h',
    issuer: 'gestionfinanzas',
    audience: 'gestionfinanzas-web',
  });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, jwtSecret(), {
    issuer: 'gestionfinanzas',
    audience: 'gestionfinanzas-web',
  }) as jwt.JwtPayload;

  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Token sin usuario válido.');
  return payload.sub;
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: TOKEN_TTL_MS,
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  const { maxAge, ...options } = sessionCookieOptions();
  return options;
}

export function assertProductionConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['DATABASE_URL', 'JWT_SECRET', 'APP_ORIGIN', 'INVITE_CODES'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) throw new Error(`Faltan variables de producción: ${missing.join(', ')}`);
  jwtSecret();

  try {
    const origin = new URL(process.env.APP_ORIGIN!);
    if (origin.protocol !== 'https:') throw new Error('APP_ORIGIN debe usar HTTPS.');
  } catch {
    throw new Error('APP_ORIGIN debe ser una URL HTTPS válida.');
  }
}

export function allowedOrigins(): string[] {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) return [new URL(configured).origin];
  return process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000'];
}

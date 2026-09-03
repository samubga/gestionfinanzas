import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { ACCESS_COOKIE_NAME, clearSessionCookieOptions, createAccessToken, sessionCookieOptions } from '../utils/security';
import { AuthRequest } from '../middleware/auth.middleware';

const passwordSchema = z.string().min(8).max(128)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'La contraseña debe incluir letras y números.');

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
  name: z.string().trim().min(1).max(80).optional(),
  inviteCode: z.string().min(8).max(256),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: passwordSchema,
});

const changeEmailSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  avatarData: z.string().max(200_000).regex(/^data:image\/(jpeg|png|webp);base64,/, 'Formato de imagen no válido.').nullable().optional(),
});

const displayPreferencesSchema = z.object({
  themeDark: z.boolean(),
  colorTheme: z.enum(['indigo', 'sapphire', 'teal', 'amber', 'ocean', 'violet', 'rose', 'obsidian']),
  layoutMode: z.enum(['classic', 'bento']),
});

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESET_REQUEST_MESSAGE = 'Si el correo corresponde a una cuenta, recibirás un enlace para restablecer la contraseña.';

function isValidInviteCode(inviteCode: string): boolean {
  const configuredCodes = (process.env.INVITE_CODES || '').split(',').map((code) => code.trim()).filter(Boolean);
  return configuredCodes.some((configured) => {
    const expected = Buffer.from(configured);
    const received = Buffer.from(inviteCode);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });
}

function setSession(res: Response, userId: string, sessionVersion: number) {
  res.cookie(ACCESS_COOKIE_NAME, createAccessToken(userId, sessionVersion), sessionCookieOptions());
}

function passwordResetUrl(token: string): string {
  const origin = process.env.APP_ORIGIN?.trim() || 'http://localhost:3000';
  const url = new URL(origin);
  url.searchParams.set('resetToken', token);
  return url.toString();
}

async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) throw new Error('Resend no está configurado.');

  const resetUrl = passwordResetUrl(token);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Restablece tu contraseña de Gestión Finanzas',
      text: `Hemos recibido una solicitud para restablecer tu contraseña. Usa este enlace en los próximos 30 minutos: ${resetUrl}`,
      html: `<p>Hemos recibido una solicitud para restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>El enlace caduca en 30 minutos. Si no la solicitaste, puedes ignorar este correo.</p>`,
    }),
  });

  if (!response.ok) throw new Error(`Resend rechazó el envío (${response.status}).`);
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Revisa el correo, la contraseña y el código de invitación.' });
  const { email, password, name, inviteCode } = parsed.data;
  if (!isValidInviteCode(inviteCode)) return res.status(403).json({ error: 'El código de invitación no es válido.' });

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Seed default categories
    const defaultCategories = [
      { name: 'Alimentación', color: '#EF4444' },
      { name: 'Transporte', color: '#F59E0B' },
      { name: 'Vivienda', color: '#10B981' },
      { name: 'Ocio', color: '#3B82F6' },
      { name: 'Viajes', color: '#8B5CF6' },
      { name: 'Salud', color: '#EC4899' },
      { name: 'Gimnasio', color: '#06B6D4' },
      { name: 'Tecnología', color: '#6366F1' },
      { name: 'Suscripciones', color: '#14B8A6' },
      { name: 'Otros', color: '#6B7280' },
    ];

    await prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        name: cat.name,
        color: cat.color,
        userId: user.id,
      })),
    });

    // Seed default bank accounts
    await prisma.bankAccount.createMany({
      data: [
        { name: 'Manual', startingBalance: 0, userId: user.id },
        { name: 'CaixaBank', startingBalance: 0, userId: user.id },
        { name: 'Trade Republic', startingBalance: 0, userId: user.id },
      ],
    });

    setSession(res, user.id, user.sessionVersion);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarData: user.avatarData,
        themeDark: user.themeDark,
        colorTheme: user.colorTheme,
        layoutMode: user.layoutMode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar el usuario' });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Credenciales inválidas.' });
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    setSession(res, user.id, user.sessionVersion);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarData: user.avatarData,
        themeDark: user.themeDark,
        colorTheme: user.colorTheme,
        layoutMode: user.layoutMode,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al iniciar sesión' });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(ACCESS_COOKIE_NAME, clearSessionCookieOptions());
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.json({ message: RESET_REQUEST_MESSAGE });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return res.json({ message: RESET_REQUEST_MESSAGE });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
      return tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
      });
    });

    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (error) {
      await prisma.passwordResetToken.delete({ where: { id: reset.id } }).catch(() => undefined);
      console.error('No se pudo enviar el correo de restablecimiento:', error instanceof Error ? error.message : error);
    }
  } catch (error) {
    console.error('No se pudo procesar la recuperación de contraseña:', error instanceof Error ? error.message : error);
  }

  return res.json({ message: RESET_REQUEST_MESSAGE });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'El enlace o la nueva contraseña no son válidos.' });

  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  try {
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset || reset.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'El enlace ha caducado o ya se ha utilizado.' });
    }

    const password = await bcrypt.hash(parsed.data.password, 12);
    const consumed = await prisma.$transaction(async (tx) => {
      const result = await tx.passwordResetToken.deleteMany({
        where: { id: reset.id, expiresAt: { gt: new Date() } },
      });
      if (result.count !== 1) return false;
      await tx.user.update({
        where: { id: reset.userId },
        data: { password, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId } });
      return true;
    });
    if (!consumed) return res.status(400).json({ error: 'El enlace ha caducado o ya se ha utilizado.' });

    return res.json({ message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('No se pudo restablecer la contraseña:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña.' });
  }
}

export async function changePassword(req: AuthRequest, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'La nueva contraseña debe tener 8 caracteres e incluir letras y números.' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user || !await bcrypt.compare(parsed.data.currentPassword, user.password)) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    const password = await bcrypt.hash(parsed.data.password, 12);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { password, sessionVersion: { increment: 1 } },
      select: { id: true, sessionVersion: true },
    });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    setSession(res, updated.id, updated.sessionVersion);
    return res.json({ message: 'Contraseña actualizada.' });
  } catch (error) {
    console.error('No se pudo cambiar la contraseña:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'No se pudo cambiar la contraseña.' });
  }
}

export async function changeEmail(req: AuthRequest, res: Response) {
  const parsed = changeEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Revisa el correo y la contraseña actual.' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user || !await bcrypt.compare(parsed.data.currentPassword, user.password)) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing && existing.id !== user.id) return res.status(400).json({ error: 'Ese correo ya está en uso.' });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: parsed.data.email },
      select: { id: true, email: true, name: true, avatarData: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true, themeDark: true, colorTheme: true, layoutMode: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error('No se pudo cambiar el correo:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'No se pudo cambiar el correo.' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Revisa el nombre y la imagen de perfil.' });

  try {
    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: { name: parsed.data.name, ...(parsed.data.avatarData !== undefined ? { avatarData: parsed.data.avatarData } : {}) },
      select: { id: true, email: true, name: true, avatarData: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true, themeDark: true, colorTheme: true, layoutMode: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error('No se pudo actualizar el perfil:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
  }
}

export async function getMe(req: any, res: Response) {
  const userId = req.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarData: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true, themeDark: true, colorTheme: true, layoutMode: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Error en getMe:', error);
    res.status(500).json({ error: error.message || 'Error al obtener los datos del usuario' });
  }
}

export async function updateDisplayPreferences(req: AuthRequest, res: Response) {
  const parsed = displayPreferencesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Las preferencias de visualización no son válidas.' });

  try {
    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: parsed.data,
      select: { id: true, email: true, name: true, avatarData: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true, themeDark: true, colorTheme: true, layoutMode: true },
    });
    return res.json(updated);
  } catch (error) {
    console.error('No se pudieron actualizar las preferencias de visualización:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'No se pudieron actualizar las preferencias de visualización.' });
  }
}

export async function updateStartingBalance(req: any, res: Response) {
  const userId = req.userId;
  const { startingBalance, startingBalanceCaixa, startingBalanceTrade } = req.body;

  const updateData: any = {};
  if (startingBalance !== undefined) {
    if (isNaN(parseFloat(startingBalance))) {
      return res.status(400).json({ error: 'El saldo inicial Manual debe ser un número válido' });
    }
    updateData.startingBalance = parseFloat(startingBalance);
  }
  if (startingBalanceCaixa !== undefined) {
    if (isNaN(parseFloat(startingBalanceCaixa))) {
      return res.status(400).json({ error: 'El saldo inicial CaixaBank debe ser un número válido' });
    }
    updateData.startingBalanceCaixa = parseFloat(startingBalanceCaixa);
  }
  if (startingBalanceTrade !== undefined) {
    if (isNaN(parseFloat(startingBalanceTrade))) {
      return res.status(400).json({ error: 'El saldo inicial Trade Republic debe ser un número válido' });
    }
    updateData.startingBalanceTrade = parseFloat(startingBalanceTrade);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, avatarData: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true, themeDark: true, colorTheme: true, layoutMode: true },
    });

    // Also update dynamic bank account records for backwards compatibility
    if (startingBalance !== undefined) {
      await prisma.bankAccount.upsert({
        where: { name_userId: { name: 'Manual', userId } },
        update: { startingBalance: parseFloat(startingBalance) },
        create: { name: 'Manual', startingBalance: parseFloat(startingBalance), userId }
      });
    }
    if (startingBalanceCaixa !== undefined) {
      await prisma.bankAccount.upsert({
        where: { name_userId: { name: 'CaixaBank', userId } },
        update: { startingBalance: parseFloat(startingBalanceCaixa) },
        create: { name: 'CaixaBank', startingBalance: parseFloat(startingBalanceCaixa), userId }
      });
    }
    if (startingBalanceTrade !== undefined) {
      await prisma.bankAccount.upsert({
        where: { name_userId: { name: 'Trade Republic', userId } },
        update: { startingBalance: parseFloat(startingBalanceTrade) },
        create: { name: 'Trade Republic', startingBalance: parseFloat(startingBalanceTrade), userId }
      });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar el saldo inicial' });
  }
}

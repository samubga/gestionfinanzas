import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { ACCESS_COOKIE_NAME, clearSessionCookieOptions, createAccessToken, sessionCookieOptions } from '../utils/security';

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128)
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'La contraseña debe incluir letras y números.'),
  name: z.string().trim().min(1).max(80).optional(),
  inviteCode: z.string().min(8).max(256),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

function isValidInviteCode(inviteCode: string): boolean {
  const configuredCodes = (process.env.INVITE_CODES || '').split(',').map((code) => code.trim()).filter(Boolean);
  return configuredCodes.some((configured) => {
    const expected = Buffer.from(configured);
    const received = Buffer.from(inviteCode);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });
}

function setSession(res: Response, userId: string) {
  res.cookie(ACCESS_COOKIE_NAME, createAccessToken(userId), sessionCookieOptions());
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

    setSession(res, user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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

    setSession(res, user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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

export async function getMe(req: any, res: Response) {
  const userId = req.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true },
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
      select: { id: true, email: true, name: true, startingBalance: true, startingBalanceCaixa: true, startingBalanceTrade: true },
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

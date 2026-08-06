import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'super-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

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

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'super-secret-key-change-in-production',
      { expiresIn: '30d' }
    );

    res.json({
      token,
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


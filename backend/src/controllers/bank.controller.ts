import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getBanks(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  try {
    const banks = await prisma.bank.findMany({
      where: {
        OR: [
          { userId: null },
          { userId }
        ]
      },
      orderBy: [
        { isCustom: 'asc' },
        { name: 'asc' }
      ]
    });
    res.json(banks);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener la lista de bancos' });
  }
}

export async function createCustomBank(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { name, color, logoUrl } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del banco es requerido' });
  }

  const cleanName = name.trim();

  try {
    const existing = await prisma.bank.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        OR: [
          { userId: null },
          { userId }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe un banco con este nombre' });
    }

    const bank = await prisma.bank.create({
      data: {
        name: cleanName,
        color: color || '#6366F1',
        logoUrl: logoUrl || null,
        isCustom: true,
        userId
      }
    });

    res.status(201).json(bank);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear el banco personalizado' });
  }
}

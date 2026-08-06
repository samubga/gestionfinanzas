import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getTransfers(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { startDate, endDate, search, minAmount, maxAmount } = req.query;

  const where: any = { userId };

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      where.date.gte = new Date(startDate as string);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  // Amount filter
  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) {
      where.amount.gte = parseFloat(minAmount as string);
    }
    if (maxAmount) {
      where.amount.lte = parseFloat(maxAmount as string);
    }
  }

  // Search filter
  if (search) {
    where.OR = [
      { description: { contains: search as string, mode: 'insensitive' } },
      { notes: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  try {
    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        fromAccount: { include: { bank: true } },
        toAccount: { include: { bank: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(transfers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener transferencias' });
  }
}

export async function createTransfer(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { amount, date, description, fromAccountId, toAccountId, notes } = req.body;

  if (amount === undefined || !date || !description || !fromAccountId || !toAccountId) {
    return res.status(400).json({ error: 'Importe, fecha, descripción, cuenta origen y cuenta destino son requeridos' });
  }

  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: 'La cuenta origen y destino deben ser diferentes' });
  }

  try {
    // Verify accounts exist and belong to user
    const fromAcc = await prisma.account.findFirst({ where: { id: fromAccountId, userId } });
    const toAcc = await prisma.account.findFirst({ where: { id: toAccountId, userId } });

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ error: 'Una o ambas cuentas no fueron encontradas o no pertenecen al usuario' });
    }

    const transferDate = new Date(date);
    const transfer = await prisma.transfer.create({
      data: {
        amount: parseFloat(amount),
        date: transferDate,
        description,
        notes: notes || null,
        fromAccountId,
        toAccountId,
        userId
      },
      include: {
        fromAccount: { include: { bank: true } },
        toAccount: { include: { bank: true } },
      }
    });

    res.status(201).json(transfer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la transferencia' });
  }
}

export async function updateTransfer(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { amount, date, description, fromAccountId, toAccountId, notes } = req.body;

  try {
    const existing = await prisma.transfer.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transferencia no encontrada' });
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes || null;

    if (fromAccountId !== undefined || toAccountId !== undefined) {
      const finalFromId = fromAccountId !== undefined ? fromAccountId : existing.fromAccountId;
      const finalToId = toAccountId !== undefined ? toAccountId : existing.toAccountId;

      if (finalFromId === finalToId) {
        return res.status(400).json({ error: 'La cuenta origen y destino deben ser diferentes' });
      }

      // Verify accounts belong to user
      if (fromAccountId !== undefined) {
        const fromAcc = await prisma.account.findFirst({ where: { id: fromAccountId, userId } });
        if (!fromAcc) return res.status(404).json({ error: 'Cuenta origen no encontrada o no pertenece al usuario' });
        updateData.fromAccountId = fromAccountId;
      }
      if (toAccountId !== undefined) {
        const toAcc = await prisma.account.findFirst({ where: { id: toAccountId, userId } });
        if (!toAcc) return res.status(404).json({ error: 'Cuenta destino no encontrada o no pertenece al usuario' });
        updateData.toAccountId = toAccountId;
      }
    }

    const updated = await prisma.transfer.update({
      where: { id },
      data: updateData,
      include: {
        fromAccount: { include: { bank: true } },
        toAccount: { include: { bank: true } },
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar la transferencia' });
  }
}

export async function deleteTransfer(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const existing = await prisma.transfer.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transferencia no encontrada' });
    }

    await prisma.transfer.delete({
      where: { id }
    });

    res.json({ message: 'Transferencia eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la transferencia' });
  }
}

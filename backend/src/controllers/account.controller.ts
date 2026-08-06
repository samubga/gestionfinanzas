import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getAccounts(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  try {
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: { bank: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener las cuentas' });
  }
}

export async function createAccount(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { name, type, startingBalance, currency, color, icon, bankId } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la cuenta es requerido' });
  }

  const cleanName = name.trim();

  try {
    const existing = await prisma.account.findUnique({
      where: {
        name_userId: { name: cleanName, userId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe una cuenta con este nombre' });
    }

    // Verify bank exists if bankId provided
    let bankObj = null;
    if (bankId) {
      bankObj = await prisma.bank.findFirst({
        where: {
          id: bankId,
          OR: [{ userId: null }, { userId }]
        }
      });
    }

    const account = await prisma.account.create({
      data: {
        name: cleanName,
        type: type || 'CHECKING',
        startingBalance: startingBalance !== undefined ? parseFloat(startingBalance) : 0,
        currency: currency || 'EUR',
        color: color || (bankObj ? bankObj.color : '#6366F1'),
        icon: icon || (type === 'CASH' ? '💵' : type === 'SAVINGS' ? '💰' : type === 'INVESTMENT' ? '📈' : type === 'CRYPTO' ? '🪙' : type === 'CREDIT_CARD' ? '💳' : '💳'),
        bankId: bankObj ? bankObj.id : null,
        userId
      },
      include: { bank: true }
    });

    res.status(201).json(account);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la cuenta' });
  }
}

export async function updateAccount(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { name, type, startingBalance, currency, color, icon, bankId } = req.body;

  try {
    const account = await prisma.account.findFirst({
      where: { id, userId },
    });
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const newName = name !== undefined ? name.trim() : account.name;
    const oldName = account.name;

    if (name && newName !== oldName) {
      const existing = await prisma.account.findUnique({
        where: {
          name_userId: { name: newName, userId }
        }
      });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Ya existe otra cuenta con este nombre' });
      }
    }

    let bankObj = null;
    if (bankId !== undefined) {
      if (bankId) {
        bankObj = await prisma.bank.findFirst({
          where: { id: bankId, OR: [{ userId: null }, { userId }] }
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.account.update({
        where: { id },
        data: {
          name: newName,
          type: type !== undefined ? type : account.type,
          startingBalance: startingBalance !== undefined ? parseFloat(startingBalance) : account.startingBalance,
          currency: currency !== undefined ? currency : account.currency,
          color: color !== undefined ? color : account.color,
          icon: icon !== undefined ? icon : account.icon,
          bankId: bankId !== undefined ? (bankObj ? bankObj.id : null) : account.bankId,
        },
        include: { bank: true }
      });

      // Update bank string field on transactions if name changed
      if (oldName !== newName) {
        await tx.expense.updateMany({
          where: { userId, OR: [{ accountId: id }, { bank: oldName }] },
          data: { bank: newName }
        });
        await tx.income.updateMany({
          where: { userId, OR: [{ accountId: id }, { bank: oldName }] },
          data: { bank: newName }
        });
        await tx.investment.updateMany({
          where: { userId, OR: [{ accountId: id }, { bank: oldName }] },
          data: { bank: newName }
        });
      }

      return acc;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar la cuenta' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const account = await prisma.account.findFirst({
      where: { id, userId },
    });
    if (!account) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const expenseCount = await prisma.expense.count({
      where: { userId, OR: [{ accountId: id }, { bank: account.name }] }
    });
    const incomeCount = await prisma.income.count({
      where: { userId, OR: [{ accountId: id }, { bank: account.name }] }
    });
    const investmentCount = await prisma.investment.count({
      where: { userId, OR: [{ accountId: id }, { bank: account.name }] }
    });

    if (expenseCount > 0 || incomeCount > 0 || investmentCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la cuenta porque tiene ${expenseCount + incomeCount + investmentCount} movimientos o inversiones asociados.`
      });
    }

    await prisma.account.delete({
      where: { id },
    });

    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la cuenta' });
  }
}

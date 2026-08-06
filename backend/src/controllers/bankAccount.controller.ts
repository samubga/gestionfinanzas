import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getBankAccounts(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json(bankAccounts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener las cuentas bancarias' });
  }
}

export async function createBankAccount(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { name, startingBalance } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la cuenta bancaria es requerido' });
  }

  const cleanName = name.trim();

  try {
    const existing = await prisma.bankAccount.findUnique({
      where: {
        name_userId: { name: cleanName, userId }
      }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una cuenta bancaria con este nombre' });
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: cleanName,
        startingBalance: startingBalance !== undefined ? parseFloat(startingBalance) : 0,
        userId,
      },
    });
    res.status(201).json(bankAccount);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la cuenta bancaria' });
  }
}

export async function updateBankAccount(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { name, startingBalance } = req.body;

  try {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id, userId },
    });
    if (!bankAccount) {
      return res.status(404).json({ error: 'Cuenta bancaria no encontrada' });
    }

    const newName = name !== undefined ? name.trim() : bankAccount.name;
    const oldName = bankAccount.name;

    if (name && newName !== oldName) {
      const existing = await prisma.bankAccount.findUnique({
        where: {
          name_userId: { name: newName, userId }
        }
      });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Ya existe otra cuenta bancaria con este nombre' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.bankAccount.update({
        where: { id },
        data: {
          name: newName,
          startingBalance: startingBalance !== undefined ? parseFloat(startingBalance) : bankAccount.startingBalance,
        },
      });

      if (oldName !== newName) {
        if (oldName === 'Manual') {
          await tx.expense.updateMany({
            where: { userId, OR: [{ bank: null }, { bank: 'Manual' }] },
            data: { bank: newName },
          });
          await tx.income.updateMany({
            where: { userId, OR: [{ bank: null }, { bank: 'Manual' }] },
            data: { bank: newName },
          });
          await tx.investment.updateMany({
            where: { userId, bank: 'Manual' },
            data: { bank: newName },
          });
        } else {
          await tx.expense.updateMany({
            where: { userId, bank: oldName },
            data: { bank: newName },
          });
          await tx.income.updateMany({
            where: { userId, bank: oldName },
            data: { bank: newName },
          });
          await tx.investment.updateMany({
            where: { userId, bank: oldName },
            data: { bank: newName },
          });
        }
      }

      return acc;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar la cuenta bancaria' });
  }
}

export async function deleteBankAccount(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id, userId },
    });
    if (!bankAccount) {
      return res.status(404).json({ error: 'Cuenta bancaria no encontrada' });
    }

    if (bankAccount.name === 'Manual') {
      return res.status(400).json({ error: 'No se puede eliminar la cuenta Manual por defecto' });
    }

    // Check if there are transactions or investments with this bank name
    const expenseCount = await prisma.expense.count({
      where: { bank: bankAccount.name, userId }
    });
    const incomeCount = await prisma.income.count({
      where: { bank: bankAccount.name, userId }
    });
    const investmentCount = await prisma.investment.count({
      where: { bank: bankAccount.name, userId }
    });

    if (expenseCount > 0 || incomeCount > 0 || investmentCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar la cuenta bancaria porque tiene ${expenseCount + incomeCount + investmentCount} movimientos o inversiones asociados.`
      });
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    res.json({ message: 'Cuenta bancaria eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la cuenta bancaria' });
  }
}

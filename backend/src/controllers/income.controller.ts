import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateMonthlySummary } from '../utils/summary';

export async function getIncomes(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { startDate, endDate, categoryId, search, bank, minAmount, maxAmount } = req.query;

  const where: any = { userId };
  const andConditions: any[] = [];

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

  if (categoryId) {
    where.categoryId = categoryId === 'null' ? null : (categoryId as string);
  }

  const accountId = req.query.accountId;
  if (accountId) {
    where.accountId = accountId as string;
  } else if (bank) {
    andConditions.push({
      OR: [
        { accountId: bank as string },
        { bank: bank as string }
      ]
    });
  }

  if (search) {
    andConditions.push({
      OR: [
        { description: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } }
      ]
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }
  try {
    const incomes = await prisma.income.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { date: 'desc' },
    });
    res.json(incomes);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener ingresos' });
  }
}

export async function createIncome(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { amount, date, description, categoryId, notes, bank } = req.body;

  if (!amount || !date || !description) {
    return res.status(400).json({ error: 'Importe, fecha y descripción son requeridos' });
  }

  try {
    const reqAccountId = req.body.accountId;
    let targetAccountId = reqAccountId || null;
    let targetBankName = bank || null;

    if (reqAccountId) {
      const acc = await prisma.account.findFirst({ where: { id: reqAccountId, userId } });
      if (acc) {
        targetBankName = acc.name;
      }
    } else if (bank) {
      const acc = await prisma.account.findFirst({ where: { OR: [{ id: bank }, { name: bank }], userId } });
      if (acc) {
        targetAccountId = acc.id;
        targetBankName = acc.name;
      }
    }

    const incomeDate = new Date(date);
    const income = await prisma.income.create({
      data: {
        amount: parseFloat(amount),
        date: incomeDate,
        description,
        categoryId: categoryId || null,
        notes: notes || null,
        bank: targetBankName,
        accountId: targetAccountId,
        userId,
      },
      include: {
        category: true,
      }
    });

    const year = incomeDate.getFullYear();
    const month = incomeDate.getMonth() + 1;
    await updateMonthlySummary(userId, year, month);

    res.status(201).json(income);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear el ingreso' });
  }
}

export async function updateIncome(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { amount, date, description, categoryId, notes, bank } = req.body;

  try {
    const existingIncome = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!existingIncome) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }

    const oldDate = new Date(existingIncome.date);
    const incomeDate = date ? new Date(date) : existingIncome.date;

    const reqAccountId = req.body.accountId;
    let targetAccountId = reqAccountId !== undefined ? reqAccountId : existingIncome.accountId;
    let targetBankName = bank !== undefined ? (bank || null) : existingIncome.bank;

    if (reqAccountId) {
      const acc = await prisma.account.findFirst({ where: { id: reqAccountId, userId } });
      if (acc) {
        targetBankName = acc.name;
      }
    } else if (bank) {
      const acc = await prisma.account.findFirst({ where: { OR: [{ id: bank }, { name: bank }], userId } });
      if (acc) {
        targetAccountId = acc.id;
        targetBankName = acc.name;
      }
    }

    const updated = await prisma.income.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : existingIncome.amount,
        date: incomeDate,
        description: description !== undefined ? description : existingIncome.description,
        categoryId: categoryId !== undefined ? (categoryId || null) : existingIncome.categoryId,
        notes: notes !== undefined ? (notes || null) : existingIncome.notes,
        bank: targetBankName,
        accountId: targetAccountId,
      },
      include: {
        category: true,
      }
    });

    const oldYear = oldDate.getFullYear();
    const oldMonth = oldDate.getMonth() + 1;
    await updateMonthlySummary(userId, oldYear, oldMonth);

    const newYear = new Date(incomeDate).getFullYear();
    const newMonth = new Date(incomeDate).getMonth() + 1;
    if (oldYear !== newYear || oldMonth !== newMonth) {
      await updateMonthlySummary(userId, newYear, newMonth);
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar el ingreso' });
  }
}

export async function deleteIncome(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const income = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!income) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }

    await prisma.income.delete({
      where: { id },
    });

    const incDate = new Date(income.date);
    await updateMonthlySummary(userId, incDate.getFullYear(), incDate.getMonth() + 1);

    res.json({ message: 'Ingreso eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar el ingreso' });
  }
}

export async function deleteIncomesBulk(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs de ingresos requeridos' });
  }

  try {
    const incomes = await prisma.income.findMany({
      where: { id: { in: ids }, userId },
      select: { date: true }
    });

    await prisma.income.deleteMany({
      where: { id: { in: ids }, userId }
    });

    // Recalculate monthly summaries for all distinct months
    const monthsToUpdate = new Map<string, { year: number, month: number }>();
    incomes.forEach(inc => {
      const d = new Date(inc.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthsToUpdate.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
    });

    for (const item of monthsToUpdate.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({ message: 'Ingresos eliminados correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar ingresos en lote' });
  }
}

export async function updateIncomesBulk(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { ids, bank, categoryId, description, notes, date } = req.body;

  console.log('updateIncomesBulk payload:', { ids, bank, categoryId, description, notes, date });

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs de ingresos requeridos' });
  }

  try {
    const updatedMonths = new Map<string, { year: number; month: number }>();

    for (const id of ids) {
      const existingIncome = await prisma.income.findFirst({
        where: { id, userId },
      });
      if (!existingIncome) continue;

      const oldDate = new Date(existingIncome.date);
      updatedMonths.set(`${oldDate.getFullYear()}-${oldDate.getMonth() + 1}`, {
        year: oldDate.getFullYear(),
        month: oldDate.getMonth() + 1
      });

      const updateData: any = {};
      if (bank !== undefined) {
        if (bank === 'Manual') {
          updateData.bank = null;
          updateData.accountId = null;
        } else {
          const acc = await prisma.account.findFirst({
            where: { id: bank, userId }
          });
          if (acc) {
            updateData.bank = acc.name;
            updateData.accountId = acc.id;
          } else {
            updateData.bank = bank;
            const accByName = await prisma.account.findFirst({
              where: { name: bank, userId }
            });
            updateData.accountId = accByName ? accByName.id : null;
          }
        }
      }
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;
      if (description !== undefined) updateData.description = description;
      if (notes !== undefined) updateData.notes = notes;
      if (date !== undefined) {
        const newDate = new Date(date);
        updateData.date = newDate;
        updatedMonths.set(`${newDate.getFullYear()}-${newDate.getMonth() + 1}`, {
          year: newDate.getFullYear(),
          month: newDate.getMonth() + 1
        });
      }

      await prisma.income.update({
        where: { id },
        data: updateData
      });
    }

    for (const item of updatedMonths.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({ message: `${ids.length} ingresos actualizados correctamente` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar ingresos en bloque' });
  }
}

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateMonthlySummary } from '../utils/summary';

export async function getIncomes(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { startDate, endDate, categoryId, search } = req.query;

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

  if (categoryId) {
    where.categoryId = categoryId === 'null' ? null : (categoryId as string);
  }

  if (search) {
    where.description = { contains: search as string, mode: 'insensitive' };
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
  const { amount, date, description, categoryId } = req.body;

  if (!amount || !date || !description) {
    return res.status(400).json({ error: 'Importe, fecha y descripción son requeridos' });
  }

  try {
    const incomeDate = new Date(date);
    const income = await prisma.income.create({
      data: {
        amount: parseFloat(amount),
        date: incomeDate,
        description,
        categoryId: categoryId || null,
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
  const { amount, date, description, categoryId } = req.body;

  try {
    const existingIncome = await prisma.income.findFirst({
      where: { id, userId },
    });

    if (!existingIncome) {
      return res.status(404).json({ error: 'Ingreso no encontrado' });
    }

    const oldDate = new Date(existingIncome.date);
    const incomeDate = date ? new Date(date) : existingIncome.date;

    const updated = await prisma.income.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : existingIncome.amount,
        date: incomeDate,
        description: description !== undefined ? description : existingIncome.description,
        categoryId: categoryId !== undefined ? (categoryId || null) : existingIncome.categoryId,
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

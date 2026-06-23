import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateMonthlySummary } from '../utils/summary';

export async function exportBackup(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  try {
    const categories = await prisma.category.findMany({ where: { userId } });
    const tags = await prisma.tag.findMany({ where: { userId } });
    const incomes = await prisma.income.findMany({ where: { userId } });
    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: {
        tags: {
          select: { tagId: true }
        }
      }
    });
    const savingGoals = await prisma.savingGoal.findMany({ where: { userId } });

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories: categories.map(c => ({ name: c.name, color: c.color, id: c.id })),
      tags: tags.map(t => ({ name: t.name, id: t.id })),
      incomes: incomes.map(i => ({
        amount: i.amount,
        date: i.date,
        description: i.description,
        categoryId: i.categoryId
      })),
      expenses: expenses.map(e => ({
        amount: e.amount,
        date: e.date,
        description: e.description,
        paymentMethod: e.paymentMethod,
        notes: e.notes,
        categoryId: e.categoryId,
        tagIds: e.tags.map(t => t.tagId)
      })),
      savingGoals: savingGoals.map(s => ({
        year: s.year,
        month: s.month,
        amount: s.amount
      }))
    };

    res.json(backupData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al exportar copia de seguridad' });
  }
}

export async function importBackup(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { backup } = req.body;

  if (!backup || !backup.categories || !backup.expenses) {
    return res.status(400).json({ error: 'Formato de copia de seguridad inválido o vacío' });
  }

  try {
    const categoryMap: Record<string, string> = {};
    const tagMap: Record<string, string> = {};

    // 1. Process Categories
    for (const cat of backup.categories) {
      let existing = await prisma.category.findFirst({
        where: { name: cat.name, userId }
      });
      if (!existing) {
        existing = await prisma.category.create({
          data: { name: cat.name, color: cat.color || '#3B82F6', userId }
        });
      }
      categoryMap[cat.id] = existing.id;
    }

    // 2. Process Tags
    if (backup.tags) {
      for (const tag of backup.tags) {
        let existing = await prisma.tag.findFirst({
          where: { name: tag.name.toLowerCase().trim(), userId }
        });
        if (!existing) {
          existing = await prisma.tag.create({
            data: { name: tag.name.toLowerCase().trim(), userId }
          });
        }
        tagMap[tag.id] = existing.id;
      }
    }

    // 3. Process Incomes
    if (backup.incomes) {
      for (const inc of backup.incomes) {
        const mappedCategoryId = inc.categoryId ? categoryMap[inc.categoryId] : null;
        await prisma.income.create({
          data: {
            amount: parseFloat(inc.amount),
            date: new Date(inc.date),
            description: inc.description,
            categoryId: mappedCategoryId || null,
            userId
          }
        });
      }
    }

    // 4. Process Expenses
    if (backup.expenses) {
      for (const exp of backup.expenses) {
        const mappedCategoryId = categoryMap[exp.categoryId];
        if (!mappedCategoryId) continue;

        const expense = await prisma.expense.create({
          data: {
            amount: parseFloat(exp.amount),
            date: new Date(exp.date),
            description: exp.description,
            paymentMethod: exp.paymentMethod || null,
            notes: exp.notes || null,
            categoryId: mappedCategoryId,
            userId
          }
        });

        if (exp.tagIds && Array.isArray(exp.tagIds)) {
          const mappedTagIds = exp.tagIds
            .map((oldId: string) => tagMap[oldId])
            .filter(Boolean);

          if (mappedTagIds.length > 0) {
            await prisma.expenseTag.createMany({
              data: mappedTagIds.map((tagId: string) => ({
                expenseId: expense.id,
                tagId
              }))
            });
          }
        }
      }
    }

    // 5. Process Saving Goals
    if (backup.savingGoals) {
      for (const goal of backup.savingGoals) {
        await prisma.savingGoal.upsert({
          where: {
            year_month_userId: {
              year: parseInt(goal.year),
              month: parseInt(goal.month),
              userId
            }
          },
          update: { amount: parseFloat(goal.amount) },
          create: {
            year: parseInt(goal.year),
            month: parseInt(goal.month),
            amount: parseFloat(goal.amount),
            userId
          }
        });
      }
    }

    // 6. Recalculate Monthly Summaries
    const monthsToUpdate = new Map<string, { year: number, month: number }>();

    if (backup.expenses) {
      for (const exp of backup.expenses) {
        const d = new Date(exp.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        monthsToUpdate.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    }

    if (backup.incomes) {
      for (const inc of backup.incomes) {
        const d = new Date(inc.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        monthsToUpdate.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    }

    for (const item of monthsToUpdate.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({ message: 'Copia de seguridad importada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al importar copia de seguridad' });
  }
}

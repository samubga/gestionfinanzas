import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateMonthlySummary } from '../utils/summary';

export async function getExpenses(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { startDate, endDate, categoryId, tags, search, bank, minAmount, maxAmount } = req.query;

  const where: any = { userId };
  const andConditions: any[] = [];

  // Date range filter
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

  // Category filter
  if (categoryId) {
    where.categoryId = categoryId as string;
  }

  const accountId = req.query.accountId;

  // Bank / Account filter
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

  // Tags filter
  if (tags) {
    const tagArray = (tags as string).split(',');
    where.tags = {
      some: {
        tag: {
          name: { in: tagArray.map(t => t.trim().toLowerCase()) }
        }
      }
    };
  }

  // Search filter (description or notes)
  if (search) {
    andConditions.push({
      OR: [
        { description: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ]
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  try {
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = expenses.map(exp => ({
      ...exp,
      tags: exp.tags.map(t => t.tag),
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener gastos' });
  }
}

export async function createExpense(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { amount, date, description, categoryId, tags, paymentMethod, notes, bank } = req.body;

  if (!amount || !date || !description || !categoryId) {
    return res.status(400).json({ error: 'Importe, fecha, descripción y categoría son requeridos' });
  }

  try {
    const category = await prisma.category.findFirst({ where: { id: categoryId, userId, type: 'expense' } });
    if (!category) return res.status(400).json({ error: 'La categoría indicada no te pertenece.' });

    // 1. Resolve or create tags
    const tagIds: string[] = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        let tag = await prisma.tag.findFirst({
          where: { name: cleanName, userId },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: cleanName, userId },
          });
        }
        tagIds.push(tag.id);
      }
    }

    const reqAccountId = req.body.accountId;
    let targetAccountId = null;
    let targetBankName = bank || null;

    if (reqAccountId) {
      const acc = await prisma.account.findFirst({ where: { id: reqAccountId, userId } });
      if (!acc) return res.status(400).json({ error: 'La cuenta indicada no te pertenece.' });
      targetAccountId = acc.id;
      targetBankName = acc.name;
    } else if (bank) {
      const acc = await prisma.account.findFirst({ where: { OR: [{ id: bank }, { name: bank }], userId } });
      if (acc) {
        targetAccountId = acc.id;
        targetBankName = acc.name;
      }
    }

    // 2. Create the expense
    const expenseDate = new Date(date);
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        date: expenseDate,
        description,
        paymentMethod,
        notes,
        bank: targetBankName,
        accountId: targetAccountId,
        userId,
        categoryId,
        tags: {
          create: tagIds.map(tagId => ({
            tag: { connect: { id: tagId } }
          }))
        }
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          }
        }
      }
    });

    // 3. Recalculate summary
    const year = expenseDate.getFullYear();
    const month = expenseDate.getMonth() + 1;
    await updateMonthlySummary(userId, year, month);

    res.status(201).json({
      ...expense,
      tags: expense.tags.map(t => t.tag),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear el gasto' });
  }
}

export async function updateExpense(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { amount, date, description, categoryId, tags, paymentMethod, notes, bank } = req.body;

  try {
    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }
    if (categoryId !== undefined) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, userId, type: 'expense' } });
      if (!category) return res.status(400).json({ error: 'La categoría indicada no te pertenece.' });
    }

    const oldDate = new Date(existingExpense.date);

    // 1. Resolve tags if provided
    let tagUpdates = {};
    if (tags && Array.isArray(tags)) {
      const tagIds: string[] = [];
      for (const tagName of tags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        let tag = await prisma.tag.findFirst({
          where: { name: cleanName, userId },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: cleanName, userId },
          });
        }
        tagIds.push(tag.id);
      }

      await prisma.expenseTag.deleteMany({
        where: { expenseId: id },
      });

      tagUpdates = {
        tags: {
          create: tagIds.map(tagId => ({
            tag: { connect: { id: tagId } }
          }))
        }
      };
    }

    const reqAccountId = req.body.accountId;
    let targetAccountId = reqAccountId !== undefined ? reqAccountId : existingExpense.accountId;
    let targetBankName = bank !== undefined ? bank : existingExpense.bank;

    if (reqAccountId) {
      const acc = await prisma.account.findFirst({ where: { id: reqAccountId, userId } });
      if (!acc) return res.status(400).json({ error: 'La cuenta indicada no te pertenece.' });
      targetAccountId = acc.id;
      targetBankName = acc.name;
    } else if (bank) {
      const acc = await prisma.account.findFirst({ where: { OR: [{ id: bank }, { name: bank }], userId } });
      if (acc) {
        targetAccountId = acc.id;
        targetBankName = acc.name;
      }
    }

    // 2. Update expense
    const expenseDate = date ? new Date(date) : existingExpense.date;
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : existingExpense.amount,
        date: expenseDate,
        description: description !== undefined ? description : existingExpense.description,
        categoryId: categoryId !== undefined ? categoryId : existingExpense.categoryId,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : existingExpense.paymentMethod,
        notes: notes !== undefined ? notes : existingExpense.notes,
        bank: targetBankName,
        accountId: targetAccountId,
        ...tagUpdates,
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          }
        }
      }
    });

    // Recalculate summary
    const oldYear = oldDate.getFullYear();
    const oldMonth = oldDate.getMonth() + 1;
    await updateMonthlySummary(userId, oldYear, oldMonth);

    const newYear = new Date(expenseDate).getFullYear();
    const newMonth = new Date(expenseDate).getMonth() + 1;
    if (oldYear !== newYear || oldMonth !== newMonth) {
      await updateMonthlySummary(userId, newYear, newMonth);
    }

    res.json({
      ...updated,
      tags: updated.tags.map(t => t.tag),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar el gasto' });
  }
}

export async function deleteExpense(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const expense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    await prisma.expense.delete({
      where: { id },
    });

    const expDate = new Date(expense.date);
    await updateMonthlySummary(userId, expDate.getFullYear(), expDate.getMonth() + 1);

    res.json({ message: 'Gasto eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar el gasto' });
  }
}

export async function duplicateExpense(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const expense = await prisma.expense.findFirst({
      where: { id, userId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    const today = new Date();
    const duplicated = await prisma.expense.create({
      data: {
        amount: expense.amount,
        date: today,
        description: `${expense.description} (Copia)`,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes,
        bank: expense.bank,
        userId,
        categoryId: expense.categoryId,
        tags: {
          create: expense.tags.map(et => ({
            tag: { connect: { id: et.tagId } }
          }))
        }
      },
      include: {
        category: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    await updateMonthlySummary(userId, today.getFullYear(), today.getMonth() + 1);

    res.status(201).json({
      ...duplicated,
      tags: duplicated.tags.map(t => t.tag),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al duplicar el gasto' });
  }
}

export async function deleteExpensesBulk(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs de gastos requeridos' });
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { id: { in: ids }, userId },
      select: { date: true }
    });

    await prisma.expense.deleteMany({
      where: { id: { in: ids }, userId }
    });

    // Recalculate monthly summaries for all distinct months
    const monthsToUpdate = new Map<string, { year: number, month: number }>();
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthsToUpdate.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
    });

    for (const item of monthsToUpdate.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({ message: 'Gastos eliminados correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar gastos en lote' });
  }
}

export async function updateExpensesBulk(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { ids, bank, categoryId, paymentMethod, description, notes, date, tags, tagsMode } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs de gastos requeridos' });
  }

  try {
    if (categoryId !== undefined) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, userId, type: 'expense' } });
      if (!category) return res.status(400).json({ error: 'La categoría indicada no te pertenece.' });
    }
    const updatedMonths = new Map<string, { year: number; month: number }>();

    // 1. Resolve tags if provided
    let resolvedTagIds: string[] = [];
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const cleanName = tagName.trim().toLowerCase();
        if (!cleanName) continue;
        let tag = await prisma.tag.findFirst({
          where: { name: cleanName, userId },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: cleanName, userId },
          });
        }
        resolvedTagIds.push(tag.id);
      }
    }

    // 2. Loop through all expenses to update them
    for (const id of ids) {
      const existingExpense = await prisma.expense.findFirst({
        where: { id, userId },
      });
      if (!existingExpense) continue;

      const oldDate = new Date(existingExpense.date);
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
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
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

      if (tags && Array.isArray(tags)) {
        if (tagsMode === 'replace') {
          await prisma.expenseTag.deleteMany({
            where: { expenseId: id },
          });
          updateData.tags = {
            create: resolvedTagIds.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          };
        } else if (tagsMode === 'add') {
          const existingTags = await prisma.expenseTag.findMany({
            where: { expenseId: id },
          });
          const existingTagIds = existingTags.map(et => et.tagId);
          const tagIdsToAdd = resolvedTagIds.filter(tid => !existingTagIds.includes(tid));

          updateData.tags = {
            create: tagIdsToAdd.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          };
        }
      }

      await prisma.expense.update({
        where: { id },
        data: updateData
      });
    }

    // 3. Recalculate monthly summaries
    for (const item of updatedMonths.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({ message: `${ids.length} gastos actualizados correctamente` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar gastos en bloque' });
  }
}

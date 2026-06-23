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

export async function parseCSVPreview(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { csvText } = req.body;

  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ error: 'Contenido del CSV no proporcionado o inválido' });
  }

  try {
    const lines = csvText.split(/\r?\n/);
    let separator = ',';
    let headerIndex = -1;
    let colConcepto = -1;
    let colFecha = -1;
    let colImporte = -1;
    let colCategoria = -1;

    // Detect header row and separator
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Concepto') && line.includes('Fecha') && line.includes('Importe')) {
        headerIndex = i;
        if (line.includes(';')) {
          separator = ';';
        } else {
          separator = ',';
        }

        const headers = line.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
        colConcepto = headers.findIndex(h => h.toLowerCase() === 'concepto');
        colFecha = headers.findIndex(h => h.toLowerCase() === 'fecha');
        colImporte = headers.findIndex(h => h.toLowerCase() === 'importe');
        colCategoria = headers.findIndex(h => h.toLowerCase() === 'categoria');
        break;
      }
    }

    if (headerIndex === -1 || colConcepto === -1 || colFecha === -1 || colImporte === -1) {
      return res.status(400).json({
        error: 'No se encontró la fila de cabecera con "Concepto", "Fecha" e "Importe". Asegúrate de que el CSV tiene la estructura correcta.'
      });
    }

    // Load categories
    const existingCategories = await prisma.category.findMany({
      where: { userId }
    });
    const categoriesMap = new Map(existingCategories.map(c => [c.name.toLowerCase().trim(), c]));

    const parsedTransactions: any[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split(separator).map(f => f.trim().replace(/^["']|["']$/g, ''));
      
      if (fields.length <= Math.max(colConcepto, colFecha, colImporte)) {
        continue;
      }

      const concepto = fields[colConcepto];
      const fechaRaw = fields[colFecha];
      const importeRaw = fields[colImporte];
      const categoriaRaw = colCategoria !== -1 && fields.length > colCategoria ? fields[colCategoria] : '';

      if (!concepto || !fechaRaw || !importeRaw) continue;

      // Parse Date (DD/MM/YYYY) to YYYY-MM-DD
      const dateParts = fechaRaw.split('/');
      if (dateParts.length !== 3) continue;
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10);
      const year = parseInt(dateParts[2], 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      const formattedDate = date.toISOString().split('T')[0];

      // Parse Amount
      const cleanImporte = importeRaw.replace(',', '.');
      const amount = parseFloat(cleanImporte);
      if (isNaN(amount) || amount === 0) continue;

      const type = amount < 0 ? 'expense' : 'income';

      let categoryId = '';
      if (categoriaRaw) {
        const catNameClean = categoriaRaw.toLowerCase().trim();
        const foundCat = categoriesMap.get(catNameClean);
        if (foundCat && foundCat.type === type) {
          categoryId = foundCat.id;
        }
      }

      let paymentMethod = 'Tarjeta';
      if (type === 'expense') {
        const conceptUpper = concepto.toUpperCase();
        if (conceptUpper.includes('BIZUM')) {
          paymentMethod = 'Bizum';
        } else if (conceptUpper.includes('EFECTIVO') || conceptUpper.includes('CAJERO') || conceptUpper.includes('RETIRADA')) {
          paymentMethod = 'Efectivo';
        } else if (conceptUpper.includes('TRANSFERENCIA')) {
          paymentMethod = 'Transferencia';
        } else if (conceptUpper.includes('RECIBO') || conceptUpper.includes('DOMICILIACION') || conceptUpper.includes('SEGURO')) {
          paymentMethod = 'Domiciliación';
        }
      }

      parsedTransactions.push({
        description: concepto,
        date: formattedDate,
        amount: Math.abs(amount),
        type,
        paymentMethod: type === 'expense' ? paymentMethod : null,
        categoryId: categoryId || ''
      });
    }

    res.json(parsedTransactions);

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al procesar el archivo CSV' });
  }
}

export async function importTransactions(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Lista de transacciones no válida' });
  }

  try {
    let createdExpensesCount = 0;
    let createdIncomesCount = 0;
    const monthsToUpdate = new Map<string, { year: number, month: number }>();

    for (const tx of transactions) {
      const { description, date, amount, categoryId, type, paymentMethod } = tx;

      if (!description || !date || amount === undefined || isNaN(amount) || amount <= 0) {
        continue;
      }

      const txDate = new Date(date);
      const year = txDate.getFullYear();
      const month = txDate.getMonth() + 1;
      const key = `${year}-${month}`;
      monthsToUpdate.set(key, { year, month });

      if (type === 'expense') {
        let finalCategoryId = categoryId;
        if (!finalCategoryId) {
          let defaultCat = await prisma.category.findFirst({
            where: { type: 'expense', name: 'Sin categoría', userId }
          });
          if (!defaultCat) {
            defaultCat = await prisma.category.create({
              data: {
                name: 'Sin categoría',
                color: '#94A3B8',
                type: 'expense',
                userId
              }
            });
          }
          finalCategoryId = defaultCat.id;
        }

        await prisma.expense.create({
          data: {
            amount: parseFloat(amount),
            date: txDate,
            description: description.trim(),
            paymentMethod: paymentMethod || 'Tarjeta',
            categoryId: finalCategoryId,
            userId,
            notes: 'Importado de CSV'
          }
        });
        createdExpensesCount++;

      } else {
        await prisma.income.create({
          data: {
            amount: parseFloat(amount),
            date: txDate,
            description: description.trim(),
            categoryId: categoryId || null,
            userId
          }
        });
        createdIncomesCount++;
      }
    }

    for (const item of monthsToUpdate.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({
      message: 'Transacciones importadas correctamente',
      expensesCount: createdExpensesCount,
      incomesCount: createdIncomesCount
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al importar transacciones' });
  }
}

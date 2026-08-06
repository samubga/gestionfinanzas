import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// Helpers to extract search keywords from forecast descriptions
function getKeywords(desc: string): string[] {
  const stopwords = new Set([
    'de', 'con', 'en', 'el', 'la', 'mi', 'y', 'a', 'del', 'los', 'las', 
    'un', 'una', 'para', 'por', 'al', 'o', 'u', 'conmigo', 'para', 'nos'
  ]);
  return desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
}

export async function getForecasts(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Año (year) y mes (month) son requeridos' });
  }

  try {
    const forecasts = await prisma.expenseForecast.findMany({
      where: {
        userId,
        year: parseInt(year as string),
        month: parseInt(month as string)
      },
      include: {
        category: true,
        tag: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(forecasts);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener las previsiones' });
  }
}

export async function createForecast(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { amount, description, date, month, year, categoryId, tagId } = req.body;

  if (amount === undefined || !description || !month || !year) {
    return res.status(400).json({ error: 'Importe, descripción, mes y año son requeridos' });
  }

  try {
    const forecast = await prisma.expenseForecast.create({
      data: {
        amount: parseFloat(amount),
        description: description.trim(),
        date: date ? new Date(date) : null,
        month: parseInt(month),
        year: parseInt(year),
        categoryId: categoryId || null,
        tagId: tagId || null,
        userId
      },
      include: {
        category: true,
        tag: true
      }
    });

    res.status(201).json(forecast);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la previsión' });
  }
}

export async function updateForecast(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { amount, description, date, month, year, categoryId, tagId } = req.body;

  try {
    // Check ownership
    const existing = await prisma.expenseForecast.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Previsión no encontrada' });
    }

    const updated = await prisma.expenseForecast.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        description: description !== undefined ? description.trim() : undefined,
        date: date !== undefined ? (date ? new Date(date) : null) : undefined,
        month: month !== undefined ? parseInt(month) : undefined,
        year: year !== undefined ? parseInt(year) : undefined,
        categoryId: categoryId !== undefined ? (categoryId || null) : undefined,
        tagId: tagId !== undefined ? (tagId || null) : undefined
      },
      include: {
        category: true,
        tag: true
      }
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar la previsión' });
  }
}

export async function deleteForecast(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const existing = await prisma.expenseForecast.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Previsión no encontrada' });
    }

    await prisma.expenseForecast.delete({ where: { id } });
    res.json({ message: 'Previsión eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la previsión' });
  }
}

export async function getComparison(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Año y mes son requeridos' });
  }

  const y = parseInt(year as string);
  const m = parseInt(month as string);

  try {
    // 1. Get forecasts
    const forecasts = await prisma.expenseForecast.findMany({
      where: { userId, year: y, month: m },
      include: { category: true, tag: true }
    });

    // 2. Get actual expenses of that month/year
    const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const actualExpenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    // Keep track of which expenses have been "matched" to avoid double counting if matching by description keywords
    const matchedExpenseIds = new Set<string>();

    // 3. Map comparison for each forecast
    const comparisonItems = forecasts.map(fc => {
      let spent = 0;
      const matchedExpensesDetail: any[] = [];

      if (fc.tagId) {
        // Option A: Matched by Tag
        const tagExpenses = actualExpenses.filter(e => 
          e.tags && e.tags.some(et => et.tagId === fc.tagId)
        );
        spent = tagExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        tagExpenses.forEach(e => {
          matchedExpenseIds.add(e.id);
          matchedExpensesDetail.push({
            id: e.id,
            description: e.description,
            amount: e.amount,
            date: e.date
          });
        });
      } else if (fc.categoryId) {
        // Option B: Matched by Category
        const categoryExpenses = actualExpenses.filter(e => e.categoryId === fc.categoryId);
        spent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
        
        categoryExpenses.forEach(e => {
          matchedExpenseIds.add(e.id);
          matchedExpensesDetail.push({
            id: e.id,
            description: e.description,
            amount: e.amount,
            date: e.date
          });
        });
      } else {
        // Option C: Matched by Description Keywords
        const keywords = getKeywords(fc.description);
        
        if (keywords.length > 0) {
          const descExpenses = actualExpenses.filter(e => {
            const expDescNorm = e.description
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            
            return keywords.some(kw => expDescNorm.includes(kw));
          });

          spent = descExpenses.reduce((sum, e) => sum + e.amount, 0);
          
          descExpenses.forEach(e => {
            matchedExpenseIds.add(e.id);
            matchedExpensesDetail.push({
              id: e.id,
              description: e.description,
              amount: e.amount,
              date: e.date
            });
          });
        } else {
          spent = 0;
        }
      }

      return {
        id: fc.id,
        description: fc.description,
        amountEstimated: fc.amount,
        date: fc.date,
        categoryId: fc.categoryId,
        category: fc.category,
        tagId: fc.tagId,
        tag: fc.tag,
        amountSpent: spent,
        matchedExpenses: matchedExpensesDetail
      };
    });

    // 4. Calculate leftovers (expenses that didn't match any forecast)
    const unmatchedExpenses = actualExpenses.filter(e => !matchedExpenseIds.has(e.id));
    const totalUnmatchedAmount = unmatchedExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 5. Aggregate overall values
    const totalEstimated = forecasts.reduce((sum, fc) => sum + fc.amount, 0);
    const totalSpentMatched = comparisonItems.reduce((sum, item) => sum + item.amountSpent, 0);
    const totalSpentActual = actualExpenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({
      year: y,
      month: m,
      totalEstimated,
      totalSpentActual,
      totalSpentMatched,
      totalUnmatchedAmount,
      items: comparisonItems,
      unmatchedExpenses: unmatchedExpenses.map(e => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        date: e.date
      }))
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener la comparativa' });
  }
}

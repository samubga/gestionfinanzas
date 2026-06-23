import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateMonthlySummary } from '../utils/summary';

export async function getSavingGoal(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);

  try {
    const goal = await prisma.savingGoal.findUnique({
      where: {
        year_month_userId: { year, month, userId }
      }
    });
    res.json({ amount: goal ? goal.amount : 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener objetivo de ahorro' });
  }
}

export async function upsertSavingGoal(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { year, month, amount } = req.body;

  if (!year || !month || amount === undefined) {
    return res.status(400).json({ error: 'Año, mes e importe son requeridos' });
  }

  try {
    const goal = await prisma.savingGoal.upsert({
      where: {
        year_month_userId: {
          year,
          month,
          userId
        }
      },
      update: { amount: parseFloat(amount) },
      create: {
        year,
        month,
        amount: parseFloat(amount),
        userId
      }
    });

    // Update monthly summary
    await updateMonthlySummary(userId, year, month);

    res.json(goal);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al guardar el objetivo de ahorro' });
  }
}

export async function getDashboardStats(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const now = new Date();
  const year = parseInt(req.query.year as string) || now.getFullYear();
  const month = parseInt(req.query.month as string) || (now.getMonth() + 1);

  try {
    // Ensure summary is updated for current month
    await updateMonthlySummary(userId, year, month);

    // 1. Current Month Summary
    const summary = await prisma.monthlySummary.findUnique({
      where: {
        year_month_userId: { year, month, userId }
      }
    });

    const currentIncome = summary ? summary.totalIncome : 0;
    const currentExpense = summary ? summary.totalExpense : 0;
    const currentSavings = summary ? summary.totalSavings : 0;
    const savingGoal = summary ? summary.savingGoal : 0;

    // Available Balance (startingBalance + total historical income - total historical expense)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { startingBalance: true }
    });
    const startingBalance = user ? user.startingBalance : 0;

    const totalIncomesAggregate = await prisma.income.aggregate({
      where: { userId },
      _sum: { amount: true }
    });
    const totalExpensesAggregate = await prisma.expense.aggregate({
      where: { userId },
      _sum: { amount: true }
    });
    const totalIncomeAllTime = totalIncomesAggregate._sum.amount || 0;
    const totalExpenseAllTime = totalExpensesAggregate._sum.amount || 0;
    const availableBalance = startingBalance + totalIncomeAllTime - totalExpenseAllTime;

    // 2. Previous Month Comparison
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    const prevSummary = await prisma.monthlySummary.findUnique({
      where: {
        year_month_userId: { year: prevYear, month: prevMonth, userId }
      }
    });
    const prevIncome = prevSummary ? prevSummary.totalIncome : 0;
    const prevExpense = prevSummary ? prevSummary.totalExpense : 0;

    // Percentage change helper
    const getPercentageChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const incomeChangePercent = getPercentageChange(currentIncome, prevIncome);
    const expenseChangePercent = getPercentageChange(currentExpense, prevExpense);

    // 3. Current Month Transactions
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const currentExpenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      include: {
        category: true,
        tags: { include: { tag: true } }
      }
    });

    // 4. Category breakdown
    const categoryTotalsMap: Record<string, { id: string, name: string, color: string, amount: number }> = {};
    currentExpenses.forEach(exp => {
      const cat = exp.category;
      if (!categoryTotalsMap[cat.id]) {
        categoryTotalsMap[cat.id] = {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          amount: 0
        };
      }
      categoryTotalsMap[cat.id].amount += exp.amount;
    });
    const categoryBreakdown = Object.values(categoryTotalsMap).sort((a, b) => b.amount - a.amount);

    // 5. Tag breakdown
    const tagTotalsMap: Record<string, { id: string, name: string, amount: number }> = {};
    currentExpenses.forEach(exp => {
      exp.tags.forEach(et => {
        const t = et.tag;
        if (!tagTotalsMap[t.id]) {
          tagTotalsMap[t.id] = {
            id: t.id,
            name: t.name,
            amount: 0
          };
        }
        tagTotalsMap[t.id].amount += exp.amount;
      });
    });
    const tagBreakdown = Object.values(tagTotalsMap).sort((a, b) => b.amount - a.amount);

    // 6. Top 10 expenses
    const topExpenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      include: { category: true },
      orderBy: { amount: 'desc' },
      take: 10
    });

    // 7. Averages & Prediction
    // Daily Average: Determine elapsed days
    const isCurrentMonth = (year === now.getFullYear() && month === (now.getMonth() + 1));
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const elapsedDays = isCurrentMonth ? now.getDate() : totalDaysInMonth;

    const dailyAverage = currentExpense / (elapsedDays || 1);
    const prediction = dailyAverage * totalDaysInMonth;

    // Monthly Average Expense (average of all MonthlySummary records with expenses > 0)
    const allSummaries = await prisma.monthlySummary.findMany({
      where: {
        userId,
        totalExpense: { gt: 0 }
      }
    });
    const monthlyAverage = allSummaries.length > 0
      ? allSummaries.reduce((sum, s) => sum + s.totalExpense, 0) / allSummaries.length
      : currentExpense;

    // 8. Historical evolution (Last 6 summaries)
    const evolutionSummaries = await prisma.monthlySummary.findMany({
      where: { userId },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ],
      take: 6
    });
    // Reverse to show chronologically
    const evolution = evolutionSummaries.map(s => ({
      year: s.year,
      month: s.month,
      label: `${s.month.toString().padStart(2, '0')}/${s.year}`,
      income: s.totalIncome,
      expense: s.totalExpense,
      savings: s.totalSavings,
      goal: s.savingGoal
    })).reverse();

    res.json({
      currentMonth: {
        year,
        month,
        income: currentIncome,
        expense: currentExpense,
        savings: currentSavings,
        savingGoal,
        incomeChangePercent,
        expenseChangePercent
      },
      availableBalance,
      averages: {
        dailyAverage,
        monthlyAverage,
        prediction: isCurrentMonth ? prediction : currentExpense
      },
      categoryBreakdown,
      tagBreakdown,
      topExpenses,
      evolution
    });
  } catch (error: any) {
    console.error('Error en getDashboardStats:', error);
    res.status(500).json({ error: error.message || 'Error al obtener estadísticas del dashboard' });
  }
}

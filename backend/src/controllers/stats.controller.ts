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

    // Available Balance per account
    const accounts = await prisma.account.findMany({
      where: { userId },
      include: { bank: true }
    });

    const balancesMap: Record<string, number> = {};
    const startingBalancesMap: Record<string, number> = {};

    for (const acc of accounts) {
      balancesMap[acc.id] = acc.startingBalance;
      startingBalancesMap[acc.name] = acc.startingBalance;
    }

    const resolveAccId = (accId: string | null, bankName: string | null): string => {
      if (accId) {
        const found = accounts.find(a => a.id === accId);
        if (found) return found.id;
      }
      if (bankName) {
        const clean = bankName.toLowerCase().trim();
        let found = accounts.find(a => 
          a.name.toLowerCase() === clean || 
          (a.bank && a.bank.name.toLowerCase() === clean)
        );
        if (found) return found.id;

        found = accounts.find(a => 
          a.name.toLowerCase().includes(clean) || 
          (a.bank && a.bank.name.toLowerCase().includes(clean))
        );
        if (found) return found.id;
      }
      return accounts[0]?.id || '';
    };

    const incomesGrouped = await prisma.income.groupBy({
      by: ['accountId', 'bank'],
      where: { userId },
      _sum: { amount: true }
    });

    const expensesGrouped = await prisma.expense.groupBy({
      by: ['accountId', 'bank'],
      where: { userId },
      _sum: { amount: true }
    });

    const investments = await prisma.investment.findMany({
      where: { userId }
    });

    for (const group of incomesGrouped) {
      const amount = group._sum.amount || 0;
      const targetId = resolveAccId(group.accountId, group.bank);
      if (targetId && balancesMap[targetId] !== undefined) {
        balancesMap[targetId] += amount;
      }
    }

    for (const group of expensesGrouped) {
      const amount = group._sum.amount || 0;
      const targetId = resolveAccId(group.accountId, group.bank);
      if (targetId && balancesMap[targetId] !== undefined) {
        balancesMap[targetId] -= amount;
      }
    }

    let totalInvestedActive = 0;
    let totalRealizedGains = 0;
    let totalFees = 0;

    for (const inv of investments) {
      const outflow = inv.amount + inv.buyFee;
      const inflow = inv.status === 'withdrawn' ? ((inv.withdrawnAmount || 0) - (inv.sellFee || 0)) : 0;
      
      totalFees += inv.buyFee + (inv.sellFee || 0);

      if (inv.status === 'active') {
        totalInvestedActive += inv.amount;
      } else if (inv.status === 'withdrawn') {
        totalRealizedGains += (inv.withdrawnAmount || 0) - inv.amount - inv.buyFee - (inv.sellFee || 0);
      }

      const targetId = resolveAccId(inv.accountId, inv.bank);
      if (targetId && balancesMap[targetId] !== undefined) {
        balancesMap[targetId] = balancesMap[targetId] - outflow + inflow;
      }
    }

    // Adjust balances by transfers between accounts
    const transfers = await prisma.transfer.findMany({
      where: { userId }
    });

    for (const t of transfers) {
      if (balancesMap[t.fromAccountId] !== undefined) {
        balancesMap[t.fromAccountId] -= t.amount;
      }
      if (balancesMap[t.toAccountId] !== undefined) {
        balancesMap[t.toAccountId] += t.amount;
      }
    }

    const accountDetails = accounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      icon: acc.icon,
      color: acc.color,
      bankName: acc.bank?.name || null,
      startingBalance: acc.startingBalance,
      currentBalance: balancesMap[acc.id] ?? acc.startingBalance
    }));

    const availableBalance = accountDetails.reduce((acc, curr) => acc + curr.currentBalance, 0);

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

    // 8. Historical evolution (All summaries for custom filtering)
    const evolutionSummaries = await prisma.monthlySummary.findMany({
      where: { userId },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
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
      accountDetails,
      balances: balancesMap,
      startingBalances: startingBalancesMap,
      totalInvestedActive,
      totalRealizedGains,
      totalFees,
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

export async function getYearlyStats(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  try {
    const summaries = await prisma.monthlySummary.findMany({
      where: { userId, year },
      orderBy: { month: 'asc' }
    });

    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const found = summaries.find(s => s.month === m);
      return {
        month: m,
        label: new Date(year, i).toLocaleDateString('es-ES', { month: 'short' }),
        income: found ? found.totalIncome : 0,
        expense: found ? found.totalExpense : 0,
        savings: found ? found.totalSavings : 0,
        goal: found ? found.savingGoal : 0
      };
    });

    const totalIncome = monthlyBreakdown.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = monthlyBreakdown.reduce((sum, m) => sum + m.expense, 0);
    const totalSavings = totalIncome - totalExpense;
    const averageMonthlySavings = totalSavings / 12;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const yearlyExpenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: { category: true }
    });

    const categoryTotalsMap: Record<string, { id: string, name: string, color: string, amount: number }> = {};
    yearlyExpenses.forEach(exp => {
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

    const yearlyExpensesWithTags = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        tags: { include: { tag: true } }
      }
    });

    const tagTotalsMap: Record<string, { id: string, name: string, amount: number }> = {};
    yearlyExpensesWithTags.forEach(exp => {
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

    res.json({
      year,
      summary: {
        totalIncome,
        totalExpense,
        totalSavings,
        averageMonthlySavings
      },
      monthlyBreakdown,
      categoryBreakdown,
      tagBreakdown
    });
  } catch (error: any) {
    console.error('Error en getYearlyStats:', error);
    res.status(500).json({ error: error.message || 'Error al obtener estadísticas anuales' });
  }
}

export async function getHistoricalStats(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  
  try {
    const accounts = await prisma.account.findMany({
      where: { userId }
    });
    const initialCash = accounts.reduce((sum, acc) => sum + acc.startingBalance, 0);

    const incomes = await prisma.income.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' }
    });

    const now = new Date();
    let startYear = now.getFullYear();
    let startMonth = now.getMonth();

    const dates: Date[] = [];
    if (incomes.length > 0) dates.push(incomes[0].date);
    if (expenses.length > 0) dates.push(expenses[0].date);
    if (investments.length > 0) dates.push(investments[0].startDate);

    if (dates.length > 0) {
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
      startYear = earliest.getFullYear();
      startMonth = earliest.getMonth();
    } else {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      startYear = twelveMonthsAgo.getFullYear();
      startMonth = twelveMonthsAgo.getMonth();
    }

    const history = [];
    let currentY = startYear;
    let currentM = startMonth;

    while (true) {
      const endOfMonth = new Date(currentY, currentM + 1, 0, 23, 59, 59, 999);
      
      const totalIncomeUpToNow = incomes
        .filter(inc => inc.date <= endOfMonth)
        .reduce((sum, inc) => sum + inc.amount, 0);

      const totalExpenseUpToNow = expenses
        .filter(exp => exp.date <= endOfMonth)
        .reduce((sum, exp) => sum + exp.amount, 0);

      let investmentOutflow = 0;
      let investmentInflow = 0;
      let activeInvestedValue = 0;

      for (const inv of investments) {
        if (inv.startDate <= endOfMonth) {
          investmentOutflow += inv.amount + inv.buyFee;
        }
        if (inv.status === 'withdrawn' && inv.endDate && inv.endDate <= endOfMonth) {
          investmentInflow += (inv.withdrawnAmount || 0) - (inv.sellFee || 0);
        }
        const isStarted = inv.startDate <= endOfMonth;
        const isStillActive = inv.status === 'active' || (inv.endDate && inv.endDate > endOfMonth);
        if (isStarted && isStillActive) {
          activeInvestedValue += inv.amount;
        }
      }

      const cashBalance = initialCash + totalIncomeUpToNow - totalExpenseUpToNow - investmentOutflow + investmentInflow;
      const netWorth = cashBalance + activeInvestedValue;

      history.push({
        year: currentY,
        month: currentM + 1,
        label: `${(currentM + 1).toString().padStart(2, '0')}/${currentY}`,
        cash: Math.max(0, cashBalance),
        invested: activeInvestedValue,
        netWorth: Math.max(0, netWorth)
      });

      if (currentY === now.getFullYear() && currentM === now.getMonth()) {
        break;
      }

      currentM++;
      if (currentM > 11) {
        currentM = 0;
        currentY++;
      }

      if (history.length > 120) {
        break;
      }
    }

    res.json({ history });
  } catch (error: any) {
    console.error('Error en getHistoricalStats:', error);
    res.status(500).json({ error: error.message || 'Error al obtener estadísticas históricas' });
  }
}


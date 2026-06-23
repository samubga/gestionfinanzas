import prisma from './prisma';

export async function updateMonthlySummary(userId: string, year: number, month: number) {
  // Start of the month (local time)
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  // End of the month (local time)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get total income
  const incomes = await prisma.income.aggregate({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Get total expense
  const expenses = await prisma.expense.aggregate({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const totalIncome = incomes._sum.amount || 0;
  const totalExpense = expenses._sum.amount || 0;
  const totalSavings = totalIncome - totalExpense;

  // Get saving goal
  const goal = await prisma.savingGoal.findUnique({
    where: {
      year_month_userId: {
        year,
        month,
        userId,
      },
    },
  });
  const savingGoal = goal ? goal.amount : 0;

  // Update or create MonthlySummary
  await prisma.monthlySummary.upsert({
    where: {
      year_month_userId: {
        year,
        month,
        userId,
      },
    },
    update: {
      totalIncome,
      totalExpense,
      totalSavings,
      savingGoal,
    },
    create: {
      year,
      month,
      userId,
      totalIncome,
      totalExpense,
      totalSavings,
      savingGoal,
    },
  });
}

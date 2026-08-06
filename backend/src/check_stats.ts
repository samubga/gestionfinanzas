import prisma from './utils/prisma';

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }
  const userId = user.id;
  const year = 2026;
  const month = 7;

  // Available Balance per bank account
  const startManual = user.startingBalance;
  const startCaixa = user.startingBalanceCaixa;
  const startTrade = user.startingBalanceTrade;

  const incomesGrouped = await prisma.income.groupBy({
    by: ['bank'],
    where: { userId },
    _sum: { amount: true }
  });

  const expensesGrouped = await prisma.expense.groupBy({
    by: ['bank'],
    where: { userId },
    _sum: { amount: true }
  });

  // Fetch user investments
  const investments = await prisma.investment.findMany({
    where: { userId }
  });

  let incomeManual = 0;
  let incomeCaixa = 0;
  let incomeTrade = 0;

  let expenseManual = 0;
  let expenseCaixa = 0;
  let expenseTrade = 0;

  let investManual = 0;
  let investCaixa = 0;
  let investTrade = 0;

  let withdrawManual = 0;
  let withdrawCaixa = 0;
  let withdrawTrade = 0;

  let totalInvestedActive = 0;
  let totalRealizedGains = 0;
  let totalFees = 0;

  for (const group of incomesGrouped) {
    if (group.bank === 'CaixaBank') {
      incomeCaixa = group._sum.amount || 0;
    } else if (group.bank === 'Trade Republic') {
      incomeTrade = group._sum.amount || 0;
    } else {
      incomeManual += group._sum.amount || 0;
    }
  }

  for (const group of expensesGrouped) {
    if (group.bank === 'CaixaBank') {
      expenseCaixa = group._sum.amount || 0;
    } else if (group.bank === 'Trade Republic') {
      expenseTrade = group._sum.amount || 0;
    } else {
      expenseManual += group._sum.amount || 0;
    }
  }

  for (const inv of investments) {
    const outflow = inv.amount + inv.buyFee;
    const inflow = inv.status === 'withdrawn' ? ((inv.withdrawnAmount || 0) - (inv.sellFee || 0)) : 0;
    
    totalFees += inv.buyFee + (inv.sellFee || 0);

    if (inv.status === 'active') {
      totalInvestedActive += inv.amount;
    } else if (inv.status === 'withdrawn') {
      totalRealizedGains += (inv.withdrawnAmount || 0) - inv.amount - inv.buyFee - (inv.sellFee || 0);
    }

    if (inv.bank === 'CaixaBank') {
      investCaixa += outflow;
      withdrawCaixa += inflow;
    } else if (inv.bank === 'Trade Republic') {
      investTrade += outflow;
      withdrawTrade += inflow;
    } else {
      investManual += outflow;
      withdrawManual += inflow;
    }
  }

  const balanceManual = startManual + incomeManual - expenseManual - investManual + withdrawManual;
  const balanceCaixa = startCaixa + incomeCaixa - expenseCaixa - investCaixa + withdrawCaixa;
  const balanceTrade = startTrade + incomeTrade - expenseTrade - investTrade + withdrawTrade;
  const availableBalance = balanceManual + balanceCaixa + balanceTrade;

  console.log('--- STATS RESULTS ---');
  console.log({
    availableBalance,
    balances: {
      manual: balanceManual,
      caixa: balanceCaixa,
      trade: balanceTrade
    },
    totalInvestedActive,
    totalRealizedGains,
    totalFees
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

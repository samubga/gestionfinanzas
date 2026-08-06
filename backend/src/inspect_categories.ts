import prisma from './utils/prisma';

async function main() {
  console.log('Fetching income categories...');
  const categories = await prisma.category.findMany({
    where: { type: 'income' }
  });
  console.log('Income categories:', categories);

  console.log('Fetching top 100 incomes...');
  const incomes = await prisma.income.findMany({
    take: 100,
    orderBy: { date: 'desc' },
    include: { category: true }
  });

  for (const inc of incomes) {
    console.log(`Date: ${inc.date.toISOString().split('T')[0]} | Amount: ${inc.amount} | Desc: "${inc.description}" | Cat: "${inc.category?.name}"`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

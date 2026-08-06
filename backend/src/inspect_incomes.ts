import prisma from './utils/prisma';

async function main() {
  console.log('Fetching incomes...');
  const incomes = await prisma.income.findMany({
    include: { category: true },
    orderBy: { date: 'desc' }
  });

  console.log(`Found ${incomes.length} incomes:`);
  for (const inc of incomes) {
    console.log(`ID: ${inc.id} | Date: ${inc.date.toISOString().split('T')[0]} | Amount: ${inc.amount} | Desc: "${inc.description}" | Category: "${inc.category?.name || 'None'}"`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

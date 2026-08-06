import prisma from './utils/prisma';
import { updateMonthlySummary } from './utils/summary';

const DRY_RUN = false; // Set to false to perform the actual database updates

async function main() {
  console.log(`--- STARTING NOMINAS MIGRATION (DRY_RUN = ${DRY_RUN}) ---`);

  // Find category "Nómina"
  const nominaCategory = await prisma.category.findFirst({
    where: {
      name: {
        equals: 'Nómina',
        mode: 'insensitive'
      }
    }
  });

  const nominaCategoryId = nominaCategory?.id;
  console.log(`Found 'Nómina' category ID: ${nominaCategoryId}`);

  // Fetch all potential payroll incomes
  // Either in "Nómina" category OR containing "NOMINA" or "NOMINAS" in description
  const incomes = await prisma.income.findMany({
    where: {
      OR: [
        nominaCategoryId ? { categoryId: nominaCategoryId } : {},
        { description: { contains: 'nomina', mode: 'insensitive' } },
        { description: { contains: 'nómina', mode: 'insensitive' } }
      ]
    },
    include: { category: true }
  });

  console.log(`Found ${incomes.length} total payroll incomes in database.`);

  const toUpdate = [];

  for (const inc of incomes) {
    const date = new Date(inc.date);
    const day = date.getUTCDate();
    
    // We only update payrolls at the end of the month (day >= 25)
    if (day >= 25) {
      const oldYear = date.getUTCFullYear();
      const oldMonth = date.getUTCMonth() + 1; // 1-12

      // Calculate next month's 1st day in UTC
      let newYear = oldYear;
      let newMonth = oldMonth + 1;
      if (newMonth > 12) {
        newMonth = 1;
        newYear = oldYear + 1;
      }

      // Keep original time or set to midday (12:00:00) to avoid timezone-shift issues
      const newDate = new Date(Date.UTC(newYear, newMonth - 1, 1, 12, 0, 0));

      toUpdate.push({
        id: inc.id,
        userId: inc.userId,
        description: inc.description,
        amount: inc.amount,
        oldDate: inc.date,
        newDate,
        oldPeriod: { year: oldYear, month: oldMonth },
        newPeriod: { year: newYear, month: newMonth }
      });
    }
  }

  console.log(`Found ${toUpdate.length} payroll entries to migrate to the next month.`);

  if (toUpdate.length === 0) {
    console.log('No entries match the criteria (day >= 25).');
    return;
  }

  const affectedPeriods = new Set<string>(); // Format: "userId:year:month"

  for (const item of toUpdate) {
    console.log(`- MIGRATING: "${item.description}"`);
    console.log(`  Amount: ${item.amount} €`);
    console.log(`  Old Date: ${item.oldDate.toISOString().split('T')[0]} -> New Date: ${item.newDate.toISOString().split('T')[0]}`);
    
    if (!DRY_RUN) {
      // Update database
      await prisma.income.update({
        where: { id: item.id },
        data: { date: item.newDate }
      });

      // Track old and new periods to update summaries
      affectedPeriods.add(`${item.userId}:${item.oldPeriod.year}:${item.oldPeriod.month}`);
      affectedPeriods.add(`${item.userId}:${item.newPeriod.year}:${item.newPeriod.month}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No database changes were written. Set DRY_RUN = false and run again to perform updates.');
  } else {
    console.log(`\nUpdated ${toUpdate.length} records. Updating affected MonthlySummaries...`);
    
    for (const key of affectedPeriods) {
      const [userId, yearStr, monthStr] = key.split(':');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      
      console.log(`- Recalculating MonthlySummary for User: ${userId}, Period: ${month.toString().padStart(2, '0')}/${year}`);
      await updateMonthlySummary(userId, year, month);
    }
    
    console.log('\nAll MonthlySummaries updated successfully!');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

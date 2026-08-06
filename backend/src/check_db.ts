import { PrismaClient } from '@prisma/client';
import { updateMonthlySummary } from './utils/summary';

const prisma = new PrismaClient();

async function main() {
  const userId = '6c946264-eb6f-429a-8143-08c79e70ed87';
  await updateMonthlySummary(userId, 2026, 7);
  console.log('Monthly summary updated successfully for July 2026');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

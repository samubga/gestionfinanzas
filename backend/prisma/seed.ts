import { PrismaClient, Category, Tag } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test@example.com';
  const rawPassword = 'password123';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // Clean database
  console.log('Cleaning database...');
  await prisma.user.deleteMany({ where: { email } }).catch(() => {});

  console.log('Creating demo user...');
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Usuario Demo',
    },
  });

  console.log('Seeding categories...');
  const categories = [
    // Gastos
    { name: 'Alimentación', color: '#EF4444', type: 'expense' },
    { name: 'Transporte', color: '#F59E0B', type: 'expense' },
    { name: 'Vivienda', color: '#10B981', type: 'expense' },
    { name: 'Ocio', color: '#3B82F6', type: 'expense' },
    { name: 'Viajes', color: '#8B5CF6', type: 'expense' },
    { name: 'Salud', color: '#EC4899', type: 'expense' },
    { name: 'Gimnasio', color: '#06B6D4', type: 'expense' },
    { name: 'Tecnología', color: '#6366F1', type: 'expense' },
    { name: 'Suscripciones', color: '#14B8A6', type: 'expense' },
    { name: 'Otros gastos', color: '#6B7280', type: 'expense' },
    // Ingresos
    { name: 'Nómina', color: '#10B981', type: 'income' },
    { name: 'Bizum', color: '#3B82F6', type: 'income' },
    { name: 'Inversiones', color: '#8B5CF6', type: 'income' },
    { name: 'Otros ingresos', color: '#6B7280', type: 'income' },
  ];

  const createdCategories: Category[] = [];
  for (const cat of categories) {
    const created = await prisma.category.create({
      data: {
        name: cat.name,
        color: cat.color,
        type: cat.type,
        userId: user.id,
      },
    });
    createdCategories.push(created);
  }

  const catMap = new Map(createdCategories.map(c => [c.name, c.id]));

  console.log('Seeding tags...');
  const tagNames = ['supermercado', 'restaurante', 'gasolina', 'gimnasio', 'netflix', 'amazon', 'amigos', 'vacaciones', 'alquiler'];
  const createdTags: Tag[] = [];
  for (const tName of tagNames) {
    const created = await prisma.tag.create({
      data: {
        name: tName,
        userId: user.id,
      },
    });
    createdTags.push(created);
  }
  const tagMap = new Map(createdTags.map(t => [t.name, t.id]));

  // Helper to get Category ID
  const getCatId = (name: string) => catMap.get(name) || createdCategories[0].id;
  const getTagId = (name: string) => tagMap.get(name)!;

  console.log('Seeding incomes...');
  // Incomes - May 2026
  await prisma.income.create({
    data: {
      amount: 2500,
      date: new Date(2026, 4, 1), // May 1st
      description: 'Nómina Mensual',
      userId: user.id,
      categoryId: catMap.get('Nómina') || null,
    },
  });
  await prisma.income.create({
    data: {
      amount: 150,
      date: new Date(2026, 4, 15), // May 15th
      description: 'Venta artículo usado',
      userId: user.id,
      categoryId: catMap.get('Otros ingresos') || null,
    },
  });

  // Incomes - June 2026
  await prisma.income.create({
    data: {
      amount: 2500,
      date: new Date(2026, 5, 1), // June 1st
      description: 'Nómina Mensual',
      userId: user.id,
      categoryId: catMap.get('Nómina') || null,
    },
  });
  await prisma.income.create({
    data: {
      amount: 80,
      date: new Date(2026, 5, 10), // June 10th
      description: 'Clases particulares',
      userId: user.id,
      categoryId: catMap.get('Otros ingresos') || null,
    },
  });

  console.log('Seeding saving goals...');
  await prisma.savingGoal.createMany({
    data: [
      { year: 2026, month: 5, amount: 800, userId: user.id },
      { year: 2026, month: 6, amount: 1000, userId: user.id },
    ],
  });

  console.log('Seeding expenses...');
  // Expenses - May 2026 (Previous Month)
  const expensesMay = [
    { amount: 800, date: new Date(2026, 4, 1), description: 'Alquiler Piso', category: 'Vivienda', tags: ['alquiler'] },
    { amount: 55.40, date: new Date(2026, 4, 3), description: 'Compra semanal Mercadona', category: 'Alimentación', tags: ['supermercado'] },
    { amount: 45.00, date: new Date(2026, 4, 5), description: 'Depósito Gasolina', category: 'Transporte', tags: ['gasolina'] },
    { amount: 29.99, date: new Date(2026, 4, 7), description: 'Mensualidad Gimnasio', category: 'Gimnasio', tags: ['gimnasio'] },
    { amount: 17.99, date: new Date(2026, 4, 10), description: 'Suscripción Netflix', category: 'Suscripciones', tags: ['netflix'] },
    { amount: 120.00, date: new Date(2026, 4, 12), description: 'Cena Cumpleaños', category: 'Ocio', tags: ['restaurante', 'amigos'] },
    { amount: 62.10, date: new Date(2026, 4, 18), description: 'Compra semanal Carrefour', category: 'Alimentación', tags: ['supermercado'] },
    { amount: 85.00, date: new Date(2026, 4, 25), description: 'Auriculares Inalámbricos', category: 'Tecnología', tags: ['amazon'] },
  ];

  // Expenses - June 2026 (Current Month)
  const expensesJune = [
    { amount: 800, date: new Date(2026, 5, 1), description: 'Alquiler Piso', category: 'Vivienda', tags: ['alquiler'] },
    { amount: 64.30, date: new Date(2026, 5, 2), description: 'Compra semanal Mercadona', category: 'Alimentación', tags: ['supermercado'] },
    { amount: 29.99, date: new Date(2026, 5, 4), description: 'Mensualidad Gimnasio', category: 'Gimnasio', tags: ['gimnasio'] },
    { amount: 17.99, date: new Date(2026, 5, 10), description: 'Suscripción Netflix', category: 'Suscripciones', tags: ['netflix'] },
    { amount: 48.00, date: new Date(2026, 5, 11), description: 'Depósito Gasolina', category: 'Transporte', tags: ['gasolina'] },
    { amount: 65.00, date: new Date(2026, 5, 12), description: 'Cena con Amigos', category: 'Ocio', tags: ['restaurante', 'amigos'] },
    { amount: 52.80, date: new Date(2026, 5, 15), description: 'Compra semanal Lidl', category: 'Alimentación', tags: ['supermercado'] },
    { amount: 350.00, date: new Date(2026, 5, 16), description: 'Reserva Hotel Vacaciones', category: 'Viajes', tags: ['vacaciones'] },
  ];

  const allMockExpenses = [...expensesMay, ...expensesJune];

  for (const exp of allMockExpenses) {
    const createdExpense = await prisma.expense.create({
      data: {
        amount: exp.amount,
        date: exp.date,
        description: exp.description,
        userId: user.id,
        categoryId: getCatId(exp.category),
        paymentMethod: 'Tarjeta',
        notes: 'Gasto creado por el semillero automático',
      },
    });

    if (exp.tags && exp.tags.length > 0) {
      await prisma.expenseTag.createMany({
        data: exp.tags.map(tName => ({
          expenseId: createdExpense.id,
          tagId: getTagId(tName),
        })),
      });
    }
  }

  // Recalculate monthly summaries
  console.log('Calculating monthly summaries...');
  const helper = require('../src/utils/summary');
  await helper.updateMonthlySummary(user.id, 2026, 5);
  await helper.updateMonthlySummary(user.id, 2026, 6);

  console.log('--------------------------------------------------');
  console.log('Semillero completado con éxito!');
  console.log(`Usuario demo: ${email}`);
  console.log(`Contraseña: ${rawPassword}`);
  console.log('--------------------------------------------------');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

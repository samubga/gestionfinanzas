import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import tagRoutes from './routes/tag.routes';
import expenseRoutes from './routes/expense.routes';
import incomeRoutes from './routes/income.routes';
import statsRoutes from './routes/stats.routes';
import backupRoutes from './routes/backup.routes';
import forecastRoutes from './routes/forecast.routes';
import investmentRoutes from './routes/investment.routes';
import bankAccountRoutes from './routes/bankAccount.routes';
import bankRoutes from './routes/bank.routes';
import accountRoutes from './routes/account.routes';
import transferRoutes from './routes/transfer.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Higher limit for backup imports

// Disable caching for API responses
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  res.on('finish', () => {
    console.log(`[Response] ${req.method} ${req.url} -> ${res.statusCode}`);
  });
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/incomes', incomeRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);

import prisma from './utils/prisma';

// Start server
app.listen(PORT, async () => {
  console.log(`[Server] Servidor de Gestión Financiera corriendo en el puerto ${PORT}`);
  
  try {
    // 1. Seed System Banks if none exist
    const systemBanks = [
      { name: 'CaixaBank', code: 'caixabank', color: '#0070B8' },
      { name: 'Trade Republic', code: 'tradepublic', color: '#0F172A' },
      { name: 'BBVA', code: 'bbva', color: '#004481' },
      { name: 'Santander', code: 'santander', color: '#EC0000' },
      { name: 'Revolut', code: 'revolut', color: '#1961E6' },
      { name: 'N26', code: 'n26', color: '#36A18B' },
      { name: 'ING', code: 'ing', color: '#FF6200' },
      { name: 'Openbank', code: 'openbank', color: '#FF0055' },
      { name: 'Bankinter', code: 'bankinter', color: '#FF6600' },
      { name: 'Banco Sabadell', code: 'sabadell', color: '#0084C9' },
      { name: 'Abanca', code: 'abanca', color: '#004A99' },
      { name: 'Unicaja', code: 'unicaja', color: '#007A33' },
      { name: 'Wise', code: 'wise', color: '#2E008B' },
      { name: 'PayPal', code: 'paypal', color: '#003087' },
      { name: 'Crypto / Exchange', code: 'crypto', color: '#F3BA2F' },
    ];

    for (const b of systemBanks) {
      const exists = await prisma.bank.findFirst({
        where: { name: b.name, userId: null }
      });
      if (!exists) {
        await prisma.bank.create({
          data: {
            name: b.name,
            code: b.code,
            color: b.color,
            isCustom: false,
            userId: null
          }
        });
      }
    }

    // 2. Migration: Populate Account entities for existing users
    const allUsers = await prisma.user.findMany({
      include: { bankAccounts: true, accounts: true }
    });

    const allSystemBanks = await prisma.bank.findMany({ where: { userId: null } });

    for (const u of allUsers) {
      if (u.accounts.length === 0) {
        console.log(`[Migration] Creando entidades Account para el usuario ${u.email}`);
        
        const legacyAccounts = u.bankAccounts.length > 0 ? u.bankAccounts : [
          { name: 'Manual', startingBalance: u.startingBalance },
          { name: 'CaixaBank', startingBalance: u.startingBalanceCaixa },
          { name: 'Trade Republic', startingBalance: u.startingBalanceTrade }
        ];

        for (const leg of legacyAccounts) {
          const matchedBank = allSystemBanks.find(sb => sb.name.toLowerCase() === leg.name.toLowerCase());
          const isCash = leg.name.toLowerCase().includes('efectivo') || leg.name.toLowerCase().includes('manual');
          const isInv = leg.name.toLowerCase().includes('trade') || leg.name.toLowerCase().includes('invers');
          const accType = isCash ? 'CASH' : isInv ? 'INVESTMENT' : 'CHECKING';
          const accIcon = accType === 'CASH' ? '💵' : accType === 'INVESTMENT' ? '📈' : '💳';

          await prisma.account.create({
            data: {
              name: leg.name,
              type: accType,
              startingBalance: leg.startingBalance,
              color: matchedBank ? matchedBank.color : '#6366F1',
              icon: accIcon,
              bankId: matchedBank ? matchedBank.id : null,
              userId: u.id
            }
          });
        }
      }
    }

    // 3. Link Expense, Income, Investment accountId foreign keys
    for (const u of allUsers) {
      const userAccounts = await prisma.account.findMany({ where: { userId: u.id } });
      const defaultAcc = userAccounts.find(a => a.type === 'CASH') || userAccounts[0];

      if (!defaultAcc) continue;

      for (const acc of userAccounts) {
        await prisma.expense.updateMany({
          where: { userId: u.id, accountId: null, bank: acc.name },
          data: { accountId: acc.id }
        });
        await prisma.income.updateMany({
          where: { userId: u.id, accountId: null, bank: acc.name },
          data: { accountId: acc.id }
        });
        await prisma.investment.updateMany({
          where: { userId: u.id, accountId: null, bank: acc.name },
          data: { accountId: acc.id }
        });
      }

      await prisma.expense.updateMany({
        where: { userId: u.id, accountId: null },
        data: { accountId: defaultAcc.id, bank: defaultAcc.name }
      });
      await prisma.income.updateMany({
        where: { userId: u.id, accountId: null },
        data: { accountId: defaultAcc.id, bank: defaultAcc.name }
      });
      await prisma.investment.updateMany({
        where: { userId: u.id, accountId: null },
        data: { accountId: defaultAcc.id, bank: defaultAcc.name }
      });
    }

    console.log('[Migration] Migración de entidades de Cuentas y Bancos completada exitosamente.');
  } catch (err) {
    console.error('[Migration] Error durante la migración de cuentas y bancos:', err);
  }
});

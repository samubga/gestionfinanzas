import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateMonthlySummary } from '../utils/summary';

export async function exportBackup(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  try {
    const categories = await prisma.category.findMany({ where: { userId } });
    const tags = await prisma.tag.findMany({ where: { userId } });
    const incomes = await prisma.income.findMany({ where: { userId } });
    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: {
        tags: {
          select: { tagId: true }
        }
      }
    });
    const savingGoals = await prisma.savingGoal.findMany({ where: { userId } });
    const investments = await prisma.investment.findMany({ where: { userId } });

    const bankAccounts = await prisma.bankAccount.findMany({ where: { userId } });
    const customBanks = await prisma.bank.findMany({ where: { userId } });
    const accounts = await prisma.account.findMany({ where: { userId }, include: { bank: true } });
    const transfers = await prisma.transfer.findMany({ where: { userId }, include: { fromAccount: true, toAccount: true } });

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      categories: categories.map(c => ({ name: c.name, color: c.color, id: c.id })),
      tags: tags.map(t => ({ name: t.name, id: t.id })),
      bankAccounts: bankAccounts.map(b => ({ name: b.name, startingBalance: b.startingBalance })),
      customBanks: customBanks.map(b => ({ id: b.id, name: b.name, code: b.code, color: b.color, logoUrl: b.logoUrl })),
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        startingBalance: a.startingBalance,
        currency: a.currency,
        color: a.color,
        icon: a.icon,
        bankName: a.bank?.name || null
      })),
      incomes: incomes.map(i => ({
        amount: i.amount,
        date: i.date,
        description: i.description,
        bank: i.bank,
        categoryId: i.categoryId
      })),
      expenses: expenses.map(e => ({
        amount: e.amount,
        date: e.date,
        description: e.description,
        paymentMethod: e.paymentMethod,
        notes: e.notes,
        bank: e.bank,
        categoryId: e.categoryId,
        tagIds: e.tags.map(t => t.tagId)
      })),
      savingGoals: savingGoals.map(s => ({
        year: s.year,
        month: s.month,
        amount: s.amount
      })),
      investments: investments.map(inv => ({
        type: inv.type,
        name: inv.name,
        amount: inv.amount,
        buyFee: inv.buyFee,
        bank: inv.bank,
        startDate: inv.startDate,
        status: inv.status,
        withdrawnAmount: inv.withdrawnAmount,
        sellFee: inv.sellFee,
        endDate: inv.endDate,
        notes: inv.notes
      })),
      transfers: transfers.map(t => ({
        amount: t.amount,
        date: t.date,
        description: t.description,
        notes: t.notes,
        fromAccountName: t.fromAccount.name,
        toAccountName: t.toAccount.name
      }))
    };

    res.json(backupData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al exportar copia de seguridad' });
  }
}

export async function importBackup(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { backup } = req.body;

  if (!backup || !backup.categories || !backup.expenses) {
    return res.status(400).json({ error: 'Formato de copia de seguridad inválido o vacío' });
  }

  try {
    const categoryMap: Record<string, string> = {};
    const tagMap: Record<string, string> = {};

    // 1. Process Categories
    for (const cat of backup.categories) {
      let existing = await prisma.category.findFirst({
        where: { name: cat.name, userId }
      });
      if (!existing) {
        existing = await prisma.category.create({
          data: { name: cat.name, color: cat.color || '#3B82F6', userId }
        });
      }
      categoryMap[cat.id] = existing.id;
    }

    // 2. Process Tags
    if (backup.tags) {
      for (const tag of backup.tags) {
        let existing = await prisma.tag.findFirst({
          where: { name: tag.name.toLowerCase().trim(), userId }
        });
        if (!existing) {
          existing = await prisma.tag.create({
            data: { name: tag.name.toLowerCase().trim(), userId }
          });
        }
        tagMap[tag.id] = existing.id;
      }
    }

    // 2.5. Process Bank Accounts
    if (backup.bankAccounts && Array.isArray(backup.bankAccounts)) {
      for (const ba of backup.bankAccounts) {
        await prisma.bankAccount.upsert({
          where: {
            name_userId: { name: ba.name, userId }
          },
          update: { startingBalance: parseFloat(ba.startingBalance) },
          create: {
            name: ba.name,
            startingBalance: parseFloat(ba.startingBalance),
            userId
          }
        });
      }
    }

    // 2.6. Process Accounts
    if (backup.accounts && Array.isArray(backup.accounts)) {
      for (const acc of backup.accounts) {
        let existing = await prisma.account.findFirst({
          where: { name: acc.name, userId }
        });
        if (!existing) {
          let bankId = null;
          if (acc.bankName) {
            const bankObj = await prisma.bank.findFirst({
              where: { name: acc.bankName, OR: [{ userId: null }, { userId }] }
            });
            if (bankObj) bankId = bankObj.id;
          }

          await prisma.account.create({
            data: {
              name: acc.name,
              type: acc.type || 'CHECKING',
              startingBalance: parseFloat(acc.startingBalance as any) || 0,
              currency: acc.currency || 'EUR',
              color: acc.color || '#6366F1',
              icon: acc.icon || '💳',
              bankId,
              userId
            }
          });
        }
      }
    }

    // 3. Process Incomes
    if (backup.incomes) {
      for (const inc of backup.incomes) {
        const mappedCategoryId = inc.categoryId ? categoryMap[inc.categoryId] : null;
        await prisma.income.create({
          data: {
            amount: parseFloat(inc.amount),
            date: new Date(inc.date),
            description: inc.description,
            categoryId: mappedCategoryId || null,
            bank: inc.bank || null,
            userId
          }
        });
      }
    }

    // 4. Process Expenses
    if (backup.expenses) {
      for (const exp of backup.expenses) {
        const mappedCategoryId = categoryMap[exp.categoryId];
        if (!mappedCategoryId) continue;

        const expense = await prisma.expense.create({
          data: {
            amount: parseFloat(exp.amount),
            date: new Date(exp.date),
            description: exp.description,
            paymentMethod: exp.paymentMethod || null,
            notes: exp.notes || null,
            bank: exp.bank || null,
            categoryId: mappedCategoryId,
            userId
          }
        });

        if (exp.tagIds && Array.isArray(exp.tagIds)) {
          const mappedTagIds = exp.tagIds
            .map((oldId: string) => tagMap[oldId])
            .filter(Boolean);

          if (mappedTagIds.length > 0) {
            await prisma.expenseTag.createMany({
              data: mappedTagIds.map((tagId: string) => ({
                expenseId: expense.id,
                tagId
              }))
            });
          }
        }
      }
    }

    // 5. Process Saving Goals
    if (backup.savingGoals) {
      for (const goal of backup.savingGoals) {
        await prisma.savingGoal.upsert({
          where: {
            year_month_userId: {
              year: parseInt(goal.year),
              month: parseInt(goal.month),
              userId
            }
          },
          update: { amount: parseFloat(goal.amount) },
          create: {
            year: parseInt(goal.year),
            month: parseInt(goal.month),
            amount: parseFloat(goal.amount),
            userId
          }
        });
      }
    }

    // 5.5. Process Investments
    if (backup.investments) {
      for (const inv of backup.investments) {
        await prisma.investment.create({
          data: {
            type: inv.type,
            name: inv.name,
            amount: parseFloat(inv.amount),
            buyFee: inv.buyFee ? parseFloat(inv.buyFee) : 0,
            bank: inv.bank || 'Trade Republic',
            startDate: new Date(inv.startDate),
            status: inv.status || 'active',
            withdrawnAmount: inv.withdrawnAmount ? parseFloat(inv.withdrawnAmount) : null,
            sellFee: inv.sellFee ? parseFloat(inv.sellFee) : null,
            endDate: inv.endDate ? new Date(inv.endDate) : null,
            notes: inv.notes || null,
            userId
          }
        });
      }
    }

    // 5.8. Process Transfers
    if (backup.transfers && Array.isArray(backup.transfers)) {
      for (const t of backup.transfers) {
        let fromAcc = await prisma.account.findFirst({
          where: { name: t.fromAccountName, userId }
        });
        let toAcc = await prisma.account.findFirst({
          where: { name: t.toAccountName, userId }
        });

        if (fromAcc && toAcc) {
          await prisma.transfer.create({
            data: {
              amount: parseFloat(t.amount as any),
              date: new Date(t.date),
              description: t.description,
              notes: t.notes || null,
              fromAccountId: fromAcc.id,
              toAccountId: toAcc.id,
              userId
            }
          });
        }
      }
    }

    // 6. Recalculate Monthly Summaries
    const monthsToUpdate = new Map<string, { year: number, month: number }>();

    if (backup.expenses) {
      for (const exp of backup.expenses) {
        const d = new Date(exp.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        monthsToUpdate.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    }

    if (backup.incomes) {
      for (const inc of backup.incomes) {
        const d = new Date(inc.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        monthsToUpdate.set(key, { year: d.getFullYear(), month: d.getMonth() + 1 });
      }
    }

    for (const item of monthsToUpdate.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({ message: 'Copia de seguridad importada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al importar copia de seguridad' });
  }
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Traspaso': '#64748B',
  'Nómina': '#10B981',
  'Bizum': '#3B82F6',
  'Alimentación': '#EF4444',
  'Transporte': '#F59E0B',
  'Ocio': '#3B82F6',
  'Suscripciones': '#14B8A6',
  'Viajes': '#8B5CF6',
  'Gimnasio': '#06B6D4',
  'Tecnología': '#6366F1',
  'Salud': '#EC4899',
  'Ropa': '#F43F5E',
  'Donaciones': '#10B981',
  'Peluqueria': '#D946EF',
  'Regalos': '#FB7185',
  'Otros gastos': '#6B7280',
  'Otros ingresos': '#6B7280'
};

function getRandomColorForCategory(name: string): string {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  const presets = ['#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#84CC16', '#EAB308', '#F97316', '#EF4444', '#EC4899', '#8B5CF6'];
  return presets[Math.floor(Math.random() * presets.length)];
}

function autoDetectCategory(concept: string, amount: number): string {
  const cleanConcept = concept.toLowerCase().trim();
  
  // Rule 1: Traspaso / Transfer (strictly requires amount >= 500)
  if (Math.abs(amount) >= 500) {
    const isRoundAmount = Math.abs(amount) % 10 === 0;
    const hasTransferKeywords = ['traspaso', 'transferencia', 'trade republic', 'ahorro caixa', 'pago traspasos'].some(kw => cleanConcept.includes(kw));
    if (isRoundAmount || hasTransferKeywords) {
      return 'Traspaso';
    }
  }

  // Rule 2: Keyword matchers
  if (['nomina', 'salary', 'trf'].some(kw => cleanConcept.includes(kw)) && !cleanConcept.includes('trade')) {
    return 'Nómina';
  }
  
  if (cleanConcept.includes('bizum')) {
    return 'Bizum';
  }

  if (['mercadona', 'carrefour', 'lidl', 'alcampo', 'alimentacion', 'supermercado', 'comida', 'kiosko porkys', 'autoservicio', 'firas', 'productos el bici', 'dia'].some(kw => cleanConcept.includes(kw))) {
    return 'Alimentación';
  }

  if (['renfe', 'trainline', 'crtm', 'tussam', 'madrid sur movili', 'parking', 'gas', 'costco gas', 'radial', 'radial 3', 'radial 5', 'seitt', 'dgt sanciones', 'autobus', 'metro'].some(kw => cleanConcept.includes(kw))) {
    return 'Transporte';
  }

  if (['trip.com', 'kiwi.com', 'hotel', 'vuelo', 'viaje', 'travel', 'booking', 'ryanair', 'iberia'].some(kw => cleanConcept.includes(kw))) {
    return 'Viajes';
  }

  if (['netflix', 'spotify', 'disney plus', 'disney+', 'youtube', 'google play', 'google one', 'steam', 'supercell', 'playstation', 'xbox'].some(kw => cleanConcept.includes(kw))) {
    return 'Suscripciones';
  }

  if (['fitness', 'gym', 'gimnasio', 'xfitness', 'neo gym', 'hsn store', 'prosperidad', 'muscle market', 'mirasur'].some(kw => cleanConcept.includes(kw))) {
    return 'Gimnasio';
  }

  if (['pccomponentes', 'amazon', 'apple', 'tecnologia', 'fnac', 'media markt', 'instant gaming', 'pc tres agu'].some(kw => cleanConcept.includes(kw))) {
    return 'Tecnología';
  }

  if (['farmacia', 'dental', 'dentista', 'salud', 'hospital', 'médico', 'medico', 'karen dental'].some(kw => cleanConcept.includes(kw))) {
    return 'Salud';
  }

  if (['bershka', 'pull and bear', 'pull and beat', 'lefties', 'stradivarius', 'mango', 'zara', 'h&m', 'shein', 'temu.com', 'tiktok shop', 'druni', 'suits inc', 'jack jones', 'grandes almacenes', 'comercial jardin', 'shopping'].some(kw => cleanConcept.includes(kw))) {
    return 'Ropa';
  }

  if (['donate.jw.org', 'donacion', 'ong'].some(kw => cleanConcept.includes(kw))) {
    return 'Donaciones';
  }

  if (['peluqueria', 'peluqueros', 'barber', 'estetica', 'salon', 'salón'].some(kw => cleanConcept.includes(kw))) {
    return 'Peluqueria';
  }

  if (['inspire x ie', 'regalo', 'gift'].some(kw => cleanConcept.includes(kw))) {
    return 'Regalos';
  }

  if (['restaurante', 'cinesa', 'cinesur', 'eventim', 'theme park', 'starbucks', 'wok', 'rodilla', 'dominós', 'dominos', 'burger', 'kfc', 'mcdonalds', '100 montaditos', 'vips', 'sushi', 'pizza', 'helados', 'barca vikinga', 'tapas', 'santa gloria', 'postigo', 'bar magro', 'piscina municipal', 'ilusiona', 'cityplay', 'city play', 'bosforos', 'bollywood', 'osaka', 'otaku', 'dogmatico', 'hassan', 'champions burger', 'chocolat', 'chocolateria', 'jaime 24h', 'rallye', 'bk', 'bar', 'pub', 'cafe', 'cafestore', 'brisket', 'arcos multicines', 'ozone', 'muelle de nueva y', 'mordida fest', 'hamburgueseria', 'pomodoro', 'pecris', 'arrivo', 'harry getafe', 'fast cordoba'].some(kw => cleanConcept.includes(kw))) {
    return 'Ocio';
  }

  return amount < 0 ? 'Otros gastos' : 'Otros ingresos';
}

export async function parseCSVPreview(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { csvText } = req.body;

  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ error: 'Contenido del CSV no proporcionado o inválido' });
  }

  try {
    const lines = csvText.split(/\r?\n/);
    let separator = ',';
    let headerIndex = -1;
    let isTradeRepublic = false;

    let colConcepto = -1;
    let colFecha = -1;
    let colImporte = -1;
    let colCategoria = -1;
    let colName = -1;
    let colType = -1;
    let colTax = -1;

    // Detect header row and separator/format
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Concepto') && line.includes('Fecha') && line.includes('Importe')) {
        headerIndex = i;
        isTradeRepublic = false;
        separator = line.includes(';') ? ';' : ',';
        
        const headers = parseCSVLine(line, separator);
        colConcepto = headers.findIndex(h => h.toLowerCase() === 'concepto');
        colFecha = headers.findIndex(h => h.toLowerCase() === 'fecha');
        colImporte = headers.findIndex(h => h.toLowerCase() === 'importe');
        colCategoria = headers.findIndex(h => h.toLowerCase() === 'categoria');
        break;
      }
      if (line.includes('datetime') && line.includes('date') && line.includes('amount')) {
        headerIndex = i;
        isTradeRepublic = true;
        separator = ',';

        const headers = parseCSVLine(line, separator);
        colConcepto = headers.findIndex(h => h.toLowerCase() === 'description');
        colName = headers.findIndex(h => h.toLowerCase() === 'name');
        colFecha = headers.findIndex(h => h.toLowerCase() === 'date');
        colImporte = headers.findIndex(h => h.toLowerCase() === 'amount');
        colCategoria = headers.findIndex(h => h.toLowerCase() === 'category');
        colType = headers.findIndex(h => h.toLowerCase() === 'type');
        colTax = headers.findIndex(h => h.toLowerCase() === 'tax');
        break;
      }
    }

    if (headerIndex === -1 || colFecha === -1 || colImporte === -1) {
      return res.status(400).json({
        error: 'No se detectó un formato compatible. El CSV debe tener cabeceras válidas de CaixaBank ("Concepto", "Fecha", "Importe") o Trade Republic ("date", "amount", "description").'
      });
    }

    // Load categories
    const existingCategories = await prisma.category.findMany({
      where: { userId }
    });
    const categoriesMap = new Map(existingCategories.map(c => [c.name.toLowerCase().trim(), c]));

    const tempItems: any[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = parseCSVLine(line, separator);
      
      if (fields.length <= Math.max(colFecha, colImporte)) {
        continue;
      }

      let concepto = '';
      if (isTradeRepublic) {
        const nameVal = colName !== -1 && fields.length > colName ? fields[colName] : '';
        const descVal = colConcepto !== -1 && fields.length > colConcepto ? fields[colConcepto] : '';
        concepto = nameVal.trim() || descVal.trim() || 'Movimiento Trade Republic';
      } else {
        concepto = colConcepto !== -1 && fields.length > colConcepto ? fields[colConcepto] : 'Movimiento CaixaBank';
      }

      const fechaRaw = fields[colFecha];
      const importeRaw = fields[colImporte];
      const categoriaRaw = colCategoria !== -1 && fields.length > colCategoria ? fields[colCategoria] : '';

      if (!concepto || !fechaRaw || !importeRaw) continue;

      // Parse Date
      let date: Date;
      let formattedDate = '';
      if (isTradeRepublic) {
        // format YYYY-MM-DD
        const dateParts = fechaRaw.split('-');
        if (dateParts.length !== 3) continue;
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
        date = new Date(year, month - 1, day, 12, 0, 0, 0);
        formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else {
        // CaixaBank format (DD/MM/YYYY)
        const dateParts = fechaRaw.split('/');
        if (dateParts.length !== 3) continue;
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const year = parseInt(dateParts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
        date = new Date(year, month - 1, day, 12, 0, 0, 0);
        formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }

      // Parse Tax (only if Trade Republic)
      let tax = 0;
      if (isTradeRepublic && colTax !== -1 && fields.length > colTax) {
        const taxRaw = fields[colTax];
        if (taxRaw) {
          const cleanTax = taxRaw.replace(',', '.');
          const parsedTax = parseFloat(cleanTax);
          if (!isNaN(parsedTax)) {
            tax = parsedTax;
          }
        }
      }

      // Parse Amount
      const cleanImporte = importeRaw.replace(',', '.');
      let amount = parseFloat(cleanImporte);
      if (isNaN(amount) || amount === 0) continue;

      // Adjust amount with tax if it is an income and tax is negative
      if (amount > 0 && tax < 0) {
        amount = amount + tax; // since tax is negative, it reduces the amount (e.g. 37.39 + (-7.10) = 30.29)
      }

      const isTransfer = autoDetectCategory(concepto, Math.abs(amount)) === 'Traspaso';
      const type = isTransfer ? 'transfer' : (amount < 0 ? 'expense' : 'income');

      let categoryId = '';
      if (type !== 'transfer') {
        if (categoriaRaw) {
          const catNameClean = categoriaRaw.toLowerCase().trim();
          const foundCat = categoriesMap.get(catNameClean);
          if (foundCat && foundCat.type === type) {
            categoryId = foundCat.id;
          }
        }

        if (!categoryId) {
          const detectedCatName = autoDetectCategory(concepto, Math.abs(amount));
          let foundCat = categoriesMap.get(detectedCatName.toLowerCase().trim());
          if (!foundCat) {
            foundCat = await prisma.category.create({
              data: {
                name: detectedCatName,
                color: getRandomColorForCategory(detectedCatName),
                type: type,
                userId
              }
            });
            categoriesMap.set(detectedCatName.toLowerCase().trim(), foundCat);
          }
          categoryId = foundCat.id;
        }
      }

      let paymentMethod = 'Tarjeta';
      if (isTradeRepublic) {
        const trType = colType !== -1 && fields.length > colType ? fields[colType].toUpperCase() : '';
        if (trType.includes('INTEREST') || trType.includes('BENEFIT')) {
          paymentMethod = 'Transferencia';
        } else if (trType.includes('CARD')) {
          paymentMethod = 'Tarjeta';
        } else {
          paymentMethod = 'Transferencia';
        }
      } else if (type === 'expense') {
        const conceptUpper = concepto.toUpperCase();
        if (conceptUpper.includes('BIZUM')) {
          paymentMethod = 'Bizum';
        } else if (conceptUpper.includes('EFECTIVO') || conceptUpper.includes('CAJERO') || conceptUpper.includes('RETIRADA')) {
          paymentMethod = 'Efectivo';
        } else if (conceptUpper.includes('TRANSFERENCIA')) {
          paymentMethod = 'Transferencia';
        } else if (conceptUpper.includes('RECIBO') || conceptUpper.includes('DOMICILIACION') || conceptUpper.includes('SEGURO')) {
          paymentMethod = 'Domiciliación';
        }
      }

      tempItems.push({
        description: concepto,
        dateObj: date,
        dateStr: formattedDate,
        amount: Math.abs(amount),
        originalAmount: amount,
        type,
        paymentMethod: type === 'expense' ? paymentMethod : null,
        categoryId: categoryId || '',
        notes: isTradeRepublic ? 'Importado de Trade Republic' : 'Importado de CaixaBank',
        bank: isTradeRepublic ? 'Trade Republic' : 'CaixaBank',
        tags: []
      });
    }

    // Now fetch matching database items to check for duplicates
    let existingExpenses: any[] = [];
    let existingIncomes: any[] = [];
    let existingTransfers: any[] = [];

    if (tempItems.length > 0) {
      const dates = tempItems.map(t => t.dateObj.getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      const startRange = new Date(minDate);
      startRange.setHours(0, 0, 0, 0);
      const endRange = new Date(maxDate);
      endRange.setHours(23, 59, 59, 999);

      existingExpenses = await prisma.expense.findMany({
        where: {
          userId,
          imported: true,
          date: { gte: startRange, lte: endRange }
        }
      });

      existingIncomes = await prisma.income.findMany({
        where: {
          userId,
          imported: true,
          date: { gte: startRange, lte: endRange }
        }
      });

      existingTransfers = await prisma.transfer.findMany({
        where: {
          userId,
          date: { gte: startRange, lte: endRange }
        }
      });
    }

    const cleanStr = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

    const matchOccurrences = new Map<string, number>();

    const userAccounts = await prisma.account.findMany({
      where: { userId },
      include: { bank: true }
    });

    const parsedTransactions = tempItems.map(item => {
      let alreadyExists = false;
      const cleanItemDesc = cleanStr(item.description);
      const key = `${item.type}_${item.dateStr}_${item.amount}_${cleanItemDesc}`;

      const occurrenceIndex = matchOccurrences.get(key) || 0;
      matchOccurrences.set(key, occurrenceIndex + 1);

      let fromAccountId = '';
      let toAccountId = '';
      let accountId = '';

      if (userAccounts.length > 0) {
        const currentAccount = userAccounts.find(acc => 
          acc.name.toLowerCase().includes((item.bank || '').toLowerCase()) || 
          (acc.bank && acc.bank.name.toLowerCase().includes((item.bank || '').toLowerCase()))
        ) || userAccounts[0];

        const otherAccount = userAccounts.find(acc => 
          acc.id !== currentAccount.id && (
            item.description.toLowerCase().includes(acc.name.toLowerCase()) ||
            (acc.bank && item.description.toLowerCase().includes(acc.bank.name.toLowerCase()))
          )
        ) || userAccounts.find(acc => acc.id !== currentAccount.id) || currentAccount;

        const isOutflow = item.originalAmount !== undefined ? item.originalAmount < 0 : true;
        fromAccountId = isOutflow ? currentAccount.id : otherAccount.id;
        toAccountId = isOutflow ? otherAccount.id : currentAccount.id;
        accountId = currentAccount.id;
      }

      if (item.type === 'expense') {
        const matches = existingExpenses.filter(e => {
          const dbUtcStr = e.date.toISOString().split('T')[0];
          const dbYear = e.date.getFullYear();
          const dbMonth = String(e.date.getMonth() + 1).padStart(2, '0');
          const dbDay = String(e.date.getDate()).padStart(2, '0');
          const dbLocalStr = `${dbYear}-${dbMonth}-${dbDay}`;

          const dateMatches = (dbUtcStr === item.dateStr || dbLocalStr === item.dateStr);
          const amountMatches = Math.abs(e.amount - item.amount) < 0.01;
          const descMatches = cleanStr(e.description) === cleanItemDesc;

          return dateMatches && amountMatches && descMatches;
        });
        alreadyExists = matches.length > occurrenceIndex;
      } else if (item.type === 'income') {
        const matches = existingIncomes.filter(i => {
          const dbUtcStr = i.date.toISOString().split('T')[0];
          const dbYear = i.date.getFullYear();
          const dbMonth = String(i.date.getMonth() + 1).padStart(2, '0');
          const dbDay = String(i.date.getDate()).padStart(2, '0');
          const dbLocalStr = `${dbYear}-${dbMonth}-${dbDay}`;

          const dateMatches = (dbUtcStr === item.dateStr || dbLocalStr === item.dateStr);
          const amountMatches = Math.abs(i.amount - item.amount) < 0.01;
          const descMatches = cleanStr(i.description) === cleanItemDesc;

          return dateMatches && amountMatches && descMatches;
        });
        alreadyExists = matches.length > occurrenceIndex;
      } else if (item.type === 'transfer') {
        const matches = existingTransfers.filter(t => {
          const dbUtcStr = t.date.toISOString().split('T')[0];
          const dbYear = t.date.getFullYear();
          const dbMonth = String(t.date.getMonth() + 1).padStart(2, '0');
          const dbDay = String(t.date.getDate()).padStart(2, '0');
          const dbLocalStr = `${dbYear}-${dbMonth}-${dbDay}`;

          const dateMatches = (dbUtcStr === item.dateStr || dbLocalStr === item.dateStr);
          const amountMatches = Math.abs(t.amount - item.amount) < 0.01;
          const descMatches = cleanStr(t.description) === cleanItemDesc;

          return dateMatches && amountMatches && descMatches;
        });
        alreadyExists = matches.length > occurrenceIndex;
      }

      return {
        description: item.description,
        date: item.dateStr,
        amount: item.amount,
        originalAmount: item.originalAmount,
        type: item.type,
        paymentMethod: item.paymentMethod,
        categoryId: item.categoryId,
        notes: item.notes,
        bank: item.bank,
        accountId,
        fromAccountId,
        toAccountId,
        tags: item.tags,
        alreadyExists
      };
    });

    res.json(parsedTransactions);

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al procesar el archivo CSV' });
  }
}

export async function importTransactions(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Lista de transacciones no válida' });
  }

  try {
    let createdExpensesCount = 0;
    let createdIncomesCount = 0;
    let createdTransfersCount = 0;
    const monthsToUpdate = new Map<string, { year: number, month: number }>();
    const cleanStr = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const processedCounts = new Map<string, number>();

    for (const tx of transactions) {
      const { description, date, amount, originalAmount, categoryId, type, paymentMethod, notes, bank, tags, accountId } = tx;

      if (!description || !date || amount === undefined || isNaN(amount) || amount <= 0) {
        continue;
      }

      const txDate = new Date(date);
      const year = txDate.getFullYear();
      const month = txDate.getMonth() + 1;
      const key = `${year}-${month}`;
      monthsToUpdate.set(key, { year, month });

      const startRange = new Date(txDate);
      startRange.setHours(0, 0, 0, 0);
      const endRange = new Date(txDate);
      endRange.setHours(23, 59, 59, 999);
      const cleanTxDesc = cleanStr(description);
      const floatAmount = parseFloat(amount);

      const txKey = `${type}_${date.split('T')[0]}_${floatAmount}_${cleanTxDesc}`;
      const occurrenceIndex = processedCounts.get(txKey) || 0;
      processedCounts.set(txKey, occurrenceIndex + 1);

      if (type === 'transfer') {
        const userAccounts = await prisma.account.findMany({
          where: { userId },
          include: { bank: true }
        });

        // Account this CSV belongs to
        const currentAccount = userAccounts.find(acc => 
          acc.name.toLowerCase().includes((bank || '').toLowerCase()) || 
          (acc.bank && acc.bank.name.toLowerCase().includes((bank || '').toLowerCase()))
        ) || userAccounts[0];

        // Other account referenced in description
        const otherAccount = userAccounts.find(acc => 
          acc.id !== currentAccount?.id && (
            description.toLowerCase().includes(acc.name.toLowerCase()) ||
            (acc.bank && description.toLowerCase().includes(acc.bank.name.toLowerCase()))
          )
        ) || userAccounts.find(acc => acc.id !== currentAccount?.id)
        || currentAccount;

        const isOutflow = originalAmount !== undefined ? originalAmount < 0 : true;
        const finalFromAccountId = tx.fromAccountId || (isOutflow ? currentAccount?.id : otherAccount?.id);
        const finalToAccountId = tx.toAccountId || (isOutflow ? otherAccount?.id : currentAccount?.id);

        const existingOnDay = await prisma.transfer.findMany({
          where: {
            userId,
            amount: floatAmount,
            date: { gte: startRange, lte: endRange }
          }
        });
        const matchingDbCount = existingOnDay.filter(t => cleanStr(t.description) === cleanTxDesc).length;

        if (matchingDbCount > occurrenceIndex) {
          continue;
        }

        await prisma.transfer.create({
          data: {
            amount: floatAmount,
            date: txDate,
            description: description.trim(),
            notes: notes || 'Importado de CSV',
            fromAccountId: finalFromAccountId,
            toAccountId: finalToAccountId,
            userId
          }
        });
        createdTransfersCount++;

      } else if (type === 'expense') {
        // Prevent duplicate import by checking occurrence count on the day
        const existingOnDay = await prisma.expense.findMany({
          where: {
            userId,
            amount: floatAmount,
            imported: true,
            date: { gte: startRange, lte: endRange }
          }
        });
        const matchingDbCount = existingOnDay.filter(e => cleanStr(e.description) === cleanTxDesc).length;

        if (matchingDbCount > occurrenceIndex) {
          continue;
        }

        let finalCategoryId = categoryId;
        if (!finalCategoryId) {
          let defaultCat = await prisma.category.findFirst({
            where: { type: 'expense', name: 'Sin categoría', userId }
          });
          if (!defaultCat) {
            defaultCat = await prisma.category.create({
              data: {
                name: 'Sin categoría',
                color: '#94A3B8',
                type: 'expense',
                userId
              }
            });
          }
          finalCategoryId = defaultCat.id;
        }

        // Resolve or create tags if sent
        const tagIds: string[] = [];
        if (tags && Array.isArray(tags)) {
          for (const tagName of tags) {
            const cleanName = tagName.trim().toLowerCase();
            if (!cleanName) continue;
            let tag = await prisma.tag.findFirst({
              where: { name: cleanName, userId },
            });
            if (!tag) {
              tag = await prisma.tag.create({
                data: { name: cleanName, userId },
              });
            }
            tagIds.push(tag.id);
          }
        }

        // Resolve target account ID and bank name
        let finalAccountId = accountId || null;
        let finalBankName = bank || null;
        
        if (finalAccountId) {
          const acc = await prisma.account.findFirst({ where: { id: finalAccountId, userId } });
          if (acc) {
            finalBankName = acc.name;
          }
        } else if (finalBankName) {
          const acc = await prisma.account.findFirst({
            where: { name: finalBankName, userId }
          });
          if (acc) {
            finalAccountId = acc.id;
          }
        } else {
          const defaultBank = notes?.includes('Trade Republic') ? 'Trade Republic' : notes?.includes('CaixaBank') ? 'CaixaBank' : null;
          if (defaultBank) {
            finalBankName = defaultBank;
            const acc = await prisma.account.findFirst({
              where: {
                name: { contains: defaultBank, mode: 'insensitive' },
                userId
              }
            });
            if (acc) {
              finalAccountId = acc.id;
            }
          }
        }

        await prisma.expense.create({
          data: {
            amount: floatAmount,
            date: txDate,
            description: description.trim(),
            paymentMethod: paymentMethod || 'Tarjeta',
            categoryId: finalCategoryId,
            userId,
            notes: notes || 'Importado de CSV',
            bank: finalBankName,
            accountId: finalAccountId,
            imported: true,
            tags: {
              create: tagIds.map(tagId => ({
                tag: { connect: { id: tagId } }
              }))
            }
          }
        });
        createdExpensesCount++;

      } else {
        // Prevent duplicate import by checking occurrence count on the day
        const existingOnDay = await prisma.income.findMany({
          where: {
            userId,
            amount: floatAmount,
            imported: true,
            date: { gte: startRange, lte: endRange }
          }
        });
        const matchingDbCount = existingOnDay.filter(i => cleanStr(i.description) === cleanTxDesc).length;

        if (matchingDbCount > occurrenceIndex) {
          continue;
        }

        // Resolve target account ID and bank name
        let finalAccountId = accountId || null;
        let finalBankName = bank || null;
        
        if (finalAccountId) {
          const acc = await prisma.account.findFirst({ where: { id: finalAccountId, userId } });
          if (acc) {
            finalBankName = acc.name;
          }
        } else if (finalBankName) {
          const acc = await prisma.account.findFirst({
            where: { name: finalBankName, userId }
          });
          if (acc) {
            finalAccountId = acc.id;
          }
        } else {
          const defaultBank = notes?.includes('Trade Republic') ? 'Trade Republic' : notes?.includes('CaixaBank') ? 'CaixaBank' : null;
          if (defaultBank) {
            finalBankName = defaultBank;
            const acc = await prisma.account.findFirst({
              where: {
                name: { contains: defaultBank, mode: 'insensitive' },
                userId
              }
            });
            if (acc) {
              finalAccountId = acc.id;
            }
          }
        }

        await prisma.income.create({
          data: {
            amount: floatAmount,
            date: txDate,
            description: description.trim(),
            categoryId: categoryId || null,
            userId,
            notes: notes || 'Importado de CSV',
            bank: finalBankName,
            accountId: finalAccountId,
            imported: true
          }
        });
        createdIncomesCount++;
      }
    }

    for (const item of monthsToUpdate.values()) {
      await updateMonthlySummary(userId, item.year, item.month);
    }

    res.json({
      message: 'Transacciones importadas correctamente',
      expensesCount: createdExpensesCount,
      incomesCount: createdIncomesCount,
      transfersCount: createdTransfersCount
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al importar transacciones' });
  }
}

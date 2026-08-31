import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getInvestments(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { status, bank, type, search } = req.query;

  const where: any = { userId };

  if (status) {
    where.status = status as string;
  }

  const accountId = req.query.accountId;
  if (accountId) {
    where.accountId = accountId as string;
  } else if (bank) {
    where.OR = [
      { accountId: bank as string },
      { bank: bank as string }
    ];
  }

  if (type) {
    where.type = type as string;
  }

  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { notes: { contains: search as string, mode: 'insensitive' } }
    ];
  }

  try {
    const investments = await prisma.investment.findMany({
      where,
      orderBy: { startDate: 'desc' },
    });
    res.json(investments);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener inversiones' });
  }
}

export async function createInvestment(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { type, name, ticker, isin, exchange, currency, bank, notes } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: 'Tipo y nombre son requeridos' });
  }

  try {
    const reqAccountId = req.body.accountId;
    let targetAccountId = null;
    let targetBankName = bank || 'Trade Republic';

    if (reqAccountId) {
      const acc = await prisma.account.findFirst({ where: { id: reqAccountId, userId } });
      if (!acc) return res.status(400).json({ error: 'La cuenta indicada no te pertenece.' });
      targetAccountId = acc.id;
      targetBankName = acc.name;
    } else if (bank) {
      const acc = await prisma.account.findFirst({ where: { OR: [{ id: bank }, { name: bank }], userId } });
      if (acc) {
        targetAccountId = acc.id;
        targetBankName = acc.name;
      }
    }

    const investment = await prisma.investment.create({
      data: {
        type,
        name,
        ticker: ticker?.trim().toUpperCase() || null,
        isin: isin?.trim().toUpperCase() || null,
        exchange: exchange?.trim() || null,
        currency: currency || 'EUR',
        amount: 0,
        buyFee: 0,
        bank: targetBankName,
        accountId: targetAccountId,
        startDate: new Date(),
        notes: notes || null,
        status: 'active',
        userId,
      }
    });

    res.status(201).json(investment);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear la inversión' });
  }
}

export async function updateInvestment(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;
  const { type, name, ticker, isin, exchange, currency, units, unitPrice, amount, buyFee, bank, startDate, status, withdrawnAmount, sellFee, endDate, notes } = req.body;

  try {
    const existing = await prisma.investment.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Inversión no encontrada' });
    }

    const reqAccountId = req.body.accountId;
    let targetAccountId = reqAccountId !== undefined ? reqAccountId : existing.accountId;
    let targetBankName = bank !== undefined ? bank : existing.bank;

    if (reqAccountId) {
      const acc = await prisma.account.findFirst({ where: { id: reqAccountId, userId } });
      if (!acc) return res.status(400).json({ error: 'La cuenta indicada no te pertenece.' });
      targetAccountId = acc.id;
      targetBankName = acc.name;
    } else if (bank) {
      const acc = await prisma.account.findFirst({ where: { OR: [{ id: bank }, { name: bank }], userId } });
      if (acc) {
        targetAccountId = acc.id;
        targetBankName = acc.name;
      }
    }

    const data: any = {};
    if (type !== undefined) data.type = type;
    if (name !== undefined) data.name = name;
    if (ticker !== undefined) data.ticker = ticker?.trim().toUpperCase() || null;
    if (isin !== undefined) data.isin = isin?.trim().toUpperCase() || null;
    if (exchange !== undefined) data.exchange = exchange?.trim() || null;
    if (currency !== undefined) data.currency = currency || 'EUR';
    if (units !== undefined) data.units = units !== null && units !== '' ? parseFloat(units) : null;
    if (unitPrice !== undefined) data.unitPrice = unitPrice !== null && unitPrice !== '' ? parseFloat(unitPrice) : null;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (buyFee !== undefined) data.buyFee = parseFloat(buyFee);
    if (bank !== undefined || reqAccountId !== undefined) {
      data.bank = targetBankName;
      data.accountId = targetAccountId;
    }
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    // Handle withdrawal fields
    if (status === 'withdrawn') {
      data.status = 'withdrawn';
      data.withdrawnAmount = withdrawnAmount !== undefined ? parseFloat(withdrawnAmount) : (existing.withdrawnAmount || 0);
      data.sellFee = sellFee !== undefined ? parseFloat(sellFee) : (existing.sellFee || 0);
      data.endDate = endDate ? new Date(endDate) : (existing.endDate || new Date());
    } else if (status === 'active') {
      data.status = 'active';
      data.withdrawnAmount = null;
      data.sellFee = null;
      data.endDate = null;
    } else {
      // Just normal update
      if (withdrawnAmount !== undefined) data.withdrawnAmount = withdrawnAmount !== null ? parseFloat(withdrawnAmount) : null;
      if (sellFee !== undefined) data.sellFee = sellFee !== null ? parseFloat(sellFee) : null;
      if (endDate !== undefined) data.endDate = endDate !== null ? new Date(endDate) : null;
    }

    const updated = await prisma.investment.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar la inversión' });
  }
}

export async function deleteInvestment(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { id } = req.params;

  try {
    const existing = await prisma.investment.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Inversión no encontrada' });
    }

    await prisma.investment.delete({
      where: { id }
    });

    res.json({ message: 'Inversión eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar la inversión' });
  }
}

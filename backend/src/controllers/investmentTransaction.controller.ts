import { Response } from 'express';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const allowedTypes = new Set(['PURCHASE', 'SAVEBACK', 'BONUS_SHARES', 'CASH_REWARD', 'DIVIDEND', 'SALE', 'TAX', 'FEE', 'ADJUSTMENT']);
const execFileAsync = promisify(execFile);

const parseOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTransactionPayload = (body: any) => {
  const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : '';
  const amount = parseOptionalNumber(body.amount);
  const fee = parseOptionalNumber(body.fee) ?? 0;
  const tax = parseOptionalNumber(body.tax) ?? 0;
  const units = parseOptionalNumber(body.units);
  const unitPrice = parseOptionalNumber(body.unitPrice);
  const date = body.date ? new Date(body.date) : null;

  if (!allowedTypes.has(type)) throw new Error('Tipo de movimiento no válido');
  if (amount === null || amount < 0) throw new Error('El importe debe ser un número válido');
  if (!date || Number.isNaN(date.getTime())) throw new Error('La fecha del movimiento no es válida');
  if (fee < 0 || tax < 0 || (units !== null && units < 0) || (unitPrice !== null && unitPrice < 0)) {
    throw new Error('Las unidades, el precio, las comisiones y los impuestos no pueden ser negativos');
  }
  if (type === 'CASH_REWARD' && units !== null && units > 0) {
    throw new Error('Una recompensa en efectivo no puede incluir acciones. Usa «Acciones bonificadas» para una recompensa entregada en participaciones.');
  }

  return { type, amount, fee, tax, units, unitPrice, date, notes: typeof body.notes === 'string' ? body.notes.trim() || null : null };
};

async function getOwnedInvestment(investmentId: string, userId: string) {
  return prisma.investment.findFirst({ where: { id: investmentId, userId }, select: { id: true } });
}

const toNumber = (value: string) => Number(value.replace(/\./g, '').replace(',', '.'));

const toIsoDate = (value: string) => {
  const [day, month, year] = value.split('.');
  return new Date(`${year}-${month}-${day}T12:00:00`).toISOString();
};

export async function importTradeRepublicPdf(req: AuthRequest, res: Response) {
  let temporaryPath: string | null = null;
  try {
    const investment = await prisma.investment.findFirst({ where: { id: req.params.id, userId: req.userId! }, select: { id: true, isin: true } });
    if (!investment) return res.status(404).json({ error: 'Inversión no encontrada' });

    const documentData = typeof req.body.documentData === 'string' ? req.body.documentData : '';
    const match = documentData.match(/^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'Selecciona un PDF válido' });

    const content = Buffer.from(match[1], 'base64');
    if (content.length === 0 || content.length > 15 * 1024 * 1024) return res.status(400).json({ error: 'El PDF debe tener un tamaño máximo de 15 MB' });

    temporaryPath = path.join(os.tmpdir(), `trade-republic-${randomUUID()}.pdf`);
    await fs.writeFile(temporaryPath, content);
    const { stdout } = await execFileAsync('pdftotext', ['-layout', temporaryPath, '-']);
    const text = stdout.replace(/\r/g, '');
    const operation = text.match(/Market-Order\s+(Comprar|Venta)[\s\S]*?\b(\d{2}\.\d{2}\.\d{4})\b/i);
    const position = text.match(/(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+EUR\s+(\d+[.,]\d+)\s+EUR/);
    const feeMatch = text.match(/Costes del servicio de ejecución de terceros\s+(-?\d+[.,]\d+)\s+EUR/i);
    const isinMatch = text.match(/ISIN:\s*([A-Z0-9]+)/i);

    const reward = text.match(/(?:Liquidaci[oó]n de recompensas|Perk Payout)/i);
    // Las recompensas incluyen un intervalo de fechas antes del importe, por eso
    // se toma el último valor monetario de la misma línea y no el primer texto tras el título.
    const rewardAmount = text.match(/(?:Recompensa|Reward)[^\n]*?(-?\d+[.,]\d+)\s+EUR/i);
    const rewardTax = text.match(/(?:Impuesto|Income Tax)[^\n]*?(-?\d+[.,]\d+)\s+EUR/i);

    if (reward && rewardAmount) {
      const tax = rewardTax ? Math.abs(toNumber(rewardTax[1])) : 0;
      const rewardDate = text.match(/\b(\d{2}\.\d{2}\.\d{4})\b/);
      return res.json({
        draft: {
          type: 'CASH_REWARD',
          date: rewardDate ? toIsoDate(rewardDate[1]) : new Date().toISOString(),
          amount: Math.abs(toNumber(rewardAmount[1])),
          units: null,
          unitPrice: null,
          fee: 0,
          tax,
          notes: 'Recompensa en efectivo de Trade Republic importada desde PDF',
        },
      });
    }

    if (!operation || !position) return res.status(422).json({ error: 'No se ha podido reconocer una compra, venta o recompensa de Trade Republic en este PDF' });
    if (investment.isin && isinMatch && investment.isin.toUpperCase() !== isinMatch[1].toUpperCase()) {
      return res.status(422).json({ error: 'El PDF corresponde a un activo distinto de la inversión seleccionada' });
    }

    const fee = feeMatch ? Math.abs(toNumber(feeMatch[1])) : 0;
    const isSale = operation[1].toLowerCase() === 'venta';
    const draft = {
      type: isSale ? 'SALE' : 'PURCHASE',
      date: toIsoDate(operation[2]),
      units: toNumber(position[1]),
      unitPrice: toNumber(position[2]),
      amount: toNumber(position[3]),
      fee,
      tax: 0,
      notes: 'Importado desde liquidación de valores de Trade Republic',
    };
    res.json({ draft });
  } catch (error: any) {
    res.status(422).json({ error: error.message || 'No se ha podido leer este PDF de Trade Republic' });
  } finally {
    if (temporaryPath) await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

export async function getActiveInvestmentTransactionSummaries(req: AuthRequest, res: Response) {
  try {
    const investments = await prisma.investment.findMany({
      where: { userId: req.userId!, status: 'active' },
      select: { id: true, transactions: { select: { type: true, amount: true, units: true, fee: true, tax: true } } },
    });

    const summaries = investments.map((investment) => {
      const transactions = investment.transactions;
      const grossContributed = transactions.filter((item) => item.type === 'PURCHASE').reduce((sum, item) => sum + item.amount, 0);
      const totalFees = transactions.reduce((sum, item) => sum + item.fee + (item.type === 'FEE' ? item.amount : 0), 0);
      const totalTaxes = transactions.reduce((sum, item) => sum + item.tax + (item.type === 'TAX' ? item.amount : 0), 0);
      const netCashRewards = transactions
        // Una recompensa que se entrega en participaciones ya está incluida en
        // currentUnits y, por tanto, en su valor de mercado. No se puede sumar
        // también como efectivo.
        .filter((item) => item.type === 'CASH_REWARD' && !item.units)
        .reduce((sum, item) => sum + item.amount - item.fee - item.tax, 0);
      const currentUnits = transactions.reduce((sum, item) => {
        if (!item.units) return sum;
        return item.type === 'SALE' ? sum - item.units : sum + item.units;
      }, 0);
      return { investmentId: investment.id, movementCount: transactions.length, grossContributed, totalFees, totalTaxes, netCashRewards, currentUnits };
    });

    res.json(summaries);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al calcular los resúmenes de movimientos' });
  }
}

export async function getInvestmentTransactions(req: AuthRequest, res: Response) {
  const investment = await getOwnedInvestment(req.params.id, req.userId!);
  if (!investment) return res.status(404).json({ error: 'Inversión no encontrada' });

  try {
    const transactions = await prisma.investmentTransaction.findMany({
      where: { investmentId: investment.id },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener los movimientos' });
  }
}

export async function createInvestmentTransaction(req: AuthRequest, res: Response) {
  try {
    const investment = await getOwnedInvestment(req.params.id, req.userId!);
    if (!investment) return res.status(404).json({ error: 'Inversión no encontrada' });

    const data = parseTransactionPayload(req.body);
    const transaction = await prisma.investmentTransaction.create({ data: { ...data, investmentId: investment.id } });
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al registrar el movimiento' });
  }
}

export async function updateInvestmentTransaction(req: AuthRequest, res: Response) {
  try {
    const investment = await getOwnedInvestment(req.params.id, req.userId!);
    if (!investment) return res.status(404).json({ error: 'Inversión no encontrada' });

    const existing = await prisma.investmentTransaction.findFirst({ where: { id: req.params.transactionId, investmentId: investment.id } });
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });

    const data = parseTransactionPayload(req.body);
    const transaction = await prisma.investmentTransaction.update({ where: { id: existing.id }, data });
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error al actualizar el movimiento' });
  }
}

export async function deleteInvestmentTransaction(req: AuthRequest, res: Response) {
  try {
    const investment = await getOwnedInvestment(req.params.id, req.userId!);
    if (!investment) return res.status(404).json({ error: 'Inversión no encontrada' });

    const existing = await prisma.investmentTransaction.findFirst({ where: { id: req.params.transactionId, investmentId: investment.id } });
    if (!existing) return res.status(404).json({ error: 'Movimiento no encontrado' });

    await prisma.investmentTransaction.delete({ where: { id: existing.id } });
    res.json({ message: 'Movimiento eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar el movimiento' });
  }
}

import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getMarketDataSymbolLimit, getResolvedMarketHistory, getResolvedMarketQuote, isMarketDataConfigured } from '../services/marketData.service';
import { buildMarketAnalysis } from '../services/marketAnalysis.service';

export async function getPortfolioMarketSummary(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const requestedInvestmentId = typeof req.query.investmentId === 'string' ? req.query.investmentId : undefined;

  try {
    const investments = await prisma.investment.findMany({
      where: { userId, status: 'active', ...(requestedInvestmentId ? { id: requestedInvestmentId } : {}) },
      select: {
        id: true,
        name: true,
        ticker: true,
        exchange: true,
        isin: true,
        currency: true,
        transactions: { select: { type: true, amount: true, units: true, fee: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const withTicker = investments.filter((investment) => Boolean(investment.ticker));
    const withoutTicker = investments
      .filter((investment) => !investment.ticker)
      .map((investment) => ({ id: investment.id, name: investment.name }));

    if (!isMarketDataConfigured()) {
      return res.json({
        configured: false,
        provider: 'EODHD',
        quotes: [],
        missingTicker: withoutTicker,
        skipped: [],
        unavailable: [],
      });
    }

    const requestedInvestments = withTicker.slice(0, getMarketDataSymbolLimit());
    const requestedInvestmentIds = new Set(requestedInvestments.map((investment) => investment.id));
    const results = await Promise.allSettled(
      requestedInvestments.map(async (investment) => ({
        investmentId: investment.id,
        resolved: await getResolvedMarketQuote({
          ticker: investment.ticker!,
          exchange: investment.exchange,
          isin: investment.isin,
          investmentCurrency: investment.currency,
        }),
      }))
    );

    const quoteByInvestmentId = new Map<string, Awaited<ReturnType<typeof getResolvedMarketQuote>>>();
    const unavailable: Array<{ ticker: string; message: string }> = [];
    results.forEach((result, index) => {
      const investment = requestedInvestments[index];
      if (result.status === 'fulfilled') {
        quoteByInvestmentId.set(result.value.investmentId, result.value.resolved);
      } else {
        unavailable.push({ ticker: investment.ticker!, message: result.reason instanceof Error ? result.reason.message : 'No se pudo obtener la cotización' });
      }
    });

    const skipped = withTicker
      .filter((investment) => !requestedInvestmentIds.has(investment.id))
      .map((investment) => ({ id: investment.id, name: investment.name, ticker: investment.ticker! }));

    const quotes = withTicker.flatMap((investment) => {
      const resolved = quoteByInvestmentId.get(investment.id);
      const units = investment.transactions.reduce((total, transaction) => {
        if (!transaction.units) return total;
        return transaction.type === 'SALE' ? total - transaction.units : total + transaction.units;
      }, 0);
      const costBasis = investment.transactions
        .filter((transaction) => transaction.type === 'PURCHASE')
        .reduce((total, transaction) => total + transaction.amount + transaction.fee, 0);
      return resolved ? [{ investmentId: investment.id, units, unitPrice: units > 0 ? costBasis / units : null, investmentCurrency: investment.currency, quote: resolved.quote, source: resolved.source }] : [];
    });

    res.json({
      configured: true,
      provider: 'EODHD',
      refreshedAt: new Date().toISOString(),
      quotes,
      missingTicker: withoutTicker,
      skipped,
      unavailable,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener el resumen de mercado' });
  }
}

export async function getInvestmentMarketAnalysis(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const investmentId = typeof req.query.investmentId === 'string' ? req.query.investmentId : '';
  if (!investmentId) return res.status(400).json({ error: 'Indica la inversión que quieres analizar' });

  try {
    const investment = await prisma.investment.findFirst({
      where: { id: investmentId, userId },
      select: { id: true, name: true, ticker: true, exchange: true, isin: true, currency: true },
    });
    if (!investment) return res.status(404).json({ error: 'Inversión no encontrada' });
    if (!investment.ticker) return res.status(400).json({ error: 'Añade un ticker antes de abrir el análisis' });
    if (!isMarketDataConfigured()) return res.json({ configured: false, provider: 'EODHD' });

    const resolved = await getResolvedMarketHistory({
      ticker: investment.ticker,
      exchange: investment.exchange,
      isin: investment.isin,
      investmentCurrency: investment.currency,
    });
    const analysis = buildMarketAnalysis(resolved.bars);
    return res.json({
      configured: true,
      provider: 'EODHD',
      symbol: resolved.source.symbol,
      exchange: resolved.source.exchange,
      currency: investment.currency,
      investmentCurrency: investment.currency,
      source: resolved.source,
      asOf: resolved.bars[resolved.bars.length - 1].date,
      refreshedAt: new Date().toISOString(),
      ...analysis,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al analizar el histórico del activo' });
  }
}

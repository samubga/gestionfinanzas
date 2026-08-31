import { MarketHistoryBar } from './marketData.service';

export type AnalysisTone = 'positive' | 'neutral' | 'caution';

export interface AnalysedMarketBar extends MarketHistoryBar {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
}

const round = (value: number | null, digits = 4) => value === null || !Number.isFinite(value)
  ? null
  : Number(value.toFixed(digits));

function rollingMean(values: number[], period: number): Array<number | null> {
  let sum = 0;
  return values.map((value, index) => {
    sum += value;
    if (index >= period) sum -= values[index - period];
    return index >= period - 1 ? sum / period : null;
  });
}

function exponentialMovingAverage(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = previous;
  for (let index = period; index < values.length; index += 1) {
    previous = ((values[index] - previous) * multiplier) + previous;
    result[index] = previous;
  }
  return result;
}

function calculateRsi(values: number[], period = 14): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return result;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }
  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] = averageLoss === 0 ? 100 : 100 - (100 / (1 + (averageGain / averageLoss)));
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
    averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
    result[index] = averageLoss === 0 ? 100 : 100 - (100 / (1 + (averageGain / averageLoss)));
  }
  return result;
}

function rollingStandardDeviation(values: number[], period: number): Array<number | null> {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    const slice = values.slice(index - period + 1, index + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / period;
    return Math.sqrt(slice.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / period);
  });
}

const periodReturn = (values: number[], sessions: number) => values.length <= sessions
  ? null
  : ((values[values.length - 1] / values[values.length - 1 - sessions]) - 1) * 100;

function calculateMonthlyReturns(bars: MarketHistoryBar[]) {
  const months = new Map<string, { month: string; label: string; close: number }>();
  bars.forEach((bar) => {
    const month = bar.date.slice(0, 7);
    months.set(month, {
      month,
      label: new Date(`${month}-15T00:00:00Z`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      close: bar.adjustedClose,
    });
  });
  const ordered = [...months.values()];
  return ordered.slice(Math.max(0, ordered.length - 13)).map((item, index, visible) => ({
    month: item.month,
    label: item.label.replace('.', ''),
    return: index === 0 ? null : round(((item.close / visible[index - 1].close) - 1) * 100, 2),
  })).slice(-12);
}

export function buildMarketAnalysis(bars: MarketHistoryBar[]) {
  const closes = bars.map((bar) => bar.adjustedClose);
  const sma20 = rollingMean(closes, 20);
  const sma50 = rollingMean(closes, 50);
  const sma200 = rollingMean(closes, 200);
  const std20 = rollingStandardDeviation(closes, 20);
  const rsi14 = calculateRsi(closes);
  const ema12 = exponentialMovingAverage(closes, 12);
  const ema26 = exponentialMovingAverage(closes, 26);
  const macd = closes.map((_, index) => ema12[index] === null || ema26[index] === null ? null : ema12[index]! - ema26[index]!);
  const firstMacdIndex = macd.findIndex((value) => value !== null);
  const compactMacd = firstMacdIndex >= 0 ? macd.slice(firstMacdIndex) as number[] : [];
  const compactSignal = exponentialMovingAverage(compactMacd, 9);
  const macdSignal = macd.map((_, index) => index < firstMacdIndex ? null : compactSignal[index - firstMacdIndex] ?? null);

  const points: AnalysedMarketBar[] = bars.map((bar, index) => ({
    ...bar,
    sma20: round(sma20[index]),
    sma50: round(sma50[index]),
    sma200: round(sma200[index]),
    bollingerUpper: round(sma20[index] === null || std20[index] === null ? null : sma20[index]! + (2 * std20[index]!)),
    bollingerLower: round(sma20[index] === null || std20[index] === null ? null : sma20[index]! - (2 * std20[index]!)),
    rsi14: round(rsi14[index], 2),
    macd: round(macd[index]),
    macdSignal: round(macdSignal[index]),
    macdHistogram: round(macd[index] === null || macdSignal[index] === null ? null : macd[index]! - macdSignal[index]!),
  }));

  const latest = points[points.length - 1];
  const recent20 = bars.slice(-20);
  const recent30Returns = closes.slice(-31).slice(1).map((value, index) => Math.log(value / closes.slice(-31)[index]));
  const meanReturn = recent30Returns.length ? recent30Returns.reduce((sum, value) => sum + value, 0) / recent30Returns.length : 0;
  const dailyVariance = recent30Returns.length > 1
    ? recent30Returns.reduce((sum, value) => sum + ((value - meanReturn) ** 2), 0) / (recent30Returns.length - 1)
    : 0;
  const volumes = recent20.map((bar) => bar.volume).filter((value): value is number => value !== null && value > 0);
  const averageVolume20 = volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : null;

  let peak = closes[0];
  let maxDrawdown = 0;
  closes.forEach((value) => {
    peak = Math.max(peak, value);
    maxDrawdown = Math.min(maxDrawdown, (value / peak) - 1);
  });

  const high52w = Math.max(...bars.map((bar) => bar.high));
  const low52w = Math.min(...bars.map((bar) => bar.low));
  const support20 = Math.min(...recent20.map((bar) => bar.low));
  const resistance20 = Math.max(...recent20.map((bar) => bar.high));

  const signals: Array<{ key: string; label: string; tone: AnalysisTone; summary: string }> = [];
  if (latest.sma20 !== null && latest.sma50 !== null) {
    if (latest.adjustedClose > latest.sma20 && latest.sma20 > latest.sma50) signals.push({ key: 'trend', label: 'Tendencia', tone: 'positive', summary: 'Precio sobre MM20 y MM20 sobre MM50: estructura ascendente.' });
    else if (latest.adjustedClose < latest.sma20 && latest.sma20 < latest.sma50) signals.push({ key: 'trend', label: 'Tendencia', tone: 'caution', summary: 'Precio bajo MM20 y MM20 bajo MM50: estructura descendente.' });
    else signals.push({ key: 'trend', label: 'Tendencia', tone: 'neutral', summary: 'Las medias no están alineadas: transición o rango lateral.' });
  }
  if (latest.rsi14 !== null) {
    if (latest.rsi14 < 30) signals.push({ key: 'rsi', label: 'RSI 14', tone: 'neutral', summary: 'Impulso muy débil; posible sobreventa, pendiente de confirmación.' });
    else if (latest.rsi14 > 70) signals.push({ key: 'rsi', label: 'RSI 14', tone: 'caution', summary: 'Impulso elevado; el precio puede estar extendido a corto plazo.' });
    else signals.push({ key: 'rsi', label: 'RSI 14', tone: 'positive', summary: 'Impulso en zona neutral, sin extremos de sobrecompra o sobreventa.' });
  }
  if (latest.macdHistogram !== null) {
    signals.push(latest.macdHistogram >= 0
      ? { key: 'macd', label: 'MACD', tone: 'positive', summary: 'MACD por encima de su señal: el impulso reciente acompaña.' }
      : { key: 'macd', label: 'MACD', tone: 'caution', summary: 'MACD por debajo de su señal: el impulso reciente se debilita.' });
  }
  if (latest.bollingerUpper !== null && latest.bollingerLower !== null) {
    const position = (latest.adjustedClose - latest.bollingerLower) / (latest.bollingerUpper - latest.bollingerLower || 1);
    if (position >= 0.9) signals.push({ key: 'range', label: 'Rango de precio', tone: 'caution', summary: 'Cotiza cerca de la banda superior: zona exigente a corto plazo.' });
    else if (position <= 0.1) signals.push({ key: 'range', label: 'Rango de precio', tone: 'neutral', summary: 'Cotiza cerca de la banda inferior: busca estabilización antes de actuar.' });
    else signals.push({ key: 'range', label: 'Rango de precio', tone: 'positive', summary: 'Precio dentro de su rango estadístico reciente, sin extensión clara.' });
  }

  const score = signals.reduce((sum, signal) => sum + (signal.tone === 'positive' ? 1 : signal.tone === 'caution' ? -1 : 0), 0);
  const context = score >= 2
    ? { tone: 'positive' as const, label: 'Contexto constructivo', summary: 'Tendencia e impulso muestran más confirmaciones que alertas.' }
    : score <= -2
      ? { tone: 'caution' as const, label: 'Contexto de prudencia', summary: 'Hay más señales de deterioro o extensión que confirmaciones.' }
      : { tone: 'neutral' as const, label: 'Contexto mixto', summary: 'Las señales no están alineadas; conviene esperar confirmación.' };

  return {
    points,
    metrics: {
      latestClose: round(latest.adjustedClose),
      sma20: latest.sma20,
      sma50: latest.sma50,
      sma200: latest.sma200,
      rsi14: latest.rsi14,
      macd: latest.macd,
      macdSignal: latest.macdSignal,
      macdHistogram: latest.macdHistogram,
      bollingerUpper: latest.bollingerUpper,
      bollingerLower: latest.bollingerLower,
      annualizedVolatility30: round(Math.sqrt(dailyVariance) * Math.sqrt(252) * 100, 2),
      maxDrawdown: round(maxDrawdown * 100, 2),
      high52w: round(high52w),
      low52w: round(low52w),
      distanceFromHigh52w: round(((latest.adjustedClose / high52w) - 1) * 100, 2),
      support20: round(support20),
      resistance20: round(resistance20),
      averageVolume20: round(averageVolume20, 0),
      volumeRatio: round(latest.volume !== null && averageVolume20 ? latest.volume / averageVolume20 : null, 2),
      performance: {
        week: round(periodReturn(closes, 5), 2),
        month: round(periodReturn(closes, 21), 2),
        threeMonths: round(periodReturn(closes, 63), 2),
        sixMonths: round(periodReturn(closes, 126), 2),
        // El proveedor puede devolver 250-252 sesiones para un año natural.
        // En ese caso comparamos el primer y último cierre disponibles.
        year: round(closes.length > 1 ? ((closes[closes.length - 1] / closes[0]) - 1) * 100 : null, 2),
      },
    },
    monthlyReturns: calculateMonthlyReturns(bars),
    signals,
    context,
  };
}

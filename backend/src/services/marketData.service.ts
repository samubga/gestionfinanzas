export interface MarketQuote {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string;
  timestamp: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  previousClose: number | null;
  change: number | null;
  percentChange: number | null;
  volume: number | null;
  marketOpen: boolean | null;
  sourceCurrency?: string;
  conversionRate?: number;
}

export interface MarketDataSource {
  symbol: string;
  exchange: string | null;
  currency: string;
  usedFallback: boolean;
  originalSymbol?: string;
}

export interface ResolvedMarketQuote {
  quote: MarketQuote;
  source: MarketDataSource;
}

export interface ResolvedMarketHistory {
  bars: MarketHistoryBar[];
  source: MarketDataSource;
}

interface QuoteCacheEntry {
  expiresAt: number;
  value: MarketQuote;
}

interface EodBar {
  date?: string;
  open?: number | string;
  high?: number | string;
  low?: number | string;
  close?: number | string;
  adjusted_close?: number | string;
  volume?: number | string;
}

export interface MarketHistoryBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number | null;
}

interface HistoryCacheEntry {
  expiresAt: number;
  value: MarketHistoryBar[];
}

interface SearchResult {
  Code?: string;
  Exchange?: string;
  Currency?: string;
  ISIN?: string | null;
  isPrimary?: boolean;
}

interface FallbackCacheEntry {
  expiresAt: number;
  value: MarketDataSource | null;
}

const quoteCache = new Map<string, QuoteCacheEntry>();
const historyCache = new Map<string, HistoryCacheEntry>();
const fxCache = new Map<string, { expiresAt: number; value: number }>();
const fallbackCache = new Map<string, FallbackCacheEntry>();

const toNumber = (value: number | string | undefined): number | null => {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normaliseExchange = (exchange?: string | null) => exchange?.trim().toUpperCase() || null;

const cacheKey = (symbol: string, exchange?: string | null) => `${symbol.toUpperCase()}:${normaliseExchange(exchange) || ''}`;

const asEodhdSymbol = (symbol: string, exchange?: string | null) => {
  const cleanSymbol = symbol.trim().toUpperCase();
  if (cleanSymbol.includes('.')) return cleanSymbol;

  const cleanExchange = normaliseExchange(exchange);
  if (!cleanExchange) throw new Error('Indica el mercado del ticker, por ejemplo XETRA');

  return `${cleanSymbol}.${cleanExchange}`;
};

const readEodResponse = async (response: globalThis.Response): Promise<EodBar[] | { message?: string }> => {
  const text = await response.text();
  try {
    return JSON.parse(text) as EodBar[] | { message?: string };
  } catch {
    return { message: text.trim() || `EODHD devolvió el estado ${response.status}` };
  }
};

const eodErrorMessage = (response: globalThis.Response, data: EodBar[] | { message?: string }) => {
  const message = Array.isArray(data) ? undefined : data.message;
  return message || `EODHD devolvió el estado ${response.status}`;
};

const isTickerNotFoundError = (error: unknown) => error instanceof Error && /ticker not found/i.test(error.message);

export const isMarketDataConfigured = () => Boolean(process.env.EODHD_API_KEY);

export const getMarketDataSymbolLimit = () => {
  const parsed = Number(process.env.MARKET_DATA_MAX_SYMBOLS || '8');
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 8;
};

export async function getMarketQuote(symbol: string, exchange?: string | null, currency = 'EUR'): Promise<MarketQuote> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('La clave de EODHD no está configurada');

  const key = `${cacheKey(symbol, exchange)}:${currency.toUpperCase()}`;
  const cached = quoteCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const eodhdSymbol = asEodhdSymbol(symbol, exchange);
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 10);
  const params = new URLSearchParams({
    api_token: apiKey,
    fmt: 'json',
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  });
  const response = await fetch(`https://eodhd.com/api/eod/${encodeURIComponent(eodhdSymbol)}?${params.toString()}`);
  const data = await readEodResponse(response);

  if (!response.ok || !Array.isArray(data)) {
    throw new Error(eodErrorMessage(response, data));
  }

  const validBars = data
    .map((bar) => ({ ...bar, closeValue: toNumber(bar.close) }))
    .filter((bar): bar is EodBar & { closeValue: number } => bar.closeValue !== null)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const latest = validBars[validBars.length - 1];
  const previous = validBars[validBars.length - 2];
  if (!latest) throw new Error('EODHD no devolvió un cierre válido para este activo');

  const previousClose = previous?.closeValue ?? null;
  const change = previousClose === null ? null : latest.closeValue - previousClose;
  const quote: MarketQuote = {
    symbol: eodhdSymbol,
    name: symbol.toUpperCase(),
    exchange: normaliseExchange(exchange),
    currency: currency.toUpperCase(),
    timestamp: latest.date ? Date.parse(`${latest.date}T00:00:00Z`) / 1000 : null,
    open: toNumber(latest.open),
    high: toNumber(latest.high),
    low: toNumber(latest.low),
    close: latest.closeValue,
    previousClose,
    change,
    percentChange: change === null || previousClose === null || previousClose === 0 ? null : (change / previousClose) * 100,
    volume: toNumber(latest.volume),
    marketOpen: null,
  };

  const cacheSeconds = Number(process.env.MARKET_DATA_CACHE_SECONDS || '3600');
  quoteCache.set(key, { value: quote, expiresAt: Date.now() + Math.max(cacheSeconds, 60) * 1000 });
  return quote;
}

export async function getMarketHistory(symbol: string, exchange?: string | null): Promise<MarketHistoryBar[]> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('La clave de EODHD no está configurada');

  const key = `history:${cacheKey(symbol, exchange)}`;
  const cached = historyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const eodhdSymbol = asEodhdSymbol(symbol, exchange);
  const to = new Date();
  const from = new Date(to);
  // 380 días naturales suelen cubrir algo más de 250 sesiones y permiten calcular
  // medias largas sin consumir otra llamada al proveedor.
  from.setDate(from.getDate() - 380);
  const params = new URLSearchParams({
    api_token: apiKey,
    fmt: 'json',
    period: 'd',
    order: 'a',
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  });
  const response = await fetch(`https://eodhd.com/api/eod/${encodeURIComponent(eodhdSymbol)}?${params.toString()}`);
  const data = await readEodResponse(response);

  if (!response.ok || !Array.isArray(data)) {
    throw new Error(eodErrorMessage(response, data));
  }

  const bars = data.flatMap((bar): MarketHistoryBar[] => {
    const open = toNumber(bar.open);
    const high = toNumber(bar.high);
    const low = toNumber(bar.low);
    const close = toNumber(bar.close);
    const adjustedClose = toNumber(bar.adjusted_close) ?? close;
    if (!bar.date || open === null || high === null || low === null || close === null || adjustedClose === null) return [];
    return [{
      date: bar.date,
      open,
      high,
      low,
      close,
      adjustedClose,
      volume: toNumber(bar.volume),
    }];
  }).sort((a, b) => a.date.localeCompare(b.date));

  if (bars.length < 2) throw new Error('EODHD no devolvió suficiente histórico para analizar este activo');

  const cacheSeconds = Number(process.env.MARKET_DATA_CACHE_SECONDS || '3600');
  historyCache.set(key, { value: bars, expiresAt: Date.now() + Math.max(cacheSeconds, 300) * 1000 });
  return bars;
}

async function getFallbackSource(isin: string | null | undefined, ticker: string, exchange: string | null, preferredCurrency: string): Promise<MarketDataSource | null> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey || !isin) return null;

  const originalSymbol = asEodhdSymbol(ticker, exchange);
  const cacheKeyValue = `${isin.toUpperCase()}:${originalSymbol}`;
  const cached = fallbackCache.get(cacheKeyValue);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const params = new URLSearchParams({ api_token: apiKey, fmt: 'json', limit: '20' });
  const response = await fetch(`https://eodhd.com/api/search/${encodeURIComponent(isin)}?${params.toString()}`);
  const text = await response.text();
  let candidates: SearchResult[] = [];
  try {
    const parsed = JSON.parse(text) as SearchResult[];
    candidates = Array.isArray(parsed) ? parsed : [];
  } catch {
    candidates = [];
  }

  const matchingIsin = candidates.filter((candidate) => candidate.Code && candidate.Exchange && candidate.ISIN?.toUpperCase() === isin.toUpperCase());
  const selected = matchingIsin.find((candidate) => candidate.isPrimary) || matchingIsin.find((candidate) => candidate.Currency?.toUpperCase() === preferredCurrency.toUpperCase()) || matchingIsin[0];
  const value = selected
    ? {
        symbol: asEodhdSymbol(selected.Code!, selected.Exchange!),
        exchange: normaliseExchange(selected.Exchange),
        currency: selected.Currency?.toUpperCase() || preferredCurrency.toUpperCase(),
        usedFallback: true,
        originalSymbol,
      }
    : null;
  fallbackCache.set(cacheKeyValue, { value, expiresAt: Date.now() + (12 * 60 * 60 * 1000) });
  return value;
}

async function getCurrencyRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1;
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) throw new Error('La clave de EODHD no está configurada');
  const pair = `${fromCurrency.toUpperCase()}${toCurrency.toUpperCase()}`;
  const cached = fxCache.get(pair);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const params = new URLSearchParams({ api_token: apiKey, fmt: 'json', order: 'd' });
  const response = await fetch(`https://eodhd.com/api/eod/${pair}.FOREX?${params.toString()}`);
  const data = await readEodResponse(response);
  if (!response.ok || !Array.isArray(data)) throw new Error(`No se pudo convertir ${fromCurrency} a ${toCurrency}: ${eodErrorMessage(response, data)}`);
  const rate = toNumber(data[0]?.close);
  if (rate === null || rate <= 0) throw new Error(`No se encontró un tipo de cambio válido para ${fromCurrency}/${toCurrency}`);
  fxCache.set(pair, { value: rate, expiresAt: Date.now() + (60 * 60 * 1000) });
  return rate;
}

const convertQuote = async (quote: MarketQuote, targetCurrency: string) => {
  if (quote.currency === targetCurrency.toUpperCase()) return quote;
  const rate = await getCurrencyRate(quote.currency, targetCurrency);
  const convert = (value: number | null) => value === null ? null : value * rate;
  return {
    ...quote,
    currency: targetCurrency.toUpperCase(),
    sourceCurrency: quote.currency,
    conversionRate: rate,
    open: convert(quote.open),
    high: convert(quote.high),
    low: convert(quote.low),
    close: quote.close * rate,
    previousClose: convert(quote.previousClose),
    change: convert(quote.change),
  };
};

const convertHistory = async (bars: MarketHistoryBar[], fromCurrency: string, targetCurrency: string): Promise<MarketHistoryBar[]> => {
  const sourceCurrency = fromCurrency.toUpperCase();
  const destinationCurrency = targetCurrency.toUpperCase();
  if (sourceCurrency === destinationCurrency) return bars;

  // Usamos el cierre de cada sesión del par de divisas, de modo que las velas,
  // retornos y niveles reflejen también la variación EUR/USD de ese día.
  const exchangeBars = await getMarketHistory(`${sourceCurrency}${destinationCurrency}.FOREX`);
  let exchangeIndex = 0;
  let latestRate: number | null = null;

  return bars.flatMap((bar): MarketHistoryBar[] => {
    while (exchangeIndex < exchangeBars.length && exchangeBars[exchangeIndex].date <= bar.date) {
      latestRate = exchangeBars[exchangeIndex].adjustedClose;
      exchangeIndex += 1;
    }
    if (latestRate === null || latestRate <= 0) return [];
    return [{
      ...bar,
      open: bar.open * latestRate,
      high: bar.high * latestRate,
      low: bar.low * latestRate,
      close: bar.close * latestRate,
      adjustedClose: bar.adjustedClose * latestRate,
    }];
  });
};

export async function getResolvedMarketQuote(input: { ticker: string; exchange: string | null; isin?: string | null; investmentCurrency: string }): Promise<ResolvedMarketQuote> {
  const original: MarketDataSource = {
    symbol: asEodhdSymbol(input.ticker, input.exchange),
    exchange: normaliseExchange(input.exchange),
    currency: input.investmentCurrency.toUpperCase(),
    usedFallback: false,
  };
  try {
    return { quote: await getMarketQuote(input.ticker, input.exchange, original.currency), source: original };
  } catch (error) {
    if (!isTickerNotFoundError(error)) throw error;
    const fallback = await getFallbackSource(input.isin, input.ticker, input.exchange, input.investmentCurrency);
    if (!fallback) throw error;
    const nativeQuote = await getMarketQuote(fallback.symbol, undefined, fallback.currency);
    return { quote: await convertQuote(nativeQuote, input.investmentCurrency), source: fallback };
  }
}

export async function getResolvedMarketHistory(input: { ticker: string; exchange: string | null; isin?: string | null; investmentCurrency: string }): Promise<ResolvedMarketHistory> {
  const original: MarketDataSource = {
    symbol: asEodhdSymbol(input.ticker, input.exchange),
    exchange: normaliseExchange(input.exchange),
    currency: input.investmentCurrency.toUpperCase(),
    usedFallback: false,
  };
  try {
    return { bars: await getMarketHistory(input.ticker, input.exchange), source: original };
  } catch (error) {
    if (!isTickerNotFoundError(error)) throw error;
    const fallback = await getFallbackSource(input.isin, input.ticker, input.exchange, input.investmentCurrency);
    if (!fallback) throw error;
    const nativeBars = await getMarketHistory(fallback.symbol);
    return {
      bars: await convertHistory(nativeBars, fallback.currency, input.investmentCurrency),
      source: fallback,
    };
  }
}

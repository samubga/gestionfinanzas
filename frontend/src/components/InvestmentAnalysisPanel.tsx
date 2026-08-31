import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, CircleHelp, Gauge, Info, RefreshCw, ShieldAlert, Target, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../services/api';

type AnalysisTone = 'positive' | 'neutral' | 'caution';
type TimeRange = '1M' | '3M' | '6M' | '1A';
type ChartMode = 'candles' | 'line';
type Oscillator = 'rsi' | 'macd';

interface AnalysisPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number | null;
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

interface MarketAnalysisResponse {
  configured: boolean;
  provider: string;
  symbol?: string;
  exchange?: string | null;
  currency?: string;
  investmentCurrency?: string;
  source?: {
    symbol: string;
    exchange: string | null;
    currency: string;
    usedFallback: boolean;
    originalSymbol?: string;
  };
  asOf?: string;
  refreshedAt?: string;
  points?: AnalysisPoint[];
  metrics?: {
    latestClose: number;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    bollingerUpper: number | null;
    bollingerLower: number | null;
    annualizedVolatility30: number | null;
    maxDrawdown: number | null;
    high52w: number;
    low52w: number;
    distanceFromHigh52w: number | null;
    support20: number;
    resistance20: number;
    averageVolume20: number | null;
    volumeRatio: number | null;
    performance: {
      week: number | null;
      month: number | null;
      threeMonths: number | null;
      sixMonths: number | null;
      year: number | null;
    };
  };
  monthlyReturns?: Array<{ month: string; label: string; return: number | null }>;
  signals?: Array<{ key: string; label: string; tone: AnalysisTone; summary: string }>;
  context?: { tone: AnalysisTone; label: string; summary: string };
}

const rangeSessions: Record<TimeRange, number> = { '1M': 22, '3M': 66, '6M': 132, '1A': 260 };

const toneStyles: Record<AnalysisTone, { card: string; badge: string; dot: string }> = {
  positive: {
    card: 'border-emerald-100 bg-emerald-50/65 dark:border-emerald-900/35 dark:bg-emerald-950/15',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  neutral: {
    card: 'border-amber-100 bg-amber-50/65 dark:border-amber-900/35 dark:bg-amber-950/15',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  caution: {
    card: 'border-rose-100 bg-rose-50/65 dark:border-rose-900/35 dark:bg-rose-950/15',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
};

const formatCompact = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const formatPercent = (value: number | null | undefined, digits = 1) => value === null || value === undefined
  ? '—'
  : `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;

const formatPrice = (value: number | null | undefined, currency: string) => {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 4 }).format(value);
  } catch {
    return `${value.toLocaleString('es-ES', { maximumFractionDigits: 4 })} ${currency}`;
  }
};

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const buildPath = (points: AnalysisPoint[], value: (point: AnalysisPoint) => number | null, x: (index: number) => number, y: (price: number) => number) => {
  let drawing = false;
  return points.map((point, index) => {
    const current = value(point);
    if (current === null) {
      drawing = false;
      return '';
    }
    const command = drawing ? 'L' : 'M';
    drawing = true;
    return `${command}${x(index).toFixed(2)},${y(current).toFixed(2)}`;
  }).join(' ');
};

const PriceChart: React.FC<{
  points: AnalysisPoint[];
  currency: string;
  mode: ChartMode;
  showSma20: boolean;
  showSma50: boolean;
  showBands: boolean;
}> = ({ points, currency, mode, showSma20, showSma50, showBands }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 1000;
  const height = 390;
  const left = 72;
  const right = 18;
  const priceTop = 20;
  const priceBottom = 278;
  const volumeTop = 304;
  const volumeBottom = 358;
  const plotWidth = width - left - right;
  const allPrices = points.flatMap((point) => [
    point.high,
    point.low,
    showSma20 ? point.sma20 : null,
    showSma50 ? point.sma50 : null,
    showBands ? point.bollingerUpper : null,
    showBands ? point.bollingerLower : null,
  ]).filter((value): value is number => value !== null);
  const minimum = Math.min(...allPrices);
  const maximum = Math.max(...allPrices);
  const padding = Math.max((maximum - minimum) * 0.08, maximum * 0.005);
  const minPrice = minimum - padding;
  const maxPrice = maximum + padding;
  const maxVolume = Math.max(...points.map((point) => point.volume || 0), 1);
  const x = (index: number) => left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const y = (price: number) => priceTop + ((maxPrice - price) / (maxPrice - minPrice || 1)) * (priceBottom - priceTop);
  const candleWidth = Math.max(1.2, Math.min(9, (plotWidth / Math.max(points.length, 1)) * 0.62));
  const activeIndex = hoveredIndex ?? points.length - 1;
  const active = points[activeIndex];
  const labelIndexes = [0, Math.round((points.length - 1) / 3), Math.round(((points.length - 1) * 2) / 3), points.length - 1];
  const closePath = buildPath(points, (point) => point.adjustedClose, x, y);
  const sma20Path = buildPath(points, (point) => point.sma20, x, y);
  const sma50Path = buildPath(points, (point) => point.sma50, x, y);
  const upperBandPath = buildPath(points, (point) => point.bollingerUpper, x, y);
  const lowerBandPath = buildPath(points, (point) => point.bollingerLower, x, y);

  const handlePointer = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((localX - left) / plotWidth) * (points.length - 1));
    setHoveredIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-3 text-[10px] dark:bg-slate-950/35 sm:grid-cols-6">
        <span className="col-span-2 font-bold text-slate-500 dark:text-slate-400 sm:col-span-1">{formatDate(active.date)}</span>
        <span className="text-slate-400">A <strong className="text-slate-700 dark:text-slate-200">{formatPrice(active.open, currency)}</strong></span>
        <span className="text-slate-400">MÁX <strong className="text-slate-700 dark:text-slate-200">{formatPrice(active.high, currency)}</strong></span>
        <span className="text-slate-400">MÍN <strong className="text-slate-700 dark:text-slate-200">{formatPrice(active.low, currency)}</strong></span>
        <span className="text-slate-400">C <strong className={active.close >= active.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>{formatPrice(active.close, currency)}</strong></span>
        <span className="text-slate-400">VOL <strong className="text-slate-700 dark:text-slate-200">{formatCompact(active.volume)}</strong></span>
      </div>
      <svg
        role="img"
        aria-label="Gráfico histórico de precio y volumen"
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-h-[260px] w-full touch-pan-y select-none"
        onMouseMove={handlePointer}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="priceAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.015" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const price = maxPrice - ((maxPrice - minPrice) * ratio);
          const yValue = priceTop + ((priceBottom - priceTop) * ratio);
          return <g key={ratio}><line x1={left} x2={width - right} y1={yValue} y2={yValue} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="3 5" /><text x={left - 10} y={yValue + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{price.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</text></g>;
        })}
        {showBands && <><path d={upperBandPath} fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.75" /><path d={lowerBandPath} fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.75" /></>}
        {mode === 'candles' ? points.map((point, index) => {
          const rising = point.close >= point.open;
          const color = rising ? '#10b981' : '#f43f5e';
          const bodyTop = y(Math.max(point.open, point.close));
          const bodyHeight = Math.max(1.5, Math.abs(y(point.open) - y(point.close)));
          return <g key={point.date}><line x1={x(index)} x2={x(index)} y1={y(point.high)} y2={y(point.low)} stroke={color} strokeWidth="1" /><rect x={x(index) - (candleWidth / 2)} y={bodyTop} width={candleWidth} height={bodyHeight} rx="0.6" fill={color} opacity={hoveredIndex === index ? 1 : 0.86} /></g>;
        }) : <><path d={`${closePath} L${x(points.length - 1)},${priceBottom} L${x(0)},${priceBottom} Z`} fill="url(#priceAreaGradient)" /><path d={closePath} fill="none" stroke="#6366f1" strokeWidth="2.4" /></>}
        {showSma20 && <path d={sma20Path} fill="none" stroke="#f59e0b" strokeWidth="2" />}
        {showSma50 && <path d={sma50Path} fill="none" stroke="#8b5cf6" strokeWidth="2" />}
        <line x1={left} x2={width - right} y1={volumeTop - 10} y2={volumeTop - 10} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
        {points.map((point, index) => {
          const barHeight = ((point.volume || 0) / maxVolume) * (volumeBottom - volumeTop);
          return <rect key={`volume-${point.date}`} x={x(index) - (candleWidth / 2)} y={volumeBottom - barHeight} width={Math.max(candleWidth, 1.5)} height={barHeight} fill={point.close >= point.open ? '#10b981' : '#f43f5e'} opacity="0.28" />;
        })}
        {hoveredIndex !== null && <><line x1={x(activeIndex)} x2={x(activeIndex)} y1={priceTop} y2={volumeBottom} stroke="#64748b" strokeWidth="1" strokeDasharray="3 4" /><circle cx={x(activeIndex)} cy={y(active.adjustedClose)} r="4" fill="#fff" stroke="#6366f1" strokeWidth="2" /></>}
        {labelIndexes.map((index) => <text key={`label-${index}`} x={x(index)} y={382} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} className="fill-slate-400 text-[10px]">{new Date(`${points[index].date}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</text>)}
      </svg>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; detail: string; help: string; icon: React.ReactNode; tone?: 'default' | 'good' | 'warning' }> = ({ label, value, detail, help, icon, tone = 'default' }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex items-center gap-0.5"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p><HelpTooltip label={label}>{help}</HelpTooltip></div><p className={`mt-1 text-lg font-black ${tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'warning' ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{value}</p></div>
      <span className="rounded-xl bg-slate-50 p-2 text-slate-400 dark:bg-slate-800/70">{icon}</span>
    </div>
    <p className="mt-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">{detail}</p>
  </div>
);

const HelpTooltip: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`Ayuda: ${label}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        onKeyDown={(event) => { if (event.key === 'Escape') setIsOpen(false); }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 focus:bg-slate-100 focus:text-brand-600 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800"
      >
        <CircleHelp size={13} />
      </button>
      {isOpen && <span role="tooltip" className="absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl bg-slate-800 px-3 py-2 text-left text-[10px] font-medium normal-case leading-relaxed text-white shadow-xl dark:bg-slate-700">{children}</span>}
    </span>
  );
};

export const InvestmentAnalysisPanel: React.FC<{ investmentId: string }> = ({ investmentId }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [range, setRange] = useState<TimeRange>('6M');
  const [chartMode, setChartMode] = useState<ChartMode>('candles');
  const [oscillator, setOscillator] = useState<Oscillator>('rsi');
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showBands, setShowBands] = useState(false);

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get<MarketAnalysisResponse>('/investments/market/analysis', { params: { investmentId } });
      setAnalysis(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'No se pudo preparar el análisis histórico.');
    } finally {
      setLoading(false);
    }
  }, [investmentId]);

  useEffect(() => {
    if (isExpanded && !analysis) void loadAnalysis();
  }, [analysis, isExpanded, loadAnalysis]);

  const visiblePoints = useMemo(() => {
    const points = analysis?.points || [];
    return points.slice(-Math.min(rangeSessions[range], points.length));
  }, [analysis?.points, range]);

  const panelHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><Activity size={17} className="text-brand-500" /><h4 className="text-sm font-black text-slate-800 dark:text-white">Análisis de mercado</h4><HelpTooltip label="Análisis de mercado">Resumen técnico basado en precios históricos. Sirve para estudiar tendencia, impulso y riesgo; no predice el futuro ni sustituye tu propio criterio.</HelpTooltip>{analysis?.symbol && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">{analysis.symbol}</span>}</div>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{isExpanded && analysis?.asOf ? `Tendencia, impulso y niveles hasta el ${formatDate(analysis.asOf)}.` : 'Despliega gráficos, señales y métricas solo cuando los necesites.'}</p>
      </div>
      <div className="flex items-center gap-2">
        {isExpanded && analysis && <button onClick={() => void loadAnalysis()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-500 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"><RefreshCw size={12} />Actualizar</button>}
        <button onClick={() => setIsExpanded((value) => !value)} aria-expanded={isExpanded} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-[10px] font-bold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-700">{isExpanded ? 'Ocultar análisis' : 'Ver análisis'}{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      </div>
    </div>
  );

  if (!isExpanded) return <section className="rounded-2xl border border-slate-100 bg-slate-50/45 p-4 dark:border-slate-800 dark:bg-slate-950/20 md:p-5">{panelHeader}</section>;
  if (loading) return <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/45 p-4 dark:border-slate-800 dark:bg-slate-950/20 md:p-5">{panelHeader}<div className="flex min-h-48 items-center justify-center gap-2 rounded-xl bg-white/70 text-xs text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><RefreshCw size={16} className="animate-spin text-brand-500" />Construyendo el análisis técnico…</div></section>;
  if (error) return <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/45 p-4 dark:border-slate-800 dark:bg-slate-950/20 md:p-5">{panelHeader}<div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300"><div className="flex items-start gap-2"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div><button onClick={() => void loadAnalysis()} className="mt-3 font-bold underline">Reintentar</button></div></section>;
  if (!analysis?.configured) return <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/45 p-4 dark:border-slate-800 dark:bg-slate-950/20 md:p-5">{panelHeader}<div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300"><CircleAlert size={15} className="mr-2 inline" />Configura EODHD para activar el histórico y los indicadores.</div></section>;
  if (!analysis.metrics || !analysis.context || !analysis.points || !analysis.signals || !analysis.monthlyReturns || visiblePoints.length === 0) return null;

  const { metrics, context } = analysis;
  const currency = analysis.currency || 'EUR';
  const rsiTone = metrics.rsi14 !== null && metrics.rsi14 > 70 ? 'warning' : metrics.rsi14 !== null && metrics.rsi14 >= 40 && metrics.rsi14 <= 60 ? 'good' : 'default';
  const trendPositive = metrics.sma20 !== null && metrics.sma50 !== null && metrics.latestClose > metrics.sma20 && metrics.sma20 > metrics.sma50;
  const performanceItems = [
    ['1 semana', metrics.performance.week],
    ['1 mes', metrics.performance.month],
    ['3 meses', metrics.performance.threeMonths],
    ['6 meses', metrics.performance.sixMonths],
    ['1 año', metrics.performance.year],
  ] as const;
  const priceRange = metrics.high52w - metrics.low52w;
  const positionInRange = priceRange > 0 ? ((metrics.latestClose - metrics.low52w) / priceRange) * 100 : 50;
  const positiveSignals = analysis.signals.filter((signal) => signal.tone === 'positive').length;
  const cautionSignals = analysis.signals.filter((signal) => signal.tone === 'caution').length;
  const checklist = [
    { label: 'Precio sobre la media de 20 sesiones', ok: metrics.sma20 !== null && metrics.latestClose > metrics.sma20 },
    { label: 'Media de 20 por encima de la de 50', ok: metrics.sma20 !== null && metrics.sma50 !== null && metrics.sma20 > metrics.sma50 },
    { label: 'RSI sin sobrecompra (>70)', ok: metrics.rsi14 !== null && metrics.rsi14 <= 70 },
    { label: 'MACD confirma impulso', ok: metrics.macdHistogram !== null && metrics.macdHistogram >= 0 },
  ];
  const oscillatorData = visiblePoints.filter((point) => oscillator === 'rsi' ? point.rsi14 !== null : point.macd !== null);

  return (
    <section className="space-y-5 rounded-2xl border border-slate-100 bg-slate-50/45 p-4 dark:border-slate-800 dark:bg-slate-950/20 md:p-5">
      {panelHeader}

      {analysis.source?.usedFallback && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-[10px] leading-relaxed text-sky-700 dark:border-sky-900/35 dark:bg-sky-950/20 dark:text-sky-300">
          <Info size={14} className="mt-0.5 shrink-0" />
          <span>El proveedor no ofrece histórico para <strong>{analysis.source.originalSymbol}</strong>. Este análisis usa la cotización principal <strong>{analysis.source.symbol}</strong> en {analysis.source.currency} y convierte cada sesión a {analysis.investmentCurrency || currency}.</span>
        </div>
      )}

      <div className={`rounded-2xl border p-4 ${toneStyles[context.tone].card}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${toneStyles[context.tone].dot}`} /><p className="text-sm font-black text-slate-800 dark:text-white">{context.label}</p><HelpTooltip label="Escenario de mercado">Combina varias señales. “Acompañan” cuenta las señales favorables y “Alertas” las que aconsejan cautela; ninguna decide una compra por sí sola.</HelpTooltip></div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{context.summary} No es una recomendación: úsalo para definir escenario, entrada y riesgo.</p>
          </div>
          <div className="flex gap-2 text-center">
            <div className="rounded-xl bg-white/80 px-4 py-2 dark:bg-slate-900/60"><p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{positiveSignals}</p><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Acompañan</p></div>
            <div className="rounded-xl bg-white/80 px-4 py-2 dark:bg-slate-900/60"><p className="text-lg font-black text-rose-500">{cautionSignals}</p><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Alertas</p></div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {analysis.signals.map((signal) => <div key={signal.key} className="rounded-xl bg-white/75 p-3 dark:bg-slate-900/55"><div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${toneStyles[signal.tone].dot}`} /><strong className="text-[10px] text-slate-700 dark:text-slate-200">{signal.label}</strong><HelpTooltip label={signal.label}>Esta señal se calcula con los últimos datos disponibles. Interprétala junto a las demás, no de forma aislada.</HelpTooltip></div><p className="mt-1 text-[9px] leading-relaxed text-slate-400 dark:text-slate-500">{signal.summary}</p></div>)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 md:p-4">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5"><div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">{(['1M', '3M', '6M', '1A'] as TimeRange[]).map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded-md px-3 py-1.5 text-[9px] font-bold transition-colors ${range === item ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>{item}</button>)}</div><HelpTooltip label="Periodo del gráfico">Elige cuánto histórico ver: 1 mes, 3 meses, 6 meses o 1 año. Un periodo largo da más contexto; uno corto muestra más detalle reciente.</HelpTooltip></div>
            <div className="flex items-center gap-0.5"><div className="flex rounded-lg border border-slate-100 p-0.5 dark:border-slate-800"><button onClick={() => setChartMode('candles')} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${chartMode === 'candles' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>Velas</button><button onClick={() => setChartMode('line')} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${chartMode === 'line' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>Cierre</button></div><HelpTooltip label="Tipo de gráfico">Las velas muestran apertura, máximo, mínimo y cierre de cada sesión. “Cierre” dibuja solo el precio final de cada día.</HelpTooltip></div>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-bold">
            <div className="flex items-center gap-0.5"><button onClick={() => setShowSma20((value) => !value)} className={`rounded-lg border px-2.5 py-1.5 ${showSma20 ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300' : 'border-slate-100 text-slate-400 dark:border-slate-800'}`}><span className="mr-1 inline-block h-0.5 w-3 bg-amber-500 align-middle" />MM20</button><HelpTooltip label="MM20">Media móvil de los últimos 20 cierres. Resume la tendencia de corto plazo, aproximadamente un mes de mercado.</HelpTooltip></div>
            <div className="flex items-center gap-0.5"><button onClick={() => setShowSma50((value) => !value)} className={`rounded-lg border px-2.5 py-1.5 ${showSma50 ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-300' : 'border-slate-100 text-slate-400 dark:border-slate-800'}`}><span className="mr-1 inline-block h-0.5 w-3 bg-violet-500 align-middle" />MM50</button><HelpTooltip label="MM50">Media móvil de los últimos 50 cierres. Muestra la dirección de medio plazo y filtra más ruido que la MM20.</HelpTooltip></div>
            <div className="flex items-center gap-0.5"><button onClick={() => setShowBands((value) => !value)} className={`rounded-lg border px-2.5 py-1.5 ${showBands ? 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200' : 'border-slate-100 text-slate-400 dark:border-slate-800'}`}>Bandas 20·2</button><HelpTooltip label="Bandas de Bollinger 20·2">Un rango alrededor de la MM20 que usa dos desviaciones estándar. Se estrecha con calma y se abre cuando aumenta la volatilidad.</HelpTooltip></div>
          </div>
        </div>
        <PriceChart points={visiblePoints} currency={currency} mode={chartMode} showSma20={showSma20} showSma50={showSma50} showBands={showBands} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Impulso · RSI 14" value={metrics.rsi14?.toFixed(1) || '—'} detail={metrics.rsi14 !== null && metrics.rsi14 > 70 ? 'Zona elevada: vigila una entrada perseguida.' : metrics.rsi14 !== null && metrics.rsi14 < 30 ? 'Zona deprimida: espera giro o estabilización.' : 'Zona intermedia: sin extremo claro.'} help="El RSI compara la fuerza de las subidas y bajadas de las últimas 14 sesiones. Sobre 70 puede indicar sobrecompra; bajo 30, sobreventa. No es una orden automática de compra o venta." icon={<Gauge size={16} />} tone={rsiTone} />
        <MetricCard label="Tendencia" value={trendPositive ? 'Ascendente' : metrics.sma20 !== null && metrics.latestClose < metrics.sma20 ? 'Débil' : 'En transición'} detail={`MM20 ${formatPrice(metrics.sma20, currency)} · MM50 ${formatPrice(metrics.sma50, currency)}`} help="Describe la relación entre el precio y sus medias móviles. Precio sobre MM20 y MM20 sobre MM50 suele ser una señal de tendencia ascendente; si no, la dirección es menos clara." icon={<TrendingUp size={16} />} tone={trendPositive ? 'good' : 'default'} />
        <MetricCard label="Volatilidad 30d" value={formatPercent(metrics.annualizedVolatility30)} detail="Volatilidad anualizada de los últimos 30 cierres; ayuda a ajustar el tamaño y el margen de riesgo." help="Mide cuánto ha oscilado el precio en las últimas 30 sesiones, expresado como una cifra anual. Cuanto mayor sea, mayores y más frecuentes han sido los cambios de precio." icon={<Activity size={16} />} />
        <MetricCard label="Máxima caída 1A" value={formatPercent(metrics.maxDrawdown)} detail="Peor retroceso desde un máximo dentro del histórico disponible." help="Es la peor pérdida porcentual desde un máximo previo durante el último año disponible. Ayuda a visualizar el riesgo histórico, aunque una caída futura puede ser mayor o menor." icon={<ShieldAlert size={16} />} tone={metrics.maxDrawdown !== null && metrics.maxDrawdown < -20 ? 'warning' : 'default'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between"><div><div className="flex items-center gap-0.5"><h5 className="text-xs font-extrabold text-slate-800 dark:text-white">Impulso bajo el precio</h5><HelpTooltip label="Impulso bajo el precio">Estos indicadores miden la velocidad y fuerza del movimiento, no el precio. Úsalos para confirmar una tendencia junto con las medias y los niveles.</HelpTooltip></div><p className="mt-0.5 text-[9px] text-slate-400">Confirma el movimiento; no lo uses de forma aislada.</p></div><div className="flex items-center gap-0.5"><div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800"><button onClick={() => setOscillator('rsi')} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${oscillator === 'rsi' ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-400'}`}>RSI</button><button onClick={() => setOscillator('macd')} className={`rounded-md px-2.5 py-1 text-[9px] font-bold ${oscillator === 'macd' ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-400'}`}>MACD</button></div><HelpTooltip label="RSI y MACD">RSI identifica zonas de impulso alto o bajo en una escala de 0 a 100. MACD compara dos medias móviles: el cruce de sus líneas y su histograma muestran cambios de impulso.</HelpTooltip></div></div>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              {oscillator === 'rsi' ? <ComposedChart data={oscillatorData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e2e8f0" opacity={0.55} /><XAxis dataKey="date" hide /><YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 9, fill: '#94a3b8' }} /><ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="4 4" /><ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 4" /><Line type="monotone" dataKey="rsi14" stroke="#6366f1" dot={false} strokeWidth={2} /><Tooltip labelFormatter={(label) => formatDate(String(label))} formatter={(value: number) => [value.toFixed(1), 'RSI 14']} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 10 }} /></ComposedChart> : <ComposedChart data={oscillatorData} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e2e8f0" opacity={0.55} /><XAxis dataKey="date" hide /><YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} /><ReferenceLine y={0} stroke="#94a3b8" /><Bar dataKey="macdHistogram" maxBarSize={5}>{oscillatorData.map((point) => <Cell key={point.date} fill={(point.macdHistogram || 0) >= 0 ? '#10b981' : '#f43f5e'} opacity={0.55} />)}</Bar><Line type="monotone" dataKey="macd" stroke="#6366f1" dot={false} strokeWidth={1.8} /><Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" dot={false} strokeWidth={1.5} /><Tooltip labelFormatter={(label) => formatDate(String(label))} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 10 }} /></ComposedChart>}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-0.5"><h5 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-white"><Target size={14} className="text-brand-500" />Mapa de niveles</h5><HelpTooltip label="Mapa de niveles">Sitúa el precio actual dentro de su rango de 52 semanas y marca los extremos de las últimas 20 sesiones. Son referencias técnicas, no precios garantizados.</HelpTooltip></div><p className="mt-0.5 text-[9px] text-slate-400">Referencias objetivas para plantear entrada, objetivo e invalidación.</p></div><span className="rounded-lg bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{formatPercent(metrics.distanceFromHigh52w)} desde máximo</span></div>
          <div className="mt-5 rounded-xl bg-slate-50/75 p-4 dark:bg-slate-950/30">
            <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Mín. 1A · {formatPrice(metrics.low52w, currency)}</span><span>Máx. 1A · {formatPrice(metrics.high52w, currency)}</span></div>
            <div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-rose-300"><span className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-800 shadow dark:border-slate-800 dark:bg-white" style={{ left: `${Math.max(1, Math.min(99, positionInRange))}%` }} /></div>
            <p className="mt-3 text-center text-[10px] text-slate-500 dark:text-slate-400">Precio actual <strong className="text-slate-800 dark:text-white">{formatPrice(metrics.latestClose, currency)}</strong></p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-100 bg-emerald-50/55 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/15"><p className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Soporte 20 sesiones</p><p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{formatPrice(metrics.support20, currency)}</p><p className="mt-1 text-[9px] text-slate-400">Zona inferior reciente, no un suelo garantizado.</p></div><div className="rounded-xl border border-rose-100 bg-rose-50/55 p-3 dark:border-rose-900/30 dark:bg-rose-950/15"><p className="text-[8px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Resistencia 20 sesiones</p><p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{formatPrice(metrics.resistance20, currency)}</p><p className="mt-1 text-[9px] text-slate-400">Zona superior reciente a vigilar.</p></div></div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-0.5"><h5 className="text-xs font-extrabold text-slate-800 dark:text-white">Rentabilidad por horizonte</h5><HelpTooltip label="Rentabilidad por horizonte">Muestra el cambio porcentual del precio en cada plazo. Se calcula desde el cierre ajustado del activo, por lo que no refleja tu rentabilidad personal ni comisiones o impuestos.</HelpTooltip></div><p className="mt-0.5 text-[9px] text-slate-400">Cambio del cierre ajustado entre sesiones; no incluye tu precio de compra.</p>
          <div className="mt-4 grid grid-cols-5 gap-2">{performanceItems.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 px-2 py-3 text-center dark:bg-slate-950/30"><p className={`text-sm font-black ${value === null ? 'text-slate-400' : value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{formatPercent(value)}</p><p className="mt-1 text-[8px] font-bold uppercase text-slate-400">{label}</p></div>)}</div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[9px] dark:border-slate-800"><span className="flex items-center text-slate-400">Volumen última sesión vs. media 20<HelpTooltip label="Volumen">Compara las acciones negociadas en la última sesión con su media de 20 días. Un valor de 1× es habitual; por encima de 1× hubo más actividad de lo normal.</HelpTooltip></span><strong className="text-slate-700 dark:text-slate-200">{metrics.volumeRatio === null ? '—' : `${metrics.volumeRatio.toFixed(2)}×`} <span className="font-normal text-slate-400">({formatCompact(metrics.averageVolume20)}/día)</span></strong></div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-0.5"><h5 className="text-xs font-extrabold text-slate-800 dark:text-white">Comparativa mensual</h5><HelpTooltip label="Comparativa mensual">Cada barra refleja la variación porcentual del cierre durante un mes. Las barras verdes son meses de subida y las rojas, de bajada.</HelpTooltip></div><p className="mt-0.5 text-[9px] text-slate-400">Permite distinguir una tendencia sostenida de un único movimiento puntual.</p>
          <div className="mt-3 h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.monthlyReturns.filter((item) => item.return !== null)} margin={{ top: 10, right: 2, left: -24, bottom: 0 }}><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e2e8f0" opacity={0.5} /><XAxis dataKey="label" interval={1} tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><ReferenceLine y={0} stroke="#94a3b8" /><Bar dataKey="return" radius={[3, 3, 0, 0]} maxBarSize={24}>{analysis.monthlyReturns.filter((item) => item.return !== null).map((item) => <Cell key={item.month} fill={(item.return || 0) >= 0 ? '#10b981' : '#f43f5e'} opacity={0.78} />)}</Bar><Tooltip formatter={(value: number) => [formatPercent(value, 2), 'Mes']} contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 10 }} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70"><div className="flex items-center gap-2"><CheckCircle2 size={15} className="text-brand-500" /><h5 className="text-xs font-extrabold text-slate-800 dark:text-white">Checklist antes de decidir</h5><HelpTooltip label="Checklist antes de decidir">Cada punto compara una señal con una condición sencilla. Verde significa que se cumple con los últimos datos; gris que no se cumple o no hay suficientes datos. No suma una recomendación automática.</HelpTooltip></div><p className="mt-1 text-[9px] text-slate-400">Cuantas más confirmaciones, más coherente es el escenario; ninguna elimina el riesgo.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{checklist.map((item) => <div key={item.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-semibold ${item.ok ? 'border-emerald-100 bg-emerald-50/55 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/15 dark:text-emerald-300' : 'border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/25 dark:text-slate-400'}`}><span className={`h-2 w-2 shrink-0 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />{item.label}</div>)}</div></div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900/30 dark:bg-brand-950/20"><div className="flex items-center gap-2"><Info size={15} className="text-brand-600 dark:text-brand-400" /><h5 className="text-xs font-extrabold text-brand-800 dark:text-brand-200">Cómo usarlo</h5><HelpTooltip label="Cómo usarlo">El orden importa: primero define el riesgo que aceptarías, después busca confirmaciones entre tendencia, impulso, volumen y niveles. El análisis técnico no elimina la incertidumbre.</HelpTooltip></div><p className="mt-2 text-[10px] leading-relaxed text-brand-700/80 dark:text-brand-300/75">Define primero cuánto puedes perder y dónde quedaría invalidada tu idea. Después comprueba tendencia, impulso y volumen. Una señal aislada —por ejemplo RSI bajo— no convierte un precio en una compra.</p></div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 text-[9px] leading-relaxed text-slate-400 dark:border-slate-800 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Datos diarios de {analysis.provider}. Cierres ajustados para retornos e indicadores; OHLC sin ajuste para las velas.</span><span className="inline-flex items-center gap-1"><BarChart3 size={11} />Uso informativo y educativo, no asesoramiento financiero.</span></div>
    </section>
  );
};

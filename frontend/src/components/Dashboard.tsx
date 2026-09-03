import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import AccountCardStack from './AccountCardStack';
import SmartInsightsCard from './SmartInsightsCard';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Edit2,
  Check,
  X,
  Sparkles,
  PieChart as PieChartIcon,
  Receipt,
  Activity,
  ArrowRight,
  Target,
  Landmark
} from 'lucide-react';

interface DashboardProps {
  setActiveTab?: (tab: string) => void;
}

interface PortfolioMarketSummary {
  configured: boolean;
  quotes: Array<{
    investmentId: string;
    units: number | null;
    unitPrice: number | null;
    quote: { close: number };
  }>;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const notification = useNotification();
  const { stats, statsLoading, saveSavingGoal, expenses, categories, accounts, investments, setFilterCategoryId, setSortField, setSortDirection } = useFinance();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [evolutionRange, setEvolutionRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [portfolioMarketSummary, setPortfolioMarketSummary] = useState<PortfolioMarketSummary | null>(null);

  const totalInvested = stats?.totalInvestedActive ?? (investments ? investments.filter(i => i.status === 'active').reduce((sum, i) => sum + i.amount, 0) : 0);

  useEffect(() => {
    let cancelled = false;

    const loadPortfolioMarketSummary = async () => {
      if (!investments.some(investment => investment.status === 'active')) {
        setPortfolioMarketSummary(null);
        return;
      }

      try {
        const response = await api.get<PortfolioMarketSummary>('/investments/market/summary');
        if (!cancelled) setPortfolioMarketSummary(response.data);
      } catch {
        if (!cancelled) setPortfolioMarketSummary(null);
      }
    };

    void loadPortfolioMarketSummary();
    return () => {
      cancelled = true;
    };
  }, [investments]);

  const evolution = stats?.evolution;

  const filteredEvolution = useMemo(() => {
    if (!evolution) return [];
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const validEvolution = evolution.filter(d => d.year < curY || (d.year === curY && d.month <= curM));
    if (evolutionRange === '3m') return validEvolution.slice(-3);
    if (evolutionRange === '6m') return validEvolution.slice(-6);
    if (evolutionRange === '1y') return validEvolution.slice(-12);
    return validEvolution;
  }, [evolution, evolutionRange]);

  const rangeLabel =
    evolutionRange === '3m' ? 'Últimos 3 meses de ingresos y gastos' :
    evolutionRange === '6m' ? 'Últimos 6 meses de ingresos y gastos' :
    evolutionRange === '1y' ? 'Último año de ingresos y gastos' :
    'Historial completo de ingresos y gastos';

  const dashboardYAxisTicks = useMemo(() => {
    if (!filteredEvolution || filteredEvolution.length === 0) return [0, 500, 1000, 1500, 2000, 2500, 3000];
    const maxVal = Math.max(
      ...filteredEvolution.map(d => Math.max(d.income || 0, d.expense || 0))
    );
    const limit = Math.max(3000, Math.ceil(maxVal / 500) * 500);
    const ticks = [];
    for (let i = 0; i <= limit; i += 500) {
      ticks.push(i);
    }
    return ticks;
  }, [filteredEvolution]);

  if (statsLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-100 dark:bg-slate-800/60 rounded-3xl" />
          <div className="h-80 bg-slate-100 dark:bg-slate-800/60 rounded-3xl" />
        </div>
      </div>
    );
  }

  const { currentMonth, availableBalance, categoryBreakdown } = stats;

  const totalIncome = currentMonth?.income || 0;
  const totalExpense = currentMonth?.expense || 0;
  const netSavings = currentMonth?.savings || (totalIncome - totalExpense);
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const healthScore = Math.min(100, Math.max(20, 50 + savingsRate));

  const totalAvailable = availableBalance !== undefined && availableBalance !== 0
    ? availableBalance
    : accounts.reduce((sum, a) => sum + (a.currentBalance ?? a.startingBalance ?? 0), 0);

  const goalAmount = currentMonth.savingGoal || 0;
  const goalProgress = goalAmount > 0 ? Math.min(100, Math.round((netSavings / goalAmount) * 100)) : 0;

  // Filter expenses if an account card is clicked
  const activeExpenses = selectedAccountId
    ? expenses.filter(e => {
        const accObj = accounts.find(a => a.id === selectedAccountId);
        return e.bank && accObj ? e.bank.toLowerCase().includes(accObj.name.toLowerCase()) : true;
      })
    : expenses;

  const activeInvestments = investments.filter(investment => investment.status === 'active');
  const withdrawnInvestments = investments.filter(investment => investment.status === 'withdrawn');
  const unrealizedResults = (portfolioMarketSummary?.quotes || []).flatMap(quote => {
    if (quote.units === null || quote.unitPrice === null || !Number.isFinite(quote.quote.close)) return [];
    return [(quote.quote.close - quote.unitPrice) * quote.units];
  });
  const activeProfit = unrealizedResults.reduce((sum, result) => sum + Math.max(0, result), 0);
  const activeLoss = unrealizedResults.reduce((sum, result) => sum + Math.min(0, result), 0);
  const hasMarketResults = portfolioMarketSummary?.configured === true && unrealizedResults.length > 0;

  // Sparkline data for hero card
  const sparkData = stats.evolution && stats.evolution.length > 0
    ? stats.evolution.map(e => ({ label: e.label, val: e.income - e.expense }))
    : [
        { label: '1', val: totalIncome * 0.5 },
        { label: '2', val: totalIncome * 0.7 },
        { label: '3', val: totalIncome * 0.8 },
        { label: '4', val: totalIncome * 0.9 },
        { label: '5', val: totalIncome }
      ];

  const handleSaveGoal = async () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val >= 0) {
      try {
        await saveSavingGoal(val);
        setEditingGoal(false);
      } catch {
        // FinanceContext muestra el error en el aviso global.
      }
    } else {
      notification.error('Introduce un objetivo de ahorro válido.');
    }
  };

  const startEditGoal = () => {
    setGoalInput(goalAmount.toString());
    setEditingGoal(true);
  };

  const handleNav = (tab: string, options?: { categoryId?: string; sortByAmount?: boolean }) => {
    if (options?.categoryId !== undefined) {
      setFilterCategoryId(options.categoryId);
    }
    if (options?.sortByAmount) {
      setFilterCategoryId('');
      setSortField('amount');
      setSortDirection('desc');
    }
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 pb-28 lg:pb-8 max-w-7xl mx-auto">

      {/* ROW 1: HERO BENTO GRID (CAPITAL DISPONIBLE, CUENTAS, TOP GASTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        
        {/* HERO CARD: Capital Total Disponible */}
        <div className="lg:col-span-2 bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-brand-500/15 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />

          <div className="relative z-10 flex items-center justify-between mb-6">
            <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white border border-white/20 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-200" /> Capital Total Disponible
            </span>

            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <Activity size={13} className="text-emerald-300 animate-pulse" />
              <span className="text-[10px] font-bold text-white/90">Salud: {healthScore}/100</span>
            </div>
          </div>

          <div className="relative z-10 my-2">
            <span className="text-xs text-white/70 font-bold uppercase tracking-wider block mb-1">Disponible Acumulado</span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-3xl md:text-5xl font-black font-mono tracking-tight text-white">
                {totalAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </h2>
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                netSavings >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}>
                {netSavings >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {savingsRate}% ahorro
              </span>
            </div>
          </div>

          {/* Sparkline chart */}
          <div className="mt-4 relative z-10">
            <div className="flex items-center justify-between text-[10px] text-white/70 font-bold uppercase tracking-wider mb-1">
              <span>Histórico del Ahorro Neto Mensual</span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/90 text-white text-[11px] px-2.5 py-1 rounded-lg border border-white/20 backdrop-blur-md shadow-lg">
                            <span className="text-white/70 font-medium block">{data.label}</span>
                            <span className="font-bold font-mono text-emerald-300">
                              {data.val >= 0 ? '+' : ''}{data.val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="val" stroke="#ffffff" strokeWidth={2.5} fillOpacity={1} fill="url(#heroGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hero Footer Stats */}
          <div className="pt-4 mt-2 border-t border-white/10 grid grid-cols-3 gap-2 md:gap-4 relative z-10 text-xs">
            <div>
              <span className="text-white/60 font-bold text-[10px] uppercase block">Ingresos Mes</span>
              <span className="text-emerald-300 font-black font-mono text-xs md:text-base">+{totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
            </div>
            <div>
              <span className="text-white/60 font-bold text-[10px] uppercase block">Gastos Mes</span>
              <span className="text-red-300 font-black font-mono text-xs md:text-base">-{totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
            </div>
            <div>
              <span className="text-white/60 font-bold text-[10px] uppercase block">Inversiones</span>
              <span className="text-indigo-200 font-black font-mono text-xs md:text-base">{totalInvested.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
            </div>
          </div>
        </div>

        {/* ACCOUNTS STACK CARD */}
        <div className="lg:col-span-1">
          <AccountCardStack
            onSelectAccount={(accId) => setSelectedAccountId(accId)}
            onOpenAddAccount={() => handleNav('accounts')}
          />
        </div>

        {/* GASTOS DEL MES POR CATEGORÍA */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 dark:bg-brand-950/40 text-brand-500 rounded-xl border border-brand-100 dark:border-brand-800/40">
                  <PieChartIcon size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Gastos del mes</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Por categoría</span>
            </div>

            <div className="space-y-3 my-2 max-h-[185px] overflow-y-auto pr-1 scrollbar-thin">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">Sin gastos registrados este período.</p>
              ) : (
                categoryBreakdown.map(cat => {
                  const percent = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-700 dark:text-slate-200">{cat.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-white">{cat.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-bold flex items-center justify-between">
            <span>{categoryBreakdown.length} con gastos este mes</span>
            <button onClick={() => handleNav('stats')} className="text-brand-500 hover:underline flex items-center gap-0.5 cursor-pointer">
              Ver análisis <ArrowRight size={12} />
            </button>
          </div>
        </div>

      </div>

      {/* ROW 2: SAVINGS & GOAL PROGRESS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ahorro del Mes Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ahorro del Mes</span>
            <h3 className="text-3xl font-black font-mono text-slate-800 dark:text-white">
              {netSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              Tasa de ahorro: <strong className="text-brand-500">{savingsRate}%</strong>
            </span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-200/50 dark:border-amber-800/40 flex items-center justify-center shrink-0">
            <PiggyBank size={28} />
          </div>
        </div>

        {/* Objetivo de Ahorro del Mes Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-brand-500" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Objetivo de Ahorro del Mes</h4>
            </div>

            {/* Editable goal pill */}
            {editingGoal ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  className="w-24 px-2 py-1 text-xs border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-white font-mono font-bold"
                  placeholder="Ej: 800"
                  autoFocus
                />
                <button onClick={handleSaveGoal} className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingGoal(false)} className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditGoal}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-500 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700 transition"
              >
                <span>{goalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                <Edit2 size={12} />
              </button>
            )}
          </div>

          {/* Goal progress bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span>Ahorrado: {netSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              <span>Meta: {goalAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ({goalProgress}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* ROW 3: CHARTS ROW (EVOLUCIÓN HISTÓRICA + GASTOS POR CATEGORÍA DONUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Evolución Histórica Chart (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución Histórica</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{rangeLabel}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomEnabled(!zoomEnabled)}
                className={`px-2.5 py-1.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                  zoomEnabled
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-500 border-brand-200 dark:border-brand-800/40 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800/60 hover:text-slate-600'
                }`}
                title="Ajustar escala vertical para magnificar fluctuaciones (zoom)"
              >
                🔍 {zoomEnabled ? "Ajuste Activo" : "Auto Escala"}
              </button>

              <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {([
                  { id: '3m', label: '3 M' },
                  { id: '6m', label: '6 M' },
                  { id: '1y', label: '1 A' },
                  { id: 'all', label: 'Hist.' }
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setEvolutionRange(opt.id)}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                      evolutionRange === opt.id
                        ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-sm border border-slate-100 dark:border-slate-800/40'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredEvolution} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/40" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  ticks={zoomEnabled ? undefined : dashboardYAxisTicks}
                  tickFormatter={(val) => `${val} €`}
                  domain={zoomEnabled ? ['auto', 'auto'] : [0, 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2.5} name="Ingresos" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2.5} name="Gastos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Smart Insights Card (Right 1 col, next to Evolución Histórica) */}
        <SmartInsightsCard stats={stats} onNavigate={handleNav} />

      </div>

      {/* ROW 4: ÚLTIMOS MOVIMIENTOS & RESUMEN DE INVERSIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Últimos Movimientos Feed (Span 3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-brand-50 dark:bg-brand-950/40 text-brand-500 rounded-2xl border border-brand-100 dark:border-brand-800/40">
                <Receipt size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white leading-tight">Últimos Movimientos</h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {selectedAccountId ? 'Filtrado por cuenta seleccionada' : 'Todas las transacciones recientes'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleNav('transactions')}
              className="text-xs font-bold text-brand-500 hover:underline cursor-pointer flex items-center gap-1 bg-brand-50 dark:bg-brand-950/40 px-3.5 py-1.5 rounded-full border border-brand-100 dark:border-brand-800/40"
            >
              Ver Transacciones <ArrowRight size={12} />
            </button>
          </div>

          {/* Transactions Pills List */}
          <div className="space-y-2.5">
            {activeExpenses.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400 font-semibold">No hay movimientos registrados para este filtro.</p>
              </div>
            ) : (
              activeExpenses.slice(0, 5).map(exp => {
                const catObj = categories.find(c => c.id === exp.categoryId);
                return (
                  <div
                    key={exp.id}
                    onClick={() => handleNav('transactions')}
                    className="flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl hover:border-brand-500/30 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm shrink-0"
                        style={{ backgroundColor: catObj?.color ? `${catObj.color}20` : '#6366F120', color: catObj?.color || '#6366F1' }}
                      >
                        <Receipt size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-white group-hover:text-brand-500 transition-colors">
                          {exp.description || catObj?.name || 'Gasto'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                          <span>{exp.date ? new Date(exp.date).toLocaleDateString('es-ES') : 'Reciente'}</span>
                          {exp.bank && (
                            <>
                              <span>•</span>
                              <span>{exp.bank}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black font-mono text-red-500 dark:text-red-400">
                        -{exp.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resumen de Inversiones (Right 1 col, next to Últimos Movimientos) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/35 text-violet-600 dark:text-violet-400 rounded-2xl border border-violet-100 dark:border-violet-800/40">
                <Landmark size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Inversiones</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Resumen de tu cartera activa</p>
              </div>
            </div>

            {activeInvestments.length > 0 ? (
              <>
                <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-brand-700 p-4 text-white shadow-lg shadow-violet-500/15">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Capital activo invertido</p>
                  <p className="mt-1 text-2xl font-black font-mono tracking-tight">
                    {totalInvested.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-[10px] font-semibold text-white/80">
                    <span>{activeInvestments.length} {activeInvestments.length === 1 ? 'activa' : 'activas'}</span>
                    <span className="text-right">{withdrawnInvestments.length} {withdrawnInvestments.length === 1 ? 'retirada' : 'retiradas'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/25">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600/80 dark:text-emerald-400/80">En beneficio</p>
                    <p className="mt-1 text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {hasMarketResults ? `+${activeProfit.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-2.5 dark:bg-rose-950/25">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-rose-600/80 dark:text-rose-400/80">En pérdidas</p>
                    <p className="mt-1 text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                      {hasMarketResults ? `${activeLoss.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Inversiones activas</p>
                  <div className="max-h-[132px] space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
                    {activeInvestments.map(investment => (
                      <button
                        key={investment.id}
                        onClick={() => handleNav('investments')}
                        className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 px-2.5 py-2 text-left transition hover:bg-violet-50 dark:bg-slate-950/50 dark:hover:bg-violet-950/20"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-bold text-slate-700 dark:text-slate-200">{investment.name}</span>
                          <span className="block truncate text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                            {investment.ticker || investment.type}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] font-black font-mono text-slate-600 dark:text-slate-300">
                          {investment.amount.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                        </span>
                      </button>
                    ))}
                  </div>
                  {!hasMarketResults && (
                    <p className="mt-2 text-[9px] font-medium leading-relaxed text-slate-400 dark:text-slate-500">
                      Añade tickers y configura el mercado para ver el beneficio y la pérdida actuales.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-5 text-center dark:border-violet-900/70 dark:bg-violet-950/20">
                <Landmark size={24} className="mx-auto mb-2 text-violet-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Aún no hay inversiones activas.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => handleNav('investments')}
            className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-brand-500 transition hover:text-brand-600 dark:border-slate-800"
          >
            Ver inversiones <ArrowRight size={14} />
          </button>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;

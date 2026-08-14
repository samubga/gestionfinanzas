import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import AccountCardStack from './AccountCardStack';
import SmartInsightsCard from './SmartInsightsCard';
import {
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieChartIcon,
  Receipt,
  Activity,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface BentoDashboardProps {
  setActiveTab?: (tab: string) => void;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({ setActiveTab }) => {
  const { stats, expenses, categories, accounts, investments, setFilterCategoryId, setSortField, setSortDirection } = useFinance();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const totalInvested = stats?.totalInvestedActive ?? (investments ? investments.filter(i => i.status === 'active').reduce((sum, i) => sum + i.amount, 0) : 0);

  // Filter expenses if an account card is clicked
  const activeExpenses = selectedAccountId
    ? expenses.filter(e => {
        const accObj = accounts.find(a => a.id === selectedAccountId);
        return e.bank && accObj ? e.bank.toLowerCase().includes(accObj.name.toLowerCase()) : true;
      })
    : expenses;

  // Calculate metrics
  const totalIncome = stats?.currentMonth?.income || 0;
  const totalExpense = stats?.currentMonth?.expense || 0;
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
  const healthScore = Math.min(100, Math.max(20, 50 + savingsRate));

  // Available Net Worth balance
  const availableBalance = stats?.availableBalance !== undefined && stats.availableBalance !== 0
    ? stats.availableBalance
    : accounts.reduce((acc, a) => acc + (a.currentBalance ?? a.startingBalance ?? 0), 0);

  // Top spending categories
  const categoryTotals: Record<string, number> = {};
  activeExpenses.forEach(exp => {
    categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + exp.amount;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([catId, amt]) => {
      const catObj = categories.find(c => c.id === catId);
      return {
        id: catId,
        name: catObj?.name || 'Varios',
        color: catObj?.color || '#6366F1',
        amount: amt
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  // Sparkline data for net worth evolution
  const sparkData = stats?.evolution && stats.evolution.length > 0
    ? stats.evolution.map(e => ({ label: e.label, val: e.income - e.expense }))
    : [
        { label: '1', val: totalIncome * 0.5 },
        { label: '2', val: totalIncome * 0.7 },
        { label: '3', val: totalIncome * 0.8 },
        { label: '4', val: totalIncome * 0.9 },
        { label: '5', val: totalIncome }
      ];

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
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto px-4">
      
      {/* Bento Asymmetric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
        
        {/* 1. HERO TILE: Total Net Worth & Financial Pulse (Span 2 cols on lg) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-brand-600 via-brand-700 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl shadow-brand-500/15 relative overflow-hidden flex flex-col justify-between group">
          {/* Decorative ambient blurred orb */}
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />

          <div className="relative z-10 flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-widest text-white border border-white/20 flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-200" /> Capital Total Disponible
              </span>
            </div>

            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <Activity size={13} className="text-emerald-300 animate-pulse" />
              <span className="text-[10px] font-bold text-white/90">Salud: {healthScore}/100</span>
            </div>
          </div>

          <div className="relative z-10 my-2">
            <span className="text-xs text-white/70 font-bold uppercase tracking-wider block mb-1">Disponible Acumulado</span>
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl md:text-5xl font-black font-mono tracking-tight text-white">
                {availableBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </h2>
              <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                netSavings >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
              }`}>
                {netSavings >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {savingsRate}% ahorro
              </span>
            </div>
          </div>

          {/* Sparkline mini chart */}
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

        {/* 2. ACCOUNTS STACK TILE (Span 1 col on lg) */}
        <div className="lg:col-span-1">
          <AccountCardStack
            onSelectAccount={(accId) => setSelectedAccountId(accId)}
            onOpenAddAccount={() => handleNav('accounts')}
          />
        </div>

        {/* 3. CATEGORIES BREAKDOWN TILE (Span 1 col on lg) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 dark:bg-brand-950/40 text-brand-500 rounded-xl border border-brand-100 dark:border-brand-800/40">
                  <PieChartIcon size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Top Gastos</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Por Categoría</span>
            </div>

            <div className="space-y-3 my-2">
              {sortedCategories.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">Sin gastos registrados este período.</p>
              ) : (
                sortedCategories.map(cat => {
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
            <span>{categories.length} Categorías totales</span>
            <button onClick={() => handleNav('transactions', { sortByAmount: true })} className="text-brand-500 hover:underline flex items-center gap-0.5 cursor-pointer">
              Detalles <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* 4. RECENT ACTIVITY FEED TILE (Span 3 cols on lg) */}
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
              className="text-xs font-bold text-brand-500 hover:underline cursor-pointer flex items-center gap-1 bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 rounded-full border border-brand-100 dark:border-brand-800/40"
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

        {/* 5. SMART INSIGHT & PREDICTIVE CARD (Span 1 col on lg) */}
        <SmartInsightsCard stats={stats} onNavigate={handleNav} />

      </div>
    </div>
  );
};

export default BentoDashboard;

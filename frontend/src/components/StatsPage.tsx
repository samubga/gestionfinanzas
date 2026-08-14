import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, CartesianGrid 
} from 'recharts';
import { 
  Calendar, CalendarDays, Award, Sparkles, Tag, Folder, 
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
  BarChart2, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight,
  TrendingUp as NetWorthIcon, Layers
} from 'lucide-react';
import api from '../services/api';

export const StatsPage: React.FC = () => {
  const { 
    stats, 
    statsLoading, 
    yearlyStats, 
    yearlyStatsLoading, 
    historicalStats, 
    historicalStatsLoading,
    year, 
    month, 
    setPeriod,
    fetchYearlyStats,
    fetchHistoricalStats,
    refreshAll,
    expenses,
    incomes,
    categories
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'historical' | 'categories'>('monthly');
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Generar lista de años desde 2017 hasta el año siguiente al actual, en orden descendente
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from(
    { length: (currentYear + 1) - 2017 + 1 },
    (_, i) => (currentYear + 1) - i
  );
  
  // Category history states
  const [catData, setCatData] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // Load category history when selected category changes
  useEffect(() => {
    const expenseCategories = categories.filter(c => c.type === 'expense');
    if (expenseCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(expenseCategories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    
    const fetchCategoryHistory = async () => {
      setCatLoading(true);
      try {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const startDateStr = twelveMonthsAgo.toISOString().split('T')[0];
        
        const res = await api.get('/expenses', {
          params: {
            startDate: startDateStr,
            categoryId: selectedCategoryId
          }
        });
        
        const categoryExpenses = res.data;
        const history = [];
        let tempDate = new Date(twelveMonthsAgo);
        
        while (tempDate <= now) {
          const y = tempDate.getFullYear();
          const m = tempDate.getMonth();
          const label = tempDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
          
          const monthExpenses = categoryExpenses.filter((exp: any) => {
            const expDate = new Date(exp.date);
            return expDate.getFullYear() === y && expDate.getMonth() === m;
          });
          
          const amount = monthExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
          
          history.push({
            year: y,
            month: m + 1,
            label,
            amount: parseFloat(amount.toFixed(2))
          });
          
          tempDate.setMonth(tempDate.getMonth() + 1);
        }
        
        setCatData(history);
      } catch (err) {
        console.error('Error al obtener historial de categoría:', err);
      } finally {
        setCatLoading(false);
      }
    };
    
    fetchCategoryHistory();
  }, [selectedCategoryId]);

  // Load yearly data if Anual tab is selected
  useEffect(() => {
    if (activeTab === 'yearly') {
      fetchYearlyStats(selectedYear);
    }
  }, [activeTab, selectedYear]);

  // Load historical data if Histórico tab is selected
  useEffect(() => {
    if (activeTab === 'historical') {
      fetchHistoricalStats();
    }
  }, [activeTab]);

  // Re-sync local selectedYear with context year
  useEffect(() => {
    setSelectedYear(year);
  }, [year]);

  if (statsLoading && !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6 max-w-7xl mx-auto">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  // Monthly Calculations
  const currentIncome = stats?.currentMonth?.income || 0;
  const currentExpense = stats?.currentMonth?.expense || 0;
  const currentSavings = stats?.currentMonth?.savings || 0;
  const monthlySavingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;

  // Compute monthly daily data timezone-safely
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dayStr = `${dayNum.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
    const dateQueryStr = `${year}-${month.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
    
    const dayExpense = expenses
      .filter(exp => exp.date.startsWith(dateQueryStr))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const dayIncome = incomes
      .filter(inc => inc.date.startsWith(dateQueryStr))
      .reduce((sum, inc) => sum + inc.amount, 0);

    return {
      day: dayNum,
      label: dayStr,
      Gastos: parseFloat(dayExpense.toFixed(2)),
      Ingresos: parseFloat(dayIncome.toFixed(2)),
    };
  });

  const categoryBreakdown = stats?.categoryBreakdown || [];
  const tagBreakdown = stats?.tagBreakdown || [];
  const topExpenses = stats?.topExpenses || [];

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-md text-xs">
          <p className="font-bold text-slate-300 mb-1.5">{label}</p>
          <div className="space-y-1">
            {payload.map((p: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                  {p.name}:
                </span>
                <span className="font-black text-white">{p.value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="text-brand-500" />
            Análisis e Informes
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Métricas avanzadas, rendimiento y evolución financiera</p>
        </div>

        <button 
          onClick={refreshAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-slate-600 dark:text-slate-300 self-start md:self-auto"
        >
          <RefreshCw size={14} className={statsLoading ? "animate-spin text-brand-500" : ""} />
          Actualizar datos
        </button>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto scrollbar-none gap-2">
        {(['monthly', 'yearly', 'historical', 'categories'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === 'monthly' ? 'Mensual' : tab === 'yearly' ? 'Anual' : tab === 'historical' ? 'Histórico' : 'Categorías';
          const Icon = tab === 'monthly' ? Calendar : tab === 'yearly' ? BarChart2 : tab === 'historical' ? TrendingUp : Folder;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap -mb-px ${
                isActive 
                  ? 'border-brand-500 text-brand-500 dark:text-brand-400 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}
      
      {/* 1. MONTHLY VIEW */}
      {activeTab === 'monthly' && stats && (
        <div className="space-y-6">
          
          {/* MONTHLY FILTERS */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Período:</span>
            
            <select
              value={month}
              onChange={(e) => setPeriod(year, parseInt(e.target.value))}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(year, i).toLocaleDateString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setPeriod(parseInt(e.target.value), month)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* MONTHLY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Daily Avg */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gasto Medio Diario</span>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">
                  {stats.averages.dailyAverage.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">Consumo diario ponderado</p>
              </div>
              <div className="p-3 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-2xl shrink-0">
                <CalendarDays size={20} />
              </div>
            </div>

            {/* Savings Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tasa de Ahorro</span>
                <h3 className={`text-xl font-black flex items-center gap-1 ${monthlySavingsRate >= 10 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {monthlySavingsRate.toFixed(1)}%
                  {monthlySavingsRate >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">De los ingresos totales mensuales</p>
              </div>
              <div className={`p-3 rounded-2xl shrink-0 ${monthlySavingsRate >= 10 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'}`}>
                {monthlySavingsRate >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              </div>
            </div>

            {/* Prediction */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Predicción Fin de Mes</span>
                <h3 className="text-xl font-black text-brand-600 dark:text-brand-400">
                  {stats.averages.prediction.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">Basado en tendencias</p>
              </div>
              <div className="p-3 bg-gradient-to-tr from-brand-500 to-purple-600 text-white rounded-2xl shrink-0 shadow-md shadow-brand-500/10">
                <Sparkles size={20} className="animate-pulse" />
              </div>
            </div>

            {/* Net Month Income vs Expenses */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5 flex-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Balance de Flujos</span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Ingresos:</span>
                  <span className="font-extrabold text-emerald-500">+{currentIncome.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Gastos:</span>
                  <span className="font-extrabold text-rose-500">-{currentExpense.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl shrink-0 ml-4">
                <DollarSign size={20} />
              </div>
            </div>

          </div>

          {/* MONTHLY CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Daily Evolution Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución Diaria de Gastos e Ingresos</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Historial diario del mes actual</p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="Gastos" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" />
                    <Area type="monotone" dataKey="Ingresos" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <PieIcon size={16} className="text-brand-500" />
                  Distribución por Categorías
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Reparto porcentual de egresos este mes</p>
              </div>

              {categoryBreakdown.length > 0 ? (
                <>
                  <div className="h-48 my-4 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="amount"
                        >
                          {categoryBreakdown.map((cat, idx) => (
                            <Cell key={idx} fill={cat.color || '#6366F1'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value.toFixed(2)} €`, 'Gastado']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Gastado</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white">
                        {currentExpense.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
                    {categoryBreakdown.slice(0, 5).map((cat) => {
                      const percentage = (cat.amount / Math.max(1, currentExpense)) * 100;
                      return (
                        <div key={cat.id} className="flex justify-between items-center text-[10px] font-bold">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </span>
                          <span className="text-slate-800 dark:text-slate-300">
                            {cat.amount.toFixed(0)} € ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-2xl mb-2">🍽️</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay transacciones este mes.</p>
                </div>
              )}
            </div>

          </div>

          {/* LOWER SECTION: TAGS & TOP EXPENSES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tag Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Tag size={16} className="text-brand-500" />
                  Gastos por Etiquetas
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Etiquetas más consumidas ordenadas de mayor a menor</p>
              </div>

              {tagBreakdown.length > 0 ? (
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                  {tagBreakdown.map((tag) => {
                    const percentage = (tag.amount / Math.max(1, currentExpense)) * 100;
                    return (
                      <div key={tag.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>#{tag.name}</span>
                          <span>{tag.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-500 h-full rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-2xl mb-2">🏷️</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay etiquetas registrada.</p>
                </div>
              )}
            </div>

            {/* Top 10 Expenses */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Award size={16} className="text-brand-500" />
                  Top 10 Gastos más Elevados
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Lista detallada de las transacciones de mayor importe del mes</p>
              </div>

              {topExpenses.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[280px] overflow-y-auto pr-1">
                  {topExpenses.map((exp, idx) => (
                    <div key={exp.id} className="flex items-center justify-between py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-slate-400 w-5 text-center">{idx + 1}</span>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: exp.category.color }} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500">
                            {new Date(exp.date).toLocaleDateString('es-ES')} • {exp.category.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-rose-500">-{exp.amount.toFixed(2)} €</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-12 text-center">No hay gastos registrados este mes.</p>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 2. YEARLY VIEW */}
      {activeTab === 'yearly' && (
        <div className="space-y-6">
          
          {/* YEARLY FILTERS */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">Selecciona el año:</span>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {yearlyStatsLoading && !yearlyStats ? (
            <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-bold">
              Cargando estadísticas anuales...
            </div>
          ) : yearlyStats ? (
            <div className="space-y-6">
              
              {/* YEARLY KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Total Income */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ingresos Anuales</span>
                  <h3 className="text-xl font-black text-emerald-500 mt-2">
                    +{yearlyStats.summary.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Total de flujos de entrada en {selectedYear}</p>
                </div>

                {/* Total Expense */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gastos Anuales</span>
                  <h3 className="text-xl font-black text-rose-500 mt-2">
                    -{yearlyStats.summary.totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Total de flujos de salida en {selectedYear}</p>
                </div>

                {/* Net Savings */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ahorro Neto Anual</span>
                  <h3 className={`text-xl font-black mt-2 ${yearlyStats.summary.totalSavings >= 0 ? 'text-brand-500' : 'text-rose-500'}`}>
                    {yearlyStats.summary.totalSavings.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Diferencia neta positiva/negativa</p>
                </div>

                {/* Avg Savings */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ahorro Medio Mensual</span>
                  <h3 className="text-xl font-black text-amber-500 mt-2">
                    {yearlyStats.summary.averageMonthlySavings.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Promedio mensual del año</p>
                </div>

              </div>

              {/* YEARLY CHARTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Income vs Expenses Bar Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Comparativa Mensual de Ingresos y Gastos</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Visualización agregada mes a mes</p>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyStats.monthlyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Bar dataKey="income" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Savings Rate Line Chart */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Tasa de Ahorro Mensual (%)</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Porcentaje de ingresos guardados por mes</p>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={yearlyStats.monthlyBreakdown.map(m => ({
                          label: m.label,
                          'Tasa Ahorro': m.income > 0 ? parseFloat(((m.savings / m.income) * 100).toFixed(1)) : 0
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Tasa Ahorro']} />
                        <Line type="monotone" dataKey="Tasa Ahorro" stroke="#6366F1" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Desglose de Categorías Anuales */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layers size={16} className="text-brand-500" />
                    Distribución de Gastos Anuales por Categoría
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Consumo acumulado en todo el año {selectedYear}</p>
                </div>

                {yearlyStats.categoryBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* List */}
                    <div className="space-y-4 lg:col-span-2 max-h-[300px] overflow-y-auto pr-1">
                      {yearlyStats.categoryBreakdown.map((cat) => {
                        const percentage = (cat.amount / Math.max(1, yearlyStats.summary.totalExpense)) * 100;
                        return (
                          <div key={cat.id} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                {cat.name}
                              </span>
                              <span>{cat.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € ({percentage.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Donut Chart */}
                    <div className="h-60 relative flex flex-col items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={yearlyStats.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="amount"
                          >
                            {yearlyStats.categoryBreakdown.map((cat, idx) => (
                              <Cell key={idx} fill={cat.color || '#6366F1'} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value.toFixed(2)} €`, 'Total Anual']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Gasto Anual</span>
                        <span className="text-sm font-black text-slate-800 dark:text-white">
                          {yearlyStats.summary.totalExpense.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-6 text-center">No hay gastos en el año {selectedYear}.</p>
                )}
              </div>

            </div>
          ) : (
            <div className="flex justify-center py-12 text-slate-400 text-xs italic">
              No hay datos disponibles para el año {selectedYear}
            </div>
          )}

        </div>
      )}

      {/* 3. HISTORICAL VIEW */}
      {activeTab === 'historical' && (
        <div className="space-y-6">
          
          {historicalStatsLoading && !historicalStats ? (
            <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-bold">
              Procesando saldos históricos y patrimonio neto...
            </div>
          ) : historicalStats ? (
            <div className="space-y-6">
              
              {/* HISTORICAL KPI CARD */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Last Net Worth */}
                <div className="bg-gradient-to-br from-brand-500 to-purple-600 border-none rounded-2xl p-5 text-white shadow-md relative overflow-hidden md:col-span-2">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                    <NetWorthIcon size={120} />
                  </div>
                  <div className="relative space-y-3">
                    <span className="text-[10px] font-bold text-brand-100 uppercase tracking-wider block">Patrimonio Neto de Cierre (Actual)</span>
                    <h2 className="text-3xl font-black">
                      {historicalStats.history[historicalStats.history.length - 1]?.netWorth.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </h2>
                    <div className="flex gap-4 text-xs font-semibold text-brand-100">
                      <span>Cuentas/Cash: {historicalStats.history[historicalStats.history.length - 1]?.cash.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                      <span>Inversiones: {historicalStats.history[historicalStats.history.length - 1]?.invested.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                    </div>
                  </div>
                </div>

                {/* Total Range Months */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Historial Registrado</span>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">
                      {historicalStats.history.length} Meses
                    </h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500">Muestras procesadas totales</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl shrink-0">
                    <CalendarDays size={20} />
                  </div>
                </div>

              </div>

              {/* NET WORTH TIMELINE AREA CHART */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución Histórica de Activos y Patrimonio Neto (Net Worth)</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Cuentas líquidas acumuladas sumadas a las Inversiones activas</p>
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalStats.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02}/>
                        </linearGradient>
                        <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      <Area type="monotone" dataKey="cash" stackId="1" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorCash)" name="Dinero Cuentas / Efectivo" />
                      <Area type="monotone" dataKey="invested" stackId="1" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorInvested)" name="Inversiones Activas" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* COMPARATIVA ANUAL (Cierre Patrimonio Neto) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Cierre de Patrimonio Neto por Año</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Comparativa del patrimonio acumulado al final de cada año</p>
                </div>
                
                {historicalStats.history.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={historicalStats.history.filter((h, idx, arr) => {
                          const isLastMonth = h.month === 12;
                          const isLastInArray = idx === arr.length - 1;
                          const nextItemIsNewYear = idx < arr.length - 1 && arr[idx + 1].year !== h.year;
                          return isLastMonth || isLastInArray || nextItemIsNewYear;
                        })}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                        <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip formatter={(value: number) => [`${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 'Patrimonio Neto']} />
                        <Bar dataKey="netWorth" name="Patrimonio de Cierre" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6">No hay datos históricos suficientes.</p>
                )}
              </div>

            </div>
          ) : (
            <div className="flex justify-center py-12 text-slate-400 text-xs italic">
              No hay datos históricos disponibles
            </div>
          )}

        </div>
      )}

      {/* 4. DEEP-DIVE CATEGORY VIEW */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          
          {/* CATEGORY SELECTOR */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1 font-sans">Selecciona la Categoría:</span>
            
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {categories.filter(c => c.type === 'expense').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {catLoading ? (
            <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400 font-bold">
              Cargando historial de categoría...
            </div>
          ) : selectedCategoryId && catData.length > 0 ? (
            <div className="space-y-6">
              
              {/* CATEGORY KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Max Spent Month */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gasto Máximo Mensual</span>
                  <h3 className="text-xl font-black text-rose-500 mt-2">
                    {Math.max(...catData.map(c => c.amount)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Mes récord de consumo en últimos 12 meses</p>
                </div>

                {/* Avg Monthly Spent */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Promedio Mensual</span>
                  <h3 className="text-xl font-black text-brand-500 mt-2">
                    {(catData.reduce((sum, c) => sum + c.amount, 0) / catData.length).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Consumo regular estimado</p>
                </div>

                {/* Total Cumulative */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Acumulado</span>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mt-2">
                    {catData.reduce((sum, c) => sum + c.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Suma consumida en los últimos 12 meses</p>
                </div>

              </div>

              {/* 12-MONTH CATEGORY TREND CHART */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución de Gasto Mensual (Últimos 12 meses)</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Tendencia mensual de consumo para la categoría seleccionada</p>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(2)} €`, 'Consumo']} />
                      <Bar 
                        dataKey="amount" 
                        name="Gasto" 
                        fill={categories.find(c => c.id === selectedCategoryId)?.color || '#6366F1'} 
                        radius={[5, 5, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs italic gap-1">
              <AlertCircle size={20} className="text-slate-300" />
              Selecciona una categoría para iniciar el análisis
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default StatsPage;

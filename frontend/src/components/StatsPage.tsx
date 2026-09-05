import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, 
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, CartesianGrid 
} from 'recharts';
import { 
  Calendar, CalendarDays, Award, Tag, Folder,
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
  BarChart2, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight,
  TrendingUp as NetWorthIcon, Layers, X, ZoomIn, ZoomOut
} from 'lucide-react';
import api from '../services/api';
import ChartViewport from './ChartViewport';
import CategoryIcon from './CategoryIcon';
import { useTheme } from '../context/ThemeContext';
import SearchableSingleSelect, { SearchableSingleSelectOption } from './SearchableSingleSelect';

type CategoryViewMode = 'days' | 'weeks' | 'months' | 'years';

const CATEGORY_ZOOM_ORDER: CategoryViewMode[] = ['years', 'months', 'weeks', 'days'];
const CATEGORY_VIEW_OPTIONS: Array<{ id: CategoryViewMode; label: string; shortLabel: string; periodLabel: string; chartTitle: string }> = [
  { id: 'days', label: 'Días · último mes', shortLabel: 'Días', periodLabel: 'diario', chartTitle: 'Gasto diario del último mes' },
  { id: 'weeks', label: 'Semanas · 3 meses', shortLabel: 'Semanas', periodLabel: 'semanal', chartTitle: 'Gasto semanal de los últimos 3 meses' },
  { id: 'months', label: 'Meses · 12 meses', shortLabel: '12 meses', periodLabel: 'mensual', chartTitle: 'Gasto mensual de los últimos 12 meses' },
  { id: 'years', label: 'Años · histórico', shortLabel: 'Histórico', periodLabel: 'anual', chartTitle: 'Gasto anual de todo el histórico' },
];

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const startOfWeek = (date: Date) => {
  const result = startOfLocalDay(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
};

const buildCategorySeries = (categoryExpenses: any[], mode: CategoryViewMode) => {
  const now = startOfLocalDay(new Date());
  const buckets = new Map<string, { label: string; amount: number; sortDate: number }>();
  let rangeStart: Date;

  if (mode === 'days') {
    rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 29);
    for (let date = new Date(rangeStart); date <= now; date.setDate(date.getDate() + 1)) {
      buckets.set(dateKey(date), {
        label: date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        amount: 0,
        sortDate: date.getTime(),
      });
    }
  } else if (mode === 'weeks') {
    const currentWeek = startOfWeek(now);
    rangeStart = new Date(currentWeek);
    rangeStart.setDate(rangeStart.getDate() - (12 * 7));
    for (let date = new Date(rangeStart); date <= currentWeek; date.setDate(date.getDate() + 7)) {
      buckets.set(dateKey(date), {
        label: `Sem. ${date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`,
        amount: 0,
        sortDate: date.getTime(),
      });
    }
  } else if (mode === 'months') {
    rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    for (let date = new Date(rangeStart); date <= now; date.setMonth(date.getMonth() + 1)) {
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      buckets.set(key, {
        label: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        amount: 0,
        sortDate: date.getTime(),
      });
    }
  } else {
    const validDates = categoryExpenses
      .map(expense => new Date(expense.date))
      .filter(date => !Number.isNaN(date.getTime()));
    const firstYear = validDates.length > 0 ? Math.min(...validDates.map(date => date.getFullYear())) : now.getFullYear();
    rangeStart = new Date(firstYear, 0, 1);
    for (let year = firstYear; year <= now.getFullYear(); year += 1) {
      buckets.set(String(year), { label: String(year), amount: 0, sortDate: new Date(year, 0, 1).getTime() });
    }
  }

  categoryExpenses.forEach(expense => {
    const expenseDate = new Date(expense.date);
    if (Number.isNaN(expenseDate.getTime()) || expenseDate < rangeStart || expenseDate > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)) return;
    const bucketDate = mode === 'weeks' ? startOfWeek(expenseDate) : expenseDate;
    const key = mode === 'days'
      ? dateKey(bucketDate)
      : mode === 'weeks'
        ? dateKey(bucketDate)
        : mode === 'months'
          ? `${bucketDate.getFullYear()}-${bucketDate.getMonth() + 1}`
          : String(bucketDate.getFullYear());
    const bucket = buckets.get(key);
    if (bucket) bucket.amount += Number(expense.amount) || 0;
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.sortDate - b.sortDate)
    .map(bucket => ({ ...bucket, amount: Number(bucket.amount.toFixed(2)) }));
};

export const StatsPage: React.FC = () => {
  const { dark } = useTheme();
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
    categories
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'historical' | 'categories'>('monthly');
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedExpenseDate, setSelectedExpenseDate] = useState<string | null>(null);

  // Generar lista de años desde 2017 hasta el año siguiente al actual, en orden descendente
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from(
    { length: (currentYear + 1) - 2017 + 1 },
    (_, i) => (currentYear + 1) - i
  );
  
  // Category history states
  const [categoryHistoryExpenses, setCategoryHistoryExpenses] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [categoryViewMode, setCategoryViewMode] = useState<CategoryViewMode>('months');
  const expenseCategoryOptions: Array<SearchableSingleSelectOption<string>> = categories
    .filter(category => category.type === 'expense')
    .map(category => ({
      value: category.id,
      label: category.name,
      keywords: category.name,
      leading: <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} aria-hidden="true" />,
    }));

  // Load category history when selected category changes
  useEffect(() => {
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const selectedCategoryStillExists = expenseCategories.some(category => category.id === selectedCategoryId);
    if (expenseCategories.length > 0 && !selectedCategoryStillExists) {
      setSelectedCategoryId(expenseCategories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    
    const fetchCategoryHistory = async () => {
      setCatLoading(true);
      setCategoryHistoryExpenses([]);
      try {
        const res = await api.get('/expenses', {
          params: {
            categoryId: selectedCategoryId
          }
        });

        setCategoryHistoryExpenses(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error al obtener historial de categoría:', err);
        // Aun si la consulta histórica falla, conservamos el mes cargado en
        // memoria para no mostrar una selección válida como si no existiera.
        const fallbackExpenses = expenses.filter(expense => expense.categoryId === selectedCategoryId);
        setCategoryHistoryExpenses(fallbackExpenses);
      } finally {
        setCatLoading(false);
      }
    };
    
    fetchCategoryHistory();
  }, [selectedCategoryId, expenses]);

  const catData = useMemo(
    () => buildCategorySeries(categoryHistoryExpenses, categoryViewMode),
    [categoryHistoryExpenses, categoryViewMode]
  );
  const selectedCategoryView = CATEGORY_VIEW_OPTIONS.find(option => option.id === categoryViewMode) || CATEGORY_VIEW_OPTIONS[2];
  const categoryZoomIndex = CATEGORY_ZOOM_ORDER.indexOf(categoryViewMode);
  const changeCategoryZoom = (direction: 'in' | 'out') => {
    const nextIndex = direction === 'in'
      ? Math.min(CATEGORY_ZOOM_ORDER.length - 1, categoryZoomIndex + 1)
      : Math.max(0, categoryZoomIndex - 1);
    setCategoryViewMode(CATEGORY_ZOOM_ORDER[nextIndex]);
  };

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
      <div className="mx-auto max-w-7xl animate-pulse space-y-5 p-3 sm:p-6">
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

    return {
      day: dayNum,
      label: dayStr,
      date: dateQueryStr,
      Gastos: parseFloat(dayExpense.toFixed(2)),
    };
  });

  const selectedDayExpenses = selectedExpenseDate
    ? expenses.filter(expense => expense.date.startsWith(selectedExpenseDate))
    : [];
  const selectedDayTotal = selectedDayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const highestExpenseDay = dailyData.reduce((highest, day) => day.Gastos > highest.Gastos ? day : highest, dailyData[0]);

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

  const CategoryTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const category = payload[0].payload;
    const amount = Number(payload[0].value || 0);
    const percentage = (amount / Math.max(1, currentExpense)) * 100;

    return (
      <div className="min-w-[160px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/30">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
          <CategoryIcon name={category.name} icon={category.icon} color={category.color || '#6366F1'} strokeWidth={category.iconStrokeWidth} compact size={13} />
          <span className="truncate text-xs font-bold text-slate-600 dark:text-slate-300">{category.name}</span>
        </div>
        <div className="px-3.5 py-3">
          <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
            {amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {percentage.toFixed(1)} % del total mensual
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[94rem] space-y-5 px-3 py-4 pb-28 sm:space-y-6 sm:p-6 lg:px-6 lg:pb-6 xl:px-8">
      
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
          {selectedExpenseDate && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="daily-expenses-title"
              onMouseDown={() => setSelectedExpenseDate(null)}
            >
              <div
                className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Gastos del día</p>
                    <h4 id="daily-expenses-title" className="mt-0.5 text-base font-black capitalize text-slate-800 dark:text-white">
                      {new Date(`${selectedExpenseDate}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedExpenseDate(null)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label="Cerrar detalle de gastos"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="bg-rose-50 px-5 py-3 dark:bg-rose-950/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500/80 dark:text-rose-400/80">Total gastado</p>
                  <p className="mt-0.5 text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                    {selectedDayTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                </div>

                <div className="max-h-[320px] space-y-2 overflow-y-auto p-4 scrollbar-thin">
                  {selectedDayExpenses.map(expense => {
                    const category = categories.find(item => item.id === expense.categoryId);
                    return (
                      <div key={expense.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950/50">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: category?.color || '#6366F1' }}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                              {expense.description || category?.name || 'Gasto'}
                            </p>
                            <p className="truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">{category?.name || 'Sin categoría'}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-black font-mono text-rose-500 dark:text-rose-400">
                          -{expense.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
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

            {/* Highest spending day */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Día de mayor gasto</span>
                <h3 className="text-xl font-black text-brand-600 dark:text-brand-400">
                  {highestExpenseDay.Gastos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </h3>
                <p className="text-[9px] text-slate-400 dark:text-slate-500">
                  {highestExpenseDay.Gastos > 0 ? `El ${highestExpenseDay.label}` : 'Sin gastos este mes'}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-tr from-brand-500 to-purple-600 text-white rounded-2xl shrink-0 shadow-md shadow-brand-500/10">
                <Award size={20} />
              </div>
            </div>

          </div>

          {/* MONTHLY CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Daily Evolution Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución Diaria de Gastos</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Pulsa un punto para ver los gastos de ese día</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Registros del mes</p>
                  <p className="text-sm font-black text-rose-500 dark:text-rose-400">
                    {expenses.length}
                  </p>
                </div>
              </div>
              <ChartViewport label="Evolución diaria de gastos" heightClassName="h-[22rem] sm:h-72" minContentWidth={680}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dailyData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={(state: any) => {
                      const dayData = state.activePayload?.[0]?.payload;
                      if (dayData?.date && dayData.Gastos > 0) setSelectedExpenseDate(dayData.date);
                    }}
                  >
                    <defs>
                      <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Gastos"
                      stroke="#EF4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGastos)"
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (!payload?.Gastos) return <g />;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="#EF4444"
                            stroke="#fff"
                            strokeWidth={2}
                            className="cursor-pointer"
                            onClick={() => setSelectedExpenseDate(payload.date)}
                          />
                        );
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartViewport>
            </div>

            {/* Category Pie Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <PieIcon size={16} className="text-brand-500" />
                  Distribución por Categorías
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Reparto porcentual de egresos este mes</p>
              </div>

              {categoryBreakdown.length > 0 ? (
                <>
                  <ChartViewport label="Distribución mensual por categorías" heightClassName="h-72 sm:h-60" className="my-3">
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
                        <Tooltip content={<CategoryTooltip />} cursor={false} wrapperStyle={{ zIndex: 20 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Gastado</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white">
                        {currentExpense.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </span>
                    </div>
                  </ChartViewport>

                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[140px] pr-1 scrollbar-thin">
                    {categoryBreakdown.map((cat) => {
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
                        <CategoryIcon name={exp.category.name} icon={exp.category.icon} color={exp.category.color} strokeWidth={exp.category.iconStrokeWidth} compact size={13} />
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
              {(() => {
                const now = new Date();
                const curY = now.getFullYear();
                const curM = now.getMonth() + 1;
                const filteredMonthlyBreakdown = selectedYear === curY
                  ? yearlyStats.monthlyBreakdown.filter(m => m.month <= curM)
                  : yearlyStats.monthlyBreakdown;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Income vs Expenses Bar Chart */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm lg:col-span-2">
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Comparativa Mensual de Ingresos y Gastos</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Visualización agregada mes a mes</p>
                      </div>
                      <ChartViewport label="Comparativa mensual de ingresos y gastos" heightClassName="h-[22rem] sm:h-72" minContentWidth={560}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={filteredMonthlyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                            <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                            <Bar dataKey="income" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartViewport>
                    </div>

                    {/* Savings Rate Line Chart */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Tasa de Ahorro Mensual (%)</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Porcentaje de ingresos guardados por mes</p>
                      </div>
                      <ChartViewport label="Tasa de ahorro mensual" heightClassName="h-[22rem] sm:h-72" minContentWidth={520}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={filteredMonthlyBreakdown.map(m => ({
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
                      </ChartViewport>
                    </div>
                  </div>
                );
              })()}

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
                    <ChartViewport label="Distribución anual por categorías" heightClassName="h-80 sm:h-64">
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
                    </ChartViewport>
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
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución Histórica de Activos y Patrimonio Neto (Net Worth)</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Cuentas líquidas acumuladas sumadas a las Inversiones activas</p>
                </div>
                <ChartViewport label="Evolución histórica de activos y patrimonio neto" heightClassName="h-[26rem] sm:h-96" minContentWidth={680}>
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
                </ChartViewport>
              </div>

              {/* COMPARATIVA ANUAL (Cierre Patrimonio Neto) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Cierre de Patrimonio Neto por Año</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Comparativa del patrimonio acumulado al final de cada año</p>
                </div>
                
                {historicalStats.history.length > 0 ? (
                  <ChartViewport label="Cierre de patrimonio neto por año" heightClassName="h-[22rem] sm:h-64" minContentWidth={520}>
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
                  </ChartViewport>
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
            
            <div className="w-full sm:w-72">
              <SearchableSingleSelect
                value={selectedCategoryId}
                options={expenseCategoryOptions}
                onChange={setSelectedCategoryId}
                placeholder="Selecciona una categoría"
                searchPlaceholder="Buscar categoría..."
                emptyMessage="No se encontraron categorías"
                ariaLabel="Seleccionar categoría para el análisis"
              />
            </div>
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
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gasto máximo {selectedCategoryView.periodLabel}</span>
                  <h3 className="text-xl font-black text-rose-500 mt-2">
                    {Math.max(...catData.map(c => c.amount)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Periodo con mayor consumo en la vista actual</p>
                </div>

                {/* Avg Monthly Spent */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Promedio {selectedCategoryView.periodLabel}</span>
                  <h3 className="text-xl font-black text-brand-500 mt-2">
                    {(catData.reduce((sum, c) => sum + c.amount, 0) / catData.length).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Promedio de los periodos mostrados</p>
                </div>

                {/* Total Cumulative */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Acumulado</span>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white mt-2">
                    {catData.reduce((sum, c) => sum + c.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">Suma consumida en el rango mostrado</p>
                </div>

              </div>

              {/* 12-MONTH CATEGORY TREND CHART */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{selectedCategoryView.chartTitle}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Acerca para aumentar el detalle o aleja para agrupar periodos</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => changeCategoryZoom('out')}
                      disabled={categoryZoomIndex === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title="Alejar y agrupar más"
                      aria-label="Alejar gráfico y agrupar periodos"
                    >
                      <ZoomOut size={16} />
                    </button>
                    {CATEGORY_VIEW_OPTIONS.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setCategoryViewMode(option.id)}
                        className={`min-h-9 rounded-lg border px-2.5 text-[10px] font-bold transition ${
                          categoryViewMode === option.id
                            ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:text-brand-300'
                        }`}
                        title={option.label}
                      >
                        {option.shortLabel}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => changeCategoryZoom('in')}
                      disabled={categoryZoomIndex === CATEGORY_ZOOM_ORDER.length - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title="Acercar y mostrar más detalle"
                      aria-label="Acercar gráfico y mostrar más detalle"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>
                <ChartViewport
                  label={selectedCategoryView.chartTitle}
                  heightClassName="h-[22rem] sm:h-72"
                  minContentWidth={categoryViewMode === 'days' ? 900 : categoryViewMode === 'weeks' ? 680 : 560}
                  showZoomControls={false}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(2)} €`, 'Consumo']}
                        contentStyle={{
                          backgroundColor: dark ? '#121213' : '#ffffff',
                          border: dark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          boxShadow: dark ? '0 12px 28px rgba(0, 0, 0, 0.45)' : '0 8px 20px rgba(15, 23, 42, 0.12)',
                        }}
                        labelStyle={{ color: dark ? '#d4d4d8' : '#64748b' }}
                        itemStyle={{ color: dark ? '#f8fafc' : '#0f172a' }}
                        cursor={{ fill: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}
                      />
                      <Bar 
                        dataKey="amount" 
                        name="Gasto" 
                        fill={categories.find(c => c.id === selectedCategoryId)?.color || '#6366F1'} 
                        radius={[5, 5, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartViewport>
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

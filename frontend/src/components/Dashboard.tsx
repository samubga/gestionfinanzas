import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, PiggyBank, Wallet, TrendingUp, Edit2, Check, X, Tag } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { stats, statsLoading, saveSavingGoal } = useFinance();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  if (statsLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-80 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { currentMonth, availableBalance, categoryBreakdown, tagBreakdown, topExpenses, evolution } = stats;

  const handleSaveGoal = async () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val >= 0) {
      await saveSavingGoal(val);
      setEditingGoal(false);
    }
  };

  const startEditGoal = () => {
    setGoalInput(currentMonth.savingGoal.toString());
    setEditingGoal(true);
  };

  // Recharts colors for Category Breakdown Pie
  const COLORS = ['#6366F1', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#EF4444', '#14B8A6', '#6B7280'];

  // Calculate goal percentage
  const goalPercent = currentMonth.savingGoal > 0
    ? Math.min((currentMonth.savings / currentMonth.savingGoal) * 100, 100)
    : 0;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Resumen Financiero</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Visualización de tus ingresos, gastos e histórico mensual</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Available Balance */}
        <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-xl shadow-indigo-500/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Balance Disponible</span>
            <div className="p-2 bg-indigo-500/30 rounded-xl">
              <Wallet size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black">{availableBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] text-indigo-200 mt-1">Saldo acumulado total</p>
          </div>
        </div>

        {/* Incomes Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ingresos del Mes</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {currentMonth.income.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </h3>
            <div className="flex items-center mt-1">
              <span className={`text-[10px] font-bold flex items-center ${
                currentMonth.incomeChangePercent >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {currentMonth.incomeChangePercent >= 0 ? '+' : ''}
                {currentMonth.incomeChangePercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Gastos del Mes</span>
            <div className="p-2 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {currentMonth.expense.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </h3>
            <div className="flex items-center mt-1">
              <span className={`text-[10px] font-bold flex items-center ${
                currentMonth.expenseChangePercent <= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {currentMonth.expenseChangePercent >= 0 ? '+' : ''}
                {currentMonth.expenseChangePercent.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Savings Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ahorro del Mes</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
              <PiggyBank size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-black ${
              currentMonth.savings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'
            }`}>
              {currentMonth.savings.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Tasa de ahorro: {currentMonth.income > 0 ? ((currentMonth.savings / currentMonth.income) * 100).toFixed(0) : '0'}%
            </p>
          </div>
        </div>

      </div>

      {/* Saving Goal Progress Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={18} />
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Objetivo de Ahorro del Mes</h4>
          </div>
          
          {editingGoal ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-20 px-2 py-1 text-xs border rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
                autoFocus
              />
              <button onClick={handleSaveGoal} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg">
                <Check size={14} />
              </button>
              <button onClick={() => setEditingGoal(false)} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={startEditGoal}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Edit2 size={12} />
              {currentMonth.savingGoal > 0 ? `${currentMonth.savingGoal} €` : 'Establecer meta'}
            </button>
          )}
        </div>

        {currentMonth.savingGoal > 0 ? (
          <div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              <span>Ahorrado: {currentMonth.savings.toFixed(2)} €</span>
              <span>Meta: {currentMonth.savingGoal.toFixed(2)} € ({goalPercent.toFixed(0)}%)</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No has definido un objetivo de ahorro para este mes.</p>
        )}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Evolution Chart (Left 2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Evolución Histórica</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Últimos 6 meses de ingresos y gastos</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="Ingresos" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="Gastos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Right 1 column) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Gastos por Categoría</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Distribución porcentual este mes</p>
          </div>
          
          {categoryBreakdown.length > 0 ? (
            <>
              <div className="h-44 relative flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="amount"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Gasto</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">{currentMonth.expense.toFixed(0)} €</p>
                </div>
              </div>

              {/* Legend List */}
              <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-1 max-h-[140px]">
                {categoryBreakdown.slice(0, 4).map((entry, index) => {
                  const percent = currentMonth.expense > 0 ? ((entry.amount / currentMonth.expense) * 100).toFixed(0) : '0';
                  return (
                    <div key={entry.id} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }} />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-500 dark:text-slate-400 text-right">{entry.amount.toFixed(0)} € ({percent}%)</span>
                    </div>
                  );
                })}
                {categoryBreakdown.length > 4 && (
                  <p className="text-[9px] text-center text-slate-400 mt-2 font-semibold">Y {categoryBreakdown.length - 4} categorías más</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <span className="text-3xl mb-2">🍽️</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay registros este mes para desglosar.</p>
            </div>
          )}
        </div>

      </div>

      {/* Lower Row: Tag Breakdown and Top 10 Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tag Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Análisis por Etiquetas</h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Etiquetas con mayor acumulación de gasto</p>
          </div>

          {tagBreakdown.length > 0 ? (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-1.5">
              {tagBreakdown.slice(0, 5).map((item) => {
                const maxAmount = tagBreakdown[0].amount || 1;
                const percentage = (item.amount / maxAmount) * 100;
                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Tag size={12} className="text-slate-400" />
                        #{item.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{item.amount.toFixed(2)} €</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <span className="text-3xl mb-2">🏷️</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No has usado etiquetas en los gastos de este mes.</p>
            </div>
          )}
        </div>

        {/* Top 10 Highest Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Mayores Gastos del Mes</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Top 10 compras con importes más altos</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-full">Top 10</span>
          </div>

          {topExpenses.length > 0 ? (
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1.5">
              {topExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/20 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: exp.category.color }} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{exp.description}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{new Date(exp.date).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white shrink-0">-{exp.amount.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <span className="text-3xl mb-2">📈</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay gastos registrados este mes.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default Dashboard;

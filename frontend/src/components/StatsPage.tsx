import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, CalendarDays, Award, Sparkles, Tag, Folder } from 'lucide-react';

export const StatsPage: React.FC = () => {
  const { stats, statsLoading } = useFinance();

  if (statsLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { currentMonth, averages, categoryBreakdown, tagBreakdown, topExpenses, evolution } = stats;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Estadísticas y Análisis</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">Métricas avanzadas, promedios y proyecciones automáticas</p>
      </div>

      {/* Averages and Predictions Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Daily Average */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gasto Medio Diario</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{averages.dailyAverage.toFixed(2)} €</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Promedio de consumo por día</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl shrink-0">
            <CalendarDays size={20} />
          </div>
        </div>

        {/* Monthly Average */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gasto Medio Mensual</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{averages.monthlyAverage.toFixed(2)} €</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Promedio histórico de gastos</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl shrink-0">
            <Calendar size={20} />
          </div>
        </div>

        {/* Prediction */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Predicción a Fin de Mes</span>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{averages.prediction.toFixed(2)} €</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Proyección según consumo actual</p>
          </div>
          <div className="p-3 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl shrink-0 shadow-md shadow-indigo-500/10">
            <Sparkles size={20} className="animate-pulse" />
          </div>
        </div>

      </div>

      {/* Comparison and Evolution Charts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">Comparativa y Evolución del Ahorro</h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Historial del total ahorrado vs objetivos mensuales</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
              <Bar dataKey="savings" fill="#6366F1" radius={[4, 4, 0, 0]} name="Ahorro Realizado" />
              <Bar dataKey="goal" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="Objetivo de Ahorro" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category and Tag Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Ranking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Folder size={16} className="text-indigo-500" />
              Gastos por Categoría
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Categorías ordenadas de mayor a menor consumo</p>
          </div>

          {categoryBreakdown.length > 0 ? (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-1.5">
              {categoryBreakdown.map((cat) => {
                const totalExpense = currentMonth.expense || 1;
                const percentage = (cat.amount / totalExpense) * 100;
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                      <span>{cat.amount.toFixed(2)} € ({percentage.toFixed(0)}%)</span>
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <span className="text-3xl mb-2">🍽️</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay registros este mes.</p>
            </div>
          )}
        </div>

        {/* Tag Ranking */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Tag size={16} className="text-indigo-500" />
              Gastos por Etiquetas
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Etiquetas ordenadas de mayor a menor consumo</p>
          </div>

          {tagBreakdown.length > 0 ? (
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-1.5">
              {tagBreakdown.map((tag) => {
                const totalExpense = currentMonth.expense || 1;
                const percentage = (tag.amount / totalExpense) * 100;
                return (
                  <div key={tag.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>#{tag.name}</span>
                      <span>{tag.amount.toFixed(2)} € ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <span className="text-3xl mb-2">🏷️</span>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay registros con etiquetas este mes.</p>
            </div>
          )}
        </div>

      </div>

      {/* Top 10 highest expenses list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Award size={16} className="text-indigo-500" />
              Top 10 Gastos más Elevados
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Lista detallada de compras de mayor importe este mes</p>
          </div>
        </div>

        {topExpenses.length > 0 ? (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {topExpenses.map((exp, idx) => (
              <div key={exp.id} className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/20 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-black text-slate-400 w-5 text-center">{idx + 1}</span>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: exp.category.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                      {new Date(exp.date).toLocaleDateString('es-ES')} • {exp.category.name}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-4">
                  <span className="text-xs font-black text-rose-500">-{exp.amount.toFixed(2)} €</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4 text-center">No hay gastos registrados este mes.</p>
        )}
      </div>

    </div>
  );
};
export default StatsPage;

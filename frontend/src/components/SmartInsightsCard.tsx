import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Target,
  PieChart as PieChartIcon,
  Sparkles,
  Info,
  CalendarCheck,
  Pause,
  Play
} from 'lucide-react';
import { DashboardData } from '../types';

interface SmartInsightsCardProps {
  stats: DashboardData | null;
  onNavigate?: (tab: string, options?: { categoryId?: string; sortByAmount?: boolean }) => void;
}

interface InsightItem {
  id: string;
  badgeLabel: string;
  badgeIcon: React.ReactNode;
  badgeClass: string;
  borderTopClass: string;
  ambientGlowClass: string;
  title: string;
  description: React.ReactNode;
  calloutComponent?: React.ReactNode;
  actionText?: string;
  actionTab?: string;
  actionCategoryId?: string;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(val);
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SmartInsightsCard: React.FC<SmartInsightsCardProps> = ({ stats, onNavigate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);

  const insights = useMemo(() => {
    if (!stats) return [];

    const { currentMonth, categoryBreakdown, averages } = stats;
    const totalIncome = currentMonth?.income || 0;
    const totalExpense = currentMonth?.expense || 0;
    const netSavings = currentMonth?.savings ?? (totalIncome - totalExpense);
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const savingGoal = currentMonth?.savingGoal || 0;
    const topCategory = categoryBreakdown && categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // Check if viewing current ongoing month or a past completed month
    const now = new Date();
    const monthYear = currentMonth?.year || now.getFullYear();
    const monthNum = currentMonth?.month || (now.getMonth() + 1);
    const isCurrentMonth = (monthYear === now.getFullYear() && monthNum === (now.getMonth() + 1));
    const monthName = MONTH_NAMES[monthNum - 1] || 'el mes';

    // Calculate days remaining in ongoing month
    const totalDaysInMonth = new Date(monthYear, monthNum, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = isCurrentMonth ? Math.max(1, totalDaysInMonth - currentDay) : 0;

    const list: InsightItem[] = [];

    // 1. PRIMARY HEALTH & GOAL ASSESSMENT
    if (totalIncome === 0) {
      list.push({
        id: 'no-income',
        badgeLabel: 'Sin Ingresos Registrados',
        badgeIcon: <Info size={13} className="text-sky-400" />,
        badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
        borderTopClass: 'border-t-sky-500',
        ambientGlowClass: 'bg-sky-500/10',
        title: 'Ingresos Pendientes',
        description: 'Aún no se han anotado ingresos este mes. Mantén un registro de tus entradas para calcular tu capacidad real.',
        calloutComponent: (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gastos Registrados</span>
              <span className="text-sm font-extrabold text-white font-mono">{formatCurrency(totalExpense)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Ingresos</span>
              <span className="text-sm font-extrabold text-sky-400 font-mono">0 €</span>
            </div>
          </div>
        ),
        actionText: 'Añadir Ingreso',
        actionTab: 'transactions'
      });
    } else if (netSavings < 0) {
      const deficit = Math.abs(netSavings);
      list.push({
        id: 'deficit-alert',
        badgeLabel: savingGoal > 0 ? (isCurrentMonth ? 'Déficit en Curso' : 'Meta Incumplida') : 'Alerta de Déficit',
        badgeIcon: <AlertOctagon size={13} className="text-rose-400" />,
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        borderTopClass: 'border-t-rose-500',
        ambientGlowClass: 'bg-rose-500/15',
        title: savingGoal > 0 ? 'Déficit respecto a tu Meta' : 'Gastos Superan Ingresos',
        description: (
          <span>
            {savingGoal > 0
              ? `Tenías una meta de ahorar ${formatCurrency(savingGoal)}, pero estás en saldo negativo por ${formatCurrency(deficit)}.${isCurrentMonth ? ` Quedan ${remainingDays} días de ${monthName} para reconducir el presupuesto.` : ''}`
              : `Estás en balance negativo por ${formatCurrency(deficit)}. Se recomienda revisar gastos prescindibles.`}
          </span>
        ),
        calloutComponent: (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Balance del Mes</span>
              <span className="text-rose-400 font-extrabold font-mono">-{formatCurrency(deficit)} ({savingsRate}%)</span>
            </div>
            {topCategory && (
              <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-rose-500/20">
                <span className="text-slate-400">Mayor gasto: <strong className="text-slate-200">{topCategory.name}</strong></span>
                <span className="text-slate-200 font-bold font-mono">{formatCurrency(topCategory.amount)}</span>
              </div>
            )}
          </div>
        ),
        actionText: 'Revisar Gastos',
        actionTab: 'transactions'
      });
    } else if (savingGoal > 0) {
      // EVALUATE RELATIVE TO USER'S GOAL & TIME IN MONTH
      const goalRatio = netSavings / savingGoal;
      const goalProgress = Math.round(goalRatio * 100);
      const remaining = savingGoal - netSavings;

      if (netSavings >= savingGoal) {
        list.push({
          id: 'goal-achieved-primary',
          badgeLabel: isCurrentMonth ? 'Meta Alcanzada (Provisional)' : 'Meta Cumplida',
          badgeIcon: <Target size={13} className="text-emerald-400" />,
          badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          borderTopClass: 'border-t-emerald-500',
          ambientGlowClass: 'bg-emerald-500/15',
          title: isCurrentMonth ? 'Objetivo Cubierto por Ahora' : 'Objetivo de Ahorro Conseguido',
          description: isCurrentMonth
            ? `Has acumulado ${formatCurrency(netSavings)} de ahorro frente a tu meta de ${formatCurrency(savingGoal)}. Quedan ${remainingDays} días de ${monthName} para mantener este presupuesto al cierre.`
            : `¡Felicidades! Cerraste el mes de ${monthName} con ${formatCurrency(netSavings)} ahorrados, superando tu meta de ${formatCurrency(savingGoal)}.`,
          calloutComponent: (
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Progreso de Meta</span>
                <span className="text-emerald-400 font-extrabold font-mono">{goalProgress}% ({formatCurrency(netSavings)} / {formatCurrency(savingGoal)})</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '100%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Objetivo: {formatCurrency(savingGoal)}</span>
                <span className="text-emerald-400 font-bold">{isCurrentMonth ? 'Cubierto provisionalmente' : '¡Meta conseguida!'}</span>
              </div>
            </div>
          )
        });
      } else if (goalRatio >= 0.75) {
        list.push({
          id: 'goal-near-primary',
          badgeLabel: 'Cerca de la Meta',
          badgeIcon: <Target size={13} className="text-blue-400" />,
          badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          borderTopClass: 'border-t-blue-500',
          ambientGlowClass: 'bg-blue-500/15',
          title: 'En Camino a tu Meta',
          description: isCurrentMonth
            ? `Llevas un ${goalProgress}% de tu meta de ahorro (${formatCurrency(netSavings)} de ${formatCurrency(savingGoal)}). Quedan ${remainingDays} días de ${monthName} para ahorrar los ${formatCurrency(remaining)} restantes.`
            : `El mes de ${monthName} finalizó rozando tu meta (${goalProgress}% completado). Te faltaron ${formatCurrency(remaining)}.`,
          calloutComponent: (
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Completado</span>
                <span className="text-blue-300 font-extrabold font-mono">{goalProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, goalProgress)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Ahorrado: {formatCurrency(netSavings)}</span>
                <span>Objetivo: {formatCurrency(savingGoal)}</span>
              </div>
            </div>
          )
        });
      } else {
        list.push({
          id: 'goal-below-primary',
          badgeLabel: isCurrentMonth ? 'Progreso Insuficiente' : 'Meta no Alcanzada',
          badgeIcon: <AlertTriangle size={13} className="text-amber-400" />,
          badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          borderTopClass: 'border-t-amber-500',
          ambientGlowClass: 'bg-amber-500/15',
          title: 'Por Debajo de tu Meta',
          description: isCurrentMonth
            ? `Has acumulado ${formatCurrency(netSavings)} (cumplido solo el ${goalProgress}% de tu meta de ${formatCurrency(savingGoal)}). Quedan ${remainingDays} días para intentar recuperar el ritmo.`
            : `El mes de ${monthName} cerró con ${formatCurrency(netSavings)} ahorrados, quedando a ${formatCurrency(remaining)} de tu objetivo de ${formatCurrency(savingGoal)}.`,
          calloutComponent: (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Cumplimiento de Meta</span>
                <span className="text-amber-400 font-extrabold font-mono">{goalProgress}% ({formatCurrency(netSavings)} / {formatCurrency(savingGoal)})</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full" style={{ width: `${Math.min(100, goalProgress)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Faltan: {formatCurrency(remaining)}</span>
                <span>Objetivo: {formatCurrency(savingGoal)}</span>
              </div>
            </div>
          )
        });
      }
    } else {
      // Fallback if NO savingGoal is set
      if (savingsRate < 10) {
        list.push({
          id: 'low-savings',
          badgeLabel: 'Margen Ajustado',
          badgeIcon: <AlertTriangle size={13} className="text-amber-400" />,
          badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          borderTopClass: 'border-t-amber-500',
          ambientGlowClass: 'bg-amber-500/15',
          title: 'Capacidad de Ahorro Baja',
          description: 'Has ahorrado un porcentaje ajustado de tus ingresos este mes. Te sugerimos fijar una meta de ahorro mensual.',
          calloutComponent: (
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Tasa de Ahorro</span>
                <span className="text-amber-400 font-extrabold font-mono">{savingsRate}% ({formatCurrency(netSavings)})</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(5, savingsRate))}%` }} />
              </div>
            </div>
          )
        });
      } else if (savingsRate < 25) {
        list.push({
          id: 'healthy-savings',
          badgeLabel: 'Ritmo Moderado',
          badgeIcon: <ShieldCheck size={13} className="text-emerald-400" />,
          badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          borderTopClass: 'border-t-emerald-500',
          ambientGlowClass: 'bg-emerald-500/15',
          title: 'Previsión Equilibrada',
          description: `Has ahorrado el ${savingsRate}% (${formatCurrency(netSavings)}) de tus ingresos. Para mayor control, define una meta mensual personalizada.`,
          calloutComponent: (
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Ahorrado este mes</span>
                <span className="text-emerald-400 font-extrabold font-mono">+{formatCurrency(netSavings)} ({savingsRate}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, savingsRate)}%` }} />
              </div>
            </div>
          )
        });
      } else {
        list.push({
          id: 'high-savings',
          badgeLabel: 'Ahorro Elevado',
          badgeIcon: <Sparkles size={13} className="text-indigo-400" />,
          badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          borderTopClass: 'border-t-indigo-500',
          ambientGlowClass: 'bg-indigo-500/15',
          title: 'Gran Capacidad de Ahorro',
          description: `¡Muy buen desempeño! Ahorraste el ${savingsRate}% (${formatCurrency(netSavings)}) de tus ingresos este mes.`,
          calloutComponent: (
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Ahorro Generado</span>
                <span className="text-indigo-300 font-extrabold font-mono">+{formatCurrency(netSavings)} ({savingsRate}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full" style={{ width: `${Math.min(100, savingsRate)}%` }} />
              </div>
            </div>
          ),
          actionText: 'Ver Inversiones',
          actionTab: 'investments'
        });
      }
    }

    // 2. TOP EXPENSE CATEGORY FOCUS
    if (topCategory && totalExpense > 0) {
      const topCategoryPercent = Math.round((topCategory.amount / totalExpense) * 100);
      if (topCategoryPercent >= 25) {
        list.push({
          id: 'top-category',
          badgeLabel: 'Foco de Gasto',
          badgeIcon: <PieChartIcon size={13} className="text-purple-400" />,
          badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          borderTopClass: 'border-t-purple-500',
          ambientGlowClass: 'bg-purple-500/15',
          title: `Concentración en ${topCategory.name}`,
          description: `La categoría "${topCategory.name}" absorbe el ${topCategoryPercent}% del gasto total del periodo.`,
          calloutComponent: (
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-semibold">{topCategory.name}</span>
                <span className="text-purple-300 font-extrabold font-mono">{formatCurrency(topCategory.amount)} ({topCategoryPercent}%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${topCategoryPercent}%`, backgroundColor: topCategory.color || '#A855F7' }} />
              </div>
            </div>
          ),
          actionText: 'Ver Transacciones',
          actionTab: 'transactions',
          actionCategoryId: topCategory.id
        });
      }
    }

    // 3. TIME-AWARE INSIGHT: ONGOING MONTH PROJECTION vs COMPLETED MONTH RETROSPECTIVE
    if (isCurrentMonth) {
      // ONGOING MONTH: Display daily rate projection
      if (averages && averages.prediction > 0 && totalIncome > 0) {
        const prediction = averages.prediction;
        const dailyAvg = averages.dailyAverage;
        const willExceed = prediction > totalIncome;

        list.push({
          id: 'projection-insight',
          badgeLabel: 'Proyección Cierre',
          badgeIcon: <TrendingUp size={13} className={willExceed ? 'text-amber-400' : 'text-teal-400'} />,
          badgeClass: willExceed
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            : 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          borderTopClass: willExceed ? 'border-t-amber-500' : 'border-t-teal-500',
          ambientGlowClass: willExceed ? 'bg-amber-500/15' : 'bg-teal-500/15',
          title: 'Estimación a Fin de Mes',
          description: willExceed
            ? `Al ritmo diario de ${formatCurrency(dailyAvg)}, proyectas cerrar el mes superando tus ingresos.`
            : `Al ritmo diario de ${formatCurrency(dailyAvg)}, proyectas cerrar el mes con saldo positivo.`,
          calloutComponent: (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Gasto medio diario</span>
                <span className="text-slate-200 font-bold font-mono">{formatCurrency(dailyAvg)}/día</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-700/60">
                <span className="text-slate-300 font-medium">Gasto estimado final</span>
                <span className={`font-extrabold font-mono ${willExceed ? 'text-amber-400' : 'text-teal-400'}`}>
                  {formatCurrency(prediction)}
                </span>
              </div>
            </div>
          ),
          actionText: 'Ver Previsiones',
          actionTab: 'forecasts'
        });
      }
    } else {
      // COMPLETED / PAST MONTH: Show COMPLETED MONTH RETROSPECTIVE!
      list.push({
        id: 'past-month-summary',
        badgeLabel: `Cierre de ${monthName}`,
        badgeIcon: <CalendarCheck size={13} className="text-teal-400" />,
        badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        borderTopClass: 'border-t-teal-500',
        ambientGlowClass: 'bg-teal-500/15',
        title: `Balance Definitivo de ${monthName}`,
        description: `El mes de ${monthName} finalizó. Registraste un total de ${formatCurrency(totalExpense)} en gastos e ingresos de ${formatCurrency(totalIncome)}.`,
        calloutComponent: (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Ingresos Totales</span>
              <span className="font-extrabold text-emerald-400 font-mono">+{formatCurrency(totalIncome)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Gastos Totales</span>
              <span className="font-extrabold text-rose-400 font-mono">-{formatCurrency(totalExpense)}</span>
            </div>
            <div className="flex justify-between text-white font-bold pt-1.5 border-t border-slate-700/60">
              <span>Resultado Final</span>
              <span className={`font-extrabold font-mono ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
              </span>
            </div>
          </div>
        ),
        actionText: 'Histórico Completo',
        actionTab: 'stats'
      });
    }

    return list;
  }, [stats]);

  // Auto-play timer (changes every 8 seconds, can be paused/unpaused manually)
  useEffect(() => {
    if (insights.length <= 1 || isPaused || !isAutoPlayEnabled) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % insights.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [insights.length, isPaused, isAutoPlayEnabled]);

  useEffect(() => {
    if (currentIndex >= insights.length) {
      setCurrentIndex(0);
    }
  }, [insights.length, currentIndex]);

  if (!stats || insights.length === 0) {
    return null;
  }

  const currentInsight = insights[currentIndex] || insights[0];

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % insights.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + insights.length) % insights.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`lg:col-span-1 bg-slate-900 text-white border border-slate-800 ${currentInsight.borderTopClass} border-t-4 rounded-3xl p-6 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all duration-300`}
    >
      {/* Background ambient glow effect */}
      <div className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl ${currentInsight.ambientGlowClass} pointer-events-none transition-colors duration-500`} />
      
      <div className="absolute top-3 right-3 opacity-5 pointer-events-none">
        <Zap size={90} className="text-white" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header Badge & Carousel Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold tracking-wide flex items-center gap-1.5 ${currentInsight.badgeClass}`}>
              {currentInsight.badgeIcon}
              <span>{currentInsight.badgeLabel}</span>
            </span>
          </div>

          {/* Carousel controls (Arrows + Pause/Play toggle) */}
          {insights.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded-full shadow-inner">
              <button
                onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
                className={`p-1 rounded-full transition-colors cursor-pointer ${
                  isAutoPlayEnabled
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                    : 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25'
                }`}
                title={isAutoPlayEnabled ? 'Pausar rotación automática' : 'Reanudar rotación automática'}
              >
                {isAutoPlayEnabled ? <Pause size={11} /> : <Play size={11} />}
              </button>

              <div className="w-px h-3 bg-slate-700 mx-0.5" />

              <button
                onClick={handlePrev}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-700"
                title="Insight anterior"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-300 px-0.5">
                {currentIndex + 1}/{insights.length}
              </span>
              <button
                onClick={handleNext}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-700"
                title="Siguiente insight"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="space-y-1.5">
          <h4 className="font-extrabold text-base text-white tracking-tight">
            {currentInsight.title}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {currentInsight.description}
          </p>
        </div>

        {/* Visual Callout Component Box */}
        {currentInsight.calloutComponent && (
          <div className="pt-1">
            {currentInsight.calloutComponent}
          </div>
        )}
      </div>

      {/* Footer / Pagination & CTA Button */}
      <div className="pt-4 border-t border-slate-800/90 flex items-center justify-between text-xs relative z-10 mt-5">
        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5">
          {insights.map((ins, idx) => (
            <button
              key={ins.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-5 bg-brand-400' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
              title={ins.badgeLabel}
            />
          ))}
        </div>

        {/* Action CTA Button */}
        {currentInsight.actionText && (
          <button
            onClick={() => onNavigate && currentInsight.actionTab && onNavigate(currentInsight.actionTab, { categoryId: currentInsight.actionCategoryId })}
            className="text-[11px] font-bold text-brand-300 hover:text-white bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all group"
          >
            <span>{currentInsight.actionText}</span>
            <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SmartInsightsCard;

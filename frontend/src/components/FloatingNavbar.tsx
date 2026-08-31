import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  LineChart,
  BarChart3,
  TrendingUp,
  Settings2,
  Database,
  Sun,
  Moon,
  Plus,
  LogOut,
  Sparkles,
  Layout
} from 'lucide-react';

interface FloatingNavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddExpense: () => void;
}

export const FloatingNavbar: React.FC<FloatingNavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddExpense
}) => {
  const { logout } = useAuth();
  const { year, month, setPeriod } = useFinance();
  const { dark, toggleTheme, colorTheme, setColorTheme, layoutMode, toggleLayoutMode } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Cuentas', icon: Wallet },
    { id: 'transactions', label: 'Transacciones', icon: Receipt },
    { id: 'investments', label: 'Inversiones', icon: LineChart },
    { id: 'stats', label: 'Análisis', icon: BarChart3 },
    { id: 'forecasts', label: 'Previsiones', icon: TrendingUp },
    { id: 'categories', label: 'Categorías', icon: Settings2 },
    { id: 'backup', label: 'Ajustes', icon: Database },
  ];

  const themes = [
    { id: 'indigo', name: 'Clásico', hex: '#4f46e5' },
    { id: 'sapphire', name: 'Zafiro', hex: '#2563eb' },
    { id: 'teal', name: 'Turquesa', hex: '#139488' },
    { id: 'amber', name: 'Ámbar', hex: '#766246' },
    { id: 'ocean', name: 'Diamante', hex: '#4c6e86' },
    { id: 'violet', name: 'Amatista', hex: '#8b78dc' },
    { id: 'rose', name: 'Rosa Pastel', hex: '#d98ca8' },
    { id: 'obsidian', name: 'Obsidiana (OLED)', hex: '#121212' },
  ] as const;

  const months = [
    { val: 1, name: 'Ene' }, { val: 2, name: 'Feb' }, { val: 3, name: 'Mar' },
    { val: 4, name: 'Abr' }, { val: 5, name: 'May' }, { val: 6, name: 'Jun' },
    { val: 7, name: 'Jul' }, { val: 8, name: 'Ago' }, { val: 9, name: 'Sep' },
    { val: 10, name: 'Oct' }, { val: 11, name: 'Nov' }, { val: 12, name: 'Dic' }
  ];

  const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

  return (
    <header className="sticky top-3 z-50 px-4 mb-6">
      <div className="max-w-7xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-brand-500/5 rounded-2xl md:rounded-full px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-300">
        
        {/* Left Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-brand-50/70 dark:bg-slate-800 shadow-md shadow-brand-500/20 overflow-hidden">
              <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-slate-800 dark:text-white text-sm leading-none block">Finanzas</span>
              <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest flex items-center gap-1">
                Bento Canvas <Sparkles size={10} />
              </span>
            </div>
          </div>

          {/* Period selector */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-full border border-slate-100 dark:border-slate-800 text-[11px] font-semibold">
            <select
              value={month}
              onChange={(e) => setPeriod(year, parseInt(e.target.value))}
              className="bg-transparent border-0 font-bold focus:ring-0 text-slate-700 dark:text-slate-300 py-0.5 px-1.5 cursor-pointer"
            >
              {months.map(m => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <select
              value={year}
              onChange={(e) => setPeriod(parseInt(e.target.value), month)}
              className="bg-transparent border-0 font-bold focus:ring-0 text-slate-700 dark:text-slate-300 py-0.5 px-1.5 cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-50/80 dark:bg-slate-950/60 p-1 rounded-full border border-slate-100/60 dark:border-slate-800/40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-md shadow-brand-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions & Utilities */}
        <div className="flex items-center gap-2">
          
          {/* Quick Theme Swatch Menu */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-full transition cursor-pointer flex items-center justify-center"
              title="Cambiar paleta de colores"
            >
              <div className="w-4 h-4 rounded-full bg-brand-500 border border-white dark:border-slate-900 shadow-sm" />
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 animate-fade-in space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Paletas Gemstone</span>
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setColorTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      colorTheme === t.id
                        ? 'bg-brand-50 dark:bg-brand-950/30 text-brand-500 font-extrabold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shrink-0" style={{ backgroundColor: t.hex }} />
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-full transition cursor-pointer"
            title={dark ? 'Modo claro' : 'Modo oscuro'}
          >
            {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
          </button>

          {/* Toggle Layout Mode (Classic vs Bento) */}
          <button
            onClick={toggleLayoutMode}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full transition cursor-pointer text-xs font-bold"
            title="Alternar entre Diseño Clásico v1 y Diseño Bento v2"
          >
            <Layout size={14} className="text-brand-500" />
            <span className="capitalize">{layoutMode}</span>
          </button>

          {/* Add Expense Button */}
          <button
            onClick={onOpenAddExpense}
            className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-md shadow-brand-500/25 flex items-center gap-1.5 transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Transacción</span>
          </button>

          {/* User Avatar / Logout */}
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-full transition cursor-pointer ml-1"
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
          </button>

        </div>
      </div>

      {/* Mobile subnav */}
      <div className="flex md:hidden items-center justify-between gap-1 overflow-x-auto p-1.5 mt-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-xl border border-slate-100 dark:border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon size={12} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

export default FloatingNavbar;

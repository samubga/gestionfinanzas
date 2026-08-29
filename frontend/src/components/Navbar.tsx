import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Receipt, BarChart3, Settings2, Database, LogOut, Sun, Moon, TrendingUp, LineChart, Wallet } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dark: boolean;
  toggleTheme: () => void;
  onOpenAddExpense: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  dark,
  toggleTheme,
  onOpenAddExpense
}) => {
  const { user, logout } = useAuth();
  const { year, month, setPeriod } = useFinance();
  const { colorTheme, setColorTheme } = useTheme();

  const themes = [
    { id: 'indigo', name: 'Día / Noche Clásico', hex: '#4f46e5' },
    { id: 'sapphire', name: 'Modo Zafiro', hex: '#2563eb' },
    { id: 'teal', name: 'Modo Turquesa', hex: '#139488' },
    { id: 'amber', name: 'Modo Ámbar', hex: '#766246' },
    { id: 'ocean', name: 'Modo Diamante', hex: '#4c6e86' },
    { id: 'violet', name: 'Modo Amatista', hex: '#8b78dc' },
    { id: 'obsidian', name: 'Modo Obsidiana (OLED)', hex: '#121212' },
  ] as const;

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

  // Helper for period change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriod(year, parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriod(parseInt(e.target.value), month);
  };

  const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
  const months = [
    { val: 1, name: 'Ene' },
    { val: 2, name: 'Feb' },
    { val: 3, name: 'Mar' },
    { val: 4, name: 'Abr' },
    { val: 5, name: 'May' },
    { val: 6, name: 'Jun' },
    { val: 7, name: 'Jul' },
    { val: 8, name: 'Ago' },
    { val: 9, name: 'Sep' },
    { val: 10, name: 'Oct' },
    { val: 11, name: 'Nov' },
    { val: 12, name: 'Dic' },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 shrink-0 h-screen sticky top-0 p-6">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 bg-brand-600 rounded-xl text-white shadow-md shadow-brand-500/20">
            <span className="text-xl">💰</span>
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 dark:text-white leading-none">Finanzas</h1>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wider uppercase font-semibold">Personal App</span>
          </div>
        </div>

        {/* Global Period Selector */}
        <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100/50 dark:border-slate-800/20">
          <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Periodo activo</label>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={handleMonthChange}
              className="flex-1 py-1.5 px-2.5 bg-white dark:bg-slate-800 border-0 rounded-xl text-xs font-semibold shadow-sm focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-300"
            >
              {months.map(m => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={handleYearChange}
              className="py-1.5 px-2.5 bg-white dark:bg-slate-800 border-0 rounded-xl text-xs font-semibold shadow-sm focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-300"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-50/50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border-l-4 border-brand-600'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile & Actions */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
              {user?.name?.slice(0, 1).toUpperCase() || user?.email?.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{user?.name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleTheme}
              className="flex-1 py-2 px-3 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              title={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={logout}
              className="py-2 px-3 border border-red-100 hover:bg-red-50 dark:border-red-950/10 dark:hover:bg-red-950/20 text-red-500 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Color theme selectors */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Diseño de color</span>
            <div className="flex items-center justify-between gap-1 p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/50 dark:border-slate-800/20">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  style={{ backgroundColor: t.hex }}
                  className={`w-6 h-6 rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center ${
                    colorTheme === t.id
                      ? 'border-slate-850 dark:border-white scale-110 ring-2 ring-brand-500/25 shadow-sm'
                      : 'border-transparent opacity-85 hover:opacity-100'
                  }`}
                  title={t.name}
                >
                  {colorTheme === t.id && <span className="text-[10px] text-white font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & BOTTOM NAV */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="font-extrabold text-slate-800 dark:text-white text-base">Finanzas</span>
        </div>

        {/* Global Period Selector for Mobile */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
          <select
            value={month}
            onChange={handleMonthChange}
            className="py-1 px-1.5 bg-transparent border-0 font-semibold focus:ring-0 text-slate-700 dark:text-slate-300 pr-4"
          >
            {months.map(m => (
              <option key={m.val} value={m.val}>{m.name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={handleYearChange}
            className="py-1 px-1.5 bg-transparent border-0 font-semibold focus:ring-0 text-slate-700 dark:text-slate-300 pr-4"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between">
        {navItems.slice(0, 3).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-all cursor-pointer ${
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Floating action button in bottom bar */}
        <button
          onClick={onOpenAddExpense}
          className="w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 transform -translate-y-4 border-4 border-slate-50 dark:border-slate-950 transition-transform active:scale-95 cursor-pointer"
          title="Añadir Transacción"
        >
          <span className="text-xl font-bold">+</span>
        </button>

        {navItems.slice(3).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 p-2 transition-all cursor-pointer ${
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[9px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
export default Navbar;

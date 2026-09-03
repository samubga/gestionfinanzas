import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Receipt, BarChart3, Settings2, Database, LogOut, Sun, Moon, TrendingUp, LineChart, Wallet, MoreHorizontal, Palette, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

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
  const notification = useNotification();
  const { year, month, setPeriod } = useFinance();
  const { colorTheme, setColorTheme } = useTheme();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    notification.success('Sesión cerrada correctamente.');
  };

  const themes = [
    { id: 'indigo', name: 'Día / Noche Clásico', hex: '#4f46e5' },
    { id: 'sapphire', name: 'Modo Zafiro', hex: '#2563eb' },
    { id: 'teal', name: 'Modo Turquesa', hex: '#139488' },
    { id: 'amber', name: 'Modo Ámbar', hex: '#766246' },
    { id: 'ocean', name: 'Modo Diamante', hex: '#4c6e86' },
    { id: 'violet', name: 'Modo Amatista', hex: '#8b78dc' },
    { id: 'rose', name: 'Modo Rosa Pastel', hex: '#d98ca8' },
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

  const mobileNavItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transacciones', icon: Receipt },
    { id: 'stats', label: 'Análisis', icon: BarChart3 },
  ];

  const moreNavItems = navItems.filter(item => !mobileNavItems.some(mobileItem => mobileItem.id === item.id));

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
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 shrink-0 h-screen sticky top-0 overflow-y-auto p-6">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50/70 dark:bg-slate-800 shadow-md shadow-brand-500/20 overflow-hidden">
            <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-full h-full object-contain p-0.5" />
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
              {user?.avatarData ? <img src={user.avatarData} alt="Foto de perfil" className="w-full h-full object-cover" /> : (user?.name?.slice(0, 1).toUpperCase() || user?.email?.slice(0, 1).toUpperCase())}
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
              onClick={handleLogout}
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
      <header className="lg:hidden flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 sticky top-0 z-40">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-8 h-8 object-contain" />
          <span className="font-extrabold text-slate-800 dark:text-white text-base truncate">Finanzas</span>
        </div>

        {/* Global Period Selector for Mobile */}
        <div className="flex shrink-0 gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
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
          className="shrink-0 min-h-11 min-w-11 p-2 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      {isMoreMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsMoreMenuOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px]"
          />
          <section
            id="mobile-more-menu"
            aria-label="Más opciones"
            className="lg:hidden fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-50 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white">Más opciones</h2>
              <button type="button" onClick={() => setIsMoreMenuOpen(false)} className="min-h-11 min-w-11 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Cerrar menú">
                <X size={20} className="mx-auto" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActiveTab(item.id); setIsMoreMenuOpen(false); }}
                    className={`min-h-14 rounded-2xl px-3 py-2 text-left text-xs font-bold transition-colors ${
                      isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={18} className="mb-1" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Palette size={13} /> Diseño de color
              </div>
              <div className="grid grid-cols-4 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setColorTheme(theme.id)}
                    style={{ backgroundColor: theme.hex }}
                    className={`h-11 w-11 justify-self-center rounded-full border transition-transform active:scale-95 ${colorTheme === theme.id ? 'scale-110 border-white ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : 'border-transparent'}`}
                    title={theme.name}
                    aria-label={theme.name}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-950/40 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </section>
        </>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center bg-white/90 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 dark:bg-slate-900/90">
        {mobileNavItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-center transition-all cursor-pointer ${
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="w-full truncate text-[9px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Floating action button in bottom bar */}
        <button
          onClick={onOpenAddExpense}
          className="w-12 h-12 shrink-0 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 transform -translate-y-4 border-4 border-slate-50 dark:border-slate-950 transition-transform active:scale-95 cursor-pointer"
          title="Añadir Transacción"
        >
          <span className="text-xl font-bold">+</span>
        </button>

        {mobileNavItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-center transition-all cursor-pointer ${
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
              }`}
            >
              <Icon size={20} />
              <span className="w-full truncate text-[9px] font-bold tracking-tight">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsMoreMenuOpen(true)}
          aria-expanded={isMoreMenuOpen}
          aria-controls="mobile-more-menu"
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-center text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        >
          <MoreHorizontal size={20} />
          <span className="w-full truncate text-[9px] font-bold tracking-tight">Más</span>
        </button>
      </nav>
    </>
  );
};
export default Navbar;

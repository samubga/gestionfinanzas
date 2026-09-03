import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { LayoutDashboard, Receipt, BarChart3, Settings2, Database, LogOut, Sun, Moon, TrendingUp, LineChart, Wallet, Menu, Palette, X, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { usePrivacy } from '../context/PrivacyContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dark: boolean;
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  dark,
  toggleTheme
}) => {
  const { user, logout } = useAuth();
  const notification = useNotification();
  const { year, month, setPeriod } = useFinance();
  const { colorTheme, setColorTheme } = useTheme();
  const { contentVisible, toggleContentVisibility } = usePrivacy();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMobileMenuOpen]);

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
              type="button"
              onClick={toggleContentVisibility}
              className="flex-1 py-2 px-3 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              title={contentVisible ? 'Ocultar información financiera' : 'Mostrar información financiera'}
              aria-label={contentVisible ? 'Ocultar información financiera' : 'Mostrar información financiera'}
              aria-pressed={!contentVisible}
            >
              {contentVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
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

      {/* MOBILE FIXED HEADER */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/95 lg:hidden sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menú principal"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu size={23} />
          </button>
          <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="h-9 w-9 object-contain" />
        </div>

        <div className="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 text-[10px] font-bold dark:bg-slate-800">
          <select
            aria-label="Mes activo"
            value={month}
            onChange={handleMonthChange}
            className="min-h-9 rounded-lg border-0 bg-transparent px-1.5 pr-5 font-semibold text-slate-700 focus:ring-1 focus:ring-brand-500 dark:text-slate-300"
          >
            {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
          </select>
          <select
            aria-label="Año activo"
            value={year}
            onChange={handleYearChange}
            className="min-h-9 rounded-lg border-0 bg-transparent px-1.5 pr-5 font-semibold text-slate-700 focus:ring-1 focus:ring-brand-500 dark:text-slate-300"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>
      <div className="h-[calc(4rem+env(safe-area-inset-top))] shrink-0 lg:hidden" aria-hidden="true" />

      {/* MOBILE LEFT DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />
          <aside
            id="mobile-navigation"
            aria-label="Navegación principal"
            className="mobile-drawer-enter absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto border-r border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 shadow-sm dark:bg-slate-800">
                  <img src="/brand/finanzas-logo.png" alt="" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">{user?.name || 'Usuario'}</p>
                  <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Cerrar menú">
                <X size={21} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-bold transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/35 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={19} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={toggleContentVisibility}
                className="flex min-h-12 w-full items-center justify-between rounded-xl bg-brand-50 px-3.5 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950/35 dark:text-brand-300 dark:hover:bg-brand-950/55"
                aria-pressed={!contentVisible}
              >
                <span className="flex items-center gap-3">
                  {contentVisible ? <Eye size={19} /> : <EyeOff size={19} />}
                  {contentVisible ? 'Ocultar información' : 'Mostrar información'}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex min-h-12 w-full items-center justify-between rounded-xl bg-slate-50 px-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-3">{dark ? <Sun size={19} /> : <Moon size={19} />}{dark ? 'Usar modo claro' : 'Usar modo oscuro'}</span>
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${dark ? 'bg-brand-600' : 'bg-slate-300'}`} aria-hidden="true">
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-4' : ''}`} />
                </span>
              </button>

              <div>
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
                      className={`h-10 w-10 justify-self-center rounded-full border transition-transform active:scale-95 ${colorTheme === theme.id ? 'scale-110 border-white ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : 'border-transparent'}`}
                      title={theme.name}
                      aria-label={theme.name}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-100 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-950/40 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

    </>
  );
};
export default Navbar;

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
    { id: 'indigo', name: 'Editorial petróleo', hex: '#155e63' },
    { id: 'sapphire', name: 'Modo Zafiro', hex: '#2563eb' },
    { id: 'teal', name: 'Modo Turquesa', hex: '#139488' },
    { id: 'amber', name: 'Modo Ámbar', hex: '#766246' },
    { id: 'ocean', name: 'Modo Diamante', hex: '#4c6e86' },
    { id: 'violet', name: 'Modo Amatista', hex: '#8b78dc' },
    { id: 'rose', name: 'Modo Rosa Pastel', hex: '#d98ca8' },
    { id: 'obsidian', name: 'Modo Obsidiana (OLED)', hex: '#121212' },
  ] as const;

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
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
      <aside className="editorial-sidebar hidden lg:flex flex-col w-[15rem] shrink-0 h-screen sticky top-0 overflow-y-auto p-5">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-9 px-1">
          <div className="editorial-brand-mark flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden">
            <img src="/brand/finanzas-logo.png" alt="Logo de Finanzas" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="editorial-wordmark text-xl text-white leading-none">Finanzas</h1>
            <span className="mt-1 block text-[11px] text-white/[0.45] tracking-[0.16em] uppercase font-semibold">Personal</span>
          </div>
        </div>

        {/* Global Period Selector */}
        <div className="editorial-period mb-7 p-3.5 rounded-lg">
          <label className="block text-[11px] font-semibold text-white/[0.45] uppercase tracking-[0.13em] mb-2">Periodo activo</label>
          <div className="flex gap-2">
            <select
              value={month}
              onChange={handleMonthChange}
              className="flex-1 py-2 px-2.5 bg-white/5 border border-white/10 rounded-md text-xs font-semibold focus:ring-1 focus:ring-brand-400 text-white"
            >
              {months.map(m => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={handleYearChange}
              className="py-2 px-2.5 bg-white/5 border border-white/10 rounded-md text-xs font-semibold focus:ring-1 focus:ring-brand-400 text-white"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1" aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`editorial-nav-item w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'editorial-nav-item-active text-white'
                    : 'text-white/[0.58] hover:text-white hover:bg-white/[0.045]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-brand-300' : 'text-white/[0.38]'} strokeWidth={1.8} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User profile & Actions */}
        <div className="pt-5 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-white/10">
              {user?.avatarData ? <img src={user.avatarData} alt="Foto de perfil" className="w-full h-full object-cover" /> : (user?.name?.slice(0, 1).toUpperCase() || user?.email?.slice(0, 1).toUpperCase())}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white/[0.85] truncate">{user?.name || 'Usuario'}</p>
              <p className="text-[11px] text-white/[0.38] truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleContentVisibility}
              className="editorial-sidebar-action flex-1 py-2 px-3 rounded-md flex items-center justify-center transition-colors cursor-pointer"
              title={contentVisible ? 'Ocultar información financiera' : 'Mostrar información financiera'}
              aria-label={contentVisible ? 'Ocultar información financiera' : 'Mostrar información financiera'}
              aria-pressed={!contentVisible}
            >
              {contentVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              onClick={toggleTheme}
              className="editorial-sidebar-action flex-1 py-2 px-3 rounded-md flex items-center justify-center transition-colors cursor-pointer"
              title={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="editorial-sidebar-action py-2 px-3 text-red-300 rounded-md flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Color theme selectors */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-white/[0.35] uppercase tracking-[0.13em] block">Color de acento</span>
            <div className="flex items-center justify-between gap-1 p-1.5 bg-white/[0.035] rounded-lg border border-white/[0.06]">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  style={{ backgroundColor: t.hex }}
                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center ${
                    colorTheme === t.id
                      ? 'border-white scale-110 ring-2 ring-white/20'
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
      <header className="editorial-mobile-header fixed inset-x-0 top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between gap-3 px-3 pt-[env(safe-area-inset-top)] lg:hidden sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menú principal"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200/70 text-slate-700 transition-colors hover:bg-white/70 active:bg-slate-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Menu size={23} />
          </button>
          <span className="editorial-wordmark text-xl text-slate-900 dark:text-white">Finanzas</span>
        </div>

        <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200/70 bg-white/[0.45] p-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-900/60">
          <select
            aria-label="Mes activo"
            value={month}
            onChange={handleMonthChange}
            className="min-h-9 rounded-md border-0 bg-transparent px-1.5 pr-5 font-semibold text-slate-700 focus:ring-1 focus:ring-brand-500 dark:text-slate-300"
          >
            {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
          </select>
          <select
            aria-label="Año activo"
            value={year}
            onChange={handleYearChange}
            className="min-h-9 rounded-md border-0 bg-transparent px-1.5 pr-5 font-semibold text-slate-700 focus:ring-1 focus:ring-brand-500 dark:text-slate-300"
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
            className="editorial-sidebar mobile-drawer-enter absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="editorial-brand-mark flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <img src="/brand/finanzas-logo.png" alt="" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-white">{user?.name || 'Usuario'}</p>
                  <p className="truncate text-[11px] text-white/40">{user?.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/[0.55] hover:bg-white/[0.06] hover:text-white" aria-label="Cerrar menú">
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
                    className={`editorial-nav-item flex min-h-12 w-full items-center gap-3 rounded-md px-3.5 text-left text-sm font-semibold transition-colors ${
                      isActive
                        ? 'editorial-nav-item-active text-white'
                        : 'text-white/60 hover:bg-white/[0.045] hover:text-white'
                    }`}
                  >
                    <Icon size={19} className={isActive ? 'text-brand-300' : 'text-white/[0.38]'} strokeWidth={1.8} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-4 border-t border-white/10 p-4">
              <button
                type="button"
                onClick={toggleContentVisibility}
                className="flex min-h-12 w-full items-center justify-between rounded-xl bg-white/10 px-3.5 text-sm font-bold text-slate-100 transition-colors hover:bg-white/15"
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
                className="flex min-h-12 w-full items-center justify-between rounded-xl bg-white/[0.06] px-3.5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10"
              >
                <span className="flex items-center gap-3">{dark ? <Sun size={19} /> : <Moon size={19} />}{dark ? 'Usar modo claro' : 'Usar modo oscuro'}</span>
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${dark ? 'bg-brand-600' : 'bg-slate-300'}`} aria-hidden="true">
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-4' : ''}`} />
                </span>
              </button>

              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 text-xs font-bold text-red-300 hover:bg-red-400/10"
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

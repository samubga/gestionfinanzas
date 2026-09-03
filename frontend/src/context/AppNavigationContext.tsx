import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'finance-app-navigation';
const HISTORY_KEY = 'financeAppNavigation';

export const APP_TABS = [
  'dashboard',
  'accounts',
  'transactions',
  'stats',
  'investments',
  'categories',
  'backup',
  'forecasts',
] as const;

export type AppTab = (typeof APP_TABS)[number];

interface NavigationSnapshot {
  tab: AppTab;
  year: number;
  month: number;
}

interface AppNavigationContextType extends NavigationSnapshot {
  setActiveTab: (tab: string) => void;
  setPeriod: (year: number, month: number) => void;
}

const AppNavigationContext = createContext<AppNavigationContextType | undefined>(undefined);

const defaultSnapshot = (): NavigationSnapshot => {
  const now = new Date();
  return {
    tab: 'dashboard',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

const isAppTab = (value: unknown): value is AppTab =>
  typeof value === 'string' && APP_TABS.includes(value as AppTab);

const parseSnapshot = (value: unknown): NavigationSnapshot | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<NavigationSnapshot>;
  if (
    !isAppTab(candidate.tab) ||
    !Number.isInteger(candidate.year) ||
    !Number.isInteger(candidate.month) ||
    (candidate.year as number) < 1900 ||
    (candidate.year as number) > 9999 ||
    (candidate.month as number) < 1 ||
    (candidate.month as number) > 12
  ) {
    return null;
  }

  return candidate as NavigationSnapshot;
};

const snapshotFromHistory = (state: unknown): NavigationSnapshot | null => {
  if (!state || typeof state !== 'object') return null;
  return parseSnapshot((state as Record<string, unknown>)[HISTORY_KEY]);
};

const snapshotFromStorage = (): NavigationSnapshot | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseSnapshot(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

const initialSnapshot = (): NavigationSnapshot =>
  snapshotFromHistory(window.history.state) ?? snapshotFromStorage() ?? defaultSnapshot();

const snapshotsMatch = (left: NavigationSnapshot, right: NavigationSnapshot) =>
  left.tab === right.tab && left.year === right.year && left.month === right.month;

const historyStateFor = (snapshot: NavigationSnapshot) => {
  const currentState = window.history.state;
  const state = currentState && typeof currentState === 'object' ? currentState : {};
  return { ...state, [HISTORY_KEY]: snapshot };
};

const persistSnapshot = (snapshot: NavigationSnapshot) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // La navegación sigue funcionando aunque el almacenamiento esté bloqueado.
  }
};

export const AppNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [navigation, setNavigation] = useState<NavigationSnapshot>(initialSnapshot);
  const navigationRef = useRef(navigation);

  const applySnapshot = useCallback((snapshot: NavigationSnapshot) => {
    navigationRef.current = snapshot;
    setNavigation(snapshot);
    persistSnapshot(snapshot);
  }, []);

  useEffect(() => {
    if (loading || !user || new URLSearchParams(window.location.search).has('resetToken')) {
      return undefined;
    }

    const historySnapshot = snapshotFromHistory(window.history.state);

    if (historySnapshot) {
      if (!snapshotsMatch(historySnapshot, navigationRef.current)) {
        applySnapshot(historySnapshot);
      }
    } else {
      const base = defaultSnapshot();
      window.history.replaceState(historyStateFor(base), '');

      // En una reapertura restauramos la última pantalla, pero dejamos el
      // dashboard como paso anterior para que Atrás no cierre la PWA de golpe.
      if (!snapshotsMatch(base, navigationRef.current)) {
        window.history.pushState(historyStateFor(navigationRef.current), '');
      } else {
        applySnapshot(base);
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      const snapshot = snapshotFromHistory(event.state);
      if (snapshot) applySnapshot(snapshot);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applySnapshot, loading, user]);

  const pushSnapshot = useCallback((snapshot: NavigationSnapshot) => {
    if (snapshotsMatch(snapshot, navigationRef.current)) return;

    window.history.pushState(historyStateFor(snapshot), '');
    applySnapshot(snapshot);
  }, [applySnapshot]);

  const setActiveTab = useCallback((tab: string) => {
    if (!isAppTab(tab)) return;
    pushSnapshot({ ...navigationRef.current, tab });
  }, [pushSnapshot]);

  const setPeriod = useCallback((year: number, month: number) => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;
    pushSnapshot({ ...navigationRef.current, year, month });
  }, [pushSnapshot]);

  return (
    <AppNavigationContext.Provider value={{ ...navigation, setActiveTab, setPeriod }}>
      {children}
    </AppNavigationContext.Provider>
  );
};

export const useAppNavigation = () => {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw new Error('useAppNavigation debe usarse dentro de AppNavigationProvider');
  }
  return context;
};

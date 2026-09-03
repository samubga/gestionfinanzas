import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import StatsPage from './components/StatsPage';
import CategoryTagManager from './components/CategoryTagManager';
import BackupManager from './components/BackupManager';
import ExpenseForm from './components/ExpenseForm';
import ForecastManager from './components/ForecastManager';
import InvestmentsManager from './components/InvestmentsManager';
import AccountManager from './components/AccountManager';
import ResetPassword from './components/ResetPassword';
import { NotificationProvider } from './context/NotificationContext';
import { AppNavigationProvider, useAppNavigation } from './context/AppNavigationContext';
import { PrivacyProvider, usePrivacy } from './context/PrivacyContext';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { tab: activeTab, setActiveTab } = useAppNavigation();
  const { contentHidden } = usePrivacy();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [formInitialType, setFormInitialType] = useState<'expense' | 'income' | 'transfer'>('expense');

  // Theme state from Context
  const { dark, toggleTheme } = useTheme();
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');

  useEffect(() => {
    if (!contentHidden) return;
    setIsFormOpen(false);
    setEditTx(null);
  }, [contentHidden]);

  const handleOpenAddForm = (type: 'expense' | 'income' | 'transfer' = 'expense') => {
    setEditTx(null);
    setFormInitialType(type);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (transaction: any) => {
    setEditTx(transaction);
    setIsFormOpen(true);
  };

  // Full screen loading
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-950 transition-colors">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Cargando aplicación...</p>
      </div>
    );
  }

  // Not authenticated screen
  if (resetToken) {
    return <ResetPassword token={resetToken} />;
  }

  if (!user) {
    return <Auth />;
  }

  // Main application content view switcher
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'accounts':
        return <AccountManager />;
      case 'transactions':
        return (
          <Transactions
            onOpenAddExpense={handleOpenAddForm}
            onOpenEditExpense={handleOpenEditForm}
          />
        );
      case 'stats':
        return <StatsPage />;
      case 'investments':
        return <InvestmentsManager />;
      case 'categories':
        return <CategoryTagManager />;
      case 'backup':
        return <BackupManager />;
      case 'forecasts':
        return <ForecastManager />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col lg:flex-row transition-colors duration-200">
      {/* Navigation Layout (Original Left Sidebar) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dark={dark}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {renderView()}
      </main>

      {/* GLOBAL MODAL TRANSACTION FORM */}
      <ExpenseForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditTx(null);
        }}
        editTransaction={editTx}
        type={formInitialType}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <ThemeProvider>
          <PrivacyProvider>
            <AppNavigationProvider>
              <FinanceProvider>
                <AppContent />
              </FinanceProvider>
            </AppNavigationProvider>
          </PrivacyProvider>
        </ThemeProvider>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;

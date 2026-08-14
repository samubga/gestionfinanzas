import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import FloatingNavbar from './components/FloatingNavbar';
import Dashboard from './components/Dashboard';
import BentoDashboard from './components/BentoDashboard';
import Transactions from './components/Transactions';
import StatsPage from './components/StatsPage';
import CategoryTagManager from './components/CategoryTagManager';
import BackupManager from './components/BackupManager';
import ExpenseForm from './components/ExpenseForm';
import ForecastManager from './components/ForecastManager';
import InvestmentsManager from './components/InvestmentsManager';
import AccountManager from './components/AccountManager';
import { Plus } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [formInitialType, setFormInitialType] = useState<'expense' | 'income' | 'transfer'>('expense');

  // Theme & Layout state from Context
  const { dark, toggleTheme, layoutMode } = useTheme();

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
  if (!user) {
    return <Auth />;
  }

  // Main application content view switcher
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return layoutMode === 'bento' ? <BentoDashboard /> : <Dashboard />;
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
        return layoutMode === 'bento' ? <BentoDashboard /> : <Dashboard />;
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex transition-colors duration-200 ${
        layoutMode === 'bento' ? 'flex-col' : 'flex-col md:flex-row'
      }`}
    >
      {/* Navigation Layout */}
      {layoutMode === 'bento' ? (
        <FloatingNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAddExpense={() => handleOpenAddForm('expense')}
        />
      ) : (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          dark={dark}
          toggleTheme={toggleTheme}
          onOpenAddExpense={() => handleOpenAddForm('expense')}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {renderView()}
      </main>

      {/* DESKTOP FLOATING ACTION BUTTON (Shown in Classic mode or when scrolling) */}
      {layoutMode === 'classic' && (
        <button
          onClick={() => handleOpenAddForm('expense')}
          className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full items-center justify-center shadow-xl shadow-brand-500/30 active:scale-95 transition-all hover:scale-105 cursor-pointer font-bold"
          title="Añadir Transacción"
        >
          <Plus size={24} />
        </button>
      )}

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
    <ThemeProvider>
      <AuthProvider>
        <FinanceProvider>
          <AppContent />
        </FinanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

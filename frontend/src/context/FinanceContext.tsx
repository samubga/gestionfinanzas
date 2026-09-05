import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { Expense, Income, Category, Tag, DashboardData, Investment, BankAccount, Account, Bank, Transfer, YearlyStatsData, HistoricalStatsData } from '../types';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { useAppNavigation } from './AppNavigationContext';

interface FinanceContextType {
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  tags: Tag[];
  stats: DashboardData | null;
  yearlyStats: YearlyStatsData | null;
  historicalStats: HistoricalStatsData | null;
  loading: boolean;
  statsLoading: boolean;
  yearlyStatsLoading: boolean;
  historicalStatsLoading: boolean;
  year: number;
  month: number;
  setPeriod: (year: number, month: number) => void;
  // Filters
  filterStartDate: string;
  setFilterStartDate: (date: string) => void;
  filterEndDate: string;
  setFilterEndDate: (date: string) => void;
  filterCategoryId: string;
  setFilterCategoryId: (id: string) => void;
  filterTags: string;
  setFilterTags: (tags: string) => void;
  filterSearch: string;
  setFilterSearch: (search: string) => void;
  filterBank: string;
  setFilterBank: (bank: string) => void;
  filterMinAmount: string;
  setFilterMinAmount: (amount: string) => void;
  filterMaxAmount: string;
  setFilterMaxAmount: (amount: string) => void;
  sortField: string;
  setSortField: (field: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (dir: 'asc' | 'desc') => void;
  resetFilters: () => void;
  // Operations
  refreshAll: () => void;
  addExpense: (data: any) => Promise<void>;
  updateExpense: (id: string, data: any) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  duplicateExpense: (id: string) => Promise<void>;
  addIncome: (data: any) => Promise<void>;
  updateIncome: (id: string, data: any) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addCategory: (data: { name: string; color: string; icon: string; iconStrokeWidth: number; type: 'expense' | 'income' }) => Promise<Category>;
  updateCategory: (id: string, data: { name: string; color: string; icon: string; iconStrokeWidth: number }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addTag: (data: { name: string }) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  saveSavingGoal: (amount: number) => Promise<void>;
  deleteExpensesBulk: (ids: string[]) => Promise<void>;
  deleteIncomesBulk: (ids: string[]) => Promise<void>;
  // Transfers
  transfers: Transfer[];
  addTransfer: (data: any) => Promise<void>;
  updateTransfer: (id: string, data: any) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
  // Investments
  investments: Investment[];
  investmentsLoading: boolean;
  fetchInvestments: (filters?: any) => Promise<void>;
  addInvestment: (data: any) => Promise<void>;
  updateInvestment: (id: string, data: any) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  // Bank accounts
  bankAccounts: BankAccount[];
  bankAccountsLoading: boolean;
  fetchBankAccounts: () => Promise<void>;
  addBankAccount: (data: { name: string; startingBalance: number }) => Promise<void>;
  updateBankAccount: (id: string, data: { name: string; startingBalance: number }) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  // Accounts & Banks
  accounts: Account[];
  banks: Bank[];
  accountsLoading: boolean;
  fetchAccounts: () => Promise<void>;
  fetchBanks: () => Promise<void>;
  addAccount: (data: Partial<Account>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCustomBank: (data: { name: string; color?: string; logoUrl?: string }) => Promise<Bank>;
  fetchYearlyStats: (year: number) => Promise<void>;
  fetchHistoricalStats: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const notification = useNotification();
  const { year, month, setPeriod } = useAppNavigation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [yearlyStats, setYearlyStats] = useState<YearlyStatsData | null>(null);
  const [historicalStats, setHistoricalStats] = useState<HistoricalStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [yearlyStatsLoading, setYearlyStatsLoading] = useState(false);
  const [historicalStatsLoading, setHistoricalStatsLoading] = useState(false);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const runAction = async <T,>(action: () => Promise<T>, successMessage: string, fallbackError: string): Promise<T> => {
    try {
      const result = await action();
      notification.success(successMessage);
      return result;
    } catch (error: any) {
      notification.error(error.response?.data?.error || fallbackError);
      throw error;
    }
  };

  const now = new Date();

  // Helper to format dates in local timezone as YYYY-MM-DD
  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState(() => {
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    return formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterBank, setFilterBank] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Update date filters when period changes
  useEffect(() => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    setFilterStartDate(formatLocalDate(start));
    setFilterEndDate(formatLocalDate(end));
  }, [year, month]);

  const resetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCategoryId('');
    setFilterTags('');
    setFilterSearch('');
    setFilterBank('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setSortField('date');
    setSortDirection('desc');
  };

  const fetchCategories = async () => {
    if (!user) return;
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error al obtener categorías:', err);
    }
  };

  const fetchTags = async () => {
    if (!user) return;
    try {
      const res = await api.get('/tags');
      setTags(res.data);
    } catch (err) {
      console.error('Error al obtener etiquetas:', err);
    }
  };

  const fetchExpenses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      if (filterCategoryId) params.categoryId = filterCategoryId;
      if (filterTags) params.tags = filterTags;
      if (filterSearch) params.search = filterSearch;
      if (filterBank) params.bank = filterBank;
      if (filterMinAmount) params.minAmount = filterMinAmount;
      if (filterMaxAmount) params.maxAmount = filterMaxAmount;

      const res = await api.get('/expenses', { params });
      setExpenses(res.data);
    } catch (err) {
      console.error('Error al obtener gastos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomes = async () => {
    if (!user) return;
    try {
      const params: any = {};
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      if (filterCategoryId) params.categoryId = filterCategoryId;
      if (filterSearch) params.search = filterSearch;
      if (filterBank) params.bank = filterBank;
      if (filterMinAmount) params.minAmount = filterMinAmount;
      if (filterMaxAmount) params.maxAmount = filterMaxAmount;

      const res = await api.get('/incomes', { params });
      setIncomes(res.data);
    } catch (err) {
      console.error('Error al obtener ingresos:', err);
    }
  };

  const fetchTransfers = async () => {
    if (!user) return;
    try {
      const params: any = {};
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      if (filterSearch) params.search = filterSearch;
      if (filterMinAmount) params.minAmount = filterMinAmount;
      if (filterMaxAmount) params.maxAmount = filterMaxAmount;

      const res = await api.get('/transfers', { params });
      setTransfers(res.data);
    } catch (err) {
      console.error('Error al obtener transferencias:', err);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const res = await api.get('/stats/dashboard', {
        params: { year, month }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error al obtener estadísticas:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchYearlyStats = async (selectedYear: number) => {
    if (!user) return;
    setYearlyStatsLoading(true);
    try {
      const res = await api.get('/stats/yearly', {
        params: { year: selectedYear }
      });
      setYearlyStats(res.data);
    } catch (err) {
      console.error('Error al obtener estadísticas anuales:', err);
    } finally {
      setYearlyStatsLoading(false);
    }
  };

  const fetchHistoricalStats = async () => {
    if (!user) return;
    setHistoricalStatsLoading(true);
    try {
      const res = await api.get('/stats/historical');
      setHistoricalStats(res.data);
    } catch (err) {
      console.error('Error al obtener estadísticas históricas:', err);
    } finally {
      setHistoricalStatsLoading(false);
    }
  };

  const fetchInvestments = async (filters: any = {}) => {
    if (!user) return;
    setInvestmentsLoading(true);
    try {
      const res = await api.get('/investments', { params: filters });
      setInvestments(res.data);
    } catch (err) {
      console.error('Error al obtener inversiones:', err);
    } finally {
      setInvestmentsLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    if (!user) return;
    setBankAccountsLoading(true);
    try {
      const res = await api.get('/bank-accounts');
      setBankAccounts(res.data);
    } catch (err) {
      console.error('Error al obtener cuentas bancarias:', err);
    } finally {
      setBankAccountsLoading(false);
    }
  };

  const addBankAccount = async (data: { name: string; startingBalance: number }) => {
    await runAction(async () => {
      await api.post('/bank-accounts', data);
      await fetchBankAccounts();
      fetchStats();
    }, 'Cuenta bancaria creada correctamente.', 'No se pudo crear la cuenta bancaria.');
  };

  const updateBankAccount = async (id: string, data: { name: string; startingBalance: number }) => {
    await runAction(async () => {
      await api.put(`/bank-accounts/${id}`, data);
      await fetchBankAccounts();
      fetchStats();
      fetchExpenses();
      fetchIncomes();
    }, 'Cuenta bancaria actualizada correctamente.', 'No se pudo actualizar la cuenta bancaria.');
  };

  const deleteBankAccount = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/bank-accounts/${id}`);
      await fetchBankAccounts();
      fetchStats();
      fetchExpenses();
      fetchIncomes();
    }, 'Cuenta bancaria eliminada correctamente.', 'No se pudo eliminar la cuenta bancaria.');
  };

  const fetchAccounts = async () => {
    if (!user) return;
    setAccountsLoading(true);
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error('Error al obtener cuentas:', err);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchBanks = async () => {
    if (!user) return;
    try {
      const res = await api.get('/banks');
      setBanks(res.data);
    } catch (err) {
      console.error('Error al obtener bancos:', err);
    }
  };

  const addAccount = async (data: Partial<Account>) => {
    await runAction(async () => {
      await api.post('/accounts', data);
      await fetchAccounts();
      fetchStats();
    }, 'Cuenta creada correctamente.', 'No se pudo crear la cuenta.');
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    await runAction(async () => {
      await api.put(`/accounts/${id}`, data);
      await fetchAccounts();
      fetchStats();
      fetchExpenses();
      fetchIncomes();
    }, 'Cuenta actualizada correctamente.', 'No se pudo actualizar la cuenta.');
  };

  const deleteAccount = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/accounts/${id}`);
      await fetchAccounts();
      fetchStats();
      fetchExpenses();
      fetchIncomes();
    }, 'Cuenta eliminada correctamente.', 'No se pudo eliminar la cuenta.');
  };

  const addCustomBank = async (data: { name: string; color?: string; logoUrl?: string }) => {
    return runAction(async () => {
      const res = await api.post('/banks', data);
      await fetchBanks();
      return res.data;
    }, 'Banco personalizado creado correctamente.', 'No se pudo crear el banco personalizado.');
  };

  // Carga inicial y por cambio de periodo. Las transacciones se cargan
  // exclusivamente en el efecto de filtros inferior, cuando el rango de
  // fechas ya se ha sincronizado con el periodo seleccionado.
  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchTags();
      fetchStats();
      fetchYearlyStats(year);
      fetchHistoricalStats();
      fetchInvestments();
      fetchBankAccounts();
      fetchAccounts();
      fetchBanks();
    } else {
      setExpenses([]);
      setIncomes([]);
      setCategories([]);
      setTags([]);
      setStats(null);
      setYearlyStats(null);
      setHistoricalStats(null);
      setInvestments([]);
      setBankAccounts([]);
      setAccounts([]);
      setBanks([]);
      setTransfers([]);
    }
  }, [user, year, month]);

  // Carga reactiva de transacciones al cambiar los filtros. Al cambiar el
  // periodo, el efecto anterior actualiza primero filterStartDate y
  // filterEndDate; así evitamos lanzar una petición con el mes anterior.
  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchIncomes();
      fetchTransfers();
    }
  }, [user, filterStartDate, filterEndDate, filterCategoryId, filterTags, filterSearch, filterBank, filterMinAmount, filterMaxAmount]);

  const refreshAll = () => {
    fetchCategories();
    fetchTags();
    fetchExpenses();
    fetchIncomes();
    fetchStats();
    fetchYearlyStats(year);
    fetchHistoricalStats();
    fetchInvestments();
    fetchBankAccounts();
    fetchAccounts();
    fetchBanks();
    fetchTransfers();
  };

  // GASTOS
  const addExpense = async (data: any) => {
    await runAction(async () => {
      await api.post('/expenses', data);
      refreshAll();
    }, 'Gasto guardado correctamente.', 'No se pudo guardar el gasto.');
  };

  const updateExpense = async (id: string, data: any) => {
    await runAction(async () => {
      await api.put(`/expenses/${id}`, data);
      refreshAll();
    }, 'Gasto actualizado correctamente.', 'No se pudo actualizar el gasto.');
  };

  const deleteExpense = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/expenses/${id}`);
      refreshAll();
    }, 'Gasto eliminado correctamente.', 'No se pudo eliminar el gasto.');
  };

  const duplicateExpense = async (id: string) => {
    await runAction(async () => {
      await api.post(`/expenses/${id}/duplicate`);
      refreshAll();
    }, 'Movimiento duplicado correctamente.', 'No se pudo duplicar el movimiento.');
  };

  // INGRESOS
  const addIncome = async (data: any) => {
    await runAction(async () => {
      await api.post('/incomes', data);
      refreshAll();
    }, 'Ingreso guardado correctamente.', 'No se pudo guardar el ingreso.');
  };

  const updateIncome = async (id: string, data: any) => {
    await runAction(async () => {
      await api.put(`/incomes/${id}`, data);
      refreshAll();
    }, 'Ingreso actualizado correctamente.', 'No se pudo actualizar el ingreso.');
  };

  const deleteIncome = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/incomes/${id}`);
      refreshAll();
    }, 'Ingreso eliminado correctamente.', 'No se pudo eliminar el ingreso.');
  };

  const deleteExpensesBulk = async (ids: string[]) => {
    await runAction(async () => {
      await api.post('/expenses/bulk-delete', { ids });
      refreshAll();
    }, `${ids.length} gastos eliminados correctamente.`, 'No se pudieron eliminar los gastos.');
  };

  const deleteIncomesBulk = async (ids: string[]) => {
    await runAction(async () => {
      await api.post('/incomes/bulk-delete', { ids });
      refreshAll();
    }, `${ids.length} ingresos eliminados correctamente.`, 'No se pudieron eliminar los ingresos.');
  };

  // TRANSFERENCIAS
  const addTransfer = async (data: any) => {
    await runAction(async () => {
      await api.post('/transfers', data);
      refreshAll();
    }, 'Traspaso guardado correctamente.', 'No se pudo guardar el traspaso.');
  };

  const updateTransfer = async (id: string, data: any) => {
    await runAction(async () => {
      await api.put(`/transfers/${id}`, data);
      refreshAll();
    }, 'Traspaso actualizado correctamente.', 'No se pudo actualizar el traspaso.');
  };

  const deleteTransfer = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/transfers/${id}`);
      refreshAll();
    }, 'Traspaso eliminado correctamente.', 'No se pudo eliminar el traspaso.');
  };

  // CATEGORÍAS
  const addCategory = async (data: { name: string; color: string; icon: string; iconStrokeWidth: number; type: 'expense' | 'income' }) => {
    return runAction(async () => {
      const res = await api.post('/categories', data);
      await fetchCategories();
      return res.data;
    }, 'Categoría creada correctamente.', 'No se pudo crear la categoría.');
  };

  const updateCategory = async (id: string, data: { name: string; color: string; icon: string; iconStrokeWidth: number }) => {
    await runAction(async () => {
      await api.put(`/categories/${id}`, data);
      await fetchCategories();
      fetchExpenses();
      fetchStats();
    }, 'Categoría actualizada correctamente.', 'No se pudo actualizar la categoría.');
  };

  const deleteCategory = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/categories/${id}`);
      await fetchCategories();
      fetchExpenses();
      fetchStats();
    }, 'Categoría eliminada correctamente.', 'No se pudo eliminar la categoría.');
  };

  // ETIQUETAS
  const addTag = async (data: { name: string }) => {
    return runAction(async () => {
      const res = await api.post('/tags', data);
      await fetchTags();
      return res.data;
    }, 'Etiqueta creada correctamente.', 'No se pudo crear la etiqueta.');
  };

  const deleteTag = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/tags/${id}`);
      await fetchTags();
      fetchExpenses();
      fetchStats();
    }, 'Etiqueta eliminada correctamente.', 'No se pudo eliminar la etiqueta.');
  };

  // OBJETIVO DE AHORRO
  const saveSavingGoal = async (amount: number) => {
    await runAction(async () => {
      await api.post('/stats/saving-goal', { year, month, amount });
      fetchStats();
    }, 'Objetivo de ahorro guardado correctamente.', 'No se pudo guardar el objetivo de ahorro.');
  };

  // OPERACIONES DE INVERSIONES
  const addInvestment = async (data: any) => {
    await runAction(async () => {
      await api.post('/investments', data);
      refreshAll();
    }, 'Inversión creada correctamente.', 'No se pudo crear la inversión.');
  };

  const updateInvestment = async (id: string, data: any) => {
    await runAction(async () => {
      await api.put(`/investments/${id}`, data);
      refreshAll();
    }, 'Inversión actualizada correctamente.', 'No se pudo actualizar la inversión.');
  };

  const deleteInvestment = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/investments/${id}`);
      refreshAll();
    }, 'Inversión eliminada correctamente.', 'No se pudo eliminar la inversión.');
  };

  return (
    <FinanceContext.Provider
      value={{
        expenses,
        incomes,
        categories,
        tags,
        stats,
        yearlyStats,
        historicalStats,
        loading,
        statsLoading,
        yearlyStatsLoading,
        historicalStatsLoading,
        year,
        month,
        setPeriod,
        filterStartDate,
        setFilterStartDate,
        filterEndDate,
        setFilterEndDate,
        filterCategoryId,
        setFilterCategoryId,
        filterTags,
        setFilterTags,
        filterSearch,
        setFilterSearch,
        filterBank,
        setFilterBank,
        filterMinAmount,
        setFilterMinAmount,
        filterMaxAmount,
        setFilterMaxAmount,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        resetFilters,
        refreshAll,
        addExpense,
        updateExpense,
        deleteExpense,
        duplicateExpense,
        addIncome,
        updateIncome,
        deleteIncome,
        addCategory,
        updateCategory,
        deleteCategory,
        addTag,
        deleteTag,
        saveSavingGoal,
        deleteExpensesBulk,
        deleteIncomesBulk,
        transfers,
        addTransfer,
        updateTransfer,
        deleteTransfer,
        investments,
        investmentsLoading,
        fetchInvestments,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        bankAccounts,
        bankAccountsLoading,
        fetchBankAccounts,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        accounts,
        banks,
        accountsLoading,
        fetchAccounts,
        fetchBanks,
        addAccount,
        updateAccount,
        deleteAccount,
        addCustomBank,
        fetchYearlyStats,
        fetchHistoricalStats,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance debe usarse dentro de un FinanceProvider');
  }
  return context;
};

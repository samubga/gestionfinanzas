import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { Expense, Income, Category, Tag, DashboardData } from '../types';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  expenses: Expense[];
  incomes: Income[];
  categories: Category[];
  tags: Tag[];
  stats: DashboardData | null;
  loading: boolean;
  statsLoading: boolean;
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
  addCategory: (data: { name: string; color: string; type: 'expense' | 'income' }) => Promise<Category>;
  updateCategory: (id: string, data: { name: string; color: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addTag: (data: { name: string }) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  saveSavingGoal: (amount: number) => Promise<void>;
  deleteExpensesBulk: (ids: string[]) => Promise<void>;
  deleteIncomesBulk: (ids: string[]) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const setPeriod = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const resetFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterCategoryId('');
    setFilterTags('');
    setFilterSearch('');
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

      // Si no hay filtros aplicados, ver solo el periodo seleccionado
      if (!filterStartDate && !filterEndDate && !filterCategoryId && !filterTags && !filterSearch) {
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        // Desfase horario local a string ISO YYYY-MM-DD
        const offset = start.getTimezoneOffset();
        const localStart = new Date(start.getTime() - (offset * 60 * 1000));
        params.startDate = localStart.toISOString().split('T')[0];

        const end = new Date(year, month, 0, 23, 59, 59, 999);
        const localEnd = new Date(end.getTime() - (offset * 60 * 1000));
        params.endDate = localEnd.toISOString().split('T')[0];
      }

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

      if (!filterStartDate && !filterEndDate && !filterCategoryId && !filterSearch) {
        const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const offset = start.getTimezoneOffset();
        const localStart = new Date(start.getTime() - (offset * 60 * 1000));
        params.startDate = localStart.toISOString().split('T')[0];

        const end = new Date(year, month, 0, 23, 59, 59, 999);
        const localEnd = new Date(end.getTime() - (offset * 60 * 1000));
        params.endDate = localEnd.toISOString().split('T')[0];
      }

      const res = await api.get('/incomes', { params });
      setIncomes(res.data);
    } catch (err) {
      console.error('Error al obtener ingresos:', err);
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

  // Carga inicial y por cambio de periodo
  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchTags();
      fetchStats();
    } else {
      setExpenses([]);
      setIncomes([]);
      setCategories([]);
      setTags([]);
      setStats(null);
    }
  }, [user, year, month]);

  // Carga reactiva de transacciones al cambiar filtros o periodo
  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchIncomes();
    }
  }, [user, year, month, filterStartDate, filterEndDate, filterCategoryId, filterTags, filterSearch]);

  const refreshAll = () => {
    fetchCategories();
    fetchTags();
    fetchExpenses();
    fetchIncomes();
    fetchStats();
  };

  // GASTOS
  const addExpense = async (data: any) => {
    await api.post('/expenses', data);
    refreshAll();
  };

  const updateExpense = async (id: string, data: any) => {
    await api.put(`/expenses/${id}`, data);
    refreshAll();
  };

  const deleteExpense = async (id: string) => {
    await api.delete(`/expenses/${id}`);
    refreshAll();
  };

  const duplicateExpense = async (id: string) => {
    await api.post(`/expenses/${id}/duplicate`);
    refreshAll();
  };

  // INGRESOS
  const addIncome = async (data: any) => {
    await api.post('/incomes', data);
    refreshAll();
  };

  const updateIncome = async (id: string, data: any) => {
    await api.put(`/incomes/${id}`, data);
    refreshAll();
  };

  const deleteIncome = async (id: string) => {
    await api.delete(`/incomes/${id}`);
    refreshAll();
  };

  const deleteExpensesBulk = async (ids: string[]) => {
    await api.post('/expenses/bulk-delete', { ids });
    refreshAll();
  };

  const deleteIncomesBulk = async (ids: string[]) => {
    await api.post('/incomes/bulk-delete', { ids });
    refreshAll();
  };

  // CATEGORÍAS
  const addCategory = async (data: { name: string; color: string; type: 'expense' | 'income' }) => {
    const res = await api.post('/categories', data);
    await fetchCategories();
    return res.data;
  };

  const updateCategory = async (id: string, data: { name: string; color: string }) => {
    await api.put(`/categories/${id}`, data);
    await fetchCategories();
    fetchExpenses();
    fetchStats();
  };

  const deleteCategory = async (id: string) => {
    await api.delete(`/categories/${id}`);
    await fetchCategories();
    fetchExpenses();
    fetchStats();
  };

  // ETIQUETAS
  const addTag = async (data: { name: string }) => {
    const res = await api.post('/tags', data);
    await fetchTags();
    return res.data;
  };

  const deleteTag = async (id: string) => {
    await api.delete(`/tags/${id}`);
    await fetchTags();
    fetchExpenses();
    fetchStats();
  };

  // OBJETIVO DE AHORRO
  const saveSavingGoal = async (amount: number) => {
    await api.post('/stats/saving-goal', { year, month, amount });
    fetchStats();
  };

  return (
    <FinanceContext.Provider
      value={{
        expenses,
        incomes,
        categories,
        tags,
        stats,
        loading,
        statsLoading,
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

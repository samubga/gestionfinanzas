export interface User {
  id: string;
  email: string;
  name?: string | null;
  startingBalance: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: 'expense' | 'income';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod?: string | null;
  notes?: string | null;
  userId: string;
  categoryId: string;
  category: Category;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Income {
  id: string;
  amount: number;
  date: string;
  description: string;
  userId: string;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlySummary {
  id: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingGoal: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  currentMonth: {
    year: number;
    month: number;
    income: number;
    expense: number;
    savings: number;
    savingGoal: number;
    incomeChangePercent: number;
    expenseChangePercent: number;
  };
  availableBalance: number;
  averages: {
    dailyAverage: number;
    monthlyAverage: number;
    prediction: number;
  };
  categoryBreakdown: Array<{
    id: string;
    name: string;
    color: string;
    amount: number;
  }>;
  tagBreakdown: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  topExpenses: Array<Expense>;
  evolution: Array<{
    year: number;
    month: number;
    label: string;
    income: number;
    expense: number;
    savings: number;
    goal: number;
  }>;
}

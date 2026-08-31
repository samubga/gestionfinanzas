export interface User {
  id: string;
  email: string;
  name?: string | null;
  startingBalance: number;
  startingBalanceCaixa: number;
  startingBalanceTrade: number;
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
  bank?: string | null;
  imported: boolean;
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
  notes?: string | null;
  bank?: string | null;
  imported: boolean;
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

export interface Investment {
  id: string;
  type: string; // e.g. "Acción", "ETF", "Fondo de inversión", "Criptomoneda", "Derivado"
  name: string;
  ticker?: string | null;
  isin?: string | null;
  exchange?: string | null;
  currency: string;
  units?: number | null;
  unitPrice?: number | null;
  amount: number;
  buyFee: number;
  bank: string;
  startDate: string;
  status: 'active' | 'withdrawn';
  withdrawnAmount?: number | null;
  sellFee?: number | null;
  endDate?: string | null;
  notes?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentTransactionType = 'PURCHASE' | 'SAVEBACK' | 'BONUS_SHARES' | 'CASH_REWARD' | 'DIVIDEND' | 'SALE' | 'TAX' | 'FEE' | 'ADJUSTMENT';

export interface InvestmentTransaction {
  id: string;
  type: InvestmentTransactionType;
  date: string;
  amount: number;
  units?: number | null;
  unitPrice?: number | null;
  fee: number;
  tax: number;
  notes?: string | null;
  investmentId: string;
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
  accountDetails?: AccountDetail[];
  balances?: Record<string, number>;
  startingBalances?: Record<string, number>;
  totalInvestedActive: number;
  totalRealizedGains: number;
  totalFees: number;
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

export interface ExpenseForecast {
  id: string;
  amount: number;
  description: string;
  date?: string | null;
  month: number;
  year: number;
  categoryId?: string | null;
  category?: Category | null;
  tagId?: string | null;
  tag?: Tag | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface ForecastComparisonItem {
  id: string;
  description: string;
  amountEstimated: number;
  date?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  tagId?: string | null;
  tag?: Tag | null;
  amountSpent: number;
  matchedExpenses: MatchedExpense[];
}

export interface ForecastComparison {
  year: number;
  month: number;
  totalEstimated: number;
  totalSpentActual: number;
  totalSpentMatched: number;
  totalUnmatchedAmount: number;
  items: ForecastComparisonItem[];
  unmatchedExpenses: MatchedExpense[];
}

export interface BankAccount {
  id: string;
  name: string;
  startingBalance: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  id: string;
  name: string;
  code?: string | null;
  logoUrl?: string | null;
  color: string;
  isCustom: boolean;
  userId?: string | null;
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CASH' | 'INVESTMENT' | 'CREDIT_CARD' | 'CRYPTO' | 'OTHER';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalance: number;
  currency: string;
  color: string;
  icon: string;
  bankId?: string | null;
  bank?: Bank | null;
  currentBalance?: number;
}

export interface AccountDetail {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  icon: string;
  color: string;
  bankName?: string | null;
  startingBalance: number;
  currentBalance: number;
}

export interface Transfer {
  id: string;
  amount: number;
  date: string;
  description: string;
  notes?: string | null;
  fromAccountId: string;
  fromAccount?: Account | null;
  toAccountId: string;
  toAccount?: Account | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface YearlyStatsData {
  year: number;
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    averageMonthlySavings: number;
  };
  monthlyBreakdown: Array<{
    month: number;
    label: string;
    income: number;
    expense: number;
    savings: number;
    goal: number;
  }>;
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
}

export interface HistoricalStatsData {
  history: Array<{
    year: number;
    month: number;
    label: string;
    cash: number;
    invested: number;
    netWorth: number;
  }>;
}

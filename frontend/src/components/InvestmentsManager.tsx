import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Investment, InvestmentTransaction, InvestmentTransactionType } from '../types';
import api from '../services/api';
import { TrendingUp, TrendingDown, Landmark, Wallet, Plus, Trash2, Pencil, Coins, ArrowRightLeft, CircleHelp, RefreshCw, CircleAlert } from 'lucide-react';
import { InvestmentAnalysisPanel } from './InvestmentAnalysisPanel';

interface MarketQuote {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  previousClose: number | null;
  change: number | null;
  percentChange: number | null;
  marketOpen: boolean | null;
  timestamp?: number | null;
  sourceCurrency?: string;
  conversionRate?: number;
}

interface PortfolioMarketSummary {
  configured: boolean;
  provider: string;
  refreshedAt?: string;
  quotes: Array<{
    investmentId: string;
    units: number | null;
    unitPrice: number | null;
    investmentCurrency: string;
    quote: MarketQuote;
    source?: {
      symbol: string;
      exchange: string | null;
      currency: string;
      usedFallback: boolean;
      originalSymbol?: string;
    };
  }>;
  missingTicker: Array<{ id: string; name: string }>;
  skipped: Array<{ id: string; name: string; ticker: string }>;
  unavailable: Array<{ ticker: string; message: string }>;
}

interface InvestmentMovementSummary {
  investmentId: string;
  movementCount: number;
  grossContributed: number;
  totalFees: number;
  totalTaxes: number;
  netCashRewards: number;
  currentUnits: number;
}

const FieldLabel: React.FC<{ children: React.ReactNode; help: string }> = ({ children, help }) => (
  <div className="mb-1.5 flex items-center gap-1.5">
    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{children}</label>
    <button
      type="button"
      aria-label={`Ayuda: ${children}`}
      className="group relative inline-flex text-slate-400 transition-colors hover:text-brand-500 focus:text-brand-500 focus:outline-none"
    >
      <CircleHelp size={13} strokeWidth={2.25} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-52 rounded-xl bg-slate-800 px-3 py-2 text-left text-[10px] font-medium normal-case leading-relaxed tracking-normal text-white shadow-xl group-hover:block group-focus:block dark:bg-slate-700"
      >
        {help}
      </span>
    </button>
  </div>
);

const transactionTypeLabels: Record<InvestmentTransactionType, string> = {
  PURCHASE: 'Compra / aportación',
  SAVEBACK: 'Saveback',
  BONUS_SHARES: 'Acciones bonificadas',
  CASH_REWARD: 'Recompensa en efectivo',
  DIVIDEND: 'Dividendo',
  SALE: 'Venta',
  TAX: 'Impuesto',
  FEE: 'Comisión',
  ADJUSTMENT: 'Ajuste',
};

export const InvestmentsManager: React.FC = () => {
  const { investments, investmentsLoading, addInvestment, updateInvestment, deleteInvestment, accounts } = useFinance();
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'withdrawn'>('active');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState('Acción');
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [isin, setIsin] = useState('');
  const [exchange, setExchange] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [bank, setBank] = useState('Trade Republic');
  const [notes, setNotes] = useState('');

  // Withdrawal states
  const [withdrawingInv, setWithdrawingInv] = useState<Investment | null>(null);
  const [withdrawnAmount, setWithdrawnAmount] = useState('');
  const [sellFee, setSellFee] = useState('0');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Editing state
  const [editingInv, setEditingInv] = useState<Investment | null>(null);

  // Calculations
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  const withdrawnInvestments = investments.filter(inv => inv.status === 'withdrawn');

  const totalRealizedGains = withdrawnInvestments.reduce((sum, inv) => {
    const profit = (inv.withdrawnAmount || 0) - inv.amount - inv.buyFee - (inv.sellFee || 0);
    return sum + profit;
  }, 0);

  const [marketSummary, setMarketSummary] = useState<PortfolioMarketSummary | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [movementSummaries, setMovementSummaries] = useState<InvestmentMovementSummary[]>([]);
  const [portfolioQuotes, setPortfolioQuotes] = useState<PortfolioMarketSummary | null>(null);
  const totalInvestedActive = movementSummaries.reduce((sum, summary) => sum + summary.grossContributed, 0);
  const totalFees = movementSummaries.reduce((sum, summary) => sum + summary.totalFees, 0);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionError, setTransactionError] = useState('');
  const [transactionType, setTransactionType] = useState<InvestmentTransactionType>('PURCHASE');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionUnits, setTransactionUnits] = useState('');
  const [transactionUnitPrice, setTransactionUnitPrice] = useState('');
  const [transactionFee, setTransactionFee] = useState('0');
  const [transactionTax, setTransactionTax] = useState('0');
  const [transactionNotes, setTransactionNotes] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<InvestmentTransaction | null>(null);
  const [pdfImporting, setPdfImporting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const loadMarketSummary = useCallback(async (investmentId?: string) => {
    if (!investmentId) {
      setMarketSummary(null);
      setMarketError('');
      return;
    }

    setMarketLoading(true);
    setMarketError('');
    try {
      const response = await api.get<PortfolioMarketSummary>('/investments/market/summary', { params: { investmentId } });
      setMarketSummary(response.data);
    } catch (error: any) {
      setMarketError(error.response?.data?.error || 'No se pudo cargar la sesión de mercado.');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const formatMarketAmount = (value: number, currency: string, maximumFractionDigits = 2) => {
    try {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits }).format(value);
    } catch {
      return `${value.toLocaleString('es-ES', { maximumFractionDigits })} ${currency}`;
    }
  };

  const loadTransactions = useCallback(async (investmentId: string) => {
    setTransactionsLoading(true);
    setTransactionError('');
    try {
      const response = await api.get<InvestmentTransaction[]>(`/investments/${investmentId}/transactions`);
      setTransactions(response.data);
    } catch (error: any) {
      setTransactionError(error.response?.data?.error || 'No se pudo cargar el historial de movimientos.');
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const loadInvestmentListSummaries = useCallback(async () => {
    try {
      const [summaryResponse, quoteResponse] = await Promise.all([
        api.get<InvestmentMovementSummary[]>('/investments/transactions/summary'),
        api.get<PortfolioMarketSummary>('/investments/market/summary'),
      ]);
      setMovementSummaries(summaryResponse.data);
      setPortfolioQuotes(quoteResponse.data);
    } catch {
      // El detalle individual sigue funcionando aunque no se pueda cargar este resumen adicional.
    }
  }, []);

  useEffect(() => {
    void loadInvestmentListSummaries();
  }, [loadInvestmentListSummaries, investments]);

  const resetTransactionForm = () => {
    setEditingTransaction(null);
    setTransactionType('PURCHASE');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setTransactionAmount('');
    setTransactionUnits('');
    setTransactionUnitPrice('');
    setTransactionFee('0');
    setTransactionTax('0');
    setTransactionNotes('');
    setTransactionError('');
  };

  const openInvestmentDetail = (investment: Investment) => {
    setSelectedInvestment(investment);
    setMarketSummary(null);
    setMarketError('');
    setTransactions([]);
    void loadMarketSummary(investment.id);
    void loadTransactions(investment.id);
  };

  const closeInvestmentDetail = () => {
    setSelectedInvestment(null);
    setMarketSummary(null);
    setMarketError('');
    setTransactions([]);
    setShowTransactionForm(false);
    resetTransactionForm();
  };

  const handleAddTransaction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedInvestment || transactionAmount === '') return;

    setTransactionError('');
    try {
      const payload = {
        type: transactionType,
        date: new Date(transactionDate).toISOString(),
        amount: Number(transactionAmount),
        units: transactionUnits === '' ? null : Number(transactionUnits),
        unitPrice: transactionUnitPrice === '' ? null : Number(transactionUnitPrice),
        fee: Number(transactionFee) || 0,
        tax: Number(transactionTax) || 0,
        notes: transactionNotes,
      };
      if (editingTransaction) await api.put(`/investments/${selectedInvestment.id}/transactions/${editingTransaction.id}`, payload);
      else await api.post(`/investments/${selectedInvestment.id}/transactions`, payload);
      setShowTransactionForm(false);
      resetTransactionForm();
      await loadTransactions(selectedInvestment.id);
      await loadInvestmentListSummaries();
    } catch (error: any) {
      setTransactionError(error.response?.data?.error || 'No se pudo guardar el movimiento.');
    }
  };

  const handleDeleteTransaction = async (transaction: InvestmentTransaction) => {
    if (!selectedInvestment || !window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await api.delete(`/investments/${selectedInvestment.id}/transactions/${transaction.id}`);
      await loadTransactions(selectedInvestment.id);
      await loadInvestmentListSummaries();
    } catch (error: any) {
      setTransactionError(error.response?.data?.error || 'No se pudo eliminar el movimiento.');
    }
  };

  const editTransaction = (transaction: InvestmentTransaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setTransactionDate(new Date(transaction.date).toISOString().split('T')[0]);
    setTransactionAmount(transaction.amount.toString());
    setTransactionUnits(transaction.units?.toString() || '');
    setTransactionUnitPrice(transaction.unitPrice?.toString() || '');
    setTransactionFee(transaction.fee.toString());
    setTransactionTax(transaction.tax.toString());
    setTransactionNotes(transaction.notes || '');
    setShowTransactionForm(true);
  };

  const importTransactionPdf = async (file: File) => {
    if (!selectedInvestment) return;
    if (file.type !== 'application/pdf') {
      setTransactionError('Selecciona un archivo PDF.');
      return;
    }
    setPdfImporting(true);
    setTransactionError('');
    try {
      const documentData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });
      const response = await api.post(`/investments/${selectedInvestment.id}/transactions/import-pdf`, { documentData });
      const draft = response.data.draft;
      setEditingTransaction(null);
      setTransactionType(draft.type);
      setTransactionDate(new Date(draft.date).toISOString().split('T')[0]);
      setTransactionAmount(draft.amount.toString());
      setTransactionUnits(draft.units?.toString() ?? '');
      setTransactionUnitPrice(draft.unitPrice?.toString() ?? '');
      setTransactionFee(draft.fee.toString());
      setTransactionTax(draft.tax.toString());
      setTransactionNotes(draft.notes);
      setShowTransactionForm(true);
    } catch (error: any) {
      setTransactionError(error.response?.data?.error || 'No se pudo importar el PDF.');
    } finally {
      setPdfImporting(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const selectedMarketPosition = selectedInvestment ? marketSummary?.quotes.find((position) => position.investmentId === selectedInvestment.id) : undefined;
  const selectedQuote = selectedMarketPosition?.quote;
  const hasSelectedPositionValue = Boolean(selectedMarketPosition && selectedQuote && selectedMarketPosition.units !== null && selectedMarketPosition.unitPrice !== null && selectedMarketPosition.investmentCurrency === selectedQuote.currency);
  const selectedPositionValue = hasSelectedPositionValue ? selectedMarketPosition!.units! * selectedQuote!.close : null;
  const selectedMovementSummary = selectedInvestment ? movementSummaries.find((summary) => summary.investmentId === selectedInvestment.id) : undefined;
  const selectedPositionResult = hasSelectedPositionValue && selectedMovementSummary ? selectedPositionValue! + selectedMovementSummary.netCashRewards - selectedMovementSummary.grossContributed - selectedMovementSummary.totalFees : null;
  const selectedPositionResultPercent = hasSelectedPositionValue && selectedMovementSummary && (selectedMovementSummary.grossContributed + selectedMovementSummary.totalFees) > 0 ? (selectedPositionResult! / (selectedMovementSummary.grossContributed + selectedMovementSummary.totalFees)) * 100 : null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload: any = {
      type,
      name,
      ticker: ticker.trim() || null,
      isin: isin.trim() || null,
      exchange: exchange.trim() || null,
      currency,
      bank,
      notes,
    };

    if (editingInv) {
      if (editingInv.status === 'withdrawn') {
        payload.status = 'withdrawn';
        payload.withdrawnAmount = parseFloat(withdrawnAmount) || 0;
        payload.sellFee = parseFloat(sellFee) || 0;
        payload.endDate = new Date(endDate).toISOString();
      }
      await updateInvestment(editingInv.id, payload);
    } else {
      await addInvestment(payload);
    }

    // Reset form
    setName('');
    setTicker('');
    setIsin('');
    setExchange('');
    setCurrency('EUR');
    setNotes('');
    setEditingInv(null);
    setShowAddForm(false);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawingInv || !withdrawnAmount || !endDate) return;

    await updateInvestment(withdrawingInv.id, {
      status: 'withdrawn',
      withdrawnAmount: parseFloat(withdrawnAmount),
      sellFee: parseFloat(sellFee) || 0,
      endDate: new Date(endDate).toISOString(),
    });

    setWithdrawingInv(null);
    setWithdrawnAmount('');
    setSellFee('0');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta inversión?')) {
      await deleteInvestment(id);
    }
  };

  const openWithdrawal = (investment: Investment) => {
    setWithdrawingInv(investment);
    setWithdrawnAmount('');
    setSellFee('0');
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  const handleEditClick = (inv: Investment) => {
    setEditingInv(inv);
    setType(inv.type);
    setName(inv.name);
    setTicker(inv.ticker || '');
    setIsin(inv.isin || '');
    setExchange(inv.exchange || '');
    setCurrency(inv.currency || 'EUR');
    setBank(inv.bank);
    setNotes(inv.notes || '');

    if (inv.status === 'withdrawn') {
      setWithdrawnAmount((inv.withdrawnAmount ?? 0).toString());
      setSellFee((inv.sellFee ?? 0).toString());
      setEndDate(inv.endDate ? new Date(inv.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      setWithdrawnAmount('');
      setSellFee('0');
      setEndDate(new Date().toISOString().split('T')[0]);
    }

    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingInv(null);
    setName('');
    setTicker('');
    setIsin('');
    setExchange('');
    setCurrency('EUR');
    setNotes('');
    setWithdrawnAmount('');
    setSellFee('0');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Acción': return 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
      case 'ETF': return 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border-brand-100 dark:border-brand-900/30';
      case 'Fondo de inversión': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Criptomoneda': return 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      case 'Derivado': return 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      default: return 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400 border-slate-100 dark:border-slate-800/30';
    }
  };

  return (
    <div className="p-6 space-y-6 pb-28 lg:pb-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Cartera de Inversiones</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Registra tus inversiones en Acciones, ETFs, Cripto y Derivados</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          Nueva Inversión
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Capital Invertido */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Capital Activo Invertido</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalInvestedActive.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Monto total actualmente en el mercado</p>
          </div>
          <div className="p-3 bg-brand-50 dark:bg-brand-950/20 text-brand-500 rounded-2xl shrink-0">
            <Wallet size={20} />
          </div>
        </div>

        {/* Beneficio Realizado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Beneficio Realizado</span>
            <h3 className={`text-2xl font-black ${totalRealizedGains >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
              {totalRealizedGains >= 0 ? '+' : ''}{totalRealizedGains.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Gains/losses de inversiones ya retiradas</p>
          </div>
          <div className={`p-3 rounded-2xl shrink-0 ${totalRealizedGains >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'}`}>
            {totalRealizedGains >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
        </div>

        {/* Comisiones Totales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Gastos en Comisiones</span>
            <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300">{totalFees.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Suma total de costes de compra y venta</p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 text-slate-500 rounded-2xl shrink-0">
            <ArrowRightLeft size={20} />
          </div>
        </div>

        {/* Patrimonio Total Inversiones */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Patrimonio en Bolsa</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {(totalInvestedActive + totalRealizedGains).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Capital activo + resultados netos realizados</p>
          </div>
          <div className="p-3 bg-gradient-to-tr from-brand-500 to-purple-600 text-white rounded-2xl shrink-0 shadow-md shadow-brand-500/10">
            <Landmark size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 dark:border-slate-850 pb-px">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`pb-3 text-xs font-bold border-b-2 px-3 transition-colors cursor-pointer ${
            activeSubTab === 'active'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Inversiones Activas ({activeInvestments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('withdrawn')}
          className={`pb-3 text-xs font-bold border-b-2 px-3 transition-colors cursor-pointer ${
            activeSubTab === 'withdrawn'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Histórico Retiradas ({withdrawnInvestments.length})
        </button>
      </div>

      {/* Tables & Lists */}
      {investmentsLoading ? (
        <div className="h-64 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-400 dark:text-slate-500">Cargando tus inversiones...</p>
        </div>
      ) : activeSubTab === 'active' ? (
        activeInvestments.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-5">Activo</th>
                    <th className="py-3 px-5">Tipo</th>
                    <th className="py-3 px-5">Banco</th>
                    <th className="py-3 px-5 text-right">Capital aportado</th>
                    <th className="py-3 px-5 text-right">Comisiones</th>
                    <th className="py-3 px-5 text-right">Movimientos</th>
                    <th className="py-3 px-5 text-right">Resultado actual</th>
                    <th className="py-3 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/45 text-xs text-slate-700 dark:text-slate-300">
                  {activeInvestments.map(inv => {
                    const movementSummary = movementSummaries.find((summary) => summary.investmentId === inv.id);
                    const quote = portfolioQuotes?.quotes.find((position) => position.investmentId === inv.id)?.quote;
                    const currentValue = movementSummary && quote ? movementSummary.currentUnits * quote.close : null;
                    const result = currentValue !== null && movementSummary ? currentValue + movementSummary.netCashRewards - movementSummary.grossContributed - movementSummary.totalFees : null;
                    return (
                    <tr
                      key={inv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openInvestmentDetail(inv)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openInvestmentDetail(inv);
                        }
                      }}
                      className="cursor-pointer hover:bg-brand-50/40 dark:hover:bg-brand-950/10 transition-colors focus:outline-none focus:bg-brand-50/50"
                      title="Ver detalle de la inversión"
                    >
                      <td className="py-3.5 px-5 font-bold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span>{inv.name}</span>
                          {inv.ticker && <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">{inv.ticker}</span>}
                        </div>
                        {inv.exchange && (
                          <p className="text-[9px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                            {inv.exchange}
                          </p>
                        )}
                        {inv.notes && <p className="text-[9px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">{inv.notes}</p>}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${getTypeColor(inv.type)}`}>
                          {inv.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 border-0">
                        <Landmark size={12} className="text-slate-400" />
                        {inv.bank}
                      </td>
                      <td className="py-3.5 px-5 text-right font-bold text-slate-700 dark:text-slate-200">{movementSummary ? formatMarketAmount(movementSummary.grossContributed, inv.currency) : '—'}</td>
                      <td className="py-3.5 px-5 text-right text-slate-500 dark:text-slate-400">{movementSummary ? formatMarketAmount(movementSummary.totalFees, inv.currency) : '—'}</td>
                      <td className="py-3.5 px-5 text-right text-slate-500 dark:text-slate-400">{movementSummary ? movementSummary.movementCount : '—'}</td>
                      <td className={`py-3.5 px-5 text-right font-black ${result === null ? 'text-slate-400' : result >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{result === null ? '—' : `${result >= 0 ? '+' : ''}${formatMarketAmount(result, inv.currency)}`}</td>
                      <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={(event) => { event.stopPropagation(); handleEditClick(inv); }}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-150 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg font-bold text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors inline-block"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(event) => { event.stopPropagation(); openWithdrawal(inv); }}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-150 dark:bg-brand-950/40 dark:hover:bg-brand-950/70 text-brand-650 dark:text-brand-400 rounded-lg font-bold text-[10px] border border-brand-100 dark:border-brand-900/30 cursor-pointer transition-colors inline-block"
                        >
                          Retirar / Vender
                        </button>
                        <button
                          onClick={(event) => { event.stopPropagation(); handleDelete(inv.id); }}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition-colors inline-block align-middle"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
            <Coins className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No tienes inversiones activas registradas.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
            >
              + Añadir tu primera inversión
            </button>
          </div>
        )
      ) : (
        withdrawnInvestments.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 px-5">Activo</th>
                    <th className="py-3 px-5">Tipo</th>
                    <th className="py-3 px-5">Banco</th>
                    <th className="py-3 px-5 text-right">Monto Invertido</th>
                    <th className="py-3 px-5 text-right">Comisiones (C+V)</th>
                    <th className="py-3 px-5 text-right">Monto Retirado</th>
                    <th className="py-3 px-5 text-right">Resultado Neto</th>
                    <th className="py-3 px-5">Fechas (Comp. &rarr; Ret.)</th>
                    <th className="py-3 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/45 text-xs text-slate-700 dark:text-slate-300">
                  {withdrawnInvestments.map(inv => {
                    const totalCost = inv.amount + inv.buyFee + (inv.sellFee || 0);
                    const netResult = (inv.withdrawnAmount || 0) - totalCost;
                    const profitPercent = ((inv.withdrawnAmount || 0) - inv.sellFee!) / (inv.amount + inv.buyFee) - 1;
                    const profitPercentFormatted = (profitPercent * 100).toFixed(1);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-800 dark:text-slate-200">
                          {inv.name}
                          {inv.notes && <p className="text-[9px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">{inv.notes}</p>}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${getTypeColor(inv.type)}`}>
                            {inv.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-semibold">
                          {inv.bank}
                        </td>
                        <td className="py-3.5 px-5 text-right font-semibold text-slate-500 dark:text-slate-400">
                          {inv.amount.toFixed(2)} €
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-400 dark:text-slate-500 font-medium">
                          {(inv.buyFee + (inv.sellFee || 0)).toFixed(2)} €
                        </td>
                        <td className="py-3.5 px-5 text-right font-semibold text-slate-750 dark:text-slate-300">
                          {(inv.withdrawnAmount || 0).toFixed(2)} €
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end">
                            <span className={`font-black ${netResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {netResult >= 0 ? '+' : ''}{netResult.toFixed(2)} €
                            </span>
                            <span className={`text-[9px] font-bold ${netResult >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                              {netResult >= 0 ? '▲' : '▼'} {profitPercentFormatted}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-400 dark:text-slate-500 font-medium text-[10px]">
                          {new Date(inv.startDate).toLocaleDateString('es-ES')} &rarr; {inv.endDate ? new Date(inv.endDate).toLocaleDateString('es-ES') : ''}
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleEditClick(inv)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-150 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg font-bold text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors inline-block"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer transition-colors inline-block align-middle"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
            <Coins className="mx-auto text-slate-300 dark:text-slate-700 mb-3 animate-bounce" size={40} />
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay historial de inversiones retiradas.</p>
          </div>
        )
      )}

      {selectedInvestment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-sm p-4 md:p-8">
          <div className="mx-auto my-4 w-full max-w-6xl rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Detalle de inversión</p>
                <h3 className="mt-1 truncate text-xl font-black text-slate-800 dark:text-white">{selectedInvestment.name}</h3>
                <p className="mt-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">{selectedInvestment.ticker || 'Sin ticker'}{selectedInvestment.exchange ? ` · ${selectedInvestment.exchange}` : ''}</p>
              </div>
              <button onClick={closeInvestmentDetail} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cerrar</button>
            </div>

            <div className="mt-5">
              {!selectedInvestment.ticker ? (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"><CircleAlert size={15} className="mt-0.5 shrink-0" />Añade un ticker y un mercado a esta inversión para ver su información de mercado.</div>
              ) : marketLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400"><RefreshCw size={16} className="animate-spin text-brand-500" />Consultando el último cierre…</div>
              ) : marketError ? (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-600 dark:bg-rose-950/20 dark:text-rose-300"><CircleAlert size={15} className="mt-0.5 shrink-0" />{marketError}</div>
              ) : marketSummary && !marketSummary.configured ? (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"><CircleAlert size={15} className="mt-0.5 shrink-0" />Configura <code className="font-bold">EODHD_API_KEY</code> para activar los datos diarios.</div>
              ) : selectedQuote ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Último cierre disponible</p>
                      <p className="mt-1 text-3xl font-black text-slate-800 dark:text-white">{formatMarketAmount(selectedQuote.close, selectedQuote.currency, 4)}</p>
                      {selectedQuote.timestamp && <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Cierre del {new Date(selectedQuote.timestamp * 1000).toLocaleDateString('es-ES')}</p>}
                    </div>
                    <div className={`rounded-xl px-4 py-3 text-right ${selectedQuote.percentChange !== null && selectedQuote.percentChange >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-300'}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider">Variación diaria</p>
                      <p className="mt-0.5 text-lg font-black">{selectedQuote.percentChange === null ? '—' : `${selectedQuote.percentChange >= 0 ? '+' : ''}${selectedQuote.percentChange.toFixed(2)}%`}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[['Apertura', selectedQuote.open], ['Máximo', selectedQuote.high], ['Mínimo', selectedQuote.low], ['Cierre anterior', selectedQuote.previousClose]].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
                        <p className="mt-1 text-sm font-extrabold text-slate-700 dark:text-slate-200">{typeof value === 'number' ? formatMarketAmount(value, selectedQuote.currency, 4) : '—'}</p>
                      </div>
                    ))}
                  </div>

                  {selectedPositionValue !== null && selectedPositionResult !== null && selectedPositionResultPercent !== null && (
                    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900/30 dark:bg-brand-950/15">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">Tu posición estimada</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Valor actual <strong className="float-right text-base text-slate-800 dark:text-white">{formatMarketAmount(selectedPositionValue, selectedQuote.currency)}</strong></p>
                        <p className={`text-sm font-bold ${selectedPositionResult >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>Desde compra <strong className="float-right">{selectedPositionResult >= 0 ? '+' : ''}{formatMarketAmount(selectedPositionResult, selectedQuote.currency)} ({selectedPositionResultPercent >= 0 ? '+' : ''}{selectedPositionResultPercent.toFixed(2)}%)</strong></p>
                      </div>
                    </div>
                  )}

                  {selectedMarketPosition?.source?.usedFallback && (
                    <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-[11px] leading-relaxed text-sky-700 dark:border-sky-900/35 dark:bg-sky-950/20 dark:text-sky-300">
                      <CircleAlert size={15} className="mt-0.5 shrink-0" />
                      <span>No hay datos disponibles para <strong>{selectedMarketPosition.source.originalSymbol}</strong>. Se usa <strong>{selectedMarketPosition.source.symbol}</strong> como cotización principal y se convierte de {selectedMarketPosition.source.currency} a {selectedInvestment.currency} para estimar tu posición.</span>
                    </div>
                  )}

                  <InvestmentAnalysisPanel investmentId={selectedInvestment.id} />

                  <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>Datos diarios de {marketSummary?.provider}.</span>
                    <button onClick={() => void loadMarketSummary(selectedInvestment.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20"><RefreshCw size={12} />Actualizar cierre</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"><CircleAlert size={15} className="mt-0.5 shrink-0" />No se encontró una cotización para este ticker. Revisa su mercado y vuelve a intentarlo.</div>
              )}
            </div>

            <section className="mt-7 border-t border-slate-100 pt-6 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">Movimientos</h4>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Registra compras, Saveback, dividendos, impuestos y ventas para calcular tu rentabilidad real.</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTransactionPdf(file); }} />
                  <button onClick={() => pdfInputRef.current?.click()} disabled={pdfImporting} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 px-3 py-2 text-[11px] font-bold text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50 dark:border-brand-900/40 dark:text-brand-400 dark:hover:bg-brand-950/20">
                    {pdfImporting ? <RefreshCw size={14} className="animate-spin" /> : null} Importar PDF
                  </button>
                  <button onClick={() => { resetTransactionForm(); setShowTransactionForm(true); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm shadow-brand-500/20 transition-colors hover:bg-brand-700">
                    <Plus size={14} /> Añadir
                  </button>
                </div>
              </div>

              {showTransactionForm && (
                <form onSubmit={handleAddTransaction} className="mt-4 rounded-xl border border-brand-100 bg-brand-50/35 p-4 dark:border-brand-900/30 dark:bg-brand-950/10">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo</label>
                      <select value={transactionType} onChange={(event) => setTransactionType(event.target.value as InvestmentTransactionType)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {Object.entries(transactionTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</label>
                      <input type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Importe bruto ({selectedInvestment.currency})</label>
                      <input type="number" min="0" step="any" value={transactionAmount} onChange={(event) => setTransactionAmount(event.target.value)} required placeholder="Ej. 50,00" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Unidades / participaciones</label>
                      <input type="number" min="0" step="any" value={transactionUnits} onChange={(event) => setTransactionUnits(event.target.value)} placeholder="Ej. 0,403298" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Precio por unidad ({selectedInvestment.currency})</label>
                      <input type="number" min="0" step="any" value={transactionUnitPrice} onChange={(event) => setTransactionUnitPrice(event.target.value)} placeholder="Ej. 123,9775" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Comisión ({selectedInvestment.currency})</label>
                      <input type="number" min="0" step="any" value={transactionFee} onChange={(event) => setTransactionFee(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Impuestos retenidos ({selectedInvestment.currency})</label>
                      <input type="number" min="0" step="any" value={transactionTax} onChange={(event) => setTransactionTax(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Nota opcional</label>
                      <input type="text" value={transactionNotes} onChange={(event) => setTransactionNotes(event.target.value)} placeholder="Ej. Plan mensual de Trade Republic" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
                    </div>
                  </div>
                  {transactionType === 'SAVEBACK' && <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Introduce el Saveback bruto y los impuestos retenidos. Por ejemplo: 0,04 € de importe, 0,01 € de impuestos y 0,000242 participaciones; la aportación neta al activo será 0,03 €.</p>}
                  {transactionType === 'BONUS_SHARES' && <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Para acciones recibidas gratis: introduce 0 € de importe y las unidades recibidas. Se sumarán a tu posición, pero no a tu capital aportado.</p>}
                  {transactionType === 'CASH_REWARD' && <p className="mt-3 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Registra el importe bruto y la retención. Cuenta como beneficio recibido, no como una aportación ni como unidades del activo.</p>}
                  {transactionError && <p className="mt-3 text-[11px] font-medium text-rose-500">{transactionError}</p>}
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => { setShowTransactionForm(false); resetTransactionForm(); }} className="rounded-lg px-3 py-2 text-[11px] font-bold text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                    <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-brand-700">{editingTransaction ? 'Guardar cambios' : 'Guardar movimiento'}</button>
                  </div>
                </form>
              )}

              {transactionsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><RefreshCw size={14} className="animate-spin" />Cargando movimientos…</div>
              ) : transactions.length > 0 ? (
                <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                  {transactions.map((transaction) => {
                    const netAmount = transaction.amount - transaction.fee - transaction.tax;
                    return (
                      <div key={transaction.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{transactionTypeLabels[transaction.type]}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{new Date(transaction.date).toLocaleDateString('es-ES')}{transaction.units !== null && transaction.units !== undefined ? ` · ${transaction.units.toLocaleString('es-ES', { maximumFractionDigits: 8 })} uds.` : ''}{transaction.unitPrice !== null && transaction.unitPrice !== undefined ? ` · ${formatMarketAmount(transaction.unitPrice, selectedInvestment.currency, 4)}` : ''}{transaction.notes ? ` · ${transaction.notes}` : ''}</p>
                          {(transaction.fee > 0 || transaction.tax > 0) && <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Neto: {formatMarketAmount(netAmount, selectedInvestment.currency)} · Comisión: {formatMarketAmount(transaction.fee, selectedInvestment.currency)} · Impuestos: {formatMarketAmount(transaction.tax, selectedInvestment.currency)}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <strong className="text-xs text-slate-700 dark:text-slate-200">{formatMarketAmount(transaction.amount, selectedInvestment.currency)}</strong>
                          <button onClick={() => editTransaction(transaction)} title="Editar movimiento" className="rounded-lg p-1 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/20"><Pencil size={14} /></button>
                          <button onClick={() => void handleDeleteTransaction(transaction)} title="Eliminar movimiento" className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-[11px] text-slate-400 dark:border-slate-700 dark:text-slate-500">Aún no hay movimientos registrados. Empieza por la compra o el Saveback que muestra Trade Republic.</div>
              )}
              {transactionError && !showTransactionForm && <p className="mt-3 text-[11px] font-medium text-rose-500">{transactionError}</p>}
            </section>
          </div>
        </div>
      )}

      {/* NEW INVESTMENT DRAWER/MODAL MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/40 pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                {editingInv ? 'Editar Inversión' : 'Registrar Nueva Inversión'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Activo</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                >
                  <option value="Acción">Acción</option>
                  <option value="ETF">ETF</option>
                  <option value="Fondo de inversión">Fondo de inversión</option>
                  <option value="Criptomoneda">Criptomoneda</option>
                  <option value="Derivado">Derivado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Activo</label>
                <input
                  type="text"
                  placeholder="Ej. Apple Inc., Bitcoin, MSCI World ETF"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel help="Código con el que cotiza el activo, como AAPL o VWCE.DE. Servirá para consultar su evolución más adelante.">Ticker / Símbolo</FieldLabel>
                  <input
                    type="text"
                    placeholder="Ej. AAPL, VWCE.DE"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <FieldLabel help="Identificador internacional único del activo. Es muy útil en ETFs que cotizan con distintos tickers según la bolsa.">ISIN</FieldLabel>
                  <input
                    type="text"
                    placeholder="Ej. IE00BK5BQT80"
                    value={isin}
                    onChange={(e) => setIsin(e.target.value.toUpperCase())}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel help="Bolsa principal donde cotiza el activo, por ejemplo NASDAQ, Xetra o Bolsa de Madrid. Ayuda a identificarlo correctamente.">Mercado / Bolsa</FieldLabel>
                  <input
                    type="text"
                    placeholder="Ej. NASDAQ, XETRA"
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none placeholder-slate-400 dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <FieldLabel help="Moneda en la que cotiza y compraste el activo. Evita mezclar importes en euros, dólares u otras divisas.">Divisa</FieldLabel>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>

              <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Banco / Plataforma</label>
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.icon} {acc.name} {acc.bank ? `(${acc.bank.name})` : ''}
                      </option>
                    ))}
                  </select>
              </div>

              {!editingInv && <p className="rounded-xl bg-brand-50/60 px-3 py-2 text-[10px] leading-relaxed text-brand-700 dark:bg-brand-950/20 dark:text-brand-300">Después de crear el activo, añade cada compra, Saveback, dividendo o venta desde su detalle. Así se calculará su historial sin duplicar datos.</p>}

              {editingInv?.status === 'withdrawn' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border border-slate-105 dark:border-slate-800/40 mb-3">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Datos de Venta / Retirada</span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Monto Recuperado (€)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={withdrawnAmount}
                      onChange={(e) => setWithdrawnAmount(e.target.value)}
                      required
                      className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Comisión Venta (€)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={sellFee}
                        onChange={(e) => setSellFee(e.target.value)}
                        className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Fecha Venta</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="w-full py-1.5 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Notas</label>
                <textarea
                  placeholder="ISIN, cantidad, precio unitario o cualquier apunte..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none h-16 resize-none placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 cursor-pointer transition-colors"
                >
                  {editingInv ? 'Guardar Cambios' : 'Guardar Inversión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW/SELL MODAL */}
      {withdrawingInv && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/40 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Registrar Retirada / Venta</h3>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Venta del activo: <strong className="text-slate-700 dark:text-slate-300">{withdrawingInv.name}</strong></p>
              </div>
              <button
                onClick={() => setWithdrawingInv(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100/50 dark:border-slate-800/30 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Capital Invertido:</span>
                <strong className="text-slate-750 dark:text-slate-350">{withdrawingInv.amount.toFixed(2)} €</strong>
              </div>
              <div className="flex justify-between">
                <span>Comisión de compra:</span>
                <strong className="text-slate-750 dark:text-slate-350">{withdrawingInv.buyFee.toFixed(2)} €</strong>
              </div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Monto Recuperado / Retirado (€)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ingresa el valor total de venta obtenido"
                  value={withdrawnAmount}
                  onChange={(e) => setWithdrawnAmount(e.target.value)}
                  required
                  className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Comisión de Venta (€)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sellFee}
                    onChange={(e) => setSellFee(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Venta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawingInv(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/10 cursor-pointer transition-colors"
                >
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvestmentsManager;

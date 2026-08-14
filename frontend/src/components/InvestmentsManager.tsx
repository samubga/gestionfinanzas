import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Investment } from '../types';
import { TrendingUp, TrendingDown, Landmark, Wallet, Plus, Trash2, Coins, ArrowRightLeft } from 'lucide-react';

export const InvestmentsManager: React.FC = () => {
  const { investments, investmentsLoading, addInvestment, updateInvestment, deleteInvestment, accounts } = useFinance();
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'withdrawn'>('active');

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState('Acción');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [buyFee, setBuyFee] = useState('1'); // Default 1€ as common in Trade Republic
  const [bank, setBank] = useState('Trade Republic');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Withdrawal states
  const [withdrawingInv, setWithdrawingInv] = useState<Investment | null>(null);
  const [withdrawnAmount, setWithdrawnAmount] = useState('');
  const [sellFee, setSellFee] = useState('1');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Editing state
  const [editingInv, setEditingInv] = useState<Investment | null>(null);

  // Calculations
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  const withdrawnInvestments = investments.filter(inv => inv.status === 'withdrawn');

  const totalInvestedActive = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalFees = investments.reduce((sum, inv) => sum + inv.buyFee + (inv.sellFee || 0), 0);

  const totalRealizedGains = withdrawnInvestments.reduce((sum, inv) => {
    const profit = (inv.withdrawnAmount || 0) - inv.amount - inv.buyFee - (inv.sellFee || 0);
    return sum + profit;
  }, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !startDate) return;

    const payload: any = {
      type,
      name,
      amount: parseFloat(amount),
      buyFee: parseFloat(buyFee) || 0,
      bank,
      startDate: new Date(startDate).toISOString(),
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
    setAmount('');
    setBuyFee('1');
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
    setSellFee('1');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta inversión?')) {
      await deleteInvestment(id);
    }
  };

  const handleEditClick = (inv: Investment) => {
    setEditingInv(inv);
    setType(inv.type);
    setName(inv.name);
    setAmount(inv.amount.toString());
    setBuyFee(inv.buyFee.toString());
    setBank(inv.bank);
    setStartDate(new Date(inv.startDate).toISOString().split('T')[0]);
    setNotes(inv.notes || '');

    if (inv.status === 'withdrawn') {
      setWithdrawnAmount((inv.withdrawnAmount ?? 0).toString());
      setSellFee((inv.sellFee ?? 0).toString());
      setEndDate(inv.endDate ? new Date(inv.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    } else {
      setWithdrawnAmount('');
      setSellFee('1');
      setEndDate(new Date().toISOString().split('T')[0]);
    }

    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingInv(null);
    setName('');
    setAmount('');
    setBuyFee('1');
    setNotes('');
    setWithdrawnAmount('');
    setSellFee('1');
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
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto">
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
                    <th className="py-3 px-5 text-right">Capital Invertido</th>
                    <th className="py-3 px-5 text-right">Comisión Compra</th>
                    <th className="py-3 px-5">Fecha Compra</th>
                    <th className="py-3 px-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/45 text-xs text-slate-700 dark:text-slate-300">
                  {activeInvestments.map(inv => (
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
                      <td className="py-3.5 px-5 font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1.5 border-0">
                        <Landmark size={12} className="text-slate-400" />
                        {inv.bank}
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-slate-800 dark:text-slate-200">
                        {inv.amount.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-5 text-right text-slate-400 dark:text-slate-500 font-medium">
                        {inv.buyFee.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(inv.startDate).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleEditClick(inv)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-150 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 rounded-lg font-bold text-[10px] border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors inline-block"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setWithdrawingInv(inv)}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-150 dark:bg-brand-950/40 dark:hover:bg-brand-950/70 text-brand-650 dark:text-brand-400 rounded-lg font-bold text-[10px] border border-brand-100 dark:border-brand-900/30 cursor-pointer transition-colors"
                        >
                          Retirar / Vender
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
                  ))}
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
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Capital Invertido (€)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Comisión Compra (€)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={buyFee}
                    onChange={(e) => setBuyFee(e.target.value)}
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Compra</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full py-2 px-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-850 dark:text-slate-100 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-brand-500 outline-none"
                  />
                </div>
              </div>

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

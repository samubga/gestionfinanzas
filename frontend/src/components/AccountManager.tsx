import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType } from '../types';
import { AccountModal } from './AccountModal';
import { Plus, Edit2, Trash2, Wallet, AlertCircle, Building2 } from 'lucide-react';

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; bg: string; text: string }> = {
  CHECKING: { label: 'Cuenta Corriente', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400' },
  SAVINGS: { label: 'Cuenta de Ahorro', bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
  CASH: { label: 'Efectivo', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
  INVESTMENT: { label: 'Inversión', bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400' },
  CREDIT_CARD: { label: 'Tarjeta de Crédito', bg: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-400' },
  CRYPTO: { label: 'Criptomonedas', bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400' },
  OTHER: { label: 'Otro', bg: 'bg-slate-500/10 border-slate-500/30', text: 'text-slate-400' },
};

export const AccountManager: React.FC = () => {
  const { accounts, accountsLoading, deleteAccount, stats } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta cuenta?')) return;
    try {
      setErrorMessage('');
      setDeletingId(id);
      await deleteAccount(id);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Error al eliminar la cuenta');
    } finally {
      setDeletingId(null);
    }
  };

  const getAccountCurrentBalance = (acc: Account): number => {
    if (stats?.accountDetails) {
      const match = stats.accountDetails.find(d => d.id === acc.id);
      if (match) return match.currentBalance;
    }
    if (stats?.balances && stats.balances[acc.id] !== undefined) {
      return stats.balances[acc.id];
    }
    if (stats?.balances && stats.balances[acc.name] !== undefined) {
      return stats.balances[acc.name];
    }
    return acc.startingBalance;
  };

  const filteredAccounts = accounts.filter(acc => {
    if (selectedTypeFilter === 'ALL') return true;
    return acc.type === selectedTypeFilter;
  });

  const totalCalculatedBalance = accounts.reduce((sum, acc) => sum + getAccountCurrentBalance(acc), 0);

  return (
    <div className="p-6 md:p-8 space-y-8 pb-24 md:pb-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner">
                <Wallet size={26} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Cuentas Financieras</h1>
                <p className="text-xs md:text-sm text-slate-400 font-medium">
                  Organiza y gestiona tus cuentas bancarias, tarjetas, ahorros y efectivo.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action & Stats */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl px-5 py-3 text-right min-w-[160px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Total Cuentas</span>
              <span className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
                {totalCalculatedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              Añadir Nueva Cuenta
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <span className="text-xs font-semibold text-slate-400 mr-2">Filtrar por tipo:</span>
          {[
            { key: 'ALL', label: 'Todas', icon: '✨' },
            { key: 'CHECKING', label: 'Corrientes', icon: '💳' },
            { key: 'SAVINGS', label: 'Ahorro', icon: '💰' },
            { key: 'CASH', label: 'Efectivo', icon: '💵' },
            { key: 'INVESTMENT', label: 'Inversión', icon: '📈' },
            { key: 'CREDIT_CARD', label: 'Tarjetas', icon: '💳' },
            { key: 'CRYPTO', label: 'Cripto', icon: '🪙' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setSelectedTypeFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                selectedTypeFilter === f.key
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle size={20} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid de Tarjetas de Cuentas */}
      {accountsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Cargando cuentas...</p>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 max-w-lg mx-auto">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-slate-200 font-bold text-lg mb-1">No hay cuentas que mostrar</h3>
          <p className="text-xs text-slate-400 mb-6">
            {selectedTypeFilter === 'ALL' 
              ? 'Añade tu primera cuenta bancaria o de efectivo para ver tus fondos agrupados.' 
              : 'No se encontraron cuentas para el filtro seleccionado.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-lg shadow-indigo-600/30"
          >
            + Crear Cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((acc) => {
            const currentBal = getAccountCurrentBalance(acc);
            const isDeleting = deletingId === acc.id;
            const typeConfig = ACCOUNT_TYPE_CONFIG[acc.type] || ACCOUNT_TYPE_CONFIG.OTHER;

            return (
              <div
                key={acc.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 rounded-3xl p-6 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-indigo-500/5 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent bar top */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: acc.color }}
                />

                <div>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0"
                        style={{ backgroundColor: `${acc.color}20`, border: `1px solid ${acc.color}40` }}
                      >
                        {acc.icon || '💳'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-base truncate tracking-tight">
                          {acc.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {acc.bank && (
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white border border-white/10"
                              style={{ backgroundColor: `${acc.bank.color}80` }}
                            >
                              {acc.bank.name}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${typeConfig.bg} ${typeConfig.text}`}>
                            {typeConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEditModal(acc)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                        title="Editar cuenta"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition disabled:opacity-50 cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Balances Section */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Inicial</span>
                    <span className="text-xs font-bold text-slate-300">
                      {acc.startingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Actual</span>
                    <span className={`text-lg font-black font-mono tracking-tight ${currentBal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentBal.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountToEdit={editingAccount}
      />
    </div>
  );
};

export default AccountManager;

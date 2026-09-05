import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType } from '../types';
import { AccountModal } from './AccountModal';
import { Plus, Edit2, Trash2, Wallet, Building2 } from 'lucide-react';

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; bg: string; text: string }> = {
  CHECKING: { label: 'Cuenta Corriente', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
  SAVINGS: { label: 'Cuenta de Ahorro', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
  CASH: { label: 'Efectivo', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
  INVESTMENT: { label: 'Inversión', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
  CREDIT_CARD: { label: 'Tarjeta de Crédito', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
  CRYPTO: { label: 'Criptomonedas', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
  OTHER: { label: 'Otro', bg: 'bg-brand-50 border-brand-200 dark:bg-brand-950/30 dark:border-brand-800/60', text: 'text-brand-700 dark:text-brand-300' },
};

export const AccountManager: React.FC = () => {
  const { accounts, accountsLoading, deleteAccount, stats } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      setDeletingId(id);
      await deleteAccount(id);
    } catch {
      // FinanceContext muestra el error en el aviso global.
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

  const totalCalculatedBalance = accounts.reduce((sum, acc) => sum + getAccountCurrentBalance(acc), 0);

  return (
    <div className="mx-auto max-w-[94rem] space-y-5 px-3 py-4 pb-28 sm:space-y-8 sm:p-6 lg:px-6 lg:pb-8 xl:px-8">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-brand-100 dark:border-brand-900/60 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-600/10 border border-brand-500/20 text-brand-500 flex items-center justify-center shadow-inner">
                <Wallet size={26} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Cuentas Financieras</h1>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Organiza y gestiona tus cuentas bancarias, tarjetas, ahorros y efectivo.
                </p>
              </div>
            </div>
          </div>

          {/* Right Action & Stats */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-brand-50/60 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/60 rounded-2xl px-5 py-3 text-right min-w-[160px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Saldo Total Cuentas</span>
              <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totalCalculatedBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-brand-600/30 flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              Añadir Nueva Cuenta
            </button>
          </div>
        </div>

      </div>

      {/* Grid de Tarjetas de Cuentas */}
      {accountsLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Cargando cuentas...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 max-w-lg mx-auto">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-slate-200 font-bold text-lg mb-1">No hay cuentas que mostrar</h3>
          <p className="text-xs text-slate-400 mb-6">Añade tu primera cuenta bancaria o de efectivo para ver tus fondos agrupados.</p>
          <button
            onClick={handleOpenAddModal}
            className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-lg shadow-brand-600/30"
          >
            + Crear Cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const currentBal = getAccountCurrentBalance(acc);
            const isDeleting = deletingId === acc.id;
            const typeConfig = ACCOUNT_TYPE_CONFIG[acc.type] || ACCOUNT_TYPE_CONFIG.OTHER;

            return (
              <div
                key={acc.id}
                className="bg-brand-50/40 dark:bg-slate-900 border border-brand-200 dark:border-brand-900/70 hover:border-brand-400 rounded-3xl p-4 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-brand-500/10 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0 bg-brand-100/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60"
                      >
                        {acc.icon || '💳'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-white text-base truncate tracking-tight">
                          {acc.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {acc.bank && (
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 bg-brand-100/70 dark:bg-brand-950/30"
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
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-100/70 dark:hover:bg-brand-950/30 rounded-xl transition cursor-pointer"
                        title="Editar cuenta"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition disabled:opacity-50 cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Balances Section */}
                <div className="pt-4 border-t border-brand-200/80 dark:border-brand-900/60 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Inicial</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {acc.startingBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Actual</span>
                    <span className={`text-lg font-black font-mono tracking-tight ${currentBal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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

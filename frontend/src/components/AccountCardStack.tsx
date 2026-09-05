import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CheckCircle2, Layers } from 'lucide-react';
import { Account } from '../types';

interface AccountCardStackProps {
  onSelectAccount?: (accountId: string | null) => void;
  onOpenAddAccount?: () => void;
}

export const AccountCardStack: React.FC<AccountCardStackProps> = ({
  onSelectAccount,
  onOpenAddAccount
}) => {
  const { accounts, stats } = useFinance();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    const nextId = selectedAccountId === id ? null : id;
    setSelectedAccountId(nextId);
    if (onSelectAccount) {
      onSelectAccount(nextId);
    }
  };

  const accountTypeLabels: Record<Account['type'], string> = {
    CHECKING: 'Cuenta corriente',
    SAVINGS: 'Cuenta de ahorro',
    CASH: 'Efectivo',
    INVESTMENT: 'Inversión',
    CREDIT_CARD: 'Tarjeta de crédito',
    CRYPTO: 'Criptomonedas',
    OTHER: 'Otra cuenta',
  };

  const getAccountCurrentBalance = (acc: Account): number => {
    if (acc.currentBalance !== undefined && acc.currentBalance !== null) {
      return acc.currentBalance;
    }
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
    return acc.startingBalance || 0;
  };

  const totalBalance = stats?.availableBalance !== undefined && stats.availableBalance !== 0
    ? stats.availableBalance
    : accounts.reduce((sum, a) => sum + getAccountCurrentBalance(a), 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-full">
      {/* Background ambient glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-brand-50 dark:bg-brand-950/40 text-brand-500 rounded-2xl border border-brand-100 dark:border-brand-800/40">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white leading-tight">Mis Cuentas & Tarjetas</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              {accounts.length} Cuentas vinculadas
            </span>
          </div>
        </div>

        {selectedAccountId && (
          <button
            onClick={() => handleCardClick(selectedAccountId)}
            className="text-[10px] font-bold text-brand-500 hover:underline cursor-pointer bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-full border border-brand-100 dark:border-brand-800/40"
          >
            Ver Todas
          </button>
        )}
      </div>

      {/* Account Cards List / Stack */}
      <div className="space-y-3 relative z-10 my-2 flex-1">
        {accounts.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-xs text-slate-400 mb-2">No tienes cuentas registradas todavía.</p>
            {onOpenAddAccount && (
              <button
                onClick={onOpenAddAccount}
                className="px-3 py-1.5 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Añadir Cuenta
              </button>
            )}
          </div>
        ) : (
          accounts.slice(0, 4).map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const balance = getAccountCurrentBalance(acc);
            const accountType = accountTypeLabels[acc.type] || 'Cuenta';
            const bankName = acc.bank?.name || 'Sin banco asociado';

            return (
              <div
                key={acc.id}
                onClick={() => handleCardClick(acc.id)}
                className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-brand-50/80 dark:bg-brand-950/35 text-slate-800 dark:text-white border-brand-400 shadow-md shadow-brand-500/10 scale-[1.01]'
                    : 'bg-slate-100/80 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-white hover:border-brand-400 hover:bg-brand-50/60 dark:hover:bg-brand-950/25'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${
                      isSelected
                        ? 'bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-200 border border-brand-200 dark:border-brand-800'
                        : 'bg-white dark:bg-slate-800 text-brand-500 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span role="img" aria-label={`Icono de ${acc.name}`}>{acc.icon || '💳'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold truncate text-slate-800 dark:text-white">
                      {acc.name}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide truncate text-slate-500 dark:text-slate-400">
                      {accountType}
                    </p>
                    <p className="text-[10px] font-medium truncate text-slate-400 dark:text-slate-500">
                      {bankName}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`editorial-amount text-sm font-bold ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                    {balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                  {isSelected && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-brand-700 dark:text-brand-300">
                      <CheckCircle2 size={10} /> Seleccionada
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Total */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs relative z-10">
        <span className="font-bold text-slate-400 dark:text-slate-500">Saldo Total Disponible</span>
        <span className="editorial-amount text-sm font-bold text-slate-900 dark:text-white">
          {totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
        </span>
      </div>
    </div>
  );
};

export default AccountCardStack;

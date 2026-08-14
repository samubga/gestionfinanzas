import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Wallet, CreditCard, Building2, TrendingUp, CheckCircle2, Layers } from 'lucide-react';

interface AccountCardStackProps {
  onSelectAccount?: (accountId: string | null) => void;
  onOpenAddAccount?: () => void;
}

export const AccountCardStack: React.FC<AccountCardStackProps> = ({
  onSelectAccount,
  onOpenAddAccount
}) => {
  const { accounts } = useFinance();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleCardClick = (id: string) => {
    const nextId = selectedAccountId === id ? null : id;
    setSelectedAccountId(nextId);
    if (onSelectAccount) {
      onSelectAccount(nextId);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CHECKING': return Building2;
      case 'SAVINGS': return Wallet;
      case 'INVESTMENT': return TrendingUp;
      case 'CREDIT_CARD': return CreditCard;
      default: return Wallet;
    }
  };

  const totalBalance = accounts.reduce((acc, a) => acc + (a.currentBalance ?? a.startingBalance ?? 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
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
      <div className="space-y-3 relative z-10 my-2">
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
            const Icon = getAccountIcon(acc.type);
            const isSelected = selectedAccountId === acc.id;
            const balance = acc.currentBalance ?? acc.startingBalance ?? 0;

            return (
              <div
                key={acc.id}
                onClick={() => handleCardClick(acc.id)}
                className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-brand-500 text-white border-brand-400 shadow-lg shadow-brand-500/25 scale-[1.02]'
                    : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-100/80 dark:border-slate-800/80 text-slate-800 dark:text-white hover:border-brand-500/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-white dark:bg-slate-800 text-brand-500 border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                      {acc.name}
                    </p>
                    <p className={`text-[10px] font-semibold truncate ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                      {acc.type}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-xs font-black font-mono ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                    {balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </p>
                  {isSelected && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-white/90">
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
        <span className="font-bold text-slate-400 dark:text-slate-500">Saldo Total</span>
        <span className="font-black text-slate-800 dark:text-white font-mono text-sm">
          {totalBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
        </span>
      </div>
    </div>
  );
};

export default AccountCardStack;

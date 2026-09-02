import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType, Bank } from '../types';
import { X, Search, Plus, Check, Loader2, Building2, CircleHelp } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
}

const ACCOUNT_TYPES: Array<{ type: AccountType; label: string; icon: string }> = [
  { type: 'CHECKING', label: 'Cuenta Corriente', icon: '💳' },
  { type: 'SAVINGS', label: 'Cuenta de Ahorro', icon: '💰' },
  { type: 'CASH', label: 'Efectivo', icon: '💵' },
  { type: 'INVESTMENT', label: 'Inversión', icon: '📈' },
  { type: 'CREDIT_CARD', label: 'Tarjeta de Crédito', icon: '💳' },
  { type: 'CRYPTO', label: 'Criptomonedas', icon: '🪙' },
  { type: 'OTHER', label: 'Otro', icon: '📦' },
];

const PRESET_COLORS = [
  '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#84CC16',
  '#EAB308', '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#0F172A', '#475569'
];

const PRESET_ICONS = ['💳', '💵', '💰', '📈', '🪙', '📦', '🏖️', '🏠', '🚗', '🎓', '🏥', '✈️'];

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, accountToEdit }) => {
  const { banks, addAccount, updateAccount, addCustomBank, stats } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [startingBalance, setStartingBalance] = useState<number | string>(0);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('💳');

  const [bankSearch, setBankSearch] = useState('');
  const [showCustomBankInput, setShowCustomBankInput] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
  const [customBankColor, setCustomBankColor] = useState('#3B82F6');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculator states
  const [showCalculator, setShowCalculator] = useState(false);
  const [showStartingBalanceHelp, setShowStartingBalanceHelp] = useState(false);
  const [actualMoneyInput, setActualMoneyInput] = useState('');
  const [calcMessage, setCalcMessage] = useState('');

  const handleCalculateStartingBalance = () => {
    if (!accountToEdit) return;
    const actualMoney = Number(actualMoneyInput);
    if (isNaN(actualMoney) || actualMoneyInput.trim() === '') {
      setCalcMessage('Por favor, introduce un número válido.');
      return;
    }

    const storedStarting = accountToEdit.startingBalance;
    let currentBal = storedStarting;

    if (stats?.accountDetails) {
      const match = stats.accountDetails.find(d => d.id === accountToEdit.id);
      if (match) currentBal = match.currentBalance;
    } else if (stats?.balances && stats.balances[accountToEdit.id] !== undefined) {
      currentBal = stats.balances[accountToEdit.id];
    } else if (stats?.balances && stats.balances[accountToEdit.name] !== undefined) {
      currentBal = stats.balances[accountToEdit.name];
    }

    const netChange = currentBal - storedStarting;
    const suggestedStarting = actualMoney - netChange;

    setStartingBalance(suggestedStarting.toFixed(2));
    setCalcMessage(`Movimientos: ${netChange >= 0 ? '+' : ''}${netChange.toFixed(2)} €. Saldo Inicial sugerido establecido: ${suggestedStarting.toFixed(2)} €.`);
  };

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setType(accountToEdit.type || 'CHECKING');
      setStartingBalance(accountToEdit.startingBalance);
      setSelectedBankId(accountToEdit.bankId || '');
      setColor(accountToEdit.color || '#6366F1');
      setIcon(accountToEdit.icon || '💳');
    } else {
      setName('');
      setType('CHECKING');
      setStartingBalance(0);
      setSelectedBankId('');
      setColor('#6366F1');
      setIcon('💳');
    }
    setError('');
    setShowCustomBankInput(false);
    setBankSearch('');
    setShowCalculator(false);
    setShowStartingBalanceHelp(false);
    setActualMoneyInput('');
    setCalcMessage('');
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  const filteredBanks = banks.filter(b => 
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleSelectBank = (b: Bank | null) => {
    if (b) {
      setSelectedBankId(b.id);
      setColor(b.color);
      if (!name) setName(b.name);
    } else {
      setSelectedBankId('');
    }
  };

  const handleCreateCustomBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBankName.trim()) return;
    try {
      setLoading(true);
      const newBank = await addCustomBank({ name: customBankName.trim(), color: customBankColor });
      setSelectedBankId(newBank.id);
      setColor(newBank.color);
      if (!name) setName(newBank.name);
      setShowCustomBankInput(false);
      setCustomBankName('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear banco');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Introduce un nombre para la cuenta');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload = {
        name: name.trim(),
        type,
        startingBalance: Number(startingBalance) || 0,
        currency: 'EUR',
        color,
        icon,
        bankId: selectedBankId || null,
      };

      if (accountToEdit) {
        await updateAccount(accountToEdit.id, payload);
      } else {
        await addAccount(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-xl">
              {icon}
            </div>
            <h2 className="text-xl font-bold">
              {accountToEdit ? 'Editar Cuenta' : 'Añadir Nueva Cuenta'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* 1. Selector de Banco */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Entidad o Banco (Opcional)
            </label>
            
            {!showCustomBankInput ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar banco (CaixaBank, Revolut, BBVA...)"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition"
                  />
                </div>

                {/* Grid de Bancos */}
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-800 rounded-xl bg-slate-950/40">
                  <button
                    type="button"
                    onClick={() => handleSelectBank(null)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition ${
                      !selectedBankId 
                        ? 'bg-brand-600/30 border border-brand-500/50 text-brand-200' 
                        : 'hover:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Building2 size={16} />
                    <span>Sin banco / Efectivo</span>
                    {!selectedBankId && <Check size={14} className="ml-auto text-brand-400" />}
                  </button>

                  {filteredBanks.map((b) => {
                    const isSelected = selectedBankId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBank(b)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition ${
                          isSelected 
                            ? 'bg-brand-600/30 border border-brand-500/50 text-brand-200' 
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: b.color }}
                        />
                        <span className="truncate">{b.name}</span>
                        {isSelected && <Check size={14} className="ml-auto text-brand-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCustomBankInput(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 mt-1"
                >
                  <Plus size={14} /> ¿No encuentras tu banco? Crear personalizado
                </button>
              </div>
            ) : (
              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>Nuevo Banco Personalizado</span>
                  <button 
                    type="button" 
                    onClick={() => setShowCustomBankInput(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nombre del banco (ej. Caja Rural)"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                  />
                  <input
                    type="color"
                    value={customBankColor}
                    onChange={(e) => setCustomBankColor(e.target.value)}
                    className="w-9 h-9 p-1 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateCustomBank}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2 rounded-lg transition"
                >
                  Guardar Banco
                </button>
              </div>
            )}
          </div>

          {/* 2. Tipo de Cuenta */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Tipo de Cuenta
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const isSelected = type === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setType(t.type);
                      setIcon(t.icon);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Nombre Personalizado */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">
              Nombre de la Cuenta *
            </label>
            <input
              type="text"
              placeholder="Ej. Nómina, Fondo de Emergencia, Gastos Viajes..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
              required
            />
          </div>

          {/* 4. Saldo Inicial */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <label className="block text-sm font-semibold text-slate-300">
                  Saldo Inicial (€)
                </label>
                <button
                  type="button"
                  onClick={() => setShowStartingBalanceHelp(!showStartingBalanceHelp)}
                  aria-expanded={showStartingBalanceHelp}
                  aria-controls="starting-balance-help"
                  aria-label="Ayuda sobre el saldo inicial"
                  className="rounded-full text-slate-400 transition hover:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/60"
                >
                  <CircleHelp size={16} />
                </button>
              </div>
              {accountToEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCalculator(!showCalculator);
                    setCalcMessage('');
                    setActualMoneyInput('');
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  ⚙️ Calcular Saldo
                </button>
              )}
            </div>
            {showStartingBalanceHelp && (
              <div id="starting-balance-help" className="mb-3 rounded-xl border border-brand-500/25 bg-brand-500/10 p-3 text-[11px] leading-relaxed text-slate-300 animate-fade-in">
                <p>
                  Indica el saldo que tenía la cuenta cuando empezaste a registrar sus transacciones. Así la aplicación puede sumar esos movimientos y mostrar el dinero total real de la cuenta.
                </p>
                <p className="mt-2 text-slate-400">
                  Si ya registraste transacciones, usa <strong className="font-semibold text-brand-300">Calcular saldo</strong>: introduce el dinero real actual y se rellenará automáticamente el saldo inicial que corresponde.
                </p>
              </div>
            )}
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
            />

            {/* Inline Calculator Panel */}
            {accountToEdit && showCalculator && (
              <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3 mt-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Calculadora de saldo inicial</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCalculator(false);
                      setCalcMessage('');
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Cerrar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Introduce el dinero real actual en esta cuenta. Se calculará el saldo inicial necesario teniendo en cuenta las transacciones registradas.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Dinero real actual (€)"
                    value={actualMoneyInput}
                    onChange={(e) => setActualMoneyInput(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleCalculateStartingBalance}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                  >
                    Calcular
                  </button>
                </div>
                {calcMessage && (
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                    {calcMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 5. Color e Icono */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition transform ${
                      color === c ? 'scale-125 ring-2 ring-brand-400' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {/* Custom color picker */}
                <label
                  title="Color personalizado"
                  className="relative w-6 h-6 rounded-full cursor-pointer transition transform hover:scale-110 flex items-center justify-center overflow-hidden"
                  style={{
                    background: !PRESET_COLORS.includes(color)
                      ? color
                      : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    boxShadow: !PRESET_COLORS.includes(color) ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined
                  }}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Icono
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition ${
                      icon === ic ? 'bg-brand-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-brand-600/30 flex items-center gap-2 transition"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {accountToEdit ? 'Guardar Cambios' : 'Crear Cuenta'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

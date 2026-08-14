import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { X, Plus, Calendar, CreditCard, AlignLeft, Tag as TagIcon, Sparkles } from 'lucide-react';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: any; // If editing an existing transaction
  type?: 'expense' | 'income' | 'transfer';
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  editTransaction,
  type: initialType = 'expense'
}) => {
  const {
    categories,
    tags: availableTags,
    expenses,
    incomes,
    addExpense,
    updateExpense,
    addIncome,
    updateIncome,
    addTransfer,
    updateTransfer,
    accounts
  } = useFinance();

  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer'>(initialType);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tarjeta');
  const [notes, setNotes] = useState('');
  const [bank, setBank] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  
  // Tags selected for this transaction
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  
  // Description suggestions
  const [descSuggestions, setDescSuggestions] = useState<any[]>([]);
  const [showDescSuggestions, setShowDescSuggestions] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  const filteredCategories = categories.filter(c => c.type === txType);

  // Update default category when type changes (only for new transactions)
  useEffect(() => {
    if (!editTransaction && isOpen) {
      if (filteredCategories.length > 0) {
        setCategoryId(filteredCategories[0].id);
      } else {
        setCategoryId('');
      }
    }
  }, [txType, filteredCategories.length, editTransaction, isOpen]);

  // Load transaction details if in edit mode
  useEffect(() => {
    if (editTransaction) {
      const isTransfer = editTransaction.fromAccountId !== undefined && editTransaction.toAccountId !== undefined;
      const isInc = !isTransfer && editTransaction.paymentMethod === undefined;
      setTxType(isTransfer ? 'transfer' : (isInc ? 'income' : 'expense'));
      setAmount(editTransaction.amount.toString());
      
      const formattedDate = new Date(editTransaction.date).toISOString().split('T')[0];
      setDate(formattedDate);
      setDescription(editTransaction.description);
      setCategoryId(editTransaction.categoryId || '');
      setNotes(editTransaction.notes || '');
      
      let initialBankVal = accounts[0]?.id || '';
      if (editTransaction.accountId) {
        initialBankVal = editTransaction.accountId;
      } else if (editTransaction.bank) {
        const match = accounts.find(a => a.name === editTransaction.bank);
        if (match) {
          initialBankVal = match.id;
        }
      }
      setBank(initialBankVal);
      
      if (isTransfer) {
        setFromAccountId(editTransaction.fromAccountId);
        setToAccountId(editTransaction.toAccountId);
        setSelectedTags([]);
      } else if (!isInc) {
        setPaymentMethod(editTransaction.paymentMethod || 'Tarjeta');
        setSelectedTags(editTransaction.tags?.map((t: any) => t.name) || []);
      } else {
        setSelectedTags([]);
      }
    } else {
      // Reset to defaults
      setTxType(initialType);
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setPaymentMethod('Tarjeta');
      setNotes('');
      setBank(accounts[0]?.id || '');
      setSelectedTags([]);
      
      if (accounts.length >= 2) {
        setFromAccountId(accounts[0].id);
        setToAccountId(accounts[1].id);
      } else if (accounts.length === 1) {
        setFromAccountId(accounts[0].id);
        setToAccountId('');
      } else {
        setFromAccountId('');
        setToAccountId('');
      }
    }
  }, [editTransaction, isOpen, initialType, categories, accounts]);

  // Close description suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (descRef.current && !descRef.current.contains(e.target as Node)) {
        setShowDescSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (val.trim().length > 1) {
      const matches: Record<string, any> = {};
      const txHistory = txType === 'expense' ? expenses : incomes;
      
      txHistory.forEach((tx: any) => {
        if (tx.description.toLowerCase().includes(val.toLowerCase())) {
          matches[tx.description.toLowerCase()] = {
            description: tx.description,
            categoryId: tx.categoryId,
            amount: tx.amount,
            notes: tx.notes || '',
            paymentMethod: tx.paymentMethod || 'Tarjeta',
            tags: tx.tags?.map((t: any) => t.name) || []
          };
        }
      });
      setDescSuggestions(Object.values(matches).slice(0, 4));
      setShowDescSuggestions(true);
    } else {
      setDescSuggestions([]);
      setShowDescSuggestions(false);
    }
  };

  const selectDescSuggestion = (suggestion: any) => {
    setDescription(suggestion.description);
    setAmount(suggestion.amount.toString());
    if (suggestion.categoryId) setCategoryId(suggestion.categoryId);
    if (suggestion.paymentMethod) setPaymentMethod(suggestion.paymentMethod);
    if (suggestion.notes) setNotes(suggestion.notes);
    if (suggestion.tags) setSelectedTags(suggestion.tags);
    setShowDescSuggestions(false);
  };

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTag = tagInput.trim().toLowerCase();
    if (cleanTag && !selectedTags.includes(cleanTag)) {
      setSelectedTags([...selectedTags, cleanTag]);
      setTagInput('');
      setTagSuggestions([]);
    }
  };

  const handleTagInputChange = (val: string) => {
    setTagInput(val);
    if (val.trim()) {
      const filtered = availableTags
        .map(t => t.name)
        .filter(tName => tName.includes(val.toLowerCase()) && !selectedTags.includes(tName));
      setTagSuggestions(filtered);
    } else {
      setTagSuggestions([]);
    }
  };

  const removeTag = (tName: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      alert('Por favor introduce un importe válido mayor que cero.');
      return;
    }
    if (!description.trim()) {
      alert('Por favor introduce una descripción.');
      return;
    }

    if (txType === 'transfer') {
      if (!fromAccountId || !toAccountId) {
        alert('Por favor selecciona la cuenta de origen y de destino.');
        return;
      }
      if (fromAccountId === toAccountId) {
        alert('La cuenta de origen y de destino deben ser diferentes.');
        return;
      }

      const payload = {
        amount: parseFloat(amount),
        date: new Date(date).toISOString(),
        description: description.trim(),
        fromAccountId,
        toAccountId,
        notes: notes.trim() || null
      };

      try {
        if (editTransaction) {
          await updateTransfer(editTransaction.id, payload);
        } else {
          await addTransfer(payload);
        }
        onClose();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Error al guardar el movimiento');
      }
      return;
    }

    const selectedAcc = accounts.find(a => a.id === bank);
    if (!selectedAcc) {
      alert('Por favor selecciona una cuenta válida para la transacción.');
      return;
    }
    const payload: any = {
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      description: description.trim(),
      categoryId: categoryId || null,
      notes: notes.trim() || null,
      bank: selectedAcc.name,
      accountId: selectedAcc.id
    };

    try {
      if (txType === 'expense') {
        payload.paymentMethod = paymentMethod;
        payload.tags = selectedTags;
        
        if (editTransaction) {
          await updateExpense(editTransaction.id, payload);
        } else {
          await addExpense(payload);
        }
      } else {
        if (editTransaction) {
          await updateIncome(editTransaction.id, payload);
        } else {
          await addIncome(payload);
        }
      }
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al guardar la transacción');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {editTransaction ? 'Editar Registro' : 'Añadir Transacción'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Gasto / Ingreso Toggle */}
          {!editTransaction && (
            <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTxType('expense')}
                className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
                  txType === 'expense'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setTxType('income')}
                className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
                  txType === 'income'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setTxType('transfer')}
                className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
                  txType === 'transfer'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Movimiento
              </button>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Importe (€)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">€</span>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-2xl font-bold transition-all"
              />
            </div>
          </div>

          {/* Description with Autocomplete */}
          <div ref={descRef} className="relative">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Descripción</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder={txType === 'expense' ? 'Ej. Compra Mercadona, Café' : 'Ej. Nómina, Bizum'}
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                onFocus={() => description && setShowDescSuggestions(true)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showDescSuggestions && descSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/40">
                {descSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectDescSuggestion(s)}
                    className="w-full text-left px-4 py-3 hover:bg-brand-50 dark:hover:bg-slate-700/50 flex items-center justify-between text-sm transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{s.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        {categories.find(c => c.id === s.categoryId)?.name || 'Sin categoría'}
                      </p>
                    </div>
                    <div className="flex items-center text-xs font-medium text-brand-600 dark:text-brand-400">
                      <span className="mr-1.5">{s.amount.toFixed(2)} €</span>
                      <Sparkles size={14} className="animate-pulse" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Fecha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar size={18} />
              </div>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all"
              />
            </div>
          </div>

          {/* Category Button Grid */}
          {txType !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                Categoría {txType === 'income' && '(Opcional)'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center p-2 rounded-xl border text-xs font-medium transition-all ${
                      categoryId === cat.id
                        ? 'border-brand-600 dark:border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
                {txType === 'income' && (
                  <button
                    type="button"
                    onClick={() => setCategoryId('')}
                    className={`flex items-center p-2 rounded-xl border text-xs font-medium transition-all ${
                      !categoryId
                        ? 'border-brand-600 dark:border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full mr-2 shrink-0 border border-dashed border-slate-400 bg-transparent" />
                    <span>Ninguna</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment Method (Expense Only) */}
          {txType === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Método de pago (Opcional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <CreditCard size={18} />
                </div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all"
                >
                  <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Bizum">Bizum</option>
                  <option value="Domiciliación">Recibo / Domiciliación</option>
                </select>
              </div>
            </div>
          )}

          {/* Tags Manager (Expense Only) */}
          {txType === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Etiquetas</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <TagIcon size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Escribe y presiona Enter..."
                    value={tagInput}
                    onChange={(e) => handleTagInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-xs transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs transition-all"
                >
                  Añadir
                </button>
              </div>

              {/* Tag suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-slate-50 dark:bg-slate-800/20 rounded-lg">
                  {tagSuggestions.slice(0, 5).map((tName) => (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => {
                        setSelectedTags([...selectedTags, tName]);
                        setTagInput('');
                        setTagSuggestions([]);
                      }}
                      className="px-2 py-1 bg-white hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 rounded text-[10px] font-medium transition-colors"
                    >
                      +{tName}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 rounded-full text-xs font-semibold border border-brand-100/30"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-brand-400 hover:text-brand-600 dark:hover:text-brand-200"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transfer Accounts (Transfer Only) */}
          {txType === 'transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Cuenta Origen</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-sm">📤</span>
                  </div>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all"
                  >
                    <option value="" disabled>Seleccionar origen</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.icon} {acc.name}{acc.bank?.name ? ` (${acc.bank.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Cuenta Destino</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-sm">📥</span>
                  </div>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all"
                  >
                    <option value="" disabled>Seleccionar destino</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.icon} {acc.name}{acc.bank?.name ? ` (${acc.bank.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Bank / Origin Selection (Expense and Income Only) */}
          {txType !== 'transfer' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Banco / Origen</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="text-sm">🏦</span>
                </div>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name} {acc.bank ? `(${acc.bank.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Notas u observaciones (Opcional)</label>
            <div className="relative">
              <div className="absolute left-3 top-3 text-slate-400">
                <AlignLeft size={18} />
              </div>
              <textarea
                rows={2}
                placeholder="Escribe comentarios o detalles adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-sm transition-all resize-none"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              {editTransaction ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ExpenseForm;

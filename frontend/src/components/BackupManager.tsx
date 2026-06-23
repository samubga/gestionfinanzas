import React, { useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { Download, Upload, AlertCircle, CheckCircle, Loader2, Wallet, Check, Trash2, X, Database } from 'lucide-react';

export const BackupManager: React.FC = () => {
  const { user, updateStartingBalance } = useAuth();
  const { categories, refreshAll } = useFinance();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'data'>('general');

  // Separated alert messages to keep them contextual and prevent overlaps
  const [balanceSuccess, setBalanceSuccess] = useState('');
  const [balanceError, setBalanceError] = useState('');
  const [dataSuccess, setDataSuccess] = useState('');
  const [dataError, setDataError] = useState('');

  const [startingBalance, setStartingBalance] = useState(user?.startingBalance?.toString() || '0');
  const [savingBalance, setSavingBalance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  // Sync state if user data loads later
  React.useEffect(() => {
    if (user) {
      setStartingBalance(user.startingBalance.toString());
    }
  }, [user]);

  const handleExport = async () => {
    setLoading(true);
    setDataSuccess('');
    setDataError('');

    try {
      const res = await api.get('/backup/export');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `backup-finanzas-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setDataSuccess('Copia de seguridad exportada correctamente. Tu descarga debería comenzar pronto.');
    } catch (err: any) {
      setDataError('Error al exportar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setDataSuccess('');
    setDataError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!jsonContent.categories || !jsonContent.expenses) {
          throw new Error('El archivo no tiene el formato de copia de seguridad esperado.');
        }

        const res = await api.post('/backup/import', { backup: jsonContent });
        setDataSuccess(res.data.message || 'Copia de seguridad importada correctamente.');
        refreshAll(); // Reload everything
      } catch (err: any) {
        setDataError(err.message || err.response?.data?.error || 'Error al procesar el archivo.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setDataError('Error al leer el archivo.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleSaveStartingBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBalance(true);
    setBalanceSuccess('');
    setBalanceError('');

    const val = parseFloat(startingBalance);
    if (isNaN(val) || val < 0) {
      setBalanceError('Por favor introduce un saldo inicial válido mayor o igual a cero.');
      setSavingBalance(false);
      return;
    }

    try {
      await updateStartingBalance(val);
      setBalanceSuccess('Saldo inicial actualizado correctamente.');
      refreshAll();
    } catch (err: any) {
      setBalanceError('Error al actualizar el saldo inicial.');
    } finally {
      setSavingBalance(false);
    }
  };

  const handleCSVImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleCSVFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setDataSuccess('');
    setDataError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string;
        const res = await api.post('/backup/parse-csv-preview', { csvText });
        if (res.data.length === 0) {
          setDataError('No se encontraron transacciones válidas en el archivo CSV.');
        } else {
          setPreviewItems(res.data);
          setDataSuccess(`Se han detectado ${res.data.length} movimientos. Revisa y edita los detalles antes de guardarlos.`);
        }
      } catch (err: any) {
        setDataError(err.response?.data?.error || 'Error al procesar el archivo CSV.');
      } finally {
        setLoading(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setDataError('Error al leer el archivo.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleEditRow = (index: number, field: string, value: any) => {
    setPreviewItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };
      
      // If type changes, re-evaluate default category and payment method
      if (field === 'type') {
        const oldCat = categories.find(c => c.id === item.categoryId);
        const matchingNewCat = oldCat 
          ? categories.find(c => c.type === value && c.name.toLowerCase() === oldCat.name.toLowerCase())
          : null;
        updated.categoryId = matchingNewCat ? matchingNewCat.id : '';
        updated.paymentMethod = value === 'expense' ? 'Tarjeta' : null;
      }
      return updated;
    }));
  };

  const handleDeleteRow = (index: number) => {
    setPreviewItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmImport = async () => {
    if (previewItems.length === 0) return;
    setLoading(true);
    setDataSuccess('');
    setDataError('');

    try {
      const res = await api.post('/backup/import-transactions', { transactions: previewItems });
      setDataSuccess(`Importación completada con éxito. Se han creado ${res.data.expensesCount} gastos y ${res.data.incomesCount} ingresos.`);
      setPreviewItems([]);
      refreshAll();
    } catch (err: any) {
      setDataError(err.response?.data?.error || 'Error al guardar los movimientos.');
    } finally {
      setLoading(false);
    }
  };

  // 1. RENDER CSV PREVIEW MODAL/EDITOR SCREEN
  if (previewItems.length > 0) {
    const totalIncomes = previewItems
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalExpenses = previewItems
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const netTotal = totalIncomes - totalExpenses;

    return (
      <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-6xl mx-auto flex flex-col min-h-screen">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Previsualizar Movimientos</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Revisa, edita y confirma los movimientos del CSV de CaixaBank antes de guardarlos.
            </p>
          </div>
          <button
            onClick={() => {
              setPreviewItems([]);
              setDataSuccess('');
              setDataError('');
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Volver"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner / Messages */}
        {dataError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{dataError}</span>
          </div>
        )}

        {dataSuccess && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{dataSuccess}</span>
          </div>
        )}

        {/* Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Ingresos</p>
            <p className="text-lg font-black text-emerald-500">+{totalIncomes.toFixed(2)} €</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Gastos</p>
            <p className="text-lg font-black text-rose-500">-{totalExpenses.toFixed(2)} €</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Balance Neto</p>
            <p className={`text-lg font-black ${netTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {netTotal >= 0 ? '+' : ''}{netTotal.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Interactive Editing Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-4 w-28 text-center">Tipo</th>
                  <th className="py-4 px-4">Concepto</th>
                  <th className="py-4 px-4 w-40">Fecha</th>
                  <th className="py-4 px-4 w-32 text-right">Importe</th>
                  <th className="py-4 px-4 w-52">Categoría</th>
                  <th className="py-4 px-4 w-16 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {previewItems.map((item, index) => {
                  const filteredCats = categories.filter(c => c.type === item.type);
                  return (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 text-xs transition-colors"
                    >
                      {/* TYPE TOGGLE BUTTON */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleEditRow(index, 'type', item.type === 'expense' ? 'income' : 'expense')}
                          className={`w-20 py-1.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            item.type === 'expense'
                              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30'
                              : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {item.type === 'expense' ? 'Gasto' : 'Ingreso'}
                        </button>
                      </td>

                      {/* CONCEPT DESCRIPTION INPUT */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleEditRow(index, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </td>

                      {/* DATE INPUT */}
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => handleEditRow(index, 'date', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                      </td>

                      {/* AMOUNT INPUT */}
                      <td className="py-3 px-4">
                        <div className="relative">
                          <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold ${item.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {item.type === 'expense' ? '-' : '+'}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => handleEditRow(index, 'amount', e.target.value)}
                            className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all text-right"
                          />
                        </div>
                      </td>

                      {/* CATEGORY SELECT */}
                      <td className="py-3 px-4">
                        <select
                          value={item.categoryId}
                          onChange={(e) => handleEditRow(index, 'categoryId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                        >
                          <option value="">{item.type === 'expense' ? 'Sin categoría (Auto)' : 'Ninguna'}</option>
                          {filteredCats.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* DELETE ROW ACTION */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar fila"
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

          {/* Table Actions Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Mostrando {previewItems.length} movimientos. Haz click en "Confirmar e importar" cuando termines.
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  setPreviewItems([]);
                  setDataSuccess('');
                  setDataError('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer h-10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/70 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 cursor-pointer h-10 flex items-center justify-center gap-1.5 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Confirmar e importar ({previewItems.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. RENDER SETTINGS DEFAULT SCREEN (WITH SEGMENTED TAB SELECTOR)
  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Configuración y Ajustes</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">Administra tus saldos y gestiona tus copias de seguridad e importación</p>
      </div>

      {/* Segmented Section Switcher */}
      <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full sm:w-80">
        <button
          onClick={() => {
            setActiveSection('general');
            setBalanceSuccess('');
            setBalanceError('');
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSection === 'general'
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Ajustes Generales
        </button>
        <button
          onClick={() => {
            setActiveSection('data');
            setDataSuccess('');
            setDataError('');
          }}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSection === 'data'
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Importar / Exportar
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeSection === 'general' ? (
        <div className="space-y-6">
          {/* General starting balance adjustment card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="text-indigo-500" size={18} />
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Ajuste de Saldo Inicial</h3>
              </div>
              
              <form onSubmit={handleSaveStartingBalance} className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Saldo con el que comienzas (€)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">€</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={startingBalance}
                      onChange={(e) => setStartingBalance(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 text-slate-800 dark:text-white text-xs font-bold transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/70 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/10 cursor-pointer h-[42px] flex items-center justify-center gap-1"
                >
                  {savingBalance ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  Guardar
                </button>
              </form>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                Este importe representa el dinero disponible antes de registrar tu primer movimiento. Se sumará al balance total.
              </p>
            </div>

            {/* Inner localized error/success messages */}
            {balanceError && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{balanceError}</span>
              </div>
            )}

            {balanceSuccess && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{balanceSuccess}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100/50 dark:border-slate-800/20">
            <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">💡 Consejos importantes:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>El saldo inicial sirve como punto de partida. Si tienes movimientos pasados y el balance total no coincide con tu banco, puedes corregirlo aquí.</li>
              <li>Ajustar este valor actualizará el saldo total de la aplicación inmediatamente sin alterar tus registros de ingresos o gastos individuales.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Inner localized data action alert messages */}
          {dataError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{dataError}</span>
            </div>
          )}

          {dataSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
              <CheckCircle size={16} className="shrink-0 mt-0.5" />
              <span>{dataSuccess}</span>
            </div>
          )}

          {/* JSON BACKUPS CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Database className="text-indigo-500" size={18} />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Copias de Seguridad (JSON)</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Exporta todo tu historial de datos de finanzas (incluyendo categorías, transacciones, objetivos de ahorro y etiquetas) a un archivo local, o restáuralo en cualquier momento.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/10 dark:bg-slate-900 dark:hover:bg-indigo-950/10 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                </div>
                <span className="font-bold text-xs text-slate-800 dark:text-white">Exportar Historial</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Descarga tus datos a tu ordenador</span>
              </button>

              {/* Import Button */}
              <button
                onClick={handleImportClick}
                disabled={loading}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/10 dark:bg-slate-900 dark:hover:bg-emerald-950/10 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
              >
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl mb-3 group-hover:scale-110 transition-transform">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <span className="font-bold text-xs text-slate-800 dark:text-white">Importar Historial</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Sube un archivo JSON de respaldo</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* CAIXABANK CSV IMPORT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Upload className="text-indigo-500" size={18} />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Importar Movimientos (CaixaBank CSV)</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              Carga tus extractos bancarios descargados de CaixaBank en formato **CSV** para procesar los ingresos y gastos automáticamente. Podrás revisarlos y editarlos en el siguiente paso.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/40 p-4.5 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-3 border border-slate-100/50 dark:border-slate-800/20">
              <p className="font-bold text-slate-700 dark:text-slate-300">📋 Requisitos del archivo CSV:</p>
              <ul className="list-disc pl-4 space-y-1.5 leading-relaxed">
                <li><strong>Fila de Cabecera:</strong> Debe contener al menos las columnas llamadas <code>Concepto</code>, <code>Fecha</code> e <code>Importe</code>.</li>
                <li><strong>Importes (Signo):</strong> Un valor negativo (ej. <code>-66.00</code>) es un <strong>Gasto</strong>. Un valor positivo (ej. <code>1500.00</code>) es un <strong>Ingreso</strong>.</li>
                <li><strong>Columna de Categoría (Opcional):</strong> Si agregas una columna llamada <code>Categoria</code> al final, la aplicación intentará asociarla de forma automática.</li>
              </ul>
            </div>

            <button
              onClick={handleCSVImportClick}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/70 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/10 cursor-pointer transition-all h-11"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              Subir y Procesar Archivo CSV
            </button>

            <input
              type="file"
              ref={csvInputRef}
              onChange={handleCSVFileChange}
              accept=".csv"
              className="hidden"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default BackupManager;

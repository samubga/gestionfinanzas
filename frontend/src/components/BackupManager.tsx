import React, { useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { Download, Upload, AlertCircle, CheckCircle, Loader2, Wallet, Check } from 'lucide-react';

export const BackupManager: React.FC = () => {
  const { user, updateStartingBalance } = useAuth();
  const { refreshAll } = useFinance();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [startingBalance, setStartingBalance] = useState(user?.startingBalance?.toString() || '0');
  const [savingBalance, setSavingBalance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if user data loads later
  React.useEffect(() => {
    if (user) {
      setStartingBalance(user.startingBalance.toString());
    }
  }, [user]);

  const handleExport = async () => {
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const res = await api.get('/backup/export');
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `backup-finanzas-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccess('Copia de seguridad exportada correctamente. Tu descarga debería comenzar pronto.');
    } catch (err: any) {
      setError('Error al exportar los datos.');
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
    setSuccess('');
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!jsonContent.categories || !jsonContent.expenses) {
          throw new Error('El archivo no tiene el formato de copia de seguridad esperado.');
        }

        const res = await api.post('/backup/import', { backup: jsonContent });
        setSuccess(res.data.message || 'Copia de seguridad importada correctamente.');
        refreshAll(); // Reload everything
      } catch (err: any) {
        setError(err.message || err.response?.data?.error || 'Error al procesar el archivo.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setError('Error al leer el archivo.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleSaveStartingBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBalance(true);
    setSuccess('');
    setError('');

    const val = parseFloat(startingBalance);
    if (isNaN(val) || val < 0) {
      setError('Por favor introduce un saldo inicial válido mayor o igual a cero.');
      setSavingBalance(false);
      return;
    }

    try {
      await updateStartingBalance(val);
      setSuccess('Saldo inicial actualizado correctamente.');
      refreshAll();
    } catch (err: any) {
      setError('Error al actualizar el saldo inicial.');
    } finally {
      setSavingBalance(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-xl mx-auto">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Configuración y Backup</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">Configura tu saldo inicial y gestiona las copias de seguridad de tus datos</p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Starting Balance Section */}
        <div className="pb-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
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

        {/* Banner Alert */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100/50 dark:border-slate-800/20">
          <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">💡 Consejos importantes:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>La exportación crea un archivo estructurado con todas tus categorías, etiquetas, gastos, ingresos y objetivos.</li>
            <li>Al importar una copia de seguridad, los datos se **añadirán** a tu base de datos actual sin sobreescribir ni borrar registros existentes.</li>
            <li>Para evitar duplicados, asegúrate de no importar el mismo archivo más de una vez.</li>
          </ul>
        </div>

        {/* Buttons Grid */}
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

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

        </div>

      </div>

    </div>
  );
};
export default BackupManager;

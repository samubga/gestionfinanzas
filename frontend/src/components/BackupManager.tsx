import React, { useState, useRef } from 'react';
import api from '../services/api';
import { useFinance } from '../context/FinanceContext';
import { Download, Upload, AlertCircle, CheckCircle, Loader2, Database } from 'lucide-react';

export const BackupManager: React.FC = () => {
  const { refreshAll } = useFinance();
  const [loading, setLoading] = useState(false);

  // Alert messages
  const [dataSuccess, setDataSuccess] = useState('');
  const [dataError, setDataError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setDataSuccess('Copia de seguridad exportada correctamente.');
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
        if (!jsonContent.categories || !jsonContent.expenses) {
          throw new Error('El archivo no tiene el formato de copia de seguridad esperado.');
        }

        const res = await api.post('/backup/import', { backup: jsonContent });
        setDataSuccess(res.data.message || 'Copia de seguridad importada correctamente.');
        refreshAll();
      } catch (err: any) {
        setDataError(err.message || err.response?.data?.error || 'Error al procesar el archivo.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Configuración y Ajustes</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">Gestiona tus copias de seguridad e historial de datos</p>
      </div>

      <div className="space-y-6">
        {/* Database JSON Backup Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Database className="text-indigo-500" size={18} />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Copias de Seguridad (JSON)</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Exporta todo tu historial de datos de finanzas (incluyendo categorías, transacciones, objetivos de ahorro y etiquetas) a un archivo local, o restáuralo en cualquier momento.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* JSON Alerts */}
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
        </div>
      </div>
    </div>
  );
};

export default BackupManager;

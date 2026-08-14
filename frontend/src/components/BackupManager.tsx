import React, { useState, useRef } from 'react';
import api from '../services/api';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { Download, Upload, AlertCircle, CheckCircle, Loader2, Database, Palette, Sun, Moon } from 'lucide-react';

export const BackupManager: React.FC = () => {
  const { refreshAll } = useFinance();
  const [loading, setLoading] = useState(false);
  const { colorTheme, setColorTheme, dark, toggleTheme, layoutMode, setLayoutMode } = useTheme();

  const themes = [
    { id: 'indigo', name: 'Día / Noche Clásico', description: 'Gama de grises y azules clásica (por defecto)', hex: '#4f46e5' },
    { id: 'emerald', name: 'Modo Esmeralda', description: 'Gama completa de verdes esmeralda financieros', hex: '#44705a' },
    { id: 'rose', name: 'Modo Rubí', description: 'Gama de rojos intensos y rosas sofisticados', hex: '#9b3c50' },
    { id: 'amber', name: 'Modo Ámbar', description: 'Tonalidad dorada de lujo, cálida y elegante', hex: '#766246' },
    { id: 'ocean', name: 'Modo Diamante', description: 'Tonalidad azul glaciar y cian cristalino', hex: '#4c6e86' },
    { id: 'violet', name: 'Modo Amatista', description: 'Gama morada mística, creativa y profunda', hex: '#70588f' },
    { id: 'obsidian', name: 'Modo Obsidiana', description: 'Negro puro OLED y acentos grises/plata minimalistas', hex: '#121212' },
  ] as const;

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
            <Database className="text-brand-500" size={18} />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Copias de Seguridad (JSON)</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Exporta todo tu historial de datos de finanzas (incluyendo categorías, transacciones, objetivos de ahorro y etiquetas) a un archivo local, o restáuralo en cualquier momento.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 bg-slate-50/50 hover:bg-brand-50/10 dark:bg-slate-900 dark:hover:bg-brand-950/10 rounded-2xl transition-all cursor-pointer group disabled:opacity-50"
            >
              <div className="p-3 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-xl mb-3 group-hover:scale-110 transition-transform">
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

        {/* Color Theme Selector Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-brand-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-brand-800">
            <Palette className="text-brand-500" size={18} />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Apariencia y Colores</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Personaliza el aspecto de tu aplicación seleccionando uno de nuestros temas visuales de color o cambiando entre modo claro y modo oscuro.
          </p>

          {/* Layout mode switcher card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/50 dark:border-slate-850/10 space-y-3">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-white block">Estructura de Pantalla</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Elige entre el nuevo diseño Bento v2 o el diseño clásico v1</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLayoutMode('bento')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  layoutMode === 'bento'
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>✨ Bento Canvas (v2)</span>
              </button>
              <button
                onClick={() => setLayoutMode('classic')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  layoutMode === 'classic'
                    ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>📊 Clásico (v1)</span>
              </button>
            </div>
          </div>

          {/* Quick dark/light toggle card */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/50 dark:border-slate-850/10">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-white block">Tema Oscuro</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Alterna entre modo claro y modo oscuro</span>
            </div>
            <button
              onClick={toggleTheme}
              className="py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-2 transition cursor-pointer text-xs font-bold shadow-sm"
            >
              {dark ? (
                <>
                  <Sun size={14} className="text-brand-500" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon size={14} className="text-brand-500" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>
          </div>

          {/* Grid of themes */}
          <div className="space-y-3">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Elige una paleta de color</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {themes.map((t) => {
                const isSelected = colorTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setColorTheme(t.id)}
                    className={`flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'bg-brand-50/20 dark:bg-brand-950/15 border-brand-500 dark:border-brand-500/80 shadow-md shadow-brand-500/5'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-brand-500/40 dark:hover:border-brand-500/25 hover:bg-slate-50/50 dark:hover:bg-slate-950/20'
                    }`}
                  >
                    {/* Circle dot with border selection */}
                    <div
                      style={{ backgroundColor: t.hex }}
                      className="w-10 h-10 rounded-2xl shadow-inner flex-shrink-0 flex items-center justify-center border-2 border-white dark:border-slate-800"
                    >
                      {isSelected && (
                        <span className="text-white text-xs font-black drop-shadow-md">✓</span>
                      )}
                    </div>

                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-white block">
                        {t.name}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight block mt-0.5">
                        {t.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager;

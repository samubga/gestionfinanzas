import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { ExpenseForecast, ForecastComparison } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  FileText,
  Tag,
  Search,
  Sparkles
} from 'lucide-react';

export const ForecastManager: React.FC = () => {
  const { year, month, categories, tags, addTag } = useFinance();
  const notification = useNotification();
  
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<'plan' | 'compare'>('plan');
  
  // Data States
  const [forecasts, setForecasts] = useState<ExpenseForecast[]>([]);
  const [comparison, setComparison] = useState<ForecastComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [forecastsError, setForecastsError] = useState('');
  const [compareError, setCompareError] = useState('');
  
  // Create Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [linkType, setLinkType] = useState<'text' | 'category' | 'tag'>('text');
  const [categoryId, setCategoryId] = useState('');
  const [tagId, setTagId] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editLinkType, setEditLinkType] = useState<'text' | 'category' | 'tag'>('text');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editTagId, setEditTagId] = useState('');
  const [editDate, setEditDate] = useState('');

  // UI state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Month names for display
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Filter categories to only get expense types
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Fetch forecasts for current period
  const fetchForecasts = async () => {
    setLoading(true);
    setForecastsError('');
    try {
      const res = await api.get('/forecasts', {
        params: { year, month }
      });
      setForecasts(res.data);
    } catch (err: any) {
      console.error('Error fetching forecasts:', err);
      setForecastsError(err.response?.data?.error || 'Error al obtener las previsiones');
    } finally {
      setLoading(false);
    }
  };

  // Fetch comparison data for current period
  const fetchComparison = async () => {
    setLoadingCompare(true);
    setCompareError('');
    try {
      const res = await api.get('/forecasts/comparison', {
        params: { year, month }
      });
      setComparison(res.data);
    } catch (err: any) {
      console.error('Error fetching comparison:', err);
      setCompareError(err.response?.data?.error || 'Error al cargar la comparativa');
    } finally {
      setLoadingCompare(false);
    }
  };

  // Load data on period or subtab change
  useEffect(() => {
    fetchForecasts();
    if (activeSubTab === 'compare') {
      fetchComparison();
    }
  }, [year, month, activeSubTab]);

  // Handle create forecast submission
  const handleCreateForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      notification.error('La descripción es requerida.');
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      notification.error('Ingresa un importe válido mayor que 0.');
      return;
    }
    if (linkType === 'category' && !categoryId) {
      notification.error('Selecciona una categoría para vincular.');
      return;
    }
    if (linkType === 'tag' && !tagId) {
      notification.error('Selecciona o crea una etiqueta para vincular.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/forecasts', {
        amount: parseFloat(amount),
        description: description.trim(),
        categoryId: linkType === 'category' ? categoryId : null,
        tagId: linkType === 'tag' ? tagId : null,
        date: date || null,
        month,
        year
      });
      notification.success('Previsión creada correctamente.');
      
      setDescription('');
      setAmount('');
      setLinkType('text');
      setCategoryId('');
      setTagId('');
      setTagSearch('');
      setDate('');
      fetchForecasts();
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Error al guardar la previsión.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit launch
  const startEdit = (item: ExpenseForecast) => {
    setEditingId(item.id);
    setEditDescription(item.description);
    setEditAmount(item.amount.toString());
    if (item.tagId) {
      setEditLinkType('tag');
      setEditTagId(item.tagId);
      setEditCategoryId('');
    } else if (item.categoryId) {
      setEditLinkType('category');
      setEditCategoryId(item.categoryId);
      setEditTagId('');
    } else {
      setEditLinkType('text');
      setEditCategoryId('');
      setEditTagId('');
    }
    setEditDate(item.date ? item.date.split('T')[0] : '');
  };

  // Save edits
  const handleUpdateForecast = async (id: string) => {
    if (!editDescription.trim()) {
      notification.error('La descripción es requerida.');
      return;
    }
    if (!editAmount || isNaN(parseFloat(editAmount)) || parseFloat(editAmount) <= 0) {
      notification.error('Introduce un importe válido.');
      return;
    }
    if (editLinkType === 'category' && !editCategoryId) {
      notification.error('Selecciona una categoría.');
      return;
    }
    if (editLinkType === 'tag' && !editTagId) {
      notification.error('Selecciona una etiqueta.');
      return;
    }

    try {
      await api.put(`/forecasts/${id}`, {
        amount: parseFloat(editAmount),
        description: editDescription.trim(),
        categoryId: editLinkType === 'category' ? editCategoryId : null,
        tagId: editLinkType === 'tag' ? editTagId : null,
        date: editDate || null,
        month,
        year
      });
      notification.success('Previsión actualizada correctamente.');
      setEditingId(null);
      fetchForecasts();
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Error al actualizar la previsión.');
    }
  };

  // Delete forecast
  const handleDeleteForecast = async (id: string) => {
    try {
      await api.delete(`/forecasts/${id}`);
      notification.success('Previsión eliminada correctamente.');
      setDeletingId(null);
      fetchForecasts();
      if (activeSubTab === 'compare') {
        fetchComparison();
      }
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'No se pudo eliminar la previsión.');
    }
  };

  const toggleExpandItem = (id: string) => {
    if (expandedItemId === id) {
      setExpandedItemId(null);
    } else {
      setExpandedItemId(id);
    }
  };

  // Helpers to calculate totals in Plan
  const totalPlanned = forecasts.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="p-6 space-y-6 pb-28 lg:pb-6 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Previsión de Gastos <span className="text-xs bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold px-2.5 py-1 rounded-lg">{monthNames[month - 1]} {year}</span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Planifica tus presupuestos a nivel de concepto y compáralos con tus gastos reales al final del mes.</p>
        </div>

        {/* View Selector (Tabs) */}
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full sm:w-auto sm:min-w-[280px]">
          <button
            type="button"
            onClick={() => setActiveSubTab('plan')}
            className={`flex-1 sm:flex-initial sm:px-6 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'plan'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Calendar size={14} /> Planificación
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('compare')}
            className={`flex-1 sm:flex-initial sm:px-6 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'compare'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp size={14} /> Comparativa
          </button>
        </div>
      </div>

      {/* PLAN TAB */}
      {activeSubTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Create Form Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-800">
              <Plus className="text-brand-500" size={18} />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Nueva Estimación</h3>
            </div>

            <form onSubmit={handleCreateForecast} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Concepto / Descripción *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <FileText size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Vacaciones o buffet con amigos"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Estimación *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                      <DollarSign size={16} />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300"
                    />
                    <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 dark:text-slate-500 text-xs font-bold">€</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Fecha (Opcional)</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300 text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Vinculación de Gastos</span>
                  <span className="text-[9px] font-medium text-slate-400 lowercase tracking-normal flex items-center gap-0.5">
                    <Sparkles size={10} /> Define cómo emparejar los gastos reales
                  </span>
                </label>
                <div className="relative mb-3">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                    <Sparkles size={16} />
                  </span>
                  <select
                    value={linkType}
                    onChange={(e) => {
                      setLinkType(e.target.value as any);
                      setCategoryId('');
                      setTagId('');
                      setTagSearch('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                  >
                    <option value="text">Ninguno (Concordar por texto del Concepto)</option>
                    <option value="category">Por Categoría de Gastos</option>
                    <option value="tag">Por Etiqueta (Tag)</option>
                  </select>
                </div>

                {linkType === 'category' && (
                  <div className="relative animate-scale-in">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                      <Tag size={16} />
                    </span>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300 cursor-pointer font-bold border border-slate-100 dark:border-slate-800/60 focus:border-brand-500"
                    >
                      <option value="">Selecciona una categoría...</option>
                      {expenseCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {linkType === 'tag' && (
                  <div className="space-y-2 animate-scale-in">
                    {tagId ? (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/40 rounded-xl text-xs font-bold text-brand-700 dark:text-brand-400">
                        <Tag size={14} className="text-brand-500 shrink-0" />
                        <span className="truncate">Etiqueta vinculada: {tags.find(t => t.id === tagId)?.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTagId('');
                            setTagSearch('');
                          }}
                          className="ml-auto p-1 hover:bg-brand-100 dark:hover:bg-brand-900/50 rounded-lg text-brand-500 hover:text-brand-700 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                            <Search size={14} />
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar o crear etiqueta..."
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-300 font-medium"
                          />
                        </div>

                        <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-xl p-2 max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/30">
                          {tags
                            .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                            .map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  setTagId(t.id);
                                  setTagSearch('');
                                }}
                                className="w-full text-left px-2.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Tag size={12} className="text-slate-400 shrink-0" />
                                <span className="truncate">{t.name}</span>
                              </button>
                            ))
                          }

                          {tagSearch.trim() && !tags.some(t => t.name.toLowerCase() === tagSearch.trim().toLowerCase()) && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const newTag = await addTag({ name: tagSearch.trim() });
                                  setTagId(newTag.id);
                                  setTagSearch('');
                                } catch { /* FinanceContext muestra el error en el aviso global. */ }
                              }}
                              className="w-full text-left px-2.5 py-2 text-xs font-black text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Plus size={12} className="shrink-0" />
                              <span className="truncate">Crear etiqueta "{tagSearch.trim()}"</span>
                            </button>
                          )}

                          {tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && !tagSearch.trim() && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-4 font-medium">
                              Escribe para crear tu primera etiqueta.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md shadow-brand-500/10 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Añadiendo...' : 'Añadir Previsión'}
              </button>
            </form>
          </div>

          {/* List Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                Gastos Estimados del Periodo
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded-md">
                  {forecasts.length} items
                </span>
              </h3>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Estimado</span>
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">{totalPlanned.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400 font-semibold">Cargando estimaciones...</p>
              </div>
            ) : forecastsError ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <AlertTriangle className="mx-auto text-rose-500 mb-2" size={24} />
                <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">Error al cargar las previsiones</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{forecastsError}</p>
                <button 
                  type="button"
                  onClick={fetchForecasts}
                  className="mt-3 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            ) : forecasts.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-2xl">
                <Calendar className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={36} />
                <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">Sin previsiones para este mes</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">Comienza a añadir estimaciones de gastos en el formulario para tener un control más granular.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-800/60 font-bold uppercase tracking-wider">
                      <th className="py-3 px-2">Concepto / Descripción</th>
                      <th className="py-3 px-2">Vinculación</th>
                      <th className="py-3 px-2">Fecha Estimada</th>
                      <th className="py-3 px-2 text-right">Importe</th>
                      <th className="py-3 px-2 text-center w-24">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {forecasts.map((item) => {
                      const isEditing = editingId === item.id;
                      const isConfirmingDelete = deletingId === item.id;

                      if (isEditing) {
                        return (
                          <tr key={item.id} className="bg-brand-50/20 dark:bg-brand-950/10">
                            <td className="py-3 px-2" colSpan={5}>
                              <div className="space-y-3 p-2">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-700 dark:text-slate-300"
                                    placeholder="Descripción"
                                  />
                                  <div className="flex flex-col gap-1.5">
                                    <select
                                      value={editLinkType}
                                      onChange={(e) => {
                                        setEditLinkType(e.target.value as any);
                                        setEditCategoryId('');
                                        setEditTagId('');
                                      }}
                                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                                    >
                                      <option value="text">Texto</option>
                                      <option value="category">Categoría</option>
                                      <option value="tag">Etiqueta</option>
                                    </select>
                                    
                                    {editLinkType === 'category' && (
                                      <select
                                        value={editCategoryId}
                                        onChange={(e) => setEditCategoryId(e.target.value)}
                                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-850 border border-brand-100 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer font-bold"
                                      >
                                        <option value="">[Categoría...]</option>
                                        {expenseCategories.map((c) => (
                                          <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                      </select>
                                    )}

                                    {editLinkType === 'tag' && (
                                      <select
                                        value={editTagId}
                                        onChange={(e) => setEditTagId(e.target.value)}
                                        className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-850 border border-brand-100 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer font-bold"
                                      >
                                        <option value="">[Etiqueta...]</option>
                                        {tags.map((t) => (
                                          <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-700 dark:text-slate-300 text-center"
                                  />
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editAmount}
                                      onChange={(e) => setEditAmount(e.target.value)}
                                      className="w-full pl-2.5 pr-6 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg text-slate-700 dark:text-slate-300 font-bold"
                                      placeholder="0.00"
                                    />
                                    <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-bold">€</span>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 text-[10px]">
                                  <button
                                    onClick={() => handleUpdateForecast(item.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check size={12} /> Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <X size={12} /> Cancelar
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-3.5 px-2 font-bold text-slate-700 dark:text-slate-200">
                            {item.description}
                          </td>
                          <td className="py-3.5 px-2">
                            {item.tag ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100/50 dark:border-brand-900/30 flex items-center gap-1.5 w-fit">
                                <Tag size={10} className="text-brand-500" />
                                Tag: {item.tag.name}
                              </span>
                            ) : item.category ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 w-fit"
                                style={{ 
                                  backgroundColor: `${item.category.color}15`, 
                                  color: item.category.color 
                                }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.category.color }} />
                                {item.category.name}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1 w-fit">
                                <Search size={10} /> Textual
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-slate-500 dark:text-slate-400 font-medium">
                            {item.date ? new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="py-3.5 px-2 text-right font-black text-slate-800 dark:text-slate-200">
                            {item.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {isConfirmingDelete ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleDeleteForecast(item.id)}
                                  className="p-1.5 bg-rose-500 text-white rounded-lg font-bold text-[9px] hover:bg-rose-600 transition-colors cursor-pointer"
                                  title="Confirmar eliminación"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-[9px] hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => startEdit(item)}
                                  className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                                  title="Editar previsión"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeletingId(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar previsión"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPARISON TAB */}
      {activeSubTab === 'compare' && (
        <div className="space-y-6">
          
          {loadingCompare ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">Procesando y cruzando tus transacciones...</p>
            </div>
          ) : compareError ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full">
              <AlertTriangle className="mx-auto text-rose-500 mb-3" size={36} />
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">Error al cargar la comparativa</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">{compareError}</p>
              <button 
                type="button"
                onClick={fetchComparison}
                className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : !comparison ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-full">
              <TrendingUp className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={36} />
              <h4 className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">No hay datos comparativos</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Intenta planificar previsiones primero.</p>
            </div>
          ) : (
            <>
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* Total Budgeted */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Presupuestado</span>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                    {comparison.totalEstimated.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Suma de previsiones creadas</p>
                </div>

                {/* Total Spent in Forecasts */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Gastado Coincidente</span>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                    {comparison.totalSpentMatched.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Gasto mapeado a previsiones</p>
                </div>

                {/* Net Deviation */}
                {(() => {
                  const diff = comparison.totalEstimated - comparison.totalSpentMatched;
                  const isPositive = diff >= 0;
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Desviación en Previsiones</span>
                      <h3 className={`text-2xl font-black mt-1 flex items-center gap-1.5 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                        {Math.abs(diff).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </h3>
                      <p className="text-[10px] mt-1 font-semibold">
                        {isPositive ? (
                          <span className="text-emerald-500">Bajo control (ahorro del presupuesto)</span>
                        ) : (
                          <span className="text-rose-500">Sobrepresupuesto (exceso de gasto)</span>
                        )}
                      </p>
                    </div>
                  );
                })()}

                {/* Leftovers / Non budgeted */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Fuera de Previsión</span>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                    {comparison.totalUnmatchedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Gastos sin previsión asignada</p>
                </div>

              </div>

              {/* Forecast items comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Main Comparison Progress List */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-50 dark:border-slate-800">
                    Seguimiento Presupuestario
                  </h3>

                  {comparison.items.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs text-slate-400 font-semibold">Crea previsiones en la pestaña de Planificación para visualizarlas aquí.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {comparison.items.map((item) => {
                        const percent = item.amountEstimated > 0 
                          ? Math.min((item.amountSpent / item.amountEstimated) * 100, 200) 
                          : 0;
                        const isExpanded = expandedItemId === item.id;
                        
                        // Progress bar color based on percentage spent
                        let barColor = 'bg-brand-600 dark:bg-brand-500';
                        let textColor = 'text-brand-600 dark:text-brand-400';
                        let bgLightColor = 'bg-brand-50 dark:bg-brand-950/20';
                        if (percent >= 100) {
                          barColor = 'bg-rose-500';
                          textColor = 'text-rose-500';
                          bgLightColor = 'bg-rose-50 dark:bg-rose-950/20';
                        } else if (percent >= 80) {
                          barColor = 'bg-amber-500';
                          textColor = 'text-amber-500';
                          bgLightColor = 'bg-amber-50 dark:bg-amber-950/20';
                        } else if (percent > 0) {
                          barColor = 'bg-emerald-500';
                          textColor = 'text-emerald-500';
                          bgLightColor = 'bg-emerald-50 dark:bg-emerald-950/20';
                        }

                        return (
                          <div 
                            key={item.id} 
                            className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/40 rounded-xl hover:shadow-sm transition-all"
                          >
                            {/* Flex header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white leading-tight">
                                  {item.description}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                  {item.tag ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100/50 dark:border-brand-900/30 flex items-center gap-1 w-fit">
                                      <Tag size={8} className="text-brand-500" />
                                      Etiqueta: {item.tag.name}
                                    </span>
                                  ) : item.category ? (
                                    <span 
                                      className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 w-fit"
                                      style={{ 
                                        backgroundColor: `${item.category.color}15`, 
                                        color: item.category.color 
                                      }}
                                    >
                                      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: item.category.color }} />
                                      {item.category.name}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-0.5 w-fit">
                                      <Search size={8} /> Coincidencias: "{item.description.slice(0, 15)}"
                                    </span>
                                  )}
                                  
                                  {item.date && (
                                    <span className="text-[9px] font-medium text-slate-400 flex items-center gap-0.5">
                                      <Calendar size={10} /> {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 leading-none">CONSUMIDO</div>
                                <div className="mt-1 font-black text-slate-800 dark:text-white text-sm">
                                  {item.amountSpent.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1">
                                    / {item.amountEstimated.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mt-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`font-black px-1.5 py-0.5 rounded-md ${bgLightColor} ${textColor}`}>
                                  {percent.toFixed(0)}%
                                </span>
                                <span className="font-semibold text-slate-400 dark:text-slate-500">
                                  {percent >= 100 
                                    ? `Exceso de ${(item.amountSpent - item.amountEstimated).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` 
                                    : `Disponible ${(item.amountEstimated - item.amountSpent).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                                  }
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
                                  style={{ width: `${Math.min(percent, 100)}%` }} 
                                />
                              </div>
                            </div>

                            {/* Details expander */}
                            {item.matchedExpenses.length > 0 && (
                              <div className="mt-3 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                                <button
                                  onClick={() => toggleExpandItem(item.id)}
                                  className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                >
                                  <span>VER TRANSACCIONES VINCULADAS ({item.matchedExpenses.length})</span>
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                                
                                {isExpanded && (
                                  <div className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                    {item.matchedExpenses.map(exp => (
                                      <div key={exp.id} className="flex items-center justify-between py-1 px-2.5 bg-white dark:bg-slate-900 border border-slate-50 dark:border-slate-850 rounded-lg text-[10px]">
                                        <div className="space-y-0.5">
                                          <p className="font-semibold text-slate-700 dark:text-slate-300">{exp.description}</p>
                                          <p className="text-[8px] text-slate-400 dark:text-slate-500">
                                            {new Date(exp.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                          </p>
                                        </div>
                                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                          {exp.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* Leftovers Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="text-amber-500" size={16} /> Gastos No Planificados
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    Transacciones del periodo que no coinciden con ninguna de tus previsiones por categoría o concordancia textual.
                  </p>

                  {comparison.unmatchedExpenses.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-xs text-slate-400 font-semibold">¡Excelente! Todos tus gastos están planificados.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {comparison.unmatchedExpenses.map((exp) => (
                        <div 
                          key={exp.id} 
                          className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/40 rounded-xl text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-bold text-slate-700 dark:text-slate-300 truncate">{exp.description}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {new Date(exp.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                          <span className="font-black text-rose-500 whitespace-nowrap">
                            -{exp.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
};

export default ForecastManager;

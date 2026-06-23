import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Search, Filter, Trash2, Edit3, Copy, Plus, ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface TransactionsProps {
  onOpenAddExpense: (type?: 'expense' | 'income') => void;
  onOpenEditExpense: (transaction: any) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  onOpenAddExpense,
  onOpenEditExpense
}) => {
  const {
    expenses,
    incomes,
    categories,
    tags: availableTags,
    loading,
    // Filter values and setters
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    filterCategoryId,
    setFilterCategoryId,
    filterTags,
    setFilterTags,
    filterSearch,
    setFilterSearch,
    resetFilters,
    // CUD
    deleteExpense,
    duplicateExpense,
    deleteIncome,
    deleteExpensesBulk,
    deleteIncomesBulk
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes'>('expenses');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown size={12} className="text-slate-300 dark:text-slate-600 ml-1.5 shrink-0" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={12} className="text-indigo-600 dark:text-indigo-400 ml-1.5 shrink-0" />;
    }
    return <ChevronDown size={12} className="text-indigo-600 dark:text-indigo-400 ml-1.5 shrink-0" />;
  };

  const currentItems = activeTab === 'expenses' ? expenses : incomes;
  const filterCategoriesList = categories.filter(c => c.type === (activeTab === 'expenses' ? 'expense' : 'income'));

  const sortedExpenses = [...expenses].sort((a, b) => {
    let valA = sortField === 'category' ? (a.category?.name || '') : (a as any)[sortField];
    let valB = sortField === 'category' ? (b.category?.name || '') : (b as any)[sortField];

    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && (sortField === 'createdAt' || sortField === 'date')) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    } else {
      if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === 'asc'
          ? valA.getTime() - valB.getTime()
          : valB.getTime() - valA.getTime();
      }
      return sortDirection === 'asc'
        ? (valA > valB ? 1 : -1)
        : (valA < valB ? 1 : -1);
    }
  });

  const sortedIncomes = [...incomes].sort((a, b) => {
    let valA = sortField === 'category' ? (a.category?.name || '') : (a as any)[sortField];
    let valB = sortField === 'category' ? (b.category?.name || '') : (b as any)[sortField];

    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && (sortField === 'createdAt' || sortField === 'date')) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    } else {
      if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === 'asc'
          ? valA.getTime() - valB.getTime()
          : valB.getTime() - valA.getTime();
      }
      return sortDirection === 'asc'
        ? (valA > valB ? 1 : -1)
        : (valA < valB ? 1 : -1);
    }
  });

  const handleTabChange = (tab: 'expenses' | 'incomes') => {
    setActiveTab(tab);
    setSelectedIds([]);
  };

  const handleResetFilters = () => {
    resetFilters();
    setSelectedIds([]);
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.length;
    const typeText = activeTab === 'expenses' ? 'gastos' : 'ingresos';
    if (window.confirm(`¿Estás seguro de que quieres eliminar los ${count} ${typeText} seleccionados?`)) {
      try {
        if (activeTab === 'expenses') {
          await deleteExpensesBulk(selectedIds);
        } else {
          await deleteIncomesBulk(selectedIds);
        }
        setSelectedIds([]);
      } catch (err: any) {
        alert(`Error al eliminar los ${typeText}`);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateExpense(id);
    } catch (err: any) {
      alert('Error al duplicar el gasto');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      try {
        await deleteExpense(id);
      } catch (err) {
        alert('Error al eliminar el gasto');
      }
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ingreso?')) {
      try {
        await deleteIncome(id);
      } catch (err) {
        alert('Error al eliminar el ingreso');
      }
    }
  };

  // Helper to format tags into comma separated string for input
  const handleTagToggle = (tagName: string) => {
    const activeTags = filterTags ? filterTags.split(',').map(t => t.trim()) : [];
    if (activeTags.includes(tagName)) {
      const updated = activeTags.filter(t => t !== tagName);
      setFilterTags(updated.join(','));
    } else {
      setFilterTags([...activeTags, tagName].filter(Boolean).join(','));
    }
  };

  const activeFilterCount = [
    filterStartDate,
    filterEndDate,
    filterCategoryId,
    filterTags,
    filterSearch
  ].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-60px)] md:min-h-screen">
      
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Listado de Movimientos</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Historial completo y control de transacciones</p>
        </div>
        <button
          onClick={() => onOpenAddExpense(activeTab === 'expenses' ? 'expense' : 'income')}
          className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          {activeTab === 'expenses' ? 'Añadir Gasto' : 'Añadir Ingreso'}
        </button>
      </div>

      {/* Selector: Gastos / Ingresos & Filters Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl max-w-xs w-full sm:w-64">
          <button
            onClick={() => handleTabChange('expenses')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            Gastos ({expenses.length})
          </button>
          <button
            onClick={() => handleTabChange('incomes')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'incomes'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            Ingresos ({incomes.length})
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Eliminar ({selectedIds.length})</span>
            </button>
          )}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 text-indigo-700 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Date Ragne */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rango de fechas</label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Categoría</label>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white"
            >
              <option value="">Todas las categorías</option>
              {filterCategoriesList.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              {activeTab === 'incomes' && (
                <option value="null">Sin categoría (Ninguna)</option>
              )}
            </select>
          </div>

          {/* Tags Filter (Expenses only) */}
          {activeTab === 'expenses' && (
            <div className="space-y-2 lg:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Etiquetas</label>
              <div className="flex flex-wrap gap-1.5 max-h-[70px] overflow-y-auto p-1.5 border border-slate-50 dark:border-slate-800/60 rounded-lg">
                {availableTags.map(tag => {
                  const activeTags = filterTags ? filterTags.split(',').map(t => t.trim()) : [];
                  const isSelected = activeTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reset Filters */}
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              onClick={handleResetFilters}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Restablecer Filtros
            </button>
          </div>
        </div>
      )}

      {/* Loader */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* Transactions List */
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {activeTab === 'expenses' ? (
            expenses.length > 0 ? (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={expenses.length > 0 && selectedIds.length === expenses.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                        />
                      </th>
                      <th onClick={() => handleSort('description')} className="py-4 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Concepto
                          {renderSortIcon('description')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('date')} className="py-4 px-4 hidden sm:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Fecha
                          {renderSortIcon('date')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('category')} className="py-4 px-4 hidden sm:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Categoría
                          {renderSortIcon('category')}
                        </div>
                      </th>
                      <th className="py-4 px-4 hidden md:table-cell">Etiquetas</th>
                      <th onClick={() => handleSort('paymentMethod')} className="py-4 px-4 hidden md:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Método
                          {renderSortIcon('paymentMethod')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('amount')} className="py-4 px-4 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-end">
                          Importe
                          {renderSortIcon('amount')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('createdAt')} className="py-4 px-4 hidden lg:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Creado el
                          {renderSortIcon('createdAt')}
                        </div>
                      </th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {sortedExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/10 text-xs transition-colors ${
                          selectedIds.includes(exp.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(exp.id)}
                            onChange={(e) => handleSelectItem(exp.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                          />
                        </td>
                        {/* Concept */}
                        <td className="py-4 px-4 max-w-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 sm:hidden">
                              {new Date(exp.date).toLocaleDateString('es-ES')}
                            </p>
                            {exp.notes && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5 italic truncate">
                                {exp.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        {/* Date */}
                        <td className="py-4 px-4 hidden sm:table-cell text-slate-650 dark:text-slate-400 font-medium">
                          {new Date(exp.date).toLocaleDateString('es-ES')}
                        </td>
                        {/* Category */}
                        <td className="py-4 px-4 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: exp.category?.color || '#94A3B8' }} />
                            <span className="font-medium text-slate-600 dark:text-slate-400">{exp.category?.name || 'Sin categoría'}</span>
                          </span>
                        </td>
                        {/* Tags */}
                        <td className="py-4 px-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {exp.tags.map(t => (
                              <span key={t.id} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-bold">
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        {/* Payment Method */}
                        <td className="py-4 px-4 hidden md:table-cell text-slate-500 dark:text-slate-400 font-semibold">{exp.paymentMethod || 'Tarjeta'}</td>
                        {/* Amount */}
                        <td className="py-4 px-4 text-right">
                          <span className="font-extrabold text-red-500 text-sm">-{exp.amount.toFixed(2)} €</span>
                        </td>
                        {/* Created At */}
                        <td className="py-4 px-4 hidden lg:table-cell text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                          {new Date(exp.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleDuplicate(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Duplicar"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => onOpenEditExpense(exp)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500">
                <span className="text-4xl mb-3"><ArrowDownRight className="inline border-2 border-red-500/20 p-1.5 rounded-full text-red-500 bg-red-50/10" size={50} /></span>
                <p className="font-semibold text-sm">No se encontraron gastos</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Registra un nuevo gasto o modifica tus criterios de filtrado.</p>
              </div>
            )
          ) : (
            incomes.length > 0 ? (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={incomes.length > 0 && selectedIds.length === incomes.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                        />
                      </th>
                      <th onClick={() => handleSort('description')} className="py-4 px-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Concepto
                          {renderSortIcon('description')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('date')} className="py-4 px-4 hidden sm:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Fecha
                          {renderSortIcon('date')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('category')} className="py-4 px-4 hidden sm:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Categoría
                          {renderSortIcon('category')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('amount')} className="py-4 px-4 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-end">
                          Importe
                          {renderSortIcon('amount')}
                        </div>
                      </th>
                      <th onClick={() => handleSort('createdAt')} className="py-4 px-4 hidden lg:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Creado el
                          {renderSortIcon('createdAt')}
                        </div>
                      </th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {sortedIncomes.map((inc) => (
                      <tr
                        key={inc.id}
                        className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/10 text-xs transition-colors ${
                          selectedIds.includes(inc.id) ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(inc.id)}
                            onChange={(e) => handleSelectItem(inc.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900 cursor-pointer"
                          />
                        </td>
                        {/* Concept */}
                        <td className="py-4 px-4 max-w-xs">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{inc.description}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 sm:hidden">
                              {new Date(inc.date).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </td>
                        {/* Date */}
                        <td className="py-4 px-4 hidden sm:table-cell text-slate-650 dark:text-slate-400 font-medium">
                          {new Date(inc.date).toLocaleDateString('es-ES')}
                        </td>
                        {/* Category */}
                        <td className="py-4 px-4 hidden sm:table-cell">
                          {inc.category ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: inc.category.color }} />
                              <span className="font-medium text-slate-600 dark:text-slate-400">{inc.category.name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Sin categoría</span>
                          )}
                        </td>
                        {/* Amount */}
                        <td className="py-4 px-4 text-right">
                          <span className="font-extrabold text-emerald-500 text-sm">+{inc.amount.toFixed(2)} €</span>
                        </td>
                        {/* Created At */}
                        <td className="py-4 px-4 hidden lg:table-cell text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                          {new Date(inc.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => onOpenEditExpense(inc)}
                              className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteIncome(inc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-500">
                <span className="text-4xl mb-3"><ArrowUpRight className="inline border-2 border-emerald-500/20 p-1.5 rounded-full text-emerald-500 bg-emerald-50/10" size={50} /></span>
                <p className="font-semibold text-sm">No se encontraron ingresos</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Registra un nuevo ingreso o modifica tus criterios de filtrado.</p>
              </div>
            )
          )}
        </div>
      )}

    </div>
  );
};
export default Transactions;

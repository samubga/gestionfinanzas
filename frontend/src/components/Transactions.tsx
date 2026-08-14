import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Search, Filter, Trash2, Edit3, Edit, Copy, Plus, ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown, ChevronsUpDown, Upload, AlertCircle, CheckCircle, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import * as XLSX from 'xlsx';

// Returns '#000000' or '#ffffff' depending on which gives better contrast with bgHex
function getContrastColor(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1e293b' : '#ffffff';
}

interface TransactionsProps {
  onOpenAddExpense: (type?: 'expense' | 'income' | 'transfer') => void;
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
    year,
    month,
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
    filterBank,
    setFilterBank,
    filterMinAmount,
    setFilterMinAmount,
    filterMaxAmount,
    setFilterMaxAmount,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    resetFilters,
    // CUD
    deleteExpense,
    duplicateExpense,
    deleteIncome,
    deleteExpensesBulk,
    deleteIncomesBulk,
    refreshAll,
    accounts,
    transfers,
    deleteTransfer
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes' | 'transfers'>('expenses');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewTab, setPreviewTab] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [importLoading, setImportLoading] = useState(false);
  const [dataSuccess, setDataSuccess] = useState('');
  const [dataError, setDataError] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFields, setBulkFields] = useState<{
    updateDate: boolean;
    date: string;
    updateDescription: boolean;
    description: string;
    updateNotes: boolean;
    notes: string;
    updateCategory: boolean;
    categoryId: string;
    updateBank: boolean;
    bank: string;
    updateTags: boolean;
    tags: string[];
    tagsMode: 'add' | 'replace';
  }>({
    updateDate: false,
    date: new Date().toISOString().slice(0, 10),
    updateDescription: false,
    description: '',
    updateNotes: false,
    notes: '',
    updateCategory: false,
    categoryId: '',
    updateBank: false,
    bank: accounts[0]?.id || '',
    updateTags: false,
    tags: [],
    tagsMode: 'add'
  });

  const resetBulkFields = () => {
    setBulkFields({
      updateDate: false,
      date: new Date().toISOString().slice(0, 10),
      updateDescription: false,
      description: '',
      updateNotes: false,
      notes: '',
      updateCategory: false,
      categoryId: '',
      updateBank: false,
      bank: accounts[0]?.id || '',
      updateTags: false,
      tags: [],
      tagsMode: 'add'
    });
  };

  const handleBulkTagToggle = (tagName: string) => {
    setBulkFields(prev => {
      const isSelected = prev.tags.includes(tagName);
      const updatedTags = isSelected
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName];
      return { ...prev, tags: updatedTags };
    });
  };

  const csvInputRef = useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'duplicate' | 'delete' | 'bulkDelete';
    targetId?: string;
    targetType?: 'expense' | 'income';
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: 'delete',
  });

  const handleConfirmAction = async () => {
    const { actionType, targetId, targetType } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    try {
      if (actionType === 'duplicate' && targetId) {
        await duplicateExpense(targetId);
      } else if (actionType === 'delete' && targetId) {
        if (targetType === 'expense') {
          await deleteExpense(targetId);
        } else {
          await deleteIncome(targetId);
        }
      } else if (actionType === 'bulkDelete') {
        if (activeTab === 'expenses') {
          await deleteExpensesBulk(selectedIds);
        } else {
          await deleteIncomesBulk(selectedIds);
        }
        setSelectedIds([]);
      }
    } catch (err: any) {
      alert('Error al realizar la acción.');
    }
  };

  // Auto-dismiss alerts after 4 seconds
  useEffect(() => {
    if (dataSuccess) {
      const timer = setTimeout(() => setDataSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [dataSuccess]);

  useEffect(() => {
    if (dataError) {
      const timer = setTimeout(() => setDataError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [dataError]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        // Third state: return to default (date desc)
        setSortField('date');
        setSortDirection('desc');
      }
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
      return <ChevronUp size={12} className="text-brand-600 dark:text-brand-400 ml-1.5 shrink-0" />;
    }
    return <ChevronDown size={12} className="text-brand-600 dark:text-brand-400 ml-1.5 shrink-0" />;
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

  const sortedTransfers = [...transfers].sort((a, b) => {
    let valA = sortField === 'date' ? new Date(a.date).getTime() : (a as any)[sortField];
    let valB = sortField === 'date' ? new Date(b.date).getTime() : (b as any)[sortField];

    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && (sortField === 'createdAt' || sortField === 'date')) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    } else {
      return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    }
  });

  const handleTabChange = (tab: 'expenses' | 'incomes' | 'transfers') => {
    setActiveTab(tab);
    setSelectedIds([]);
    setIsBulkModalOpen(false);
  };

  const handleResetFilters = () => {
    resetFilters();
    setSelectedIds([]);
    setIsBulkModalOpen(false);
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

  const handleCSVImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');

    const reader = new FileReader();
    reader.onload = async (event) => {
      setImportLoading(true);
      setDataSuccess('');
      setDataError('');
      
      try {
        let csvText = '';
        if (isExcel) {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if (!arrayBuffer) throw new Error('No se pudo leer el contenido del archivo Excel.');
          
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
          
          let headerRowIdx = -1;
          let headers: string[] = [];
          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const rowVals = row.map(v => String(v).trim());
            if (rowVals.includes('F. Operación') && (rowVals.includes('Ingreso (+)') || rowVals.includes('Gasto (-)'))) {
              headerRowIdx = r;
              headers = rowVals;
              break;
            }
          }
          
          if (headerRowIdx === -1) {
            throw new Error('No se detectaron las cabeceras de CaixaBank (F. Operación, Ingreso, Gasto) en el archivo Excel.');
          }
          
          const colDate = headers.indexOf('F. Operación');
          const colIngreso = headers.indexOf('Ingreso (+)');
          const colGasto = headers.indexOf('Gasto (-)');
          
          const conceptCols: number[] = [];
          headers.forEach((h, idx) => {
            if (h.startsWith('Concepto complementario') || h === 'Concepto propio') {
              conceptCols.push(idx);
            }
          });
          
          const csvRows: string[] = [];
          csvRows.push('Concepto;Fecha;Importe');
          
          for (let r = headerRowIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || row.length <= colDate) continue;
            
            const dateVal = String(row[colDate]).trim();
            if (!dateVal) continue;
            
            const ingresoVal = colIngreso !== -1 && row.length > colIngreso ? row[colIngreso] : '';
            const gastoVal = colGasto !== -1 && row.length > colGasto ? row[colGasto] : '';
            
            const parseAmount = (val: any): number => {
              if (val === null || val === undefined || val === '') return 0;
              if (typeof val === 'number') return val;
              const cleaned = String(val).replace(/\./g, '').replace(',', '.').trim();
              const parsed = parseFloat(cleaned);
              return isNaN(parsed) ? 0 : parsed;
            };
            
            const ingreso = parseAmount(ingresoVal);
            const gasto = parseAmount(gastoVal);
            
            let amount = 0;
            if (ingreso > 0) {
              amount = ingreso;
            } else if (gasto > 0) {
              amount = -gasto;
            } else {
              if (ingresoVal === '' && gastoVal === '') continue;
            }
            
            const conceptParts: string[] = [];
            conceptCols.forEach(cIdx => {
              if (row.length > cIdx) {
                const val = String(row[cIdx]).trim();
                if (val) conceptParts.push(val);
              }
            });
            
            let concepto = conceptParts.join(' - ');
            concepto = concepto.replace(/\s+/g, ' ').trim();
            if (!concepto) {
              concepto = 'Movimiento CaixaBank';
            }
            
            const escapedConcepto = `"${concepto.replace(/"/g, '""')}"`;
            const formattedAmount = amount.toFixed(2).replace('.', ',');
            
            csvRows.push(`${escapedConcepto};${dateVal};${formattedAmount}`);
          }
          
          csvText = csvRows.join('\n');
        } else {
          csvText = event.target?.result as string;
          if (typeof csvText !== 'string') throw new Error('No se pudo leer el contenido del archivo CSV.');
        }

        const res = await api.post('/backup/parse-csv-preview', { csvText });
        setPreviewItems(res.data);
      } catch (err: any) {
        setDataError(err.message || err.response?.data?.error || 'Error al procesar el archivo.');
      } finally {
        setImportLoading(false);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }
    e.target.value = '';
  };

  const handleEditRow = (index: number, field: string, value: any) => {
    const updated = [...previewItems];
    const item = updated[index];
    updated[index] = { ...item, [field]: value };

    if (field === 'type') {
      const oldCat = categories.find(c => c.id === item.categoryId);
      const matchingNewCat = oldCat 
        ? categories.find(c => c.type === value && c.name.toLowerCase() === oldCat.name.toLowerCase())
        : null;
      updated[index].categoryId = matchingNewCat ? matchingNewCat.id : '';
      updated[index].paymentMethod = value === 'expense' ? 'Tarjeta' : null;
      updated[index].tags = value === 'expense' ? [] : null;
    }
    setPreviewItems(updated);
  };

  const handleDeleteRow = (index: number) => {
    setPreviewItems(previewItems.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    const transactionsToImport = previewItems.filter(item => !item.alreadyExists);
    if (transactionsToImport.length === 0) return;
    setImportLoading(true);
    setDataSuccess('');
    setDataError('');

    try {
      const res = await api.post('/backup/import-transactions', { transactions: transactionsToImport });
      setDataSuccess(`Importación completada con éxito. Se han creado ${res.data.expensesCount} gastos, ${res.data.incomesCount} ingresos y ${res.data.transfersCount || 0} traspasos.`);
      setPreviewItems([]);
      setSelectedIds([]);
      refreshAll();
    } catch (err: any) {
      setDataError(err.response?.data?.error || 'Error al guardar los movimientos.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setImportLoading(true);
      setDataSuccess('');
      setDataError('');

      const payload: any = { ids: selectedIds };
      if (bulkFields.updateDate) payload.date = bulkFields.date;
      if (bulkFields.updateDescription) payload.description = bulkFields.description;
      if (bulkFields.updateNotes) payload.notes = bulkFields.notes;
      if (bulkFields.updateCategory) payload.categoryId = bulkFields.categoryId || null;
      if (bulkFields.updateBank) payload.bank = bulkFields.bank;
      if (activeTab === 'expenses' && bulkFields.updateTags) {
        payload.tags = bulkFields.tags;
        payload.tagsMode = bulkFields.tagsMode;
      }

      const url = activeTab === 'expenses' ? '/expenses/bulk-update' : '/incomes/bulk-update';
      const res = await api.post(url, payload);
      setDataSuccess(res.data.message || `Actualizados ${selectedIds.length} movimientos correctamente.`);
      setSelectedIds([]);
      setIsBulkModalOpen(false);
      refreshAll();
    } catch (err: any) {
      setDataError(err.response?.data?.error || 'Error al actualizar movimientos en bloque');
    } finally {
      setImportLoading(false);
    }
  };

  const handleBulkDelete = () => {
    const count = selectedIds.length;
    const typeText = activeTab === 'expenses' ? 'gastos' : 'ingresos';
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Movimientos',
      message: `¿Estás seguro de que deseas eliminar los ${count} ${typeText} seleccionados? Esta acción no se puede deshacer.`,
      actionType: 'bulkDelete',
    });
  };

  const handleDuplicate = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Duplicar Movimiento',
      message: '¿Estás seguro de que quieres duplicar este movimiento?',
      actionType: 'duplicate',
      targetId: id,
    });
  };

  const handleDeleteExpense = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Gasto',
      message: '¿Estás seguro de que deseas eliminar este gasto de forma permanente? Esta acción no se puede deshacer.',
      actionType: 'delete',
      targetId: id,
      targetType: 'expense',
    });
  };

  const handleDeleteIncome = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Ingreso',
      message: '¿Estás seguro de que deseas eliminar este ingreso de forma permanente? Esta acción no se puede deshacer.',
      actionType: 'delete',
      targetId: id,
      targetType: 'income',
    });
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

  const defaultStart = (() => {
    const start = new Date(year, month - 1, 1);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const defaultEnd = (() => {
    const end = new Date(year, month, 0);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, '0');
    const d = String(end.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const activeFilterCount = [
    filterStartDate !== defaultStart ? filterStartDate : '',
    filterEndDate !== defaultEnd ? filterEndDate : '',
    filterCategoryId,
    filterTags,
    filterSearch,
    filterBank,
    filterMinAmount,
    filterMaxAmount
  ].filter(Boolean).length;

  if (previewItems.length > 0) {
    const duplicatesCount = previewItems.filter(item => item.alreadyExists).length;
    const newCount = previewItems.length - duplicatesCount;

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
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Previsualizar Movimientos Bancarios</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Revisa, edita y confirma los movimientos del CSV (CaixaBank / Trade Republic) antes de guardarlos.
            </p>
          </div>
          <button
            onClick={() => {
              setPreviewItems([]);
              setDataSuccess('');
              setDataError('');
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Volver"
          >
            <X size={20} />
          </button>
        </div>



        {duplicatesCount > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              Se han detectado <strong>{duplicatesCount}</strong> movimientos ya importados previamente.
              Estos movimientos se muestran bloqueados y serán omitidos de la importación automáticamente.
            </span>
          </div>
        )}

        {/* Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Ingresos</p>
            <p className="text-lg font-black text-emerald-500">+{totalIncomes.toFixed(2)} €</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Total Gastos</p>
            <p className="text-lg font-black text-rose-500">-{totalExpenses.toFixed(2)} €</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Balance Neto</p>
            <p className={`text-lg font-black ${netTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {netTotal >= 0 ? '+' : ''}{netTotal.toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Edit Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Preview Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/10 gap-2 shrink-0 overflow-x-auto">
            {[
              { id: 'all', label: 'Todos', count: previewItems.length },
              { id: 'expense', label: 'Gastos', count: previewItems.filter(i => i.type === 'expense').length },
              { id: 'income', label: 'Ingresos', count: previewItems.filter(i => i.type === 'income').length },
              { id: 'transfer', label: 'Movimientos', count: previewItems.filter(i => i.type === 'transfer').length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPreviewTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  previewTab === tab.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab.label} <span className={`text-[10px] ml-0.5 ${previewTab === tab.id ? 'text-brand-200' : 'text-slate-400'}`}>({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="overflow-auto max-h-[calc(100vh-310px)] min-h-[300px] flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)] dark:shadow-[inset_0_-1px_0_rgba(30,41,59,1)]">
                <tr className="bg-slate-50/50 dark:bg-slate-800/10 text-slate-400 dark:text-slate-550 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/60">
                  <th className="py-4 px-4 w-28 text-center">Tipo</th>
                  <th className="py-4 px-4">Concepto</th>
                  <th className="py-4 px-4 w-32">Fecha</th>
                  <th className="py-4 px-4 w-40 text-right">Importe</th>
                  {previewTab === 'transfer' ? (
                    <>
                      <th className="py-4 px-4 w-44">Cuenta Origen</th>
                      <th className="py-4 px-4 w-44">Cuenta Destino</th>
                    </>
                  ) : (
                    <th className="py-4 px-4 w-44">
                      Categoría y Cuenta
                    </th>
                  )}
                  {(previewTab === 'all' || previewTab === 'expense') && (
                    <th className="py-4 px-4 w-44">Etiquetas</th>
                  )}
                  <th className="py-4 px-4 w-16 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {previewItems
                  .map((item, originalIndex) => ({ ...item, originalIndex }))
                  .filter(item => {
                    if (previewTab === 'all') return true;
                    return item.type === previewTab;
                  })
                  .map((item) => {
                    const index = item.originalIndex;
                    const filteredCats = categories.filter(c => c.type === item.type);
                    return (
                      <tr
                        key={index}
                        className={`text-xs transition-colors ${
                          item.alreadyExists 
                            ? 'bg-slate-50/65 dark:bg-slate-800/20 opacity-75' 
                            : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/10'
                        }`}
                      >
                        {/* TYPE TOGGLE BUTTON */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={item.alreadyExists}
                            onClick={() => {
                              const nextType = item.type === 'expense' ? 'income' : item.type === 'income' ? 'transfer' : 'expense';
                              handleEditRow(index, 'type', nextType);
                            }}
                            className={`w-24 py-1.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                              item.type === 'expense'
                                ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30'
                                : item.type === 'income'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30'
                                  : 'bg-brand-50 dark:bg-brand-950/20 border-brand-100 dark:border-brand-900/50 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-950/30'
                            }`}
                          >
                            {item.type === 'expense' ? 'Gasto' : item.type === 'income' ? 'Ingreso' : 'Movimiento'}
                          </button>
                        </td>

                        {/* CONCEPT DESCRIPTION INPUT */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.description}
                                disabled={item.alreadyExists}
                                onChange={(e) => handleEditRow(index, 'description', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-500 transition-all disabled:opacity-85 disabled:cursor-not-allowed"
                              />
                              {item.alreadyExists && (
                                <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 uppercase tracking-wider">
                                  Ya importado
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <span className={`text-[9px] font-bold w-fit px-1.5 py-0.5 rounded-md ${
                                item.notes.includes('Trade Republic')
                                  ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-650 dark:text-orange-400 border border-orange-100/30 dark:border-orange-900/30'
                                  : 'bg-brand-50 dark:bg-brand-950/20 text-brand-650 dark:text-brand-400 border border-brand-100/30 dark:border-brand-900/30'
                              }`}>
                                {item.notes.replace('Importado de ', '')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* DATE INPUT */}
                        <td className="py-3 px-4">
                          <input
                            type="date"
                            value={item.date}
                            disabled={item.alreadyExists}
                            onChange={(e) => handleEditRow(index, 'date', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-555 transition-all disabled:opacity-85 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* AMOUNT INPUT */}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold ${item.type === 'expense' ? 'text-rose-500' : (item.type === 'income' ? 'text-emerald-500' : 'text-brand-500')}`}>
                              {item.type === 'expense' ? '-' : (item.type === 'income' ? '+' : '↔')}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.amount}
                              disabled={item.alreadyExists}
                              onChange={(e) => handleEditRow(index, 'amount', e.target.value)}
                              className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-500 transition-all text-right disabled:opacity-85 disabled:cursor-not-allowed"
                            />
                          </div>
                        </td>

                        {/* CATEGORY / ORIGIN & DESTINATION SELECTORS */}
                        {previewTab === 'transfer' ? (
                          <>
                            {/* FROM ACCOUNT SELECT */}
                            <td className="py-3 px-4">
                              <select
                                value={item.fromAccountId || ''}
                                disabled={item.alreadyExists}
                                onChange={(e) => handleEditRow(index, 'fromAccountId', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                              >
                                <option value="">Origen...</option>
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.icon} {acc.name} {acc.bank ? `(${acc.bank.name})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* TO ACCOUNT SELECT */}
                            <td className="py-3 px-4">
                              <select
                                value={item.toAccountId || ''}
                                disabled={item.alreadyExists}
                                onChange={(e) => handleEditRow(index, 'toAccountId', e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                              >
                                <option value="">Destino...</option>
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.icon} {acc.name} {acc.bank ? `(${acc.bank.name})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </>
                        ) : (
                          <td className="py-3 px-4">
                            {item.type === 'transfer' ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">De:</span>
                                  <select
                                    value={item.fromAccountId || ''}
                                    disabled={item.alreadyExists}
                                    onChange={(e) => handleEditRow(index, 'fromAccountId', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-white"
                                  >
                                    <option value="">Origen...</option>
                                    {accounts.map(acc => (
                                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">A:</span>
                                  <select
                                    value={item.toAccountId || ''}
                                    disabled={item.alreadyExists}
                                    onChange={(e) => handleEditRow(index, 'toAccountId', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-white"
                                  >
                                    <option value="">Destino...</option>
                                    {accounts.map(acc => (
                                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 w-11 shrink-0">Cat:</span>
                                  <select
                                    value={item.categoryId}
                                    disabled={item.alreadyExists}
                                    onChange={(e) => handleEditRow(index, 'categoryId', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-white"
                                  >
                                    <option value="">
                                      {item.type === 'expense' ? 'Sin categoría (Auto)' : 'Ninguna'}
                                    </option>
                                    {filteredCats.map(cat => (
                                      <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 w-11 shrink-0">Cuenta:</span>
                                  <select
                                    value={item.accountId || ''}
                                    disabled={item.alreadyExists}
                                    onChange={(e) => handleEditRow(index, 'accountId', e.target.value)}
                                    className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-white"
                                  >
                                    <option value="">Ninguna...</option>
                                    {accounts.map(acc => (
                                      <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </td>
                        )}

                        {/* TAGS SELECTOR CELL (Only when previewTab is all or expense) */}
                        {(previewTab === 'all' || previewTab === 'expense') && (
                          <td className="py-3 px-4">
                            {item.type === 'expense' ? (
                              <div className="flex flex-col gap-1.5">
                                {/* List of active tags */}
                                <div className="flex flex-wrap gap-1">
                                  {(item.tags || []).map((tName: string) => (
                                    <span
                                      key={tName}
                                      className="inline-flex items-center px-1.5 py-0.5 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400 rounded text-[9px] font-bold border border-brand-100/30"
                                    >
                                      #{tName}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedTags = (item.tags || []).filter((t: string) => t !== tName);
                                          handleEditRow(index, 'tags', updatedTags);
                                        }}
                                        className="ml-1 text-brand-400 hover:text-brand-650 cursor-pointer"
                                      >
                                        <X size={10} />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                {/* Dropdown to add a tag */}
                                <select
                                  value=""
                                  disabled={item.alreadyExists}
                                  onChange={(e) => {
                                    const newTag = e.target.value;
                                    if (newTag && !(item.tags || []).includes(newTag)) {
                                      handleEditRow(index, 'tags', [...(item.tags || []), newTag]);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
                                >
                                  <option value="">+ Añadir etiqueta</option>
                                  {availableTags.map(tag => (
                                    <option key={tag.id} value={tag.name}>
                                      #{tag.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">No requiere</span>
                            )}
                          </td>
                        )}

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
              {duplicatesCount > 0 
                ? `Mostrando ${previewItems.length} movimientos (${duplicatesCount} ya importados serán omitidos automáticamente).`
                : `Mostrando ${previewItems.length} movimientos. Haz click en "Confirmar e importar" cuando termines.`
              }
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
                disabled={importLoading || newCount === 0}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/50 disabled:cursor-not-allowed disabled:hover:bg-brand-600 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-500/10 cursor-pointer h-10 flex items-center justify-center gap-1.5 transition-all"
              >
                {importLoading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Confirmar e importar ({newCount})
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24 md:pb-6 max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-60px)] md:min-h-screen">
      
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Listado de Movimientos</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Historial completo y control de transacciones</p>
          </div>
          {loading && (expenses.length > 0 || incomes.length > 0) && (
            <div className="w-5 h-5 border-2 border-brand-600 dark:border-brand-400 border-t-transparent rounded-full animate-spin shrink-0 mt-1" title="Sincronizando..." />
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCSVImportClick}
            disabled={importLoading}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-xs transition-all cursor-pointer h-10"
          >
            {importLoading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
            Importar CSV
          </button>
          <button
            onClick={() => onOpenAddExpense(activeTab === 'expenses' ? 'expense' : activeTab === 'incomes' ? 'income' : 'transfer')}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            {activeTab === 'expenses' ? 'Añadir Gasto' : activeTab === 'incomes' ? 'Añadir Ingreso' : 'Añadir Movimiento'}
          </button>
        </div>
      </div>



      {/* Selector: Gastos / Ingresos & Filters Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl max-w-sm w-full sm:w-80">
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
          <button
            onClick={() => handleTabChange('transfers')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'transfers'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            Movimientos ({transfers.length})
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && (
            <div className="flex gap-2 relative">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Eliminar ({selectedIds.length})</span>
              </button>
              
              <button
                onClick={() => { resetBulkFields(); setIsBulkModalOpen(true); }}
                className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer flex-shrink-0"
              >
                <Edit size={14} />
                <span>Editar Lote ({selectedIds.length})</span>
              </button>
            </div>
          )}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 shadow-sm"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer ${
              showFilters || activeFilterCount > 0
                ? 'bg-brand-50 dark:bg-brand-950/20 border-brand-200 text-brand-700 dark:text-brand-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[9px] font-bold">
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
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Categoría</label>
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

          {/* Bank Filter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Banco / Origen</label>
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white"
            >
              <option value="">Todas las cuentas</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name} {acc.bank ? `(${acc.bank.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Concept Filter */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Concepto</label>
            <input
              type="text"
              placeholder="Ej. Súper, Alquiler..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rango de importes (€)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Mín"
                value={filterMinAmount}
                onChange={(e) => setFilterMinAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500"
              />
              <span className="text-xs text-slate-400">-</span>
              <input
                type="number"
                placeholder="Máx"
                value={filterMaxAmount}
                onChange={(e) => setFilterMaxAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-lg text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500"
              />
            </div>
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
                          ? 'bg-brand-600 border-brand-600 text-white'
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
      {loading && expenses.length === 0 && incomes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* Transactions List */
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {activeTab === 'expenses' ? (
            expenses.length > 0 ? (
              <div className="overflow-auto max-h-[calc(100vh-220px)] min-h-[300px] flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)] dark:shadow-[inset_0_-1px_0_rgba(30,41,59,1)]">
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={expenses.length > 0 && selectedIds.length === expenses.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:bg-slate-900 cursor-pointer"
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
                      <th onClick={() => handleSort('bank')} className="py-4 px-4 hidden md:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors min-w-[160px]">
                        <div className="flex items-center">
                          Cuenta/Banco
                          {renderSortIcon('bank')}
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
                          selectedIds.includes(exp.id) ? 'bg-brand-50/30 dark:bg-brand-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(exp.id)}
                            onChange={(e) => handleSelectItem(exp.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:bg-slate-900 cursor-pointer"
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
                              <span key={t.id} className="px-1.5 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 rounded text-[9px] font-bold">
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        {/* Bank */}
                        <td className="py-4 px-4 hidden md:table-cell min-w-[120px]">
                          {exp.bank ? (() => {
                            const acc = accounts.find(a => a.name === exp.bank);
                            const bgColor = acc?.color || '#6366F1';
                            const textColor = getContrastColor(bgColor);
                            return (
                              <span
                                className="inline-flex flex-col px-2.5 py-1.5 rounded-lg font-bold"
                                style={{ backgroundColor: bgColor, color: textColor }}
                              >
                                <span className="flex items-center gap-1 text-[10px] leading-tight">
                                  {acc?.icon && <span>{acc.icon}</span>}
                                  {exp.bank}
                                </span>
                                {acc?.bank?.name && (
                                  <span className="text-[9px] leading-tight mt-0.5" style={{ opacity: 0.75 }}>
                                    {acc.bank.name}
                                  </span>
                                )}
                              </span>
                            );
                          })() : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-slate-50 dark:bg-slate-850/40 text-slate-400 dark:text-slate-500 border-slate-100/30">
                              Manual
                            </span>
                          )}
                        </td>
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
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-colors cursor-pointer"
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
          ) : activeTab === 'incomes' ? (
            incomes.length > 0 ? (
              <div className="overflow-auto max-h-[calc(100vh-220px)] min-h-[300px] flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)] dark:shadow-[inset_0_-1px_0_rgba(30,41,59,1)]">
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-6 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={incomes.length > 0 && selectedIds.length === incomes.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:bg-slate-900 cursor-pointer"
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
                      <th onClick={() => handleSort('bank')} className="py-4 px-4 hidden sm:table-cell cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center">
                          Banco
                          {renderSortIcon('bank')}
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
                          selectedIds.includes(inc.id) ? 'bg-brand-50/30 dark:bg-brand-950/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(inc.id)}
                            onChange={(e) => handleSelectItem(inc.id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 dark:bg-slate-900 cursor-pointer"
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
                        {/* Bank */}
                        <td className="py-4 px-4 hidden sm:table-cell min-w-[120px]">
                          {inc.bank ? (() => {
                            const acc = accounts.find(a => a.name === inc.bank);
                            const bgColor = acc?.color || '#6366F1';
                            const textColor = getContrastColor(bgColor);
                            return (
                              <span
                                className="inline-flex flex-col px-2.5 py-1.5 rounded-lg font-bold"
                                style={{ backgroundColor: bgColor, color: textColor }}
                              >
                                <span className="flex items-center gap-1 text-[10px] leading-tight">
                                  {acc?.icon && <span>{acc.icon}</span>}
                                  {inc.bank}
                                </span>
                                {acc?.bank?.name && (
                                  <span className="text-[9px] leading-tight mt-0.5" style={{ opacity: 0.75 }}>
                                    {acc.bank.name}
                                  </span>
                                )}
                              </span>
                            );
                          })() : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-slate-50 dark:bg-slate-850/40 text-slate-400 dark:text-slate-500 border-slate-100/30">
                              Manual
                            </span>
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
          ) : (
            sortedTransfers.length > 0 ? (
              <div className="overflow-auto max-h-[calc(100vh-220px)] min-h-[300px] flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[inset_0_-1px_0_rgba(226,232,240,1)] dark:shadow-[inset_0_-1px_0_rgba(30,41,59,1)]">
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                      <th onClick={() => handleSort('description')} className="py-4 px-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
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
                      <th className="py-4 px-4 hidden sm:table-cell">
                        Cuenta Origen
                      </th>
                      <th className="py-4 px-4 hidden sm:table-cell">
                        Cuenta Destino
                      </th>
                      <th onClick={() => handleSort('amount')} className="py-4 px-4 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center justify-end">
                          Importe
                          {renderSortIcon('amount')}
                        </div>
                      </th>
                      <th className="py-4 px-4 hidden lg:table-cell">
                        Notas
                      </th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                    {sortedTransfers.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 text-xs transition-colors"
                      >
                        <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                          {t.description}
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell text-slate-500 dark:text-slate-400">
                          {new Date(t.date).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell">
                          {(() => {
                            const acc = t.fromAccount;
                            const bgColor = acc?.color || '#6366F1';
                            const label = `${acc?.name || 'Origen'}${acc?.bank?.name ? ` (${acc.bank.name})` : ''}`;
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
                                style={{ backgroundColor: bgColor, color: getContrastColor(bgColor) }}
                              >
                                {acc?.icon && <span>{acc.icon}</span>}
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell">
                          {(() => {
                            const acc = t.toAccount;
                            const bgColor = acc?.color || '#6366F1';
                            const label = `${acc?.name || 'Destino'}${acc?.bank?.name ? ` (${acc.bank.name})` : ''}`;
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
                                style={{ backgroundColor: bgColor, color: getContrastColor(bgColor) }}
                              >
                                {acc?.icon && <span>{acc.icon}</span>}
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 text-right font-black text-slate-800 dark:text-slate-100">
                          {t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                        <td className="py-4 px-4 hidden lg:table-cell text-slate-400 dark:text-slate-500 max-w-xs truncate" title={t.notes || ''}>
                          {t.notes || '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenEditExpense(t)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
                                  deleteTransfer(t.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-lg transition-colors cursor-pointer"
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
                <span className="text-4xl mb-3"><ArrowUpRight className="inline border-2 border-brand-500/20 p-1.5 rounded-full text-brand-500 bg-brand-50/10" size={50} /></span>
                <p className="font-semibold text-sm">No se encontraron movimientos</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">Registra un nuevo movimiento o modifica tus criterios de filtrado.</p>
              </div>
            )
          )}
        </div>
      )}

      {/* CUSTOM BULK EDIT MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm transition-all duration-300 animate-fade-in">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Editar {selectedIds.length} {activeTab === 'expenses' ? 'Gastos' : 'Ingresos'} en Lote
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Activa la casilla del campo que deseas modificar para todos los registros seleccionados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkUpdate} className="space-y-4">
              {/* DATE FIELD */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="bulk-update-date"
                  checked={bulkFields.updateDate}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, updateDate: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer"
                />
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="bulk-update-date" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Actualizar Fecha
                  </label>
                  {bulkFields.updateDate && (
                    <input
                      type="date"
                      required
                      value={bulkFields.date}
                      onChange={(e) => setBulkFields(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                  )}
                </div>
              </div>

              {/* DESCRIPTION FIELD */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="bulk-update-desc"
                  checked={bulkFields.updateDescription}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, updateDescription: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer"
                />
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="bulk-update-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Actualizar Concepto / Descripción
                  </label>
                  {bulkFields.updateDescription && (
                    <input
                      type="text"
                      required
                      placeholder="Nuevo concepto para todos los movimientos"
                      value={bulkFields.description}
                      onChange={(e) => setBulkFields(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                  )}
                </div>
              </div>

              {/* NOTES / OBSERVATIONS FIELD */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="bulk-update-notes"
                  checked={bulkFields.updateNotes}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, updateNotes: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer"
                />
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="bulk-update-notes" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Actualizar Observaciones / Notas
                  </label>
                  {bulkFields.updateNotes && (
                    <textarea
                      placeholder="Nuevas observaciones para todos los movimientos"
                      value={bulkFields.notes}
                      onChange={(e) => setBulkFields(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 transition-all min-h-[60px]"
                    />
                  )}
                </div>
              </div>

              {/* CATEGORY FIELD */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="bulk-update-cat"
                  checked={bulkFields.updateCategory}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, updateCategory: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer"
                />
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="bulk-update-cat" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Actualizar Categoría
                  </label>
                  {bulkFields.updateCategory && (
                    <select
                      value={bulkFields.categoryId}
                      onChange={(e) => setBulkFields(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                    >
                      <option value="">{activeTab === 'expenses' ? 'Sin categoría (Auto)' : 'Ninguna'}</option>
                      {filterCategoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* BANK FIELD */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="bulk-update-bank"
                  checked={bulkFields.updateBank}
                  onChange={(e) => setBulkFields(prev => ({ ...prev, updateBank: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer"
                />
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="bulk-update-bank" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Actualizar Banco / Origen
                  </label>
                  {bulkFields.updateBank && (
                    <select
                      value={bulkFields.bank}
                      onChange={(e) => setBulkFields(prev => ({ ...prev, bank: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.icon} {acc.name} {acc.bank ? `(${acc.bank.name})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* TAGS FIELD (Expenses only) */}
              {activeTab === 'expenses' && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800/40 rounded-xl">
                  <input
                    type="checkbox"
                    id="bulk-update-tags"
                    checked={bulkFields.updateTags}
                    onChange={(e) => setBulkFields(prev => ({ ...prev, updateTags: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 mt-1 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2">
                    <label htmlFor="bulk-update-tags" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Actualizar Etiquetas
                    </label>
                    {bulkFields.updateTags && (
                      <div className="space-y-2">
                        <div className="flex gap-2 bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-800 rounded-lg max-w-xs">
                          <button
                            type="button"
                            onClick={() => setBulkFields(prev => ({ ...prev, tagsMode: 'add' }))}
                            className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                              bulkFields.tagsMode === 'add'
                                ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-650 dark:text-brand-400'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-605'
                            }`}
                          >
                            Añadir
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkFields(prev => ({ ...prev, tagsMode: 'replace' }))}
                            className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${
                              bulkFields.tagsMode === 'replace'
                                ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-605'
                            }`}
                          >
                            Reemplazar
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-h-24 overflow-y-auto">
                          {availableTags.map(tag => {
                            const isSelected = bulkFields.tags.includes(tag.name);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleBulkTagToggle(tag.name)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-600 border-brand-600 text-white shadow-sm shadow-brand-500/10'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100'
                                }`}
                              >
                                #{tag.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    importLoading ||
                    !(
                      bulkFields.updateDate ||
                      bulkFields.updateDescription ||
                      bulkFields.updateNotes ||
                      bulkFields.updateCategory ||
                      bulkFields.updateBank ||
                      bulkFields.updateTags
                    )
                  }
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-600/50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5 transition-all"
                >
                  {importLoading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm transition-all duration-300">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            {confirmModal.actionType === 'duplicate' ? (
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400">
                <Copy size={20} />
              </div>
            ) : (
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
                <Trash2 size={20} />
              </div>
            )}

            {/* Header Text */}
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                {confirmModal.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md ${
                  confirmModal.actionType === 'duplicate'
                    ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/10'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for CSV Imports */}
      <input
        type="file"
        ref={csvInputRef}
        onChange={handleCSVFileChange}
        accept=".csv,.xls,.xlsx"
        className="hidden"
      />

      {/* FLOATING TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 sm:w-96 pointer-events-none">
        {dataError && (
          <div className="p-4 bg-white dark:bg-slate-900 border-l-4 border-red-500 dark:border-red-500/80 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xl flex items-start gap-2.5 border border-slate-150 dark:border-slate-800 animate-slide-in-right pointer-events-auto">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-[10px] text-red-500 uppercase tracking-wider mb-0.5">Error</p>
              <p className="text-slate-650 dark:text-slate-400">{dataError}</p>
            </div>
            <button
              onClick={() => setDataError('')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {dataSuccess && (
          <div className="p-4 bg-white dark:bg-slate-900 border-l-4 border-emerald-500 dark:border-emerald-500/80 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xl flex items-start gap-2.5 border border-slate-150 dark:border-slate-800 animate-slide-in-right pointer-events-auto">
            <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-[10px] text-emerald-500 uppercase tracking-wider mb-0.5">Éxito</p>
              <p className="text-slate-650 dark:text-slate-400">{dataSuccess}</p>
            </div>
            <button
              onClick={() => setDataSuccess('')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default Transactions;

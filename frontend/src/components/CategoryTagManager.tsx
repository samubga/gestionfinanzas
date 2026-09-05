import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Trash2, Edit2, X, Tag as TagIcon, Settings2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import CategoryModal from './CategoryModal';
import { Category } from '../types';

export const CategoryTagManager: React.FC = () => {
  const {
    categories,
    tags,
    deleteCategory,
    addTag,
    deleteTag
  } = useFinance();

  // Category State
  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const filteredCats = categories.filter(c => c.type === catTab);

  // Tag State
  const [newTagName, setNewTagName] = useState('');

  // CATEGORY ACTIONS
  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const handleStartEdit = (cat: Category) => {
    setCategoryToEdit(cat);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        await deleteCategory(id);
      } catch { /* El aviso global lo gestiona FinanceContext. */ }
    }
  };

  // TAG ACTIONS
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      await addTag({ name: newTagName.trim() });
      setNewTagName('');
    } catch { /* El aviso global lo gestiona FinanceContext. */ }
  };

  const handleDeleteTag = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta etiqueta? Se desvinculará de todos los gastos.')) {
      try {
        await deleteTag(id);
      } catch { /* El aviso global lo gestiona FinanceContext. */ }
    }
  };

  return (
    <div className="mx-auto max-w-[94rem] space-y-5 px-3 py-4 pb-28 sm:space-y-6 sm:p-6 lg:px-6 lg:pb-6 xl:px-8">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Estructura Organizativa</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">Personaliza tus categorías de gastos e ingresos y crea etiquetas rápidas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* CATEGORIES SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Settings2 className="text-brand-500" size={18} />
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Gestión de Categorías</h3>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/15 transition hover:bg-brand-700"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-full">
            <button
              type="button"
              onClick={() => setCatTab('expense')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                catTab === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Gastos
            </button>
            <button
              type="button"
              onClick={() => setCatTab('income')}
              className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                catTab === 'income'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Ingresos
            </button>
          </div>

          {/* Categories List */}
          <div className="space-y-2.5 overflow-y-auto max-h-[430px] pr-1.5">
            {filteredCats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/40 dark:border-slate-800/30 rounded-xl transition-all"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryIcon name={cat.name} icon={cat.icon} color={cat.color} strokeWidth={cat.iconStrokeWidth} compact size={14} />
                  <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-colors cursor-pointer"
                    aria-label={`Editar ${cat.name}`}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                    aria-label={`Eliminar ${cat.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {filteredCats.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                <p className="text-xs text-slate-400">Todavía no tienes categorías de {catTab === 'expense' ? 'gasto' : 'ingreso'}.</p>
              </div>
            )}
          </div>
        </div>

        {/* TAGS SECTION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-50 dark:border-slate-800">
            <TagIcon className="text-brand-500" size={18} />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Gestión de Etiquetas</h3>
          </div>

          {/* Create Form */}
          <form onSubmit={handleCreateTag} className="flex gap-3">
            <input
              type="text"
              placeholder="Nueva etiqueta (ej. coche, novia)..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-xs transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-brand-500/10 cursor-pointer flex items-center gap-1"
            >
              <Plus size={14} />
              Crear
            </button>
          </form>

          {/* Tags Cloud / Badges List */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-800/30 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span>#{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                    title="Eliminar etiqueta"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <span className="text-3xl mb-2">🏷️</span>
              <p className="text-xs italic">No has creado etiquetas todavía.</p>
            </div>
          )}
        </div>

      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        category={categoryToEdit}
        type={categoryToEdit?.type || catTab}
      />

    </div>
  );
};
export default CategoryTagManager;

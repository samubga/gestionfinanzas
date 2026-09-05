import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Plus, Trash2, Edit2, Check, X, Tag as TagIcon, Settings2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';

export const CategoryTagManager: React.FC = () => {
  const {
    categories,
    tags,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    deleteTag
  } = useFinance();

  // Category State
  const [catTab, setCatTab] = useState<'expense' | 'income'>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366F1');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');

  const filteredCats = categories.filter(c => c.type === catTab);

  // Tag State
  const [newTagName, setNewTagName] = useState('');

  // Predefined beautiful color presets
  const COLOR_PRESETS = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', 
    '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', 
    '#D946EF', '#EC4899', '#6B7280', '#0F172A'
  ];

  // CATEGORY ACTIONS
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await addCategory({ name: newCatName.trim(), color: newCatColor, type: catTab });
      setNewCatName('');
    } catch { /* El aviso global lo gestiona FinanceContext. */ }
  };

  const handleStartEdit = (cat: any) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatColor(cat.color);
  };

  const handleUpdateCategory = async () => {
    if (!editCatName.trim() || !editingCatId) return;

    try {
      await updateCategory(editingCatId, { name: editCatName.trim(), color: editCatColor });
      setEditingCatId(null);
    } catch { /* El aviso global lo gestiona FinanceContext. */ }
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
          <div className="flex items-center gap-2 pb-4 border-b border-slate-50 dark:border-slate-800">
            <Settings2 className="text-brand-500" size={18} />
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Gestión de Categorías</h3>
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

          {/* Create Form */}
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Nombre de la nueva categoría..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-0 rounded-xl focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-600 text-slate-800 dark:text-white text-xs transition-all"
              />
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-12 h-10 p-0.5 rounded-xl border-0 bg-transparent shrink-0 cursor-pointer"
                  title="Color personalizado"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition-all shadow-md shadow-brand-500/10 cursor-pointer"
                >
                  Crear
                </button>
              </div>
            </div>

            {/* Color Presets */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paleta de colores rápidos</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 ${
                      newCatColor === color ? 'border-brand-600 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-2.5 overflow-y-auto max-h-[350px] pr-1.5">
            {filteredCats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/20 border border-slate-100/40 dark:border-slate-800/30 rounded-xl transition-all"
              >
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex gap-2 items-center">
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="flex-1 px-3 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs"
                      autoFocus
                    />
                    <input
                      type="color"
                      value={editCatColor}
                      onChange={(e) => setEditCatColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer"
                    />
                    <button onClick={handleUpdateCategory} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingCatId(null)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <CategoryIcon name={cat.name} color={cat.color} compact size={14} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.name}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
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

    </div>
  );
};
export default CategoryTagManager;

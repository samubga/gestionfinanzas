import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Search, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Category } from '../types';
import CategoryIcon, { CATEGORY_ICONS, inferredCategoryIconId } from './CategoryIcon';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  type: 'expense' | 'income';
}

const COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#10B981',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#D946EF', '#EC4899', '#F43F5E', '#64748B', '#334155', '#0F172A',
];

const STROKE_OPTIONS = [
  { value: 1.25, label: 'Fino' },
  { value: 1.8, label: 'Normal' },
  { value: 2.4, label: 'Grueso' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, category, type }) => {
  const { addCategory, updateCategory } = useFinance();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [icon, setIcon] = useState('tag');
  const [iconStrokeWidth, setIconStrokeWidth] = useState(1.8);
  const [iconSearch, setIconSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(category?.name || '');
    setColor(category?.color || '#6366F1');
    setIcon(category?.icon || inferredCategoryIconId(category?.name || ''));
    setIconStrokeWidth(category?.iconStrokeWidth || 1.8);
    setIconSearch('');
  }, [category, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const visibleIcons = useMemo(() => {
    const query = iconSearch.trim().toLocaleLowerCase('es-ES');
    if (!query) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(option => option.label.toLocaleLowerCase('es-ES').includes(query));
  }, [iconSearch]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const appearance = { name: name.trim(), color, icon, iconStrokeWidth };
      if (category) await updateCategory(category.id, appearance);
      else await addCategory({ ...appearance, type });
      onClose();
    } catch {
      // FinanceContext muestra el error correspondiente.
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:max-w-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">
              {type === 'expense' ? 'Categoría de gasto' : 'Categoría de ingreso'}
            </p>
            <h3 className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">
              {category ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Cerrar">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(100dvh-5rem)] space-y-6 overflow-y-auto p-5 sm:max-h-[82vh] sm:p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <CategoryIcon name={name} icon={icon} color={color} strokeWidth={iconStrokeWidth} size={25} />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">{name.trim() || 'Nombre de la categoría'}</p>
              <p className="text-xs text-slate-400">Vista previa de su apariencia</p>
            </div>
          </div>

          <div>
            <label htmlFor="category-name" className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">Nombre</label>
            <input
              id="category-name"
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Supermercado, Nómina, Mascotas..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Color</label>
              <span className="font-mono text-[10px] uppercase text-slate-400">{color}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`relative h-7 w-7 rounded-full transition hover:scale-110 ${color === preset ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                  style={{ backgroundColor: preset }}
                  aria-label={`Usar color ${preset}`}
                >
                  {color === preset && <Check size={13} className="absolute inset-0 m-auto text-white drop-shadow" strokeWidth={3} />}
                </button>
              ))}
              <label
                title="Elegir cualquier color"
                className={`relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-sm ring-slate-300 transition hover:scale-110 dark:border-slate-900 ${!COLOR_PRESETS.includes(color) ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                style={{ background: 'conic-gradient(#ef4444, #eab308, #10b981, #06b6d4, #6366f1, #d946ef, #ef4444)' }}
              >
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                <span className="h-2.5 w-2.5 rounded-full border border-white bg-white/90" />
              </label>
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Icono</label>
              <div className="relative sm:w-56">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={iconSearch}
                  onChange={(event) => setIconSearch(event.target.value)}
                  placeholder="Buscar icono..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30 sm:grid-cols-9">
              {visibleIcons.map(option => {
                const Icon = option.icon;
                const selected = icon === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selected}
                    onClick={() => setIcon(option.id)}
                    className={`flex aspect-square items-center justify-center rounded-xl border transition hover:-translate-y-0.5 ${selected ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                  >
                    <Icon size={19} strokeWidth={iconStrokeWidth} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">Grosor del icono</label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/70">
              {STROKE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIconStrokeWidth(option.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${iconStrokeWidth === option.value ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">Cancelar</button>
            <button type="submit" disabled={!name.trim() || loading} className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {category ? 'Guardar cambios' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CategoryModal;

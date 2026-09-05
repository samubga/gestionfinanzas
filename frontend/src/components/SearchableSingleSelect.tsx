import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SearchableSingleSelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  keywords?: string;
  leading?: React.ReactNode;
}

interface SearchableSingleSelectProps<T extends string> {
  value: T;
  options: Array<SearchableSingleSelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  ariaLabel: string;
}

export const SearchableSingleSelect = <T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opción',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay resultados',
  ariaLabel,
}: SearchableSingleSelectProps<T>) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-ES');
    if (!term) return options;
    return options.filter(option => `${option.label} ${option.description || ''} ${option.keywords || ''}`
      .toLocaleLowerCase('es-ES')
      .includes(term));
  }, [options, search]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const choose = (nextValue: T) => {
    onChange(nextValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50/45 px-3 text-left text-sm text-slate-800 transition hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/35 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {selectedOption?.leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{selectedOption?.label || placeholder}</span>
          {selectedOption?.description && <span className="block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{selectedOption.description}</span>}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-40 overflow-hidden rounded-lg border border-brand-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-brand-100 p-2 dark:border-slate-800">
            <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              autoFocus
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-brand-100 bg-brand-50/40 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div id={listboxId} role="listbox" className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</p>
            ) : filteredOptions.map(option => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value || '__empty'}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => choose(option.value)}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition ${
                    selected
                      ? 'bg-brand-100/80 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200'
                      : 'text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {option.leading}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.description && <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{option.description}</span>}
                  </span>
                  {selected && <Check size={16} className="shrink-0 text-brand-600 dark:text-brand-300" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSingleSelect;

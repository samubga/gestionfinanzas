import React from 'react';

interface AccountAppearancePreviewProps {
  name: string;
  bankName?: string | null;
  typeLabel: string;
  icon: string;
  color: string;
  balance: number;
}

const readableTextColor = (hexColor: string) => {
  const normalized = hexColor.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return '#ffffff';
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.6 ? '#172033' : '#ffffff';
};

const withAlpha = (hexColor: string, alpha: string) =>
  /^#[\da-f]{6}$/i.test(hexColor) ? `${hexColor}${alpha}` : 'rgb(var(--brand-50))';

export const AccountAppearancePreview: React.FC<AccountAppearancePreviewProps> = ({
  name,
  bankName,
  typeLabel,
  icon,
  color,
  balance,
}) => {
  const displayName = name.trim() || 'Nombre de la cuenta';
  const displayBank = bankName || 'Sin banco / Efectivo';

  return (
    <section aria-live="polite" className="rounded-xl border border-brand-200 bg-brand-50/25 p-4 dark:border-slate-700 dark:bg-slate-950/35">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Vista previa</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Así se identificará esta cuenta en las vistas principales.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-brand-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">En transacciones</span>
          <span
            className="inline-flex max-w-full flex-col rounded-lg px-2.5 py-1.5 font-bold"
            style={{ backgroundColor: color, color: readableTextColor(color) }}
          >
            <span className="flex items-center gap-1 text-[10px] leading-tight">
              <span aria-hidden="true">{icon}</span>
              <span className="truncate">{displayName}</span>
            </span>
            <span className="truncate text-[8px] leading-tight opacity-80">{displayBank}</span>
          </span>
        </div>

        <div
          className="relative overflow-hidden rounded-lg border p-3"
          style={{ backgroundColor: withAlpha(color, '12'), borderColor: withAlpha(color, '58') }}
        >
          <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">En cuentas</span>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-base"
                style={{ backgroundColor: withAlpha(color, '20'), borderColor: withAlpha(color, '55') }}
                aria-hidden="true"
              >
                {icon}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{displayName}</strong>
                <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{typeLabel}</span>
              </span>
            </div>
            <strong className="shrink-0 text-xs font-semibold text-slate-800 dark:text-slate-100">
              {balance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountAppearancePreview;

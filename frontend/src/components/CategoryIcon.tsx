import React from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Car,
  Clapperboard,
  Coffee,
  GraduationCap,
  Gift,
  HeartPulse,
  Home,
  Lightbulb,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  Repeat2,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

interface CategoryIconProps {
  name?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
  compact?: boolean;
}

const CATEGORY_ICON_RULES: Array<{ terms: string[]; icon: LucideIcon }> = [
  { terms: ['nomina', 'sueldo', 'salario', 'ingreso', 'paga'], icon: Banknote },
  { terms: ['supermercado', 'alimentacion', 'alimentación', 'compra semanal'], icon: ShoppingBasket },
  { terms: ['restaurante', 'comida', 'cena', 'bar'], icon: Utensils },
  { terms: ['cafe', 'café', 'desayuno'], icon: Coffee },
  { terms: ['alquiler', 'vivienda', 'casa', 'hipoteca'], icon: Home },
  { terms: ['coche', 'transporte', 'gasolina', 'combustible', 'taxi'], icon: Car },
  { terms: ['salud', 'farmacia', 'medico', 'médico'], icon: HeartPulse },
  { terms: ['ocio', 'cine', 'entretenimiento', 'streaming'], icon: Clapperboard },
  { terms: ['educacion', 'educación', 'formacion', 'formación', 'curso'], icon: GraduationCap },
  { terms: ['viaje', 'vacaciones', 'vuelo'], icon: Plane },
  { terms: ['luz', 'agua', 'gas', 'suministro'], icon: Lightbulb },
  { terms: ['suscripcion', 'suscripción', 'recurrente'], icon: Repeat2 },
  { terms: ['impuesto', 'tasa', 'factura'], icon: ReceiptText },
  { terms: ['mascota', 'veterinario'], icon: PawPrint },
  { terms: ['regalo', 'donacion', 'donación'], icon: Gift },
  { terms: ['inversion', 'inversión', 'dividendo'], icon: TrendingUp },
  { terms: ['ahorro'], icon: PiggyBank },
  { terms: ['transferencia', 'traspaso'], icon: ArrowLeftRight },
  { terms: ['ropa', 'compras', 'tienda'], icon: ShoppingBag },
];

const iconForCategory = (name: string): LucideIcon => {
  const normalizedName = name.trim().toLocaleLowerCase('es-ES');
  return CATEGORY_ICON_RULES.find(({ terms }) => terms.some(term => normalizedName.includes(term)))?.icon || Tag;
};

const colorWithAlpha = (color: string, alpha: string) => {
  if (/^#[\da-f]{6}$/i.test(color)) return `${color}${alpha}`;
  return 'rgb(var(--brand-500) / 0.12)';
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  color = '#6366F1',
  size = 17,
  className = '',
  compact = false,
}) => {
  const Icon = iconForCategory(name || '');
  const resolvedColor = color || '#6366F1';

  return (
    <span
      className={`category-icon inline-flex shrink-0 items-center justify-center border ${compact ? 'h-7 w-7 rounded-lg' : 'h-10 w-10 rounded-xl'} ${className}`}
      style={{
        color: resolvedColor,
        backgroundColor: colorWithAlpha(resolvedColor, '18'),
        borderColor: colorWithAlpha(resolvedColor, '38'),
      }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={1.8} />
    </span>
  );
};

export default CategoryIcon;

import React from 'react';
import {
  Activity, ArrowLeftRight, Baby, BadgeDollarSign, Banknote, Bike, BookOpen,
  BriefcaseBusiness, Bus, CakeSlice, Car, Cat, CircleDollarSign, Clapperboard,
  Cloud, Coffee, CreditCard, Dumbbell, Fuel, Gamepad2, Gift, GraduationCap,
  Hammer, Headphones, HeartPulse, Home, Hotel, Landmark, Laptop, Lightbulb,
  Music, Palette, ParkingCircle, PawPrint, Phone, PiggyBank, Pizza, Plane,
  ReceiptText, Repeat2, Scissors, ShieldCheck, Shirt, ShoppingBag,
  ShoppingBasket, Smartphone, Sparkles, Store, Tag, Train, TreePine,
  TrendingUp, Trophy, Utensils, Wallet, Wifi, Wrench, type LucideIcon,
} from 'lucide-react';

interface CategoryIconProps {
  name?: string | null;
  icon?: string | null;
  color?: string | null;
  strokeWidth?: number | null;
  size?: number;
  className?: string;
  compact?: boolean;
}

export const CATEGORY_ICONS: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'tag', label: 'General', icon: Tag },
  { id: 'shopping-basket', label: 'Supermercado', icon: ShoppingBasket },
  { id: 'utensils', label: 'Restaurantes', icon: Utensils },
  { id: 'coffee', label: 'Café', icon: Coffee },
  { id: 'pizza', label: 'Comida rápida', icon: Pizza },
  { id: 'home', label: 'Vivienda', icon: Home },
  { id: 'lightbulb', label: 'Suministros', icon: Lightbulb },
  { id: 'wifi', label: 'Internet', icon: Wifi },
  { id: 'hammer', label: 'Reformas', icon: Hammer },
  { id: 'car', label: 'Coche', icon: Car },
  { id: 'bus', label: 'Autobús', icon: Bus },
  { id: 'train', label: 'Tren', icon: Train },
  { id: 'bike', label: 'Bicicleta', icon: Bike },
  { id: 'fuel', label: 'Combustible', icon: Fuel },
  { id: 'parking', label: 'Aparcamiento', icon: ParkingCircle },
  { id: 'plane', label: 'Viajes', icon: Plane },
  { id: 'hotel', label: 'Alojamiento', icon: Hotel },
  { id: 'tree', label: 'Naturaleza', icon: TreePine },
  { id: 'heart-pulse', label: 'Salud', icon: HeartPulse },
  { id: 'activity', label: 'Bienestar', icon: Activity },
  { id: 'dumbbell', label: 'Deporte', icon: Dumbbell },
  { id: 'baby', label: 'Familia', icon: Baby },
  { id: 'paw-print', label: 'Mascotas', icon: PawPrint },
  { id: 'cat', label: 'Animales', icon: Cat },
  { id: 'graduation-cap', label: 'Educación', icon: GraduationCap },
  { id: 'book-open', label: 'Libros', icon: BookOpen },
  { id: 'laptop', label: 'Tecnología', icon: Laptop },
  { id: 'smartphone', label: 'Móvil', icon: Smartphone },
  { id: 'phone', label: 'Teléfono', icon: Phone },
  { id: 'clapperboard', label: 'Cine', icon: Clapperboard },
  { id: 'gamepad', label: 'Videojuegos', icon: Gamepad2 },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'headphones', label: 'Audio', icon: Headphones },
  { id: 'palette', label: 'Arte', icon: Palette },
  { id: 'sparkles', label: 'Cuidado personal', icon: Sparkles },
  { id: 'scissors', label: 'Peluquería', icon: Scissors },
  { id: 'shirt', label: 'Ropa', icon: Shirt },
  { id: 'shopping-bag', label: 'Compras', icon: ShoppingBag },
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'gift', label: 'Regalos', icon: Gift },
  { id: 'cake', label: 'Celebraciones', icon: CakeSlice },
  { id: 'repeat', label: 'Suscripciones', icon: Repeat2 },
  { id: 'receipt', label: 'Facturas', icon: ReceiptText },
  { id: 'shield', label: 'Seguros', icon: ShieldCheck },
  { id: 'wrench', label: 'Mantenimiento', icon: Wrench },
  { id: 'cloud', label: 'Servicios online', icon: Cloud },
  { id: 'briefcase', label: 'Trabajo', icon: BriefcaseBusiness },
  { id: 'banknote', label: 'Ingresos', icon: Banknote },
  { id: 'badge-dollar', label: 'Nómina', icon: BadgeDollarSign },
  { id: 'circle-dollar', label: 'Dinero', icon: CircleDollarSign },
  { id: 'credit-card', label: 'Tarjeta', icon: CreditCard },
  { id: 'wallet', label: 'Cartera', icon: Wallet },
  { id: 'landmark', label: 'Banco', icon: Landmark },
  { id: 'piggy-bank', label: 'Ahorro', icon: PiggyBank },
  { id: 'trending-up', label: 'Inversión', icon: TrendingUp },
  { id: 'arrow-left-right', label: 'Transferencia', icon: ArrowLeftRight },
  { id: 'trophy', label: 'Premios', icon: Trophy },
];

const ICON_BY_ID = new Map(CATEGORY_ICONS.map(option => [option.id, option.icon]));

const CATEGORY_ICON_RULES: Array<{ terms: string[]; iconId: string }> = [
  { terms: ['nomina', 'sueldo', 'salario', 'ingreso', 'paga'], iconId: 'banknote' },
  { terms: ['supermercado', 'alimentacion', 'alimentación', 'compra semanal'], iconId: 'shopping-basket' },
  { terms: ['restaurante', 'comida', 'cena', 'bar'], iconId: 'utensils' },
  { terms: ['cafe', 'café', 'desayuno'], iconId: 'coffee' },
  { terms: ['alquiler', 'vivienda', 'casa', 'hipoteca'], iconId: 'home' },
  { terms: ['coche', 'transporte', 'gasolina', 'combustible', 'taxi'], iconId: 'car' },
  { terms: ['salud', 'farmacia', 'medico', 'médico'], iconId: 'heart-pulse' },
  { terms: ['gimnasio', 'deporte'], iconId: 'dumbbell' },
  { terms: ['ocio', 'cine', 'entretenimiento', 'streaming'], iconId: 'clapperboard' },
  { terms: ['educacion', 'educación', 'formacion', 'formación', 'curso'], iconId: 'graduation-cap' },
  { terms: ['viaje', 'vacaciones', 'vuelo'], iconId: 'plane' },
  { terms: ['luz', 'agua', 'gas', 'suministro'], iconId: 'lightbulb' },
  { terms: ['suscripcion', 'suscripción', 'recurrente'], iconId: 'repeat' },
  { terms: ['impuesto', 'tasa', 'factura'], iconId: 'receipt' },
  { terms: ['mascota', 'veterinario'], iconId: 'paw-print' },
  { terms: ['regalo', 'donacion', 'donación'], iconId: 'gift' },
  { terms: ['inversion', 'inversión', 'dividendo'], iconId: 'trending-up' },
  { terms: ['ahorro'], iconId: 'piggy-bank' },
  { terms: ['transferencia', 'traspaso'], iconId: 'arrow-left-right' },
  { terms: ['ropa', 'compras', 'tienda'], iconId: 'shopping-bag' },
  { terms: ['tecnologia', 'tecnología', 'ordenador'], iconId: 'laptop' },
];

export const inferredCategoryIconId = (name: string): string => {
  const normalizedName = name.trim().toLocaleLowerCase('es-ES');
  return CATEGORY_ICON_RULES.find(({ terms }) => terms.some(term => normalizedName.includes(term)))?.iconId || 'tag';
};

export const categoryIconComponent = (icon: string | null | undefined, name = ''): LucideIcon => (
  ICON_BY_ID.get(icon || '') || ICON_BY_ID.get(inferredCategoryIconId(name)) || Tag
);

const colorWithAlpha = (color: string, alpha: string) => {
  if (/^#[\da-f]{6}$/i.test(color)) return `${color}${alpha}`;
  return 'rgb(var(--brand-500) / 0.12)';
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  icon,
  color = '#6366F1',
  strokeWidth = 1.8,
  size = 17,
  className = '',
  compact = false,
}) => {
  const Icon = categoryIconComponent(icon, name || '');
  const resolvedColor = color || '#6366F1';

  return (
    <span
      className={`category-icon inline-flex shrink-0 items-center justify-center border ${compact ? 'h-7 w-7 rounded-lg' : 'h-10 w-10 rounded-xl'} ${className}`}
      style={{ color: resolvedColor, backgroundColor: colorWithAlpha(resolvedColor, '18'), borderColor: colorWithAlpha(resolvedColor, '38') }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={strokeWidth || 1.8} />
    </span>
  );
};

export default CategoryIcon;

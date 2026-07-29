import {
  Utensils, BedDouble, Smartphone, Wrench, Stethoscope, GraduationCap,
  Scissors, Car, Building2, Landmark, Plane, ShoppingBag, Store,
  type LucideProps,
} from 'lucide-react'

const MAP: Record<string, React.ComponentType<LucideProps>> = {
  utensils: Utensils,
  'bed-double': BedDouble,
  smartphone: Smartphone,
  wrench: Wrench,
  stethoscope: Stethoscope,
  'graduation-cap': GraduationCap,
  scissors: Scissors,
  car: Car,
  'building-2': Building2,
  landmark: Landmark,
  plane: Plane,
  'shopping-bag': ShoppingBag,
}

export function CategoryIcon({
  name,
  ...props
}: Omit<LucideProps, 'name'> & { name?: string | null }) {
  const Icon = (name && MAP[name]) || Store
  return <Icon {...props} />
}

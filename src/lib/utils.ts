import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return months[month - 1] || ''
}

export function getDayName(day: number): string {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  return days[day] || ''
}

// ── Centralised label map — update here to change everywhere ──────────────
export const PROFILE_TYPE_LABELS: Record<string, string> = {
  fixed_group: 'Grupo Fijo',
  variable_group: 'Grupo Personal Variable',
  individual: 'Personal',
}

export function getProfileTypeLabel(type: string): string {
  return PROFILE_TYPE_LABELS[type] || type
}

export function getProfileTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    fixed_group: 'bg-blue-50 text-blue-600 border-blue-200',
    variable_group: 'bg-green-50 text-green-600 border-green-200',
    individual: 'bg-orange-50 text-orange-600 border-orange-200',
  }
  return colors[type] || 'bg-gray-50 text-gray-500 border-gray-200'
}

export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-50 text-gray-500 border-gray-200',
    sent: 'bg-blue-50 text-blue-600 border-blue-200',
    paid: 'bg-green-50 text-green-600 border-green-200',
  }
  return colors[status] || 'bg-gray-50 text-gray-500 border-gray-200'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
  }
  return labels[status] || status
}

// ── Fixed group rate tiers ────────────────────────────────────────────────────
export const FIXED_GROUP_RATES = [
  { label: 'TARIFA 1', value: 28 },
  { label: 'TARIFA 2', value: 40 },
  { label: 'TARIFA 3', value: 60 },
  { label: 'TARIFA 4', value: 80 },
]

export function getFixedGroupRateLabel(fee: number | null | undefined): string {
  if (fee == null) return '—'
  const rate = FIXED_GROUP_RATES.find((r) => r.value === fee)
  return rate
    ? `${rate.label} — ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(fee)}`
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(fee)
}

export function calculateAge(birthDate: string | Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

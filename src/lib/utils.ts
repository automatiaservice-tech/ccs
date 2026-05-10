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
  individual: 'Personal',
}

export function getProfileTypeLabel(type: string): string {
  return PROFILE_TYPE_LABELS[type] || type
}

export function getProfileTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    fixed_group: 'bg-blue-50 text-blue-600 border-blue-200',
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
  { id: 'tarifa_1', label: 'TARIFA 1', value: 28 },
  { id: 'tarifa_2', label: 'TARIFA 2', value: 40 },
  { id: 'tarifa_vip1', label: 'TARIFA VIP 1', value: 40 },
  { id: 'tarifa_3', label: 'TARIFA 3', value: 60 },
  { id: 'tarifa_4', label: 'TARIFA 4', value: 80 },
  { id: 'tarifa_vip', label: 'TARIFA VIP', value: 50 },
]

// Fixed cost per session by rate_id (preferred)
export const TARIFA_COSTE_SESION_BY_ID: Record<string, number> = {
  tarifa_1: 7.00,
  tarifa_2: 5.00,
  tarifa_vip1: 5.00,
  tarifa_3: 5.00,
  tarifa_4: 5.00,
  tarifa_vip: 4.16,
}

// Fixed cost per session by monthly_fee value — kept for backward compat
export const TARIFA_COSTE_SESION: Record<number, number> = {
  28: 7.00,
  40: 5.00,
  50: 4.16,
  60: 5.00,
  80: 5.00,
}

export function getFixedGroupRateLabel(fee: number | null | undefined, rateId?: string | null): string {
  const fmt = (v: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
  if (rateId) {
    const rate = FIXED_GROUP_RATES.find((r) => r.id === rateId)
    if (rate) return `${rate.label} — ${fmt(rate.value)}`
  }
  if (fee == null) return '—'
  // Fallback: first match by value (backward compat for clients without rate_id)
  const rate = FIXED_GROUP_RATES.find((r) => r.value === fee)
  return rate ? `${rate.label} — ${fmt(fee)}` : fmt(fee)
}

export function getRateLabelById(rateId: string | null | undefined): string {
  if (!rateId) return '—'
  return FIXED_GROUP_RATES.find((r) => r.id === rateId)?.label ?? rateId
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

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

export function getProfileTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fixed_group: 'Grupo Fijo',
    variable_group: 'Grupo Variable',
    individual: 'Individual',
  }
  return labels[type] || type
}

export function getProfileTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    fixed_group: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    variable_group: 'bg-green-500/20 text-green-400 border-green-500/30',
    individual: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  }
  return colors[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    paid: 'bg-green-500/20 text-green-400 border-green-500/30',
  }
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviada',
    paid: 'Pagada',
  }
  return labels[status] || status
}

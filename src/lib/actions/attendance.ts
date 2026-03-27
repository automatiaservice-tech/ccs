'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface AttendanceEntry {
  client_id: string
  attended: boolean
}

export async function saveAttendance(
  sessionId: string,
  date: string,
  entries: AttendanceEntry[],
  sessionType: string
) {
  const supabase = await createClient()

  // Calculate attendees count (only those who attended)
  const attendeesCount = entries.filter((e) => e.attended).length

  // Delete existing records for this session+date
  await supabase
    .from('attendance_records')
    .delete()
    .eq('session_id', sessionId)
    .eq('date', date)

  if (entries.length === 0) return

  // Calculate cost per person based on session type
  const records = entries.map((entry) => {
    let cost = 0
    if (entry.attended) {
      if (sessionType === 'fixed_group') {
        cost = 0
      } else if (sessionType === 'variable_group') {
        cost = attendeesCount > 0 ? 40 / attendeesCount : 0
      } else if (sessionType === 'individual') {
        cost = 40
      }
    }
    return {
      session_id: sessionId,
      date,
      client_id: entry.client_id,
      attended: entry.attended,
      cost_per_person: cost,
    }
  })

  const { error } = await supabase.from('attendance_records').insert(records)
  if (error) throw error

  revalidatePath('/schedule/checkin')
  revalidatePath('/dashboard')
}

export async function getAttendanceForSession(sessionId: string, date: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('session_id', sessionId)
    .eq('date', date)

  if (error) throw error
  return data
}

export async function getDashboardStats() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // Total ingresos del mes (facturas pagadas)
  const { data: invoicesData } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'paid')

  const monthlyIncome = invoicesData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

  // Total gastos del mes
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', startDate)
    .lte('date', endDate)

  const monthlyExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

  // Clientes activos
  const { count: activeClients } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)

  // Sesiones realizadas esta semana
  const startOfWeek = new Date()
  const day = startOfWeek.getDay()
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
  startOfWeek.setDate(diff)
  const weekStart = startOfWeek.toISOString().split('T')[0]
  const weekEnd = new Date().toISOString().split('T')[0]

  const { data: weekSessions } = await supabase
    .from('attendance_records')
    .select('date, session_id')
    .gte('date', weekStart)
    .lte('date', weekEnd)

  const uniqueSessions = new Set(
    weekSessions?.map((r) => `${r.session_id}-${r.date}`) || []
  )

  // Monthly chart data (last 6 months)
  const chartData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const monthName = d.toLocaleString('es-ES', { month: 'short' })

    const { data: incData } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('month', m)
      .eq('year', y)
      .eq('status', 'paid')

    const { data: expData } = await supabase
      .from('expenses')
      .select('amount')
      .gte('date', `${y}-${String(m).padStart(2, '0')}-01`)
      .lte('date', `${y}-${String(m).padStart(2, '0')}-31`)

    chartData.push({
      month: monthName,
      ingresos: incData?.reduce((s, v) => s + v.total_amount, 0) || 0,
      gastos: expData?.reduce((s, v) => s + v.amount, 0) || 0,
    })
  }

  return {
    monthlyIncome,
    monthlyExpenses,
    netProfit: monthlyIncome - monthlyExpenses,
    activeClients: activeClients || 0,
    weekSessions: uniqueSessions.size,
    chartData,
  }
}

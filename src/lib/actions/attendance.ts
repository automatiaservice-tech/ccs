'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const SESSION_PRICE = 40 // €

export interface AttendanceEntry {
  client_id: string
  attended: boolean
}

/**
 * Save attendance for a session on a given date.
 *
 * Pricing rules (driven by CLIENT profile_type, not session type):
 *   - fixed_group  → cost = 0  (billed via monthly flat fee)
 *   - variable_group → cost = 40 / total_attendees_this_session_today
 *   - individual   → cost = 40 (always, regardless of session type)
 */
export async function saveAttendance(
  sessionId: string,
  date: string,
  entries: AttendanceEntry[]
) {
  const supabase = await createClient()

  // Fetch profile types for every client in this call
  const clientIds = entries.map((e) => e.client_id)
  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('id, profile_type')
    .in('id', clientIds)

  if (clientsErr) throw new Error(`Error fetching client profiles: ${clientsErr.message}`)

  const profileOf: Record<string, string> = Object.fromEntries(
    (clients || []).map((c) => [c.id, c.profile_type])
  )

  // Total attendees count (used for variable_group proration)
  const attendeesCount = entries.filter((e) => e.attended).length

  // Delete existing records for this session+date (idempotent save)
  await supabase
    .from('attendance_records')
    .delete()
    .eq('session_id', sessionId)
    .eq('date', date)

  if (entries.length === 0) return

  const records = entries.map((entry) => {
    let cost = 0
    if (entry.attended) {
      const pt = profileOf[entry.client_id] ?? 'individual'
      if (pt === 'fixed_group') {
        cost = 0
      } else if (pt === 'variable_group') {
        cost =
          attendeesCount > 0
            ? Math.round((SESSION_PRICE / attendeesCount) * 100) / 100
            : 0
      } else {
        // individual (and any unknown type) → flat 40 €
        cost = SESSION_PRICE
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
  if (error) throw new Error(`Error saving attendance: ${error.message}`)

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

  if (error) throw new Error(`Error fetching attendance: ${error.message}`)
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

  const monthlyIncome =
    invoicesData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

  // Total gastos del mes
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', startDate)
    .lte('date', endDate)

  const monthlyExpenses =
    expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0

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
      .lte('date', new Date(y, m, 0).toISOString().split('T')[0])

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

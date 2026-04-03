'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateAge } from '@/lib/utils'

// ── Client Statistics ────────────────────────────────────────────────────────
export async function getClientStats() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)

  if (error) throw error

  const active = clients || []

  // Enrich each client with calculated age from birth_date
  const activeWithAge = active
    .filter((c) => c.birth_date)
    .map((c) => ({ ...c, calcAge: calculateAge(c.birth_date!) }))

  const ranges = [
    { label: '18-25', min: 18, max: 25 },
    { label: '26-35', min: 26, max: 35 },
    { label: '36-45', min: 36, max: 45 },
    { label: '46-55', min: 46, max: 55 },
    { label: '55+', min: 56, max: 999 },
  ]

  const ageDistribution = ranges.map(({ label, min, max }) => {
    const inRange = activeWithAge.filter((c) => c.calcAge >= min && c.calcAge <= max)
    return {
      range: label,
      masculino: inRange.filter((c) => c.gender === 'masculino').length,
      femenino: inRange.filter((c) => c.gender === 'femenino').length,
      otro: inRange.filter((c) => c.gender === 'otro').length,
    }
  })

  const avgAge = activeWithAge.length
    ? Math.round(activeWithAge.reduce((s, c) => s + c.calcAge, 0) / activeWithAge.length)
    : null
  const hombres = activeWithAge.filter((c) => c.gender === 'masculino')
  const mujeres = activeWithAge.filter((c) => c.gender === 'femenino')
  const avgAgeMale = hombres.length
    ? Math.round(hombres.reduce((s, c) => s + c.calcAge, 0) / hombres.length)
    : null
  const avgAgeFemale = mujeres.length
    ? Math.round(mujeres.reduce((s, c) => s + c.calcAge, 0) / mujeres.length)
    : null

  const genderDist = [
    { name: 'Masculino', value: active.filter((c) => c.gender === 'masculino').length, color: '#2563eb' },
    { name: 'Femenino', value: active.filter((c) => c.gender === 'femenino').length, color: '#ec4899' },
    { name: 'Otro', value: active.filter((c) => c.gender === 'otro').length, color: '#94a3b8' },
  ].filter((g) => g.value > 0)

  return {
    ageDistribution,
    avgAge,
    avgAgeMale,
    avgAgeFemale,
    genderDist,
    totalActive: active.length,
    byGender: {
      masculino: active.filter((c) => c.gender === 'masculino').length,
      femenino: active.filter((c) => c.gender === 'femenino').length,
      otro: active.filter((c) => c.gender === 'otro').length,
    },
  }
}

// ── Attendance Statistics ────────────────────────────────────────────────────
export async function getAttendanceStats() {
  const supabase = await createClient()
  const now = new Date()

  // Last 8 weeks range
  const eightWeeksAgo = new Date(now)
  eightWeeksAgo.setDate(now.getDate() - 56)
  const startDate = eightWeeksAgo.toISOString().split('T')[0]
  const endDate = now.toISOString().split('T')[0]

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('date, attended, client_id, session_id')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw error

  const allRecords = records || []
  const attendedRecords = allRecords.filter((r) => r.attended)

  // Weekly attendance (last 8 weeks, oldest first)
  const weeklyAttendance: { week: string; asistentes: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() - i * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)

    const ws = weekStart.toISOString().split('T')[0]
    const we = weekEnd.toISOString().split('T')[0]

    const count = attendedRecords.filter((r) => r.date >= ws && r.date <= we).length
    const weekLabel = weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    weeklyAttendance.push({ week: weekLabel, asistentes: count })
  }

  // Day of week distribution (Mon=1 … Sun=0 in JS)
  const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const byDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  attendedRecords.forEach((r) => {
    const d = new Date(r.date + 'T12:00:00')
    byDay[d.getDay()]++
  })
  // Order Mon→Sun
  const dayData = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    day: DAYS_ES[d],
    asistentes: byDay[d],
  }))

  // This-month stats
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`

  const { data: monthRecords } = await supabase
    .from('attendance_records')
    .select('date, attended, client_id, session_id')
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const monthAll = monthRecords || []
  const monthAttended = monthAll.filter((r) => r.attended)

  const uniqueSessions = new Set(monthAttended.map((r) => `${r.session_id}-${r.date}`))

  const sessionCount: Record<string, number> = {}
  monthAttended.forEach((r) => {
    const key = `${r.session_id}-${r.date}`
    sessionCount[key] = (sessionCount[key] || 0) + 1
  })
  const counts = Object.values(sessionCount)
  const avgAttendees = counts.length
    ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length)
    : 0

  const clientCount: Record<string, number> = {}
  monthAttended.forEach((r) => {
    clientCount[r.client_id] = (clientCount[r.client_id] || 0) + 1
  })
  const topClientId = Object.entries(clientCount).sort((a, b) => b[1] - a[1])[0]?.[0]

  let topClientName = '—'
  if (topClientId) {
    const { data: topClient } = await supabase
      .from('clients')
      .select('name')
      .eq('id', topClientId)
      .single()
    topClientName = topClient?.name ?? '—'
  }

  const attendanceRate =
    monthAll.length > 0 ? Math.round((monthAttended.length / monthAll.length) * 100) : 0

  return {
    weeklyAttendance,
    dayData,
    monthSessions: uniqueSessions.size,
    avgAttendees,
    topClientName,
    attendanceRate,
  }
}

// ── Revenue by client type — last 6 months ───────────────────────────────────
export async function getRevenueByTypeStats() {
  const supabase = await createClient()
  const now = new Date()

  // Fetch all client profile types once
  const { data: allClients } = await supabase.from('clients').select('id, profile_type')
  const profileOf: Record<string, string> = Object.fromEntries(
    (allClients || []).map((c) => [c.id, c.profile_type])
  )

  const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const result = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const monthLabel = MONTH_LABELS[d.getMonth()]

    const { data: invoices } = await supabase
      .from('invoices')
      .select('client_id, total_amount')
      .eq('month', m)
      .eq('year', y)
      .eq('status', 'paid')

    let fixed_group = 0
    let variable_group = 0
    let individual = 0

    ;(invoices || []).forEach((inv) => {
      const pt = profileOf[inv.client_id]
      if (pt === 'fixed_group') fixed_group += inv.total_amount
      else if (pt === 'variable_group') variable_group += inv.total_amount
      else if (pt === 'individual') individual += inv.total_amount
    })

    result.push({ month: monthLabel, 'Grupo Fijo': fixed_group, 'Grupo Personal Variable': variable_group, Personal: individual })
  }

  return result
}

// ── Fixed group rate distribution ────────────────────────────────────────────
export async function getFixedGroupRateStats() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('monthly_fee')
    .eq('profile_type', 'fixed_group')
    .eq('active', true)

  if (error) throw error

  const RATES = [
    { label: 'TARIFA 1', value: 28 },
    { label: 'TARIFA 2', value: 40 },
    { label: 'TARIFA 3', value: 60 },
    { label: 'TARIFA 4', value: 80 },
  ]

  const distribution = RATES.map((r) => ({
    label: r.label,
    value: r.value,
    count: (clients || []).filter((c) => c.monthly_fee === r.value).length,
  }))

  const totalMRR = (clients || []).reduce((sum, c) => sum + (c.monthly_fee ?? 0), 0)
  const topRate = distribution.reduce((a, b) => (b.count > a.count ? b : a), distribution[0])

  return { distribution, totalMRR, topRate }
}

// ── Dashboard quick stats ────────────────────────────────────────────────────
export async function getQuickStats() {
  const supabase = await createClient()
  const now = new Date()

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)

  const genderDist = [
    { name: 'Masc.', value: (clients || []).filter((c) => c.gender === 'masculino').length, color: '#2563eb' },
    { name: 'Fem.', value: (clients || []).filter((c) => c.gender === 'femenino').length, color: '#ec4899' },
    { name: 'Otro', value: (clients || []).filter((c) => c.gender === 'otro').length, color: '#94a3b8' },
  ].filter((g) => g.value > 0)

  // Weekly attendance last 4 weeks
  const weeklyData: { week: string; asistentes: number }[] = []
  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() - i * 7)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)

    const ws = weekStart.toISOString().split('T')[0]
    const we = weekEnd.toISOString().split('T')[0]

    const { count } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .gte('date', ws)
      .lte('date', we)
      .eq('attended', true)

    weeklyData.push({ week: `S${4 - i}`, asistentes: count ?? 0 })
  }

  return { genderDist, weeklyData }
}

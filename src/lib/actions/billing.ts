'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { InvoiceStatus } from '@/lib/supabase/database.types'

// ── Pricing constants ──────────────────────────────────────────────────────
const SESSION_PRICE = 40 // €

// ── Day-of-week helper ─────────────────────────────────────────────────────
// Our convention: 0=Mon … 6=Sun  |  JS Date.getDay(): 0=Sun, 1=Mon … 6=Sat
function toJsDay(ourDay: number): number {
  return ourDay === 6 ? 0 : ourDay + 1
}

/**
 * Returns every ISO date string (YYYY-MM-DD) in `month`/`year` that falls
 * on `dayOfWeek` (our convention: 0=Mon … 6=Sun).
 */
function getDatesForDayInMonth(dayOfWeek: number, month: number, year: number): string[] {
  const jsDay = toJsDay(dayOfWeek)
  const daysInMonth = new Date(year, month, 0).getDate() // month is 1-based → next month day 0
  const dates: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month - 1, d).getDay() === jsDay) {
      dates.push(
        `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      )
    }
  }
  return dates
}

// ── Invoice line shape ─────────────────────────────────────────────────────
type LineInput = {
  date: string
  description: string
  attendees: number | null
  amount: number
  line_type: 'fixed' | 'individual' | 'variable'
}

// ── Build invoice lines for a single client ───────────────────────────────
async function buildLines(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  client: {
    id: string
    profile_type: string
    monthly_fee: number | null
  },
  month: number,
  year: number
): Promise<{ lines: LineInput[]; totalAmount: number }> {
  const lines: LineInput[] = []
  let totalAmount = 0
  const mm = String(month).padStart(2, '0')

  // ── FIXED GROUP: flat monthly fee ────────────────────────────────────────
  if (client.profile_type === 'fixed_group') {
    const amount = client.monthly_fee || 0
    if (amount > 0) {
      lines.push({
        date: `${year}-${mm}-01`,
        description: 'Cuota mensual fija',
        attendees: null,
        amount,
        line_type: 'fixed',
      })
      totalAmount = amount
    }
    return { lines, totalAmount }
  }

  // ── INDIVIDUAL: prospective — 40€ × session occurrences in month ─────────
  if (client.profile_type === 'individual') {
    const { data: sessionClients, error: scErr } = await supabase
      .from('session_clients')
      .select('sessions(id, name, day_of_week)')
      .eq('client_id', client.id)

    if (scErr) throw new Error(`Error fetching sessions for client ${client.id}: ${scErr.message}`)

    for (const sc of sessionClients || []) {
      const session = sc.sessions as unknown as { id: string; name: string; day_of_week: number } | null
      if (!session) continue

      const dates = getDatesForDayInMonth(session.day_of_week, month, year)
      for (const date of dates) {
        lines.push({
          date,
          description: `Sesión individual — ${session.name}`,
          attendees: null,
          amount: SESSION_PRICE,
          line_type: 'individual',
        })
        totalAmount += SESSION_PRICE
      }
    }

    lines.sort((a, b) => a.date.localeCompare(b.date))
    return { lines, totalAmount }
  }

  // ── VARIABLE GROUP: retrospective — 40€ ÷ total attendees that session-day
  if (client.profile_type === 'variable_group') {
    const startDate = `${year}-${mm}-01`
    const endDate = `${year}-${mm}-31`

    const { data: records, error: recErr } = await supabase
      .from('attendance_records')
      .select('session_id, date, sessions(name)')
      .eq('client_id', client.id)
      .eq('attended', true)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')

    if (recErr) throw new Error(`Error fetching attendance for client ${client.id}: ${recErr.message}`)

    for (const record of records || []) {
      const { count, error: cntErr } = await supabase
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', record.session_id)
        .eq('date', record.date)
        .eq('attended', true)

      if (cntErr) throw new Error(`Error counting attendees: ${cntErr.message}`)

      const n = count || 1
      const amount = Math.round((SESSION_PRICE / n) * 100) / 100

      lines.push({
        date: record.date,
        description: `Sesión grupal — ${(record.sessions as any)?.name || 'Sesión'}`,
        attendees: n,
        amount,
        line_type: 'variable',
      })
      totalAmount += amount
    }

    totalAmount = Math.round(totalAmount * 100) / 100
    return { lines, totalAmount }
  }

  return { lines, totalAmount }
}

// ── Save invoice + lines to DB ─────────────────────────────────────────────
async function persistInvoice(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  clientId: string,
  month: number,
  year: number,
  lines: LineInput[],
  totalAmount: number
) {
  // Generate invoice number
  const { count: invoiceCount, error: cntErr } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
  if (cntErr) throw new Error(`Error counting invoices: ${cntErr.message}`)

  const invoiceNumber = `CCS-${year}-${String((invoiceCount || 0) + 1).padStart(3, '0')}`

  const { data: invoice, error: invErr } = await supabase
    .from('invoices')
    .insert({
      client_id: clientId,
      month,
      year,
      total_amount: totalAmount,
      status: 'draft',
      invoice_number: invoiceNumber,
    })
    .select()
    .single()

  if (invErr) throw new Error(`Error creating invoice: ${invErr.message}`)

  if (lines.length > 0) {
    const { error: linesErr } = await supabase.from('invoice_lines').insert(
      lines.map((l) => ({
        invoice_id: invoice.id,
        date: l.date,
        description: l.description,
        attendees: l.attendees,
        amount: l.amount,
      }))
    )
    if (linesErr) throw new Error(`Error creating invoice lines: ${linesErr.message}`)
  }

  return invoice
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC ACTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function getInvoices(filters?: {
  month?: number
  year?: number
  status?: InvoiceStatus
}) {
  const supabase = await createClient()
  let query = supabase
    .from('invoices')
    .select('*, clients(name, email)')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.month) query = query.eq('month', filters.month)
  if (filters?.year) query = query.eq('year', filters.year)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(`Error fetching invoices: ${error.message}`)
  return data
}

export async function getInvoiceById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(name, email, phone), invoice_lines(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Error fetching invoice: ${error.message}`)
  return data
}

/**
 * Generate invoices for ALL active clients for the given month/year.
 * Skips clients that already have an invoice for that period.
 */
export async function generateMonthlyInvoices(month: number, year: number) {
  const supabase = await createClient()

  const { data: clients, error: clientsErr } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)

  if (clientsErr) throw new Error(`Error fetching clients: ${clientsErr.message}`)

  const created = []
  const skipped = []
  const errors: string[] = []

  for (const client of clients || []) {
    try {
      // ── Check for existing invoice (use maybeSingle to avoid PGRST116 throws)
      const { data: existing, error: existErr } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', client.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()

      if (existErr) {
        errors.push(`${client.name}: error verificando factura existente — ${existErr.message}`)
        continue
      }
      if (existing) {
        skipped.push(client.name)
        continue
      }

      const { lines, totalAmount } = await buildLines(supabase, client, month, year)

      if (totalAmount === 0 || lines.length === 0) {
        skipped.push(`${client.name} (sin sesiones)`)
        continue
      }

      const invoice = await persistInvoice(supabase, client.id, month, year, lines, totalAmount)
      created.push(invoice)
    } catch (err: any) {
      errors.push(`${client.name}: ${err.message}`)
    }
  }

  revalidatePath('/billing')

  if (errors.length > 0) {
    throw new Error(
      `Facturas creadas: ${created.length}. Errores:\n${errors.join('\n')}`
    )
  }

  return created
}

/**
 * Generate invoice for a SINGLE client for the given month/year.
 */
export async function generateClientInvoice(
  clientId: string,
  month: number,
  year: number
) {
  const supabase = await createClient()

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientErr) throw new Error(`Error fetching client: ${clientErr.message}`)
  if (!client) throw new Error('Cliente no encontrado')

  // Check for existing invoice
  const { data: existing, error: existErr } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', clientId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (existErr) throw new Error(`Error verificando factura existente: ${existErr.message}`)
  if (existing) throw new Error(`Ya existe una factura para ${client.name} en ese período`)

  const { lines, totalAmount } = await buildLines(supabase, client, month, year)

  if (totalAmount === 0 || lines.length === 0) {
    throw new Error(
      client.profile_type === 'individual'
        ? 'Este cliente no tiene sesiones asignadas para ese mes'
        : 'No hay sesiones facturables en este período'
    )
  }

  const invoice = await persistInvoice(supabase, clientId, month, year, lines, totalAmount)

  revalidatePath('/billing')
  revalidatePath(`/clients/${clientId}`)

  return invoice
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
  if (error) throw new Error(`Error updating invoice status: ${error.message}`)
  revalidatePath('/billing')
  revalidatePath(`/billing/${id}`)
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()
  await supabase.from('invoice_lines').delete().eq('invoice_id', id)
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw new Error(`Error deleting invoice: ${error.message}`)
  revalidatePath('/billing')
}

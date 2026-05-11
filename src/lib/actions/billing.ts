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
  line_type: 'fixed' | 'individual'
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

  // ── FIXED GROUP: flat monthly fee (no individual sessions needed) ─────────
  // Short-circuit before querying sessions — identical to original behavior
  if (client.profile_type === 'fixed_group') {
    // Check if this client also has individual sessions (mixed case)
    const { data: sessionClients, error: scErr } = await supabase
      .from('session_clients')
      .select('sessions(id, name, day_of_week, session_type, session_price)')
      .eq('client_id', client.id)

    if (scErr) throw new Error(`Error fetching sessions for client ${client.id}: ${scErr.message}`)

    type SessionRow = { id: string; name: string; day_of_week: number; session_type: string; session_price: number | null }
    const sessions = (sessionClients || [])
      .map(sc => sc.sessions as unknown as SessionRow | null)
      .filter((s): s is SessionRow => s !== null)

    const hasIndividualSessions = sessions.some(s => s.session_type === 'individual')

    // ── PURE fixed_group: original behavior ─────────────────────────────────
    if (!hasIndividualSessions) {
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

    // ── MIXED: fixed fee + individual session occurrences ───────────────────
    const amount = client.monthly_fee || 0
    if (amount > 0) {
      lines.push({
        date: `${year}-${mm}-01`,
        description: 'Cuota mensual fija',
        attendees: null,
        amount,
        line_type: 'fixed',
      })
      totalAmount += amount
    }

    for (const session of sessions.filter(s => s.session_type === 'individual')) {
      // Count total participants assigned to this session to split the price
      const { count: participantCount, error: countErr } = await supabase
        .from('session_clients')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id)

      if (countErr) throw new Error(`Error counting participants for session ${session.id}: ${countErr.message}`)

      const participants = participantCount || 1
      const pricePerPerson =
        session.session_price != null
          ? Math.round((session.session_price / participants) * 100) / 100
          : SESSION_PRICE

      const dates = getDatesForDayInMonth(session.day_of_week, month, year)
      for (const date of dates) {
        lines.push({
          date,
          description: `Sesión personal — ${session.name}`,
          attendees: participants,
          amount: pricePerPerson,
          line_type: 'individual',
        })
        totalAmount += pricePerPerson
      }
    }

    totalAmount = Math.round(totalAmount * 100) / 100
    lines.sort((a, b) => a.date.localeCompare(b.date))
    return { lines, totalAmount }
  }

  // ── INDIVIDUAL (Personal): split session price proportionally, or apply special rate
  if (client.profile_type === 'individual') {
    const { data: sessionClients, error: scErr } = await supabase
      .from('session_clients')
      .select('sessions(id, name, day_of_week, session_price)')
      .eq('client_id', client.id)

    if (scErr) throw new Error(`Error fetching sessions for client ${client.id}: ${scErr.message}`)

    // If monthly_fee is set on an individual client, it acts as a fixed special rate per session
    const specialRate = client.monthly_fee

    for (const sc of sessionClients || []) {
      const session = sc.sessions as unknown as { id: string; name: string; day_of_week: number; session_price: number | null } | null
      if (!session) continue

      let pricePerPerson: number
      let participants: number | null = null

      if (specialRate != null) {
        // Client has a negotiated special rate — charge it flat regardless of group size
        pricePerPerson = specialRate
      } else {
        // Split the session price among all participants
        const { count: participantCount, error: countErr } = await supabase
          .from('session_clients')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)

        if (countErr) throw new Error(`Error counting participants for session ${session.id}: ${countErr.message}`)

        participants = participantCount || 1
        const sessionPrice = session.session_price ?? SESSION_PRICE
        pricePerPerson = Math.round((sessionPrice / participants) * 100) / 100
      }

      const dates = getDatesForDayInMonth(session.day_of_week, month, year)
      for (const date of dates) {
        lines.push({
          date,
          description: `Sesión personal — ${session.name}`,
          attendees: participants,
          amount: pricePerPerson,
          line_type: 'individual',
        })
        totalAmount += pricePerPerson
      }
    }

    totalAmount = Math.round(totalAmount * 100) / 100
    lines.sort((a, b) => a.date.localeCompare(b.date))
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
    .select('*, clients(*)')
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
    .select('*, clients(*), invoice_lines(*)')
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

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  paymentMethod?: 'efectivo' | 'transferencia',
  paymentReference?: string
) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { status }
  if (status === 'paid') {
    if (paymentMethod) updates.payment_method = paymentMethod
    if (paymentReference !== undefined) updates.payment_reference = paymentReference || null
  }
  const { error } = await supabase.from('invoices').update(updates).eq('id', id)
  if (error) throw new Error(`Error updating invoice status: ${error.message}`)
  revalidatePath('/billing')
  revalidatePath(`/billing/${id}`)
}

// ── Safety pre-check ──────────────────────────────────────────────────────
// Verifica que los IDs pertenecen a facturas reales antes de borrar.
// NUNCA toca session_clients, clients, attendance_records ni ninguna otra tabla.
// Si session_clients se ven afectados, el problema está en un trigger de BD.
async function assertValidInvoiceIds(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  invoiceIds: string[]
): Promise<void> {
  if (invoiceIds.length === 0) return

  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .in('id', invoiceIds)

  if (error) throw new Error(`Error en verificación de seguridad: ${error.message}`)

  const foundIds = new Set((data || []).map((r) => r.id))
  const invalid = invoiceIds.filter((id) => !foundIds.has(id))

  if (invalid.length > 0) {
    throw new Error(
      `SEGURIDAD: ${invalid.length} ID(s) no corresponden a facturas válidas. ` +
      `Operación cancelada para evitar borrados no deseados en otras tablas.`
    )
  }
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()

  // Verificación de seguridad: confirmar que el ID es una factura válida
  await assertValidInvoiceIds(supabase, [id])

  // SOLO se borran: invoice_lines (líneas) e invoices (factura)
  // NO se toca: session_clients, clients, attendance_records, sessions
  await supabase.from('invoice_lines').delete().eq('invoice_id', id)
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw new Error(`Error deleting invoice: ${error.message}`)
  revalidatePath('/billing')
}

export async function deleteManyInvoices(ids: string[]) {
  if (ids.length === 0) return
  const supabase = await createClient()

  // Verificación de seguridad: confirmar que todos los IDs son facturas válidas
  await assertValidInvoiceIds(supabase, ids)

  // SOLO se borran: invoice_lines (líneas) e invoices (facturas)
  // NO se toca: session_clients, clients, attendance_records, sessions
  await supabase.from('invoice_lines').delete().in('invoice_id', ids)
  const { error } = await supabase.from('invoices').delete().in('id', ids)
  if (error) throw new Error(`Error deleting invoices: ${error.message}`)
  revalidatePath('/billing')
}

export async function updateInvoiceLines(
  invoiceId: string,
  lineIdsToKeep: string[]
) {
  const supabase = await createClient()

  if (lineIdsToKeep.length === 0) {
    await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId)
  } else {
    const { data: allLines } = await supabase
      .from('invoice_lines')
      .select('id')
      .eq('invoice_id', invoiceId)

    const toDelete = (allLines || [])
      .filter((l) => !lineIdsToKeep.includes(l.id))
      .map((l) => l.id)

    if (toDelete.length > 0) {
      await supabase.from('invoice_lines').delete().in('id', toDelete)
    }
  }

  // Recompute total from remaining lines + existing adjustment
  const { data: remaining } = await supabase
    .from('invoice_lines')
    .select('amount')
    .eq('invoice_id', invoiceId)
  const linesTotal = (remaining || []).reduce((s, l) => s + (l.amount as number), 0)

  const { data: inv } = await supabase
    .from('invoices')
    .select('adjustment_amount')
    .eq('id', invoiceId)
    .single()
  const adjAmount = (inv?.adjustment_amount as number) || 0
  const newTotal = Math.round((linesTotal + adjAmount) * 100) / 100

  const { error } = await supabase
    .from('invoices')
    .update({ total_amount: newTotal })
    .eq('id', invoiceId)
  if (error) throw new Error(`Error updating invoice: ${error.message}`)

  revalidatePath('/billing')
  revalidatePath(`/billing/${invoiceId}`)
}

export async function updateInvoiceAdjustment(
  invoiceId: string,
  adjustmentAmount: number,
  adjustmentReason: string
) {
  const supabase = await createClient()

  // Sum current lines to compute new total
  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('amount')
    .eq('invoice_id', invoiceId)
  const linesTotal = (lines || []).reduce((s, l) => s + (l.amount as number), 0)
  const newTotal = Math.round((linesTotal + adjustmentAmount) * 100) / 100

  const { error } = await supabase
    .from('invoices')
    .update({
      adjustment_amount: adjustmentAmount,
      adjustment_reason: adjustmentReason || null,
      total_amount: newTotal,
    })
    .eq('id', invoiceId)
  if (error) throw new Error(`Error updating invoice adjustment: ${error.message}`)

  revalidatePath('/billing')
  revalidatePath(`/billing/${invoiceId}`)
}

export async function updateClientBankAccount(clientId: string, iban: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ bank_account: iban })
    .eq('id', clientId)
  if (error) throw new Error(`Error al guardar la cuenta bancaria: ${error.message}`)
  revalidatePath('/billing')
  revalidatePath(`/clients/${clientId}`)
}

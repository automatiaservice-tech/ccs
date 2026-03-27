'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { InvoiceStatus } from '@/lib/supabase/database.types'

export async function getInvoices(filters?: { month?: number; year?: number; status?: InvoiceStatus }) {
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
  if (error) throw error
  return data
}

export async function getInvoiceById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(name, email, phone), invoice_lines(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function generateMonthlyInvoices(month: number, year: number) {
  const supabase = await createClient()

  // Get all active clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true)

  if (clientsError) throw clientsError

  const created = []

  for (const client of clients || []) {
    // Check if invoice already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', client.id)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (existing) continue

    let totalAmount = 0
    const lines: { date: string; description: string; attendees: number | null; amount: number }[] = []

    if (client.profile_type === 'fixed_group') {
      totalAmount = client.monthly_fee || 0
      lines.push({
        date: `${year}-${String(month).padStart(2, '0')}-01`,
        description: 'Cuota mensual fija',
        attendees: null,
        amount: totalAmount,
      })
    } else {
      // Get attendance records for this client this month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`

      const { data: records, error: recError } = await supabase
        .from('attendance_records')
        .select('*, sessions(name, session_type)')
        .eq('client_id', client.id)
        .eq('attended', true)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')

      if (recError) throw recError

      for (const record of records || []) {
        if (record.cost_per_person > 0) {
          totalAmount += record.cost_per_person

          // For variable group: get attendee count for that session+date
          let attendeesCount: number | null = null
          if (client.profile_type === 'variable_group') {
            const { count } = await supabase
              .from('attendance_records')
              .select('id', { count: 'exact', head: true })
              .eq('session_id', record.session_id)
              .eq('date', record.date)
              .eq('attended', true)
            attendeesCount = count || null
          }

          lines.push({
            date: record.date,
            description: record.sessions?.name || 'Sesión',
            attendees: attendeesCount,
            amount: record.cost_per_person,
          })
        }
      }
    }

    if (totalAmount === 0 && lines.length === 0) continue

    // Get invoice count for number generation
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })

    const invoiceNumber = `CCS-${year}-${String((invoiceCount || 0) + 1).padStart(3, '0')}`

    // Create invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        client_id: client.id,
        month,
        year,
        total_amount: totalAmount,
        status: 'draft',
        invoice_number: invoiceNumber,
      })
      .select()
      .single()

    if (invError) throw invError

    // Create invoice lines
    if (lines.length > 0) {
      const { error: linesError } = await supabase.from('invoice_lines').insert(
        lines.map((l) => ({ ...l, invoice_id: invoice.id }))
      )
      if (linesError) throw linesError
    }

    created.push(invoice)
  }

  revalidatePath('/billing')
  return created
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const supabase = await createClient()
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id)
  if (error) throw error
  revalidatePath('/billing')
  revalidatePath(`/billing/${id}`)
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()
  await supabase.from('invoice_lines').delete().eq('invoice_id', id)
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/billing')
}

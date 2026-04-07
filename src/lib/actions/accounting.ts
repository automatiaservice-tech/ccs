'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Expense, ExpenseCategory } from '@/lib/supabase/database.types'

// Returns YYYY-MM-DD for the last day of the given month/year
function lastDayOfMonth(month: number, year: number): string {
  const d = new Date(year, month, 0) // day 0 of next month = last day of this month
  return d.toISOString().split('T')[0]
}

// ── Bucket check ──────────────────────────────────────────────────────────────

export async function checkExpensesBucket(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.getBucket('expense-documents')
    return !error
  } catch {
    return false
  }
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function getExpenses(month: number, year: number) {
  const supabase = await createClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = lastDayOfMonth(month, year)

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Expense[]
}

export async function createExpense(formData: {
  description: string
  amount: number
  category: ExpenseCategory
  date: string
  document_url?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert(formData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/accounting')
  return data as Expense
}

export async function updateExpense(
  id: string,
  updates: Partial<Omit<Expense, 'id' | 'created_at'>>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/accounting')
  return data as Expense
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/accounting')
}

// ── Document storage ──────────────────────────────────────────────────────────

export async function uploadExpenseDocument(formData: FormData): Promise<string> {
  const file = formData.get('file') as File | null
  const month = formData.get('month') as string
  const year = formData.get('year') as string

  if (!file || file.size === 0) throw new Error('No se ha seleccionado ningún archivo')
  if (file.size > 10 * 1024 * 1024) throw new Error('El archivo no puede superar 10 MB')

  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
  if (!allowed.includes(file.type)) throw new Error('Formato no permitido. Usa JPG, PNG o PDF.')

  const supabase = await createClient()
  const uuid = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${year}/${month}/${uuid}-${safeName}`

  const bytes = await file.arrayBuffer()
  const { data, error } = await supabase.storage
    .from('expense-documents')
    .upload(path, bytes, { contentType: file.type, upsert: false })

  if (error) throw new Error(error.message)
  return data.path
}

export async function getDocumentSignedUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('expense-documents')
    .createSignedUrl(path, 3600)

  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function removeDocumentFromStorage(path: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.storage
    .from('expense-documents')
    .remove([path])
  if (error) throw new Error(error.message)
}

// ── Summary ───────────────────────────────────────────────────────────────────

export async function getAccountingSummary(month: number, year: number) {
  const supabase = await createClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = lastDayOfMonth(month, year)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('client_id, total_amount')
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'paid')

  const totalIncome = invoices?.reduce((s, i) => s + i.total_amount, 0) ?? 0

  const byType: Record<string, number> = {
    fixed_group: 0,
    variable_group: 0,
    individual: 0,
  }

  if (invoices && invoices.length > 0) {
    const clientIds = [...new Set(invoices.map((i) => i.client_id).filter(Boolean))]
    const { data: clients } = await supabase
      .from('clients')
      .select('id, profile_type')
      .in('id', clientIds)

    const profileOf: Record<string, string> = Object.fromEntries(
      (clients ?? []).map((c) => [c.id, c.profile_type])
    )
    for (const inv of invoices) {
      const type = profileOf[inv.client_id] ?? 'unknown'
      if (type in byType) byType[type] += inv.total_amount
    }
  }

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', startDate)
    .lte('date', endDate)

  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeByType: [
      { name: 'Grupo Fijo', value: byType.fixed_group, color: '#3b82f6' },
      { name: 'Grupo Personal Variable', value: byType.variable_group, color: '#22c55e' },
      { name: 'Personal', value: byType.individual, color: '#f97316' },
    ],
  }
}

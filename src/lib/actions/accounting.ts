'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Expense, ExpenseCategory } from '@/lib/supabase/database.types'

export async function getExpenses(month: number, year: number) {
  const supabase = await createClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) throw error
  return data as Expense[]
}

export async function createExpense(formData: {
  description: string
  amount: number
  category: ExpenseCategory
  date: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert(formData)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/accounting')
  return data as Expense
}

export async function updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'created_at'>>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/accounting')
  return data as Expense
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/accounting')
}

export async function getAccountingSummary(month: number, year: number) {
  const supabase = await createClient()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`

  // Step 1: get paid invoices (client_id + amount) — no join
  const { data: invoices } = await supabase
    .from('invoices')
    .select('client_id, total_amount')
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'paid')

  const totalIncome = invoices?.reduce((s, i) => s + i.total_amount, 0) || 0

  // Step 2: get profile_type for each involved client separately
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
      (clients || []).map((c) => [c.id, c.profile_type])
    )
    for (const inv of invoices) {
      const type = profileOf[inv.client_id] || 'unknown'
      if (type in byType) byType[type] += inv.total_amount
    }
  }

  // Step 3: expenses for the period
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .gte('date', startDate)
    .lte('date', endDate)

  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) || 0

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeByType: [
      { name: 'Grupo Fijo', value: byType.fixed_group, color: '#3b82f6' },
      { name: 'Grupo Variable', value: byType.variable_group, color: '#22c55e' },
      { name: 'Individual', value: byType.individual, color: '#f97316' },
    ],
  }
}

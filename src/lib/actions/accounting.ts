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

  // Income from paid invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, clients(profile_type)')
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'paid')

  const totalIncome = invoices?.reduce((s, i) => s + i.total_amount, 0) || 0

  // Income by type
  const byType: Record<string, number> = {
    fixed_group: 0,
    variable_group: 0,
    individual: 0,
  }
  for (const inv of invoices || []) {
    const type = (inv.clients as any)?.profile_type || 'unknown'
    if (type in byType) byType[type] += inv.total_amount
  }

  // Expenses
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

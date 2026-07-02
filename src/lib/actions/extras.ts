'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ExtraPayment {
  id: string
  name: string
  description: string | null
  amount: number
  payment_method: 'efectivo' | 'transferencia'
  date: string
  created_at: string
}

export async function getExtraPayments(): Promise<ExtraPayment[]> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('extraordinary_payments')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createExtraPayment(payload: {
  name: string
  description?: string | null
  amount: number
  payment_method: 'efectivo' | 'transferencia'
  date: string
}) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('extraordinary_payments')
    .insert(payload)
  if (error) throw error
  revalidatePath('/extras')
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
}

export async function updateExtraPayment(
  id: string,
  payload: {
    name: string
    description?: string | null
    amount: number
    payment_method: 'efectivo' | 'transferencia'
    date: string
  }
) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('extraordinary_payments')
    .update(payload)
    .eq('id', id)
  if (error) throw error
  revalidatePath('/extras')
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
}

export async function deleteExtraPayment(id: string) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('extraordinary_payments')
    .delete()
    .eq('id', id)
  if (error) throw error
  revalidatePath('/extras')
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
}

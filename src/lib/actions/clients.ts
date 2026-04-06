'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Client, ProfileType, Gender } from '@/lib/supabase/database.types'

export async function getClients(filters?: { active?: boolean; profile_type?: ProfileType }) {
  const supabase = await createClient()
  let query = supabase
    .from('clients')
    .select('*')
    .order('name')

  if (filters?.active !== undefined) {
    query = query.eq('active', filters.active)
  }
  if (filters?.profile_type) {
    query = query.eq('profile_type', filters.profile_type)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Client[]
}

export async function getClientById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Client
}

export async function createClientAction(formData: {
  name: string
  phone: string
  email: string
  profile_type: ProfileType
  monthly_fee?: number
  notes: string
  session_ids?: string[]
  birth_date?: string
  gender?: Gender
  enrollment_date?: string
}) {
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      profile_type: formData.profile_type,
      monthly_fee: formData.monthly_fee || null,
      notes: formData.notes || null,
      active: true,
      birth_date: formData.birth_date || null,
      gender: formData.gender || null,
      enrollment_date: formData.enrollment_date || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Assign to sessions
  if (formData.session_ids && formData.session_ids.length > 0) {
    const sessionClients = formData.session_ids.map((sid) => ({
      session_id: sid,
      client_id: client.id,
    }))
    const { error: scError } = await supabase.from('session_clients').insert(sessionClients)
    if (scError) throw new Error(scError.message)
  }

  revalidatePath('/clients')
  return client as Client
}

export async function updateClientAction(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'created_at'>>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return data as Client
}

export async function toggleClientActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update({ active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
}

export async function getClientAttendance(clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*, sessions(name, session_type)')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/clients')
}

export async function getClientInvoices(clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', clientId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

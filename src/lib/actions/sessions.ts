'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Session, SessionType } from '@/lib/supabase/database.types'

export async function getSessions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*, session_clients(client_id, clients(id, name, active, profile_type, monthly_fee))')
    .order('day_of_week')
    .order('time')

  if (error) throw error
  return data
}

export async function getSessionById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*, session_clients(client_id, clients(id, name, active, profile_type))')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getTodaySessions() {
  const supabase = await createClient()
  // Day of week: 0=Monday ... 6=Sunday (JS: 0=Sunday, 1=Monday)
  const jsDay = new Date().getDay()
  // Convert JS day (0=Sun) to our convention (0=Mon, 6=Sun)
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1

  const { data, error } = await supabase
    .from('sessions')
    .select('*, session_clients(client_id, clients(id, name, active, profile_type))')
    .eq('day_of_week', dayOfWeek)
    .order('time')

  if (error) throw error
  return data
}

export async function createSessionAction(formData: {
  name: string
  day_of_week: number
  time: string
  session_type: SessionType
  max_capacity?: number
  session_price?: number
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      name: formData.name,
      day_of_week: formData.day_of_week,
      time: formData.time,
      session_type: formData.session_type,
      max_capacity: formData.max_capacity || null,
      session_price: formData.session_price ?? 40,
    })
    .select()
    .single()

  if (error) throw error
  revalidatePath('/schedule')
  return data as Session
}

export async function updateSessionAction(
  id: string,
  updates: Partial<Omit<Session, 'id' | 'created_at'>>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  revalidatePath('/schedule')
  return data as Session
}

export async function deleteSessionAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/schedule')
}

export async function assignClientToSession(sessionId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('session_clients')
    .upsert({ session_id: sessionId, client_id: clientId })

  if (error) throw error
  revalidatePath('/schedule')
}

export async function removeClientFromSession(sessionId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('session_clients')
    .delete()
    .eq('session_id', sessionId)
    .eq('client_id', clientId)

  if (error) throw error
  revalidatePath('/schedule')
}

export async function updateSessionClients(sessionId: string, clientIds: string[]) {
  const supabase = await createClient()
  // Delete existing
  await supabase.from('session_clients').delete().eq('session_id', sessionId)
  // Insert new
  if (clientIds.length > 0) {
    const { error } = await supabase.from('session_clients').insert(
      clientIds.map((cid) => ({ session_id: sessionId, client_id: cid }))
    )
    if (error) throw error
  }
  revalidatePath('/schedule')
}

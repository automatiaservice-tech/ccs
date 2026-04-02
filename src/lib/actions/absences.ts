'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TrainerAbsenceStatus } from '@/lib/supabase/database.types'

export async function getAbsences() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trainer_absences')
    .select('*, sessions(id, name, day_of_week, time)')
    .order('date', { ascending: false })

  if (error) throw new Error(`Error fetching absences: ${error.message}`)
  return data
}

export async function createAbsenceAction(formData: {
  session_id: string
  date: string
  notes?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('trainer_absences').insert({
    session_id: formData.session_id,
    date: formData.date,
    notes: formData.notes || null,
    status: 'pendiente',
  })

  if (error) throw new Error(`Error creating absence: ${error.message}`)
  revalidatePath('/absences')
}

export async function resolveAbsenceAction(
  id: string,
  status: 'devuelta' | 'recuperada',
  resolution_date: string,
  resolution_notes?: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('trainer_absences')
    .update({
      status,
      resolution_date,
      resolution_notes: resolution_notes || null,
    })
    .eq('id', id)

  if (error) throw new Error(`Error resolving absence: ${error.message}`)
  revalidatePath('/absences')
}

export async function deleteAbsenceAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('trainer_absences').delete().eq('id', id)
  if (error) throw new Error(`Error deleting absence: ${error.message}`)
  revalidatePath('/absences')
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCurrentWeekWeekdays, BOARD_DAY_COUNT } from '@/lib/utils'
import type { Session, BoardAssignment } from '@/lib/supabase/database.types'

// ── Tablero: independent puzzle-board roster, per date ─────────────────────
// Reads/writes ONLY `board_assignments`. Never touches `session_clients`
// (real billing data) — this module is an editable snapshot, not a source
// of truth for billing.
//
// Note: 'use server' files may only export async functions, so the plain
// date helpers (getCurrentWeekWeekdays, defaultBoardDayIndex) live in
// @/lib/utils instead and are imported here.

export interface BoardWeekData {
  dates: string[]
  sessions: Session[]
  assignments: Pick<BoardAssignment, 'session_id' | 'client_id' | 'date'>[]
}

// ── Fetch ALL board_assignments rows matching `dates`, paginating past
// PostgREST's default max-rows cap (1000) instead of silently truncating —
// this is the actual root cause of participants "disappearing": the table
// now holds ~1000+ rows across 5 dates × many sessions, and a plain select
// without pagination was getting cut off before reaching recently-added rows.
async function fetchAllBoardAssignments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dates: string[]
): Promise<Pick<BoardAssignment, 'session_id' | 'client_id' | 'date'>[]> {
  const pageSize = 1000
  const all: Pick<BoardAssignment, 'session_id' | 'client_id' | 'date'>[] = []
  let from = 0

  while (true) {
    const { data, error } = await (supabase as any)
      .from('board_assignments')
      .select('session_id, client_id, date')
      .in('date', dates)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`Error cargando el tablero: ${error.message}`)

    all.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return all
}

// ── Seed board_assignments for a set of dates from current session_clients,
// but only for dates that have no rows yet at all ──────────────────────────
async function seedMissingDates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionIds: string[],
  dates: string[],
  existingDates: Set<string>
): Promise<Pick<BoardAssignment, 'session_id' | 'client_id' | 'date'>[]> {
  const datesToSeed = dates.filter((d) => !existingDates.has(d))
  if (datesToSeed.length === 0 || sessionIds.length === 0) return []

  const { data: sc, error: scErr } = await supabase
    .from('session_clients')
    .select('session_id, client_id')
    .in('session_id', sessionIds)

  if (scErr) throw new Error(`Error leyendo session_clients: ${scErr.message}`)
  if (!sc || sc.length === 0) return []

  const seedRows = datesToSeed.flatMap((date) =>
    sc.map((r) => ({ session_id: r.session_id, client_id: r.client_id, date }))
  )

  const { error: seedErr } = await (supabase as any)
    .from('board_assignments')
    .upsert(seedRows, { onConflict: 'session_id,client_id,date' })

  if (seedErr) throw new Error(`Error inicializando el tablero: ${seedErr.message}`)
  return seedRows
}

// ── Load the whole Mon-Fri board for the current week in one shot ──────────
export async function getBoardWeek(): Promise<BoardWeekData> {
  const supabase = await createClient()
  const dates = getCurrentWeekWeekdays()

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('*')
    .lte('day_of_week', BOARD_DAY_COUNT - 1)
    .order('day_of_week')
    .order('time')

  if (sessErr) throw new Error(`Error cargando sesiones: ${sessErr.message}`)

  const sessionIds = (sessions || []).map((s) => s.id)

  const existing = sessionIds.length ? await fetchAllBoardAssignments(supabase, dates) : []

  console.log('[board] getBoardWeek:', { dates, existingCount: existing.length })

  const existingDates = new Set<string>(existing.map((a) => a.date))
  const seeded = await seedMissingDates(supabase, sessionIds, dates, existingDates)

  if (seeded.length > 0) {
    console.log('[board] getBoardWeek → seeded count:', seeded.length)
  }

  return {
    dates,
    sessions: (sessions as Session[]) || [],
    assignments: [...existing, ...seeded],
  }
}

// ── Move a participant from one session to another, for one date ──────────
export async function moveBoardParticipant(
  date: string,
  fromSessionId: string,
  toSessionId: string,
  clientId: string
) {
  if (fromSessionId === toSessionId) return
  const supabase = await createClient()
  console.log('[board] moveBoardParticipant:', { date, fromSessionId, toSessionId, clientId })

  const { error: delErr } = await (supabase as any)
    .from('board_assignments')
    .delete()
    .eq('date', date)
    .eq('session_id', fromSessionId)
    .eq('client_id', clientId)

  if (delErr) throw new Error(`Error moviendo participante: ${delErr.message}`)

  const { data, error: insErr } = await (supabase as any)
    .from('board_assignments')
    .upsert(
      { session_id: toSessionId, client_id: clientId, date },
      { onConflict: 'session_id,client_id,date' }
    )
    .select()

  console.log('[board] moveBoardParticipant ← result:', { data, error: insErr ? JSON.stringify(insErr) : null })

  if (insErr) throw new Error(`Error moviendo participante: ${insErr.message}`)
  revalidatePath('/board')
}

export async function addBoardParticipant(date: string, sessionId: string, clientId: string) {
  const supabase = await createClient()
  console.log('[board] addBoardParticipant → upsert:', { session_id: sessionId, client_id: clientId, date })

  const { data, error } = await (supabase as any)
    .from('board_assignments')
    .upsert(
      { session_id: sessionId, client_id: clientId, date },
      { onConflict: 'session_id,client_id,date' }
    )
    .select()

  console.log('[board] addBoardParticipant ← result:', { data, error: error ? JSON.stringify(error) : null })

  if (error) throw new Error(`Error añadiendo participante: ${error.message}`)
  revalidatePath('/board')
}

export async function removeBoardParticipant(date: string, sessionId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('board_assignments')
    .delete()
    .eq('date', date)
    .eq('session_id', sessionId)
    .eq('client_id', clientId)

  if (error) throw new Error(`Error quitando participante: ${error.message}`)
  revalidatePath('/board')
}

// ── Reset one day back to whatever session_clients currently says ─────────
export async function resetBoardDay(date: string, dayOfWeek: number) {
  const supabase = await createClient()

  const { error: delErr } = await (supabase as any)
    .from('board_assignments')
    .delete()
    .eq('date', date)

  if (delErr) throw new Error(`Error reseteando el día: ${delErr.message}`)

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('day_of_week', dayOfWeek)

  if (sessErr) throw new Error(`Error reseteando el día: ${sessErr.message}`)

  const sessionIds = (sessions || []).map((s) => s.id)
  if (sessionIds.length > 0) {
    const { data: sc, error: scErr } = await supabase
      .from('session_clients')
      .select('session_id, client_id')
      .in('session_id', sessionIds)

    if (scErr) throw new Error(`Error reseteando el día: ${scErr.message}`)

    if (sc && sc.length > 0) {
      const { error: seedErr } = await (supabase as any)
        .from('board_assignments')
        .upsert(
          sc.map((r) => ({ session_id: r.session_id, client_id: r.client_id, date })),
          { onConflict: 'session_id,client_id,date' }
        )
      if (seedErr) throw new Error(`Error reseteando el día: ${seedErr.message}`)
    }
  }

  revalidatePath('/board')
}

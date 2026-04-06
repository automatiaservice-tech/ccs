'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Logs ──────────────────────────────────────────────────────────────────────

export async function getWhatsAppLogs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('whatsapp_logs')
    .select('*, clients(name), sessions(name)')
    .order('sent_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(error.message)
  return data ?? []
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getWhatsAppConfig() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  return data as { id: number; global_enabled: boolean; send_hour_utc: number } | null
}

export async function updateWhatsAppConfig(updates: {
  global_enabled?: boolean
  send_hour_utc?: number
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('whatsapp_config')
    .upsert({ id: 1, ...updates })
  if (error) throw new Error(error.message)
  revalidatePath('/whatsapp')
}

// ── Trigger now ───────────────────────────────────────────────────────────────

export async function triggerRemindersNow() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const res = await fetch(`${appUrl}/api/cron/reminders`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}`,
    },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`)
  }

  revalidatePath('/whatsapp')
  return data as { message: string; sent: number; failed: number; total: number }
}

// ── Per-client toggle ─────────────────────────────────────────────────────────

export async function updateClientWhatsApp(clientId: string, whatsapp_enabled: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ whatsapp_enabled })
    .eq('id', clientId)
  if (error) throw new Error(error.message)
  revalidatePath(`/clients/${clientId}`)
}

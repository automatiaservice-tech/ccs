import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getAppUrl(): string {
  // Prefer VERCEL_URL (set automatically by Vercel) to avoid localhost misconfiguration
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

async function sendWhatsApp(
  phone: string,
  clientName: string,
  sessionTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${getAppUrl()}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, clientName, sessionTime }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data?.error || `HTTP ${res.status}` }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Check global toggle
  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('global_enabled')
    .eq('id', 1)
    .maybeSingle()

  if (config && !config.global_enabled) {
    return NextResponse.json({ message: 'Reminders globally disabled', sent: 0, failed: 0, total: 0 })
  }

  // Calculate tomorrow's day_of_week (app convention: 0=Mon ... 6=Sun)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const jsDay = tomorrow.getDay() // 0=Sun, 1=Mon ... 6=Sat
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1

  // Fetch tomorrow's sessions with assigned active clients
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select(`
      id,
      name,
      time,
      session_clients (
        clients (
          id,
          name,
          phone,
          profile_type,
          active,
          whatsapp_enabled
        )
      )
    `)
    .eq('day_of_week', dayOfWeek)

  if (sessionsError) {
    console.error('[cron/reminders] Supabase error:', sessionsError)
    return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  const logs: {
    client_id: string
    session_id: string
    phone: string
    status: 'sent' | 'failed'
    error_message: string | null
  }[] = []
  const errors: { client: string; phone: string; error: string }[] = []

  for (const session of sessions ?? []) {
    for (const sc of (session as any).session_clients ?? []) {
      const client = sc.clients
      if (!client) continue
      if (!client.active) continue
      if (!client.phone) continue
      if (client.whatsapp_enabled === false) continue

      const result = await sendWhatsApp(client.phone, client.name, session.time)

      logs.push({
        client_id: client.id,
        session_id: session.id,
        phone: client.phone,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error ?? null,
      })

      if (result.success) {
        sent++
      } else {
        failed++
        errors.push({ client: client.name, phone: client.phone, error: result.error ?? 'Error desconocido' })
      }
    }
  }

  if (logs.length > 0) {
    const { error: logError } = await supabase.from('whatsapp_logs').insert(logs)
    if (logError) console.error('[cron/reminders] Error inserting logs:', logError)
  }

  return NextResponse.json({
    message: 'Reminders processed',
    sent,
    failed,
    total: logs.length,
    errors,
  })
}

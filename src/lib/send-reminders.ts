import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatPhone(raw: string): string {
  let cleaned = raw.replace(/[\s\-(). ]/g, '')
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2)
  if (!cleaned.startsWith('+')) cleaned = '+34' + cleaned
  return cleaned
}

async function sendToMeta(
  to: string,
  clientName: string,
  sessionTime: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME

  if (!token || !phoneNumberId || !templateName) {
    const missing = [
      !token && 'WHATSAPP_TOKEN',
      !phoneNumberId && 'WHATSAPP_PHONE_NUMBER_ID',
      !templateName && 'WHATSAPP_TEMPLATE_NAME',
    ].filter(Boolean).join(', ')
    return { success: false, error: `Variable(s) no configurada(s) en Vercel: ${missing}` }
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', parameter_name: 'nombre', text: clientName },
            { type: 'text', parameter_name: 'hora', text: sessionTime },
          ],
        },
      ],
    },
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      const errMsg =
        data?.error?.error_data?.details ||
        data?.error?.message ||
        `HTTP ${res.status}`
      console.error('[WhatsApp] Error Meta:', JSON.stringify(data?.error))
      return { success: false, error: `(#${data?.error?.code}) ${errMsg}` }
    }

    const messageId = data?.messages?.[0]?.id
    if (!messageId) {
      return { success: false, error: 'Meta no devolvió message ID' }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[WhatsApp] Error inesperado:', err.message)
    return { success: false, error: err.message }
  }
}

export interface RemindersResult {
  message: string
  sent: number
  failed: number
  total: number
  errors: { client: string; phone: string; error: string }[]
}

export async function runReminders(): Promise<RemindersResult> {
  const supabase = createAdminClient()

  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('global_enabled')
    .eq('id', 1)
    .maybeSingle()

  if (config && !config.global_enabled) {
    return { message: 'Reminders globally disabled', sent: 0, failed: 0, total: 0, errors: [] }
  }

  // Tomorrow's day_of_week (app convention: 0=Mon … 6=Sun)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const jsDay = tomorrow.getDay()
  const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1

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
    console.error('[reminders] Supabase error:', sessionsError)
    throw new Error(sessionsError.message)
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
      if (!client || !client.active || !client.phone) continue
      if (client.whatsapp_enabled === false) continue

      const phone = formatPhone(client.phone)
      const result = await sendToMeta(phone, client.name, session.time)

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
        errors.push({ client: client.name, phone, error: result.error ?? 'Error desconocido' })
      }
    }
  }

  if (logs.length > 0) {
    const { error: logError } = await supabase.from('whatsapp_logs').insert(logs)
    if (logError) console.error('[reminders] Error inserting logs:', logError)
  }

  return { message: 'Reminders processed', sent, failed, total: logs.length, errors }
}

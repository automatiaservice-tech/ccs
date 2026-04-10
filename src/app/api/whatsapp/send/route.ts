import { NextRequest, NextResponse } from 'next/server'

function formatPhone(raw: string): string {
  // Remove spaces, hyphens, parentheses — keep + intact
  let cleaned = raw.replace(/[\s\-(). ]/g, '')
  // 0034... → +34...
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2)
  // 9 digits without prefix → +34XXXXXXXXX
  if (!cleaned.startsWith('+')) cleaned = '+34' + cleaned
  return cleaned
}

export async function POST(req: NextRequest) {
  try {
    const { phone, clientName, sessionTime } = await req.json()

    if (!phone || !clientName || !sessionTime) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, clientName, sessionTime' },
        { status: 400 }
      )
    }

    const token = process.env.WHATSAPP_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME

    if (!token || !phoneNumberId || !templateName) {
      return NextResponse.json({ error: 'WhatsApp credentials not configured' }, { status: 500 })
    }

    const to = formatPhone(phone)

    const requestBody = {
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
              { type: 'text', text: clientName },
              { type: 'text', text: sessionTime },
            ],
          },
        ],
      },
    }

    console.log('[WhatsApp] Enviando a:', to)
    console.log('[WhatsApp] Template:', templateName, '| Language: es')
    console.log('[WhatsApp] Request body:', JSON.stringify(requestBody))

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const data = await res.json()
    console.log('[WhatsApp] Response status:', res.status)
    console.log('[WhatsApp] Respuesta Meta:', JSON.stringify(data))

    if (!res.ok) {
      const errMsg =
        data?.error?.message ||
        data?.error?.error_data?.details ||
        `HTTP ${res.status}`
      return NextResponse.json({ error: errMsg, details: data }, { status: res.status })
    }

    const messageId = data?.messages?.[0]?.id
    if (!messageId) {
      return NextResponse.json(
        { error: 'Meta no devolvió message ID', details: data },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, messageId })
  } catch (err: any) {
    console.error('[WhatsApp] Error inesperado:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

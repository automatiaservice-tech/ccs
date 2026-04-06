import { NextRequest, NextResponse } from 'next/server'

function formatPhone(raw: string): string {
  let phone = raw.replace(/[\s\-().+]/g, '')
  // Remove leading zeros before checking prefix
  if (phone.startsWith('00')) phone = phone.slice(2)
  // Re-add + prefix
  if (!phone.startsWith('+')) {
    // If already had + stripped, or has country code (> 9 digits for ES)
    if (phone.length > 9) {
      phone = '+' + phone
    } else {
      phone = '+34' + phone
    }
  } else {
    // was already +XX...
  }
  // Reconstruct properly from raw
  let cleaned = raw.replace(/[\s\-().]/g, '')
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2)
  if (!cleaned.startsWith('+')) cleaned = '+34' + cleaned
  return cleaned
}

export async function POST(req: NextRequest) {
  try {
    const { phone, clientName, sessionTime, sessionName } = await req.json()

    if (!phone || !clientName || !sessionTime) {
      return NextResponse.json({ error: 'Missing required fields: phone, clientName, sessionTime' }, { status: 400 })
    }

    const token = process.env.WHATSAPP_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME

    if (!token || !phoneNumberId || !templateName) {
      return NextResponse.json({ error: 'WhatsApp credentials not configured' }, { status: 500 })
    }

    const to = formatPhone(phone)

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'WhatsApp API error', details: data },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, messageId: data?.messages?.[0]?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

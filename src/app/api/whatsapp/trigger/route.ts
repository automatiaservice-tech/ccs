import { NextResponse } from 'next/server'

// POST /api/whatsapp/trigger
// Called from the /whatsapp page button. Protected by the Supabase auth proxy —
// no need to expose CRON_SECRET to the browser. Delegates to the cron handler
// which holds the actual business logic.
export async function POST() {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/cron/reminders`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error || `HTTP ${res.status}` },
      { status: res.status }
    )
  }

  return NextResponse.json(data)
}

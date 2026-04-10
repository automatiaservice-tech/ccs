import { NextResponse } from 'next/server'
import { runReminders } from '@/lib/send-reminders'

// POST /api/whatsapp/trigger
// Called from the /whatsapp page button. Calls runReminders() directly —
// no internal HTTP call, no secret needed from the browser.
export async function POST() {
  try {
    const result = await runReminders()
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[whatsapp/trigger]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

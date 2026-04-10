import { NextRequest, NextResponse } from 'next/server'
import { runReminders } from '@/lib/send-reminders'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runReminders()
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[cron/reminders]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { getTodaySessions } from '@/lib/actions/sessions'
import { CheckinClient } from './checkin-client'

export default async function CheckinPage() {
  const sessions = await getTodaySessions()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Pasar Lista</h1>
        <p className="text-[#64748B] text-sm mt-1">
          Sesiones de hoy — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <CheckinClient sessions={sessions} />
    </div>
  )
}

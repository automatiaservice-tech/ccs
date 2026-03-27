import { getTodaySessions } from '@/lib/actions/sessions'
import { CheckinClient } from './checkin-client'

export default async function CheckinPage() {
  const sessions = await getTodaySessions()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Pasar Lista</h1>
        <p className="text-slate-400 text-sm mt-1">
          Sesiones de hoy — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <CheckinClient sessions={sessions} />
    </div>
  )
}

import { getSessions } from '@/lib/actions/sessions'
import { WeeklySchedule } from './weekly-schedule'

export default async function SchedulePage() {
  const sessions = await getSessions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Horario</h1>
        <p className="text-slate-400 text-sm mt-1">Vista semanal de sesiones</p>
      </div>

      <WeeklySchedule initialSessions={sessions} />
    </div>
  )
}

import { getSessions } from '@/lib/actions/sessions'
import { getClients } from '@/lib/actions/clients'
import { WeeklySchedule } from './weekly-schedule'

export default async function SchedulePage() {
  const [sessions, clients] = await Promise.all([
    getSessions(),
    getClients(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Horario</h1>
        <p className="text-[#64748B] text-sm mt-1">Vista semanal de sesiones</p>
      </div>

      <WeeklySchedule initialSessions={sessions} allClients={clients} />
    </div>
  )
}

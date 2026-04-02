import { getAbsences } from '@/lib/actions/absences'
import { getSessions } from '@/lib/actions/sessions'
import { AbsencesClient } from './absences-client'

interface AbsencesPageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function AbsencesPage({ searchParams }: AbsencesPageProps) {
  const [absences, sessions, params] = await Promise.all([
    getAbsences(),
    getSessions(),
    searchParams,
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Ausencias del entrenador</h1>
        <p className="text-[#64748B] text-sm mt-1">
          Registro y seguimiento de ausencias
        </p>
      </div>

      <AbsencesClient
        absences={absences}
        sessions={sessions}
        initialSessionId={params.session_id}
      />
    </div>
  )
}

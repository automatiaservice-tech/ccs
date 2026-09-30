import { getBoardWeek } from '@/lib/actions/board'
import { getClients } from '@/lib/actions/clients'
import { defaultBoardDayIndex } from '@/lib/utils'
import { BoardClient } from './board-client'

export default async function BoardPage() {
  const [board, clients] = await Promise.all([
    getBoardWeek(),
    getClients({ active: true }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Tablero</h1>
        <p className="text-[#64748B] text-sm mt-1">
          Reorganiza participantes entre sesiones del día — no afecta a facturación
        </p>
      </div>

      <BoardClient
        dates={board.dates}
        sessions={board.sessions}
        initialAssignments={board.assignments}
        allClients={clients}
        defaultDayIndex={defaultBoardDayIndex()}
      />
    </div>
  )
}

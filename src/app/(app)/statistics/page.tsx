import { getClientStats, getAttendanceStats, getRevenueByTypeStats } from '@/lib/actions/statistics'
import { StatisticsClient } from './statistics-client'

export default async function StatisticsPage() {
  const [clientStats, attendanceStats, revenueStats] = await Promise.all([
    getClientStats(),
    getAttendanceStats(),
    getRevenueByTypeStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Estadísticas</h1>
        <p className="text-[#64748B] text-sm mt-1">Análisis completo de clientes, asistencia e ingresos</p>
      </div>

      <StatisticsClient
        clientStats={clientStats}
        attendanceStats={attendanceStats}
        revenueStats={revenueStats}
      />
    </div>
  )
}

import { getClientStats, getAttendanceStats, getRevenueByTypeStats, getFixedGroupRateStats, getPaymentMethodStats } from '@/lib/actions/statistics'
import { StatisticsClient } from './statistics-client'

const DEFAULT_CLIENT_STATS = {
  ageDistribution: [],
  avgAge: null,
  avgAgeMale: null,
  avgAgeFemale: null,
  genderDist: [],
  totalActive: 0,
  byGender: { masculino: 0, femenino: 0, otro: 0 },
}

const DEFAULT_ATTENDANCE_STATS = {
  weeklyAttendance: [],
  dayData: [],
  monthSessions: 0,
  avgAttendees: 0,
  topClientName: '—',
  attendanceRate: 0,
}

const DEFAULT_RATE_STATS = {
  distribution: [
    { label: 'TARIFA 1', value: 28, count: 0 },
    { label: 'TARIFA 2', value: 40, count: 0 },
    { label: 'TARIFA VIP 1', value: 40, count: 0 },
    { label: 'TARIFA 3', value: 60, count: 0 },
    { label: 'TARIFA 4', value: 80, count: 0 },
    { label: 'TARIFA VIP', value: 50, count: 0 },
  ],
  totalMRR: 0,
  topRate: { label: 'TARIFA 1', value: 28, count: 0 },
}

const DEFAULT_PAYMENT_STATS = {
  donut: [],
  cashTotal: 0,
  transferTotal: 0,
  pendingTotal: 0,
  cashClients: [],
  transferClients: [],
  pendingClients: [],
}

export default async function StatisticsPage() {
  const [clientStats, attendanceStats, revenueStats, rateStats, paymentStats] = await Promise.all([
    getClientStats().catch(() => DEFAULT_CLIENT_STATS),
    getAttendanceStats().catch(() => DEFAULT_ATTENDANCE_STATS),
    getRevenueByTypeStats().catch(() => []),
    getFixedGroupRateStats().catch(() => DEFAULT_RATE_STATS),
    getPaymentMethodStats().catch(() => DEFAULT_PAYMENT_STATS),
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
        rateStats={rateStats}
        paymentStats={paymentStats}
      />
    </div>
  )
}

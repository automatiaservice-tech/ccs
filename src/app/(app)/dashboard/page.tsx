import { getDashboardStats } from '@/lib/actions/attendance'
import { getQuickStats } from '@/lib/actions/statistics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardChart } from './chart'
import { QuickStats } from './quick-stats'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const [stats, quickStats] = await Promise.all([
    getDashboardStats(),
    getQuickStats().catch(() => ({ genderDist: [], weeklyData: [] })),
  ])

  const now = new Date()
  const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard</h1>
        <p className="text-[#64748B] text-sm mt-1">
          Resumen de {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Ingresos del mes</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatCurrency(stats.monthlyIncome)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-3">Solo facturas pagadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Gastos del mes</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatCurrency(stats.monthlyExpenses)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-3">Gastos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Beneficio neto</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    stats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(stats.netProfit)}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  stats.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <TrendingUp
                  className={`h-5 w-5 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}
                />
              </div>
            </div>
            <p className="text-xs text-[#64748B] mt-3">Ingresos - Gastos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Clientes activos</p>
                <p className="text-2xl font-bold text-[#0F172A] mt-1">{stats.activeClients}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <CalendarCheck className="h-3 w-3 text-[#64748B]" />
              <p className="text-xs text-[#64748B]">{stats.weekSessions} sesiones esta semana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs Gastos — Últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardChart data={stats.chartData} />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <QuickStats genderDist={quickStats.genderDist} weeklyData={quickStats.weeklyData} />

      {/* Quick Access */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/schedule/checkin"
            className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Pasar Lista</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>

          <Link
            href="/clients"
            className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Clientes</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>

          <Link
            href="/billing"
            className="flex items-center justify-between p-4 rounded-xl border border-[#E2E8F0] bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Facturación</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}

import { getDashboardStats } from '@/lib/actions/attendance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardChart } from './chart'
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
  const stats = await getDashboardStats()

  const now = new Date()
  const monthName = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Resumen de {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Ingresos del mes</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(stats.monthlyIncome)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">Solo facturas pagadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Gastos del mes</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(stats.monthlyExpenses)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">Gastos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Beneficio neto</p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(stats.netProfit)}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  stats.netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                <TrendingUp
                  className={`h-5 w-5 ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3">Ingresos - Gastos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Clientes activos</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{stats.activeClients}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <CalendarCheck className="h-3 w-3 text-slate-400" />
              <p className="text-xs text-slate-400">{stats.weekSessions} sesiones esta semana</p>
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

      {/* Quick Access */}
      <div>
        <h2 className="text-base font-semibold text-slate-300 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/schedule/checkin"
            className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 hover:border-blue-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20">
                <CalendarCheck className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-200">Pasar Lista</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            href="/clients"
            className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800 hover:border-blue-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-slate-200">Clientes</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>

          <Link
            href="/billing"
            className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800 hover:border-blue-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/20">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-sm font-medium text-slate-200">Facturación</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}

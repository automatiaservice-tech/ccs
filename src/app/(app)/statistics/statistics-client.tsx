'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingUp, Calendar, Star, Euro } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ── Shared tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-md text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color ?? entry.fill }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: any
  iconBg: string
  iconColor: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        {sub && <p className="text-xs text-[#64748B] mt-2">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ── Custom donut label ───────────────────────────────────────────────────────
function DonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  if (percent < 0.07) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="text-[11px]" fill="#fff" fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
interface RateItem {
  label: string
  value: number
  count: number
}

interface Props {
  clientStats: {
    ageDistribution: { range: string; masculino: number; femenino: number; otro: number }[]
    avgAge: number | null
    avgAgeMale: number | null
    avgAgeFemale: number | null
    genderDist: { name: string; value: number; color: string }[]
    totalActive: number
    byGender: { masculino: number; femenino: number; otro: number }
  }
  attendanceStats: {
    weeklyAttendance: { week: string; asistentes: number }[]
    dayData: { day: string; asistentes: number }[]
    monthSessions: number
    avgAttendees: number
    topClientName: string
    attendanceRate: number
  }
  revenueStats: { month: string; 'Grupo Fijo': number; 'Grupo Personal Variable': number; Personal: number }[]
  rateStats: {
    distribution: RateItem[]
    totalMRR: number
    topRate: RateItem
  }
}

const RATE_COLORS = ['#93c5fd', '#3b82f6', '#1d4ed8', '#4338ca']

export function StatisticsClient({ clientStats, attendanceStats, revenueStats, rateStats }: Props) {
  const { ageDistribution, avgAge, avgAgeMale, avgAgeFemale, genderDist, totalActive, byGender } = clientStats
  const { weeklyAttendance, dayData, monthSessions, avgAttendees, topClientName, attendanceRate } = attendanceStats

  const pct = (n: number) => (totalActive > 0 ? Math.round((n / totalActive) * 100) : 0)

  return (
    <div className="space-y-10">

      {/* ══ A) CLIENTES ══════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
          Estadísticas de clientes
        </h2>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Edad media"
            value={avgAge !== null ? `${avgAge} años` : '—'}
            sub="Todos los clientes activos"
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Edad media hombres"
            value={avgAgeMale !== null ? `${avgAgeMale} años` : '—'}
            sub={`${byGender.masculino} clientes (${pct(byGender.masculino)}%)`}
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Edad media mujeres"
            value={avgAgeFemale !== null ? `${avgAgeFemale} años` : '—'}
            sub={`${byGender.femenino} clientes (${pct(byGender.femenino)}%)`}
            icon={Users}
            iconBg="bg-pink-50"
            iconColor="text-pink-500"
          />
          <StatCard
            label="Clientes activos"
            value={totalActive}
            sub={`H: ${byGender.masculino} · M: ${byGender.femenino} · O: ${byGender.otro}`}
            icon={Users}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Age distribution bar chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Distribución por edad y sexo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ageDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(226,232,240,0.4)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} formatter={(v) => <span style={{ color: '#64748b' }}>{v}</span>} />
                  <Bar dataKey="masculino" name="Masculino" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="femenino" name="Femenino" fill="#ec4899" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="otro" name="Otro" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gender donut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribución por sexo</CardTitle>
            </CardHeader>
            <CardContent>
              {genderDist.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-[#64748B] text-sm">
                  Sin datos de sexo
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={genderDist}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                        label={DonutLabel}
                      >
                        {genderDist.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [`${v} clientes`, name]} contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {genderDist.map((g) => (
                      <div key={g.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                          <span className="text-slate-600">{g.name}</span>
                        </div>
                        <span className="font-medium text-[#0F172A]">{g.value} ({pct(g.value)}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══ B) ASISTENCIA ════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
          Estadísticas de asistencia
        </h2>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Sesiones este mes"
            value={monthSessions}
            icon={Calendar}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Media asistentes/sesión"
            value={avgAttendees}
            icon={Users}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            label="Más asistente del mes"
            value={topClientName}
            icon={Star}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-600"
          />
          <StatCard
            label="Tasa de asistencia"
            value={`${attendanceRate}%`}
            sub="Asistidos vs esperados"
            icon={TrendingUp}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Weekly attendance line chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Asistencia semanal — últimas 8 semanas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={weeklyAttendance} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E2E8F0' }} />
                  <Line
                    type="monotone"
                    dataKey="asistentes"
                    name="Asistentes"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: '#2563eb', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Day of week bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Asistencia por día de la semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(226,232,240,0.4)' }} />
                  <Bar dataKey="asistentes" name="Asistentes" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══ C) TARIFAS GRUPO FIJO ════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
          Distribución de tarifas — Grupo Fijo
        </h2>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Ingresos recurrentes mensuales"
            value={formatCurrency(rateStats.totalMRR)}
            sub="Suma de cuotas fijas activas"
            icon={Euro}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Tarifa más contratada"
            value={rateStats.topRate.count > 0 ? rateStats.topRate.label : '—'}
            sub={rateStats.topRate.count > 0 ? `${formatCurrency(rateStats.topRate.value)} · ${rateStats.topRate.count} clientes` : 'Sin datos'}
            icon={Star}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <StatCard
            label="Clientes grupo fijo activos"
            value={rateStats.distribution.reduce((s, r) => s + r.count, 0)}
            sub="Con cuota mensual asignada"
            icon={Users}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Clientes por tarifa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={rateStats.distribution.map((r, i) => ({ ...r, fill: RATE_COLORS[i] }))}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as RateItem
                      return (
                        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-md text-xs">
                          <p className="font-medium text-slate-700">{d.label} — {formatCurrency(d.value)}</p>
                          <p className="text-slate-600 mt-1">{d.count} clientes</p>
                        </div>
                      )
                    }}
                    cursor={{ fill: 'rgba(226,232,240,0.4)' }}
                  />
                  <Bar dataKey="count" name="Clientes" radius={[4, 4, 0, 0]}>
                    {rateStats.distribution.map((_, i) => (
                      <Cell key={i} fill={RATE_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Breakdown cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Desglose por tarifa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {rateStats.distribution.map((r, i) => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: RATE_COLORS[i] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{r.label}</span>
                      <span className="text-slate-500 text-xs">{r.count} × {formatCurrency(r.value)} = <span className="font-semibold text-slate-700">{formatCurrency(r.count * r.value)}/mes</span></span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: rateStats.totalMRR > 0 ? `${((r.count * r.value) / rateStats.totalMRR) * 100}%` : '0%',
                          background: RATE_COLORS[i],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {rateStats.totalMRR === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Sin clientes de grupo fijo activos</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══ E) INGRESOS POR TIPO ═════════════════════════════════════════════ */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
          Ingresos por tipo de cliente — últimos 6 meses
        </h2>

        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueStats} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} className="capitalize" />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  content={<ChartTooltip formatter={(v: number) => `${v.toFixed(2)}€`} />}
                  cursor={{ fill: 'rgba(226,232,240,0.4)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} formatter={(v) => <span style={{ color: '#64748b' }}>{v}</span>} />
                <Bar dataKey="Grupo Fijo" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Grupo Personal Variable" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Personal" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

    </div>
  )
}

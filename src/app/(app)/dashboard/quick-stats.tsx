'use client'

import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

interface QuickStatsProps {
  genderDist: { name: string; value: number; color: string }[]
  weeklyData: { week: string; asistentes: number }[]
}

export function QuickStats({ genderDist, weeklyData }: QuickStatsProps) {
  const total = genderDist.reduce((s, g) => s + g.value, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">Estadísticas rápidas</h2>
        <Link
          href="/statistics"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
        >
          Ver todas las estadísticas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mini donut: gender distribution */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
              Distribución por sexo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {genderDist.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">Sin datos — rellena el campo Sexo en los clientes</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={90} height={90}>
                  <PieChart>
                    <Pie
                      data={genderDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={42}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {genderDist.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5">
                  {genderDist.map((g) => (
                    <div key={g.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: g.color }} />
                      <span className="text-slate-600">{g.name}</span>
                      <span className="font-semibold text-[#0F172A] ml-auto pl-2">
                        {total > 0 ? Math.round((g.value / total) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini bar: weekly attendance */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">
              Asistencia últimas 4 semanas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 11 }}
                  cursor={{ fill: 'rgba(226,232,240,0.4)' }}
                />
                <Bar dataKey="asistentes" name="Asistentes" fill="#2563eb" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

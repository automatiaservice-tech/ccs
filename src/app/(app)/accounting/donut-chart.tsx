'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DonutChartProps {
  data: { name: string; value: number; color: string }[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 shadow-md">
        <p className="text-slate-600 text-xs font-medium">{payload[0].name}</p>
        <p className="text-[#0F172A] text-sm font-bold">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export function DonutChart({ data }: DonutChartProps) {
  const filtered = data.filter((d) => d.value > 0)
  if (filtered.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={70}
          paddingAngle={3}
          dataKey="value"
        >
          {filtered.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

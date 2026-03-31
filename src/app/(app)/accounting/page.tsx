import { getExpenses, getAccountingSummary } from '@/lib/actions/accounting'
import { AccountingClient } from './accounting-client'

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { month: monthParam, year: yearParam } = await searchParams
  const now = new Date()
  const month = parseInt(monthParam || String(now.getMonth() + 1))
  const year = parseInt(yearParam || String(now.getFullYear()))

  const [expenses, summary] = await Promise.all([
    getExpenses(month, year),
    getAccountingSummary(month, year),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Contabilidad</h1>
        <p className="text-[#64748B] text-sm mt-1">Ingresos, gastos y beneficios</p>
      </div>

      <AccountingClient
        initialExpenses={expenses}
        summary={summary}
        month={month}
        year={year}
      />
    </div>
  )
}

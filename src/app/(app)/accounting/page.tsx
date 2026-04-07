import { getExpenses, getAccountingSummary, checkExpensesBucket } from '@/lib/actions/accounting'
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

  const DEFAULT_SUMMARY = {
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    incomeByType: [
      { name: 'Grupo Fijo', value: 0, color: '#3b82f6' },
      { name: 'Grupo Personal Variable', value: 0, color: '#22c55e' },
      { name: 'Personal', value: 0, color: '#f97316' },
    ],
  }

  const [expenses, summary, bucketExists] = await Promise.all([
    getExpenses(month, year).catch(() => []),
    getAccountingSummary(month, year).catch(() => DEFAULT_SUMMARY),
    checkExpensesBucket().catch(() => false),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Contabilidad</h1>
        <p className="text-[#64748B] text-sm mt-1">Ingresos, gastos y beneficios</p>
      </div>

      <AccountingClient
        key={`${month}-${year}`}
        initialExpenses={expenses}
        summary={summary}
        month={month}
        year={year}
        bucketExists={bucketExists}
      />
    </div>
  )
}

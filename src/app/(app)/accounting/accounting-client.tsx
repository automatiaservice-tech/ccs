'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency, getMonthName, formatDate } from '@/lib/utils'
import { createExpense, updateExpense, deleteExpense } from '@/lib/actions/accounting'
import { DonutChart } from './donut-chart'
import type { Expense, ExpenseCategory } from '@/lib/supabase/database.types'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }))
const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'suministros', label: 'Suministros' },
  { value: 'material', label: 'Material' },
  { value: 'otros', label: 'Otros' },
]

interface Props {
  initialExpenses: Expense[]
  summary: { totalIncome: number; totalExpenses: number; netProfit: number; incomeByType: any[] }
  month: number
  year: number
}

export function AccountingClient({ initialExpenses, summary, month, year }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'otros' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0],
  })

  const navigatePeriod = (m: number, y: number) => {
    router.push(`/accounting?month=${m}&year=${y}`)
  }

  const openCreate = () => {
    setEditExpense(null)
    setForm({
      description: '',
      amount: '',
      category: 'otros',
      date: `${year}-${String(month).padStart(2, '0')}-01`,
    })
    setShowModal(true)
  }

  const openEdit = (expense: Expense) => {
    setEditExpense(expense)
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: expense.date,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        date: form.date,
      }
      if (editExpense) {
        await updateExpense(editExpense.id, data)
        toast.success('Gasto actualizado')
      } else {
        await createExpense(data)
        toast.success('Gasto añadido')
      }
      router.refresh()
      setShowModal(false)
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    setDeletingId(id)
    try {
      await deleteExpense(id)
      toast.success('Gasto eliminado')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const totalExpenses = initialExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <>
      {/* Period Selector */}
      <div className="flex items-center gap-3">
        <Select
          value={String(month)}
          onValueChange={(v) => navigatePeriod(parseInt(v), year)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(year)}
          onValueChange={(v) => navigatePeriod(month, parseInt(v))}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-slate-400 text-sm">
          {getMonthName(month)} {year}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Ingresos</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(summary.totalIncome)}</p>
                <p className="text-xs text-slate-400 mt-1">Facturas pagadas</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Gastos</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{formatCurrency(summary.totalExpenses)}</p>
                <p className="text-xs text-slate-400 mt-1">Total registrado</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Beneficio neto</p>
                <p className={`text-2xl font-bold mt-1 ${summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(summary.netProfit)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Ingresos − Gastos</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${summary.netProfit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                <TrendingUp className={`h-5 w-5 ${summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income breakdown + Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.totalIncome === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Sin ingresos este mes</p>
            ) : (
              <DonutChart data={summary.incomeByType} />
            )}
            <div className="mt-4 space-y-2">
              {summary.incomeByType.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-slate-100 font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Gastos</CardTitle>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                Añadir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {initialExpenses.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm px-6">
                Sin gastos registrados este mes
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">Descripción</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-400 hidden sm:table-cell">Categoría</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">Importe</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {initialExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-700/50">
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-100">{exp.description}</p>
                        <p className="text-xs text-slate-400">{formatDate(exp.date)}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-slate-400 capitalize">{exp.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-100">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(exp)} className="p-1 text-slate-500 hover:text-blue-400">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            disabled={deletingId === exp.id}
                            className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-50"
                          >
                            {deletingId === exp.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-600">
                    <td colSpan={2} className="px-4 py-3 text-sm font-medium text-slate-300">Total gastos</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-100">
                      {formatCurrency(totalExpenses)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editExpense ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Ej: Alquiler local"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Importe (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v as ExpenseCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editExpense ? 'Guardar cambios' : 'Añadir gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

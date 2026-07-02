'use client'

import { useState, useMemo, useTransition } from 'react'
import { toast } from 'sonner'
import { PlusCircle, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import {
  type ExtraPayment,
  createExtraPayment,
  updateExtraPayment,
  deleteExtraPayment,
} from '@/lib/actions/extras'

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ── Payment method badge ──────────────────────────────────────────────────────
function MethodBadge({ method }: { method: 'efectivo' | 'transferencia' }) {
  if (method === 'efectivo') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        💵 Efectivo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
      🏦 Transferencia
    </span>
  )
}

// ── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  description: '',
  amount: '',
  payment_method: 'efectivo' as 'efectivo' | 'transferencia',
  date: today(),
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialPayments: ExtraPayment[]
}

export function ExtrasClient({ initialPayments }: Props) {
  const [payments, setPayments] = useState<ExtraPayment[]>(initialPayments)

  // Filters
  const now = new Date()
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMethod, setFilterMethod] = useState<'' | 'efectivo' | 'transferencia'>('')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, startSaving] = useTransition()

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleting, startDeleting] = useTransition()

  // ── Year options ─────────────────────────────────────────────────────────
  const currentYear = now.getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  // ── Filtered payments ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const [py, pm] = p.date.split('-').map(Number)
      if (py !== filterYear || pm !== filterMonth) return false
      if (filterMethod && p.payment_method !== filterMethod) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [payments, filterMonth, filterYear, filterMethod, search])

  const total = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered])

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(p: ExtraPayment) {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description ?? '',
      amount: String(p.amount),
      payment_method: p.payment_method,
      date: p.date,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) { toast.error('Introduce un importe válido'); return }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      amount,
      payment_method: form.payment_method,
      date: form.date,
    }

    startSaving(async () => {
      try {
        if (editingId) {
          await updateExtraPayment(editingId, payload)
          setPayments((prev) =>
            prev.map((p) =>
              p.id === editingId
                ? { ...p, ...payload, description: payload.description }
                : p
            )
          )
          toast.success('Cobro actualizado')
        } else {
          await createExtraPayment(payload)
          // Re-fetch is triggered via revalidatePath; for instant UI, add a temp entry
          const tempId = crypto.randomUUID()
          const newEntry: ExtraPayment = {
            id: tempId,
            ...payload,
            description: payload.description,
            created_at: new Date().toISOString(),
          }
          setPayments((prev) => [newEntry, ...prev])
          toast.success('Cobro guardado')
        }
        closeModal()
      } catch {
        toast.error('Error al guardar el cobro')
      }
    })
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    startDeleting(async () => {
      try {
        await deleteExtraPayment(id)
        setPayments((prev) => prev.filter((p) => p.id !== id))
        toast.success('Cobro eliminado')
      } catch {
        toast.error('Error al eliminar el cobro')
      } finally {
        setDeletingId(null)
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-52 text-sm"
            />
          </div>

          {/* Month */}
          <Select
            value={String(filterMonth)}
            onValueChange={(v) => setFilterMonth(Number(v))}
          >
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select
            value={String(filterYear)}
            onValueChange={(v) => setFilterYear(Number(v))}
          >
            <SelectTrigger className="h-9 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment method filter */}
          <Select
            value={filterMethod || 'todos'}
            onValueChange={(v) => setFilterMethod(v === 'todos' ? '' : v as any)}
          >
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los métodos</SelectItem>
              <SelectItem value="efectivo">💵 Efectivo</SelectItem>
              <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* New button */}
        <Button onClick={openCreate} className="shrink-0 gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo cobro extra
        </Button>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#64748B]">
              <PlusCircle className="h-8 w-8 mb-3 opacity-30" />
              <p className="text-sm font-medium">No hay cobros para este período</p>
              <p className="text-xs mt-1">Usa el botón "Nuevo cobro extra" para añadir uno</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide hidden md:table-cell">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wide">Método</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase tracking-wide">Importe</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filtered.map((p) => (
                    deletingId === p.id ? (
                      /* ── Inline delete confirmation ── */
                      <tr key={p.id} className="bg-red-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-sm text-red-700 font-medium">
                              ¿Eliminar este cobro? Esta acción no se puede deshacer
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeletingId(null)}
                                disabled={deleting}
                              >
                                Cancelar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(p.id)}
                                disabled={deleting}
                              >
                                {deleting && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="px-4 py-3 font-medium text-[#0F172A]">{p.name}</td>
                        <td className="px-4 py-3 text-[#64748B] hidden md:table-cell">
                          {p.description || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <MethodBadge method={p.payment_method} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#0F172A] whitespace-nowrap">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(p.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Total ── */}
      {filtered.length > 0 && (
        <div className="flex justify-end">
          <div className="rounded-lg border border-[#E2E8F0] bg-white px-5 py-3 flex items-center gap-3">
            <span className="text-sm text-[#64748B]">
              Total del período ({filtered.length} cobro{filtered.length !== 1 ? 's' : ''})
            </span>
            <span className="text-lg font-bold text-[#0F172A]">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar cobro extra' : 'Nuevo cobro extra'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="ep-name">Nombre *</Label>
              <Input
                id="ep-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Ropa deportiva, Suplementos…"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="ep-desc">Descripción</Label>
              <Textarea
                id="ep-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción opcional…"
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="ep-amount">Importe (€) *</Label>
              <Input
                id="ep-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label>Método de pago *</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                  <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="ep-date">Fecha *</Label>
              <Input
                id="ep-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

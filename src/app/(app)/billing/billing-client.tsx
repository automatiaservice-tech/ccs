'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatCurrency, getStatusBadgeColor, getStatusLabel, getMonthName } from '@/lib/utils'
import { generateMonthlyInvoices, deleteInvoice } from '@/lib/actions/billing'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }))
const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

export function BillingClient({ initialInvoices }: { initialInvoices: any[] }) {
  const router = useRouter()
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genMonth, setGenMonth] = useState(String(now.getMonth() + 1))
  const [genYear, setGenYear] = useState(String(now.getFullYear()))
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = initialInvoices.filter((inv) => {
    if (filterMonth !== 'all' && inv.month !== parseInt(filterMonth)) return false
    if (filterYear !== 'all' && inv.year !== parseInt(filterYear)) return false
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false
    return true
  })

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const created = await generateMonthlyInvoices(parseInt(genMonth), parseInt(genYear))
      toast.success(`${created.length} facturas generadas para ${getMonthName(parseInt(genMonth))} ${genYear}`)
      router.refresh()
      setShowGenerateModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al generar facturas')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('¿Eliminar esta factura?')) return
    setDeletingId(id)
    try {
      await deleteInvoice(id)
      toast.success('Factura eliminada')
      router.refresh()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters + Actions */}
        <div className="space-y-3">
          {/* Button full width on mobile */}
          <Button onClick={() => setShowGenerateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Generar facturas del mes
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-24 h-9 text-xs">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Mobile: card list ── */}
        <div className="sm:hidden space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center py-10 text-[#64748B] text-sm">No se encontraron facturas</p>
          ) : (
            filtered.map((inv) => (
              <button
                key={inv.id}
                onClick={() => router.push(`/billing/${inv.id}`)}
                className="w-full text-left rounded-xl border border-[#E2E8F0] bg-white p-4 hover:border-blue-200 hover:bg-blue-50/20 transition-colors active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] truncate">{inv.clients?.name}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {getMonthName(inv.month)} {inv.year} · {inv.invoice_number || '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-[#0F172A]">{formatCurrency(inv.total_amount)}</span>
                    <Badge className={getStatusBadgeColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* ── Tablet/Desktop: table ── */}
        <div className="hidden sm:block rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase hidden md:table-cell">Nº Factura</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Período</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Total</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#64748B]">
                      No se encontraron facturas
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-[#F1F5F9] hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/billing/${inv.id}`)}
                    >
                      <td className="px-4 py-3.5 text-sm text-[#64748B] hidden md:table-cell">
                        {inv.invoice_number || `CCS-${inv.year}-???`}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-[#0F172A]">{inv.clients?.name}</p>
                        {inv.clients?.email && (
                          <p className="text-xs text-[#64748B]">{inv.clients.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {getMonthName(inv.month)} {inv.year}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={getStatusBadgeColor(inv.status)}>
                          {getStatusLabel(inv.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A]">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleDelete(inv.id, e)}
                            disabled={deletingId === inv.id}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            {deletingId === inv.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-[#64748B]">
          {filtered.length} facturas · Total: {formatCurrency(filtered.reduce((s, i) => s + i.total_amount, 0))}
        </p>
      </div>

      {/* Generate Modal */}
      <Dialog open={showGenerateModal} onOpenChange={(o) => !o && setShowGenerateModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar facturas del mes</DialogTitle>
            <DialogDescription>
              Se generarán facturas para todos los clientes activos. Las que ya existan serán omitidas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1.5">
              <Label>Mes</Label>
              <Select value={genMonth} onValueChange={setGenMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Select value={genYear} onValueChange={setGenYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowGenerateModal(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generar facturas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

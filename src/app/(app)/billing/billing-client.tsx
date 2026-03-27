'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Filter, Loader2, ChevronRight, Trash2 } from 'lucide-react'
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
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-36">
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
              <SelectTrigger className="w-28">
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
              <SelectTrigger className="w-36">
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

          <Button onClick={() => setShowGenerateModal(true)}>
            <Plus className="h-4 w-4" />
            Generar facturas del mes
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Nº Factura</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Período</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No se encontraron facturas
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/billing/${inv.id}`)}
                  >
                    <td className="px-4 py-3.5 text-sm text-slate-400">
                      {inv.invoice_number || `CCS-${inv.year}-???`}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-slate-100">{inv.clients?.name}</p>
                      {inv.clients?.email && (
                        <p className="text-xs text-slate-400">{inv.clients.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-300">
                      {getMonthName(inv.month)} {inv.year}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={getStatusBadgeColor(inv.status)}>
                        {getStatusLabel(inv.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-semibold text-slate-100">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleDelete(inv.id, e)}
                          disabled={deletingId === inv.id}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          {deletingId === inv.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
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

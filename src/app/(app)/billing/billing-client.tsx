'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, ChevronRight, Trash2, PlusCircle, AlertTriangle } from 'lucide-react'
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
import { formatCurrency, getStatusBadgeColor, getStatusLabel, getMonthName, FIXED_GROUP_RATES } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { generateMonthlyInvoices, deleteInvoice, deleteManyInvoices, updateClientBankAccount } from '@/lib/actions/billing'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }))
const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

export function BillingClient({ initialInvoices }: { initialInvoices: any[] }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const now = new Date()

  // ── Staged filters (initialized from URL) ──────────────────────────────
  const [pendingMonth, setPendingMonth] = useState(searchParams.get('mes') ?? 'all')
  const [pendingYear, setPendingYear] = useState(searchParams.get('año') ?? 'all')
  const [pendingStatus, setPendingStatus] = useState(searchParams.get('estado') ?? 'all')
  const [pendingClientType, setPendingClientType] = useState(searchParams.get('tipo') ?? 'all')
  const [pendingTarifa, setPendingTarifa] = useState(searchParams.get('tarifa') ?? 'all')

  const [activeMonth, setActiveMonth] = useState(searchParams.get('mes') ?? 'all')
  const [activeYear, setActiveYear] = useState(searchParams.get('año') ?? 'all')
  const [activeStatus, setActiveStatus] = useState(searchParams.get('estado') ?? 'all')
  const [activeClientType, setActiveClientType] = useState(searchParams.get('tipo') ?? 'all')
  const [activeTarifa, setActiveTarifa] = useState(searchParams.get('tarifa') ?? 'all')

  const buildURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'all') sp.set(k, v)
    })
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const handleApplyFilters = () => {
    setActiveMonth(pendingMonth)
    setActiveYear(pendingYear)
    setActiveStatus(pendingStatus)
    setActiveClientType(pendingClientType)
    setActiveTarifa(pendingTarifa)
    setSelectedIds(new Set())
    router.replace(buildURL({ mes: pendingMonth, año: pendingYear, estado: pendingStatus, tipo: pendingClientType, tarifa: pendingTarifa }))
  }

  const handleClearFilters = () => {
    setPendingMonth('all'); setPendingYear('all'); setPendingStatus('all')
    setPendingClientType('all'); setPendingTarifa('all')
    setActiveMonth('all'); setActiveYear('all'); setActiveStatus('all')
    setActiveClientType('all'); setActiveTarifa('all')
    setSelectedIds(new Set())
    router.replace(pathname)
  }

  const hasActiveFilters =
    activeMonth !== 'all' || activeYear !== 'all' || activeStatus !== 'all' ||
    activeClientType !== 'all' || activeTarifa !== 'all'

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Delete modal state ──────────────────────────────────────────────────
  // 'selected' = eliminar seleccionadas, 'all' = eliminar todas las filtradas
  const [deleteTarget, setDeleteTarget] = useState<'selected' | 'all' | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Other modals ────────────────────────────────────────────────────────
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [genMonth, setGenMonth] = useState(String(now.getMonth() + 1))
  const [genYear, setGenYear] = useState(String(now.getFullYear()))
  const [generating, setGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankModalClientId, setBankModalClientId] = useState<string | null>(null)
  const [bankIban, setBankIban] = useState('')
  const [savingBank, setSavingBank] = useState(false)

  const filtered = useMemo(() => initialInvoices.filter((inv) => {
    if (activeMonth !== 'all' && inv.month !== parseInt(activeMonth)) return false
    if (activeYear !== 'all' && inv.year !== parseInt(activeYear)) return false
    if (activeStatus !== 'all' && inv.status !== activeStatus) return false
    if (activeClientType !== 'all' && inv.clients?.profile_type !== activeClientType) return false
    if (activeTarifa !== 'all' && inv.clients?.monthly_fee !== parseInt(activeTarifa)) return false
    return true
  }), [initialInvoices, activeMonth, activeYear, activeStatus, activeClientType, activeTarifa])

  const filteredTotal = filtered.reduce((s: number, i: any) => s + i.total_amount, 0)

  // ── Selection helpers ───────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every((inv) => selectedIds.has(inv.id))
  const someFilteredSelected = filtered.some((inv) => selectedIds.has(inv.id))

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((inv) => next.delete(inv.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((inv) => next.add(inv.id))
        return next
      })
    }
  }

  // ── IDs and paid count for active delete operation ──────────────────────
  const idsToDelete = useMemo(() => {
    if (deleteTarget === 'selected') return [...selectedIds].filter((id) => filtered.some((inv) => inv.id === id))
    if (deleteTarget === 'all') return filtered.map((inv) => inv.id)
    return []
  }, [deleteTarget, selectedIds, filtered])

  const paidCount = useMemo(
    () => idsToDelete.filter((id) => initialInvoices.find((inv) => inv.id === id)?.status === 'paid').length,
    [idsToDelete, initialInvoices]
  )

  // ── Delete handlers ─────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (idsToDelete.length === 0) return
    setDeleting(true)
    try {
      await deleteManyInvoices(idsToDelete)
      toast.success(`${idsToDelete.length} factura${idsToDelete.length !== 1 ? 's' : ''} eliminada${idsToDelete.length !== 1 ? 's' : ''} correctamente`)
      setSelectedIds(new Set())
      setDeleteTarget(null)
      router.refresh()
    } catch {
      toast.error('Error al eliminar las facturas')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

  const handleOpenBankModal = (clientId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setBankModalClientId(clientId)
    setBankIban('')
    setShowBankModal(true)
  }

  const handleSaveBankAccount = async () => {
    if (!bankModalClientId || !bankIban.trim()) return
    setSavingBank(true)
    try {
      await updateClientBankAccount(bankModalClientId, bankIban.trim())
      toast.success('Cuenta bancaria guardada en la ficha del cliente')
      setShowBankModal(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la cuenta')
    } finally {
      setSavingBank(false)
    }
  }

  return (
    <>
      <div className="space-y-4 pb-24">
        {/* ── Top actions ── */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowGenerateModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Generar facturas del mes
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteTarget('all')}
            disabled={filtered.length === 0}
            className="w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar todas ({filtered.length})
          </Button>
        </div>

        {/* ── Filter panel ── */}
        <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/60 p-3 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Select value={pendingMonth} onValueChange={setPendingMonth}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={pendingYear} onValueChange={setPendingYear}>
              <SelectTrigger className="w-24 h-9 text-xs"><SelectValue placeholder="Año" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {YEARS.map((y) => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={pendingStatus} onValueChange={setPendingStatus}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pendingClientType} onValueChange={(v) => { setPendingClientType(v); if (v !== 'fixed_group') setPendingTarifa('all') }}>
              <SelectTrigger className="w-48 h-9 text-xs"><SelectValue placeholder="Tipo cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="fixed_group">Grupo Fijo</SelectItem>

                <SelectItem value="individual">Personal</SelectItem>
              </SelectContent>
            </Select>

            {pendingClientType === 'fixed_group' && (
              <Select value={pendingTarifa} onValueChange={setPendingTarifa}>
                <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Tarifa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tarifas</SelectItem>
                  {FIXED_GROUP_RATES.map((r) => <SelectItem key={r.label} value={String(r.value)}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="h-8 text-xs" onClick={handleApplyFilters}>
              Aplicar filtros
            </Button>
            <Button
              size="sm" variant="outline" className="h-8 text-xs"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters && pendingMonth === 'all' && pendingYear === 'all' && pendingStatus === 'all' && pendingClientType === 'all' && pendingTarifa === 'all'}
            >
              Limpiar filtros
            </Button>
            <span className="text-xs text-[#64748B] ml-auto">
              {filtered.length} facturas encontradas · Total: {formatCurrency(filteredTotal)}
            </span>
          </div>
        </div>

        {/* ── Mobile: card list ── */}
        <div className="sm:hidden space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center py-10 text-[#64748B] text-sm">No se encontraron facturas</p>
          ) : (
            filtered.map((inv) => {
              const isSelected = selectedIds.has(inv.id)
              return (
                <div
                  key={inv.id}
                  className={`rounded-xl border bg-white transition-colors ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-[#E2E8F0]'}`}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Checkbox */}
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); setSelectedIds((prev) => { const next = new Set(prev); isSelected ? next.delete(inv.id) : next.add(inv.id); return next }) }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </div>
                    {/* Card content — click navigates */}
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => router.push(`/billing/${inv.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">{inv.clients?.name}</p>
                            {inv.clients?.bank_account ? (
                              <span className="text-[10px] text-[#64748B] bg-slate-100 rounded px-1.5 py-0.5 shrink-0">
                                🏦 ****{inv.clients.bank_account.slice(-4)}
                              </span>
                            ) : inv.clients?.id ? (
                              <button
                                onClick={(e) => handleOpenBankModal(inv.clients.id, e)}
                                className="text-slate-300 hover:text-blue-400 transition-colors shrink-0"
                                title="Añadir cuenta bancaria"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            {getMonthName(inv.month)} {inv.year} · {inv.invoice_number || '—'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-sm font-bold text-[#0F172A]">{formatCurrency(inv.total_amount)}</span>
                          <div className="flex items-center gap-1">
                            {inv.status === 'paid' && inv.payment_method === 'efectivo' && <span className="text-xs">💵</span>}
                            {inv.status === 'paid' && inv.payment_method === 'transferencia' && <span className="text-xs">🏦</span>}
                            <Badge className={getStatusBadgeColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* ── Tablet/Desktop: table ── */}
        <div className="hidden sm:block rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {/* Select-all checkbox */}
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </th>
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
                    <td colSpan={7} className="text-center py-12 text-[#64748B]">
                      No se encontraron facturas
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => {
                    const isSelected = selectedIds.has(inv.id)
                    return (
                      <tr
                        key={inv.id}
                        className={`border-b border-[#F1F5F9] cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                        onClick={() => router.push(`/billing/${inv.id}`)}
                      >
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelectedIds((prev) => { const next = new Set(prev); isSelected ? next.delete(inv.id) : next.add(inv.id); return next })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#64748B] hidden md:table-cell">
                          {inv.invoice_number || `CCS-${inv.year}-???`}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#0F172A]">{inv.clients?.name}</p>
                            {inv.clients?.bank_account ? (
                              <span className="text-[10px] text-[#64748B] bg-slate-100 rounded px-1.5 py-0.5">
                                🏦 ****{inv.clients.bank_account.slice(-4)}
                              </span>
                            ) : inv.clients?.id ? (
                              <button
                                onClick={(e) => handleOpenBankModal(inv.clients.id, e)}
                                className="text-slate-300 hover:text-blue-400 transition-colors"
                                title="Añadir cuenta bancaria"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          {inv.clients?.email && (
                            <p className="text-xs text-[#64748B]">{inv.clients.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">
                          {getMonthName(inv.month)} {inv.year}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {inv.status === 'paid' && inv.payment_method === 'efectivo' && <span className="text-sm">💵</span>}
                            {inv.status === 'paid' && inv.payment_method === 'transferencia' && <span className="text-sm">🏦</span>}
                            <Badge className={getStatusBadgeColor(inv.status)}>{getStatusLabel(inv.status)}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#0F172A]">
                          {formatCurrency(inv.total_amount)}
                        </td>
                        <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleDeleteSingle(inv.id, e)}
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
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Floating action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-3 shadow-xl">
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            {selectedIds.size} factura{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteTarget('selected')}
            className="h-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar seleccionadas
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            className="h-8"
          >
            Cancelar selección
          </Button>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              {deleteTarget === 'all' ? '¿Eliminar TODAS las facturas?' : `¿Eliminar ${idsToDelete.length} factura${idsToDelete.length !== 1 ? 's' : ''}?`}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget === 'all'
                ? `Esta acción eliminará ${idsToDelete.length} factura${idsToDelete.length !== 1 ? 's' : ''} y no se puede deshacer.`
                : `¿Eliminar ${idsToDelete.length} factura${idsToDelete.length !== 1 ? 's' : ''} seleccionada${idsToDelete.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`
              }
            </DialogDescription>
          </DialogHeader>

          {paidCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mt-1">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700">
                {paidCount} de las facturas seleccionadas ya {paidCount === 1 ? 'está pagada' : 'están pagadas'}.
                ¿Deseas eliminarla{paidCount !== 1 ? 's' : ''} igualmente?
              </p>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bank Account Modal ── */}
      <Dialog open={showBankModal} onOpenChange={(o) => !o && setShowBankModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir cuenta bancaria</DialogTitle>
            <DialogDescription>
              Este dato se guardará en la ficha del cliente y estará disponible en futuras facturas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="ES91 2100 0418 4502 0005 1332"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveBankAccount()}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBankModal(false)} disabled={savingBank}>
              Cancelar
            </Button>
            <Button onClick={handleSaveBankAccount} disabled={savingBank || !bankIban.trim()}>
              {savingBank && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Generate Modal ── */}
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Año</Label>
              <Select value={genYear} onValueChange={setGenYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
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

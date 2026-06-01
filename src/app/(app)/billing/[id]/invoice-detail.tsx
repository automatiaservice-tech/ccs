'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { ArrowLeft, Download, CheckCircle, Send, Loader2, Banknote, Building2, Pencil, Trash2, Save, X, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  formatCurrency,
  formatDate,
  getMonthName,
  getStatusBadgeColor,
  getStatusLabel,
} from '@/lib/utils'
import { updateInvoiceStatus, updateClientBankAccount, updateInvoiceLines, updateInvoiceAdjustment } from '@/lib/actions/billing'

// ── Line categorisation based on description prefix ───────────────────────
function lineType(description: string): 'fixed' | 'individual' | 'variable' | 'other' {
  if (description === 'Cuota mensual fija') return 'fixed'
  if (description.startsWith('Sesión personal') || description.startsWith('Sesión individual')) return 'individual'
  if (description.startsWith('Grupo Personal Variable') || description.startsWith('Sesión grupal')) return 'variable'
  return 'other'
}

// ── Section renderer ───────────────────────────────────────────────────────
function InvoiceSection({
  title,
  lines,
  editMode,
  onDeleteLine,
}: {
  title: string
  lines: any[]
  editMode?: boolean
  onDeleteLine?: (id: string) => void
}) {
  if (lines.length === 0) return null
  const subtotal = lines.reduce((s: number, l: any) => s + l.amount, 0)

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide pt-2">{title}</p>
      <table className="w-full">
        <tbody>
          {lines.map((line: any) => (
            <tr key={line.id} className="border-b border-[#F1F5F9]">
              <td className="py-2.5 text-sm text-slate-600 w-28">{formatDate(line.date)}</td>
              <td className="py-2.5 text-sm text-slate-700 pr-4">{line.description}</td>
              {line.attendees != null ? (
                <td className="py-2.5 text-xs text-[#64748B] text-center w-24 hidden sm:table-cell">
                  {line.attendees} asist.
                </td>
              ) : (
                <td className="hidden sm:table-cell" />
              )}
              <td className="py-2.5 text-sm text-right text-[#0F172A] font-medium w-24">
                {formatCurrency(line.amount)}
              </td>
              {editMode && (
                <td className="py-2.5 w-10 text-right">
                  <button
                    onClick={() => onDeleteLine?.(line.id)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar línea"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end pt-1 pb-2">
        <span className="text-xs text-[#64748B]">
          Subtotal {title}: <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
        </span>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════

export function InvoiceDetail({ invoice, backUrl = '/billing' }: { invoice: any; backUrl?: string }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo')
  const [paymentReference, setPaymentReference] = useState('')
  const [localBankAccount, setLocalBankAccount] = useState<string | null>(invoice.clients?.bank_account ?? null)
  const [showBankModal, setShowBankModal] = useState(false)
  const [bankIban, setBankIban] = useState('')
  const [savingBank, setSavingBank] = useState(false)

  // ── Edit mode state ──────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [editLines, setEditLines] = useState<any[]>(invoice.invoice_lines || [])
  const [saving, setSaving] = useState(false)

  // ── Adjustment state ─────────────────────────────────────────────────────
  const [editingAdjustment, setEditingAdjustment] = useState(false)
  const [adjustmentInput, setAdjustmentInput] = useState(String(invoice.adjustment_amount ?? 0))
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState(invoice.adjustment_reason ?? '')
  const [savingAdjustment, setSavingAdjustment] = useState(false)

  const canEdit = invoice.status === 'draft' || invoice.status === 'sent'
  const editTotal = editLines.reduce((s: number, l: any) => s + l.amount, 0)

  // Derived totals
  const linesTotal = (invoice.invoice_lines || []).reduce((s: number, l: any) => s + l.amount, 0)
  const adjAmount = invoice.adjustment_amount || 0
  const displayLinesTotal = editMode ? editTotal : linesTotal
  const displayFinalTotal = displayLinesTotal + adjAmount

  const handleDeleteLine = (lineId: string) => {
    setEditLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      await updateInvoiceLines(invoice.id, editLines.map((l) => l.id))
      toast.success('Factura actualizada')
      router.refresh()
      setEditMode(false)
    } catch {
      toast.error('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAdjustment = async () => {
    const amount = parseFloat(adjustmentInput)
    if (isNaN(amount)) {
      toast.error('Importe de ajuste no válido')
      return
    }
    if (amount !== 0 && !adjustmentReasonInput.trim()) {
      toast.error('El motivo del ajuste es obligatorio')
      return
    }
    setSavingAdjustment(true)
    try {
      await updateInvoiceAdjustment(invoice.id, amount, adjustmentReasonInput.trim())
      toast.success('Ajuste guardado')
      router.refresh()
      setEditingAdjustment(false)
    } catch {
      toast.error('Error al guardar el ajuste')
    } finally {
      setSavingAdjustment(false)
    }
  }

  const handleCancelAdjustment = () => {
    setAdjustmentInput(String(invoice.adjustment_amount ?? 0))
    setAdjustmentReasonInput(invoice.adjustment_reason ?? '')
    setEditingAdjustment(false)
  }

  const handleCancelEdit = () => {
    setEditLines(invoice.invoice_lines || [])
    setEditMode(false)
  }

  const lastFour = localBankAccount ? localBankAccount.slice(-4) : null

  const handleStatusUpdate = async (status: 'sent' | 'paid') => {
    if (status === 'paid') {
      setShowPaymentModal(true)
      return
    }
    setUpdating(true)
    try {
      await updateInvoiceStatus(invoice.id, status)
      toast.success('Factura marcada como enviada')
      router.refresh()
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  const handleConfirmPayment = async () => {
    setUpdating(true)
    try {
      await updateInvoiceStatus(invoice.id, 'paid', paymentMethod, paymentReference)
      toast.success('Factura marcada como pagada')
      router.refresh()
      setShowPaymentModal(false)
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveBankAccount = async () => {
    if (!bankIban.trim() || !invoice.clients?.id) return
    setSavingBank(true)
    try {
      await updateClientBankAccount(invoice.clients.id, bankIban.trim())
      setLocalBankAccount(bankIban.trim())
      toast.success('Cuenta bancaria guardada en la ficha del cliente')
      setShowBankModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la cuenta')
    } finally {
      setSavingBank(false)
    }
  }

  // ── Group invoice lines by type ──────────────────────────────────────────
  const displayLines = editMode ? editLines : (invoice.invoice_lines || [])
  const fixedLines = displayLines.filter((l: any) => lineType(l.description) === 'fixed')
  const individualLines = displayLines.filter((l: any) => lineType(l.description) === 'individual')
  const variableLines = displayLines.filter((l: any) => lineType(l.description) === 'variable')
  const otherLines = displayLines.filter((l: any) => lineType(l.description) === 'other')

  const hasMultipleSections =
    [fixedLines, individualLines, variableLines, otherLines].filter((g) => g.length > 0).length > 1

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Action header ── */}
      <div className="flex items-center gap-4 no-print">
        <Button variant="ghost" size="sm" onClick={() => router.push(backUrl)} className="gap-1.5 text-slate-600">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172A]">
              {invoice.invoice_number || `Factura ${invoice.id.substring(0, 8)}`}
            </h1>
            <Badge className={getStatusBadgeColor(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
            {invoice.status === 'paid' && invoice.payment_method === 'efectivo' && (
              <span title="Pagada en efectivo" className="text-lg">💵</span>
            )}
            {invoice.status === 'paid' && invoice.payment_method === 'transferencia' && (
              <span title="Pagada por transferencia" className="text-lg">🏦</span>
            )}
          </div>
          <p className="text-[#64748B] text-sm mt-1">
            {invoice.clients?.name} · {getMonthName(invoice.month)} {invoice.year}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!editMode && (
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Imprimir / PDF
            </Button>
          )}
          {canEdit && !editMode && (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              <Pencil className="h-4 w-4" />
              Editar factura
            </Button>
          )}
          {editMode && (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cambios
              </Button>
            </>
          )}
          {!editMode && invoice.status === 'draft' && (
            <Button
              variant="secondary"
              onClick={() => handleStatusUpdate('sent')}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Marcar enviada
            </Button>
          )}
          {!editMode && invoice.status !== 'paid' && (
            <Button
              variant="success"
              onClick={() => handleStatusUpdate('paid')}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Marcar pagada
            </Button>
          )}
        </div>
      </div>

      {/* ── Edit mode warning ── */}
      {editMode && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 no-print">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            El total se actualizará al eliminar sesiones. Usa el icono <Trash2 className="h-3.5 w-3.5 inline text-red-400" /> para eliminar líneas.
          </p>
        </div>
      )}

      {/* ── Datos bancarios ── */}
      {!editMode && (
        <div className="flex items-center gap-3 no-print -mt-2">
          {localBankAccount ? (
            <>
              <span className="text-sm text-slate-500">
                🏦 Cuenta: <span className="font-medium text-slate-700">****{lastFour}</span>
              </span>
              <button
                onClick={() => { setBankIban(localBankAccount); setShowBankModal(true) }}
                className="text-xs text-blue-500 hover:text-blue-600 underline underline-offset-2"
              >
                Cambiar
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-400">Sin cuenta bancaria asociada</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setBankIban(''); setShowBankModal(true) }}
              >
                Añadir cuenta bancaria
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Invoice card (printable) ── */}
      <Card id="invoice-print">
        <CardContent className="p-8 space-y-6">
          {/* Header: logo + invoice number */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <Image
                  src="/logo.png"
                  alt="CCS Center"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2563EB]">CCS Center</h2>
                <p className="text-[#64748B] text-sm">Centro de entrenamiento personal</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#0F172A]">
                {invoice.invoice_number || 'FACTURA'}
              </p>
              <p className="text-[#64748B] text-sm">
                {getMonthName(invoice.month)} {invoice.year}
              </p>
              <p className="text-[#64748B] text-xs mt-1">
                Emitida: {formatDate(invoice.created_at)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Client info */}
          <div>
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
              Facturado a
            </p>
            <p className="text-[#0F172A] font-semibold">{invoice.clients?.name}</p>
            {invoice.clients?.email && (
              <p className="text-[#64748B] text-sm">{invoice.clients.email}</p>
            )}
            {invoice.clients?.phone && (
              <p className="text-[#64748B] text-sm">{invoice.clients.phone}</p>
            )}
            {localBankAccount && (
              <p className="text-[#64748B] text-sm">Datos bancarios: ****{lastFour}</p>
            )}
            {invoice.payment_method && (
              <p className="text-[#64748B] text-sm mt-1">
                {invoice.payment_method === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia bancaria'}
                {invoice.payment_reference && ` · Ref: ${invoice.payment_reference}`}
              </p>
            )}
          </div>

          <Separator />

          {/* ── Line items — grouped by type ── */}
          <div className="space-y-2">
            {hasMultipleSections ? (
              <>
                <InvoiceSection title="Grupo Fijo" lines={fixedLines} editMode={editMode} onDeleteLine={handleDeleteLine} />
                {(fixedLines.length > 0 && (individualLines.length > 0 || variableLines.length > 0)) && (
                  <Separator className="my-1" />
                )}
                <InvoiceSection title="Sesiones Personales" lines={individualLines} editMode={editMode} onDeleteLine={handleDeleteLine} />
                {(individualLines.length > 0 && variableLines.length > 0) && (
                  <Separator className="my-1" />
                )}
                <InvoiceSection title="Grupo Personal Variable" lines={variableLines} editMode={editMode} onDeleteLine={handleDeleteLine} />
                <InvoiceSection title="Otros" lines={otherLines} editMode={editMode} onDeleteLine={handleDeleteLine} />
              </>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-2 text-xs font-medium text-[#64748B] uppercase">Fecha</th>
                    <th className="text-left py-2 text-xs font-medium text-[#64748B] uppercase">Descripción</th>
                    <th className="text-center py-2 text-xs font-medium text-[#64748B] uppercase hidden sm:table-cell">
                      Asistentes
                    </th>
                    <th className="text-right py-2 text-xs font-medium text-[#64748B] uppercase">Importe</th>
                    {editMode && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {displayLines.map((line: any) => (
                    <tr key={line.id} className="border-b border-[#F1F5F9]">
                      <td className="py-3 text-sm text-slate-600">{formatDate(line.date)}</td>
                      <td className="py-3 text-sm text-slate-700">{line.description}</td>
                      <td className="py-3 text-sm text-center text-[#64748B] hidden sm:table-cell">
                        {line.attendees ?? '—'}
                      </td>
                      <td className="py-3 text-sm text-right text-[#0F172A] font-medium">
                        {formatCurrency(line.amount)}
                      </td>
                      {editMode && (
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteLine(line.id)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Eliminar línea"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right space-y-2">
              {adjAmount !== 0 ? (
                <>
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-[#64748B] text-sm">Subtotal original</span>
                    <span className="text-slate-700 text-sm">{formatCurrency(displayLinesTotal)}</span>
                  </div>
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-[#64748B] text-sm">
                      Ajuste{invoice.adjustment_reason ? ` (${invoice.adjustment_reason})` : ''}
                    </span>
                    <span className={`text-sm font-medium ${adjAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {adjAmount > 0 ? '+' : ''}{formatCurrency(adjAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-[#64748B] text-sm">IVA (0%)</span>
                    <span className="text-slate-700 text-sm">{formatCurrency(0)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-lg font-bold text-[#0F172A]">TOTAL A PAGAR</span>
                    <span className="text-xl font-bold text-[#2563EB]">
                      {formatCurrency(displayFinalTotal)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-[#64748B] text-sm">Base imponible</span>
                    <span className="text-slate-700 text-sm">{formatCurrency(displayLinesTotal)}</span>
                  </div>
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-[#64748B] text-sm">IVA (0%)</span>
                    <span className="text-slate-700 text-sm">{formatCurrency(0)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-8 justify-between">
                    <span className="text-lg font-bold text-[#0F172A]">TOTAL</span>
                    <span className="text-xl font-bold text-[#2563EB]">
                      {formatCurrency(displayFinalTotal)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Adjustment section ── */}
      {!editMode && (
        <div className="no-print">
          {editingAdjustment ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-[#0F172A]">Ajuste / Descuento</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Importe del ajuste</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={adjustmentInput}
                    onChange={(e) => setAdjustmentInput(e.target.value)}
                    placeholder="-10.00 para descuento, +5.00 para cargo"
                  />
                  <p className="text-xs text-[#64748B]">Negativo para descuento, positivo para cargo extra</p>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Motivo{parseFloat(adjustmentInput) !== 0 && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <Input
                    value={adjustmentReasonInput}
                    onChange={(e) => setAdjustmentReasonInput(e.target.value)}
                    placeholder="Ej: Descuento por pago anticipado"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelAdjustment} disabled={savingAdjustment}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveAdjustment} disabled={savingAdjustment}>
                  {savingAdjustment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar ajuste
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              {adjAmount !== 0 ? (
                <>
                  <span className="text-sm text-slate-600">
                    ⚠️ Ajuste aplicado:{' '}
                    <span className={`font-medium ${adjAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {adjAmount > 0 ? '+' : ''}{formatCurrency(adjAmount)}
                    </span>
                    {invoice.adjustment_reason && (
                      <span className="text-slate-400"> — {invoice.adjustment_reason}</span>
                    )}
                  </span>
                  {invoice.status !== 'paid' && (
                    <button
                      onClick={() => setEditingAdjustment(true)}
                      className="text-xs text-blue-500 hover:text-blue-600 underline underline-offset-2"
                    >
                      Modificar
                    </button>
                  )}
                </>
              ) : (
                invoice.status !== 'paid' && (
                  <Button variant="outline" size="sm" onClick={() => setEditingAdjustment(true)}>
                    <Pencil className="h-4 w-4" />
                    Añadir ajuste / descuento
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print {
            position: absolute; left: 0; top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          #invoice-print h2 { color: #1d4ed8 !important; }
          #invoice-print p, #invoice-print td, #invoice-print th, #invoice-print span {
            color: #374151 !important;
          }
          #invoice-print .text-\\[\\#2563EB\\] { color: #1d4ed8 !important; }
        }
      `}</style>

      {/* Bank account modal */}
      <Dialog open={showBankModal} onOpenChange={(o) => !o && setShowBankModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{localBankAccount ? 'Cambiar cuenta bancaria' : 'Añadir cuenta bancaria'}</DialogTitle>
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

      {/* Payment method modal */}
      <Dialog open={showPaymentModal} onOpenChange={(o) => !o && setShowPaymentModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago</DialogTitle>
            <DialogDescription>
              Selecciona el método de pago para {invoice.clients?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('efectivo')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  paymentMethod === 'efectivo'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-[#E2E8F0] hover:border-blue-200'
                }`}
              >
                <Banknote className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium text-slate-700">💵 Efectivo</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transferencia')}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                  paymentMethod === 'transferencia'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-[#E2E8F0] hover:border-blue-200'
                }`}
              >
                <Building2 className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">🏦 Transferencia</span>
              </button>
            </div>
            {paymentMethod === 'transferencia' && localBankAccount && (
              <p className="text-sm text-[#64748B] rounded-lg bg-slate-50 border border-[#E2E8F0] px-3 py-2">
                Cuenta del cliente: ****{lastFour}
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Referencia / Nota (opcional)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Referencia de transferencia, nota..."
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={updating}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPayment} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

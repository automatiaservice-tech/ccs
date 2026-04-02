'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { ArrowLeft, Download, CheckCircle, Send, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  formatCurrency,
  formatDate,
  getMonthName,
  getStatusBadgeColor,
  getStatusLabel,
} from '@/lib/utils'
import { updateInvoiceStatus } from '@/lib/actions/billing'

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
}: {
  title: string
  lines: any[]
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

export function InvoiceDetail({ invoice }: { invoice: any }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  const handleStatusUpdate = async (status: 'sent' | 'paid') => {
    setUpdating(true)
    try {
      await updateInvoiceStatus(invoice.id, status)
      toast.success(
        status === 'paid' ? 'Factura marcada como pagada' : 'Factura marcada como enviada'
      )
      router.refresh()
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  // ── Group invoice lines by type ──────────────────────────────────────────
  const allLines: any[] = invoice.invoice_lines || []
  const fixedLines = allLines.filter((l) => lineType(l.description) === 'fixed')
  const individualLines = allLines.filter((l) => lineType(l.description) === 'individual')
  const variableLines = allLines.filter((l) => lineType(l.description) === 'variable')
  const otherLines = allLines.filter((l) => lineType(l.description) === 'other')

  const hasMultipleSections =
    [fixedLines, individualLines, variableLines, otherLines].filter((g) => g.length > 0).length > 1

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Action header ── */}
      <div className="flex items-center gap-4 no-print">
        <Link href="/billing">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172A]">
              {invoice.invoice_number || `Factura ${invoice.id.substring(0, 8)}`}
            </h1>
            <Badge className={getStatusBadgeColor(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="text-[#64748B] text-sm mt-1">
            {invoice.clients?.name} · {getMonthName(invoice.month)} {invoice.year}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4" />
            Imprimir / PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button
              variant="secondary"
              onClick={() => handleStatusUpdate('sent')}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Marcar enviada
            </Button>
          )}
          {invoice.status !== 'paid' && (
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
          </div>

          <Separator />

          {/* ── Line items — grouped by type ── */}
          <div className="space-y-2">
            {hasMultipleSections ? (
              // Multiple section mode
              <>
                <InvoiceSection title="Grupo Fijo" lines={fixedLines} />
                {(fixedLines.length > 0 && (individualLines.length > 0 || variableLines.length > 0)) && (
                  <Separator className="my-1" />
                )}
                <InvoiceSection title="Sesiones Personales" lines={individualLines} />
                {(individualLines.length > 0 && variableLines.length > 0) && (
                  <Separator className="my-1" />
                )}
                <InvoiceSection title="Grupo Personal Variable" lines={variableLines} />
                <InvoiceSection title="Otros" lines={otherLines} />
              </>
            ) : (
              // Single section — plain table without section header
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-2 text-xs font-medium text-[#64748B] uppercase">Fecha</th>
                    <th className="text-left py-2 text-xs font-medium text-[#64748B] uppercase">Descripción</th>
                    <th className="text-center py-2 text-xs font-medium text-[#64748B] uppercase hidden sm:table-cell">
                      Asistentes
                    </th>
                    <th className="text-right py-2 text-xs font-medium text-[#64748B] uppercase">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {allLines.map((line: any) => (
                    <tr key={line.id} className="border-b border-[#F1F5F9]">
                      <td className="py-3 text-sm text-slate-600">{formatDate(line.date)}</td>
                      <td className="py-3 text-sm text-slate-700">{line.description}</td>
                      <td className="py-3 text-sm text-center text-[#64748B] hidden sm:table-cell">
                        {line.attendees ?? '—'}
                      </td>
                      <td className="py-3 text-sm text-right text-[#0F172A] font-medium">
                        {formatCurrency(line.amount)}
                      </td>
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
              <div className="flex items-center gap-8 justify-between">
                <span className="text-[#64748B] text-sm">Base imponible</span>
                <span className="text-slate-700 text-sm">{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex items-center gap-8 justify-between">
                <span className="text-[#64748B] text-sm">IVA (0%)</span>
                <span className="text-slate-700 text-sm">{formatCurrency(0)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center gap-8 justify-between">
                <span className="text-lg font-bold text-[#0F172A]">TOTAL</span>
                <span className="text-xl font-bold text-[#2563EB]">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}

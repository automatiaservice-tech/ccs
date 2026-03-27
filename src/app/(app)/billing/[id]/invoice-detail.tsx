'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Download, CheckCircle, Send, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate, getMonthName, getStatusBadgeColor, getStatusLabel } from '@/lib/utils'
import { updateInvoiceStatus } from '@/lib/actions/billing'

export function InvoiceDetail({ invoice }: { invoice: any }) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  const handleStatusUpdate = async (status: 'sent' | 'paid') => {
    setUpdating(true)
    try {
      await updateInvoiceStatus(invoice.id, status)
      toast.success(status === 'paid' ? 'Factura marcada como pagada' : 'Factura marcada como enviada')
      router.refresh()
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">
              {invoice.invoice_number || `Factura ${invoice.id.substring(0, 8)}`}
            </h1>
            <Badge className={getStatusBadgeColor(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            {invoice.clients?.name} · {getMonthName(invoice.month)} {invoice.year}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="h-4 w-4" />
            Imprimir / PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button variant="secondary" onClick={() => handleStatusUpdate('sent')} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Marcar enviada
            </Button>
          )}
          {invoice.status !== 'paid' && (
            <Button variant="success" onClick={() => handleStatusUpdate('paid')} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Marcar pagada
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Card */}
      <Card id="invoice-print">
        <CardContent className="p-8 space-y-6">
          {/* Header info */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-blue-400">CCS Center</h2>
              <p className="text-slate-400 text-sm mt-1">Centro de entrenamiento personal</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-100">
                {invoice.invoice_number || 'FACTURA'}
              </p>
              <p className="text-slate-400 text-sm">
                {getMonthName(invoice.month)} {invoice.year}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Emitida: {formatDate(invoice.created_at)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Client info */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Facturado a</p>
            <p className="text-slate-100 font-semibold">{invoice.clients?.name}</p>
            {invoice.clients?.email && <p className="text-slate-400 text-sm">{invoice.clients.email}</p>}
            {invoice.clients?.phone && <p className="text-slate-400 text-sm">{invoice.clients.phone}</p>}
          </div>

          <Separator />

          {/* Lines */}
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-xs font-medium text-slate-400 uppercase">Fecha</th>
                  <th className="text-left py-2 text-xs font-medium text-slate-400 uppercase">Descripción</th>
                  <th className="text-center py-2 text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">
                    Asistentes
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-slate-400 uppercase">Importe</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_lines?.map((line: any) => (
                  <tr key={line.id} className="border-b border-slate-700/50">
                    <td className="py-3 text-sm text-slate-300">{formatDate(line.date)}</td>
                    <td className="py-3 text-sm text-slate-200">{line.description}</td>
                    <td className="py-3 text-sm text-center text-slate-400 hidden sm:table-cell">
                      {line.attendees || '—'}
                    </td>
                    <td className="py-3 text-sm text-right text-slate-100 font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-end">
            <div className="text-right space-y-2">
              <div className="flex items-center gap-8 justify-between">
                <span className="text-slate-400 text-sm">Base imponible</span>
                <span className="text-slate-200 text-sm">{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex items-center gap-8 justify-between">
                <span className="text-slate-400 text-sm">IVA (0%)</span>
                <span className="text-slate-200 text-sm">{formatCurrency(0)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center gap-8 justify-between">
                <span className="text-lg font-bold text-slate-100">TOTAL</span>
                <span className="text-xl font-bold text-blue-400">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  )
}

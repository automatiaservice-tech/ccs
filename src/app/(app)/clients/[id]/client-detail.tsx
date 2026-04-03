'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, Receipt } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  formatCurrency,
  formatDate,
  getProfileTypeLabel,
  getProfileTypeBadgeColor,
  getStatusBadgeColor,
  getStatusLabel,
  getMonthName,
  calculateAge,
} from '@/lib/utils'
import { updateClientAction, toggleClientActive } from '@/lib/actions/clients'
import { generateClientInvoice } from '@/lib/actions/billing'
import type { Client } from '@/lib/supabase/database.types'

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: getMonthName(i + 1) }))
const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i
  return { value: String(y), label: String(y) }
})

function formatEnrollmentDate(date: string | null): string | null {
  if (!date) return null
  const d = new Date(date + 'T00:00:00')
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClientDetailProps {
  client: Client
  attendance: any[]
  invoices: any[]
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ClientDetail({ client, attendance, invoices }: ClientDetailProps) {
  const router = useRouter()
  const now = new Date()

  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  // Parse existing enrollment_date into month/year strings
  const existingEnrollment = client.enrollment_date
    ? (() => {
        const d = new Date(client.enrollment_date + 'T00:00:00')
        return { month: String(d.getMonth() + 1), year: String(d.getFullYear()) }
      })()
    : { month: '', year: '' }

  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone || '',
    email: client.email || '',
    monthly_fee: client.monthly_fee?.toString() || '',
    notes: client.notes || '',
    birth_date: client.birth_date || '',
    gender: (client.gender || '') as string,
    enrollment_month: existingEnrollment.month,
    enrollment_year: existingEnrollment.year,
  })

  // Invoice generation modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [genMonth, setGenMonth] = useState(String(now.getMonth() + 1))
  const [genYear, setGenYear] = useState(String(now.getFullYear()))
  const [generating, setGenerating] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const enrollmentDate =
        form.enrollment_month && form.enrollment_year
          ? `${form.enrollment_year}-${form.enrollment_month.padStart(2, '0')}-01`
          : null

      // Ensure birth_date is in YYYY-MM-DD format
      const birthDate = form.birth_date
        ? new Date(form.birth_date).toISOString().split('T')[0]
        : null

      await updateClientAction(client.id, {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
        notes: form.notes || null,
        birth_date: birthDate,
        gender: (form.gender || null) as any,
        enrollment_date: enrollmentDate,
      })
      toast.success('Datos actualizados correctamente')
      router.refresh()
    } catch (err: any) {
      console.error('[ClientDetail] Error saving client:', err)
      toast.error(err?.message || 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (checked: boolean) => {
    setToggling(true)
    try {
      await toggleClientActive(client.id, checked)
      toast.success(checked ? 'Cliente activado' : 'Cliente desactivado')
      router.refresh()
    } catch {
      toast.error('Error al cambiar el estado')
    } finally {
      setToggling(false)
    }
  }

  const handleGenerateInvoice = async () => {
    setGenerating(true)
    try {
      const inv = await generateClientInvoice(client.id, parseInt(genMonth), parseInt(genYear))
      toast.success(`Factura ${inv.invoice_number} generada`)
      router.refresh()
      setShowInvoiceModal(false)
      router.push(`/billing/${inv.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Error al generar la factura')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0F172A]">{client.name}</h1>
            <Badge className={getProfileTypeBadgeColor(client.profile_type)}>
              {getProfileTypeLabel(client.profile_type)}
            </Badge>
            <Badge
              className={
                client.active
                  ? 'bg-green-50 text-green-600 border-green-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }
            >
              {client.active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-[#64748B] text-sm mt-1">
            {client.enrollment_date
              ? `Miembro desde: ${formatEnrollmentDate(client.enrollment_date)}`
              : `Cliente desde ${formatDate(client.created_at)}`}
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B]">{client.active ? 'Activo' : 'Inactivo'}</span>
          <Switch
            checked={client.active}
            onCheckedChange={handleToggleActive}
            disabled={toggling}
          />
        </div>
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos">Datos personales</TabsTrigger>
          <TabsTrigger value="asistencia">
            Asistencia ({attendance.length})
          </TabsTrigger>
          <TabsTrigger value="facturas">
            Facturas ({invoices.length})
          </TabsTrigger>
        </TabsList>

        {/* Datos personales */}
        <TabsContent value="datos">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="600 123 456"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de perfil</Label>
                  <Input value={getProfileTypeLabel(client.profile_type)} disabled />
                </div>

                <div className="space-y-1.5">
                  <Label>Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm((p) => ({ ...p, birth_date: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {form.birth_date && (
                    <p className="text-xs text-[#64748B]">
                      Edad: {calculateAge(form.birth_date)} años
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Sexo</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <Label>Fecha de inscripción</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={form.enrollment_month}
                      onValueChange={(v) => setForm((p) => ({ ...p, enrollment_month: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((m, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={form.enrollment_year}
                      onValueChange={(v) => setForm((p) => ({ ...p, enrollment_year: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Año" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {client.profile_type === 'fixed_group' && (
                  <div className="space-y-1.5">
                    <Label>Tarifa mensual (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.monthly_fee}
                      onChange={(e) => setForm((p) => ({ ...p, monthly_fee: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  placeholder="Observaciones..."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial de asistencia */}
        <TabsContent value="asistencia">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Sesión</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Asistencia</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-[#64748B] text-sm">
                        Sin registros de asistencia
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record.id} className="border-b border-[#F1F5F9]">
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.sessions?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              record.attended
                                ? 'bg-green-50 text-green-600 border-green-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }
                          >
                            {record.attended ? 'Asistió' : 'Faltó'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">
                          {record.attended ? formatCurrency(record.cost_per_person) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial de facturas */}
        <TabsContent value="facturas">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => setShowInvoiceModal(true)} variant="outline" size="sm">
                <Receipt className="h-4 w-4" />
                Generar factura
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Período</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Nº Factura</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Estado</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-[#64748B] uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-[#64748B] text-sm">
                          Sin facturas generadas
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="border-b border-[#F1F5F9]">
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {getMonthName(inv.month)} {inv.year}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748B]">
                            {inv.invoice_number || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusBadgeColor(inv.status)}>
                              {getStatusLabel(inv.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-[#0F172A]">
                            {formatCurrency(inv.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/billing/${inv.id}`}>
                              <Button variant="ghost" size="sm">Ver</Button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Generate Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={(o) => !o && setShowInvoiceModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar factura — {client.name}</DialogTitle>
            <DialogDescription>
              Se generará la factura del período seleccionado con las sesiones a las que asistió
              {client.profile_type === 'fixed_group' ? ' (cuota mensual fija)' : ''}.
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
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateInvoice} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Generar factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

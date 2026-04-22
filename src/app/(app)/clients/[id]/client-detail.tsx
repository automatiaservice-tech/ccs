'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save, Receipt, Trash2, AlertTriangle } from 'lucide-react'
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
  FIXED_GROUP_RATES,
  getFixedGroupRateLabel,
} from '@/lib/utils'
import { updateClientAction, toggleClientActive, deleteClientAction } from '@/lib/actions/clients'
import { updateClientWhatsApp } from '@/lib/actions/whatsapp'
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
  const [togglingWa, setTogglingWa] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    profile_type: client.profile_type,
    bank_account: client.bank_account || '',
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

      const monthlyFee = form.profile_type === 'fixed_group'
        ? (form.monthly_fee ? parseFloat(form.monthly_fee) : null)
        : null

      await updateClientAction(client.id, {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        profile_type: form.profile_type,
        monthly_fee: monthlyFee,
        notes: form.notes || null,
        birth_date: birthDate,
        gender: (form.gender || null) as any,
        enrollment_date: enrollmentDate,
        bank_account: form.bank_account || null,
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

  const handleToggleWhatsApp = async (checked: boolean) => {
    setTogglingWa(true)
    try {
      await updateClientWhatsApp(client.id, checked)
      toast.success(checked ? 'Recordatorios WhatsApp activados' : 'Recordatorios WhatsApp desactivados')
      router.refresh()
    } catch {
      toast.error('Error al cambiar la configuración de WhatsApp')
    } finally {
      setTogglingWa(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteClientAction(client.id)
      toast.success('Cliente eliminado correctamente')
      router.push('/clients')
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar el cliente')
      setDeleting(false)
      setShowDeleteModal(false)
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
                  <Select
                    value={form.profile_type}
                    onValueChange={(v) => {
                      const next = v as typeof form.profile_type
                      setForm((p) => ({
                        ...p,
                        profile_type: next,
                        monthly_fee: next !== 'fixed_group' ? '' : p.monthly_fee,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_group">Grupo Fijo</SelectItem>
                      <SelectItem value="variable_group">Grupo Personal Variable</SelectItem>
                      <SelectItem value="individual">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.profile_type !== client.profile_type && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Cambiar el tipo de cliente puede afectar a las sesiones asignadas y a la facturación futura
                    </p>
                  )}
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

                {form.profile_type === 'fixed_group' && (
                  <div className="space-y-1.5">
                    <Label>Tarifa mensual</Label>
                    <Select
                      value={form.monthly_fee}
                      onValueChange={(v) => setForm((p) => ({ ...p, monthly_fee: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tarifa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FIXED_GROUP_RATES.map((r) => (
                          <SelectItem key={r.value} value={String(r.value)}>
                            {r.label} — {formatCurrency(r.value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.monthly_fee && (
                      <p className="text-xs text-[#64748B]">
                        {getFixedGroupRateLabel(parseFloat(form.monthly_fee))}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Cuenta bancaria (IBAN)</Label>
                <Input
                  value={form.bank_account}
                  onChange={(e) => setForm((p) => ({ ...p, bank_account: e.target.value }))}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
                {form.bank_account && form.bank_account.length >= 4 && (
                  <p className="text-xs text-[#64748B]">
                    Guardado: ****{form.bank_account.slice(-4)}
                  </p>
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

              {/* WhatsApp toggle */}
              <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Recordatorios por WhatsApp</p>
                  <p className="text-xs text-[#64748B]">
                    {client.phone
                      ? `Se enviarán a ${client.phone}`
                      : 'Sin teléfono — añade un número para recibir recordatorios'}
                  </p>
                </div>
                <Switch
                  checked={client.whatsapp_enabled ?? true}
                  onCheckedChange={handleToggleWhatsApp}
                  disabled={togglingWa || !client.phone}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </Button>
              </div>

              <div className="border-t border-red-100 pt-4 mt-2">
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar cliente
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

      {/* Delete Client Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(o) => !deleting && setShowDeleteModal(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cliente?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a <strong>{client.name}</strong>? Esta acción no se puede
              deshacer y eliminará también todo su historial de asistencia y facturas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formatCurrency,
  formatDate,
  getProfileTypeLabel,
  getProfileTypeBadgeColor,
  getStatusBadgeColor,
  getStatusLabel,
} from '@/lib/utils'
import { updateClientAction, toggleClientActive } from '@/lib/actions/clients'
import type { Client } from '@/lib/supabase/database.types'

interface ClientDetailProps {
  client: Client
  attendance: any[]
  invoices: any[]
}

export function ClientDetail({ client, attendance, invoices }: ClientDetailProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone || '',
    email: client.email || '',
    monthly_fee: client.monthly_fee?.toString() || '',
    notes: client.notes || '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateClientAction(client.id, {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
        notes: form.notes || null,
      })
      toast.success('Datos actualizados correctamente')
      router.refresh()
    } catch {
      toast.error('Error al guardar los cambios')
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-100">{client.name}</h1>
            <Badge className={getProfileTypeBadgeColor(client.profile_type)}>
              {getProfileTypeLabel(client.profile_type)}
            </Badge>
            <Badge
              className={
                client.active
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
              }
            >
              {client.active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Cliente desde {formatDate(client.created_at)}
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{client.active ? 'Activo' : 'Inactivo'}</span>
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
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Sesión</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Asistencia</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Coste</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400 text-sm">
                        Sin registros de asistencia
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record.id} className="border-b border-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-300">{formatDate(record.date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{record.sessions?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              record.attended
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }
                          >
                            {record.attended ? 'Asistió' : 'Faltó'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-300">
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
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Período</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Estado</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Total</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400 text-sm">
                        Sin facturas generadas
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => {
                      const monthNames = [
                        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                      ]
                      return (
                        <tr key={inv.id} className="border-b border-slate-700/50">
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {monthNames[inv.month - 1]} {inv.year}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getStatusBadgeColor(inv.status)}>
                              {getStatusLabel(inv.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-100">
                            {formatCurrency(inv.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/billing/${inv.id}`}>
                              <Button variant="ghost" size="sm">Ver</Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

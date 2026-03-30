'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Calendar, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, getDayName } from '@/lib/utils'
import { createClientAction } from '@/lib/actions/clients'
import { getSessions } from '@/lib/actions/sessions'

const SESSION_TYPE_BADGE: Record<string, string> = {
  fixed_group: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  variable_group: 'bg-green-500/20 text-green-400 border-green-500/30',
  individual: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  fixed_group: 'Grupo Fijo',
  variable_group: 'Grupo Variable',
  individual: 'Individual',
}

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface NewClientModalProps {
  open: boolean
  onClose: () => void
}

export function NewClientModal({ open, onClose }: NewClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profile_type: '' as any,
    monthly_fee: '',
    notes: '',
    session_ids: [] as string[],
  })
  const router = useRouter()

  useEffect(() => {
    if (open) {
      getSessions().then(setSessions).catch(console.error)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.profile_type) {
      toast.error('El nombre y el tipo de perfil son obligatorios')
      return
    }
    setLoading(true)
    try {
      const client = await createClientAction({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        profile_type: formData.profile_type,
        monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : undefined,
        notes: formData.notes,
        session_ids: formData.session_ids,
      })
      toast.success(`Cliente "${client.name}" creado correctamente`)
      router.refresh()
      onClose()
      resetForm()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      profile_type: '' as any,
      monthly_fee: '',
      notes: '',
      session_ids: [],
    })
  }

  const toggleSession = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      session_ids: prev.session_ids.includes(id)
        ? prev.session_ids.filter((s) => s !== id)
        : [...prev.session_ids, id],
    }))
  }

  // When profile_type changes, clear session selection
  const handleProfileTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, profile_type: value as any, session_ids: [] }))
  }

  // Sessions grouped by day for better display
  const sessionsByDay = useMemo(() => {
    const byDay: Record<number, any[]> = {}
    for (const s of sessions) {
      if (!byDay[s.day_of_week]) byDay[s.day_of_week] = []
      byDay[s.day_of_week].push(s)
    }
    return byDay
  }, [sessions])

  // Frequency = number of unique days per week in selected sessions
  const selectedSessions = sessions.filter((s) => formData.session_ids.includes(s.id))
  const uniqueDays = new Set(selectedSessions.map((s) => s.day_of_week))
  const frequencyText =
    formData.session_ids.length > 0
      ? `${formData.session_ids.length} sesión${formData.session_ids.length > 1 ? 'es' : ''} / semana · ${uniqueDays.size} día${uniqueDays.size > 1 ? 's' : ''}`
      : null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* ── Personal data ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Juan García"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="600 123 456"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="juan@email.com"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Tipo de cliente *</Label>
              <Select value={formData.profile_type} onValueChange={handleProfileTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_group">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      Grupo Fijo — cuota mensual fija
                    </div>
                  </SelectItem>
                  <SelectItem value="variable_group">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      Grupo Variable — pago por sesión
                    </div>
                  </SelectItem>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      Individual — sesiones personales
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.profile_type === 'fixed_group' && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="monthly_fee">Tarifa mensual (€)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_fee}
                  onChange={(e) => setFormData((p) => ({ ...p, monthly_fee: e.target.value }))}
                  placeholder="50.00"
                />
              </div>
            )}
          </div>

          {/* ── Session assignment ── */}
          {sessions.length > 0 && formData.profile_type && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Asignar a sesiones
                </Label>
                {frequencyText && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {frequencyText}
                  </span>
                )}
              </div>

              <div className="rounded-lg border border-slate-600 divide-y divide-slate-700/50 max-h-52 overflow-y-auto">
                {Object.keys(sessionsByDay).sort((a, b) => Number(a) - Number(b)).map((dayStr) => {
                  const day = parseInt(dayStr)
                  const daySessions = sessionsByDay[day].sort((a: any, b: any) =>
                    a.time.localeCompare(b.time)
                  )
                  return (
                    <div key={day} className="px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                        {DAYS_SHORT[day]}
                      </p>
                      <div className="space-y-1">
                        {daySessions.map((s: any) => {
                          const isSelected = formData.session_ids.includes(s.id)
                          return (
                            <label
                              key={s.id}
                              className={cn(
                                'flex items-center gap-2.5 cursor-pointer p-1.5 rounded-md transition-colors',
                                isSelected ? 'bg-blue-500/10' : 'hover:bg-slate-700/40'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSession(s.id)}
                                className="rounded border-slate-500 text-blue-600 h-4 w-4"
                              />
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm text-slate-200 truncate">{s.name}</span>
                                <span className="text-xs text-slate-400 shrink-0">
                                  {s.time?.substring(0, 5)}
                                </span>
                                <Badge
                                  className={cn(
                                    'text-[9px] px-1 py-0 shrink-0',
                                    SESSION_TYPE_BADGE[s.session_type]
                                  )}
                                >
                                  {SESSION_TYPE_LABELS[s.session_type]}
                                </Badge>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {formData.session_ids.length > 0 && (
                <p className="text-xs text-blue-400">
                  ✓ {formData.session_ids.length} sesión{formData.session_ids.length > 1 ? 'es' : ''} seleccionada{formData.session_ids.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Observaciones, lesiones, preferencias..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

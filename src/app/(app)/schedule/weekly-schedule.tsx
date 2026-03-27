'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Users, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, getDayName } from '@/lib/utils'
import {
  createSessionAction,
  updateSessionAction,
  deleteSessionAction,
} from '@/lib/actions/sessions'

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const SESSION_TYPE_COLORS: Record<string, string> = {
  fixed_group: 'border-l-blue-500 bg-blue-500/10',
  variable_group: 'border-l-green-500 bg-green-500/10',
  individual: 'border-l-orange-500 bg-orange-500/10',
}
const SESSION_TYPE_BADGE: Record<string, string> = {
  fixed_group: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  variable_group: 'bg-green-500/20 text-green-400 border-green-500/30',
  individual: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}
const SESSION_TYPE_LABELS: Record<string, string> = {
  fixed_group: 'Fijo',
  variable_group: 'Variable',
  individual: 'Individual',
}

interface Session {
  id: string
  name: string
  day_of_week: number
  time: string
  session_type: string
  max_capacity: number | null
  session_clients?: { clients?: any }[]
}

export function WeeklySchedule({ initialSessions }: { initialSessions: Session[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    day_of_week: '0',
    time: '09:00',
    session_type: 'fixed_group',
    max_capacity: '',
  })

  const openCreate = () => {
    setEditSession(null)
    setForm({ name: '', day_of_week: '0', time: '09:00', session_type: 'fixed_group', max_capacity: '' })
    setShowModal(true)
  }

  const openEdit = (session: Session) => {
    setEditSession(session)
    setForm({
      name: session.name,
      day_of_week: String(session.day_of_week),
      time: session.time.substring(0, 5),
      session_type: session.session_type,
      max_capacity: session.max_capacity?.toString() || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        name: form.name,
        day_of_week: parseInt(form.day_of_week),
        time: form.time + ':00',
        session_type: form.session_type as any,
        max_capacity: form.max_capacity ? parseInt(form.max_capacity) : undefined,
      }

      if (editSession) {
        await updateSessionAction(editSession.id, data)
        toast.success('Sesión actualizada')
      } else {
        await createSessionAction(data)
        toast.success('Sesión creada')
      }
      router.refresh()
      setShowModal(false)
    } catch {
      toast.error('Error al guardar la sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sesión? Se perderán todos los registros de asistencia asociados.')) return
    setDeleting(id)
    try {
      await deleteSessionAction(id)
      toast.success('Sesión eliminada')
      router.refresh()
    } catch {
      toast.error('Error al eliminar la sesión')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva sesión
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-slate-400">Grupo Fijo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-slate-400">Grupo Variable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-orange-500" />
          <span className="text-slate-400">Individual</span>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((day) => {
          const daySessions = initialSessions
            .filter((s) => s.day_of_week === day)
            .sort((a, b) => a.time.localeCompare(b.time))

          return (
            <div key={day} className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wide py-2 border-b border-slate-700">
                {getDayName(day).substring(0, 3)}
              </h3>
              <div className="space-y-2 min-h-24">
                {daySessions.length === 0 ? (
                  <p className="text-center text-slate-600 text-xs py-4">—</p>
                ) : (
                  daySessions.map((s) => {
                    const clientCount = s.session_clients?.length || 0
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          'rounded-lg border-l-4 p-2.5 border border-slate-700',
                          SESSION_TYPE_COLORS[s.session_type]
                        )}
                      >
                        <p className="text-xs font-semibold text-slate-100 leading-tight">{s.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{s.time.substring(0, 5)}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Badge className={cn('text-[10px] px-1.5 py-0', SESSION_TYPE_BADGE[s.session_type])}>
                            {SESSION_TYPE_LABELS[s.session_type]}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Users className="h-3 w-3" />
                            <span className="text-[10px]">{clientCount}</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEdit(s)}
                              className="p-0.5 text-slate-500 hover:text-blue-400 transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              disabled={deleting === s.id}
                              className="p-0.5 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            >
                              {deleting === s.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSession ? 'Editar sesión' : 'Nueva sesión'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nombre de la sesión</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Lunes 10:00 - Grupo Variables"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Día</Label>
                <Select value={form.day_of_week} onValueChange={(v) => setForm((p) => ({ ...p, day_of_week: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>{getDayName(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.session_type} onValueChange={(v) => setForm((p) => ({ ...p, session_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_group">Grupo Fijo</SelectItem>
                    <SelectItem value="variable_group">Grupo Variable</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Capacidad máx.</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_capacity}
                  onChange={(e) => setForm((p) => ({ ...p, max_capacity: e.target.value }))}
                  placeholder="Sin límite"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editSession ? 'Guardar cambios' : 'Crear sesión'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2, CheckCircle, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { formatDate } from '@/lib/utils'
import {
  createAbsenceAction,
  resolveAbsenceAction,
  deleteAbsenceAction,
} from '@/lib/actions/absences'

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface Session {
  id: string
  name: string
  day_of_week: number
  time: string
}

interface Absence {
  id: string
  session_id: string
  date: string
  notes: string | null
  status: 'pendiente' | 'devuelta' | 'recuperada'
  resolution_date: string | null
  resolution_notes: string | null
  created_at: string
  sessions: Session | null
}

function StatusBadge({ status }: { status: Absence['status'] }) {
  if (status === 'pendiente') {
    return (
      <Badge className="bg-red-100 text-red-700 border-red-300">
        Pendiente
      </Badge>
    )
  }
  if (status === 'devuelta') {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        Devuelta / Descontada
      </Badge>
    )
  }
  return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
      Recuperada
    </Badge>
  )
}

interface AbsencesClientProps {
  absences: Absence[]
  sessions: Session[]
  initialSessionId?: string
}

export function AbsencesClient({ absences, sessions, initialSessionId }: AbsencesClientProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  // ── New absence modal ────────────────────────────────────────────────────
  const [showNewModal, setShowNewModal] = useState(!!initialSessionId)
  const [newForm, setNewForm] = useState({
    session_id: initialSessionId || '',
    date: today,
    notes: '',
  })
  const [creating, setCreating] = useState(false)

  // If initialSessionId changes (first render), open modal with it pre-filled
  useEffect(() => {
    if (initialSessionId) {
      setNewForm((p) => ({ ...p, session_id: initialSessionId }))
      setShowNewModal(true)
    }
  }, [initialSessionId])

  const handleCreate = async () => {
    if (!newForm.session_id || !newForm.date) {
      toast.error('Sesión y fecha son obligatorias')
      return
    }
    setCreating(true)
    try {
      await createAbsenceAction({
        session_id: newForm.session_id,
        date: newForm.date,
        notes: newForm.notes,
      })
      toast.success('Ausencia registrada correctamente')
      setShowNewModal(false)
      setNewForm({ session_id: '', date: today, notes: '' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar la ausencia')
    } finally {
      setCreating(false)
    }
  }

  // ── Resolve modal ────────────────────────────────────────────────────────
  const [resolveTarget, setResolveTarget] = useState<{
    id: string
    mode: 'devuelta' | 'recuperada'
  } | null>(null)
  const [resolveForm, setResolveForm] = useState({ resolution_date: today, resolution_notes: '' })
  const [resolving, setResolving] = useState(false)

  const openResolve = (id: string, mode: 'devuelta' | 'recuperada') => {
    setResolveTarget({ id, mode })
    setResolveForm({ resolution_date: today, resolution_notes: '' })
  }

  const handleResolve = async () => {
    if (!resolveTarget) return
    setResolving(true)
    try {
      await resolveAbsenceAction(
        resolveTarget.id,
        resolveTarget.mode,
        resolveForm.resolution_date,
        resolveForm.resolution_notes
      )
      toast.success(
        resolveTarget.mode === 'devuelta'
          ? 'Ausencia marcada como devuelta/descontada'
          : 'Ausencia marcada como recuperada'
      )
      setResolveTarget(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar la ausencia')
    } finally {
      setResolving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de ausencia?')) return
    try {
      await deleteAbsenceAction(id)
      toast.success('Ausencia eliminada')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    }
  }

  // ── Summary counts ───────────────────────────────────────────────────────
  const pending = absences.filter((a) => a.status === 'pendiente').length
  const resolved = absences.filter((a) => a.status !== 'pendiente').length

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{pending}</p>
              <p className="text-xs text-[#64748B]">Pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{resolved}</p>
              <p className="text-xs text-[#64748B]">Resueltas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Register button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4" />
          Registrar ausencia del entrenador
        </Button>
      </div>

      {/* Absences table */}
      <Card>
        <CardContent className="p-0">
          {absences.length === 0 ? (
            <p className="text-center py-12 text-[#64748B] text-sm">
              No hay ausencias registradas
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Sesión</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase hidden sm:table-cell">Motivo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase hidden md:table-cell">Resolución</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((absence) => (
                    <tr key={absence.id} className="border-b border-[#F1F5F9]">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(absence.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <p className="font-medium">{absence.sessions?.name || '—'}</p>
                        {absence.sessions && (
                          <p className="text-xs text-[#64748B]">
                            {DAYS_SHORT[absence.sessions.day_of_week]} · {absence.sessions.time.substring(0, 5)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell max-w-xs">
                        <p className="truncate">{absence.notes || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={absence.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                        {absence.resolution_date ? (
                          <div>
                            <p>{formatDate(absence.resolution_date)}</p>
                            {absence.resolution_notes && (
                              <p className="text-xs text-[#64748B] truncate max-w-xs">{absence.resolution_notes}</p>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {absence.status === 'pendiente' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => openResolve(absence.id, 'devuelta')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Devuelta
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                                onClick={() => openResolve(absence.id, 'recuperada')}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Recuperada
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-500 h-7 w-7 p-0"
                            onClick={() => handleDelete(absence.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── New Absence Modal ── */}
      <Dialog open={showNewModal} onOpenChange={(o) => !o && setShowNewModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ausencia del entrenador</DialogTitle>
            <DialogDescription>
              Selecciona la sesión afectada, la fecha y el motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Sesión *</Label>
              <Select
                value={newForm.session_id}
                onValueChange={(v) => setNewForm((p) => ({ ...p, session_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sesión..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {DAYS_SHORT[s.day_of_week]} {s.time.substring(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={newForm.date}
                onChange={(e) => setNewForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo / Nota (opcional)</Label>
              <Textarea
                value={newForm.notes}
                onChange={(e) => setNewForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Causa de la ausencia..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewModal(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar ausencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Resolve Modal ── */}
      <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resolveTarget?.mode === 'devuelta'
                ? 'Marcar como devuelta / descontada'
                : 'Marcar como recuperada'}
            </DialogTitle>
            <DialogDescription>
              Indica la fecha de resolución y una nota opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Fecha de resolución *</Label>
              <Input
                type="date"
                value={resolveForm.resolution_date}
                onChange={(e) => setResolveForm((p) => ({ ...p, resolution_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nota (opcional)</Label>
              <Textarea
                value={resolveForm.resolution_notes}
                onChange={(e) => setResolveForm((p) => ({ ...p, resolution_notes: e.target.value }))}
                placeholder="Detalles de la resolución..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setResolveTarget(null)} disabled={resolving}>
              Cancelar
            </Button>
            <Button onClick={handleResolve} disabled={resolving}>
              {resolving && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

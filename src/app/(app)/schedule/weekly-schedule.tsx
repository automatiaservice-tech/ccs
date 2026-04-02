'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Users, Pencil, Trash2, Loader2, Search, UserMinus, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn, getDayName, PROFILE_TYPE_LABELS } from '@/lib/utils'
import {
  createSessionAction,
  updateSessionAction,
  deleteSessionAction,
  updateSessionClients,
} from '@/lib/actions/sessions'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

const SESSION_TYPE_COLORS: Record<string, string> = {
  fixed_group: 'border-l-blue-500 bg-blue-50 hover:bg-blue-100',
  variable_group: 'border-l-green-500 bg-green-50 hover:bg-green-100',
  individual: 'border-l-orange-500 bg-orange-50 hover:bg-orange-100',
}

const SESSION_TYPE_BADGE: Record<string, string> = {
  fixed_group: 'bg-blue-50 text-blue-600 border-blue-200',
  variable_group: 'bg-green-50 text-green-600 border-green-200',
  individual: 'bg-orange-50 text-orange-600 border-orange-200',
}

const SESSION_TYPE_LABELS = PROFILE_TYPE_LABELS

const TYPE_DOT: Record<string, string> = {
  fixed_group: 'bg-blue-500',
  variable_group: 'bg-green-500',
  individual: 'bg-orange-500',
}

interface Client {
  id: string
  name: string
  active: boolean
  profile_type: string
}

interface Session {
  id: string
  name: string
  day_of_week: number
  time: string
  session_type: string
  max_capacity: number | null
  session_clients?: Array<{
    client_id: string
    clients?: Client
  }>
}

const emptyForm = {
  name: '',
  day_of_week: '0',
  time: '09:00',
  session_type: 'fixed_group',
  max_capacity: '',
}

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function todayDayIndex() {
  const js = new Date().getDay() // 0=Sun
  return js === 0 ? 6 : js - 1 // Convert to 0=Mon…6=Sun
}

export function WeeklySchedule({
  initialSessions,
  allClients,
}: {
  initialSessions: Session[]
  allClients: Client[]
}) {
  const router = useRouter()

  // ── Mobile: single-day navigation ───────────────────────────────────────
  const [mobileDay, setMobileDay] = useState(todayDayIndex)

  // ── Create / Edit form modal ────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formLoading, setFormLoading] = useState(false)

  // ── Session detail modal (participants + info) ──────────────────────────
  const [detailSession, setDetailSession] = useState<Session | null>(null)
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [participantSearch, setParticipantSearch] = useState('')
  const [savingParticipants, setSavingParticipants] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  // ── Open create form ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditSession(null)
    setForm(emptyForm)
    setShowFormModal(true)
  }

  // ── Open detail panel (click on card) ──────────────────────────────────
  const openDetail = (session: Session) => {
    setDetailSession(session)
    setParticipantIds(session.session_clients?.map((sc) => sc.client_id) || [])
    setParticipantSearch('')
  }

  // ── Open edit form from detail panel ───────────────────────────────────
  const openEditForm = (session: Session) => {
    setDetailSession(null)
    setEditSession(session)
    setForm({
      name: session.name,
      day_of_week: String(session.day_of_week),
      time: session.time.substring(0, 5),
      session_type: session.session_type,
      max_capacity: session.max_capacity?.toString() || '',
    })
    setShowFormModal(true)
  }

  // ── Submit create/edit form ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
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
      setShowFormModal(false)
    } catch {
      toast.error('Error al guardar la sesión')
    } finally {
      setFormLoading(false)
    }
  }

  // ── Delete session ──────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta sesión? Se perderán todos los registros de asistencia asociados.')) return
    setDeleting(id)
    try {
      await deleteSessionAction(id)
      toast.success('Sesión eliminada')
      setDetailSession(null)
      router.refresh()
    } catch {
      toast.error('Error al eliminar la sesión')
    } finally {
      setDeleting(null)
    }
  }

  // ── Save participants ───────────────────────────────────────────────────
  const handleSaveParticipants = async () => {
    if (!detailSession) return
    setSavingParticipants(true)
    try {
      await updateSessionClients(detailSession.id, participantIds)
      toast.success('Participantes actualizados')
      router.refresh()
      setDetailSession(null)
    } catch {
      toast.error('Error al actualizar participantes')
    } finally {
      setSavingParticipants(false)
    }
  }

  const toggleParticipant = (clientId: string) => {
    setParticipantIds((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    )
  }

  // ── Filtered client lists ───────────────────────────────────────────────
  const currentParticipants = useMemo(
    () => allClients.filter((c) => participantIds.includes(c.id)),
    [allClients, participantIds]
  )

  const availableClients = useMemo(() => {
    const search = participantSearch.toLowerCase()
    return allClients.filter(
      (c) => !participantIds.includes(c.id) && c.name.toLowerCase().includes(search)
    )
  }, [allClients, participantIds, participantSearch])

  return (
    <>
      <div className="flex justify-end mb-2">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nueva sesión
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-[#64748B]">Grupo Fijo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span className="text-[#64748B]">Grupo Personal Variable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded bg-orange-500" />
          <span className="text-[#64748B]">Personal</span>
        </div>
        <span className="text-slate-400 text-[10px] self-center">· Toca una sesión para ver participantes</span>
      </div>

      {/* ── Mobile: single-day navigation (hidden sm+) ── */}
      <div className="sm:hidden space-y-3">
        {/* Day picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileDay((d) => (d + 6) % 7)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 gap-1 justify-center">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => setMobileDay(d)}
                className={cn(
                  'flex-1 h-9 rounded-lg text-xs font-semibold transition-colors',
                  mobileDay === d
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                )}
              >
                {DAYS_SHORT[d]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMobileDay((d) => (d + 1) % 7)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Selected day label */}
        <h3 className="text-sm font-semibold text-slate-700">{getDayName(mobileDay)}</h3>

        {/* Sessions for selected day */}
        <div className="space-y-2">
          {initialSessions
            .filter((s) => s.day_of_week === mobileDay)
            .sort((a, b) => a.time.localeCompare(b.time))
            .length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Sin sesiones este día</p>
          ) : (
            initialSessions
              .filter((s) => s.day_of_week === mobileDay)
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((s) => {
                const clientCount = s.session_clients?.length || 0
                return (
                  <button
                    key={s.id}
                    onClick={() => openDetail(s)}
                    className={cn(
                      'w-full text-left rounded-xl border-l-4 p-4 border border-[#E2E8F0] cursor-pointer transition-all active:scale-[0.98]',
                      SESSION_TYPE_COLORS[s.session_type]
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{s.name}</p>
                        <p className="text-sm text-[#64748B] mt-1">{s.time.substring(0, 5)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge className={cn('text-[10px] px-1.5 py-0', SESSION_TYPE_BADGE[s.session_type])}>
                          {SESSION_TYPE_LABELS[s.session_type]}
                        </Badge>
                        <div className="flex items-center gap-1 text-[#64748B]">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-xs">{clientCount}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
          )}
        </div>
      </div>

      {/* ── Desktop: 7-column weekly grid (hidden on mobile) ── */}
      <div className="hidden sm:block overflow-x-auto -mx-4 md:mx-0 pb-2">
        <div className="grid grid-cols-7 gap-2 md:gap-3 min-w-[560px] px-4 md:px-0">
          {DAYS.map((day) => {
            const daySessions = initialSessions
              .filter((s) => s.day_of_week === day)
              .sort((a, b) => a.time.localeCompare(b.time))

            return (
              <div key={day} className="space-y-2">
                <h3 className="text-xs font-semibold text-[#64748B] text-center uppercase tracking-wide py-2 border-b border-[#E2E8F0]">
                  {getDayName(day).substring(0, 3)}
                </h3>
                <div className="space-y-2 min-h-24">
                  {daySessions.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-4">—</p>
                  ) : (
                    daySessions.map((s) => {
                      const clientCount = s.session_clients?.length || 0
                      return (
                        <button
                          key={s.id}
                          onClick={() => openDetail(s)}
                          className={cn(
                            'w-full text-left rounded-lg border-l-4 p-2.5 border border-[#E2E8F0] cursor-pointer transition-all active:scale-95',
                            SESSION_TYPE_COLORS[s.session_type]
                          )}
                        >
                          <p className="text-xs font-semibold text-slate-900 leading-tight break-words hyphens-auto">
                            {s.name}
                          </p>
                          <p className="text-xs text-[#64748B] mt-1">{s.time.substring(0, 5)}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Badge className={cn('text-[10px] px-1.5 py-0', SESSION_TYPE_BADGE[s.session_type])}>
                              {SESSION_TYPE_LABELS[s.session_type]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-[#64748B]">
                            <Users className="h-3 w-3" />
                            <span className="text-[10px]">{clientCount}</span>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Session Detail Modal ─────────────────────────────────────────── */}
      <Dialog open={!!detailSession} onOpenChange={(o) => !o && setDetailSession(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailSession && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 rounded-full shrink-0', TYPE_DOT[detailSession.session_type])} />
                  <span className="truncate">{detailSession.name}</span>
                </DialogTitle>
                <p className="text-[#64748B] text-sm">
                  {getDayName(detailSession.day_of_week)} · {detailSession.time.substring(0, 5)} ·{' '}
                  {SESSION_TYPE_LABELS[detailSession.session_type]}
                  {detailSession.max_capacity ? ` · Máx. ${detailSession.max_capacity}` : ''}
                </p>
              </DialogHeader>

              <Tabs defaultValue="participantes" className="mt-1">
                <TabsList className="w-full">
                  <TabsTrigger value="participantes" className="flex-1">
                    Participantes ({participantIds.length})
                  </TabsTrigger>
                  <TabsTrigger value="detalles" className="flex-1">
                    Detalles
                  </TabsTrigger>
                </TabsList>

                {/* ── Participants tab ──────────────────────────────── */}
                <TabsContent value="participantes" className="space-y-3 mt-3">
                  {/* Assigned clients */}
                  {currentParticipants.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                        Asignados ({currentParticipants.length})
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {currentParticipants.map((client) => (
                          <div
                            key={client.id}
                            className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-800 truncate">{client.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {SESSION_TYPE_LABELS[client.profile_type] || client.profile_type}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleParticipant(client.id)}
                              className="ml-3 shrink-0 p-1 text-red-400 hover:text-red-600 transition-colors"
                              title="Quitar de sesión"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add clients */}
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">
                      Añadir cliente
                    </p>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                      <Input
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        placeholder="Buscar cliente..."
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto rounded-lg border border-[#E2E8F0]">
                      {availableClients.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">
                          {participantSearch
                            ? 'Sin resultados'
                            : 'Todos los clientes ya están asignados'}
                        </p>
                      ) : (
                        availableClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => toggleParticipant(client.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b border-[#F1F5F9] last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-800 truncate">{client.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {SESSION_TYPE_LABELS[client.profile_type] || client.profile_type}
                              </p>
                            </div>
                            <UserPlus className="h-4 w-4 text-blue-500 shrink-0 ml-2" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1" onClick={() => setDetailSession(null)}>
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={handleSaveParticipants} disabled={savingParticipants}>
                      {savingParticipants && <Loader2 className="h-4 w-4 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </TabsContent>

                {/* ── Details tab ───────────────────────────────────── */}
                <TabsContent value="detalles" className="mt-3 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg bg-slate-50 border border-[#E2E8F0] p-3">
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Tipo</p>
                      <p className="text-slate-800 font-medium mt-0.5">
                        {SESSION_TYPE_LABELS[detailSession.session_type]}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-[#E2E8F0] p-3">
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Capacidad</p>
                      <p className="text-slate-800 font-medium mt-0.5">
                        {detailSession.max_capacity ? `${detailSession.max_capacity} personas` : 'Sin límite'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-[#E2E8F0] p-3">
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Día</p>
                      <p className="text-slate-800 font-medium mt-0.5">
                        {getDayName(detailSession.day_of_week)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-[#E2E8F0] p-3">
                      <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Hora</p>
                      <p className="text-slate-800 font-medium mt-0.5">
                        {detailSession.time.substring(0, 5)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditForm(detailSession)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar sesión
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(detailSession.id)}
                      disabled={deleting === detailSession.id}
                      size="icon"
                    >
                      {deleting === detailSession.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit Form Modal ─────────────────────────────────────── */}
      <Dialog open={showFormModal} onOpenChange={(o) => !o && setShowFormModal(false)}>
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
                placeholder="Ej: Lunes 10:00 — Grupo Variables"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Día</Label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(v) => setForm((p) => ({ ...p, day_of_week: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {getDayName(d)}
                      </SelectItem>
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
                <Select
                  value={form.session_type}
                  onValueChange={(v) => setForm((p) => ({ ...p, session_type: v }))}
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
              <Button type="button" variant="outline" onClick={() => setShowFormModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editSession ? 'Guardar cambios' : 'Crear sesión'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

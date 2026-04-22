'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Users, Pencil, Trash2, Loader2, Search, UserMinus, UserPlus, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
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
import { cn, getDayName, PROFILE_TYPE_LABELS, getProfileTypeBadgeColor, getFixedGroupRateLabel } from '@/lib/utils'
import {
  createSessionAction,
  updateSessionAction,
  deleteSessionAction,
  updateSessionClients,
} from '@/lib/actions/sessions'

// ── Price helpers ─────────────────────────────────────────────────────────────
// Convert our day convention (0=Mon…6=Sun) to JS Date.getDay() (0=Sun…6=Sat)
function toJsDay(ourDay: number): number {
  return ourDay === 6 ? 0 : ourDay + 1
}

function countOccurrencesInCurrentMonth(dayOfWeek: number): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const jsDay = toJsDay(dayOfWeek)
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === jsDay) count++
  }
  return count
}

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
  monthly_fee?: number | null
}

interface Session {
  id: string
  name: string
  day_of_week: number
  time: string
  session_type: string
  max_capacity: number | null
  session_price: number | null
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
  session_price: '40',
}

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function todayDayIndex() {
  const js = new Date().getDay() // 0=Sun
  return js === 0 ? 6 : js - 1 // Convert to 0=Mon…6=Sun
}

// ── Session price display helpers ─────────────────────────────────────────────
function SessionPriceLine({ session }: { session: Session }) {
  const clientCount = session.session_clients?.length || 0
  if (clientCount === 0) return null

  if (session.session_type === 'individual') {
    const price = session.session_price ?? 40
    const perPerson = Math.round((price / clientCount) * 100) / 100
    return (
      <p className="text-xs text-orange-600 mt-1">
        💶 {perPerson.toFixed(2).replace('.', ',')}€/persona ({clientCount} participante{clientCount !== 1 ? 's' : ''})
      </p>
    )
  }

  if (session.session_type === 'fixed_group') {
    const occurrences = countOccurrencesInCurrentMonth(session.day_of_week)
    let total = 0
    for (const sc of session.session_clients || []) {
      const fee = sc.clients?.monthly_fee
      if (fee) total += Math.round((fee / occurrences) * 100) / 100
    }
    if (total === 0) return null
    return (
      <p className="text-xs text-blue-600 mt-1">
        💶 Total sesión: {total.toFixed(2).replace('.', ',')}€
      </p>
    )
  }

  return null
}

// ── Reusable day session list ─────────────────────────────────────────────────
function DaySessionList({
  sessions,
  onOpen,
}: {
  sessions: Session[]
  onOpen: (s: Session) => void
}) {
  if (sessions.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-8">Sin sesiones este día</p>
  }
  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const clientCount = s.session_clients?.length || 0
        return (
          <button
            key={s.id}
            onClick={() => onOpen(s)}
            className={cn(
              'w-full text-left rounded-xl border-l-4 p-4 border border-[#E2E8F0] cursor-pointer transition-all active:scale-[0.98]',
              SESSION_TYPE_COLORS[s.session_type]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-tight">{s.name}</p>
                <p className="text-sm text-[#64748B] mt-1">{s.time.substring(0, 5)}</p>
                <SessionPriceLine session={s} />
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
      })}
    </div>
  )
}

// ── Day navigation (shared between mobile and desktop day-view) ───────────────
function DayNav({
  day,
  onPrev,
  onNext,
  onSelect,
}: {
  day: number
  onPrev: () => void
  onNext: () => void
  onSelect: (d: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex flex-1 gap-1 justify-center">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => onSelect(d)}
            className={cn(
              'flex-1 h-9 rounded-lg text-xs font-semibold transition-colors',
              day === d
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            )}
          >
            {DAYS_SHORT[d]}
          </button>
        ))}
      </div>
      <button
        onClick={onNext}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

// ── Individual session price editor ──────────────────────────────────────────
function IndividualPriceEditor({
  session,
  participantCount,
  onSaved,
}: {
  session: Session
  participantCount: number
  onSaved: () => void
}) {
  const [price, setPrice] = useState(String(session.session_price ?? 40))
  const [saving, setSaving] = useState(false)

  const priceNum = parseFloat(price) || 0
  const perPerson = participantCount > 0 ? Math.round((priceNum / participantCount) * 100) / 100 : priceNum

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSessionAction(session.id, { session_price: priceNum } as any)
      toast.success('Precio actualizado')
      onSaved()
    } catch {
      toast.error('Error al guardar el precio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-[#E2E8F0] p-3 space-y-2 bg-orange-50/40">
      <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-semibold">Precio por sesión</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 h-8 text-sm"
        />
        <span className="text-sm text-slate-500">€</span>
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 ml-auto">
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          Guardar
        </Button>
      </div>
      {participantCount > 0 && (
        <p className="text-xs text-orange-600">
          💶 {perPerson.toFixed(2).replace('.', ',')}€/persona ({participantCount} participante{participantCount !== 1 ? 's' : ''})
        </p>
      )}
    </div>
  )
}

// ── Fixed group cost breakdown ────────────────────────────────────────────────
function FixedGroupCostBreakdown({
  session,
  participants,
}: {
  session: Session
  participants: Client[]
}) {
  const occurrences = countOccurrencesInCurrentMonth(session.day_of_week)
  const rows = participants.map((c) => {
    const fee = c.monthly_fee || 0
    const costPerSession = fee > 0 ? Math.round((fee / occurrences) * 100) / 100 : 0
    return { client: c, fee, costPerSession }
  })
  const total = rows.reduce((s, r) => s + r.costPerSession, 0)

  return (
    <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
      <p className="text-[10px] text-[#64748B] uppercase tracking-wide font-semibold px-3 py-2 bg-slate-50 border-b border-[#E2E8F0]">
        💶 Coste por sesión — mes actual ({occurrences} sesiones)
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
            <th className="text-left px-3 py-2 text-[10px] text-[#64748B] uppercase font-medium">Cliente</th>
            <th className="text-left px-3 py-2 text-[10px] text-[#64748B] uppercase font-medium">Tarifa</th>
            <th className="text-right px-3 py-2 text-[10px] text-[#64748B] uppercase font-medium">€/sesión</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ client, fee, costPerSession }) => (
            <tr key={client.id} className="border-b border-[#F1F5F9]">
              <td className="px-3 py-2 text-slate-800">{client.name}</td>
              <td className="px-3 py-2 text-[#64748B] text-xs">{getFixedGroupRateLabel(fee)}</td>
              <td className="px-3 py-2 text-right text-slate-700 font-medium">
                {costPerSession.toFixed(2).replace('.', ',')}€
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#E2E8F0] bg-blue-50/50">
            <td className="px-3 py-2 font-semibold text-slate-800">Total</td>
            <td />
            <td className="px-3 py-2 text-right font-bold text-blue-700">
              {total.toFixed(2).replace('.', ',')}€
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function WeeklySchedule({
  initialSessions,
  allClients,
}: {
  initialSessions: Session[]
  allClients: Client[]
}) {
  const router = useRouter()

  // ── Shared day navigation state (mobile + desktop day-view) ─────────────────
  const [activeDay, setActiveDay] = useState(todayDayIndex)

  // ── Desktop view toggle — persisted in localStorage ─────────────────────────
  const [desktopView, setDesktopView] = useState<'grid' | 'day'>('grid')
  useEffect(() => {
    const saved = localStorage.getItem('schedule-desktop-view')
    if (saved === 'grid' || saved === 'day') setDesktopView(saved)
  }, [])
  const switchDesktopView = (v: 'grid' | 'day') => {
    setDesktopView(v)
    localStorage.setItem('schedule-desktop-view', v)
  }

  // ── Create / Edit form modal ─────────────────────────────────────────────────
  const [showFormModal, setShowFormModal] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formLoading, setFormLoading] = useState(false)

  // ── Session detail modal (participants + info) ───────────────────────────────
  const [detailSession, setDetailSession] = useState<Session | null>(null)
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [participantSearch, setParticipantSearch] = useState('')
  const [savingParticipants, setSavingParticipants] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  const openCreate = () => {
    setEditSession(null)
    setForm(emptyForm)
    setShowFormModal(true)
  }

  const openDetail = (session: Session) => {
    setDetailSession(session)
    setParticipantIds(session.session_clients?.map((sc) => sc.client_id) || [])
    setParticipantSearch('')
  }

  const openEditForm = (session: Session) => {
    setDetailSession(null)
    setEditSession(session)
    setForm({
      name: session.name,
      day_of_week: String(session.day_of_week),
      time: session.time.substring(0, 5),
      session_type: session.session_type,
      max_capacity: session.max_capacity?.toString() || '',
      session_price: (session.session_price ?? 40).toString(),
    })
    setShowFormModal(true)
  }

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
        session_price: form.session_price ? parseFloat(form.session_price) : 40,
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

  const currentParticipants = useMemo(
    () => allClients.filter((c) => participantIds.includes(c.id)),
    [allClients, participantIds]
  )

  const availableClients = useMemo(() => {
    const search = participantSearch.toLowerCase()
    return allClients.filter(
      (c) =>
        !participantIds.includes(c.id) &&
        c.name.toLowerCase().includes(search) &&
        c.profile_type === detailSession?.session_type
    )
  }, [allClients, participantIds, participantSearch, detailSession])

  const activeDaySessions = useMemo(
    () =>
      initialSessions
        .filter((s) => s.day_of_week === activeDay)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [initialSessions, activeDay]
  )

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Desktop view toggle — hidden on mobile */}
        <div className="hidden sm:flex items-center rounded-lg border border-[#E2E8F0] p-0.5 gap-0.5 bg-slate-50">
          <button
            onClick={() => switchDesktopView('grid')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              desktopView === 'grid'
                ? 'bg-white shadow-sm text-slate-800 border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Vista Semanal
          </button>
          <button
            onClick={() => switchDesktopView('day')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              desktopView === 'day'
                ? 'bg-white shadow-sm text-slate-800 border border-[#E2E8F0]'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <List className="h-3.5 w-3.5" />
            Vista por Día
          </button>
        </div>

        <Button onClick={openCreate} className="ml-auto">
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

      {/* ── Mobile: single-day navigation (hidden sm+) ─────────────────────── */}
      <div className="sm:hidden space-y-3">
        <DayNav
          day={activeDay}
          onPrev={() => setActiveDay((d) => (d + 6) % 7)}
          onNext={() => setActiveDay((d) => (d + 1) % 7)}
          onSelect={setActiveDay}
        />
        <h3 className="text-sm font-semibold text-slate-700">{getDayName(activeDay)}</h3>
        <DaySessionList sessions={activeDaySessions} onOpen={openDetail} />
      </div>

      {/* ── Desktop: grid view ──────────────────────────────────────────────── */}
      {desktopView === 'grid' && (
        <div className="hidden sm:block overflow-x-auto pb-2">
          <div
            className="grid gap-2 md:gap-3"
            style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
          >
            {DAYS.map((day) => {
              const daySessions = initialSessions
                .filter((s) => s.day_of_week === day)
                .sort((a, b) => a.time.localeCompare(b.time))

              return (
                <div key={day} className="flex flex-col gap-2 min-w-0">
                  <h3 className="text-xs font-semibold text-[#64748B] text-center uppercase tracking-wide py-2 border-b border-[#E2E8F0]">
                    {getDayName(day).substring(0, 3)}
                  </h3>
                  <div className="flex flex-col gap-2">
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
                              'w-full text-left rounded-lg border-l-4 p-2.5 border border-[#E2E8F0] cursor-pointer transition-all hover:shadow-sm active:scale-95',
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
                            {clientCount > 0 && s.session_type === 'individual' && (
                              <p className="text-[10px] text-orange-600 mt-1 leading-tight">
                                💶 {(Math.round(((s.session_price ?? 40) / clientCount) * 100) / 100).toFixed(2).replace('.', ',')}€/p
                              </p>
                            )}
                            {clientCount > 0 && s.session_type === 'fixed_group' && (() => {
                              const occ = countOccurrencesInCurrentMonth(s.day_of_week)
                              const total = (s.session_clients || []).reduce((sum, sc) => {
                                const fee = sc.clients?.monthly_fee
                                return sum + (fee ? Math.round((fee / occ) * 100) / 100 : 0)
                              }, 0)
                              return total > 0 ? (
                                <p className="text-[10px] text-blue-600 mt-1 leading-tight">
                                  💶 {total.toFixed(2).replace('.', ',')}€
                                </p>
                              ) : null
                            })()}
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
      )}

      {/* ── Desktop: day-list view ──────────────────────────────────────────── */}
      {desktopView === 'day' && (
        <div className="hidden sm:block space-y-3">
          <DayNav
            day={activeDay}
            onPrev={() => setActiveDay((d) => (d + 6) % 7)}
            onNext={() => setActiveDay((d) => (d + 1) % 7)}
            onSelect={setActiveDay}
          />
          <h3 className="text-base font-semibold text-slate-700">{getDayName(activeDay)}</h3>
          <div className="max-w-xl">
            <DaySessionList sessions={activeDaySessions} onOpen={openDetail} />
          </div>
        </div>
      )}

      {/* ── Session Detail Modal ─────────────────────────────────────────────── */}
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
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm text-slate-800 truncate">{client.name}</p>
                              <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', getProfileTypeBadgeColor(client.profile_type))}>
                                {SESSION_TYPE_LABELS[client.profile_type] || client.profile_type}
                              </Badge>
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
                            : allClients.filter((c) => c.profile_type === detailSession?.session_type).length === 0
                              ? `No hay clientes de tipo ${SESSION_TYPE_LABELS[detailSession?.session_type ?? ''] ?? ''} registrados`
                              : 'Todos los clientes de este tipo ya están asignados'}
                        </p>
                      ) : (
                        availableClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => toggleParticipant(client.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors border-b border-[#F1F5F9] last:border-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm text-slate-800 truncate">{client.name}</p>
                              <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', getProfileTypeBadgeColor(client.profile_type))}>
                                {SESSION_TYPE_LABELS[client.profile_type] || client.profile_type}
                              </Badge>
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

                  {/* ── Precio (Individual) ── */}
                  {detailSession.session_type === 'individual' && (
                    <IndividualPriceEditor
                      session={detailSession}
                      participantCount={participantIds.length}
                      onSaved={() => router.refresh()}
                    />
                  )}

                  {/* ── Desglose coste (Grupo Fijo) ── */}
                  {detailSession.session_type === 'fixed_group' && currentParticipants.length > 0 && (
                    <FixedGroupCostBreakdown
                      session={detailSession}
                      participants={currentParticipants}
                    />
                  )}

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

      {/* ── Create / Edit Form Modal ──────────────────────────────────────────── */}
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
            {form.session_type === 'individual' && (
              <div className="space-y-1.5">
                <Label>Precio por sesión (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.session_price}
                  onChange={(e) => setForm((p) => ({ ...p, session_price: e.target.value }))}
                  placeholder="40"
                />
                <p className="text-xs text-[#64748B]">
                  Precio total de la sesión. Se divide entre los participantes asignados.
                </p>
              </div>
            )}
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

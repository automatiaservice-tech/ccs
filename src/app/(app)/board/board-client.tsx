'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X, Search, RotateCcw, Loader2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  cn,
  PROFILE_TYPE_LABELS,
  getClientAvatarColor,
  getClientTariffBadge,
  getInitial,
} from '@/lib/utils'
import type { Session } from '@/lib/supabase/database.types'
import {
  moveBoardParticipant,
  addBoardParticipant,
  removeBoardParticipant,
  resetBoardDay,
} from '@/lib/actions/board'

const DAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE']

const SESSION_TYPE_BADGE: Record<string, string> = {
  fixed_group: 'bg-blue-50 text-blue-600 border-blue-200',
  individual: 'bg-orange-50 text-orange-600 border-orange-200',
}

interface Client {
  id: string
  name: string
  active: boolean
  profile_type: string
  rate_id?: string | null
}

type Assignment = { session_id: string; client_id: string; date: string }

function formatDayDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

// ── Draggable participant card ─────────────────────────────────────────────
function ParticipantCard({
  client,
  sessionId,
  dragging,
  justMoved,
  onDragStart,
  onDragEnd,
  onRemove,
}: {
  client: Client
  sessionId: string
  dragging: boolean
  justMoved: boolean
  onDragStart: (e: React.DragEvent, clientId: string, sessionId: string) => void
  onDragEnd: () => void
  onRemove: (clientId: string) => void
}) {
  const tariffBadge = getClientTariffBadge(client.profile_type, client.rate_id)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, client.id, sessionId)}
      onDragEnd={onDragEnd}
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-lg border border-[#E2E8F0] bg-slate-50 px-2 py-2.5 text-center cursor-grab active:cursor-grabbing select-none transition-all duration-300',
        dragging && 'opacity-30 scale-95',
        justMoved && 'ring-2 ring-blue-400 scale-105 bg-blue-50'
      )}
      title="Arrastra para mover a otra sesión"
    >
      <button
        onClick={() => onRemove(client.id)}
        className="absolute top-1 right-1 p-0.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Quitar de esta sesión"
      >
        <X className="h-3 w-3" />
      </button>
      <div
        className={cn(
          'h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 pointer-events-none',
          getClientAvatarColor(client.profile_type, client.rate_id)
        )}
      >
        {getInitial(client.name)}
      </div>
      <p className="text-[11px] leading-tight text-slate-800 line-clamp-2 px-0.5 pointer-events-none" title={client.name}>
        {client.name}
      </p>
      <Badge className={cn('text-[9px] px-1 py-0 leading-tight pointer-events-none', tariffBadge.colorClass)}>
        {tariffBadge.label}
      </Badge>
    </div>
  )
}

// ── Add-participant inline search ──────────────────────────────────────────
function AddParticipantPanel({
  candidates,
  onAdd,
  onClose,
}: {
  candidates: Client[]
  onAdd: (clientId: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return candidates.filter((c) => c.name.toLowerCase().includes(q))
  }, [candidates, search])

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-2 space-y-2 shadow-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="pl-8 h-8 text-xs"
        />
      </div>
      <div className="max-h-36 overflow-y-auto space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">Sin resultados</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onAdd(c.id)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-xs hover:bg-slate-50 transition-colors"
            >
              <span className="truncate text-slate-700">{c.name}</span>
              <Plus className="h-3.5 w-3.5 text-blue-500 shrink-0 ml-2" />
            </button>
          ))
        )}
      </div>
      <button
        onClick={onClose}
        className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cerrar
      </button>
    </div>
  )
}

export function BoardClient({
  dates,
  sessions,
  initialAssignments,
  allClients,
  defaultDayIndex,
}: {
  dates: string[]
  sessions: Session[]
  initialAssignments: Assignment[]
  allClients: Client[]
  defaultDayIndex: number
}) {
  const router = useRouter()
  const [activeDay, setActiveDay] = useState(defaultDayIndex)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(null)
  const [justMovedKey, setJustMovedKey] = useState<string | null>(null)
  const [addingToSessionId, setAddingToSessionId] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const clientsById = useMemo(
    () => new Map(allClients.map((c) => [c.id, c])),
    [allClients]
  )

  const activeDate = dates[activeDay]

  const daySessions = useMemo(
    () =>
      sessions
        .filter((s) => s.day_of_week === activeDay)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [sessions, activeDay]
  )

  const participantsBySession = useMemo(() => {
    const map = new Map<string, Client[]>()
    for (const a of assignments) {
      if (a.date !== activeDate) continue
      const client = clientsById.get(a.client_id)
      if (!client) continue
      const list = map.get(a.session_id) || []
      list.push(client)
      map.set(a.session_id, list)
    }
    return map
  }, [assignments, activeDate, clientsById])

  const pulse = (sessionId: string, clientId: string) => {
    const key = `${sessionId}-${clientId}`
    setJustMovedKey(key)
    setTimeout(() => setJustMovedKey((k) => (k === key ? null : k)), 400)
  }

  // ── Drag handlers ──────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, clientId: string, sessionId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ clientId, sessionId }))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingKey(`${sessionId}-${clientId}`)
  }

  const handleDragEnd = () => {
    setDraggingKey(null)
    setDragOverSessionId(null)
  }

  const handleDrop = async (e: React.DragEvent, toSessionId: string) => {
    e.preventDefault()
    setDragOverSessionId(null)
    let payload: { clientId: string; sessionId: string }
    try {
      payload = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      return
    }
    const { clientId, sessionId: fromSessionId } = payload
    if (fromSessionId === toSessionId) return

    // Optimistic update
    setAssignments((prev) => [
      ...prev.filter((a) => !(a.date === activeDate && a.session_id === fromSessionId && a.client_id === clientId)),
      { date: activeDate, session_id: toSessionId, client_id: clientId },
    ])
    pulse(toSessionId, clientId)

    try {
      await moveBoardParticipant(activeDate, fromSessionId, toSessionId, clientId)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al mover el participante')
      setAssignments((prev) => [
        ...prev.filter((a) => !(a.date === activeDate && a.session_id === toSessionId && a.client_id === clientId)),
        { date: activeDate, session_id: fromSessionId, client_id: clientId },
      ])
    }
  }

  // ── Add / remove ───────────────────────────────────────────────────────
  const handleAdd = async (sessionId: string, clientId: string) => {
    setAddingToSessionId(null)
    setAssignments((prev) => [...prev, { date: activeDate, session_id: sessionId, client_id: clientId }])
    pulse(sessionId, clientId)
    try {
      await addBoardParticipant(activeDate, sessionId, clientId)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al añadir participante')
      setAssignments((prev) =>
        prev.filter((a) => !(a.date === activeDate && a.session_id === sessionId && a.client_id === clientId))
      )
    }
  }

  const handleRemove = async (sessionId: string, clientId: string) => {
    const removed = assignments.find(
      (a) => a.date === activeDate && a.session_id === sessionId && a.client_id === clientId
    )
    setAssignments((prev) =>
      prev.filter((a) => !(a.date === activeDate && a.session_id === sessionId && a.client_id === clientId))
    )
    try {
      await removeBoardParticipant(activeDate, sessionId, clientId)
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message || 'Error al quitar participante')
      if (removed) setAssignments((prev) => [...prev, removed])
    }
  }

  const handleResetDay = async () => {
    if (!confirm(`¿Resetear el tablero de ${DAY_LABELS[activeDay]}? Se perderán los cambios manuales`)) return
    setResetting(true)
    try {
      await resetBoardDay(activeDate, activeDay)
      toast.success('Tablero del día reseteado')
      // session_clients composition isn't available client-side — reload
      // so the board re-fetches the freshly reset state from the server.
      window.location.reload()
    } catch (err: any) {
      toast.error(err?.message || 'Error al resetear el día')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Day selector ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center rounded-lg border border-[#E2E8F0] p-0.5 gap-0.5 bg-slate-50">
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setActiveDay(i)}
              className={cn(
                'px-3 sm:px-4 py-1.5 rounded-md text-xs font-semibold transition-colors',
                activeDay === i
                  ? 'bg-white shadow-sm text-blue-600 border border-[#E2E8F0]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleResetDay}
          disabled={resetting}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Resetear día
        </button>
      </div>

      <p className="text-sm text-[#64748B] capitalize">{formatDayDate(activeDate)}</p>

      {/* ── Sessions ──────────────────────────────────────────────────── */}
      {daySessions.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-12">Sin sesiones este día</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {daySessions.map((session) => {
            const participants = participantsBySession.get(session.id) || []
            const candidates = allClients.filter(
              (c) => !participants.some((p) => p.id === c.id)
            )
            const isDragOver = dragOverSessionId === session.id

            return (
              <div
                key={session.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverSessionId(session.id)
                }}
                onDragLeave={() => setDragOverSessionId((id) => (id === session.id ? null : id))}
                onDrop={(e) => handleDrop(e, session.id)}
                className={cn(
                  'rounded-xl border border-[#E2E8F0] p-3 transition-colors',
                  isDragOver ? 'border-blue-400 bg-blue-50/50' : 'bg-white'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{session.name}</p>
                      <span
                        className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 shrink-0"
                        title="Participantes en esta sesión"
                      >
                        <Users className="h-3 w-3" />
                        {participants.length}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">{session.time.substring(0, 5)}</p>
                  </div>
                  <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', SESSION_TYPE_BADGE[session.session_type])}>
                    {PROFILE_TYPE_LABELS[session.session_type] || session.session_type}
                  </Badge>
                </div>

                {participants.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Sin participantes</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
                    {participants.map((client) => (
                      <ParticipantCard
                        key={client.id}
                        client={client}
                        sessionId={session.id}
                        dragging={draggingKey === `${session.id}-${client.id}`}
                        justMoved={justMovedKey === `${session.id}-${client.id}`}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onRemove={(clientId) => handleRemove(session.id, clientId)}
                      />
                    ))}
                  </div>
                )}

                {addingToSessionId === session.id ? (
                  <AddParticipantPanel
                    candidates={candidates}
                    onAdd={(clientId) => handleAdd(session.id, clientId)}
                    onClose={() => setAddingToSessionId(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingToSessionId(session.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#E2E8F0] py-1.5 text-xs text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir cliente
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

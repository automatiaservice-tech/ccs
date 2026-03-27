'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2, CheckSquare, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, getProfileTypeLabel, getProfileTypeBadgeColor } from '@/lib/utils'
import { saveAttendance, getAttendanceForSession } from '@/lib/actions/attendance'

interface Client {
  id: string
  name: string
  active: boolean
  profile_type: string
}

interface Session {
  id: string
  name: string
  time: string
  session_type: string
  session_clients?: { clients?: Client }[]
}

export function CheckinClient({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [hasExisting, setHasExisting] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const selectedSession = sessions.find((s) => s.id === selectedSessionId)
  const activeClients = selectedSession?.session_clients
    ?.filter((sc) => sc.clients?.active)
    ?.map((sc) => sc.clients as Client) || []

  // Initialize attendance when session changes
  useEffect(() => {
    if (!selectedSessionId) return
    setLoadingExisting(true)

    getAttendanceForSession(selectedSessionId, today)
      .then((records) => {
        if (records.length > 0) {
          setHasExisting(true)
          const existing: Record<string, boolean> = {}
          records.forEach((r) => { existing[r.client_id] = r.attended })
          setAttendance(existing)
        } else {
          setHasExisting(false)
          // Default all active clients to attended
          const defaults: Record<string, boolean> = {}
          activeClients.forEach((c) => { defaults[c.id] = true })
          setAttendance(defaults)
        }
      })
      .catch(console.error)
      .finally(() => setLoadingExisting(false))
  }, [selectedSessionId])

  // Calculate cost preview
  const attendeesCount = Object.values(attendance).filter(Boolean).length
  const getCostPreview = (clientId: string) => {
    if (!attendance[clientId]) return '—'
    if (!selectedSession) return '—'
    const type = selectedSession.session_type
    if (type === 'fixed_group') return 'Cuota fija'
    if (type === 'variable_group') return formatCurrency(attendeesCount > 0 ? 40 / attendeesCount : 0)
    if (type === 'individual') return formatCurrency(40)
    return '—'
  }

  const handleSave = async () => {
    if (!selectedSession) return
    setSaving(true)
    try {
      const entries = activeClients.map((c) => ({
        client_id: c.id,
        attended: attendance[c.id] ?? false,
      }))

      await saveAttendance(
        selectedSession.id,
        today,
        entries,
        selectedSession.session_type
      )

      toast.success('Lista guardada correctamente')
      router.refresh()
    } catch {
      toast.error('Error al guardar la lista')
    } finally {
      setSaving(false)
    }
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">No hay sesiones programadas para hoy</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Session selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Selecciona la sesión</label>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Elige una sesión de hoy..." />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} — {s.time.substring(0, 5)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Attendance List */}
      {selectedSession && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedSession.name}</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  {activeClients.length} clientes — {attendeesCount} asistentes
                </p>
              </div>
              <div className="flex items-center gap-2">
                {hasExisting && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Ya registrada
                  </Badge>
                )}
                {loadingExisting && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
            </div>
            {hasExisting && (
              <p className="text-xs text-yellow-400 mt-1">
                Ya existe un registro para esta sesión hoy. Al guardar se sobreescribirá.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {activeClients.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">
                No hay clientes asignados a esta sesión
              </p>
            ) : (
              <>
                {/* Select all */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                  <button
                    onClick={() => {
                      const allAttended = activeClients.every((c) => attendance[c.id])
                      const newVal: Record<string, boolean> = {}
                      activeClients.forEach((c) => { newVal[c.id] = !allAttended })
                      setAttendance(newVal)
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {activeClients.every((c) => attendance[c.id]) ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                  {selectedSession.session_type === 'variable_group' && attendeesCount > 0 && (
                    <span className="text-xs text-slate-400">
                      {formatCurrency(40 / attendeesCount)} / persona
                    </span>
                  )}
                </div>

                {activeClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={client.id}
                        checked={attendance[client.id] ?? false}
                        onCheckedChange={(checked) =>
                          setAttendance((prev) => ({ ...prev, [client.id]: checked === true }))
                        }
                      />
                      <label htmlFor={client.id} className="cursor-pointer">
                        <p className="text-sm font-medium text-slate-100">{client.name}</p>
                        <Badge className={`mt-0.5 text-[10px] ${getProfileTypeBadgeColor(client.profile_type)}`}>
                          {getProfileTypeLabel(client.profile_type)}
                        </Badge>
                      </label>
                    </div>
                    <span className="text-sm font-medium text-slate-300">
                      {getCostPreview(client.id)}
                    </span>
                  </div>
                ))}

                <div className="pt-4 flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar lista
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

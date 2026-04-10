'use client'

import { useState } from 'react'
import {
  MessageCircle,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { updateWhatsAppConfig } from '@/lib/actions/whatsapp'

interface WhatsAppLog {
  id: string
  phone: string | null
  status: 'sent' | 'failed'
  error_message: string | null
  sent_at: string
  clients: { name: string } | null
  sessions: { name: string } | null
}

interface WhatsAppConfig {
  id: number
  global_enabled: boolean
  send_hour_utc: number
}

interface TriggerResult {
  sent: number
  failed: number
  total: number
  errors: { client: string; phone: string; error: string }[]
}

interface Props {
  initialLogs: WhatsAppLog[]
  initialConfig: WhatsAppConfig | null
}

export function WhatsAppClient({ initialLogs, initialConfig }: Props) {
  const [logs, setLogs] = useState(initialLogs)
  const [config, setConfig] = useState(initialConfig)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  const sentCount = logs.filter((l) => l.status === 'sent').length
  const failedCount = logs.filter((l) => l.status === 'failed').length

  const handleTriggerNow = async () => {
    setLoading(true)
    setResult(null)
    setTriggerError(null)

    try {
      const res = await fetch('/api/whatsapp/trigger', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setTriggerError(data?.error || `Error HTTP ${res.status}`)
        return
      }

      setResult(data as TriggerResult)

      // Reload after a short delay so the user can read the result
      setTimeout(() => window.location.reload(), 3000)
    } catch (err: any) {
      setTriggerError(err.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  const handleGlobalToggle = async (enabled: boolean) => {
    try {
      await updateWhatsAppConfig({ global_enabled: enabled })
      setConfig((prev) => (prev ? { ...prev, global_enabled: enabled } : prev))
    } catch (err: any) {
      alert(err?.message || 'Error al actualizar la configuración')
    }
  }

  const sendHourSpain = config
    ? (config.send_hour_utc + 2) % 24 // UTC+2 (verano); UTC+1 en invierno
    : 18

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">WhatsApp</h1>
          <p className="text-[#64748B] text-sm mt-1">Recordatorios automáticos para clientes</p>
        </div>
        <Button onClick={handleTriggerNow} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar recordatorios ahora
        </Button>
      </div>

      {/* Trigger result panel */}
      {triggerError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Error al enviar</p>
              <p className="text-sm text-red-600 mt-0.5">{triggerError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className={result.failed === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-[#0F172A]">
                Proceso completado — {result.total} cliente{result.total !== 1 ? 's' : ''} procesado{result.total !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-700 font-medium">✓ {result.sent} enviado{result.sent !== 1 ? 's' : ''}</span>
              {result.failed > 0 && (
                <span className="text-red-600 font-medium">✗ {result.failed} fallido{result.failed !== 1 ? 's' : ''}</span>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1 border-t border-amber-200 pt-2">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    <span className="font-medium">{e.client}</span> ({e.phone}): {e.error}
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs text-[#64748B]">La página se actualizará en unos segundos…</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Enviados (últimos 20)</p>
              <p className="text-2xl font-bold text-[#0F172A]">{sentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Fallidos (últimos 20)</p>
              <p className="text-2xl font-bold text-[#0F172A]">{failedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-[#64748B]">Hora de envío diario</p>
              <p className="text-2xl font-bold text-[#0F172A]">{sendHourSpain}:00</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#0F172A]">
            Últimos envíos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">
                    Sesión
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">
                    Teléfono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#64748B] uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#64748B] text-sm">
                      No hay envíos registrados todavía
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-[#F1F5F9]">
                      <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                        {log.clients?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">
                        {log.sessions?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B] font-mono">
                        {log.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'sent' ? (
                          <Badge className="bg-green-50 text-green-600 border-green-200 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Enviado
                          </Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-red-50 text-red-600 border-red-200 gap-1 w-fit">
                              <XCircle className="h-3 w-3" />
                              Error
                            </Badge>
                            {log.error_message && (
                              <span className="text-xs text-red-500 max-w-[200px] break-words">
                                {log.error_message}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748B]">
                        {new Date(log.sent_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Global toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-[#0F172A]">
                Recordatorios automáticos
              </Label>
              <p className="text-xs text-[#64748B] mt-0.5">
                Se envían cada día a las {sendHourSpain}:00 para las sesiones del día siguiente
              </p>
            </div>
            <Switch
              checked={config?.global_enabled ?? true}
              onCheckedChange={handleGlobalToggle}
            />
          </div>

          {/* Template info */}
          <div className="border-t border-[#F1F5F9] pt-4">
            <Label className="text-sm font-medium text-[#0F172A]">
              Plantilla de mensaje
            </Label>
            <p className="text-xs text-[#64748B] mt-1 mb-2">
              Gestionada en Meta Business Suite · Nombre:{' '}
              <code className="bg-slate-100 px-1 rounded">recordatorio</code>
            </p>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#0F172A]">
              Hola <span className="font-medium">[nombre del cliente]</span>, te recordamos
              que tienes sesión mañana a las{' '}
              <span className="font-medium">[hora de la sesión]</span>.{' '}
              ¡Te esperamos!
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              Para modificar el texto real, edita la plantilla directamente en Meta Business Manager.
            </p>
          </div>

          {/* Hour info */}
          <div className="border-t border-[#F1F5F9] pt-4">
            <Label className="text-sm font-medium text-[#0F172A]">
              Hora de envío
            </Label>
            <p className="text-xs text-[#64748B] mt-1">
              Actualmente configurado a las{' '}
              <strong>{sendHourSpain}:00 (hora española de verano)</strong>.
              Para cambiar la hora, modifica el campo{' '}
              <code className="bg-slate-100 px-1 rounded">schedule</code> en{' '}
              <code className="bg-slate-100 px-1 rounded">vercel.json</code> y la columna{' '}
              <code className="bg-slate-100 px-1 rounded">send_hour_utc</code> en la tabla{' '}
              <code className="bg-slate-100 px-1 rounded">whatsapp_config</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

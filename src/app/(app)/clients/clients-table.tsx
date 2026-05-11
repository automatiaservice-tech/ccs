'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Plus, Search, ArrowUpDown, MoreVertical, Loader2, Trash2, UserCheck, UserX, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { cn, getProfileTypeLabel, FIXED_GROUP_RATES } from '@/lib/utils'
import type { Client } from '@/lib/supabase/database.types'
import { NewClientModal } from './new-client-modal'
import { deleteClientAction, toggleClientActive } from '@/lib/actions/clients'

type SortOrder = 'alpha' | 'oldest' | 'newest'

interface ClientsTableProps {
  initialClients: Client[]
}

function sortClients(clients: Client[], order: SortOrder): Client[] {
  return [...clients].sort((a, b) => {
    if (order === 'alpha') return a.name.localeCompare(b.name, 'es')
    const dateA = new Date(a.enrollment_date ?? a.created_at).getTime()
    const dateB = new Date(b.enrollment_date ?? b.created_at).getTime()
    return order === 'oldest' ? dateA - dateB : dateB - dateA
  })
}

function getCardStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual':
      return 'bg-orange-50 border-l-4 border-l-orange-400 border border-orange-200 hover:bg-orange-100'
    case 'fixed_group':
      return 'bg-blue-50 border-l-4 border-l-blue-400 border border-blue-200 hover:bg-blue-100'
    default:
      return 'bg-white border border-gray-200 hover:bg-gray-50'
  }
}

function getAvatarStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual': return 'bg-orange-100 text-orange-700'
    case 'fixed_group': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function getTypeBadgeStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual': return 'bg-orange-100 text-orange-700 border-orange-300'
    case 'fixed_group': return 'bg-blue-100 text-blue-700 border-blue-300'
    default: return 'bg-gray-100 text-gray-600 border-gray-300'
  }
}

function getTableRowStyle(profile_type: string) {
  switch (profile_type) {
    case 'individual': return 'border-l-4 border-l-orange-400 hover:bg-orange-50'
    case 'fixed_group': return 'border-l-4 border-l-blue-400 hover:bg-blue-50'
    default: return 'border-l-4 border-l-gray-300 hover:bg-gray-50'
  }
}

interface ClientMenuProps {
  client: Client
  clientHref: string
  onDelete: (client: Client) => void
  onToggleActive: (client: Client) => void
}

function ClientMenu({ client, clientHref, onDelete, onToggleActive }: ClientMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-50 min-w-[180px] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => { setOpen(false); router.push(clientHref) }}
          >
            <Eye className="h-4 w-4" />
            Ver ficha
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => { setOpen(false); onToggleActive(client) }}
          >
            {client.active
              ? <><UserX className="h-4 w-4" />Marcar como inactivo</>
              : <><UserCheck className="h-4 w-4" />Marcar como activo</>
            }
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { setOpen(false); onDelete(client) }}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar cliente
          </button>
        </div>
      )}
    </div>
  )
}

export function ClientsTable({ initialClients }: ClientsTableProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const [clients, setClients] = useState(initialClients)
  const [showModal, setShowModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── All filter state derived from URL — single source of truth ──────────
  const typeFilter = searchParams.get('tipo') ?? 'all'
  const tarifaFilter = searchParams.get('tarifa') ?? 'all'
  const statusFilter = searchParams.get('estado') ?? 'all'
  const sortFilter = (searchParams.get('orden') as SortOrder) ?? 'alpha'
  const searchQuery = searchParams.get('q') ?? ''

  // Build URL to client detail preserving current filters for back navigation
  const clientUrl = (id: string) => {
    const qs = searchParams.toString()
    return `/clients/${id}${qs ? `?back=${encodeURIComponent('?' + qs)}` : ''}`
  }

  // Local state for search input (responsive while typing)
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Keep searchInput in sync with URL on back/forward navigation
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  // ── URL builder ──────────────────────────────────────────────────────────
  const buildURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== 'all' && !(k === 'orden' && v === 'alpha') && !(k === 'q' && !v.trim())) {
        sp.set(k, v)
      }
    })
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  // ── Update a single filter, always preserving all others ────────────────
  const setFilter = (key: string, value: string) => {
    const updates: Record<string, string> = {
      tipo: typeFilter,
      tarifa: tarifaFilter,
      estado: statusFilter,
      orden: sortFilter,
      q: searchInput,
      [key]: value,
    }
    // Clear tarifa when tipo changes away from fixed_group
    if (key === 'tipo' && value !== 'fixed_group') {
      updates.tarifa = 'all'
    }
    router.replace(buildURL(updates))
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    router.replace(buildURL({ tipo: typeFilter, tarifa: tarifaFilter, estado: statusFilter, orden: sortFilter, q: value }))
  }

  const handleClearFilters = () => {
    setSearchInput('')
    router.replace(pathname)
  }

  const hasActiveFilters =
    typeFilter !== 'all' || tarifaFilter !== 'all' || statusFilter !== 'all' ||
    sortFilter !== 'alpha' || !!searchQuery

  // ── Filtered + sorted list ───────────────────────────────────────────────
  const filtered = sortClients(
    clients.filter((c) => {
      const q = searchInput.toLowerCase()
      const matchSearch =
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').includes(searchInput) ||
        (c.email || '').toLowerCase().includes(q)
      const matchType = typeFilter === 'all' || c.profile_type === typeFilter
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.active : !c.active)
      const matchTarifa = tarifaFilter === 'all' || c.rate_id === tarifaFilter
      return matchSearch && matchType && matchStatus && matchTarifa
    }),
    sortFilter
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteClientAction(deleteTarget.id)
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Cliente eliminado correctamente')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar el cliente')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (client: Client) => {
    try {
      await toggleClientActive(client.id, !client.active)
      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, active: !c.active } : c))
      )
      toast.success(client.active ? 'Cliente desactivado' : 'Cliente activado')
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Search + button ── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cliente..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button onClick={() => setShowModal(true)} className="h-10 shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo cliente</span>
          </Button>
        </div>

        {/* ── Filter panel ── */}
        <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/60 p-3 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={(v) => setFilter('tipo', v)}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="fixed_group">Grupo Fijo</SelectItem>
                <SelectItem value="individual">Personal</SelectItem>
              </SelectContent>
            </Select>

            {typeFilter === 'fixed_group' && (
              <Select value={tarifaFilter} onValueChange={(v) => setFilter('tarifa', v)}>
                <SelectTrigger className="w-44 h-9 text-xs">
                  <SelectValue placeholder="Tarifa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tarifas</SelectItem>
                  {FIXED_GROUP_RATES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={statusFilter} onValueChange={(v) => setFilter('estado', v)}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortFilter} onValueChange={(v) => setFilter('orden', v)}>
              <SelectTrigger className="w-52 h-9 text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">Alfabético (A-Z)</SelectItem>
                <SelectItem value="oldest">Antigüedad (más antiguos primero)</SelectItem>
                <SelectItem value="newest">Antigüedad (más recientes primero)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            >
              Limpiar filtros
            </Button>
            <span className="text-xs text-[#64748B] ml-auto">{filtered.length} clientes encontrados</span>
          </div>
        </div>

        {/* Color legend */}
        <div className="flex gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-blue-500" />
            <span className="text-[#64748B]">Grupo Fijo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-green-500" />
            <span className="text-[#64748B]">Grupo Personal Variable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm bg-orange-500" />
            <span className="text-[#64748B]">Personal</span>
          </div>
        </div>

        {/* ── Mobile: card list ── */}
        <div className="sm:hidden space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center py-10 text-[#64748B] text-sm">No se encontraron clientes</p>
          ) : (
            filtered.map((client) => (
              <div
                key={client.id}
                className={cn(
                  'w-full text-left rounded-xl p-4 flex items-center gap-3 transition-colors',
                  getCardStyle(client.profile_type)
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-sm',
                    getAvatarStyle(client.profile_type)
                  )}
                  onClick={() => router.push(clientUrl(client.id))}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(clientUrl(client.id))}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                    <Badge
                      className={
                        client.active
                          ? 'bg-green-100 text-green-700 border-green-300 text-[10px]'
                          : 'bg-gray-100 text-gray-500 border-gray-300 text-[10px]'
                      }
                    >
                      {client.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge className={cn('text-[10px]', getTypeBadgeStyle(client.profile_type))}>
                      {getProfileTypeLabel(client.profile_type)}
                    </Badge>
                    {client.phone && (
                      <span className="text-xs text-gray-500 truncate">{client.phone}</span>
                    )}
                    {client.bank_account ? (
                      <span className="text-[10px] text-gray-500 bg-slate-100 rounded px-1.5 py-0.5">
                        🏦 ****{client.bank_account.slice(-4)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Sin cuenta</span>
                    )}
                  </div>
                </div>
                <ClientMenu client={client} clientHref={clientUrl(client.id)} onDelete={setDeleteTarget} onToggleActive={handleToggleActive} />
              </div>
            ))
          )}
        </div>

        {/* ── Tablet/Desktop: table ── */}
        <div className="hidden sm:block rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Teléfono</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Cuenta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No se encontraron clientes
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client.id}
                      className={cn(
                        'border-b border-gray-100 cursor-pointer transition-colors',
                        getTableRowStyle(client.profile_type)
                      )}
                      onClick={() => router.push(clientUrl(client.id))}
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                        {client.email && (
                          <p className="text-xs text-gray-500 mt-0.5">{client.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge className={getTypeBadgeStyle(client.profile_type)}>
                          {getProfileTypeLabel(client.profile_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-sm text-gray-600">{client.phone || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {client.bank_account ? (
                          <span className="text-sm text-gray-600">
                            🏦 ****{client.bank_account.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          className={
                            client.active
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-gray-100 text-gray-500 border-gray-300'
                          }
                        >
                          {client.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ClientMenu client={client} clientHref={clientUrl(client.id)} onDelete={setDeleteTarget} onToggleActive={handleToggleActive} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewClientModal open={showModal} onClose={() => setShowModal(false)} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !deleting && !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cliente?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar a <strong>{deleteTarget?.name}</strong>? Esta acción no
              se puede deshacer y eliminará también todo su historial de asistencia y facturas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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
    </>
  )
}
